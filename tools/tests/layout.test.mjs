import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkLayout } from '../checks/layout.mjs';
import { REPO_ROOT } from '../checks/_util.mjs';

const FUENTE_CHECK = fs.readFileSync(
  path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'checks', 'layout.mjs'), 'utf8');

// Superficie AS-BUILT de los tres adaptadores (docs/arquitectura.md, ADR-007):
// kimi-code no tiene commands/, opencode no tiene hooks/ ni .claude-plugin/.
const SUPERFICIE = {
  'claude-code': ['agents', 'skills', 'tests', 'commands', 'hooks', '.claude-plugin'],
  'kimi-code': ['agents', 'skills', 'tests', 'hooks'],
  'opencode': ['agents', 'skills', 'tests', 'commands', 'plugins'],
};

function buenLayout() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-layout-'));
  for (const d of ['core/lib', 'core/scripts', 'core/templates', 'core/roles', 'core/tests', 'tools']) {
    fs.mkdirSync(path.join(dir, d), { recursive: true });
  }
  for (const [harness, dirs] of Object.entries(SUPERFICIE)) {
    for (const d of dirs) fs.mkdirSync(path.join(dir, 'adapters', harness, d), { recursive: true });
  }
  fs.writeFileSync(path.join(dir, 'adapters/claude-code/.claude-plugin/plugin.json'), '{}');
  fs.writeFileSync(path.join(dir, 'adapters/opencode/opencode.json'), '{}');
  fs.mkdirSync(path.join(dir, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.claude-plugin/marketplace.json'), '{}');
  fs.writeFileSync(path.join(dir, 'tools/build-adapter.mjs'), '// x');
  return dir;
}

// borra una ruta relativa del árbol sintético (dir o fichero).
function quita(dir, rel) {
  fs.rmSync(path.join(dir, rel), { recursive: true, force: true });
}

test('CA-1: el árbol real del repo pasa el check de layout', () => {
  assert.equal(checkLayout(REPO_ROOT).ok, true);
});

test('CA-1: un layout bien formado pasa', () => {
  assert.equal(checkLayout(buenLayout()).ok, true);
});

test('CA-1: método en la raíz hace fallar el check', () => {
  const dir = buenLayout();
  fs.mkdirSync(path.join(dir, 'scripts'));
  const { ok, errores } = checkLayout(dir);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /método fuera de core/.test(e)));
});

test('CA-1: superficie de adaptador en la raíz hace fallar el check', () => {
  const dir = buenLayout();
  fs.mkdirSync(path.join(dir, 'agents'));
  const { ok, errores } = checkLayout(dir);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /superficie de adaptador en la raíz/.test(e)));
});

test('CA-1: plugin.json en la raíz hace fallar el check', () => {
  const dir = buenLayout();
  fs.writeFileSync(path.join(dir, '.claude-plugin/plugin.json'), '{}');
  const { ok, errores } = checkLayout(dir);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /plugin\.json de adaptador en la raíz/.test(e)));
});

// --- SPEC-017 CA-1: el mínimo común (agents/, skills/, tests/) se exige a TODOS
// los adaptadores, descubiertos del sistema de ficheros (ADR-011 §1). ---

test('SPEC-017 CA-1a/CA-2: kimi-code sin tests/ pone el check en rojo nombrando al culpable', () => {
  const dir = buenLayout();
  quita(dir, 'adapters/kimi-code/tests');
  const { ok, errores } = checkLayout(dir);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /falta adapters\/kimi-code\/tests\//.test(e)),
    `ningún error nombra al adaptador culpable: ${JSON.stringify(errores)}`);
});

test('SPEC-017 CA-1b: opencode sin agents/ pone el check en rojo', () => {
  const dir = buenLayout();
  quita(dir, 'adapters/opencode/agents');
  const { ok, errores } = checkLayout(dir);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /falta adapters\/opencode\/agents\//.test(e)));
});

test('SPEC-017 CA-1c: un adaptador desconocido sin skills/ falla sin que su nombre esté en el check', () => {
  const dir = buenLayout();
  for (const d of ['agents', 'tests']) {
    fs.mkdirSync(path.join(dir, 'adapters', 'harness-nuevo', d), { recursive: true });
  }
  const { ok, errores } = checkLayout(dir);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /falta adapters\/harness-nuevo\/skills\//.test(e)));
  assert.ok(!/harness-nuevo/.test(FUENTE_CHECK),
    'el check cablea el nombre del harness: la cobertura no es por autodescubrimiento');
});

// --- SPEC-017 CA-3: los extras son declarativos; un adaptador no declarado se
// juzga SOLO por el mínimo común (ADR-011 §3). ---

