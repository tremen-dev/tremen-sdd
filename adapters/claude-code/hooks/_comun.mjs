import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { idiomaDesde } from '../core/lib/idioma.mjs';
import { traductor } from '../core/lib/mensajes.mjs';
import { leerSddJson, esSddJsonDe } from '../core/lib/sdd-json.mjs';
import { mensajeSddJsonIlegible } from '../core/lib/sdd-json-mensaje.mjs';

export { esSddJsonDe, mensajeSddJsonIlegible };

// Catálogo propio del adaptador (ADR-016 §2): <adaptador>/mensajes/<idioma>/,
// leído con la función del núcleo en el idioma del proyecto (raíz de ADR-015
// desde el cwd del payload).
const MENSAJES = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'mensajes');
export function mensajes(cwd) {
  return traductor(MENSAJES, idiomaDesde(cwd));
}

export function readPayload() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}

// Estado de .sdd.json en `cwd` con el lector único del núcleo (ADR-017 §1):
// { estado: 'ausente' | 'valida' | 'ilegible', ruta, config?, motivo? }.
export function readConfig(cwd) {
  return leerSddJson(cwd);
}

export function deny(reason) {
  console.log(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }));
  process.exit(0);
}

export function allow() { process.exit(0); }

// Normaliza el agent_type quitando el prefijo de plugin '<plugin>:'. Un
// subagente de plugin llega como 'tremen-sdd:sdd-arquitecto'; sin normalizar,
// el dueño legítimo no casaría contra la lista de roles (F-SPEC-001-3). Se hace
// UNA sola vez aquí para que cualquier hook que decida por rol lo reutilice.
export function normalizaRol(agentType) {
  if (!agentType) return agentType;
  const i = agentType.lastIndexOf(':');
  return i === -1 ? agentType : agentType.slice(i + 1);
}
