import fs from 'node:fs';
import path from 'node:path';

export function readPayload() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}

export function readConfig(cwd) {
  try { return JSON.parse(fs.readFileSync(path.join(cwd, '.sdd.json'), 'utf8')); } catch { return null; }
}

export function extractFilePath(payload) {
  const args = payload.toolCall?.args ?? payload.tool_input ?? {};
  return args.TargetFile || args.AbsolutePath || args.file_path || args.path || '';
}

export function extractCwd(payload) {
  return payload.cwd || payload.workspacePaths?.[0] || process.cwd();
}

export function deny(reason) {
  console.log(JSON.stringify({ decision: 'deny', reason }));
  process.exit(0);
}

export function allow() {
  console.log(JSON.stringify({ decision: 'allow' }));
  process.exit(0);
}
