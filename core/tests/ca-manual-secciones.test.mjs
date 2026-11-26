import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transition } from '../scripts/estado.mjs';
import { leerLedger, titulosLedger } from '../lib/ca-manual.mjs';
import { idiomasSoportados } from '../lib/idioma.mjs';
import { proyecto, valida, ledgerSecciones, tabla, CABECERA_MATRIZ, filasMatriz, filaEvidencia, SHA40 } from './_evidencia-fixtures.mjs';

// SPEC-032 CA-1 (F-SPEC-030-2): la matriz y la evidencia se localizan por el
// título de su sección, que sale de la plantilla del ledger.
const SPEC = ['# SPEC-001', '',
  '### CA-1 — Automático', '- **Given**: …', '',
  '### CA-2 [manual] — Recorrido', '- `ejecuta`: humano', '- `bloquea-hecho`: sí', '- `comprobacion`: el panel muestra el recurso', ''].join('\n');
const EVIDENCIA = [filaEvidencia('CA-2', '', 'Alberto Fojo', 'recurso activo', SHA40, '2026-11-26', '')];
const enRevision = (textoLedger) => proyecto(SPEC, { estado: 'en-revision', ledger: textoLedger });
const IMPOSTORA = tabla(CABECERA_MATRIZ, filasMatriz({ 'CA-1': '✅', 'CA-2': '✅' }));

function niegaHecho(p, ...nombra) {
  const antes = fs.readFileSync(p.spec);
  let error;
  assert.throws(() => transition(p.spec, 'hecho', 'sdd-verificador'), (e) => { error = e; return true; });
  for (const re of nombra) assert.match(error.message, re);
  assert.ok(fs.readFileSync(p.spec).equals(antes), 'la spec no cambia byte a byte');
}

for (const [caso, opciones] of [['(a)', {}], ['(c) evidencia delante de la matriz', { evidenciaPrimero: true }]]) {
  test(`CA-1 ${caso}: el lector devuelve la matriz y la evidencia, con sus filas`, () => {
    const l = leerLedger(ledgerSecciones({ matriz: { 'CA-1': '✅', 'CA-2': '⏳' }, evidencia: EVIDENCIA, ...opciones }));
    assert.deepEqual(l.errores, []);
    assert.deepEqual(l.matriz.filas.map((f) => [f.id, f.celda]), [['CA-1', '✅'], ['CA-2', '⏳']]);
    assert.deepEqual(l.evidencia.filas.map((f) => [f.ca, f.entorno, f.ejecuto, f.commit]), [['CA-2', '', 'Alberto Fojo', SHA40]]);
  });

  test(`CA-1 ${caso}: valida da OK y la spec pasa a hecho`, () => {
    const p = enRevision(ledgerSecciones({ matriz: { 'CA-1': '✅', 'CA-2': '✅' }, evidencia: EVIDENCIA, ...opciones }));
    const { code, out } = valida(p);
    assert.equal(code, 0, out);
    transition(p.spec, 'hecho', 'sdd-verificador', '2026-11-26');
  });
}

test('CA-1 (b): una tabla impostora antes de la sección de la matriz no se lee; la guarda nombra el CA en ❌', () => {
  const texto = ledgerSecciones({ matriz: { 'CA-1': '❌', 'CA-2': '✅' }, evidencia: EVIDENCIA, antes: IMPOSTORA });
  assert.deepEqual(leerLedger(texto).matriz.filas.map((f) => f.celda), ['❌', '✅']);
  niegaHecho(enRevision(texto), /CA-1/, /❌/);
});

