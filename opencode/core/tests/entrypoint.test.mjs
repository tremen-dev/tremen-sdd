import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { esEntrypoint } from '../lib/entrypoint.mjs';

// Regresión cross-platform (bug SPEC-002, RED en CI Ubuntu): el idiom viejo
//   import.meta.url === new URL(`file:///${argv1.replaceAll('\\','/')}`).href
// producía CUATRO barras para una ruta POSIX (`/tmp/x` → `file:////tmp/x`),
// que NUNCA casa con el `import.meta.url` de tres barras de Node → el bloque
// CLI no se ejecutaba en Linux. Estos asserts fallan con el idiom viejo en
// CUALQUIER SO (no dependen de la plataforma donde corren).

test('esEntrypoint reconoce una ruta estilo POSIX como entrypoint', () => {
  // pathToFileURL('/tmp/foo.mjs').href === 'file:///tmp/foo.mjs' (tres barras).
  const posix = '/tmp/foo.mjs';
  assert.equal(esEntrypoint(pathToFileURL(posix).href, posix), true);
});

test('esEntrypoint reconoce una ruta estilo Windows como entrypoint', () => {
  const win = 'D:\\src\\tremen-sdd\\tools\\build-adapter.mjs';
  assert.equal(esEntrypoint(pathToFileURL(win).href, win), true);
});

test('esEntrypoint NO reconoce un fichero distinto del ejecutado', () => {
  // import.meta.url del módulo A, argv1 apunta a otro fichero B → no es entrypoint.
  const a = pathToFileURL('/tmp/moduloA.mjs').href;
  assert.equal(esEntrypoint(a, '/tmp/moduloB.mjs'), false);
});

test('esEntrypoint es falso cuando no hay argv1 (importado, sin CLI)', () => {
  assert.equal(esEntrypoint('file:///tmp/foo.mjs', undefined), false);
  assert.equal(esEntrypoint('file:///tmp/foo.mjs', ''), false);
});
