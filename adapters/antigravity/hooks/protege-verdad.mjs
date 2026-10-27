#!/usr/bin/env node
// Protege los documentos generados (docs/tablero.md) de ediciones manuales.
import path from 'node:path';
import { readPayload, readConfig, extractFilePath, extractCwd, deny, allow } from './_comun.mjs';

try {
  if (process.env.SDD_SKIP_GATE === '1') allow();
  const payload = readPayload();
  const cwd = extractCwd(payload);
  const cfg = readConfig(cwd);
  if (!cfg || cfg.gates?.protegeVerdad === false) allow();
  const fichero = extractFilePath(payload);
  if (!fichero) allow();
  const rel = path.relative(cwd, path.resolve(cwd, fichero)).replaceAll('\\', '/');
  if (rel === 'docs/tablero.md') {
    deny('docs/tablero.md es GENERADO: regenéralo con /sdd-tablero (scripts/tablero.mjs); no se edita a mano.');
  }
  allow();
} catch { allow(); }
