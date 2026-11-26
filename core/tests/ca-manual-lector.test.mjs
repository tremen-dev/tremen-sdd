import test from 'node:test';
import assert from 'node:assert/strict';
import { leerCAs, esSpecDelModelo, erroresFicha } from '../lib/ca-manual.mjs';
import { CUERPO_CA1 } from './_ca-manual-fixtures.mjs';

// SPEC-030 CA-1 (ADR-020 §1, §2, §11): el lector único reconoce los CA, la marca
// [manual] y la ficha; ignora comentarios HTML y bloques de código.

test('CA-1: el lector devuelve exactamente los cinco CA, en orden, con su ficha', () => {
  const cas = leerCAs(CUERPO_CA1);
  assert.deepEqual(cas.map((c) => c.id), ['CA-1', 'CA-2', 'CA-3', 'CA-4', 'CA-M5']);
  const [c1, c2, c3, c4, c5] = cas;

  assert.equal(c1.manual, false);
  assert.equal(c1.bloqueaHecho, true, 'bloquea-hecho vale sí por defecto');
  assert.deepEqual(c1.dependeDe, []);

  assert.equal(c2.manual, true);
  assert.equal(c2.ejecuta, 'orquestador');
  assert.equal(c2.bloqueaHecho, true);
  assert.deepEqual(c2.precondiciones, ['app de la tienda desinstalada', 'cuenta con el feature activo']);
  assert.deepEqual(c2.consentimiento, ['desinstalar la app del móvil de pruebas']);
  assert.deepEqual(c2.manos, ['cambio de IAM en producción']);
  assert.deepEqual(c2.comprobaciones.map((x) => x.entorno), ['staging', 'produccion']);
  assert.equal(c2.comprobaciones[0].texto, 'GET /recurso con cuenta con el feature → 200; sin él → 403');
  assert.equal(c2.cuando, 'codigo', 'cuando vale codigo por defecto');
  assert.deepEqual(c2.dependeDe, ['CA-1']);
  assert.equal(c2.entradas.filter((e) => e.clave === 'ejecuta').length, 1,
    'la línea ejecuta que va después del Given no forma parte de la ficha');

  assert.equal(c3.manual, true);
  assert.equal(c3.ejecuta, 'humano');
  assert.equal(c3.bloqueaHecho, false);
  assert.equal(c3.cuando, 'tras-merge');
  assert.deepEqual(c3.comprobaciones, [{ entorno: null, texto: 'la limpieza programada aparece activa en el panel' }]);

  assert.equal(c4.manual, false);
  assert.equal(c4.bloqueaHecho, false);
  assert.deepEqual(c4.dependeDe, ['CA-2', 'CA-3']);

  assert.equal(c5.manual, true);
  assert.equal(c5.bloqueaHecho, true, '`si` sin tilde también vale sí');
});

test('CA-1: la fixture es una spec del modelo y su ficha no tiene errores', () => {
  const cas = leerCAs(CUERPO_CA1);
  assert.equal(esSpecDelModelo(cas), true);
  assert.deepEqual(erroresFicha(cas), []);
});

test('CA-1: un CA dentro de un bloque de código de tres comillas invertidas no aparece', () => {
  const texto = [
    '### CA-1 — Real',
    '',
    '```',
    '### CA-2 [manual] — En un bloque de código',
    '- `ejecuta`: humano',
    '```',
  ].join('\n');
  assert.deepEqual(leerCAs(texto).map((c) => c.id), ['CA-1']);
  assert.equal(esSpecDelModelo(leerCAs(texto)), false);
});

test('CA-1: tampoco aparece cuando el bloque de código va sangrado dentro de una lista', () => {
  const texto = [
    '### CA-1 — Real',
    '- **Given**: una spec de fixture con este cuerpo:',
    '',
    '  ```',
    '  ### CA-2 [manual] — Recorrido en dispositivo',
    '  - `ejecuta`: orquestador',
    '',
    '  - **CA-3** [manual]: Dado … cuando … entonces …',
    '    - `ejecuta`: humano',
    '  ```',
    '- **When**: …',
  ].join('\n');
  assert.deepEqual(leerCAs(texto).map((c) => c.id), ['CA-1']);
});

test('CA-1: un comentario HTML en una sola línea tampoco activa la marca', () => {
  const texto = '<!-- ### CA-9 [manual] — ejemplo -->\n### CA-1 — Real\n';
  assert.deepEqual(leerCAs(texto).map((c) => c.id), ['CA-1']);
});
