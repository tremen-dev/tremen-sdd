import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from '../checks/_util.mjs';

// SPEC-027 CA-2 — fuente única del lector de .sdd.json (ADR-017 §1), al estilo de
// require-spec-una-logica.test.mjs: los cinco lectores de antes delegan en
// core/lib/sdd-json.mjs y ninguno parsea .sdd.json por su cuenta.
const LECTORES = [
  ['claude-code', 'adapters/claude-code/hooks/_comun.mjs'],
  ['kimi-code', 'adapters/kimi-code/hooks/_comun.mjs'],
  ['antigravity', 'adapters/antigravity/hooks/_comun.mjs'],
  ['opencode', 'adapters/opencode/plugins/_comun.mjs'],
  [null, 'tools/githooks/pre-commit.mjs'],
];

const RE_IMPORT = /import\s*\{[^}]*\bleerSddJson\b[^}]*\}\s*from\s*['"][^'"]*core\/lib\/sdd-json\.mjs['"]/;

for (const [, rel] of LECTORES) {
  const src = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

  test(`CA-2.1: ${rel} importa leerSddJson de core/lib/sdd-json.mjs`, () => {
    assert.match(src, RE_IMPORT);
  });

  test(`CA-2.2: ${rel} no aplica JSON.parse a la lectura de .sdd.json`, () => {
    assert.doesNotMatch(src, /JSON\.parse\([^;\n]*sdd\.json/);
    // Sin el nombre del fichero como literal, no hay forma de que lo lea por su
    // cuenta: la ruta la construye el lector único.
    assert.doesNotMatch(src, /['"`][^'"`\n]*\.sdd\.json['"`]/);
  });
}

for (const [harness, rel] of LECTORES.filter(([h]) => h)) {
  test(`CA-2.3: la copia de dist/${harness}/ resuelve el import del lector`, async () => {
    const enDist = path.join(REPO_ROOT, 'dist', harness, rel.split('/').slice(2).join('/'));
    assert.ok(fs.existsSync(enDist), `falta ${enDist} (¿build:all?)`);
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'dist', harness, 'core', 'lib', 'sdd-json.mjs')));
    await import(pathToFileURL(enDist).href);
  });
}
