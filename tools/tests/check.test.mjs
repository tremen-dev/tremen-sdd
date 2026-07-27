import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { PASOS, ejecuta } from '../check.mjs';
// namespace: 'resumen' es la superficie nueva de SPEC-017 CA-8 y debe poder
// comprobarse como ausente sin tumbar el resto del fichero.
import * as runner from '../check.mjs';

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

test('SPEC-004 CA-3d: nucleo-agnostico está cableado en el runner (cierra la fuga de token en CI)', () => {
  const paso = PASOS.find((p) => p.nombre === 'nucleo-agnostico');
  assert.ok(paso, "falta el paso 'nucleo-agnostico' en el runner");
  assert.deepEqual(paso.cmd, ['node', 'tools/checks/nucleo-agnostico.mjs']);
});

test('SPEC-006 CA-6: prosa-gates está cableado en el runner (guarda la barrera en prosa)', () => {
  const paso = PASOS.find((p) => p.nombre === 'prosa-gates');
  assert.ok(paso, "falta el paso 'prosa-gates' en el runner");
  assert.deepEqual(paso.cmd, ['node', 'tools/checks/prosa-gates.mjs']);
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

// --- SPEC-017 bloque B: la prosa del runner se DERIVA de PASOS (RN-10) ---

const FUENTE_RUNNER = fs.readFileSync(path.join(REPO, 'tools', 'check.mjs'), 'utf8');

// cabecera = bloque de comentarios inicial, hasta la primera línea de código.
function cabecera() {
  const lineas = [];
  for (const l of FUENTE_RUNNER.split('\n')) {
    if (l.startsWith('#!')) continue;
    if (!l.startsWith('//')) break;
    lineas.push(l);
  }
  return lineas.join('\n');
}

test('SPEC-017 CA-8: resumen(PASOS) nombra los tres adaptadores que el runner construye', () => {
  assert.equal(typeof runner.resumen, 'function', "check.mjs no exporta la función pura 'resumen'");
  const texto = runner.resumen(PASOS);
  for (const h of ['claude-code', 'kimi-code', 'opencode']) {
    assert.ok(texto.includes(h), `el resumen no nombra ${h}: "${texto}"`);
  }
});

test('SPEC-017 CA-8: resumen() se deriva de los pasos recibidos, no de una cadena fija', () => {
  assert.equal(typeof runner.resumen, 'function', "check.mjs no exporta la función pura 'resumen'");
  const texto = runner.resumen([
    { nombre: 'build-x', cmd: ['node', 'tools/build-adapter.mjs', 'harness-x'] },
    { nombre: 'foo', cmd: ['node', 'tools/checks/foo.mjs'] },
  ]);
  assert.ok(texto.includes('harness-x'), `el resumen ignora los pasos recibidos: "${texto}"`);
  assert.ok(texto.includes('foo'), `el resumen ignora los checks recibidos: "${texto}"`);
  for (const real of ['claude-code', 'kimi-code', 'opencode']) {
    assert.ok(!texto.includes(real), `el resumen cuela adaptadores reales sobre pasos sintéticos: "${texto}"`);
  }
});

test('SPEC-017 CA-9: la prosa de check.mjs no contradice a PASOS', () => {
  assert.ok(!/seis/i.test(FUENTE_RUNNER), "check.mjs sigue diciendo 'SEIS' checks");
  assert.ok(!/ambos adaptadores/i.test(FUENTE_RUNNER), "check.mjs sigue diciendo 'ambos adaptadores'");
});

test('SPEC-017 CA-9: la cabecera de check.mjs no repite el conteo de checks', () => {
  assert.ok(!/\b(\d+|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+checks\b/i.test(cabecera()),
    'la cabecera declara un conteo de checks que puede envejecer; remite a PASOS');
});

test('SPEC-017 CA-9: PASOS referencia exactamente 9 scripts distintos de tools/checks/', () => {
  const scripts = new Set(PASOS.map((p) => p.cmd[1]).filter((s) => s.includes('tools/checks/')));
  assert.equal(scripts.size, 9);
});

test('SPEC-017 CA-10: el runner conserva sus 17 pasos, con layout como un solo paso', () => {
  assert.equal(PASOS.length, 17);
  assert.deepEqual(nombres(), [
    'build', 'build-kimi', 'build-opencode',
    'layout', 'nucleo-aislado', 'nucleo-agnostico', 'fuente-unica',
    'referencias', 'referencias-kimi', 'referencias-opencode',
    'roles-fuente-unica',
    'manifiestos', 'manifiestos-kimi', 'manifiestos-opencode',
    'descripcion-fuente-unica', 'prosa-gates', 'valida',
  ]);
  assert.equal(PASOS.filter((p) => p.cmd[1] === 'tools/checks/layout.mjs').length, 1);
});
