#!/usr/bin/env node
// Los documentos de verdad tienen dueño único; el tablero solo lo escribe su
// script. En Kimi (ADR-003, punto 5) este hook DEGRADA FAIL-OPEN cuando Kimi no
// aporta identidad de agente: sin saber quién edita, no puede aplicar la regla de
// dueño, así que permite y deja la garantía a git/CI (L2/L3). La regla del tablero
// generado NO necesita identidad y se aplica siempre.
import path from 'node:path';
import { readPayload, readConfig, normaliza, rolDe, deny, allow } from './_comun.mjs';

const DUENOS_FUNDACION = ['main', 'sdd-arquitecto', 'sdd-producto'];
const sinPrefijo = (r) => (r == null ? r : r.slice(r.lastIndexOf(':') + 1));

try {
  if (process.env.SDD_SKIP_GATE === '1') allow();
  const payload = readPayload();
  const { cwd, filePath } = normaliza(payload);
  const cfg = readConfig(cwd);
  if (!cfg || cfg.gates?.protegeVerdad === false) allow();
  if (!filePath) allow();
  const rel = path.relative(cwd, path.resolve(cwd, filePath)).replaceAll('\\', '/');
  if (rel === 'docs/tablero.md') {
    deny('docs/tablero.md es GENERADO: regenéralo con su script (core/scripts/tablero.mjs); no se edita a mano.');
  }
  const esVerdad = rel === 'FOUNDATION.md' || rel.startsWith('docs/fundacion/');
  if (esVerdad) {
    const rol = sinPrefijo(rolDe(payload));
    if (rol == null) allow(); // Kimi no aporta identidad: degrada fail-open.
    if (!DUENOS_FUNDACION.includes(rol)) {
      deny(`'${rel}' es un documento de verdad (dueños: sdd-arquitecto, sdd-producto). Propón el cambio en tu informe en vez de escribirlo.`);
    }
  }
  allow();
} catch { allow(); }
