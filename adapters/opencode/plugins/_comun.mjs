// SHIM del plugin de opencode (ADR-007 §Decisión punto 1). Normaliza el payload de
// opencode (nombre de tool + filePath + cwd) al contrato de la lógica compartida del
// núcleo. NO reimplementa ninguna decisión de require-spec: eso vive SOLO en
// core/lib/require-spec.mjs (RN-01/RN-03). Análogo al _comun.mjs de Kimi.
import fs from 'node:fs';
import path from 'node:path';

// Tools de ESCRITURA que el gate vigila. En opencode la categoría de permiso `edit`
// cubre edit/write/patch (opencode.ai/docs/permissions, 2026-07-23); a nivel de
// plugin cada una es una tool con nombre propio en `input.tool`. `read` u otras: el
// gate NO deniega (solo las escrituras salen del carril require-spec).
export const TOOLS_ESCRITURA = ['edit', 'write', 'patch'];

// Error sentinela: distingue una VIOLACIÓN determinada de require-spec (que debe
// propagarse para abortar la tool) de un error interno (que degrada fail-open).
export class SddGateError extends Error {
  constructor(motivo) { super(motivo); this.name = 'SddGateError'; }
}

// Lee .sdd.json del proyecto (o null si no hay: entonces el gate se abstiene).
export function readConfig(cwd) {
  try { return JSON.parse(fs.readFileSync(path.join(cwd, '.sdd.json'), 'utf8')); } catch { return null; }
}

// ¿el fichero (relativo al cwd) cae bajo una ruta vigilada de .sdd.json?
export function esRutaVigilada(cfg, cwd, filePath) {
  const rel = path.relative(cwd, path.resolve(cwd, filePath)).replaceAll('\\', '/');
  if (rel.startsWith('..')) return false;
  const vigiladas = (cfg.rutasVigiladas ?? []).map((r) => {
    r = r.replaceAll('\\', '/');
    return r.endsWith('/') ? r : r + '/';
  });
  return vigiladas.some((r) => rel.startsWith(r) || rel + '/' === r);
}
