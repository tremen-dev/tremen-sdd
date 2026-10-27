#!/usr/bin/env node
// Los documentos de verdad tienen dueño único. Los demás roles PROPONEN el
// cambio en su informe; no lo escriben. El tablero solo lo escribe su script.
import path from 'node:path';
import { readPayload, readConfig, deny, allow, normalizaRol, mensajes } from './_comun.mjs';

const DUENOS_FUNDACION = ['main', 'sdd-arquitecto', 'sdd-producto'];

try {
  if (process.env.SDD_SKIP_GATE === '1') allow();
  const payload = readPayload();
  const cwd = payload.cwd || process.cwd();
  const cfg = readConfig(cwd);
  if (!cfg || cfg.gates?.protegeVerdad === false) allow();
  const fichero = payload.tool_input?.file_path ?? '';
  if (!fichero) allow();
  const rel = path.relative(cwd, path.resolve(cwd, fichero)).replaceAll('\\', '/');
  const rol = normalizaRol(payload.agent_type ?? payload.agent_name ?? 'main');
  if (rel === 'docs/tablero.md') {
    deny(mensajes(cwd)('protege-verdad.tablero-generado'));
  }
  const esVerdad = rel === 'FOUNDATION.md' || rel.startsWith('docs/fundacion/');
  if (esVerdad && !DUENOS_FUNDACION.includes(rol)) {
    deny(mensajes(cwd)('protege-verdad.documento-de-verdad', { rel }));
  }
  allow();
} catch { allow(); }
