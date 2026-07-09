#!/usr/bin/env node
// Los documentos de verdad tienen dueño único. Los demás roles PROPONEN el
// cambio en su informe; no lo escriben. El tablero solo lo escribe su script.
import path from 'node:path';
import { readPayload, readConfig, deny, allow } from './_comun.mjs';

const DUENOS_FUNDACION = ['main', 'sdd-arquitecto', 'sdd-producto'];

try {
  if (process.env.SDD_SKIP_GATE === '1') allow();
  const payload = readPayload();
  const cwd = payload.cwd || process.cwd();
  const cfg = readConfig(cwd);
  if (!cfg || cfg.gates?.protegeVerdad === false) allow();
  const rel = path.relative(cwd, payload.tool_input?.file_path ?? '').replaceAll('\\', '/');
  const rol = payload.agent_type ?? payload.agent_name ?? 'main';
  if (rel === 'docs/tablero.md') {
    deny('docs/tablero.md es GENERADO: regenéralo con /sdd-tablero (scripts/tablero.mjs); no se edita a mano.');
  }
  const esVerdad = rel === 'FOUNDATION.md' || rel.startsWith('docs/fundacion/');
  if (esVerdad && !DUENOS_FUNDACION.includes(rol)) {
    deny(`'${rel}' es un documento de verdad (dueños: sdd-arquitecto, sdd-producto). Propón el cambio en tu informe en vez de escribirlo.`);
  }
  allow();
} catch { allow(); }
