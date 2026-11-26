import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { proyecto, valida, ledger, cuerpo, CA1_MANUAL, CA2_AUTO } from './_ca-manual-fixtures.mjs';

// SPEC-030 CA-3: valida.mjs comprueba las marcas de Estado del ledger de una spec
// del modelo (ADR-020 §4, RN-12). CA-1 es manual; CA-2 no.
const SPEC = cuerpo(CA1_MANUAL, CA2_AUTO);
const conCelda = (ca, celda) => proyecto(SPEC, { ledger: ledger({ 'CA-1': '✅', 'CA-2': '✅', [ca]: celda }) });

const SIN_ERROR = [
  ['(a)', 'CA-2', '✅'], ['(a)', 'CA-2', '⚠️'], ['(a)', 'CA-2', '🚧'], ['(a)', 'CA-2', '❌'], ['(a)', 'CA-2', 'n-a'],
  ['(a) ⏳ en un CA manual', 'CA-1', '⏳'],
  ['(b)', 'CA-1', '✅ [desviación]'],
  ['(b)', 'CA-1', '✅ [salvedad: Alberto Fojo, 2026-11-26]'],
  ['(b)', 'CA-1', '✅ [confirmado: Alberto Fojo, 2026-11-26]'],
  ['(b)', 'CA-1', '✅ [desviación] [confirmado: Alberto Fojo, 2026-11-26]'],
];
for (const [caso, ca, celda] of SIN_ERROR) {
  test(`CA-3 ${caso}: '${celda}' en ${ca} sale con código 0`, () => {
    const { code, out } = valida(conCelda(ca, celda));
    assert.equal(code, 0, out);
  });
}

const CON_ERROR = [
  ['(c) ⏳ en un CA no manual', 'CA-2', '⏳', /solo vale en un CA \[manual\]/],
  ['(d) calificador desconocido', 'CA-1', '✅ [aprobado]', /desconocido/],
  ['(e) calificador en un estado que no es ✅', 'CA-1', '⚠️ [desviación]', /solo vale detrás de ✅/],
  ['(f) calificador repetido', 'CA-1', '✅ [desviación] [desviación]', /repetido/],
  ['(g) salvedad firmada por un rol', 'CA-1', '✅ [salvedad: sdd-verificador, 2026-11-26]', /persona/],
  ['(g) salvedad sin persona', 'CA-1', '✅ [salvedad: , 2026-11-26]', /persona/],
  ['(g) confirmado por desconocido', 'CA-1', '✅ [confirmado: desconocido, 2026-11-26]', /persona/],
  ['(h) fecha que no es AAAA-MM-DD', 'CA-1', '✅ [salvedad: Alberto Fojo, 26/11/2026]', /AAAA-MM-DD/],
  ['(h) fecha ausente', 'CA-1', '✅ [salvedad: Alberto Fojo]', /AAAA-MM-DD/],
  ['(i) texto suelto tras la marca', 'CA-1', '✅ ver nota', /texto suelto/],
];
for (const [caso, ca, celda, esperado] of CON_ERROR) {
  test(`CA-3 ${caso}: '${celda}' sale con error que nombra ledger, CA y celda`, () => {
    const { code, out } = valida(conCelda(ca, celda));
    assert.notEqual(code, 0, out);
    const linea = out.split('\n').find((l) => l.includes('SPEC-001-x.ledger.md') && l.includes(`${ca}:`) && l.includes(celda));
    assert.ok(linea, `ninguna línea nombra el ledger, ${ca} y la celda:\n${out}`);
    assert.match(linea, esperado);
  });
}

test('CA-3: si la spec del modelo no tiene ledger, valida no da error por eso', () => {
  const { code, out } = valida(proyecto(SPEC));
  assert.equal(code, 0, out);
});

// CA-3.3: «persona» es el predicado de estado.mjs (ADR-006), sin segunda definición.
const CORE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fuentesNucleo = () => ['lib', 'scripts'].flatMap((d) => fs.readdirSync(path.join(CORE, d))
  .filter((n) => n.endsWith('.mjs')).map((n) => path.join(d, n)));

test('CA-3: el predicado de persona tiene una sola definición, y la usan estado.mjs y el lector', () => {
  const lee = (rel) => fs.readFileSync(path.join(CORE, rel), 'utf8');
  const definen = fuentesNucleo().filter((rel) => {
    const src = lee(rel);
    return /(const|function|let|var)\s+esPersona\b/.test(src) || /!==\s*'desconocido'/.test(src);
  });
  assert.deepEqual(definen.map((r) => r.split(path.sep).join('/')), ['lib/persona.mjs']);
  // Sin la palabra de import seguida de comillas: nucleo-aislado leería la regex como un import.
  assert.match(lee('scripts/estado.mjs'), /import \{[^}]*\besPersona\b[^}]*\} \w+ .\.\.\/lib\/persona\.mjs./);
  assert.match(lee('lib/ca-manual.mjs'), /import \{[^}]*\besPersona\b[^}]*\} \w+ .\.\/persona\.mjs./);
});
