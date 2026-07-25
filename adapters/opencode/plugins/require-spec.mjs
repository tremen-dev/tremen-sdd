// Plugin de enforcement L1 para opencode (ADR-007 §Decisión punto 3): en
// `tool.execute.before`, LANZA (`throw`) para DENEGAR de verdad una escritura
// (edit/write/patch) bajo ruta vigilada sin carril válido (rama ft/SPEC-NNN + spec
// aprobada/en-progreso). A diferencia de Kimi (L1 solo avisa), en opencode el
// `throw` ABORTA la tool (opencode.ai/docs/plugins, ejemplo oficial `.env`,
// consultado 2026-07-23). Modo de fallo (ADR-002 §Modo de fallo): DENIEGA ante
// violación DETERMINADA; FAIL-OPEN ante error interno inesperado; válvula
// SDD_SKIP_GATE=1. La garantía dura la sostienen L2 (pre-commit) + L3 (CI).
//
// La DECISIÓN require-spec (rama + spec + estado) NO vive aquí: es fuente única en
// core/lib/require-spec.mjs (RN-01/RN-03), la MISMA que consumen los hooks L1 de
// Claude/Kimi y el pre-commit L2. Este módulo es solo un SHIM: normaliza el payload
// de opencode e invoca esa lógica; no reimplementa el parseo de rama ni de estado.
import { execSync } from 'node:child_process';
import { readConfig, esRutaVigilada, TOOLS_ESCRITURA, SddGateError } from './_comun.mjs';
import { evaluarRequireSpec } from '../core/lib/require-spec.mjs';

// Factory de plugin de opencode: named async export que recibe el contexto
// { project, client, $, directory, worktree } y devuelve el objeto de hooks
// (opencode.ai/docs/plugins, 2026-07-23). Firmas confirmadas contra doc real.
export const RequireSpecPlugin = async ({ directory, worktree } = {}) => {
  // Raíz del proyecto para git y .sdd.json: el worktree (raíz del repo) o, en su
  // defecto, el directorio de trabajo del contexto del plugin.
  const cwd = worktree || directory || process.cwd();
  return {
    // tool.execute.before(input, output): input.tool = nombre de la tool;
    // output.args.filePath = ruta del fichero (cuando la tool la trae). `throw`
    // aborta la tool (deny real).
    'tool.execute.before': async (input, output) => {
      try {
        if (process.env.SDD_SKIP_GATE === '1') return; // válvula de escape
        const tool = input?.tool;
        if (!TOOLS_ESCRITURA.includes(tool)) return; // read u otras: no se deniega
        const filePath = output?.args?.filePath ?? '';
        if (!filePath) return;
        const cfg = readConfig(cwd);
        if (!cfg || cfg.gates?.requireSpec === false) return; // gate desactivado
        if (!esRutaVigilada(cfg, cwd, filePath)) return; // ruta no vigilada
        const rama = execSync('git rev-parse --abbrev-ref HEAD', { cwd, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
        const { permitido, motivo } = evaluarRequireSpec({ rama, cwd });
        if (!permitido) throw new SddGateError(motivo); // violación determinada: DENIEGA
      } catch (e) {
        if (e instanceof SddGateError) throw e; // propaga el deny (aborta la tool)
        return; // error interno inesperado (git ausente, payload raro): FAIL-OPEN
      }
    },
  };
};

export default RequireSpecPlugin;
