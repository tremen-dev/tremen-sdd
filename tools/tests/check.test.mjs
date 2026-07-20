import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { PASOS, ejecuta } from '../check.mjs';

const REPO = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

function nombres() {
  return PASOS.map((p) => p.nombre);
}

// --- CA-6a / CA-7: el runner encadena los pasos correctos ---

test('CA-6: PASOS incluye build, los 6 checks y valida, en ese encadenamiento', () => {
  const n = nombres();
  for (const paso of ['build', 'layout', 'nucleo-aislado', 'fuente-unica',
    'referencias', 'roles-fuente-unica', 'manifiestos', 'valida']) {
    assert.ok(n.includes(paso), `falta el paso '${paso}' en el runner`);
  }
});

test('CA-7: nucleo-aislado es un paso requerido del runner (guarda RN-02 en CI)', () => {
  const paso = PASOS.find((p) => p.nombre === 'nucleo-aislado');
  assert.ok(paso);
  assert.deepEqual(paso.cmd, ['node', 'tools/checks/nucleo-aislado.mjs']);
});

test('CA-6: cada paso invoca un script real de tools/checks o core/scripts (no reimplementa)', () => {
  for (const p of PASOS) {
    assert.equal(p.cmd[0], 'node');
    const script = p.cmd[1];
    if (script === 'tools/build-adapter.mjs') continue;
    assert.ok(fs.existsSync(path.join(REPO, script)), `el script ${script} no existe`);
  }
});

// --- CA-7: propagación del exit != 0 ---

test('CA-7: el runner propaga el exit != 0 de un paso (fail-closed)', () => {
  const code = ejecuta([{ nombre: 'boom', cmd: ['node', '-e', 'process.exit(3)'] }], { cwd: REPO });
  assert.equal(code, 3);
});

test('CA-6: el runner sale 0 cuando todos los pasos pasan', () => {
  const code = ejecuta([{ nombre: 'ok', cmd: ['node', '-e', 'process.exit(0)'] }], { cwd: REPO });
  assert.equal(code, 0);
});

// --- CA-6b: exit 0 sobre árbol limpio / exit != 0 sobre árbol que viola una regla,
// usando el check real (valida.mjs) sobre docs controlados. ---

function arbolDocs(estadoUltimoHistorial) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-chk-'));
  const ep = path.join(dir, 'docs', 'epicas', 'EPIC-001-x');
  fs.mkdirSync(ep, { recursive: true });
  fs.writeFileSync(path.join(ep, 'SPEC-070-x.md'),
    `---\nid: SPEC-070\ntipo: spec\nepica: EPIC-001\nestado: aprobada\n`
    + `historial:\n  - {estado: ${estadoUltimoHistorial}, fecha: 2026-07-01, por: x}\n---\n`);
  return dir;
}

const VALIDA = path.join(REPO, 'core', 'scripts', 'valida.mjs');

test('CA-6b: runner con valida sobre un árbol coherente -> exit 0', () => {
  const dir = arbolDocs('aprobada');
  const code = ejecuta([{ nombre: 'valida', cmd: ['node', VALIDA, '--dir', path.join(dir, 'docs')] }], { cwd: REPO });
  assert.equal(code, 0);
});

test('CA-6b: runner con valida sobre un árbol que viola RN-07 -> exit != 0', () => {
  const dir = arbolDocs('borrador'); // estado 'aprobada' pero historial acaba en 'borrador'
  const code = ejecuta([{ nombre: 'valida', cmd: ['node', VALIDA, '--dir', path.join(dir, 'docs')] }], { cwd: REPO });
  assert.notEqual(code, 0);
});
