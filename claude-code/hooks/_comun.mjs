import fs from 'node:fs';
import path from 'node:path';

export function readPayload() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}

export function readConfig(cwd) {
  try { return JSON.parse(fs.readFileSync(path.join(cwd, '.sdd.json'), 'utf8')); } catch { return null; }
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
