import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import {
  proyecto, ledgerSecciones, filaEvidencia, repo, commitTodo, escribe, git, ronda,
} from './_evidencia-fixtures.mjs';

// SPEC-032 CA-6 y CA-7 (ADR-020 §7): el script de la ronda acotada calcula la
// frontera desde el commit verificado V y no admite cambios fuera de lo pendiente.
// CA-1 automático y bloqueante; CA-2 manual bloqueante; CA-3 manual que no bloquea.
const SPEC = ['# SPEC-001', '',
  '### CA-1 — Automático', '- **Given**: …', '',
  '### CA-2 [manual] — Bloquea', '- `ejecuta`: humano', '- `bloquea-hecho`: sí', '- `comprobacion`: el panel muestra el recurso', '',
  '### CA-3 [manual] — No bloquea', '- `ejecuta`: humano', '- `bloquea-hecho`: no', '- `comprobacion`: la tarea aparece activa', ''].join('\n');
const PARCIAL = { 'CA-1': '✅', 'CA-2': '⏳', 'CA-3': '⏳' };
const LEDGER = 'docs/epicas/EPIC-001-x/SPEC-001-x.ledger.md';
const REGISTRO = 'docs/manuales/registro.md';
const fila = (ca, commit, observado = 'el panel muestra el recurso') => filaEvidencia(ca, '', 'Alberto Fojo', observado, commit, '2026-11-26', '');

// Repo con la spec en en-revision y su ledger en V. Devuelve { p, V }.
function base({ sdd = {}, matriz = PARCIAL, evidencia = [], spec = SPEC, estado = 'en-revision' } = {}) {
  const p = proyecto(spec, { estado, ledger: ledgerSecciones({ matriz, evidencia }) });
  fs.writeFileSync(path.join(p.raiz, '.sdd.json'), JSON.stringify(sdd));
  escribe(p.raiz, 'README.md', 'x\n');
  escribe(p.raiz, 'core/lib/x.mjs', 'export const x = 1;\n');
  escribe(p.raiz, REGISTRO, '# Registro\n');
  return { p, V: repo(p.raiz) };
}
const ledgerHoy = (p, opciones) => fs.writeFileSync(p.ledger, ledgerSecciones(opciones));
// (a) de CA-6: filas de evidencia nuevas de CA-2 (commit V) y una captura en _qa/SPEC-001/.
function casoA(p, V, { commit = true } = {}) {
  ledgerHoy(p, { matriz: PARCIAL, evidencia: [fila('CA-2', V)] });
  escribe(p.raiz, 'docs/_qa/SPEC-001/ca-2.png', 'PNG');
  return commit ? commitTodo(p.raiz, 'evidencia') : null;
}
const admisible = (r) => assert.equal(r.code, 0, r.out);
function noAdmisible(r, ...nombra) {
  assert.notEqual(r.code, 0, r.out);
  for (const re of nombra) assert.match(r.out, re);
}

// --- CA-6: la frontera ---

test('CA-6 (a): evidencia en el ledger y un PNG en _qa/SPEC-001/: admisible', () => {
  const { p, V } = base();
  casoA(p, V);
  admisible(ronda(p, V));
});

test('CA-6 (b): (a) más una línea en el registro declarado: admisible', () => {
  const { p, V } = base({ sdd: { registroManuales: REGISTRO } });
  casoA(p, V, { commit: false });
  fs.appendFileSync(path.join(p.raiz, REGISTRO), '- SPEC-001 CA-2 probado\n');
  commitTodo(p.raiz, 'evidencia y registro');
  admisible(ronda(p, V));
});

test('CA-6 (c): (a) más un cambio en core/lib/x.mjs: no admisible y lo nombra', () => {
  const { p, V } = base();
  casoA(p, V);
  escribe(p.raiz, 'core/lib/x.mjs', 'export const x = 2;\n');
  commitTodo(p.raiz, 'código');
  noAdmisible(ronda(p, V), /core\/lib\/x\.mjs/);
});

test('CA-6 (d): un cambio en la propia spec: no admisible y la nombra', () => {
  const { p, V } = base();
  fs.appendFileSync(p.spec, '\nNota.\n');
  commitTodo(p.raiz, 'spec');
  noAdmisible(ronda(p, V), /docs\/epicas\/EPIC-001-x\/SPEC-001-x\.md/);
});

