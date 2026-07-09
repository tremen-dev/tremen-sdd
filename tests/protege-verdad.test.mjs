import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const HOOK = path.resolve('hooks/protege-verdad.mjs');

function proyecto() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify({
    idioma: 'es', rutasVigiladas: ['src/'], linter: 'none',
    gates: { requireSpec: true, protegeVerdad: true, calidad: true },
  }));
  return dir;
}

function corre(cwd, filePath, agentType) {
  const payload = JSON.stringify({ cwd, tool_name: 'Edit', agent_type: agentType, tool_input: { file_path: filePath } });
  return spawnSync('node', [HOOK], { input: payload, encoding: 'utf8' }).stdout.trim();
}

test('deniega tablero.md a cualquiera', () => {
  const dir = proyecto();
  assert.match(corre(dir, path.join(dir, 'docs', 'tablero.md'), 'main'), /deny/);
});

test('deniega FOUNDATION.md a un rol no dueño', () => {
  const dir = proyecto();
  const out = corre(dir, path.join(dir, 'FOUNDATION.md'), 'sdd-implementador');
  assert.match(out, /deny/);
  assert.match(out, /propón/i);
});

test('permite FOUNDATION.md a sdd-arquitecto y a main', () => {
  const dir = proyecto();
  assert.equal(corre(dir, path.join(dir, 'FOUNDATION.md'), 'sdd-arquitecto'), '');
  assert.equal(corre(dir, path.join(dir, 'FOUNDATION.md'), undefined), '');
});

test('deniega docs/fundacion/* a rol no dueño y permite a sdd-producto', () => {
  const dir = proyecto();
  const f = path.join(dir, 'docs', 'fundacion', 'vision.md');
  assert.match(corre(dir, f, 'sdd-verificador'), /deny/);
  assert.equal(corre(dir, f, 'sdd-producto'), '');
});

test('fail-open sin .sdd.json', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  assert.equal(corre(dir, path.join(dir, 'docs', 'tablero.md'), 'main'), '');
});
