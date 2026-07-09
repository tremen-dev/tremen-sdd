import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync, execSync } from 'node:child_process';

const HOOK = path.resolve('hooks/require-spec.mjs');

function proyecto({ rama, estadoSpec } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  execSync('git init -b main', { cwd: dir });
  fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify({
    idioma: 'es', rutasVigiladas: ['src/'], linter: 'none',
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

function corre(cwd, filePath, env = {}) {
  const payload = JSON.stringify({ cwd, tool_name: 'Edit', tool_input: { file_path: filePath } });
  const r = spawnSync('node', [HOOK], { input: payload, encoding: 'utf8', env: { ...process.env, ...env } });
  return { code: r.status, out: r.stdout.trim() };
}

test('deniega edición en src/ desde main', () => {
  const dir = proyecto();
  const { out } = corre(dir, path.join(dir, 'src', 'app.ts'));
  const j = JSON.parse(out);
  assert.equal(j.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /sdd-arquitecto/);
});

test('permite con rama ft/SPEC-001-* y spec aprobada', () => {
  const dir = proyecto({ rama: 'ft/SPEC-001-alta', estadoSpec: 'aprobada' });
  assert.equal(corre(dir, path.join(dir, 'src', 'app.ts')).out, '');
});

test('deniega si la spec está en borrador', () => {
  const dir = proyecto({ rama: 'ft/SPEC-001-alta', estadoSpec: 'borrador' });
  assert.match(corre(dir, path.join(dir, 'src', 'app.ts')).out, /borrador/);
});

test('permite ficheros fuera de rutasVigiladas', () => {
  const dir = proyecto();
  assert.equal(corre(dir, path.join(dir, 'docs', 'notas.md')).out, '');
});

test('fail-open: sin .sdd.json permite', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  assert.equal(corre(dir, path.join(dir, 'src', 'app.ts')).out, '');
});

test('la válvula SDD_SKIP_GATE=1 permite', () => {
  const dir = proyecto();
  assert.equal(corre(dir, path.join(dir, 'src', 'app.ts'), { SDD_SKIP_GATE: '1' }).out, '');
});
