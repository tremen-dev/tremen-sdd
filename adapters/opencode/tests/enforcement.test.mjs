import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { parseFrontmatter } from '../../../core/lib/frontmatter.mjs';

// SPEC-011 — Enforcement en-harness de opencode (L1 = gate REAL que DENIEGA).
// Se ejerce el plugin CONSTRUIDO (dist/opencode/plugins/require-spec.mjs)
// importándolo e invocando su hook `tool.execute.before` con payloads simulados en
// formato opencode (sin CLI): el `throw` que aborta la tool es [H2] y se confirma
// contra el CLI real en la spec #4 (F-SPEC-011-1). Patrón del test require-spec de
// Kimi, pero afirmando THROW en vez de permissionDecision.
const DIST = path.resolve('dist/opencode');
const PLUGIN = path.join(DIST, 'plugins', 'require-spec.mjs');

// Repo git temporal con .sdd.json (rutasVigiladas) y, opcional, una spec + rama.
function proyecto({ rama, estadoSpec, rutasVigiladas = ['core/scripts/'], gates } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-oc-enf-'));
  execSync('git init -b main', { cwd: dir });
  fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify({
    idioma: 'es', rutasVigiladas, linter: 'none',
    gates: gates ?? { requireSpec: true, protegeVerdad: true, calidad: true },
  }));
  fs.mkdirSync(path.join(dir, 'core', 'scripts'), { recursive: true });
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

// Obtiene el hook `tool.execute.before` del plugin construido, con cwd = repo temporal.
async function hookDe(dir) {
  const mod = await import(pathToFileURL(PLUGIN).href);
  const factory = mod.RequireSpecPlugin ?? mod.default;
  assert.equal(typeof factory, 'function', 'el plugin exporta una factory (opencode.ai/docs/plugins)');
  const hooks = await factory({ directory: dir, worktree: dir });
  const before = hooks['tool.execute.before'];
  assert.equal(typeof before, 'function', 'el plugin registra tool.execute.before');
  return before;
}

// Invoca el hook con payload opencode simulado: input.tool + output.args.filePath.
function invoca(before, tool, filePath, env = {}) {
  const prev = {};
  for (const k of Object.keys(env)) { prev[k] = process.env[k]; process.env[k] = env[k]; }
  const restore = () => { for (const k of Object.keys(env)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } };
  return Promise.resolve(before({ tool }, { args: { filePath } })).finally(restore);
}

// --- DENY REAL: el hook LANZA (aborta la tool) ---

test('CA-1: DENIEGA (throw) un edit en ruta vigilada sin rama de spec', async () => {
  const dir = proyecto();
  const before = await hookDe(dir);
  await assert.rejects(() => invoca(before, 'edit', path.join(dir, 'core', 'scripts', 'x.mjs')), /sdd-arquitecto/);
});

test('CA-1: DENIEGA (throw) write y patch en ruta vigilada sin rama de spec', async () => {
  const dir = proyecto();
  const before = await hookDe(dir);
  await assert.rejects(() => invoca(before, 'write', path.join(dir, 'core', 'scripts', 'x.mjs')));
  await assert.rejects(() => invoca(before, 'patch', path.join(dir, 'core', 'scripts', 'x.mjs')));
});

test('CA-1: DENIEGA (throw) si la spec está en borrador', async () => {
  const dir = proyecto({ rama: 'ft/SPEC-001-alta', estadoSpec: 'borrador' });
  const before = await hookDe(dir);
  await assert.rejects(() => invoca(before, 'edit', path.join(dir, 'core', 'scripts', 'x.mjs')), /borrador/);
});

// --- NO lanza (la tool procede) ---

test('CA-1: NO lanza en una lectura (read) sobre la misma ruta vigilada', async () => {
  const dir = proyecto();
  const before = await hookDe(dir);
  await assert.doesNotReject(() => invoca(before, 'read', path.join(dir, 'core', 'scripts', 'x.mjs')));
});

test('CA-1: NO lanza en un edit sobre una ruta NO vigilada', async () => {
  const dir = proyecto();
  const before = await hookDe(dir);
  await assert.doesNotReject(() => invoca(before, 'edit', path.join(dir, 'README.md')));
});

test('CA-1: NO lanza con rama ft/SPEC-NNN y spec aprobada (carril válido)', async () => {
  const dir = proyecto({ rama: 'ft/SPEC-001-alta', estadoSpec: 'aprobada' });
  const before = await hookDe(dir);
  await assert.doesNotReject(() => invoca(before, 'edit', path.join(dir, 'core', 'scripts', 'x.mjs')));
});

test('CA-1: NO lanza con spec en-progreso (carril válido)', async () => {
  const dir = proyecto({ rama: 'ft/SPEC-001-alta', estadoSpec: 'en-progreso' });
  const before = await hookDe(dir);
  await assert.doesNotReject(() => invoca(before, 'edit', path.join(dir, 'core', 'scripts', 'x.mjs')));
});

// --- Válvulas y modo de fallo (fail-open ante error interno) ---

test('CA-1: honra la válvula SDD_SKIP_GATE=1 (no lanza)', async () => {
  const dir = proyecto();
  const before = await hookDe(dir);
  await assert.doesNotReject(() => invoca(before, 'edit', path.join(dir, 'core', 'scripts', 'x.mjs'), { SDD_SKIP_GATE: '1' }));
});

test('CA-1: honra gates.requireSpec=false de .sdd.json (no lanza)', async () => {
  const dir = proyecto({ gates: { requireSpec: false, protegeVerdad: true, calidad: true } });
  const before = await hookDe(dir);
  await assert.doesNotReject(() => invoca(before, 'edit', path.join(dir, 'core', 'scripts', 'x.mjs')));
});

