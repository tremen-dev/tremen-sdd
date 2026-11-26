#!/usr/bin/env node
// Gate PreToolUse (L1): no se edita código vigilado sin rama ft/SPEC-NNN-slug y
// spec en 'aprobada' o 'en-progreso'. FAIL-OPEN ante un fallo interno; con un
// .sdd.json ilegible DENIEGA toda escritura salvo la del propio fichero (ADR-017).
// Válvula de escape: SDD_SKIP_GATE=1 (la reporta /sdd-como-vamos).
// La DECISIÓN require-spec (rama + spec + estado) NO vive aquí: es fuente única
// en core/lib/require-spec.mjs y la comparte el pre-commit L2 (RN-01, ADR-002).
import path from 'node:path';
import { execSync } from 'node:child_process';
import { readPayload, readConfig, deny, allow, esSddJsonDe, mensajeSddJsonIlegible } from './_comun.mjs';
import { evaluarRequireSpec } from '../core/lib/require-spec.mjs';

try {
  if (process.env.SDD_SKIP_GATE === '1') allow();
  const payload = readPayload();
  const cwd = payload.cwd || process.cwd();
  const lectura = readConfig(cwd);
  if (lectura.estado === 'ausente') allow(); // proyecto sin tremen-sdd (ADR-015)
  const fichero = payload.tool_input?.file_path ?? '';
  if (!fichero) allow();
  if (lectura.estado === 'ilegible') {
    if (esSddJsonDe(cwd, fichero)) allow(); // para poder arreglarlo
    deny(mensajeSddJsonIlegible(lectura));
  }
  const cfg = lectura.config;
  if (cfg.gates?.requireSpec === false) allow();
  const rel = path.relative(cwd, path.resolve(cwd, fichero)).replaceAll('\\', '/');
  const vigiladas = (cfg.rutasVigiladas ?? []).map((r) => {
    r = r.replaceAll('\\', '/');
    return r.endsWith('/') ? r : r + '/';
  });
  if (rel.startsWith('..') || !vigiladas.some((r) => rel.startsWith(r) || rel + '/' === r)) allow();
  const rama = execSync('git rev-parse --abbrev-ref HEAD', { cwd, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
  const { permitido, motivo } = evaluarRequireSpec({ rama, cwd });
  if (!permitido) deny(motivo);
  allow();
} catch { allow(); } // fail-open
