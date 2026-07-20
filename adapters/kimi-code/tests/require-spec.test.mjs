import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync, execSync } from 'node:child_process';

// CA-5: el hook de Kimi ejerce require-spec con un payload en FORMATO KIMI
// (stdin JSON con cwd/tool_name/tool_input) contra el artefacto construido.
const HOOK = path.resolve('dist/kimi-code/hooks/require-spec.mjs');

function proyecto({ rama, estadoSpec, rutasVigiladas = ['src/'] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-kimi-'));
  execSync('git init -b main', { cwd: dir });
  fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify({
    idioma: 'es', rutasVigiladas, linter: 'none',
    gates: { requireSpec: true, protegeVerdad: true, calidad: true },
  }));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  if (estadoSpec) {
    const ep = path.join(dir, 'docs', 'epicas', 'EPIC-001-x');
    fs.mkdirSync(ep, { recursive: true });
    fs.writeFileSync(path.join(ep, 'SPEC-001-alta.md'),
      `---\nid: SPEC-001\ntipo: spec\nepica: EPIC-001\nestado: ${estadoSpec}\nhistorial:\n  - {estado: ${estadoSpec}, fecha: 2026-07-01, por: x}\n---\n`);
  }
  fs.writeFileSync(path.join(dir, 'a.txt'), 'x');
  execSync('git add -A && git -c user.email=t@t -c user.name=t commit -m x', { cwd: dir, shell: true });
  if (rama) execSync(`git checkout -b ${rama}`, { cwd: dir });
  return dir;
}

// Payload en formato Kimi: incluye session_id/hook_event_name además de cwd/tool_*.
function corre(cwd, filePath, env = {}) {
  const payload = JSON.stringify({
    session_id: 'kimi-sess', hook_event_name: 'PreToolUse',
    cwd, tool_name: 'Edit', tool_input: { file_path: filePath },
  });
  const r = spawnSync('node', [HOOK], { input: payload, encoding: 'utf8', env: { ...process.env, ...env } });
  return { code: r.status, out: r.stdout.trim() };
}

test('CA-5b: deniega edición en ruta vigilada sin rama de spec (payload Kimi)', () => {
  const dir = proyecto();
  const { out } = corre(dir, path.join(dir, 'src', 'app.ts'));
  const j = JSON.parse(out);
  assert.equal(j.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /sdd-arquitecto/);
});

test('CA-5b: permite con rama ft/SPEC-001-* y spec aprobada (payload Kimi)', () => {
  const dir = proyecto({ rama: 'ft/SPEC-001-alta', estadoSpec: 'aprobada' });
  assert.equal(corre(dir, path.join(dir, 'src', 'app.ts')).out, '');
});

test('CA-5b: deniega si la spec está en borrador (payload Kimi)', () => {
  const dir = proyecto({ rama: 'ft/SPEC-001-alta', estadoSpec: 'borrador' });
  assert.match(corre(dir, path.join(dir, 'src', 'app.ts')).out, /borrador/);
});

test('CA-5b: fail-open sin .sdd.json permite (payload Kimi)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-kimi-'));
  assert.equal(corre(dir, path.join(dir, 'src', 'app.ts')).out, '');
});
