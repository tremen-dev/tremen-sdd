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

test('épica bucket sin slug (EPIC-FIX) no duplica el título', () => {
  const docs = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  const ep = path.join(docs, 'epicas', 'EPIC-FIX');
  fs.mkdirSync(ep, { recursive: true });
  fs.writeFileSync(path.join(ep, '_epica.md'),
    '---\nid: EPIC-FIX\ntipo: epica\nestado: borrador\nhistorial:\n  - {estado: borrador, fecha: 2026-07-02, por: Alberto}\n---\n# EPIC-FIX\n');
  const md = renderBoard(docs, '2026-07-09');
  assert.match(md, /## EPIC-FIX \(/);
  assert.doesNotMatch(md, /## EPIC-FIX — EPIC-FIX/);
});

function docsConAdrs() {
  const docs = docsTmp();
  const adr = path.join(docs, 'adr');
  fs.mkdirSync(adr, { recursive: true });
  fs.writeFileSync(path.join(adr, 'ADR-002-modelo-en-capas.md'),
    '---\nid: ADR-002\ntipo: adr\nestado: aprobada\nhistorial:\n  - {estado: borrador, fecha: 2026-07-03, por: sdd-arquitecto}\n  - {estado: aprobada, fecha: 2026-07-04, por: Alberto}\n---\n# ADR-002: Modelo en capas\n');
  fs.writeFileSync(path.join(adr, 'ADR-001-estructura-del-repo.md'),
    '---\nid: ADR-001\ntipo: adr\nestado: aprobada\nhistorial:\n  - {estado: aprobada, fecha: 2026-07-02, por: Alberto}\n---\n# ADR-001: Estructura del repo\n');
  return docs;
}

// Celdas de una fila markdown '| a | b | c |' -> ['a','b','c'] (sin los bordes).
function celdas(fila) {
  return fila.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}
// La fila de la tabla de ADRs cuyo primer celda es `id`.
function filaAdr(md, id) {
  return md.split('\n').find((l) => l.startsWith(`| ${id} |`));
}

test('el tablero emite la sección ## ADRs con su tabla (CA-1)', () => {
  const md = renderBoard(docsConAdrs(), '2026-07-09');
  assert.match(md, /## ADRs/);
  assert.match(md, /\| ADR \| Estado \| Título \| Último cambio \|/);
  // 4 celdas SEPARADAS, alineadas con la cabecera: id | estado | título | último.
  assert.deepEqual(celdas(filaAdr(md, 'ADR-001')),
    ['ADR-001', 'aprobada', 'estructura-del-repo', '2026-07-02 (Alberto)']);
  assert.deepEqual(celdas(filaAdr(md, 'ADR-002')),
    ['ADR-002', 'aprobada', 'modelo-en-capas', '2026-07-04 (Alberto)']);
});

test('la fila de ADR tiene el título en columna propia, distinto del id (CA-1)', () => {
  const md = renderBoard(docsConAdrs(), '2026-07-09');
  const c = celdas(filaAdr(md, 'ADR-001'));
  assert.equal(c[0], 'ADR-001');           // id en su columna
  assert.equal(c[2], 'estructura-del-repo'); // título en SU columna, no fusionado con el id
  assert.notEqual(c[0], c[2]);
});

test('el nº de columnas de cada fila de ADR == nº de columnas de la cabecera (CA-1)', () => {
  const md = renderBoard(docsConAdrs(), '2026-07-09');
  const cabecera = celdas('| ADR | Estado | Título | Último cambio |');
  for (const id of ['ADR-001', 'ADR-002']) {
    assert.equal(celdas(filaAdr(md, id)).length, cabecera.length,
      `la fila ${id} debe tener ${cabecera.length} celdas como la cabecera`);
  }
});

test('los ADRs se ordenan por id ascendente (CA-1)', () => {
  const md = renderBoard(docsConAdrs(), '2026-07-09');
  assert.ok(md.indexOf('ADR-001') < md.indexOf('ADR-002'), 'ADR-001 antes que ADR-002');
});

test('la sección ## ADRs va después de las épicas y antes de ## Resumen (CA-1)', () => {
  const md = renderBoard(docsConAdrs(), '2026-07-09');
  assert.ok(md.indexOf('## EPIC-001') < md.indexOf('## ADRs'), 'épicas antes de ADRs');
  assert.ok(md.indexOf('## ADRs') < md.indexOf('## Resumen'), 'ADRs antes del Resumen');
});

test('sin docs/adr/ no se emite la sección ## ADRs (corolario CA-3/CA-4)', () => {
  const md = renderBoard(docsTmp(), '2026-07-09');
  assert.doesNotMatch(md, /## ADRs/);
});
