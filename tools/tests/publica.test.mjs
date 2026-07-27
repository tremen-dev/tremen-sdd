// SPEC-016 CA-3 — el árbol publicable se ensambla y valida EN LOCAL, sin publicar
// nada. El layout es el de ADR-010 §2, con los árboles por harness en la RAÍZ (no
// bajo dist/, para que el .gitignore de la fuente no interfiera) y el catálogo de
// Claude Code apuntando al hermano relativo ./claude-code.
//
// Cubre además, en local, la parte comprobable de CA-4b (el árbol publicado es
// byte-idéntico al de dist/ del mismo commit) y de CA-6a (los ficheros de una
// publicación no activan ninguna capa del pre-commit: publicar no necesita
// --no-verify ni SDD_SKIP_GATE=1, ADR-010 §9).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ensambla, LAYOUT_RAIZ, HARNESSES } from '../publica.mjs';
import { walk } from '../checks/_util.mjs';

const REPO = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const leeJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

function snapshot(dir) {
  return walk(dir).map((f) => {
    const rel = path.relative(dir, f).replaceAll('\\', '/');
    return `${rel}:${crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')}`;
  }).sort();
}

const tmp = (etiqueta) => fs.mkdtempSync(path.join(os.tmpdir(), `sdd-pub-${etiqueta}-`));

// El árbol se ensambla una vez y se reutiliza: copiar tres adaptadores es caro.
const OUT = ensambla({ outDir: tmp('layout') });

test('CA-3: el árbol de publicación contiene EXACTAMENTE el layout de ADR-010 §2', () => {
  assert.deepEqual(fs.readdirSync(OUT).sort(), [...LAYOUT_RAIZ].sort());
});

test('CA-3: los árboles por harness cuelgan de la RAÍZ, no de dist/', () => {
  assert.ok(!fs.existsSync(path.join(OUT, 'dist')), 'el árbol publicado no debe tener dist/');
  for (const h of HARNESSES) {
    assert.ok(fs.existsSync(path.join(OUT, h)), `falta ${h}/ en la raíz del árbol publicado`);
    assert.ok(fs.existsSync(path.join(OUT, h, 'core', 'roles', 'es', 'sdd-implementador.md')),
      `${h}: el núcleo no viaja dentro del árbol publicado`);
  }
});

test('CA-3: el marketplace.json declara source "./claude-code" y NO declara version', () => {
  const mk = leeJson(path.join(OUT, '.claude-plugin', 'marketplace.json'));
  const plugin = (mk.plugins ?? []).find((p) => p.name === 'tremen-sdd');
  assert.ok(plugin, 'el catálogo no declara el plugin tremen-sdd');
  assert.equal(plugin.source, './claude-code');
  assert.equal(plugin.version, undefined, 'la entrada del marketplace no debe declarar version (ADR-010 §4)');
  // El source relativo tiene que resolver DENTRO del mismo ref.
  assert.ok(fs.existsSync(path.join(OUT, plugin.source, '.claude-plugin', 'plugin.json')),
    'el source relativo no resuelve a un plugin dentro del ref publicado');
  // `claude plugin validate` avisa si el catálogo no se describe: el consumidor
  // no debe recibir warnings del CLI al añadir el marketplace publicado.
  assert.ok(mk.description, 'el catálogo publicado no declara description (warning de claude plugin validate)');
});

test('CA-3: hay un PROVENANCE.json en la raíz y otro dentro de cada árbol por harness', () => {
  const raiz = leeJson(path.join(OUT, 'PROVENANCE.json'));
  assert.equal(raiz.version, leeJson(path.join(REPO, 'package.json')).version);
  assert.match(raiz.commit, /^[0-9a-f]{40}$/);
  assert.match(raiz.fecha, /Z$/);
  assert.deepEqual(raiz.harnesses, HARNESSES);
  for (const h of HARNESSES) {
    const prov = leeJson(path.join(OUT, h, 'PROVENANCE.json'));
    assert.equal(prov.harness, h);
    assert.equal(prov.commit, raiz.commit);
    assert.equal(prov.version, raiz.version);
  }
});

test('CA-3: el README.md es generado y declara que la rama no se edita a mano', () => {
  const readme = fs.readFileSync(path.join(OUT, 'README.md'), 'utf8');
  assert.match(readme, /generad/i, 'el README no declara que el ref es generado');
  assert.match(readme, /no se edita a mano/i, 'el README no declara que no se edita a mano');
  assert.ok(readme.includes(leeJson(path.join(OUT, 'PROVENANCE.json')).commit), 'el README no cita el commit de fuente');
});

test('CA-4b: cada árbol publicado es byte-idéntico a su dist/<harness> del mismo commit', () => {
  for (const h of HARNESSES) {
    assert.deepEqual(snapshot(path.join(OUT, h)), snapshot(path.join(REPO, 'dist', h)), `${h} difiere de dist/${h}`);
  }
});

test('CA-3: ensamblar dos veces da un árbol byte-idéntico (el ensamblado no aporta no-determinismo)', () => {
  const a = ensambla({ outDir: tmp('det') });
  const b = ensambla({ outDir: tmp('det') });
  assert.deepEqual(snapshot(b), snapshot(a));
});

test('CA-3: ensambla FALLA si falta el build de algún harness (no publica un árbol a medias)', () => {
  const repoFalso = tmp('sinbuild');
  fs.mkdirSync(path.join(repoFalso, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(repoFalso, 'package.json'), '{"version":"0.0.1"}');
  assert.throws(() => ensambla({ repoRoot: repoFalso, outDir: tmp('sinbuild-out') }), /build/i);
});

// --- CA-6a / ADR-010 §9: los gates no se DISPARAN sobre un commit de publicación ---

test('CA-6a: ningún fichero de la publicación cae bajo las rutasVigiladas (require-spec no se activa)', () => {
  const vigiladas = (leeJson(path.join(REPO, '.sdd.json')).rutasVigiladas ?? [])
    .map((r) => (r.endsWith('/') ? r : r + '/'));
  const infractores = walk(OUT)
    .map((f) => path.relative(OUT, f).replaceAll('\\', '/'))
    .filter((rel) => vigiladas.some((v) => rel.startsWith(v)));
  assert.deepEqual(infractores, [], 'hay ficheros publicados bajo rutasVigiladas: require-spec se activaría');
});

test('CA-6a: ningún fichero de la publicación es un artefacto SDD bajo docs/ (la capa de coherencia no se activa)', () => {
  const esArtefacto = (rel) => rel.startsWith('docs/') && rel.endsWith('.md')
    && (path.basename(rel) === '_epica.md' || /^(EPIC|SPEC|TASK|ADR)-(\d{3}|FIX|INFRA|MANT|MEJORA)/.test(path.basename(rel)));
  const infractores = walk(OUT)
    .map((f) => path.relative(OUT, f).replaceAll('\\', '/'))
    .filter(esArtefacto);
  assert.deepEqual(infractores, [], 'hay artefactos SDD en la publicación: la capa de coherencia se activaría');
});