test('CA-1: fail-open sin .sdd.json (error/entorno inesperado: no lanza)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-oc-enf-bare-'));
  const before = await hookDe(dir);
  await assert.doesNotReject(() => invoca(before, 'edit', path.join(dir, 'core', 'scripts', 'x.mjs')));
});

// --- CA-3: permission estático complementario en el opencode.json construido ---

test('CA-3: opencode.json declara deny estático de los generados (docs/tablero.md, dist/**)', () => {
  const man = JSON.parse(fs.readFileSync(path.join(DIST, 'opencode.json'), 'utf8'));
  const edit = man.permission?.edit;
  assert.ok(edit && typeof edit === 'object', 'permission.edit debe ser objeto granular por patrón');
  assert.equal(edit['docs/tablero.md'], 'deny', 'deniega el tablero generado (RN-05)');
  assert.equal(edit['dist/**'], 'deny', 'deniega el artefacto de build (RN-05)');
});

// Actualizado por SPEC-014 CA-3 (ADR-009): el verificador ya NO es deny en seco
// (le retiraría la tool edit y no podría escribir su ledger); su forma granular
// la afirma el test "SPEC-014 CA-3" de abajo. como-vamos sí sigue en seco.
test('CA-3: como-vamos mantiene permission.edit deny (read-only puro, ADR-009 §5)', () => {
  const man = JSON.parse(fs.readFileSync(path.join(DIST, 'opencode.json'), 'utf8'));
  assert.equal(man.agent['sdd-como-vamos'].permission.edit, 'deny', 'sdd-como-vamos sigue read-only');
});

// --- CA-5: el plugin viaja empaquetado en el artefacto y resuelve el núcleo interno ---

test('CA-5: el plugin construido importa evaluarRequireSpec del núcleo por ruta interna', () => {
  const src = fs.readFileSync(PLUGIN, 'utf8');
  assert.match(src, /import\s*\{[^}]*evaluarRequireSpec[^}]*\}\s*from\s*['"](?:\.\.\/)+core\/lib\/require-spec\.mjs['"]/);
  const resuelto = path.resolve(path.dirname(PLUGIN), '../core/lib/require-spec.mjs');
  assert.ok(fs.existsSync(resuelto), 'el import del plugin resuelve dentro del artefacto');
});

// El manifiesto no embebe prosa de rol (guard de humo, coherente con superficie).
test('CA-5: el frontmatter de agents sigue intacto (no lo rompe el enforcement)', () => {
  const { data } = parseFrontmatter(fs.readFileSync(path.join(DIST, 'agents', 'sdd-orquestador.md'), 'utf8'));
  assert.equal(data.mode, 'primary');
});

// --- SPEC-014 CA-1 (lazo RED→GREEN contra el CLI real 1.18.5): el auto-descubrimiento
// de plugins de opencode solo toma `*.ts`/`*.js` de `.opencode/plugin(s)/` (skill
// built-in customize-opencode del propio CLI, ejercido 2026-07-27: un probe `.js`
// carga, un probe `.mjs` NO). El plugin del adaptador es `.mjs`, así que el
// manifiesto DEBE registrarlo explícitamente en `plugin` con ruta relativa al
// config (la vía que ADR-007 [H5] ya preveía); registrado, el `.mjs` carga. ---
// SPEC-014 CA-3 (lazo ADR-009 contra el CLI real): `edit: "deny"` en seco retira
// la tool del agente y el verificador no puede escribir su ledger; la política
// "no escribe fuentes, SÍ el ledger" se declara con edit granular (deny catch-all
// + allow acotado a ledger/_qa). como-vamos sigue read-only en seco (ADR-009 §5).
test('SPEC-014 CA-3: el verificador construido lleva edit granular ADR-009 (ledger/_qa sí, resto no)', () => {
  const man = JSON.parse(fs.readFileSync(path.join(DIST, 'opencode.json'), 'utf8'));
  const edit = man.agent['sdd-verificador'].permission.edit;
  assert.equal(typeof edit, 'object', 'edit granular (objeto de patrones), no deny en seco');
  assert.equal(edit['*'], 'deny', 'catch-all deny: las fuentes siguen vetadas');
  const allows = Object.entries(edit).filter(([, v]) => v === 'allow').map(([k]) => k);
  assert.ok(allows.some((p) => /ledger/.test(p)), 'allow del ledger de evidencia');
  assert.ok(allows.some((p) => /_qa/.test(p)), 'allow de docs/_qa (artefactos de evidencia)');
  assert.ok(allows.every((p) => /ledger|_qa/.test(p)), 'ningún allow fuera de ledger/_qa');
  assert.equal(man.agent['sdd-como-vamos'].permission.edit, 'deny', 'como-vamos sigue read-only en seco');
});

test('SPEC-014 CA-1: el manifiesto registra el plugin .mjs en `plugin` (el CLI no auto-descubre .mjs)', () => {
  const manifiesto = JSON.parse(fs.readFileSync(path.join(DIST, 'opencode.json'), 'utf8'));
  assert.ok(Array.isArray(manifiesto.plugin), 'opencode.json declara el array `plugin`');
  assert.ok(manifiesto.plugin.includes('./plugins/require-spec.mjs'),
    'el plugin de enforcement va registrado con ruta relativa al config del artefacto');
  // La ruta registrada resuelve dentro del artefacto (instalación: el config vive
  // junto a plugins/, p. ej. .opencode/opencode.json → .opencode/plugins/).
  for (const entrada of manifiesto.plugin) {
    assert.ok(fs.existsSync(path.resolve(DIST, entrada)), `la entrada ${entrada} resuelve dentro del artefacto`);
  }
});
