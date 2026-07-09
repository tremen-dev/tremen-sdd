import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { renderBoard } from '../scripts/tablero.mjs';

function docsTmp() {
  const docs = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  const ep = path.join(docs, 'epicas', 'EPIC-001-facturas');
  fs.mkdirSync(ep, { recursive: true });
  fs.writeFileSync(path.join(ep, '_epica.md'),
    '---\nid: EPIC-001\ntipo: epica\nestado: aprobada\nhistorial:\n  - {estado: aprobada, fecha: 2026-07-02, por: Alberto}\n---\n# EPIC-001 — Facturas\n');
  fs.writeFileSync(path.join(ep, 'SPEC-001-alta.md'),
    '---\nid: SPEC-001\ntipo: spec\nepica: EPIC-001\nestado: hecho\nhistorial:\n  - {estado: hecho, fecha: 2026-07-05, por: sdd-verificador}\n---\n# SPEC-001 — Alta\n');
  fs.writeFileSync(path.join(ep, 'SPEC-002-envio.md'),
    '---\nid: SPEC-002\ntipo: spec\nepica: EPIC-001\nestado: en-progreso\nhistorial:\n  - {estado: en-progreso, fecha: 2026-07-06, por: sdd-implementador}\n---\n# SPEC-002 — Envío\n');
  return docs;
}

test('el tablero lleva aviso de generado', () => {
  assert.match(renderBoard(docsTmp(), '2026-07-09'), /NO EDITAR A MANO/);
});

test('agrupa specs por épica con su estado', () => {
  const md = renderBoard(docsTmp(), '2026-07-09');
  assert.match(md, /## EPIC-001/);
  assert.match(md, /SPEC-001.*hecho/);
  assert.match(md, /SPEC-002.*en-progreso/);
});

test('resume el recuento por estado', () => {
  const md = renderBoard(docsTmp(), '2026-07-09');
  assert.match(md, /hecho: 1/);
  assert.match(md, /en-progreso: 1/);
});