test('SPEC-017 CA-3a: un adaptador nuevo con solo el mínimo común pasa (sin falso positivo)', () => {
  const dir = buenLayout();
  for (const d of ['agents', 'skills', 'tests']) {
    fs.mkdirSync(path.join(dir, 'adapters', 'harness-nuevo', d), { recursive: true });
  }
  const { ok, errores } = checkLayout(dir);
  assert.equal(ok, true, `falsos positivos sobre un adaptador no declarado: ${JSON.stringify(errores)}`);
});

test('SPEC-017 CA-3b: a kimi-code no se le exige commands/ (ADR-003)', () => {
  const dir = buenLayout();
  assert.equal(fs.existsSync(path.join(dir, 'adapters/kimi-code/commands')), false);
  const { ok, errores } = checkLayout(dir);
  assert.equal(ok, true);
  assert.ok(!errores.some((e) => /kimi-code\/commands/.test(e)));
});

test('SPEC-017 CA-3c: a opencode no se le exige hooks/ (ADR-007)', () => {
  const dir = buenLayout();
  assert.equal(fs.existsSync(path.join(dir, 'adapters/opencode/hooks')), false);
  const { ok, errores } = checkLayout(dir);
  assert.equal(ok, true);
  assert.ok(!errores.some((e) => /opencode\/hooks/.test(e)));
});

// --- SPEC-017 CA-4: los extras DECLARADOS se exigen de verdad. ---

test('SPEC-017 CA-4a: claude-code sin commands/ pone el check en rojo', () => {
  const dir = buenLayout();
  quita(dir, 'adapters/claude-code/commands');
  const { ok, errores } = checkLayout(dir);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /falta adapters\/claude-code\/commands\//.test(e)));
});

test('SPEC-017 CA-4a-bis: claude-code sin .claude-plugin/plugin.json pone el check en rojo', () => {
  const dir = buenLayout();
  quita(dir, 'adapters/claude-code/.claude-plugin/plugin.json');
  const { ok, errores } = checkLayout(dir);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /falta adapters\/claude-code\/\.claude-plugin\/plugin\.json/.test(e)));
});

test('SPEC-017 CA-4b: opencode sin plugins/ pone el check en rojo', () => {
  const dir = buenLayout();
  quita(dir, 'adapters/opencode/plugins');
  const { ok, errores } = checkLayout(dir);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /falta adapters\/opencode\/plugins\//.test(e)));
});

test('SPEC-017 CA-4b-bis: opencode sin opencode.json pone el check en rojo', () => {
  const dir = buenLayout();
  quita(dir, 'adapters/opencode/opencode.json');
  const { ok, errores } = checkLayout(dir);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /falta adapters\/opencode\/opencode\.json/.test(e)));
});

test('SPEC-017 CA-4c: kimi-code sin hooks/ pone el check en rojo', () => {
  const dir = buenLayout();
  quita(dir, 'adapters/kimi-code/hooks');
  const { ok, errores } = checkLayout(dir);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /falta adapters\/kimi-code\/hooks\//.test(e)));
});

test('SPEC-017 CA-4d: un adaptador declarado que no existe es fallo, no verde por ausencia', () => {
  const dir = buenLayout();
  quita(dir, 'adapters/claude-code');
  const { ok, errores } = checkLayout(dir);
  assert.equal(ok, false, 'borrar un adaptador declarado entero dejó el check en verde');
  assert.ok(errores.some((e) => /adapters\/claude-code/.test(e)));
});

// --- SPEC-017 CA-5: la superficie prohibida en la raíz es una lista CERRADA
// (ADR-011 §4), nunca derivada de readdir(adapters/*). ---

test('SPEC-017 CA-5a: un plugins/ en la raíz hace fallar el check', () => {
  const dir = buenLayout();
  fs.mkdirSync(path.join(dir, 'plugins'));
  const { ok, errores } = checkLayout(dir);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /superficie de adaptador en la raíz: \/plugins\//.test(e)));
});

test('SPEC-017 CA-5b: un adapters/<h>/docs/ no convierte el docs/ de la raíz en infracción', () => {
  const dir = buenLayout();
  fs.mkdirSync(path.join(dir, 'docs'));
  fs.mkdirSync(path.join(dir, 'adapters/kimi-code/docs'));
  const { ok, errores } = checkLayout(dir);
  assert.equal(ok, true, `la lista de prohibidos se derivó del FS: ${JSON.stringify(errores)}`);
});

// --- SPEC-017 CA-6: el check declara a quién ha mirado (ADR-011 §6). ---

test('SPEC-017 CA-6: el resultado expone los adaptadores recorridos y contiene los tres', () => {
  const r = checkLayout(REPO_ROOT);
  assert.equal(r.ok, true);
  assert.ok(Array.isArray(r.adaptadores), 'el check no expone la lista de adaptadores recorridos');
  for (const h of ['claude-code', 'kimi-code', 'opencode']) {
    assert.ok(r.adaptadores.includes(h), `el check no recorrió ${h}`);
  }
});
