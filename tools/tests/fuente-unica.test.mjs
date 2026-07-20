import test from 'node:test';
import assert from 'node:assert/strict';
import { checkFuenteUnica, coreRelPaths, trackedFiles } from '../checks/fuente-unica.mjs';

test('CA-9(b): el repo real no tiene copia del núcleo comiteada fuera de core/', () => {
  assert.equal(checkFuenteUnica(trackedFiles()).ok, true);
});

test('CA-9(b): assets que solo comparten nombre de carpeta (roles/) no son falsos positivos', () => {
  const files = [
    'core/roles/es/sdd-implementador.md',
    'core/scripts/estado.mjs',
    'site/assets/roles/sdd-implementador.svg',
  ];
  assert.equal(checkFuenteUnica(files).ok, true);
});

test('CA-9(b): un fichero trackeado bajo dist/ hace fallar el check', () => {
  const files = ['core/scripts/estado.mjs', 'dist/claude-code/core/scripts/estado.mjs'];
  const { ok, infractores } = checkFuenteUnica(files);
  assert.equal(ok, false);
  assert.ok(infractores.some((i) => /dist\/ no debe estar trackeado/.test(i.motivo)));
});

test('CA-9(b): una copia del núcleo dentro de un adaptador hace fallar el check', () => {
  const files = ['core/lib/frontmatter.mjs', 'adapters/claude-code/core/lib/frontmatter.mjs'];
  const { ok, infractores } = checkFuenteUnica(files);
  assert.equal(ok, false);
  assert.ok(infractores.some((i) => /directorio 'core\/' anidado/.test(i.motivo)));
});

test('CA-9(b): una réplica de un fichero de núcleo fuera de core/ hace fallar el check', () => {
  const files = ['core/roles/es/sdd-x.md', 'adapters/claude-code/roles/es/sdd-x.md'];
  const cr = coreRelPaths(files);
  const { ok, infractores } = checkFuenteUnica(files, cr);
  assert.equal(ok, false);
  assert.ok(infractores.some((i) => /copia del fichero de núcleo/.test(i.motivo)));
});
