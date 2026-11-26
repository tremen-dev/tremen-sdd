import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { esEntrypoint, buscarRaizSdd, exigirProyectoSdd } from '../lib/entrypoint.mjs';

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

// SPEC-024 CA-5: buscarRaizSdd y exigirProyectoSdd en core/lib/entrypoint.mjs
test('SPEC-024 CA-5: buscarRaizSdd y exigirProyectoSdd en directorio raíz con .sdd.json devuelven la raíz', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-entrypoint-'));
  try {
    fs.writeFileSync(path.join(tmp, '.sdd.json'), '{}');
    assert.equal(buscarRaizSdd(tmp), tmp);
    assert.equal(exigirProyectoSdd(tmp), tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('SPEC-024 CA-5: buscarRaizSdd y exigirProyectoSdd desde subdirectorio (existente o inexistente) devuelven la raíz con .sdd.json', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-entrypoint-'));
  try {
    fs.writeFileSync(path.join(tmp, '.sdd.json'), '{}');
    const docs = path.join(tmp, 'docs');
    fs.mkdirSync(docs);
    // Subdirectorio existente
    assert.equal(buscarRaizSdd(docs), tmp);
    assert.equal(exigirProyectoSdd(docs), tmp);

    // Subdirectorio que todavía no existe en disco
    const noExiste = path.join(tmp, 'docs', 'epicas', 'EPIC-999');
    assert.equal(buscarRaizSdd(noExiste), tmp);
    assert.equal(exigirProyectoSdd(noExiste), tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('SPEC-024 CA-5: buscarRaizSdd devuelve null y exigirProyectoSdd lanza si hay .git sin .sdd.json (incluso con ancestro .sdd.json)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-entrypoint-'));
  try {
    // Padre externo con .sdd.json accidental
    fs.writeFileSync(path.join(tmp, '.sdd.json'), '{}');

    // Repo git hijo sin .sdd.json
    const repoHijo = path.join(tmp, 'repo-corporativo');
    fs.mkdirSync(path.join(repoHijo, '.git'), { recursive: true });
    const sub = path.join(repoHijo, 'src', 'utils');
    fs.mkdirSync(sub, { recursive: true });

    // En la raíz del repo hijo
    assert.equal(buscarRaizSdd(repoHijo), null);
    assert.throws(() => exigirProyectoSdd(repoHijo), {
      message: /\.sdd\.json[\s\S]*?\/sdd-init/,
    });

    // Desde un subdirectorio del repo hijo
    assert.equal(buscarRaizSdd(sub), null);
    assert.throws(() => exigirProyectoSdd(sub), {
      message: /\.sdd\.json[\s\S]*?\/sdd-init/,
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('SPEC-024 CA-5: buscarRaizSdd devuelve null y exigirProyectoSdd lanza en directorio temporal sin .sdd.json en ningún ancestro', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-entrypoint-'));
  try {
    assert.equal(buscarRaizSdd(tmp), null);
    assert.throws(() => exigirProyectoSdd(tmp), {
      message: /\.sdd\.json[\s\S]*?\/sdd-init/,
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
