import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transition } from '../scripts/estado.mjs';
import { parseFrontmatter } from '../lib/frontmatter.mjs';
import {
  proyecto, valida, ledgerSecciones, filaEvidencia, SHA40, SPEC_EVIDENCIA, EVIDENCIA_COMPLETA, CABECERA_EVIDENCIA,
} from './_evidencia-fixtures.mjs';

// SPEC-032 CA-4 (ADR-020 §8): valida.mjs comprueba las filas de evidencia de una
// spec del modelo. CA-1 automático; CA-2 manual [staging] y [produccion]; CA-3
// manual con una comprobación sin etiqueta. La matriz deja todo en ❌, para que
// solo cuenten las filas de evidencia (CA-5 va aparte).
const MATRIZ = { 'CA-1': '❌', 'CA-2': '❌', 'CA-3': '❌' };
const conFilas = (filas, opciones = {}) => proyecto(SPEC_EVIDENCIA(), { ledger: ledgerSecciones({ matriz: MATRIZ, evidencia: filas, ...opciones }) });
const F = (ca, entorno, { ejecuto = 'Alberto Fojo', observado = '403 sin el feature', commit = '1a2b3c4', fecha = '2026-11-26', notas = '' } = {}) =>
  filaEvidencia(ca, entorno, ejecuto, observado, commit, fecha, notas);

const SIN_ERROR = [
  ['(a) CA-2 en staging', [F('CA-2', 'staging')]],
  ['(b) CA-3 sin entorno, ejecutó un rol, SHA de 40', [F('CA-3', '', { ejecuto: 'sdd-orquestador', commit: SHA40, notas: '…' })]],
  ['(b) CA-3 con - en Entorno', [F('CA-3', '-', { ejecuto: 'sdd-orquestador', commit: SHA40, notas: '…' })]],
];
for (const [caso, filas] of SIN_ERROR) {
  test(`CA-4 ${caso}: sale con código 0`, () => {
    const { code, out } = valida(conFilas(filas));
    assert.equal(code, 0, out);
  });
}

// [caso, fila, CA, columna, qué dice]
const CON_ERROR = [
  ['(c) CA no manual', F('CA-1', ''), 'CA-1', 'CA', /no es manual/],
  ['(d) CA inexistente', F('CA-9', ''), 'CA-9', 'CA', /inexistente/],
  ['(e) entorno que no es de CA-2', F('CA-2', 'preprod'), 'CA-2', 'Entorno', /staging, produccion/],
  ['(e) entorno vacío en CA-2', F('CA-2', ''), 'CA-2', 'Entorno', /staging, produccion/],
  ['(f) entorno en un CA sin etiquetas', F('CA-3', 'staging'), 'CA-3', 'Entorno', /no es un entorno/],
  ['(g) Ejecutó vacío', F('CA-2', 'staging', { ejecuto: '' }), 'CA-2', 'Ejecutó', /falta quién ejecutó/],
  ['(g) Ejecutó desconocido', F('CA-2', 'staging', { ejecuto: 'desconocido' }), 'CA-2', 'Ejecutó', /falta quién ejecutó/],
  ['(h) Observado vacío', F('CA-2', 'staging', { observado: '' }), 'CA-2', 'Observado', /falta lo observado/],
  ...['', 'main', 'HEAD', '1a2b3c'].map((c) => [`(i) Commit '${c}'`, F('CA-2', 'staging', { commit: c }), 'CA-2', 'Commit', /7 a 40/]),
  ['(j) Fecha 26/11/2026', F('CA-2', 'staging', { fecha: '26/11/2026' }), 'CA-2', 'Fecha', /AAAA-MM-DD/],
  ['(j) Fecha vacía', F('CA-2', 'staging', { fecha: '' }), 'CA-2', 'Fecha', /AAAA-MM-DD/],
];
for (const [caso, fila, ca, columna, dice] of CON_ERROR) {
  test(`CA-4 ${caso}: error que nombra ledger, línea, CA y columna`, () => {
    const p = conFilas([fila]);
    const numero = fs.readFileSync(p.ledger, 'utf8').split('\n').indexOf(fila) + 1;
    const { code, out } = valida(p);
    assert.notEqual(code, 0, out);
    const linea = out.split('\n').find((l) => l.includes('SPEC-001-x.ledger.md') && l.includes(`línea ${numero}:`) && l.includes(ca) && l.includes(`columna ${columna}`));
    assert.ok(linea, `ninguna línea nombra ledger, línea ${numero}, ${ca} y columna ${columna}:\n${out}`);
    assert.match(linea, dice);
  });
}

for (const [caso, cabecera] of [
  ['(k) una columna de menos', '| CA | Entorno | Ejecutó | Observado | Commit | Fecha |'],
  ['(k) columnas en otro orden', '| CA | Ejecutó | Entorno | Observado | Commit | Fecha | Notas |'],
]) {
  test(`CA-4 ${caso}: error de cabecera de evidencia`, () => {
    const { code, out } = valida(conFilas([F('CA-2', 'staging')], { cabeceraEvidencia: cabecera }));
    assert.notEqual(code, 0, out);
    assert.match(out, /SPEC-001-x\.ledger\.md: línea \d+: cabecera de evidencia/);
    assert.ok(out.includes(CABECERA_EVIDENCIA), 'dice la cabecera esperada');
  });
}