test('CA-6 (e): un fichero en _qa/SPEC-OTRA/: no admisible', () => {
  const { p, V } = base();
  escribe(p.raiz, 'docs/_qa/SPEC-OTRA/x.png', 'PNG');
  commitTodo(p.raiz, 'otra');
  noAdmisible(ronda(p, V), /docs\/_qa\/SPEC-OTRA\/x\.png/);
});

test('CA-6 (f): (b) sin registroManuales declarado: no admisible y nombra el registro', () => {
  const { p, V } = base();
  casoA(p, V, { commit: false });
  fs.appendFileSync(path.join(p.raiz, REGISTRO), '- SPEC-001 CA-2 probado\n');
  commitTodo(p.raiz, 'evidencia y registro');
  noAdmisible(ronda(p, V), /docs\/manuales\/registro\.md/);
});

test('CA-6 (g): (a) más un cambio sin commitear en un fichero seguido fuera de la frontera: no admisible', () => {
  const { p, V } = base();
  casoA(p, V);
  fs.appendFileSync(path.join(p.raiz, 'README.md'), 'cambio\n');
  noAdmisible(ronda(p, V), /README\.md/);
});

test('CA-6.2: un fichero sin seguimiento fuera de la frontera no cuenta', () => {
  const { p, V } = base();
  casoA(p, V);
  escribe(p.raiz, 'nuevo-sin-seguir.txt', 'x');
  admisible(ronda(p, V));
});

test('CA-6 (h): V no existe: no admisible y dice por qué', () => {
  const { p } = base();
  noAdmisible(ronda(p, 'abcdef1234567'), /abcdef1234567/, /no existe/);
});

test('CA-6 (h): V no es antepasado de HEAD: no admisible y dice por qué', () => {
  const { p } = base();
  git(p.raiz, 'checkout', '-q', '-b', 'otra');
  escribe(p.raiz, 'otra.txt', 'x');
  const W = commitTodo(p.raiz, 'otra rama');
  git(p.raiz, 'checkout', '-q', 'main');
  noAdmisible(ronda(p, W), new RegExp(W.slice(0, 7)), /antepasado/);
});

test('CA-6.1: lista todos los motivos, con cada fichero fuera de la frontera', () => {
  const { p, V } = base();
  casoA(p, V);
  escribe(p.raiz, 'core/lib/x.mjs', 'export const x = 2;\n');
  escribe(p.raiz, 'docs/_qa/SPEC-OTRA/x.png', 'PNG');
  commitTodo(p.raiz, 'dos fuera');
  noAdmisible(ronda(p, V), /core\/lib\/x\.mjs/, /docs\/_qa\/SPEC-OTRA\/x\.png/);
});

test('CA-6.3: con .sdd.json ilegible la ronda no es admisible', () => {
  const { p, V } = base();
  casoA(p, V);
  fs.writeFileSync(path.join(p.raiz, '.sdd.json'), '{ no es json');
  noAdmisible(ronda(p, V), /\.sdd\.json/);
});

// Huella del árbol (sin .git) para comprobar que el script no escribe nada.
function huella(raiz) {
  const h = crypto.createHash('sha256');
  const pila = [raiz];
  const ficheros = [];
  while (pila.length) {
    const d = pila.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === '.git') continue;
      const f = path.join(d, e.name);
      if (e.isDirectory()) pila.push(f); else ficheros.push(f);
    }
  }
  for (const f of ficheros.sort()) h.update(f).update(fs.readFileSync(f));
  return h.digest('hex') + git(raiz, 'status', '--porcelain');
}

test('CA-6.4: el script no escribe nada, admisible o no', () => {
  const { p, V } = base();
  casoA(p, V);
  let antes = huella(p.raiz);
  admisible(ronda(p, V));
  assert.equal(huella(p.raiz), antes);
  fs.appendFileSync(path.join(p.raiz, 'README.md'), 'cambio\n');
  antes = huella(p.raiz);
  noAdmisible(ronda(p, V));
  assert.equal(huella(p.raiz), antes);
});

test('CA-6.5: una spec que no es del modelo no es admisible y lo dice', () => {
  const sinModelo = SPEC.replaceAll(' [manual]', '').replace(/^- `(ejecuta|comprobacion)`.*$/gm, '- texto');
  const { p, V } = base({ spec: sinModelo, matriz: { 'CA-1': '✅', 'CA-2': '⚠️', 'CA-3': '⚠️' } });
  noAdmisible(ronda(p, V), /CA \[manual\]/);
});

test('CA-6.5: una spec que no está en en-revision no es admisible y lo dice', () => {
  const { p, V } = base({ estado: 'en-progreso' });
  noAdmisible(ronda(p, V), /en-progreso/, /en-revision/);
});

