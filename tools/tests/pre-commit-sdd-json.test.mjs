import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { leerSddJson } from '../../core/lib/sdd-json.mjs';
import { mensajeSddJsonIlegible } from '../../core/lib/sdd-json-mensaje.mjs';

// SPEC-027 CA-6 — el pre-commit L2 bloquea con un .sdd.json ilegible (ADR-017 §2).
// Mismo montaje que pre-commit.test.mjs: repo git temporal con el hook instalado.
const REPO = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const SIN = Symbol('sin .sdd.json');

function initRepo(sddJson) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-pc-ilegible-'));
  execSync('git init -q -b main', { cwd: dir });
  execSync('git config user.email t@t', { cwd: dir });
  execSync('git config user.name t', { cwd: dir });
  fs.cpSync(path.join(REPO, 'core'), path.join(dir, 'core'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'tools'), { recursive: true });
  fs.cpSync(path.join(REPO, 'tools', 'githooks'), path.join(dir, 'tools', 'githooks'), { recursive: true });
  fs.cpSync(path.join(REPO, 'tools', 'install-hooks.mjs'), path.join(dir, 'tools', 'install-hooks.mjs'));
  fs.writeFileSync(path.join(dir, 'README.md'), 'x');
  execSync('git add -A', { cwd: dir });
  execSync('git commit -q -m base --no-verify', { cwd: dir });
  execSync('node tools/install-hooks.mjs', { cwd: dir });
  // El .sdd.json se escribe tras el commit base y queda sin stagear: el
  // pre-commit lo lee del árbol de trabajo, como hoy.
  if (sddJson !== SIN) fs.writeFileSync(path.join(dir, '.sdd.json'), sddJson);
  return dir;
}

function commitea(dir, env = {}) {
  fs.writeFileSync(path.join(dir, 'notas.txt'), String(Math.random()));
  execSync('git add notas.txt', { cwd: dir });
  const r = spawnSync('git', ['commit', '-m', 'cambio'], {
    cwd: dir, encoding: 'utf8', env: { ...process.env, SDD_SKIP_GATE: '', ...env },
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

test('CA-6(a)/CA-4: .sdd.json ilegible -> commit bloqueado con el texto de CA-4', () => {
  const dir = initRepo('{ roto');
  const r = commitea(dir);
  assert.notEqual(r.code, 0);
  assert.ok(r.out.includes(mensajeSddJsonIlegible(leerSddJson(dir))), r.out);
});

test('CA-6(a): también con null, [] y vacío', () => {
  for (const crudo of ['null', '[]', '']) {
    const dir = initRepo(crudo);
    const r = commitea(dir);
    assert.notEqual(r.code, 0, crudo);
    assert.ok(r.out.includes(mensajeSddJsonIlegible(leerSddJson(dir))), r.out);
  }
});

test('CA-6(b): .sdd.json ilegible con SDD_SKIP_GATE=1 -> exit 0', () => {
  const r = commitea(initRepo('{ roto'), { SDD_SKIP_GATE: '1' });
  assert.equal(r.code, 0, r.out);
});

test('CA-6(c): .sdd.json válido (con y sin BOM) -> se comporta como hoy (commit fuera de rutas vigiladas pasa)', () => {
  const cfg = JSON.stringify({ idioma: 'es', rutasVigiladas: ['src/'] });
  assert.equal(commitea(initRepo(cfg)).code, 0);
  assert.equal(commitea(initRepo('﻿' + cfg)).code, 0);
});

test('CA-6(d): sin .sdd.json -> se comporta como hoy (commit pasa)', () => {
  assert.equal(commitea(initRepo(SIN)).code, 0);
});
