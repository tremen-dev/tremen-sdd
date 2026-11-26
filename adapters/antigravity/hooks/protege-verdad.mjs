#!/usr/bin/env node
// Protege los documentos generados (docs/tablero.md) de ediciones manuales.
import path from 'node:path';
import { readPayload, readConfig, extractFilePath, extractCwd, deny, allow, mensajes } from './_comun.mjs';

try {
  if (process.env.SDD_SKIP_GATE === '1') allow();
  const payload = readPayload();
  const cwd = extractCwd(payload);
  const lectura = readConfig(cwd);
  if (lectura.estado === 'ausente') allow(); // proyecto sin tremen-sdd (ADR-015)
  // Ilegible: el interruptor no se puede leer, así que no cuenta (ADR-017 §2).
  if (lectura.estado === 'valida' && lectura.config.gates?.protegeVerdad === false) allow();
  const fichero = extractFilePath(payload);
  if (!fichero) allow();
  const rel = path.relative(cwd, path.resolve(cwd, fichero)).replaceAll('\\', '/');
  if (rel === 'docs/tablero.md') {
    deny(mensajes(cwd)('protege-verdad.tablero-generado'));
  }
  allow();
} catch { allow(); }
