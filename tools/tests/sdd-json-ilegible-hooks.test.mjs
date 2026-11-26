import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync, execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from '../checks/_util.mjs';
import { leerSddJson } from '../../core/lib/sdd-json.mjs';
import { mensajeSddJsonIlegible } from '../../core/lib/sdd-json-mensaje.mjs';
import { traductor } from '../../core/lib/mensajes.mjs';

// SPEC-027 CA-3, CA-4 y CA-5 — con un .sdd.json ilegible los gates L1 se cierran
// en lugar de apagarse (ADR-017 §2), en los cuatro adaptadores. Se ejercen los
// adaptadores CONSTRUIDOS (dist/): los hooks como proceso con el payload por
// stdin en el formato de su harness; el plugin de opencode llamando a su factory.
const DIST = path.join(REPO_ROOT, 'dist');
const hook = (h, n) => path.join(DIST, h, 'hooks', `${n}.mjs`);
const ROTO = '{ roto';

// Proyecto temporal: .sdd.json con `contenido` (SIN = sin fichero), en la
// rama main de un repo git sin ninguna spec, o fuera de git si git === false.
const SIN = Symbol('sin .sdd.json');
function proyecto(contenido = ROTO, { git = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-ilegible-'));
  if (git) execSync('git init -q -b main', { cwd: dir });
  if (contenido !== SIN) fs.writeFileSync(path.join(dir, '.sdd.json'), contenido);
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'docs', 'fundacion'), { recursive: true });
  return dir;
}

const bloque = (dir) => mensajeSddJsonIlegible(leerSddJson(dir));

// --- Formato de cada harness, normalizado a { decision: 'allow'|'deny', reason } ---

function ejecuta(script, payload, env) {
  return spawnSync('node', [script], {
    input: JSON.stringify(payload), encoding: 'utf8',
    env: { ...process.env, SDD_SKIP_GATE: '', ...env },
  });
}

function estiloClaude(h) {
  return (n, dir, fichero, { env = {}, extra = {} } = {}) => {
    const r = ejecuta(hook(h, n), { cwd: dir, tool_name: 'Edit', tool_input: { file_path: fichero }, ...extra }, env);
    const out = r.stdout.trim();
    if (!out) return { decision: 'allow' };
    const j = JSON.parse(out).hookSpecificOutput;
    return { decision: j.permissionDecision, reason: j.permissionDecisionReason };
  };
}

function antigravity(n, dir, fichero, { env = {} } = {}) {
  const r = ejecuta(hook('antigravity', n), {
    workspacePaths: [dir], cwd: dir, toolCall: { name: 'write_to_file', args: { TargetFile: fichero } },
  }, env);
  return JSON.parse(r.stdout.trim());
}

async function opencode(n, dir, fichero, { env = {} } = {}) {
  assert.equal(n, 'require-spec');
  const mod = await import(pathToFileURL(path.join(DIST, 'opencode', 'plugins', 'require-spec.mjs')).href);
  const before = (await mod.RequireSpecPlugin({ directory: dir, worktree: dir }))['tool.execute.before'];
  const prev = process.env.SDD_SKIP_GATE;
  if (env.SDD_SKIP_GATE) process.env.SDD_SKIP_GATE = env.SDD_SKIP_GATE; else delete process.env.SDD_SKIP_GATE;
  try {
    await before({ tool: 'write' }, { args: { filePath: fichero } });
    return { decision: 'allow' };
  } catch (e) {
    assert.equal(e.name, 'SddGateError', `opencode deniega con SddGateError, no con ${e.name}: ${e.message}`);
    return { decision: 'deny', reason: e.message };
  } finally {
    if (prev === undefined) delete process.env.SDD_SKIP_GATE; else process.env.SDD_SKIP_GATE = prev;
  }
}

const ADAPTADORES = {
  'claude-code': estiloClaude('claude-code'),
  'kimi-code': estiloClaude('kimi-code'),
  antigravity,
  opencode,
};

// --- CA-3: require-spec deniega con .sdd.json ilegible ---

