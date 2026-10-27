import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// SPEC-019 CA-1 — resolución del idioma del proyecto (ADR-013 §2).
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

test('CA-1: la raíz del proyecto es el primer ancestro con .sdd.json', async () => {
  const { buscarRaizProyecto, idiomaDesde } = await import('../lib/idioma.mjs');
  const dir = fs.realpathSync(proyecto(JSON.stringify({ idioma: 'es' })));
  const hondo = path.join(dir, 'docs', 'epicas', 'EPIC-001-x');
  fs.mkdirSync(hondo, { recursive: true });
  assert.equal(buscarRaizProyecto(path.join(hondo, 'SPEC-001-x.md')), dir);
  assert.equal(idiomaDesde(hondo), 'es');
  // Fuera de cualquier proyecto (y sin lanzar): es.
  assert.equal(idiomaDesde(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-nada-')), 'x')), 'es');
});