// --- CA-7: la ronda no cambia lo que no estaba pendiente ---

test('CA-7 (a): CA-2 pasa a ✅ con filas nuevas de commit V: admisible; lista CA-2 y CA-3 con sus filas nuevas', () => {
  const { p, V } = base();
  ledgerHoy(p, { matriz: { ...PARCIAL, 'CA-2': '✅' }, evidencia: [fila('CA-2', V)] });
  const r = ronda(p, V);
  admisible(r);
  assert.match(r.out, /CA-2/);
  assert.match(r.out, /CA-3/);
  assert.ok(r.out.includes(V), 'muestra la fila nueva con su commit');
});

test('CA-7 (b): CA-1 cambia a ✅ [desviación]: no admisible', () => {
  const { p, V } = base();
  ledgerHoy(p, { matriz: { ...PARCIAL, 'CA-1': '✅ [desviación]' }, evidencia: [fila('CA-2', V)] });
  noAdmisible(ronda(p, V), /CA-1/, /⏳/);
});

test('CA-7 (b): cambia la celda Verif. de CA-1: no admisible', () => {
  const { p, V } = base();
  const texto = ledgerSecciones({ matriz: PARCIAL, evidencia: [] }).replace('| CA-1 | x.mjs | x.test.mjs | ok |', '| CA-1 | x.mjs | x.test.mjs | ok, revisado |');
  fs.writeFileSync(p.ledger, texto);
  noAdmisible(ronda(p, V), /CA-1/, /ok, revisado/);
});

test('CA-7 (c): en V, CA-1 estaba en ⚠️ (no era un PARCIAL): no admisible', () => {
  const { p, V } = base({ matriz: { ...PARCIAL, 'CA-1': '⚠️' } });
  ledgerHoy(p, { matriz: { ...PARCIAL, 'CA-1': '⚠️', 'CA-2': '✅' }, evidencia: [fila('CA-2', V)] });
  noAdmisible(ronda(p, V), /CA-1/, /⚠️/, /PARCIAL/);
});

test('CA-7 (d): en V ningún CA estaba en ⏳: no admisible, no hay nada pendiente', () => {
  const { p, V } = base({ matriz: { 'CA-1': '✅', 'CA-2': '✅', 'CA-3': '✅' } });
  noAdmisible(ronda(p, V), /nada pendiente/);
});

for (const [caso, evidenciaHoy] of [
  ['se borra', (V) => [fila('CA-2', V, 'otra')]],
  ['se cambia', (V) => [fila('CA-3', V, 'cambiada'), fila('CA-2', V, 'otra')]],
]) {
  test(`CA-7 (e): ${caso} una fila de evidencia que ya estaba en V: no admisible`, () => {
    const p0 = base();
    // V con una fila de CA-3 ya registrada.
    ledgerHoy(p0.p, { matriz: PARCIAL, evidencia: [fila('CA-3', p0.V)] });
    const V = commitTodo(p0.p.raiz, 'evidencia previa');
    ledgerHoy(p0.p, { matriz: PARCIAL, evidencia: evidenciaHoy(V) });
    noAdmisible(ronda(p0.p, V), /evidencia/, /solo admite filas nuevas al final/);
  });
}

test('CA-7 (f): fila nueva con Commit W posterior a V que solo toca el ledger: admisible', () => {
  const { p, V } = base();
  ledgerHoy(p, { matriz: PARCIAL, evidencia: [], antes: ['- Nota: ejecución en curso'] });
  const W = commitTodo(p.raiz, 'nota en el ledger');
  ledgerHoy(p, { matriz: PARCIAL, evidencia: [fila('CA-2', W)], antes: ['- Nota: ejecución en curso'] });
  admisible(ronda(p, V));
});

test('CA-7 (g): fila nueva con Commit W cuyo diff con V toca core/lib/x.mjs: no admisible', () => {
  const { p, V } = base();
  git(p.raiz, 'checkout', '-q', '-b', 'pruebas');
  escribe(p.raiz, 'core/lib/x.mjs', 'export const x = 3;\n');
  const W = commitTodo(p.raiz, 'código de pruebas');
  git(p.raiz, 'checkout', '-q', 'main');
  ledgerHoy(p, { matriz: PARCIAL, evidencia: [fila('CA-2', W)] });
  noAdmisible(ronda(p, V), new RegExp(W), /core\/lib\/x\.mjs/, /otro código/);
});