test('CA-1 (d): dos tablas con cabecera CA en la sección de la matriz: error de matriz ambigua y no cierra', () => {
  const texto = ledgerSecciones({ matriz: { 'CA-1': '✅', 'CA-2': '✅' }, evidencia: EVIDENCIA })
    .replace('## Evidencia de CA manuales', [...IMPOSTORA, '', '## Evidencia de CA manuales'].join('\n'));
  const lineas = texto.split('\n');
  const cabeceras = lineas.map((l, i) => (l === CABECERA_MATRIZ ? i + 1 : null)).filter(Boolean);
  assert.equal(cabeceras.length, 2);
  const p = enRevision(texto);
  const { code, out } = valida(p);
  assert.notEqual(code, 0, out);
  const linea = out.split('\n').find((l) => l.includes('SPEC-001-x.ledger.md') && /ambigua/.test(l));
  assert.ok(linea, out);
  for (const n of cabeceras) assert.match(linea, new RegExp(`\\b${n}\\b`));
  niegaHecho(p, /ambigua/);
});

test('CA-1 (e): sin la sección de la matriz (la tabla bajo otro encabezado): error de ledger sin matriz y no cierra', () => {
  const texto = ledgerSecciones({ matriz: null, evidencia: EVIDENCIA, antes: tabla(CABECERA_MATRIZ, filasMatriz({ 'CA-1': '✅', 'CA-2': '✅' })) });
  assert.equal(leerLedger(texto).matriz, null);
  const p = enRevision(texto);
  const { code, out } = valida(p);
  assert.notEqual(code, 0, out);
  assert.match(out, /SPEC-001-x\.ledger\.md.*sin la sección/);
  niegaHecho(p, /sin la sección/);
});

test('CA-1.1: una sección acaba en el siguiente encabezado de nivel 1 o 2, no en uno de nivel 3', () => {
  const base = ledgerSecciones({ matriz: { 'CA-1': '✅' }, evidencia: [] });
  const conH3 = base.replace(CABECERA_MATRIZ, ['### Detalle', CABECERA_MATRIZ].join('\n'));
  assert.equal(leerLedger(conH3).matriz.filas.length, 1);
  const conH2 = base.replace(CABECERA_MATRIZ, ['## Otra', CABECERA_MATRIZ].join('\n'));
  assert.equal(leerLedger(conH2).matriz, null);
});

// CA-1.6: los títulos salen de la plantilla de cada idioma; no hay segunda copia.
const CORE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// Títulos de las secciones de nivel 2 de la plantilla que traen una tabla, en orden.
function seccionesConTabla(plantilla) {
  const sinComentarios = plantilla.replace(/<!--[\s\S]*?-->/g, '');
  return sinComentarios.split(/\n(?=## )/).filter((s) => s.startsWith('## ') && /\n\s*\|/.test(s))
    .map((s) => s.slice(3, s.indexOf('\n')).trim());
}

for (const idioma of idiomasSoportados()) {
  test(`CA-1.6: (${idioma}) el lector reconoce exactamente los títulos de la plantilla del ledger`, () => {
    const plantilla = fs.readFileSync(path.join(CORE, 'templates', idioma, 'artefactos', 'SPEC.ledger.md'), 'utf8');
    const [matriz, evidencia, ...resto] = seccionesConTabla(plantilla);
    assert.deepEqual(resto, []);
    const t = titulosLedger(idioma);
    assert.equal(t.matriz, matriz);
    assert.equal(t.evidencia, evidencia);
  });
}

test('CA-1.6: el lector no tiene una copia propia de los títulos ni de la cabecera de evidencia', () => {
  const src = fs.readFileSync(path.join(CORE, 'lib', 'ca-manual.mjs'), 'utf8');
  for (const literal of ['Matriz de criterios', 'Evidencia de CA manuales']) {
    assert.ok(!src.includes(literal), `ca-manual.mjs contiene «${literal}»`);
  }
  // Los nombres de columna de la evidencia, como literales del código.
  for (const columna of ['Entorno', 'Ejecutó', 'Observado', 'Commit', 'Fecha', 'Notas']) {
    assert.doesNotMatch(src, new RegExp(`['"\`]${columna}['"\`|]`), `ca-manual.mjs tiene el literal «${columna}»`);
  }
});
