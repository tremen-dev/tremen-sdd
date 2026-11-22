import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { idiomaDesde } from '../core/lib/idioma.mjs';
import { traductor } from '../core/lib/mensajes.mjs';

// Catálogo propio del adaptador (ADR-016 §2): <adaptador>/mensajes/<idioma>/,
// leído con la función del núcleo en el idioma del proyecto (raíz de ADR-015
// desde el cwd del payload). El formato de salida de los hooks (ADR-013) no cambia.
const MENSAJES = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'mensajes');
export function mensajes(cwd) {
  return traductor(MENSAJES, idiomaDesde(cwd));
}

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
