import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { COMANDOS_GIT, leeRefs } from '../lib/refs-git.mjs';

// SPEC-028 (ADR-018): scaffold frente a los refs de git. Los fixtures son repos
// temporales: un bare hace de `origin` y uno o dos clones lo usan. Nunca se toca
// el árbol real ni la red. Git corre aislado de la config global/sistema.
const CORE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SCAFFOLD = path.join(CORE, 'scripts', 'scaffold.mjs');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-refs-'));
const GITCONFIG = path.join(TMP, 'gitconfig-vacio');
fs.writeFileSync(GITCONFIG, '');
const ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: GITCONFIG,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CEILING_DIRECTORIES: TMP,
  GIT_TERMINAL_PROMPT: '0',
};
const ID = ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false'];
test.after(() => fs.rmSync(TMP, { recursive: true, force: true }));

let n = 0;
const nuevoDir = (nombre) => fs.mkdtempSync(path.join(TMP, `${nombre}-${++n}-`));

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', env: ENV });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}
const commit = (cwd, msg) => { git(cwd, 'add', '-A'); git(cwd, ...ID, 'commit', '-q', '-m', msg); return git(cwd, 'rev-parse', 'HEAD'); };

function escribe(raiz, rel, txt = 'x\n') {
  const f = path.join(raiz, ...rel.split('/'));
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, txt);
}

const SPEC = (n, slug) => `docs/epicas/EPIC-001-base/SPEC-00${n}-${slug}.md`;

// Primer commit común: .sdd.json, EPIC-001 con SPEC-001 y ADR-001.
function base(raiz) {
  escribe(raiz, '.sdd.json', '{ "idioma": "es" }\n');
  escribe(raiz, 'docs/epicas/EPIC-001-base/_epica.md');
  escribe(raiz, SPEC(1, 'a'));
  escribe(raiz, SPEC(1, 'a').replace('.md', '.ledger.md'));
  escribe(raiz, 'docs/adr/ADR-001-a.md');
}

// Un bare `origin` con `main` y un clon suyo. `extra(seed)` añade commits a main
// del seed antes de publicar. Devuelve { origen, clon, c1 }.
function repoConOrigen({ extra } = {}) {
  const origen = path.join(nuevoDir('origen'), 'origin.git');
  git(path.dirname(origen), 'init', '-q', '--bare', '-b', 'main', origen);
  const seed = nuevoDir('seed');
  git(seed, 'init', '-q', '-b', 'main');
  base(seed);
  const c1 = commit(seed, 'c1');
  if (extra) extra(seed);
  git(seed, 'remote', 'add', 'origin', origen);
  git(seed, 'push', '-q', 'origin', 'main');
  const clon = path.join(nuevoDir('clon'), 'clon');
  git(path.dirname(clon), 'clone', '-q', origen, clon);
  return { origen, clon, c1 };
}

// Fixture de CA-3: origin/main tiene SPEC-001..003, ADR-001..002 y EPIC-002; el
// main local del clon se quedó en el primer commit (solo SPEC-001 y ADR-001).
function fixtureBaseAtrasada({ conEpicFix = false } = {}) {
  const f = repoConOrigen({
    extra: (seed) => {
      escribe(seed, SPEC(2, 'b'));
      escribe(seed, SPEC(2, 'b').replace('.md', '.ledger.md'));
      escribe(seed, SPEC(3, 'c'));
      escribe(seed, 'docs/adr/ADR-002-b.md');
      escribe(seed, 'docs/epicas/EPIC-002-otra/_epica.md');
      if (conEpicFix) escribe(seed, 'docs/epicas/EPIC-FIX/_epica.md');
      commit(seed, 'c2');
    },
  });
  git(f.clon, 'reset', '-q', '--hard', f.c1);
  return f;
}

