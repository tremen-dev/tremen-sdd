#!/usr/bin/env node
// Gate PreToolUse (L1): no se edita código vigilado sin rama ft/SPEC-NNN-slug y
// spec en 'aprobada' o 'en-progreso'. FAIL-OPEN: ante cualquier duda, permite.
// Válvula de escape: SDD_SKIP_GATE=1 (la reporta /sdd-como-vamos).
// La DECISIÓN require-spec (rama + spec + estado) NO vive aquí: es fuente única
// en core/lib/require-spec.mjs y la comparte el pre-commit L2 (RN-01, ADR-002).
import path from 'node:path';
import { execSync } from 'node:child_process';
import { readPayload, readConfig, deny, allow } from './_comun.mjs';
import { evaluarRequireSpec } from '../core/lib/require-spec.mjs';

try {
  if (process.env.SDD_SKIP_GATE === '1') allow();
  const payload = readPayload();
  const cwd = payload.cwd || process.cwd();
  const cfg = readConfig(cwd);
  if (!cfg || cfg.gates?.requireSpec === false) allow();
  const fichero = payload.tool_input?.file_path ?? '';
  if (!fichero) allow();
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