for (const [h, gate] of Object.entries(ADAPTADORES)) {
  test(`CA-3(a)/CA-4 [${h}]: src/app.js (vigilada en la plantilla) -> deny con el texto de CA-4`, async () => {
    const dir = proyecto();
    const r = await gate('require-spec', dir, path.join(dir, 'src', 'app.js'));
    assert.equal(r.decision, 'deny');
    assert.ok(r.reason.includes(bloque(dir)), r.reason);
  });

  test(`CA-3(b)/CA-4 [${h}]: README.md (no vigilada) -> deny con el texto de CA-4`, async () => {
    const dir = proyecto();
    const r = await gate('require-spec', dir, path.join(dir, 'README.md'));
    assert.equal(r.decision, 'deny');
    assert.ok(r.reason.includes(bloque(dir)), r.reason);
  });

  test(`CA-3(c) [${h}]: el propio .sdd.json, en ruta relativa y absoluta -> allow`, async () => {
    const dir = proyecto();
    assert.equal((await gate('require-spec', dir, '.sdd.json')).decision, 'allow');
    assert.equal((await gate('require-spec', dir, path.join(dir, '.sdd.json'))).decision, 'allow');
  });

  test(`CA-3(d) [${h}]: src/app.js con SDD_SKIP_GATE=1 -> allow`, async () => {
    const dir = proyecto();
    const r = await gate('require-spec', dir, path.join(dir, 'src', 'app.js'), { env: { SDD_SKIP_GATE: '1' } });
    assert.equal(r.decision, 'allow');
  });

  test(`CA-3(e)/CA-4 [${h}]: src/app.js fuera de un repo git -> deny con el texto de CA-4`, async () => {
    const dir = proyecto(ROTO, { git: false });
    const r = await gate('require-spec', dir, path.join(dir, 'src', 'app.js'));
    assert.equal(r.decision, 'deny');
    assert.ok(r.reason.includes(bloque(dir)), r.reason);
  });

  test(`CA-3.3 [${h}]: regresión, sin .sdd.json (a) y (b) se permiten`, async () => {
    const dir = proyecto(SIN);
    assert.equal((await gate('require-spec', dir, path.join(dir, 'src', 'app.js'))).decision, 'allow');
    assert.equal((await gate('require-spec', dir, path.join(dir, 'README.md'))).decision, 'allow');
  });
}

// Variantes de "ilegible" de CA-1 en un adaptador de cada forma de denegar.
for (const [caso, contenido] of [['vacío', ''], ['null', 'null'], ['[]', '[]'], ['42', '42']]) {
  for (const h of ['claude-code', 'opencode']) {
    test(`CA-3(a) [${h}]: .sdd.json ${caso} también deniega`, async () => {
      const dir = proyecto(contenido);
      const r = await ADAPTADORES[h]('require-spec', dir, path.join(dir, 'src', 'app.js'));
      assert.equal(r.decision, 'deny');
      assert.ok(r.reason.includes(bloque(dir)), r.reason);
    });
  }
}

test('CA-3(a) [claude-code]: .sdd.json como directorio también deniega', async () => {
  const dir = proyecto(SIN);
  fs.mkdirSync(path.join(dir, '.sdd.json'));
  const r = await ADAPTADORES['claude-code']('require-spec', dir, path.join(dir, 'src', 'app.js'));
  assert.equal(r.decision, 'deny');
  assert.ok(r.reason.includes(bloque(dir)), r.reason);
});

test('CA-1(d) [claude-code]: un .sdd.json válido con BOM no apaga el gate (deniega como hoy desde main)', async () => {
  const dir = proyecto('﻿' + JSON.stringify({ idioma: 'es', rutasVigiladas: ['src/'] }));
  execSync('git -c user.email=t@t -c user.name=t commit -q --allow-empty -m x', { cwd: dir });
  const r = await ADAPTADORES['claude-code']('require-spec', dir, path.join(dir, 'src', 'app.js'));
  assert.equal(r.decision, 'deny');
  assert.match(r.reason, /no es una rama de spec/);
});