// Fixture de CA-4: main al día con origin/main (solo SPEC-001), y una rama
// remota sin mergear origin/ft/SPEC-002-x con SPEC-002 y SPEC-003.
function fixtureReservas({ otra = false } = {}) {
  const f = repoConOrigen();
  git(f.clon, 'switch', '-q', '-c', 'ft/SPEC-002-x');
  escribe(f.clon, SPEC(2, 'x'));
  escribe(f.clon, SPEC(3, 'y'));
  commit(f.clon, 'reserva');
  git(f.clon, 'push', '-q', 'origin', 'ft/SPEC-002-x');
  git(f.clon, 'switch', '-q', 'main');
  git(f.clon, 'branch', '-q', '-D', 'ft/SPEC-002-x');
  if (otra) {
    git(f.clon, 'switch', '-q', '-c', 'otra');
    escribe(f.clon, SPEC(4, 'z'));
    commit(f.clon, 'otra');
    git(f.clon, 'switch', '-q', 'main');
  }
  return f;
}

function scaffold(cwd, args, env = ENV) {
  return spawnSync(process.execPath, [SCAFFOLD, ...args, '--dir', 'docs'], { cwd, encoding: 'utf8', env, timeout: 60000 });
}
const porcelain = (cwd) => git(cwd, 'status', '--porcelain');
const lineas = (s) => s.split(/\r?\n/).filter(Boolean);
const SPEC_ARGS = ['spec', 'Nueva', '--epica', 'EPIC-001'];

// --- CA-3 -------------------------------------------------------------------

for (const [caso, args, id, ruta] of [
  ['(a) spec', SPEC_ARGS, 'SPEC-002', 'docs/epicas/EPIC-001-base/SPEC-002-b.md'],
  ['(b) ADR', ['adr', 'Nuevo'], 'ADR-002', 'docs/adr/ADR-002-b.md'],
  ['(c) épica numerada', ['epica', 'Nueva'], 'EPIC-002', 'docs/epicas/EPIC-002-otra'],
]) {
  test(`SPEC-028 CA-3 ${caso}: el id ya está en origin/main -> se niega sin tocar nada`, () => {
    const { clon } = fixtureBaseAtrasada();
    const r = scaffold(clon, args);
    assert.notEqual(r.status, 0, r.stdout);
    assert.equal(porcelain(clon), '', 'no debe crear ni modificar ficheros');
    assert.equal(r.stdout, '');
    assert.ok(r.stderr.includes(id), r.stderr);
    assert.ok(r.stderr.includes('origin/main'), r.stderr);
    assert.ok(r.stderr.includes(ruta), r.stderr);
    assert.match(r.stderr, /base local va por detrás/);
    assert.match(r.stderr, /actualízala/i);
  });
}

// --- CA-4 -------------------------------------------------------------------

test('SPEC-028 CA-4 (a): salta los ids de una rama remota sin mergear y crea SPEC-004', () => {
  const { clon } = fixtureReservas();
  const r = scaffold(clon, SPEC_ARGS);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /SPEC-004-nueva\.md/);
  assert.ok(fs.existsSync(path.join(clon, ...SPEC(4, 'nueva').split('/'))));
  assert.equal(lineas(r.stderr).length, 1, r.stderr);
  for (const s of ['SPEC-002', 'SPEC-003', 'origin/ft/SPEC-002-x']) assert.ok(r.stderr.includes(s), r.stderr);
});

test('SPEC-028 CA-4 (b): una rama local sin push también reserva -> SPEC-005', () => {
  const { clon } = fixtureReservas({ otra: true });
  const r = scaffold(clon, SPEC_ARGS);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /SPEC-005-nueva\.md/);
  for (const s of ['SPEC-002', 'SPEC-003', 'SPEC-004', 'origin/ft/SPEC-002-x', '(otra)']) {
    assert.ok(r.stderr.includes(s), `${s} en ${r.stderr}`);
  }
});

