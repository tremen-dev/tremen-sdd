// SHIM de entrada de los hooks de Kimi (ADR-003, punto 5). Normaliza el payload
// de Kimi (stdin JSON) al contrato que espera la lógica compartida del núcleo, y
// da salida en el estilo hookSpecificOutput/permissionDecision que Kimi comparte
// con Claude Code. NO reimplementa ninguna decisión: eso vive en core/lib/.
import fs from 'node:fs';
import path from 'node:path';

// Payload de Kimi: JSON por stdin con session_id/cwd/hook_event_name/tool_name/
// tool_input. Se lee una sola vez aquí.
export function readPayload() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}

// Normaliza el payload de Kimi a lo que necesitan los hooks: cwd y file_path.
// Kimi comparte el shape con Claude (cwd, tool_input.file_path); el shim aísla
// esa forma para que, si Kimi cambia un nombre de campo, se toque SOLO aquí.
export function normaliza(payload) {
  const cwd = payload.cwd || process.cwd();
  const filePath = payload.tool_input?.file_path ?? '';
  return { cwd, filePath };
}

export function readConfig(cwd) {
  try { return JSON.parse(fs.readFileSync(path.join(cwd, '.sdd.json'), 'utf8')); } catch { return null; }
}

// Identidad del agente si Kimi la aporta; null si no (para degradar fail-open).
export function rolDe(payload) {
  return payload.agent_type ?? payload.agent_name ?? null;
}

export function deny(reason) {
  console.log(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }));
  process.exit(0);
}

export function allow() { process.exit(0); }

// ¿el fichero (relativo al cwd) cae en una ruta vigilada de .sdd.json?
export function esRutaVigilada(cfg, cwd, filePath) {
  const rel = path.relative(cwd, path.resolve(cwd, filePath)).replaceAll('\\', '/');
  if (rel.startsWith('..')) return false;
  const vigiladas = (cfg.rutasVigiladas ?? []).map((r) => {
    r = r.replaceAll('\\', '/');
    return r.endsWith('/') ? r : r + '/';
  });
  return vigiladas.some((r) => rel.startsWith(r) || rel + '/' === r);
}