// --- CA-5(a): protege-verdad aplica sus reglas aunque no pueda leer el interruptor ---

const textoPv = (h, clave, vars) => traductor(path.join(DIST, h, 'mensajes'), 'es')(clave, vars);

for (const h of ['claude-code', 'kimi-code']) {
  test(`CA-5(a) [${h}]: docs/tablero.md y FOUNDATION.md (sdd-implementador) -> deny con los mensajes de hoy`, async () => {
    const dir = proyecto();
    const gate = ADAPTADORES[h];
    const t = await gate('protege-verdad', dir, path.join(dir, 'docs', 'tablero.md'));
    assert.deepEqual(t, { decision: 'deny', reason: textoPv(h, 'protege-verdad.tablero-generado') });
    const f = await gate('protege-verdad', dir, path.join(dir, 'FOUNDATION.md'), { extra: { agent_type: 'sdd-implementador' } });
    assert.deepEqual(f, { decision: 'deny', reason: textoPv(h, 'protege-verdad.documento-de-verdad', { rel: 'FOUNDATION.md' }) });
  });

  test(`CA-5(a) [${h}]: gates.protegeVerdad no cuenta si no se puede leer`, async () => {
    const dir = proyecto('{ "gates": { "protegeVerdad": false }, ');
    const t = await ADAPTADORES[h]('protege-verdad', dir, path.join(dir, 'docs', 'tablero.md'));
    assert.equal(t.decision, 'deny');
  });
}

test('CA-5(a) [kimi-code]: sin identidad de rol, FOUNDATION.md mantiene la degradación de hoy (ADR-003 punto 5)', async () => {
  const dir = proyecto();
  const r = await ADAPTADORES['kimi-code']('protege-verdad', dir, path.join(dir, 'FOUNDATION.md'));
  assert.equal(r.decision, 'allow');
});

test('CA-5(a) [antigravity]: docs/tablero.md -> deny con el mensaje de hoy', async () => {
  const dir = proyecto();
  const r = antigravity('protege-verdad', dir, path.join(dir, 'docs', 'tablero.md'));
  assert.deepEqual(r, { decision: 'deny', reason: textoPv('antigravity', 'protege-verdad.tablero-generado') });
});

test('CA-5(a) [antigravity]: FOUNDATION.md (sdd-implementador) queda denegado por require-spec con el texto de CA-4', async () => {
  // El protege-verdad de antigravity solo tiene hoy la regla del tablero (no
  // recibe identidad de rol); la escritura no pasa porque require-spec la deniega.
  const dir = proyecto();
  const r = antigravity('require-spec', dir, path.join(dir, 'FOUNDATION.md'));
  assert.equal(r.decision, 'deny');
  assert.ok(r.reason.includes(bloque(dir)));
});

// --- CA-5(b): calidad informa tras dejar .sdd.json ilegible ---

test('CA-5(b)/CA-4 [claude-code]: PostToolUse sobre .sdd.json ilegible -> exit 2 y el texto de CA-4 en stderr', () => {
  const dir = proyecto();
  const r = ejecuta(hook('claude-code', 'calidad'), { cwd: dir, tool_name: 'Edit', tool_input: { file_path: path.join(dir, '.sdd.json') } });
  assert.equal(r.status, 2);
  assert.ok(r.stderr.includes(bloque(dir)), r.stderr);
});

test('CA-5(b)/CA-4 [antigravity]: PostToolUse sobre .sdd.json ilegible -> texto de CA-4 en stderr, {} y exit 0', () => {
  const dir = proyecto();
  const r = ejecuta(hook('antigravity', 'calidad'), {
    workspacePaths: [dir], cwd: dir, toolCall: { name: 'write_to_file', args: { TargetFile: path.join(dir, '.sdd.json') } },
  });
  assert.equal(r.status, 0);
  assert.deepEqual(JSON.parse(r.stdout.trim()), {});
  assert.ok(r.stderr.includes(bloque(dir)), r.stderr);
});