test('SPEC-028 CA-4 (c): la rama actual no es reserva ajena -> SPEC-005 por el árbol de trabajo', () => {
  const { clon } = fixtureReservas({ otra: true });
  git(clon, 'switch', '-q', 'otra');
  const r = scaffold(clon, SPEC_ARGS);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /SPEC-005-nueva\.md/);
  // SPEC-002..004 quedan por debajo del candidato (SPEC-005, max local + 1): no
  // hay nada que saltar, así que CA-4.5 manda silencio (ver F-SPEC-028-1).
  assert.equal(r.stderr, '');
});

test('SPEC-028 CA-4.5: sin ids que saltar no escribe nada en stderr', () => {
  const { clon } = repoConOrigen();
  const r = scaffold(clon, SPEC_ARGS);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /SPEC-002-nueva\.md/);
  assert.equal(r.stderr, '');
});

// --- CA-5 -------------------------------------------------------------------

function proyectoSinGit() {
  const raiz = nuevoDir('sin-git');
  base(raiz);
  return raiz;
}

test('SPEC-028 CA-5 (a): fuera de un repo git numera como hoy, como mucho una línea en stderr', () => {
  const raiz = proyectoSinGit();
  const r = scaffold(raiz, SPEC_ARGS);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /SPEC-002-nueva\.md/);
  assert.ok(lineas(r.stderr).length <= 1, r.stderr);
});

test('SPEC-028 CA-5 (b): repo git sin remotos numera como hoy, como mucho una línea en stderr', () => {
  const raiz = proyectoSinGit();
  git(raiz, 'init', '-q', '-b', 'main');
  commit(raiz, 'c1');
  git(raiz, 'switch', '-q', '-c', 'otra');
  escribe(raiz, SPEC(5, 'local'));
  commit(raiz, 'otra');
  git(raiz, 'switch', '-q', 'main');
  const r = scaffold(raiz, SPEC_ARGS);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /SPEC-002-nueva\.md/);
  assert.ok(lineas(r.stderr).length <= 1, r.stderr);
});

test('SPEC-028 CA-5 (c): sin origin/HEAD pero con origin/main aplica CA-3 contra origin/main', () => {
  const { clon } = fixtureBaseAtrasada();
  git(clon, 'remote', 'set-head', 'origin', '-d');
  const r = scaffold(clon, SPEC_ARGS);
  assert.notEqual(r.status, 0);
  assert.equal(porcelain(clon), '');
  for (const s of ['SPEC-002', 'origin/main', 'docs/epicas/EPIC-001-base/SPEC-002-b.md']) assert.ok(r.stderr.includes(s), r.stderr);
});

test('SPEC-028 CA-5 (d): sin origin/HEAD, main ni master no evalúa CA-3 y aplica CA-4 -> SPEC-003', () => {
  const { clon } = repoConOrigen();
  git(clon, 'switch', '-q', '-c', 'tmp');
  escribe(clon, SPEC(2, 'x'));
  commit(clon, 'reserva');
  git(clon, 'push', '-q', 'origin', 'tmp:ft/SPEC-002-x');
  git(clon, 'switch', '-q', 'main');
  git(clon, 'branch', '-q', '-D', 'tmp');
  git(clon, 'remote', 'set-head', 'origin', '-d');
  git(clon, 'update-ref', '-d', 'refs/remotes/origin/main');
  const r = scaffold(clon, SPEC_ARGS);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /SPEC-003-nueva\.md/);
  assert.ok(r.stderr.includes('SPEC-002') && r.stderr.includes('origin/ft/SPEC-002-x'), r.stderr);
});

// GIT_TRACE a fichero registra cada proceso git que se lanza: con la URL rota,
// cualquier contacto con el remoto aparecería ahí (fetch, ls-remote, upload-pack…).
const RE_REMOTO = /\b(fetch|ls-remote|pull|upload-pack|remote-\w+|remote update)\b/;

