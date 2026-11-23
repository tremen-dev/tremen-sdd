import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync, execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REPO_ROOT } from '../checks/_util.mjs';
import { leerSddJson } from '../../core/lib/sdd-json.mjs';
import { mensajeSddJsonIlegible } from '../../core/lib/sdd-json-mensaje.mjs';

// SPEC-029 CA-3 — ningún campo mal tipado de .sdd.json termina en fail-open:
// require-spec de los cuatro adaptadores CONSTRUIDOS (dist/) deniega con el
// texto de SPEC-027 CA-4 (el campo que falla como motivo) y el pre-commit
// bloquea con ese mismo texto, sin "Error inesperado". Mismo montaje que
// sdd-json-ilegible-hooks.test.mjs y pre-commit-sdd-json.test.mjs (SPEC-027).
const DIST = path.join(REPO_ROOT, 'dist');
const REPO = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const hook = (h, n) => path.join(DIST, h, 'hooks', `${n}.mjs`);

const CASOS = [
  ['a', { rutasVigiladas: 'src/' }, 'rutasVigiladas'],
  ['b', { rutasVigiladas: ['src/'], linter: 'biome' }, 'linter'],
];

// Proyecto temporal en la rama main de un repo git, sin ninguna spec.
function proyecto(cfg) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-esquema-'));
  execSync('git init -q -b main', { cwd: dir });
  fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify(cfg));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  return dir;
}

const bloque = (dir) => mensajeSddJsonIlegible(leerSddJson(dir));

function ejecuta(script, payload) {
  return spawnSync('node', [script], {
    input: JSON.stringify(payload), encoding: 'utf8', env: { ...process.env, SDD_SKIP_GATE: '' },
  });
}

function estiloClaude(h) {
  return (dir, fichero) => {
    const r = ejecuta(hook(h, 'require-spec'), { cwd: dir, tool_name: 'Edit', tool_input: { file_path: fichero } });
    const out = r.stdout.trim();
    if (!out) return { decision: 'allow' };
    const j = JSON.parse(out).hookSpecificOutput;
    assert.equal(j.hookEventName, 'PreToolUse');
    return { decision: j.permissionDecision, reason: j.permissionDecisionReason };
  };
}

function antigravity(dir, fichero) {
  const r = ejecuta(hook('antigravity', 'require-spec'), {
    workspacePaths: [dir], cwd: dir, toolCall: { name: 'write_to_file', args: { TargetFile: fichero } },
  });
  return JSON.parse(r.stdout.trim());
}

async function opencode(dir, fichero) {
  const mod = await import(pathToFileURL(path.join(DIST, 'opencode', 'plugins', 'require-spec.mjs')).href);
  const before = (await mod.RequireSpecPlugin({ directory: dir, worktree: dir }))['tool.execute.before'];
  const prev = process.env.SDD_SKIP_GATE;
  delete process.env.SDD_SKIP_GATE;
  try {
    await before({ tool: 'write' }, { args: { filePath: fichero } });
    return { decision: 'allow' };
  } catch (e) {
    assert.equal(e.name, 'SddGateError', `opencode deniega con SddGateError, no con ${e.name}: ${e.message}`);
    return { decision: 'deny', reason: e.message };
  } finally {
    if (prev !== undefined) process.env.SDD_SKIP_GATE = prev;
  }
}

const ADAPTADORES = {
  'claude-code': estiloClaude('claude-code'),
  'kimi-code': estiloClaude('kimi-code'),
  antigravity,
  opencode,
};

for (const [caso, cfg, campo] of CASOS) {
  for (const [h, gate] of Object.entries(ADAPTADORES)) {
    test(`CA-3(${caso}) [${h}]: src/app.js -> deny con el texto de CA-4 y \`${campo}\` como motivo`, async () => {
      const dir = proyecto(cfg);
      const r = await gate(dir, path.join(dir, 'src', 'app.js'));
      assert.equal(r.decision, 'deny');
      assert.ok(r.reason.includes(bloque(dir)), r.reason);
      assert.ok(r.reason.includes(`\`${campo}\``), r.reason);
      assert.doesNotMatch(r.reason, /Error inesperado/);
    });

    test(`CA-3(${caso}) [${h}]: el propio .sdd.json -> allow`, async () => {
      const dir = proyecto(cfg);
      assert.equal((await gate(dir, path.join(dir, '.sdd.json'))).decision, 'allow');
      assert.equal((await gate(dir, '.sdd.json')).decision, 'allow');
    });
  }
}

// --- Pre-commit L2 ---

function initRepo(cfg) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-pc-esquema-'));
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
  fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify(cfg));
  return dir;
}

for (const [caso, cfg, campo] of CASOS) {
  test(`CA-3(${caso}) [pre-commit]: un fichero staged -> commit bloqueado con el texto de CA-4 y \`${campo}\`, sin "Error inesperado"`, () => {
    const dir = initRepo(cfg);
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'src', 'app.js'), 'x');
    execSync('git add src/app.js', { cwd: dir });
    const r = spawnSync('git', ['commit', '-m', 'cambio'], {
      cwd: dir, encoding: 'utf8', env: { ...process.env, SDD_SKIP_GATE: '' },
    });
    const out = (r.stdout || '') + (r.stderr || '');
    assert.notEqual(r.status, 0, out);
    assert.ok(out.includes(bloque(dir)), out);
    assert.ok(out.includes(`\`${campo}\``), out);
    assert.doesNotMatch(out, /Error inesperado/);
  });
}
