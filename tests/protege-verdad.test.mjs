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

// Regresión: file_path RELATIVO no debe resolverse contra el cwd del proceso
// del hook (que hereda el del runner, no el del proyecto en payload.cwd).
// Sin path.resolve(cwd, fichero) esto bypasea el gate por completo.
test('deniega file_path relativo a un documento de verdad (bypass crítico)', () => {
  const dir = proyecto();
  assert.match(corre(dir, 'FOUNDATION.md', 'sdd-implementador'), /deny/);
  assert.match(corre(dir, 'docs/fundacion/x.md', 'sdd-verificador'), /deny/);
});

// CA-A2 (SPEC-012 / bug 0.3.1): el DUEÑO legítimo llega prefijado cuando corre
// como subagente de plugin (agent_type === 'tremen-sdd:sdd-arquitecto'). Debe
// PERMITIR tras normalizar el prefijo.
test('permite documento de verdad al dueño con prefijo de plugin (arquitecto/PO)', () => {
  const dir = proyecto();
  assert.equal(corre(dir, path.join(dir, 'FOUNDATION.md'), 'tremen-sdd:sdd-arquitecto'), '');
  assert.equal(corre(dir, path.join(dir, 'docs', 'fundacion', 'vision.md'), 'tremen-sdd:sdd-producto'), '');
});

// CA-A3: un subagente de plugin NO dueño sigue denegado tras normalizar.
test('deniega documento de verdad a subagente de plugin no dueño (con prefijo)', () => {
  const dir = proyecto();
  assert.match(corre(dir, path.join(dir, 'FOUNDATION.md'), 'tremen-sdd:sdd-implementador'), /deny/);
  assert.match(corre(dir, path.join(dir, 'docs', 'fundacion', 'x.md'), 'tremen-sdd:sdd-verificador'), /deny/);
});

// CA-A4 / CA-A1: la normalización es no-op para roles sin prefijo (retrocompat)
// y es plugin-agnóstica: se queda con el segmento tras el ÚLTIMO ':' venga del
// plugin que venga (ADR-008), no restringida a 'tremen-sdd:'.
test('normalización de prefijo es no-op sin prefijo y plugin-agnóstica', () => {
  const dir = proyecto();
  // sin prefijo: dueño permitido, no-dueño denegado (retrocompat)
  assert.equal(corre(dir, path.join(dir, 'FOUNDATION.md'), 'sdd-arquitecto'), '');
  assert.match(corre(dir, path.join(dir, 'FOUNDATION.md'), 'sdd-implementador'), /deny/);
  // prefijo de OTRO plugin también se normaliza
  assert.equal(corre(dir, path.join(dir, 'FOUNDATION.md'), 'otro-plugin:sdd-arquitecto'), '');
  assert.match(corre(dir, path.join(dir, 'FOUNDATION.md'), 'otro-plugin:sdd-implementador'), /deny/);
});