test('CA-4.3: con dos filas erróneas aparecen los dos errores', () => {
  const { code, out } = valida(conFilas([F('CA-1', ''), F('CA-2', 'staging', { fecha: 'ayer' })]));
  assert.notEqual(code, 0);
  assert.match(out, /CA-1: columna CA: evidencia de un CA que no es manual/);
  assert.match(out, /CA-2: columna Fecha/);
});

test('CA-4.5: una spec que no es del modelo, con filas de evidencia mal formadas, no da error nuevo', () => {
  const spec = SPEC_EVIDENCIA().replaceAll(' [manual]', '').replace(/^- `(ejecuta|comprobacion)`.*$/gm, '- texto');
  const p = proyecto(spec, { ledger: ledgerSecciones({ matriz: { 'CA-1': '✅', 'CA-1 ': '✅' }, evidencia: [F('CA-9', 'x', { commit: 'main', fecha: '', ejecuto: '' })] }) });
  const { code, out } = valida(p);
  assert.equal(code, 0, out);
});

// SPEC-032 CA-5 (ADR-020 §4): un CA manual en ✅ exige su evidencia.
const TODO_OK = { 'CA-1': '✅', 'CA-2': '✅', 'CA-3': '✅' };
const [STAGING, PRODUCCION, CA3] = EVIDENCIA_COMPLETA;
const enRevision = (spec, matriz, evidencia) => proyecto(spec, { estado: 'en-revision', ledger: ledgerSecciones({ matriz, evidencia }) });
const estadoDe = (p) => parseFrontmatter(fs.readFileSync(p.spec, 'utf8')).data.estado;

for (const [caso, spec, matriz] of [
  ['(a) evidencia completa', SPEC_EVIDENCIA(), TODO_OK, [STAGING, PRODUCCION, CA3]],
  ['(e) falta produccion de CA-2, pero CA-2 en n-a', SPEC_EVIDENCIA(), { ...TODO_OK, 'CA-2': 'n-a' }],
]) {
  test(`CA-5 ${caso}: valida OK y pasa a hecho`, () => {
    const evidencia = caso.startsWith('(a)') ? [STAGING, PRODUCCION, CA3] : [STAGING, CA3];
    const p = enRevision(spec, matriz, evidencia);
    const { code, out } = valida(p);
    assert.equal(code, 0, out);
    transition(p.spec, 'hecho', 'sdd-verificador', '2026-11-26');
    assert.equal(estadoDe(p), 'hecho');
  });
}

for (const [caso, evidencia, faltan] of [
  ['(b) falta CA-2 en produccion', [STAGING, CA3], [['CA-2', 'produccion']]],
  ['(c) no hay ninguna fila de CA-3', [STAGING, PRODUCCION], [['CA-3', '(vacío o -)']]],
  ['(d) el ledger no tiene sección de evidencia', null, [['CA-2', 'staging'], ['CA-2', 'produccion'], ['CA-3', '(vacío o -)']]],
]) {
  test(`CA-5 ${caso}: un error por CA y entorno sin evidencia, y la guarda niega hecho nombrando cada uno`, () => {
    const p = enRevision(SPEC_EVIDENCIA(), TODO_OK, evidencia);
    const { code, out } = valida(p);
    assert.notEqual(code, 0, out);
    const errores = out.split('\n').filter((l) => /sin evidencia del entorno/.test(l));
    assert.equal(errores.length, faltan.length, out);
    for (const [ca, entorno] of faltan) assert.ok(errores.some((l) => l.includes(`${ca}:`) && l.includes(entorno)), `${ca} ${entorno}:\n${out}`);
    const antes = fs.readFileSync(p.spec);
    let error;
    assert.throws(() => transition(p.spec, 'hecho', 'sdd-verificador'), (e) => { error = e; return true; });
    for (const [ca, entorno] of faltan) assert.ok(error.message.includes(`${ca} en ✅ sin evidencia registrada del entorno ${entorno}`), error.message);
    assert.ok(fs.readFileSync(p.spec).equals(antes));
  });
}

test('CA-5 (f): CA-2 con bloquea-hecho: no da el mismo error en valida, pero no impide hecho', () => {
  const p = enRevision(SPEC_EVIDENCIA('no'), TODO_OK, [STAGING, CA3]);
  const { code, out } = valida(p);
  assert.notEqual(code, 0, out);
  assert.match(out, /CA-2: en ✅ sin evidencia del entorno produccion/);
  transition(p.spec, 'hecho', 'sdd-verificador', '2026-11-26');
  assert.equal(estadoDe(p), 'hecho');
});

for (const celda of ['⏳', '⚠️', '🚧', '❌']) {
  test(`CA-5.4: un CA manual en ${celda} no exige evidencia`, () => {
    const p = enRevision(SPEC_EVIDENCIA(), { ...TODO_OK, 'CA-2': celda }, [CA3]);
    const { out } = valida(p);
    assert.doesNotMatch(out, /sin evidencia/);
  });
}
