import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { transition, TRANSITIONS } from '../scripts/estado.mjs';
import { parseFrontmatter } from '../lib/frontmatter.mjs';

function specTmp(estado) {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-')), 'SPEC-001-x.md');
  fs.writeFileSync(f, `---\nid: SPEC-001\ntipo: spec\nepica: EPIC-001\nestado: ${estado}\nhistorial:\n  - {estado: ${estado}, fecha: 2026-07-01, por: sdd-arquitecto}\n---\n# X\n`);
  return f;
}

test('transición válida actualiza estado y añade historial', () => {
  const f = specTmp('borrador');
  transition(f, 'aprobada', 'Alberto', '2026-07-09');
  const { data } = parseFrontmatter(fs.readFileSync(f, 'utf8'));
  assert.equal(data.estado, 'aprobada');
  assert.equal(data.historial.length, 2);
  assert.deepEqual(data.historial[1], { estado: 'aprobada', fecha: '2026-07-09', por: 'Alberto' });
});

test('transición inválida lanza y no toca el fichero', () => {
  const f = specTmp('borrador');
  const antes = fs.readFileSync(f, 'utf8');
  assert.throws(() => transition(f, 'hecho', 'x'), /no permitida/);
  assert.equal(fs.readFileSync(f, 'utf8'), antes);
});

test('bloqueada es alcanzable desde cualquier estado no terminal y reversible', () => {
  const f = specTmp('en-progreso');
  transition(f, 'bloqueada', 'sdd-orquestador', '2026-07-09');
  transition(f, 'en-progreso', 'sdd-orquestador', '2026-07-10');
  const { data } = parseFrontmatter(fs.readFileSync(f, 'utf8'));
  assert.equal(data.estado, 'en-progreso');
});

test('hecho es terminal', () => {
  assert.deepEqual(TRANSITIONS['hecho'], []);
});
