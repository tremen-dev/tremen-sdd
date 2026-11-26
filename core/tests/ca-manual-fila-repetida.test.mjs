import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transition } from '../scripts/estado.mjs';
import { proyecto, valida, ledgerSecciones, filaEvidencia, SHA40 } from './_evidencia-fixtures.mjs';

// SPEC-032 CA-2 (F-SPEC-030-7): un id repetido en la matriz es un error de valida
// y niega `hecho`, aunque las dos filas digan lo mismo. CA-2 es manual y bloquea.
const SPEC = ['# SPEC-001', '',
  '### CA-1 — Automático', '- **Given**: …', '',
  '### CA-2 [manual] — Recorrido', '- `ejecuta`: humano', '- `bloquea-hecho`: sí', '- `comprobacion`: el panel muestra el recurso', ''].join('\n');
const EVIDENCIA = [filaEvidencia('CA-2', '', 'Alberto Fojo', 'recurso activo', SHA40, '2026-11-26', '')];

const CASOS = [
  ['(a) ✅ y debajo ⚠️', [['CA-1', '✅'], ['CA-2', '✅'], ['CA-2', '⚠️']]],
  ['(b) ⚠️ y debajo ✅', [['CA-1', '✅'], ['CA-2', '⚠️'], ['CA-2', '✅']]],
  ['(c) las dos en ✅, idénticas', [['CA-1', '✅'], ['CA-2', '✅'], ['CA-2', '✅']]],
  ['(d) con y sin negrita', [['CA-1', '✅'], ['**CA-2**', '✅'], ['CA-2', '✅']]],
];

for (const [caso, filas] of CASOS) {
  const crea = () => {
    const texto = ledgerSecciones({ matriz: filas, evidencia: EVIDENCIA });
    const lineas = texto.split('\n').map((l, i) => (/^\| (\*\*)?CA-2(\*\*)? \| x\.mjs/.test(l) ? i + 1 : null)).filter(Boolean);
    return { p: proyecto(SPEC, { estado: 'en-revision', ledger: texto }), lineas };
  };

  test(`CA-2 ${caso}: valida sale con error que nombra el ledger, el CA y las dos líneas`, () => {
    const { p, lineas } = crea();
    assert.equal(lineas.length, 2);
    const { code, out } = valida(p);
    assert.notEqual(code, 0, out);
    const linea = out.split('\n').find((l) => l.includes('SPEC-001-x.ledger.md') && l.includes('CA-2') && /repetida/.test(l));
    assert.ok(linea, out);
    for (const n of lineas) assert.match(linea, new RegExp(`\\b${n}\\b`));
  });

  test(`CA-2 ${caso}: la guarda niega hecho, nombra el CA como fila repetida y no toca la spec`, () => {
    const { p } = crea();
    const antes = fs.readFileSync(p.spec);
    assert.throws(() => transition(p.spec, 'hecho', 'sdd-verificador'), /CA-2 con la fila repetida/);
    assert.ok(fs.readFileSync(p.spec).equals(antes));
  });
}

test('CA-2.3: la tabla de evidencia admite varias filas del mismo CA', () => {
  const evidencia = [...EVIDENCIA, filaEvidencia('CA-2', '-', 'sdd-orquestador', 'recurso activo otra vez', SHA40, '2026-11-27', 'segunda ejecución')];
  const p = proyecto(SPEC, { estado: 'en-revision', ledger: ledgerSecciones({ matriz: { 'CA-1': '✅', 'CA-2': '✅' }, evidencia }) });
  const { code, out } = valida(p);
  assert.equal(code, 0, out);
  transition(p.spec, 'hecho', 'sdd-verificador', '2026-11-27');
});
