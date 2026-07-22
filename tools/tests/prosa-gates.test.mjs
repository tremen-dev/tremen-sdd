import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { checkProsaGates, DOC_DOCUMENTALISTA, REGLAS_REQUERIDAS } from '../checks/prosa-gates.mjs';
import { REPO_ROOT } from '../checks/_util.mjs';

// SPEC-006 CA-6: check de PRESENCIA de la regla dura en la prosa canónica del
// documentalista (RN-06, fuente única).

test('CA-6: la prosa real de sdd-documentalista contiene la regla dura (el check PASA)', () => {
  const contenido = fs.readFileSync(path.join(REPO_ROOT, DOC_DOCUMENTALISTA), 'utf8');
  assert.equal(checkProsaGates(contenido).ok, true);
});

test('CA-6: una prosa SIN la regla dura hace FALLAR el check, nombrando lo que falta', () => {
  const sinRegla = '# Rol: sdd-documentalista\n\n## Misión\nRegeneras el tablero y validas.\n';
  const { ok, faltan } = checkProsaGates(sinRegla);
  assert.equal(ok, false);
  assert.equal(faltan.length, REGLAS_REQUERIDAS.length);
  assert.ok(faltan.some((r) => /épica/.test(r.que)));
});

test('CA-6: basta con que falte UNA de las reglas para que el check falle', () => {
  // Contiene dos de los tres marcadores; falta "ni propones cerrar una épica".
  const casi = 'No ejecutas transiciones de gate humano. El cierre de épica es un gate humano.';
  const { ok, faltan } = checkProsaGates(casi);
  assert.equal(ok, false);
  assert.ok(faltan.some((r) => r.id === 'no-propone-cerrar-epica'));
});

test('CA-6: la normalización tolera acentos y marcas markdown', () => {
  const conMarkdown = '**No ejecutas transiciones de gate** humano; '
    + '`ni propones cerrar una épica`; el cierre de épica es un gate humano.';
  assert.equal(checkProsaGates(conMarkdown).ok, true);
});
