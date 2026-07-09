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
