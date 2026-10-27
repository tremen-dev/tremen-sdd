import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ejecutaCasos, ejecutaScaffold, VARIANTES } from './golden/_casos.mjs';

// SPEC-019 CA-3/CA-4 — golden de la salida `es`. Los ficheros golden/*.json se
// capturaron con el código ANTERIOR a la extracción a catálogos (los textos eran
// literales en el código) y no se regeneran: son la definición de "un proyecto
// `es` o sin `idioma` no nota nada" (CE-4). Se ejercen los adaptadores
// construidos (dist/), como el resto de la suite.
const REPO = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const CORE = path.join(REPO, 'core');
const DIST = Object.fromEntries(['claude-code', 'kimi-code', 'opencode'].map((h) => [h, path.join(REPO, 'dist', h)]));
const lee = (n) => JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'tests', 'golden', n), 'utf8'));
const GOLDEN = lee('es.json');
const GOLDEN_SCAFFOLD = lee('scaffold-es.json');

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

test('CA-3/CA-6(e): sin .sdd.json, los emisores del núcleo dan el golden', async () => {
  const r = await ejecutaCasos({ coreDir: CORE, dist: DIST, sddJson: null });
  assert.ok(Object.keys(r).length > 20);
  for (const [caso, salida] of Object.entries(r)) assert.equal(salida, GOLDEN[caso], caso);
  assert.deepEqual(await ejecutaScaffold({ coreDir: CORE, sddJson: null }), GOLDEN_SCAFFOLD);
});

test('CA-4: informe-qa sigue emitiendo <html lang="es">', () => {
  assert.match(GOLDEN['informe-qa.render'], /^<!doctype html><html lang="es">/);
});
