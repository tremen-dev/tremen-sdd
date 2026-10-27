import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ejecutaCasos, ejecutaScaffold, ejecutaBarrera, VARIANTES } from './golden/_casos.mjs';

// SPEC-025 CA-3/CA-4 — golden de la salida `es`. Los ficheros golden/*.json se
// capturaron con `golden/captura.mjs` ejecutando el CÓDIGO BASE (origin/main en el
// punto de integración; su hash está en el ledger), con los textos aún literales
// en el código, y no se regeneran: son la definición de "un proyecto `es` o sin
// `idioma` no nota nada" (CE-4). Se ejercen los adaptadores construidos (dist/).
//
// SDD_GOLDEN_ARBOL=<worktree del código base, con dist/ construido> ejecuta este
// mismo golden contra ese árbol: así se comprueba que es fiel al código base.
const REPO = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const ARBOL = process.env.SDD_GOLDEN_ARBOL ? path.resolve(process.env.SDD_GOLDEN_ARBOL) : REPO;
const CORE = path.join(ARBOL, 'core');
const DIST = Object.fromEntries(['claude-code', 'kimi-code', 'opencode', 'antigravity'].map((h) => [h, path.join(ARBOL, 'dist', h)]));
const lee = (n) => JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'tests', 'golden', n), 'utf8'));
const GOLDEN = lee('es.json');
const GOLDEN_SCAFFOLD = lee('scaffold-es.json');
const GOLDEN_BARRERA = lee('barrera-es.json');

for (const [variante, sddJson] of Object.entries(VARIANTES)) {
  test(`CA-3: cada texto emitido es byte a byte el golden en un proyecto ${variante}`, async () => {
    const r = await ejecutaCasos({ coreDir: CORE, dist: DIST, sddJson });
    assert.deepEqual(Object.keys(r).sort(), Object.keys(GOLDEN).sort(), 'el recorrido cubre exactamente los casos golden');
    for (const [caso, esperado] of Object.entries(GOLDEN)) assert.equal(r[caso], esperado, caso);
  });

  test(`CA-4: scaffold crea épica, spec+ledger, task y ADR byte a byte iguales (${variante})`, async () => {
    assert.deepEqual(await ejecutaScaffold({ coreDir: CORE, sddJson }), GOLDEN_SCAFFOLD);
  });
}

test('CA-3/CA-6(e): sin .sdd.json, los cinco CLI se paran en la barrera con el texto del código base', () => {
  const r = ejecutaBarrera({ coreDir: CORE });
  assert.deepEqual(Object.keys(r).sort(), Object.keys(GOLDEN_BARRERA).sort());
  for (const [caso, esperado] of Object.entries(GOLDEN_BARRERA)) assert.equal(r[caso], esperado, caso);
  assert.doesNotMatch(r['barrera.valida'], /idioma/, 'sin .sdd.json no hay error de idioma');
});

test('CA-4: informe-qa sigue emitiendo <html lang="es">', () => {
  assert.match(GOLDEN['informe-qa.render'], /^<!doctype html><html lang="es">/);
});
