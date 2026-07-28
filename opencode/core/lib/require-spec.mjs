// Decisión require-spec (RN-01), FUENTE ÚNICA. La regla "no se codea código
// vigilado sin rama ft/SPEC-NNN + spec aprobada/en-progreso" vive SOLO aquí:
// la invocan tanto el hook L1 (adapters/*/hooks/require-spec.mjs) como el
// pre-commit L2 (tools/githooks/pre-commit.mjs). Ninguna capa la reimplementa.
// Pura de git/harness: recibe la rama ya resuelta y el cwd donde buscar la spec.
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from './frontmatter.mjs';

const RAMA_SPEC_RE = /^ft\/(SPEC-\d{3})-/;
const ESTADOS_CODEABLES = ['aprobada', 'en-progreso'];

// Id de spec a partir del nombre de rama, o null si la rama no es de spec.
export function parseSpecId(rama) {
  return rama?.match(RAMA_SPEC_RE)?.[1] ?? null;
}

// Localiza el fichero de la spec bajo docs/epicas/<epica>/<id>-*.md (no el ledger).
export function buscarSpec(cwd, id) {
  const base = path.join(cwd, 'docs', 'epicas');
  if (!fs.existsSync(base)) return null;
  for (const ep of fs.readdirSync(base)) {
    const dir = path.join(base, ep);
    if (!fs.statSync(dir).isDirectory()) continue;
    const f = fs.readdirSync(dir).find(
      (n) => n.startsWith(id + '-') && n.endsWith('.md') && !n.endsWith('.ledger.md'),
    );
    if (f) return path.join(dir, f);
  }
  return null;
}

// { permitido: boolean, motivo?: string, specId?: string, spec?: string }.
// motivo explica por qué se deniega (para el mensaje del gate).
export function evaluarRequireSpec({ rama, cwd }) {
  const specId = parseSpecId(rama);
  if (!specId) {
    return {
      permitido: false,
      motivo: `La rama '${rama}' no es una rama de spec (ft/SPEC-NNN-slug). Crea o aprueba la spec con sdd-arquitecto y trabaja en su rama.`,
    };
  }
  const spec = buscarSpec(cwd, specId);
  if (!spec) {
    return { permitido: false, specId, motivo: `No existe ${specId} bajo docs/epicas/. Créala con sdd-arquitecto.` };
  }
  const { data } = parseFrontmatter(fs.readFileSync(spec, 'utf8'));
  if (!ESTADOS_CODEABLES.includes(data.estado)) {
    return {
      permitido: false,
      specId,
      spec,
      motivo: `${specId} está en estado '${data.estado}'; para codear necesita 'aprobada' o 'en-progreso'. Pide la aprobación humana o transiciona con scripts/estado.mjs.`,
    };
  }
  return { permitido: true, specId, spec };
}
