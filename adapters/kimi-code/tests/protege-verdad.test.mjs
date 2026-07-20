import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

// CA-5c: protege-verdad en Kimi. El tablero generado se deniega siempre (no
// necesita identidad de agente); para los documentos de verdad, si Kimi NO aporta
// identidad de agente el hook DEGRADA FAIL-OPEN (la garantía la sostiene git/CI).
const HOOK = path.resolve('dist/kimi-code/hooks/protege-verdad.mjs');

function proyecto() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-kimi-pv-'));
  fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify({
    idioma: 'es', rutasVigiladas: ['src/'], linter: 'none',
    gates: { requireSpec: true, protegeVerdad: true, calidad: true },
  }));
  fs.mkdirSync(path.join(dir, 'docs', 'fundacion'), { recursive: true });
  return dir;
}

function corre(cwd, filePath, extra = {}) {
  const payload = JSON.stringify({ cwd, tool_name: 'Edit', tool_input: { file_path: filePath }, ...extra });
  const r = spawnSync('node', [HOOK], { input: payload, encoding: 'utf8' });
  return { code: r.status, out: r.stdout.trim() };
}

test('CA-5c: deniega editar el tablero generado (sin necesidad de identidad)', () => {
  const dir = proyecto();
  const { out } = corre(dir, path.join(dir, 'docs', 'tablero.md'));
  const j = JSON.parse(out);
  assert.equal(j.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /GENERADO/);
});

test('CA-5c: documento de verdad SIN identidad de agente degrada fail-open (permite)', () => {
  const dir = proyecto();
  assert.equal(corre(dir, path.join(dir, 'FOUNDATION.md')).out, '');
});

test('CA-5c: documento de verdad con identidad NO dueña deniega', () => {
  const dir = proyecto();
  const { out } = corre(dir, path.join(dir, 'FOUNDATION.md'), { agent_type: 'sdd-implementador' });
  const j = JSON.parse(out);
  assert.equal(j.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /documento de verdad/);
});

test('CA-5c: documento de verdad con identidad dueña (sdd-arquitecto) permite', () => {
  const dir = proyecto();
  assert.equal(corre(dir, path.join(dir, 'FOUNDATION.md'), { agent_type: 'sdd-arquitecto' }).out, '');
});

test('CA-5c: fichero normal permite', () => {
  const dir = proyecto();
  assert.equal(corre(dir, path.join(dir, 'src', 'app.ts')).out, '');
});
