import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const HOOK = path.resolve('dist/claude-code/hooks/calidad.mjs');

function proyecto(linter = 'none') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify({
    idioma: 'es', rutasVigiladas: ['src/'], linter,
    gates: { requireSpec: true, protegeVerdad: true, calidad: true },
  }));
  return dir;
}

function corre(cwd, filePath) {
  const payload = JSON.stringify({ cwd, tool_name: 'Edit', tool_input: { file_path: filePath } });
  const r = spawnSync('node', [HOOK], { input: payload, encoding: 'utf8' });
  return { code: r.status, err: r.stderr };
}

test('spec con estado/historial desincronizados -> exit 2 con mensaje', () => {
  const dir = proyecto();
  const ep = path.join(dir, 'docs', 'epicas', 'EPIC-001-x');
  fs.mkdirSync(ep, { recursive: true });
  const f = path.join(ep, 'SPEC-001-mal.md');
  fs.writeFileSync(f, '---\nid: SPEC-001\ntipo: spec\nepica: EPIC-001\nestado: aprobada\nhistorial:\n  - {estado: borrador, fecha: 2026-07-01, por: x}\n---\n');
  const { code, err } = corre(dir, f);
  assert.equal(code, 2);
  assert.match(err, /historial/);
});

test('spec coherente -> exit 0', () => {
  const dir = proyecto();
  const ep = path.join(dir, 'docs', 'epicas', 'EPIC-001-x');
  fs.mkdirSync(ep, { recursive: true });
  const f = path.join(ep, 'SPEC-001-bien.md');
  fs.writeFileSync(f, '---\nid: SPEC-001\ntipo: spec\nepica: EPIC-001\nestado: borrador\nhistorial:\n  - {estado: borrador, fecha: 2026-07-01, por: x}\n---\n');
  assert.equal(corre(dir, f).code, 0);
});

test('código con linter none -> exit 0', () => {
  const dir = proyecto('none');
  const f = path.join(dir, 'src', 'app.py');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, 'x=1\n');
  assert.equal(corre(dir, f).code, 0);
});

test('fail-open sin .sdd.json -> exit 0', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  const f = path.join(dir, 'a.py');
  fs.writeFileSync(f, 'x=1\n');
  assert.equal(corre(dir, f).code, 0);
});

test('linter real via shell con ruta con espacio -> exit 0 (regresión quoting win32)', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd con espacio-'));
  fs.writeFileSync(path.join(base, '.sdd.json'), JSON.stringify({
    idioma: 'es', rutasVigiladas: ['src/'], linter: 'ruff',
    gates: { requireSpec: true, protegeVerdad: true, calidad: true },
  }));
  const src = path.join(base, 'src');
  fs.mkdirSync(src, { recursive: true });
  const f = path.join(src, 'app.py');
  fs.writeFileSync(f, 'x = 1\n');
  // stub de ruff: exit 0 si el fichero del argumento existe; exit 1 si no (arg truncado)
  const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-stub-'));
  if (process.platform === 'win32') {
    fs.writeFileSync(path.join(stubDir, 'ruff.cmd'),
      '@echo off\r\nshift\r\nif exist %1 (exit /b 0) else (echo no existe %1 & exit /b 1)\r\n');
  } else {
    const stub = path.join(stubDir, 'ruff');
    fs.writeFileSync(stub, '#!/bin/sh\nshift\n[ -e "$1" ] && exit 0 || { echo "no existe $1"; exit 1; }\n');
    fs.chmodSync(stub, 0o755);
  }
  const payload = JSON.stringify({ cwd: base, tool_name: 'Edit', tool_input: { file_path: f } });
  const r = spawnSync('node', [HOOK], {
    input: payload, encoding: 'utf8',
    env: { ...process.env, PATH: stubDir + path.delimiter + process.env.PATH },
  });
  assert.equal(r.status, 0, 'esperaba exit 0; stderr: ' + r.stderr);
});

// --- CE-3 / SPEC-008: semántica de `auto` = extensión Y config presente ---

// Stub de `ruff` que SIEMPRE sale con `code`, para probar si el hook lo invocó
// o no (independiente de que ruff esté o no instalado en la máquina/CI).
function stubRuff(code) {
  const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-stub-'));
  if (process.platform === 'win32') {
    fs.writeFileSync(path.join(stubDir, 'ruff.cmd'), `@echo off\r\nexit /b ${code}\r\n`);
  } else {
    const stub = path.join(stubDir, 'ruff');
    fs.writeFileSync(stub, `#!/bin/sh\nexit ${code}\n`);
    fs.chmodSync(stub, 0o755);
  }
  return stubDir;
}

function correConPath(cwd, filePath, stubDir) {
  const payload = JSON.stringify({ cwd, tool_name: 'Edit', tool_input: { file_path: filePath } });
  const r = spawnSync('node', [HOOK], {
    input: payload, encoding: 'utf8',
    env: { ...process.env, PATH: stubDir + path.delimiter + process.env.PATH },
  });
  return { code: r.status, err: r.stderr };
}

test('CA-1: auto SIN config del linter -> no invoca linter, exit 0, stderr vacío', () => {
  const dir = proyecto('auto');
  const f = path.join(dir, 'src', 'app.py'); // .py -> ruff por extensión
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, 'x=1\n');
  // stub de ruff que saldría 2 SI se invocara: prueba que NO se invoca (no hay ruff.toml).
  const { code, err } = correConPath(dir, f, stubRuff(2));
  assert.equal(code, 0, 'auto sin config no debe lintear; stderr: ' + err);
  assert.equal(err, '', 'no debe escribir nada en stderr');
});

test('CA-1: linter ausente (== auto) SIN config -> exit 0, stderr vacío', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify({
    idioma: 'es', rutasVigiladas: ['src/'],
    gates: { requireSpec: true, protegeVerdad: true, calidad: true },
  })); // sin clave `linter` -> se trata como auto
  const f = path.join(dir, 'src', 'app.py');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, 'x=1\n');
  const { code, err } = correConPath(dir, f, stubRuff(2));
  assert.equal(code, 0, 'linter ausente sin config no debe lintear; stderr: ' + err);
  assert.equal(err, '');
});

test('CA-2: auto CON config presente (ruff.toml) y stub OK -> exit 0', () => {
  const dir = proyecto('auto');
  fs.writeFileSync(path.join(dir, 'ruff.toml'), '[lint]\n');
  const f = path.join(dir, 'src', 'app.py');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, 'x=1\n');
  const { code } = correConPath(dir, f, stubRuff(0));
  assert.equal(code, 0);
});

test('CA-2: auto CON config presente (ruff.toml) y stub con hallazgos -> exit 2', () => {
  const dir = proyecto('auto');
  fs.writeFileSync(path.join(dir, 'ruff.toml'), '[lint]\n');
  const f = path.join(dir, 'src', 'app.py');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, 'x=1\n');
  const { code, err } = correConPath(dir, f, stubRuff(2));
  assert.equal(code, 2, 'auto con config debe lintear y propagar el fallo');
  assert.match(err, /ruff/);
});
