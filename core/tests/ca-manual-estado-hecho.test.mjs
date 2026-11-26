import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { transition } from '../scripts/estado.mjs';
import { parseFrontmatter } from '../lib/frontmatter.mjs';
import { proyecto, ledger, estadoCli } from './_ca-manual-fixtures.mjs';

// SPEC-030 CA-4 (ADR-020 §5, RN-07): estado.mjs no da `hecho` a una spec del
// modelo con un CA que bloquea el cierre sin cerrar.
//   CA-1 manual, bloquea · CA-2 manual, no bloquea · CA-3 automático (bloquea por
//   defecto) · CA-4 automático con `bloquea-hecho: no`.
const SPEC = [
  '# SPEC-001', '',
  '### CA-1 [manual] — Recorrido en dispositivo',
  '- `ejecuta`: humano', '- `bloquea-hecho`: sí', '- `comprobacion`: el panel muestra el recurso', '',
  '### CA-2 [manual] — Limpieza tras el merge',
  '- `ejecuta`: humano', '- `bloquea-hecho`: no', '- `cuando`: tras-merge', '- `comprobacion`: la tarea aparece activa', '',
  '### CA-3 — Automático', '- **Given**: …', '',
  '### CA-4 — Automático que no bloquea', '- `bloquea-hecho`: no', '- **Given**: …', '',
].join('\n');

const BASE = { 'CA-1': '✅', 'CA-2': '⏳', 'CA-3': '✅', 'CA-4': '⚠️' };
const enRevision = (estados) => proyecto(SPEC, { estado: 'en-revision', ledger: estados ? ledger(estados) : undefined });
const leeEstado = (f) => parseFrontmatter(fs.readFileSync(f, 'utf8')).data;

for (const [caso, estados] of [
  ['(a) bloqueantes en ✅; no bloqueantes en ⏳ y ⚠️', BASE],
  ['(a) con calificadores y n-a', { ...BASE, 'CA-1': '✅ [desviación] [confirmado: Alberto Fojo, 2026-11-26]', 'CA-3': 'n-a' }],
  ['(a) con salvedad aceptada por una persona', { ...BASE, 'CA-3': '✅ [salvedad: Alberto Fojo, 2026-11-26]' }],
]) {
  test(`CA-4 ${caso}: pasa a hecho con su entrada en el historial`, () => {
    const p = enRevision(estados);
    transition(p.spec, 'hecho', 'sdd-verificador', '2026-11-26');
    const data = leeEstado(p.spec);
    assert.equal(data.estado, 'hecho');
    assert.deepEqual(data.historial.at(-1), { estado: 'hecho', fecha: '2026-11-26', por: 'sdd-verificador' });
  });
}

// [caso, estados del ledger (null: sin ledger), qué debe nombrar el error]
const NEGADOS = [
  ['(b) CA manual bloqueante en ⏳', { ...BASE, 'CA-1': '⏳' }, [/CA-1/, /⏳/]],
  ['(c) CA automático sin ficha en ⚠️', { ...BASE, 'CA-3': '⚠️' }, [/CA-3/, /⚠️/]],
  ['(d) un bloqueante en 🚧 y otro en ❌', { ...BASE, 'CA-1': '🚧', 'CA-3': '❌' }, [/CA-1/, /🚧/, /CA-3/, /❌/]],
  ['(e) salvedad firmada por un rol', { ...BASE, 'CA-1': '✅ [salvedad: sdd-verificador, 2026-11-26]' }, [/CA-1/, /salvedad: sdd-verificador/]],
  ['(f) un CA bloqueante sin fila en la matriz', { 'CA-1': '✅', 'CA-2': '⏳', 'CA-4': '⚠️' }, [/CA-3/, /sin fila/]],
  ['(g) la spec no tiene ledger', null, [/ledger/]],
];
for (const [caso, estados, nombra] of NEGADOS) {
  test(`CA-4 ${caso}: se niega, nombra lo que bloquea y no toca la spec`, () => {
    const p = enRevision(estados);
    const antes = fs.readFileSync(p.spec);
    let error;
    assert.throws(() => transition(p.spec, 'hecho', 'sdd-verificador'), (e) => { error = e; return true; });
    for (const re of nombra) assert.match(error.message, re);
    assert.ok(fs.readFileSync(p.spec).equals(antes), 'la spec no cambia byte a byte');
  });
}

test('CA-4 (b): el CLI de estado.mjs sale con código distinto de 0 y nombra el CA', () => {
  const p = enRevision({ ...BASE, 'CA-1': '⏳' });
  const antes = fs.readFileSync(p.spec);
  const { code, out } = estadoCli(p, 'hecho', 'sdd-verificador');
  assert.notEqual(code, 0, out);
  assert.match(out, /CA-1/);
  assert.match(out, /⏳/);
  assert.ok(fs.readFileSync(p.spec).equals(antes));
});

test('CA-4: la firma se comprueba antes, igual que hoy: --por sdd-implementador se niega por la firma', () => {
  const p = enRevision({ ...BASE, 'CA-1': '⏳' });
  assert.throws(() => transition(p.spec, 'hecho', 'sdd-implementador'), /Firma inválida/);
});

test('CA-4: la guarda solo mira hecho de specs: en-progreso y bloqueada no cambian', () => {
  const p = enRevision({ ...BASE, 'CA-1': '⏳', 'CA-3': '❌' });
  transition(p.spec, 'bloqueada', 'sdd-orquestador', '2026-11-26');
  transition(p.spec, 'en-revision', 'sdd-orquestador', '2026-11-26');
  transition(p.spec, 'en-progreso', 'sdd-verificador', '2026-11-26');
  transition(p.spec, 'en-revision', 'sdd-implementador', '2026-11-26');
  assert.equal(leeEstado(p.spec).estado, 'en-revision');
});

test('CA-4: el hecho de una épica no cambia, aunque su cuerpo tenga un CA [manual] y no haya ledger', () => {
  const p = enRevision(null);
  const epica = path.join(path.dirname(p.spec), '_epica.md');
  fs.writeFileSync(epica, '---\nid: EPIC-001\ntipo: epica\nestado: en-revision\nhistorial:\n'
    + '  - {estado: borrador, fecha: 2026-11-01, por: sdd-producto}\n  - {estado: aprobada, fecha: 2026-11-01, por: Alberto Fojo}\n'
    + '  - {estado: en-revision, fecha: 2026-11-02, por: sdd-orquestador}\n---\n# E\n\n' + SPEC);
  transition(epica, 'hecho', 'Alberto Fojo', '2026-11-26');
  assert.equal(leeEstado(epica).estado, 'hecho');
});
