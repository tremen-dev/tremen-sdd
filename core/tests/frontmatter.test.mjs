import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, stringifyFrontmatter } from '../lib/frontmatter.mjs';

const DOC = `---
id: SPEC-001
tipo: spec
epica: EPIC-001
estado: en-revision
historial:
  - {estado: borrador, fecha: 2026-07-09, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-10, por: Alberto}
---
# Cuerpo

Texto.
`;

test('parsea claves escalares', () => {
  const { data } = parseFrontmatter(DOC);
  assert.equal(data.id, 'SPEC-001');
  assert.equal(data.estado, 'en-revision');
});

test('parsea historial como lista de objetos', () => {
  const { data } = parseFrontmatter(DOC);
  assert.equal(data.historial.length, 2);
  assert.deepEqual(data.historial[1], { estado: 'aprobada', fecha: '2026-07-10', por: 'Alberto' });
});

test('separa el cuerpo sin tocarlo', () => {
  const { body } = parseFrontmatter(DOC);
  assert.ok(body.startsWith('# Cuerpo'));
});

test('texto sin frontmatter devuelve data vacía y body intacto', () => {
  const { data, body } = parseFrontmatter('hola\n');
  assert.deepEqual(data, {});
  assert.equal(body, 'hola\n');
});

test('tolera CRLF', () => {
  const { data } = parseFrontmatter(DOC.replaceAll('\n', '\r\n'));
  assert.equal(data.id, 'SPEC-001');
  assert.equal(data.historial.length, 2);
});

test('roundtrip parse -> stringify conserva datos y cuerpo', () => {
  const { data, body } = parseFrontmatter(DOC);
  const out = stringifyFrontmatter(data, body);
  const again = parseFrontmatter(out);
  assert.deepEqual(again.data, data);
  assert.equal(again.body, body);
});
