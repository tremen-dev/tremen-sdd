import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// SPEC-025 CA-1 — resolución del idioma del proyecto sobre la raíz de ADR-015
// (ADR-016 §2): la raíz es siempre la de buscarRaizSdd, sin búsqueda propia.
const CORE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Copia del núcleo con un conjunto de roles sintético `zz` (nunca en el árbol real).
function nucleoConZz() {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-zz-core-'));
  const core = path.join(raiz, 'core');
  fs.cpSync(CORE, core, { recursive: true });
  fs.cpSync(path.join(core, 'roles', 'es'), path.join(core, 'roles', 'zz'), { recursive: true });
  return core;
}

function proyecto(contenido) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-idioma-'));
  if (contenido !== undefined) fs.writeFileSync(path.join(dir, '.sdd.json'), contenido);
  return dir;
}

const CASOS = {
  a: [undefined, 'es'],
  b: [JSON.stringify({ rutasVigiladas: ['src/'] }), 'es'],
  c: [JSON.stringify({ idioma: 'es' }), 'es'],
  d: [JSON.stringify({ idioma: 'zz' }), 'zz'],
  e: [JSON.stringify({ idioma: 'eu' }), 'es'],
  f: ['{ "idioma": "zz", ', 'es'],
};

test('CA-1: resolverIdioma devuelve el idioma de cada caso (a)-(f) sin lanzar ni escribir', () => {
  const core = nucleoConZz();
  const lib = pathToFileURL(path.join(core, 'lib', 'idioma.mjs')).href;
  const dirs = Object.fromEntries(Object.entries(CASOS).map(([k, [c]]) => [k, proyecto(c)]));
  const salida = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-idioma-out-')), 'r.json');
  // Subproceso: así se puede afirmar que la resolución no escribe en stdout/stderr.
  const codigo = `import { resolverIdioma } from ${JSON.stringify(lib)};
import fs from 'node:fs';
const dirs = ${JSON.stringify(dirs)};
const r = {};
for (const [k, d] of Object.entries(dirs)) r[k] = resolverIdioma(d);
fs.writeFileSync(${JSON.stringify(salida)}, JSON.stringify(r));`;
  const p = spawnSync('node', ['--input-type=module', '-e', codigo], { encoding: 'utf8' });
  assert.equal(p.status, 0, p.stderr);
  assert.equal(p.stdout, '');
  assert.equal(p.stderr, '');
  const r = JSON.parse(fs.readFileSync(salida, 'utf8'));
  for (const [k, [, esperado]] of Object.entries(CASOS)) assert.equal(r[k], esperado, `caso (${k})`);
});

test('CA-1: en el núcleo real, zz no está soportado y resuelve a es', async () => {
  const { resolverIdioma, idiomasSoportados } = await import('../lib/idioma.mjs');
  assert.deepEqual(idiomasSoportados(), ['es']);
  assert.equal(resolverIdioma(proyecto(JSON.stringify({ idioma: 'zz' }))), 'es');
});

test('CA-1: idiomasSoportados deriva la lista de los subdirectorios de core/roles/', async () => {
  const core = nucleoConZz();
  const { idiomasSoportados } = await import(pathToFileURL(path.join(core, 'lib', 'idioma.mjs')).href);
  assert.deepEqual(idiomasSoportados(), ['es', 'zz']);
});

test('CA-1(a)-(h): idiomaDesde resuelve desde la ruta objetivo con la raíz de buscarRaizSdd, sin lanzar ni escribir', () => {
  const core = nucleoConZz();
  const lib = pathToFileURL(path.join(core, 'lib', 'idioma.mjs')).href;
  const entry = pathToFileURL(path.join(core, 'lib', 'entrypoint.mjs')).href;
  const zz = JSON.stringify({ idioma: 'zz' });
  const objetivos = Object.fromEntries(Object.entries(CASOS).map(([k, [c]]) => [k, path.join(proyecto(c), 'docs')]));
  // (g) .sdd.json (zz) en un ancestro del mismo repo; la ruta objetivo es un subdirectorio.
  const g = proyecto(zz);
  fs.mkdirSync(path.join(g, '.git'));
  objetivos.g = path.join(g, 'docs', 'epicas', 'EPIC-001-x');
  // (h) un .git sin .sdd.json entre la ruta objetivo y un .sdd.json (zz) más arriba.
  const h = proyecto(zz);
  fs.mkdirSync(path.join(h, 'sub', '.git'), { recursive: true });
  objetivos.h = path.join(h, 'sub', 'docs');
  for (const d of Object.values(objetivos)) fs.mkdirSync(d, { recursive: true });
  const esperado = { ...Object.fromEntries(Object.entries(CASOS).map(([k, [, e]]) => [k, e])), g: 'zz', h: 'es' };
  const salida = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-idioma-out-')), 'r.json');
  const codigo = `import { idiomaDesde, resolverDesde } from ${JSON.stringify(lib)};
import { buscarRaizSdd } from ${JSON.stringify(entry)};
import fs from 'node:fs';
const objetivos = ${JSON.stringify(objetivos)};
const r = {};
for (const [k, d] of Object.entries(objetivos)) r[k] = { idioma: idiomaDesde(d), raiz: resolverDesde(d).raiz, sdd: buscarRaizSdd(d) };
fs.writeFileSync(${JSON.stringify(salida)}, JSON.stringify(r));`;
  const p = spawnSync('node', ['--input-type=module', '-e', codigo], { encoding: 'utf8' });
  assert.equal(p.status, 0, p.stderr);
  assert.equal(p.stdout, '');
  assert.equal(p.stderr, '');
  const r = JSON.parse(fs.readFileSync(salida, 'utf8'));
  for (const [k, e] of Object.entries(esperado)) {
    assert.equal(r[k].idioma, e, `caso (${k})`);
    assert.equal(r[k].raiz, r[k].sdd, `caso (${k}): la raíz es la de buscarRaizSdd`);
  }
  assert.equal(r.a.raiz, null);
  assert.equal(r.h.raiz, null, 'la búsqueda corta en .git');
});

test('CA-1: no hay una segunda búsqueda de raíz en core/lib/idioma.mjs', async () => {
  const lib = await import('../lib/idioma.mjs');
  assert.equal(lib.buscarRaizProyecto, undefined);
  assert.doesNotMatch(fs.readFileSync(path.join(CORE, 'lib', 'idioma.mjs'), 'utf8'), /path\.dirname\(dir\)|padre/);
});
