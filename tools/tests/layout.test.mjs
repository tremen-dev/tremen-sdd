import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkLayout } from '../checks/layout.mjs';
import { REPO_ROOT } from '../checks/_util.mjs';

function buenLayout() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-layout-'));
  for (const d of ['core/lib', 'core/scripts', 'core/templates', 'core/roles', 'core/tests',
    'adapters/claude-code/.claude-plugin', 'adapters/claude-code/agents', 'adapters/claude-code/skills',
    'adapters/claude-code/commands', 'adapters/claude-code/hooks', 'adapters/claude-code/tests', 'tools']) {
    fs.mkdirSync(path.join(dir, d), { recursive: true });
  }
  fs.writeFileSync(path.join(dir, 'adapters/claude-code/.claude-plugin/plugin.json'), '{}');
  fs.mkdirSync(path.join(dir, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.claude-plugin/marketplace.json'), '{}');
  fs.writeFileSync(path.join(dir, 'tools/build-adapter.mjs'), '// x');
  return dir;
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
