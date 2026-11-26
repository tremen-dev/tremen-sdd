import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { titulosLedger } from '../lib/ca-manual.mjs';

// SPEC-032 CA-10.3: valida.mjs, estado.mjs y el script de la ronda no reconocen
// por su cuenta secciones del ledger, cabeceras de tabla ni marcas de Estado: lo
// hace el lector único (core/lib/ca-manual.mjs).
const CORE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fuente = (rel) => fs.readFileSync(path.join(CORE, 'scripts', rel), 'utf8')
  .replace(/^\s*\/\/.*$/gm, '') // los comentarios pueden nombrar el modelo; el código no lo reconoce
  .replace(/\s\/\/ .*$/gm, '');
const { matriz, evidencia, cabeceraEvidencia } = titulosLedger('es');

for (const script of ['valida.mjs', 'estado.mjs', 'ronda-acotada.mjs']) {
  test(`CA-10.3: ${script} usa el lector y no reconoce secciones, cabeceras ni marcas por su cuenta`, () => {
    const src = fuente(script);
    assert.match(src, /import \{[^}]*\} \w+ .\.\.\/lib\/ca-manual\.mjs./, 'importa el lector');
    for (const literal of [matriz, evidencia, ...cabeceraEvidencia.slice(1).map((c) => `'${c}'`), "'CA'", '"CA"']) {
      assert.ok(!src.includes(literal), `${script} contiene «${literal}»`);
    }
    assert.doesNotMatch(src, /#\{1,|\^#|\\#|'##|"##/, 'reconoce encabezados de markdown');
    assert.doesNotMatch(src, /\\\||'\|'|"\|"/, 'reconoce filas de tabla');
    for (const marca of ['✅', '⚠', '🚧', '❌', '⏳', "'n-a'", 'salvedad', 'confirmado', 'desviaci']) {
      assert.ok(!src.includes(marca), `${script} contiene «${marca}» fuera de comentarios`);
    }
  });
}

test('CA-10.3: el detector no es un test vacío: ve una cabecera y una marca escritas en un script', () => {
  const malo = "const x = linea.split('|'); if (celda === '✅') {}";
  assert.match(malo, /\\\||'\|'|"\|"/);
  assert.ok(malo.includes('✅'));
});

// CA-10.4: en el árbol real, valida sale OK y la ronda no se cuela en la barrera.
const REPO = path.dirname(CORE);
test('CA-10.4: valida sobre el árbol real sale OK', () => {
  const r = spawnSync(process.execPath, [path.join(CORE, 'scripts', 'valida.mjs')], { cwd: REPO, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('CA-6: el script de la ronda se para en la barrera de ADR-015 sin .sdd.json', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-ronda-'));
  try {
    const r = spawnSync(process.execPath, [path.join(CORE, 'scripts', 'ronda-acotada.mjs'), path.join(tmp, 'SPEC-001.md'), '--desde', 'HEAD'], { cwd: tmp, encoding: 'utf8' });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /\.sdd\.json/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
