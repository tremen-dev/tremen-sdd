import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Raíz del repo real: tools/tests/ -> tools -> repo.
const REPO = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

// Monta un repo git temporal con el pre-commit L2 instalado (core/, tools/githooks
// y el instalador copiados verbatim del repo real). Cross-platform: prueba en la
// práctica el shim sh -> node (CA-1: funciona en Windows).
function initRepo({ rama, estadoSpec, rutasVigiladas = ['src/'] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-pc-'));
  execSync('git init -b main', { cwd: dir });
  execSync('git config user.email t@t', { cwd: dir });
  execSync('git config user.name t', { cwd: dir });
  fs.cpSync(path.join(REPO, 'core'), path.join(dir, 'core'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'tools'), { recursive: true });
  fs.cpSync(path.join(REPO, 'tools', 'githooks'), path.join(dir, 'tools', 'githooks'), { recursive: true });
  fs.cpSync(path.join(REPO, 'tools', 'install-hooks.mjs'), path.join(dir, 'tools', 'install-hooks.mjs'));
  fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify({
    idioma: 'es', rutasVigiladas, linter: 'none',
    gates: { requireSpec: true, protegeVerdad: true, calidad: true },
  }));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  if (estadoSpec) {
    const ep = path.join(dir, 'docs', 'epicas', 'EPIC-001-x');
    fs.mkdirSync(ep, { recursive: true });
    fs.writeFileSync(path.join(ep, 'SPEC-002-x.md'),
      `---\nid: SPEC-002\ntipo: spec\nepica: EPIC-001\nestado: ${estadoSpec}\nhistorial:\n  - {estado: ${estadoSpec}, fecha: 2026-07-01, por: x}\n---\n`);
  }
  fs.writeFileSync(path.join(dir, 'README.md'), 'x');
  execSync('git add -A', { cwd: dir });
  execSync('git commit -m base --no-verify', { cwd: dir });
  execSync('node tools/install-hooks.mjs', { cwd: dir });
  if (rama) execSync(`git checkout -b ${rama}`, { cwd: dir });
  return dir;
}

// Escribe + stagea un fichero relativo, luego intenta commitear con el hook activo.
function stageYCommit(dir, rel, contenido = 'x', env = {}) {
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, contenido);
  execSync(`git add "${rel}"`, { cwd: dir });
  const r = spawnSync('git', ['commit', '-m', 'cambio'], {
    cwd: dir, encoding: 'utf8', env: { ...process.env, ...env },
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

// --- CA-2: require-spec fail-closed sobre código vigilado ---

test('CA-2a: rama invalida (main) + ruta vigilada -> commit abortado con RN-01', () => {
  const dir = initRepo();
  const r = stageYCommit(dir, 'src/app.ts');
  assert.notEqual(r.code, 0);
  assert.match(r.out, /RN-01/);
});

test('CA-2a bis: rama de spec inexistente (ft/SPEC-999) + vigilada -> abortado', () => {
  const dir = initRepo({ rama: 'ft/SPEC-999-x' });
  const r = stageYCommit(dir, 'src/app.ts');
  assert.notEqual(r.code, 0);
  assert.match(r.out, /SPEC-999/);
});

test('CA-2a ter: spec en borrador + vigilada -> abortado', () => {
  const dir = initRepo({ rama: 'ft/SPEC-002-x', estadoSpec: 'borrador' });
  const r = stageYCommit(dir, 'src/app.ts');
  assert.notEqual(r.code, 0);
  assert.match(r.out, /borrador/);
});

test('CA-2b: rama ft/SPEC-002 + spec aprobada + vigilada -> commit procede', () => {
  const dir = initRepo({ rama: 'ft/SPEC-002-x', estadoSpec: 'aprobada' });
  const r = stageYCommit(dir, 'src/app.ts');
  assert.equal(r.code, 0);
});

test('CA-2b bis: rama ft/SPEC-002 + spec en-progreso + vigilada -> procede', () => {
  const dir = initRepo({ rama: 'ft/SPEC-002-x', estadoSpec: 'en-progreso' });
  const r = stageYCommit(dir, 'src/app.ts');
  assert.equal(r.code, 0);
});

test('CA-2c: rama invalida + vigilada + SDD_SKIP_GATE=1 -> commit procede', () => {
  const dir = initRepo();
  const r = stageYCommit(dir, 'src/app.ts', 'x', { SDD_SKIP_GATE: '1' });
  assert.equal(r.code, 0);
});

// --- CA-3: coherencia de artefactos (RN-07), misma lógica que valida.mjs ---

test('CA-3: artefacto SDD incoherente staged -> commit abortado (RN-07)', () => {
  const dir = initRepo();
  const rel = 'docs/epicas/EPIC-001-x/SPEC-050-y.md';
  const contenido = '---\nid: SPEC-050\ntipo: spec\nepica: EPIC-001\nestado: aprobada\n'
    + 'historial:\n  - {estado: borrador, fecha: 2026-07-01, por: x}\n---\n';
  const r = stageYCommit(dir, rel, contenido);
  assert.notEqual(r.code, 0);
  assert.match(r.out, /RN-07|historial/);
});

test('CA-3 bis: artefacto SDD coherente staged -> commit procede', () => {
  const dir = initRepo();
  const rel = 'docs/epicas/EPIC-001-x/SPEC-051-y.md';
  const contenido = '---\nid: SPEC-051\ntipo: spec\nepica: EPIC-001\nestado: aprobada\n'
    + 'historial:\n  - {estado: aprobada, fecha: 2026-07-01, por: x}\n---\n';
  const r = stageYCommit(dir, rel, contenido);
  assert.equal(r.code, 0);
});

// --- CA-4: commit limpio pasa sin fricción ---

test('CA-4: cambio en ruta NO vigilada -> commit exitoso (exit 0)', () => {
  const dir = initRepo();
  const r = stageYCommit(dir, 'docs/notas.md', 'apuntes');
  assert.equal(r.code, 0);
});
