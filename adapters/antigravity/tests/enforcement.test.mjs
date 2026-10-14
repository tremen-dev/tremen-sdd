import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync, execSync } from 'node:child_process';

const HOOK_REQUIRE = path.resolve('dist/antigravity/hooks/require-spec.mjs');
const HOOK_PROTEGE = path.resolve('dist/antigravity/hooks/protege-verdad.mjs');

function proyecto({ rama, estadoSpec, rutasVigiladas = ['src/'] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-ag-'));
  execSync('git init -b main', { cwd: dir });
  fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify({
    idioma: 'es', rutasVigiladas, linter: 'none',
    gates: { requireSpec: true, protegeVerdad: true, calidad: true },
  }));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'src-legacy'), { recursive: true });
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

function correHook(hookScript, cwd, filePath, toolName = 'write_to_file', env = {}) {
  const payload = JSON.stringify({
    workspacePaths: [cwd],
    cwd,
    toolCall: {
      name: toolName,
      args: { TargetFile: filePath }
    }
  });
  const r = spawnSync('node', [hookScript], { input: payload, encoding: 'utf8', env: { ...process.env, ...env } });
  let doc = null;
  try { doc = JSON.parse(r.stdout.trim()); } catch {}
  return { code: r.status, out: r.stdout.trim(), doc };
}

test('CA-3: require-spec deniega edición en src/ desde rama main', () => {
  const dir = proyecto();
  const { doc } = correHook(HOOK_REQUIRE, dir, path.join(dir, 'src', 'app.ts'));
  assert.ok(doc, 'debe emitir JSON');
  assert.equal(doc.decision, 'deny');
  assert.match(doc.reason, /sdd-arquitecto/);
});

test('CA-3: require-spec permite con rama ft/SPEC-001-* y spec aprobada', () => {
  const dir = proyecto({ rama: 'ft/SPEC-001-alta', estadoSpec: 'aprobada' });
  const { doc } = correHook(HOOK_REQUIRE, dir, path.join(dir, 'src', 'app.ts'));
  assert.ok(doc);
  assert.equal(doc.decision, 'allow');
});

test('CA-3: require-spec deniega si la spec está en borrador', () => {
  const dir = proyecto({ rama: 'ft/SPEC-001-alta', estadoSpec: 'borrador' });
  const { doc } = correHook(HOOK_REQUIRE, dir, path.join(dir, 'src', 'app.ts'));
  assert.ok(doc);
  assert.equal(doc.decision, 'deny');
  assert.match(doc.reason, /borrador/);
});

test('CA-3: require-spec permite ficheros fuera de rutasVigiladas', () => {
  const dir = proyecto();
  const { doc } = correHook(HOOK_REQUIRE, dir, path.join(dir, 'docs', 'notas.md'));
  assert.ok(doc);
  assert.equal(doc.decision, 'allow');
});

test('CA-3: fail-open: sin .sdd.json permite', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-ag-'));
  const { doc } = correHook(HOOK_REQUIRE, dir, path.join(dir, 'src', 'app.ts'));
  assert.ok(doc);
  assert.equal(doc.decision, 'allow');
});

test('CA-3: válvula SDD_SKIP_GATE=1 permite', () => {
  const dir = proyecto();
  const { doc } = correHook(HOOK_REQUIRE, dir, path.join(dir, 'src', 'app.ts'), 'write_to_file', { SDD_SKIP_GATE: '1' });
  assert.ok(doc);
  assert.equal(doc.decision, 'allow');
});

test('CA-4: protege-verdad deniega editar docs/tablero.md', () => {
  const dir = proyecto();
  const { doc } = correHook(HOOK_PROTEGE, dir, path.join(dir, 'docs', 'tablero.md'));
  assert.ok(doc);
  assert.equal(doc.decision, 'deny');
  assert.match(doc.reason, /docs\/tablero\.md es GENERADO/);
});
