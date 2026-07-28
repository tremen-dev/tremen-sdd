// SPEC-016 CA-1 y CA-2 — el build estampa la procedencia en el artefacto y sigue
// siendo determinista.
//
// CA-1: cada dist/<harness>/ lleva un PROVENANCE.json con {version, commit (SHA de
// 40), harness, fecha (ISO UTC), sucio}, y el plugin.json del artefacto de
// claude-code declara la MISMA version que package.json (fuente única, ADR-010 §4).
//
// CA-2 ([H4] de ADR-010): dos builds seguidos del mismo commit limpio dan árboles
// BYTE-IDÉNTICOS, PROVENANCE.json incluido —por eso `fecha` es la fecha del commit
// de fuente en UTC y no la hora de pared—, y sobre un árbol SUCIO el build no falla
// y marca `sucio: true`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildAdapter, procedencia } from '../build-adapter.mjs';
import { walk } from '../checks/_util.mjs';

const REPO = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const HARNESSES = ['claude-code', 'kimi-code', 'opencode'];
const leeJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const pkg = leeJson(path.join(REPO, 'package.json'));

const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

function snapshot(dir) {
  return walk(dir).map((f) => {
    const rel = path.relative(dir, f).replaceAll('\\', '/');
    return `${rel}:${crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')}`;
  }).sort();
}

// --- CA-1: procedencia estampada en los tres árboles ---

test('CA-1a: cada dist/<harness>/ contiene un PROVENANCE.json con version, commit, harness, fecha y sucio', () => {
  for (const h of HARNESSES) {
    const p = path.join(REPO, 'dist', h, 'PROVENANCE.json');
    assert.ok(fs.existsSync(p), `falta dist/${h}/PROVENANCE.json`);
    const prov = leeJson(p);
    assert.equal(prov.version, pkg.version, `${h}: version != package.json.version`);
    assert.match(prov.commit, /^[0-9a-f]{40}$/, `${h}: commit no es un SHA de 40`);
    assert.equal(prov.commit, git(['rev-parse', 'HEAD'], REPO), `${h}: commit != HEAD`);
    assert.equal(prov.harness, h);
    assert.equal(typeof prov.sucio, 'boolean', `${h}: sucio no es booleano`);
    // fecha: ISO 8601 en UTC (sufijo Z), no hora local.
    assert.match(prov.fecha, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/, `${h}: fecha no es ISO UTC`);
  }
});

test('CA-1a: sucio refleja el estado real del árbol de trabajo (no una constante)', () => {
  const arbolSucio = git(['status', '--porcelain'], REPO).length > 0;
  for (const h of HARNESSES) {
    const prov = leeJson(path.join(REPO, 'dist', h, 'PROVENANCE.json'));
    assert.equal(prov.sucio, arbolSucio, `${h}: sucio no coincide con el árbol real`);
  }
});

test('CA-1b: el plugin.json del artefacto de claude-code declara la version de package.json', () => {
  const plg = leeJson(path.join(REPO, 'dist', 'claude-code', '.claude-plugin', 'plugin.json'));
  assert.equal(plg.version, pkg.version);
});

// --- CA-2: determinismo, incluido PROVENANCE.json ---

test('CA-2: dos builds seguidos del mismo commit dan árboles byte-idénticos, PROVENANCE incluido', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-prov-det-'));
  const s1 = snapshot(buildAdapter('claude-code', { outDir: out }));
  const s2 = snapshot(buildAdapter('claude-code', { outDir: out }));
  assert.deepEqual(s2, s1);
  assert.ok(s1.some((e) => e.startsWith('PROVENANCE.json:')), 'PROVENANCE.json no entra en la firma del árbol');
});

// --- CA-2: árbol sucio → no falla y marca sucio: true (sobre un repo fixture real) ---

function repoFixture() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-prov-repo-')));
  fs.mkdirSync(path.join(dir, 'adapters', 'demo', 'agents'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'adapters', 'demo', 'tests'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'core', 'lib'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"x","version":"9.9.9"}\n');
  fs.writeFileSync(path.join(dir, 'adapters', 'demo', 'agents', 'a.md'), 'agente\n');
  fs.writeFileSync(path.join(dir, 'adapters', 'demo', 'tests', 'no-viaja.md'), 'test\n');
  fs.writeFileSync(path.join(dir, 'core', 'lib', 'x.mjs'), 'export const x = 1;\n');
  git(['init', '-b', 'main'], dir);
  git(['add', '-A'], dir);
  git(['-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'commit.gpgsign=false',
    'commit', '-m', 'fixture', '--no-verify'], dir);
  return dir;
}

test('CA-2: sobre un árbol limpio, procedencia() marca sucio:false y la fecha del commit', () => {
  const dir = repoFixture();
  const p = procedencia('demo', { repoRoot: dir });
  assert.equal(p.sucio, false);
  assert.equal(p.version, '9.9.9');
  assert.equal(p.commit, git(['rev-parse', 'HEAD'], dir));
  assert.equal(p.fecha, new Date(git(['show', '-s', '--format=%cI', 'HEAD'], dir)).toISOString());
});

test('CA-2: sobre un árbol SUCIO el build no falla y PROVENANCE marca sucio: true', () => {
  const dir = repoFixture();
  fs.writeFileSync(path.join(dir, 'core', 'lib', 'x.mjs'), 'export const x = 2;\n');
  const out = buildAdapter('demo', { repoRoot: dir, outDir: path.join(dir, 'dist', 'demo') });
  const prov = leeJson(path.join(out, 'PROVENANCE.json'));
  assert.equal(prov.sucio, true);
  assert.equal(prov.harness, 'demo');
  assert.match(prov.commit, /^[0-9a-f]{40}$/);
});

test('CA-2: fuera de un repo git el build no falla y marca la procedencia como desconocida', () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-prov-nogit-')));
  fs.mkdirSync(path.join(dir, 'adapters', 'demo'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'core'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"x","version":"1.2.3"}\n');
  fs.writeFileSync(path.join(dir, 'adapters', 'demo', 'a.md'), 'a\n');
  fs.writeFileSync(path.join(dir, 'core', 'x.mjs'), 'export const x = 1;\n');
  const out = buildAdapter('demo', { repoRoot: dir, outDir: path.join(dir, 'out') });
  const prov = leeJson(path.join(out, 'PROVENANCE.json'));
  assert.equal(prov.version, '1.2.3');
  assert.equal(prov.commit, null);
  assert.equal(prov.sucio, true, 'sin git no se puede afirmar que el árbol esté limpio');
});