test('CA-7 (h): fila nueva con un Commit que no existe en el repo: no admisible', () => {
  const { p, V } = base();
  ledgerHoy(p, { matriz: PARCIAL, evidencia: [fila('CA-2', 'abcdef1')] });
  noAdmisible(ronda(p, V), /abcdef1/, /no existe/);
});

test('CA-7 (i): se borra la fila de CA-1 de la matriz: no admisible', () => {
  const { p, V } = base();
  ledgerHoy(p, { matriz: { 'CA-2': '⏳', 'CA-3': '⏳' }, evidencia: [] });
  noAdmisible(ronda(p, V), /CA-1/);
});

test('CA-7 (i): se añade la fila de un CA nuevo: no admisible', () => {
  const { p, V } = base();
  ledgerHoy(p, { matriz: { ...PARCIAL, 'CA-4': '✅' }, evidencia: [] });
  noAdmisible(ronda(p, V), /CA-4/);
});

// --- F-V-1: un renombrado de código a la frontera borra código fuera de ella ---
// `git diff` detecta renombrados por defecto y `--name-only` solo lista el
// destino; el origen (borrado) tiene que contar como fichero fuera de la frontera.
const MOVIDO = 'docs/_qa/SPEC-001/x.mjs';
function mueveCodigoAQa(p) {
  fs.mkdirSync(path.join(p.raiz, 'docs/_qa/SPEC-001'), { recursive: true });
  fs.renameSync(path.join(p.raiz, 'core/lib/x.mjs'), path.join(p.raiz, MOVIDO));
}

test('CA-6 (F-V-1): mover core/lib/x.mjs a _qa/SPEC-001/ en un commit: no admisible y nombra el origen', () => {
  const { p, V } = base();
  ledgerHoy(p, { matriz: PARCIAL, evidencia: [fila('CA-2', V)] });
  mueveCodigoAQa(p);
  commitTodo(p.raiz, 'evidencia y movimiento');
  noAdmisible(ronda(p, V), /core\/lib\/x\.mjs/);
});

test('CA-6 (F-V-1): `git mv` a _qa/SPEC-001/ en el índice sin commitear: no admisible y nombra el origen', () => {
  const { p, V } = base();
  casoA(p, V);
  fs.mkdirSync(path.join(p.raiz, 'docs/_qa/SPEC-001'), { recursive: true });
  git(p.raiz, 'mv', 'core/lib/x.mjs', MOVIDO);
  noAdmisible(ronda(p, V), /core\/lib\/x\.mjs/);
});

test('CA-7 (F-V-1): fila nueva con Commit W que renombra core/lib/x.mjs a _qa/SPEC-001/: no admisible', () => {
  const { p, V } = base();
  mueveCodigoAQa(p);
  const W = commitTodo(p.raiz, 'movimiento');
  ledgerHoy(p, { matriz: PARCIAL, evidencia: [fila('CA-2', W)] });
  commitTodo(p.raiz, 'evidencia');
  // El motivo de CA-7.4, no solo el de la frontera de V..HEAD: el Commit W difiere de V fuera de ella.
  noAdmisible(ronda(p, V), new RegExp(`otro código: el Commit ${W}[^\\n]*core/lib/x\\.mjs`));
});

test('CA-6 (F-V-1, misma familia): con `diff.relative` y el proyecto en un subdirectorio del repo, un cambio fuera del subdirectorio cuenta', () => {
  const p0 = proyecto(SPEC, { estado: 'en-revision', ledger: ledgerSecciones({ matriz: PARCIAL, evidencia: [] }) });
  const raizGit = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-ronda-sub-')));
  const sub = path.join(raizGit, 'sub');
  fs.cpSync(p0.raiz, sub, { recursive: true });
  escribe(raizGit, 'lib/x.mjs', 'export const x = 1;\n');
  const V = repo(raizGit);
  git(raizGit, 'config', 'diff.relative', 'true');
  const p = { raiz: sub, spec: path.join(sub, path.relative(p0.raiz, p0.spec)), ledger: path.join(sub, path.relative(p0.raiz, p0.ledger)) };
  ledgerHoy(p, { matriz: PARCIAL, evidencia: [fila('CA-2', V)] });
  escribe(raizGit, 'lib/x.mjs', 'export const x = 2;\n');
  commitTodo(raizGit, 'evidencia y código fuera del proyecto');
  const r = ronda(p, V);
  noAdmisible(r, /lib\/x\.mjs/);
  // El ledger sigue dentro de la frontera: el único motivo es lib/x.mjs.
  assert.doesNotMatch(r.out, /SPEC-001-x\.ledger\.md cambió/);
});
