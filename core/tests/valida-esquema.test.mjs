import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// SPEC-029 CA-4 — el CLI de valida.mjs informa de los errores de esquema de
// .sdd.json (ADR-019 §3 y §4) con el lector único, y sin perder el error de
// `idioma` no soportado de SPEC-025 CA-6.
const CORE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VALIDA = path.join(CORE, 'scripts', 'valida.mjs');

function proyecto(sdd) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-valida-esquema-')));
  fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify(sdd));
  fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
  return dir;
}

const corre = (sdd) => spawnSync('node', [VALIDA, '--dir', 'docs'], { cwd: proyecto(sdd), encoding: 'utf8' });
const NO_SOPORTADO = /`idioma` no soportado/;

test('CA-4(a): el .sdd.json de CA-2 -> exit != 0 y nombra los tres campos', () => {
  const r = corre({ rutasVigiladas: 'src/', linter: 'biome', gates: { calidad: 'no' } });
  assert.notEqual(r.status, 0);
  for (const campo of ['rutasVigiladas', 'linter', 'gates.calidad']) {
    assert.ok(r.stderr.includes(`\`${campo}\``), `${campo}: ${r.stderr}`);
  }
  assert.match(r.stderr, /^\[valida\] 1 error\(es\):\n/);
});

test('CA-4(b): {"idioma":"zz"} -> exit != 0 y solo el error de idioma no soportado de SPEC-025 CA-6', () => {
  const r = corre({ idioma: 'zz' });
  assert.notEqual(r.status, 0);
  assert.equal(r.stderr, '[valida] 1 error(es):\n - .sdd.json: `idioma` no soportado: "zz". Idiomas soportados: es.\n');
});

test('CA-4(c): {"idioma":42} -> exit != 0, error de esquema de idioma y no el de idioma no soportado', () => {
  const r = corre({ idioma: 42 });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /`idioma`: se esperaba un string, se encontró 42/);
  assert.doesNotMatch(r.stderr, NO_SOPORTADO);
  assert.match(r.stderr, /^\[valida\] 1 error\(es\):\n/);
});

test('CA-4(d): {"idioma":"zz","linter":"biome"} -> exit != 0, el de esquema de linter y el de idioma no soportado', () => {
  const r = corre({ idioma: 'zz', linter: 'biome' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /^\[valida\] 2 error\(es\):\n - [^\n]*`linter`: se esperaba uno de [^\n]*\n - \.sdd\.json: `idioma` no soportado: "zz"\./);
  assert.doesNotMatch(r.stderr, /`idioma`: se esperaba/);
});

test('CA-4.6: valida.mjs y el resolutor de idioma no parsean .sdd.json por su cuenta: usan el lector', () => {
  const valida = fs.readFileSync(VALIDA, 'utf8');
  const idioma = fs.readFileSync(path.join(CORE, 'lib', 'idioma.mjs'), 'utf8');
  const LECTOR = /import\s*\{[^}]*\bleerSddJson\b[^}]*\}\s*from\s*['"][^'"]*\/sdd-json\.mjs['"]/;
  for (const [nombre, src] of [['valida.mjs', valida], ['idioma.mjs', idioma]]) {
    assert.match(src, LECTOR, `${nombre} importa leerSddJson`);
    assert.doesNotMatch(src, /JSON\.parse\(/, `${nombre} no tiene un segundo JSON.parse`);
  }
});