test('SPEC-028 CA-5 (e): URL del remoto rota, refs de un fetch anterior -> CA-3 sin contactar con el remoto', () => {
  const { clon } = fixtureBaseAtrasada();
  git(clon, 'remote', 'set-url', 'origin', path.join(TMP, 'no-existe.git'));
  const traza = path.join(nuevoDir('traza'), 'trace.log');
  const r = scaffold(clon, SPEC_ARGS, { ...ENV, GIT_TRACE: traza });
  assert.notEqual(r.status, 0);
  assert.ok(r.stderr.includes('SPEC-002') && r.stderr.includes('origin/main'), r.stderr);
  const t = fs.readFileSync(traza, 'utf8');
  assert.match(t, /ls-tree/, 'la traza debe registrar las lecturas locales');
  assert.doesNotMatch(t, RE_REMOTO);
});

test('SPEC-028 CA-5 (e): URL del remoto rota -> CA-4 contra los refs locales, sin contactar con el remoto', () => {
  const { clon } = fixtureReservas();
  git(clon, 'remote', 'set-url', 'origin', path.join(TMP, 'no-existe.git'));
  const traza = path.join(nuevoDir('traza'), 'trace.log');
  const r = scaffold(clon, SPEC_ARGS, { ...ENV, GIT_TRACE: traza });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /SPEC-004-nueva\.md/);
  assert.doesNotMatch(fs.readFileSync(traza, 'utf8'), RE_REMOTO);
});

test('SPEC-028 CA-5 (e): el lector solo admite subcomandos de lectura local', () => {
  assert.deepEqual([...COMANDOS_GIT].sort(), ['for-each-ref', 'ls-tree', 'rev-parse', 'symbolic-ref']);
  const fuente = fs.readFileSync(path.join(CORE, 'lib', 'refs-git.mjs'), 'utf8');
  assert.doesNotMatch(fuente, /'(fetch|ls-remote|pull|remote)'/);
});

test('SPEC-028 CA-5 (f): sin git en el PATH numera como hoy, como mucho una línea en stderr', () => {
  const { clon } = fixtureBaseAtrasada();
  const vacio = nuevoDir('path-vacio');
  const env = Object.fromEntries(Object.entries(ENV).filter(([k]) => k.toUpperCase() !== 'PATH'));
  env.PATH = vacio;
  const r = scaffold(clon, SPEC_ARGS, env);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /SPEC-002-nueva\.md/, 'con git habría negado: prueba que no lo encontró');
  assert.ok(lineas(r.stderr).length <= 1, r.stderr);
});

test('SPEC-028 CA-5.5: sin .sdd.json scaffold se para antes de consultar git', () => {
  const { clon } = fixtureBaseAtrasada();
  fs.rmSync(path.join(clon, '.sdd.json'));
  const traza = path.join(nuevoDir('traza'), 'trace.log');
  const r = scaffold(clon, SPEC_ARGS, { ...ENV, GIT_TRACE: traza });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /\.sdd\.json/);
  assert.ok(!r.stderr.includes('origin/main'), r.stderr);
  assert.equal(fs.existsSync(traza) ? fs.readFileSync(traza, 'utf8') : '', '', 'no debe lanzar ningún git');
});

// --- CA-6.3 -----------------------------------------------------------------

test('SPEC-028 CA-6.3: --id EPIC-FIX no se compara contra los refs y se comporta como hoy', () => {
  const { clon } = fixtureBaseAtrasada({ conEpicFix: true });
  const r = scaffold(clon, ['epica', 'Fixes', '--id', 'EPIC-FIX']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr, '');
  assert.ok(fs.existsSync(path.join(clon, 'docs', 'epicas', 'EPIC-FIX', '_epica.md')));
});

// --- Lector (núcleo, sin CLI) ----------------------------------------------

test('SPEC-028: leeRefs devuelve la rama por defecto y las rutas por ref, sin la rama actual', () => {
  const { clon } = fixtureReservas({ otra: true });
  const r = leeRefs(path.join(clon, 'docs'));
  assert.equal(r.estado, 'ok');
  assert.equal(r.defecto, 'origin/main');
  assert.deepEqual(Object.keys(r.porRef).sort(), ['origin/ft/SPEC-002-x', 'origin/main', 'otra']);
  assert.ok(r.porRef.otra.includes(SPEC(4, 'z')));
});
