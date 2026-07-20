import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

// Clon "fresco" sin core.hooksPath: copia el instalador, el dir de hooks y el
// núcleo, tal y como los tendría un clon del repo.
function clonFresco() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-inst-'));
  execSync('git init -b main', { cwd: dir });
  execSync('git config user.email t@t', { cwd: dir });
  execSync('git config user.name t', { cwd: dir });
  fs.cpSync(path.join(REPO, 'core'), path.join(dir, 'core'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'tools'), { recursive: true });
  fs.cpSync(path.join(REPO, 'tools', 'githooks'), path.join(dir, 'tools', 'githooks'), { recursive: true });
  fs.cpSync(path.join(REPO, 'tools', 'install-hooks.mjs'), path.join(dir, 'tools', 'install-hooks.mjs'));
  fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify({
    idioma: 'es', rutasVigiladas: ['src/'], linter: 'none',
    gates: { requireSpec: true, protegeVerdad: true, calidad: true },
  }));
  fs.writeFileSync(path.join(dir, 'README.md'), 'x');
  execSync('git add -A', { cwd: dir });
  execSync('git commit -m base --no-verify', { cwd: dir });
  return dir;
}

test('CA-1a: un clon fresco no tiene core.hooksPath hasta instalar', () => {
  const dir = clonFresco();
  const r = spawnSync('git', ['config', '--get', 'core.hooksPath'], { cwd: dir, encoding: 'utf8' });
  assert.notEqual(r.status, 0); // sin configurar -> git config --get sale != 0
});

test('CA-1a: tras el comando de instalación, core.hooksPath = tools/githooks', () => {
  const dir = clonFresco();
  execSync('node tools/install-hooks.mjs', { cwd: dir });
  const valor = execSync('git config --get core.hooksPath', { cwd: dir, encoding: 'utf8' }).trim();
  assert.equal(valor, 'tools/githooks');
});

test('CA-1b: tras instalar, un commit ejercita el pre-commit (bloquea vigilado sin spec)', () => {
  const dir = clonFresco();
  execSync('node tools/install-hooks.mjs', { cwd: dir });
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'app.ts'), 'x');
  execSync('git add src/app.ts', { cwd: dir });
  const r = spawnSync('git', ['commit', '-m', 'x'], { cwd: dir, encoding: 'utf8' });
  assert.notEqual(r.status, 0); // el hook corrió y bloqueó -> prueba que se dispara
  assert.match((r.stdout || '') + (r.stderr || ''), /RN-01/);
});

test('CA-1b (regresión cross-platform): el shim versionado tiene modo git 100755 (+x)', () => {
  // En POSIX git NO ejecuta un hook sin bit +x -> el pre-commit se saltaría y el
  // commit procedería (exit 0). El bit del filesystem no es fiable en Windows,
  // pero el MODO DEL ÍNDICE git es determinista en cualquier SO: debe ser 100755.
  const linea = execSync('git ls-files -s tools/githooks/pre-commit', { cwd: REPO, encoding: 'utf8' }).trim();
  assert.match(linea, /^100755\b/, `el shim debe estar committeado como ejecutable (100755), no ${linea.split(/\s/)[0]}`);
});

test('CA-1c: package.json sigue sin dependencies de terceros (cero deps)', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  const deps = Object.keys(pkg.dependencies ?? {});
  assert.equal(deps.length, 0);
  assert.equal(pkg.private, true);
});

test('CA-1: el comando de instalación está expuesto como script npm hooks:install', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts['hooks:install'], 'falta el script hooks:install');
  assert.match(pkg.scripts['hooks:install'], /install-hooks\.mjs/);
});
