import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { validate, validateFile } from '../scripts/valida.mjs';

function docsTmp() {
  const docs = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  const ep = path.join(docs, 'epicas', 'EPIC-001-facturas');
  fs.mkdirSync(ep, { recursive: true });
  fs.writeFileSync(path.join(ep, '_epica.md'),
    '---\nid: EPIC-001\ntipo: epica\nestado: aprobada\nhistorial:\n  - {estado: borrador, fecha: 2026-07-01, por: sdd-producto}\n  - {estado: aprobada, fecha: 2026-07-02, por: Alberto}\n---\n# E\n');
  fs.writeFileSync(path.join(ep, 'SPEC-001-alta.md'),
    '---\nid: SPEC-001\ntipo: spec\nepica: EPIC-001\nestado: borrador\nhistorial:\n  - {estado: borrador, fecha: 2026-07-01, por: sdd-arquitecto}\n---\n# S\n');
  return { docs, ep };
}

test('docs válido devuelve cero errores', () => {
  const { docs } = docsTmp();
  assert.deepEqual(validate(docs), []);
});

test('detecta id que no coincide con el nombre del fichero', () => {
  const { docs, ep } = docsTmp();
  fs.writeFileSync(path.join(ep, 'SPEC-002-otra.md'),
    '---\nid: SPEC-009\ntipo: spec\nepica: EPIC-001\nestado: borrador\nhistorial:\n  - {estado: borrador, fecha: 2026-07-01, por: x}\n---\n');
  const errores = validate(docs);
  assert.equal(errores.length, 1);
  assert.match(errores[0], /SPEC-002-otra\.md/);
});

test('detecta estado fuera de vocabulario', () => {
  const { ep } = docsTmp();
  const f = path.join(ep, 'SPEC-003-mal.md');
  fs.writeFileSync(f, '---\nid: SPEC-003\ntipo: spec\nepica: EPIC-001\nestado: terminado\nhistorial:\n  - {estado: terminado, fecha: 2026-07-01, por: x}\n---\n');
  assert.match(validateFile(f).join(';'), /estado 'terminado' no válido/);
});

test('detecta historial desincronizado del estado', () => {
  const { ep } = docsTmp();
  const f = path.join(ep, 'SPEC-004-drift.md');
  fs.writeFileSync(f, '---\nid: SPEC-004\ntipo: spec\nepica: EPIC-001\nestado: aprobada\nhistorial:\n  - {estado: borrador, fecha: 2026-07-01, por: x}\n---\n');
  assert.match(validateFile(f).join(';'), /historial/);
});

test('detecta épica referenciada inexistente', () => {
  const { docs, ep } = docsTmp();
  fs.writeFileSync(path.join(ep, 'SPEC-005-huerfana.md'),
    '---\nid: SPEC-005\ntipo: spec\nepica: EPIC-099\nestado: borrador\nhistorial:\n  - {estado: borrador, fecha: 2026-07-01, por: x}\n---\n');
  assert.match(validate(docs).join(';'), /EPIC-099/);
});
