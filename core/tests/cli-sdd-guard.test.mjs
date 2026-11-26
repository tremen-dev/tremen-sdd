import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const SCRIPTS = {
  scaffold: path.join(REPO_ROOT, 'core', 'scripts', 'scaffold.mjs'),
  estado: path.join(REPO_ROOT, 'core', 'scripts', 'estado.mjs'),
  tablero: path.join(REPO_ROOT, 'core', 'scripts', 'tablero.mjs'),
  valida: path.join(REPO_ROOT, 'core', 'scripts', 'valida.mjs'),
  informeQa: path.join(REPO_ROOT, 'core', 'scripts', 'informe-qa.mjs'),
};

// SPEC-024 CA-6: Barrera mecánica fail-closed en el CLI de los 5 scripts de core/scripts/
test('SPEC-024 CA-6: los 5 scripts del núcleo terminan con exit != 0 en proyecto sin .sdd.json y no crean ficheros', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-no-sdd-'));
  try {
    const docs = path.join(tmp, 'docs');

    // 1. scaffold.mjs
    const rScaffold = spawnSync(process.execPath, [SCRIPTS.scaffold, 'epica', 'Mi Epica', '--dir', docs], {
      cwd: tmp,
      encoding: 'utf8',
    });
    assert.notEqual(rScaffold.status, 0, 'scaffold debe fallar sin .sdd.json');
    assert.match(rScaffold.stderr, /\.sdd\.json/, 'scaffold stderr debe mencionar .sdd.json');
    assert.equal(fs.existsSync(docs), false, 'scaffold no debe crear la carpeta docs');

    // 2. tablero.mjs
    const rTablero = spawnSync(process.execPath, [SCRIPTS.tablero, '--dir', docs], {
      cwd: tmp,
      encoding: 'utf8',
    });
    assert.notEqual(rTablero.status, 0, 'tablero debe fallar sin .sdd.json');
    assert.match(rTablero.stderr, /\.sdd\.json/, 'tablero stderr debe mencionar .sdd.json');
    assert.equal(fs.existsSync(path.join(docs, 'tablero.md')), false, 'tablero no debe crear tablero.md');

    // 3. valida.mjs
    const rValida = spawnSync(process.execPath, [SCRIPTS.valida, '--dir', docs], {
      cwd: tmp,
      encoding: 'utf8',
    });
    assert.notEqual(rValida.status, 0, 'valida debe fallar sin .sdd.json');
    assert.match(rValida.stderr, /\.sdd\.json/, 'valida stderr debe mencionar .sdd.json');

    // 4. estado.mjs
    const rEstado = spawnSync(process.execPath, [SCRIPTS.estado, path.join(docs, 'SPEC-001.md'), 'en-progreso'], {
      cwd: tmp,
      encoding: 'utf8',
    });
    assert.notEqual(rEstado.status, 0, 'estado debe fallar sin .sdd.json');
    assert.match(rEstado.stderr, /\.sdd\.json/, 'estado stderr debe mencionar .sdd.json');

    // 5. informe-qa.mjs
    const rInforme = spawnSync(process.execPath, [SCRIPTS.informeQa, path.join(docs, 'SPEC-001.ledger.md')], {
      cwd: tmp,
      encoding: 'utf8',
    });
    assert.notEqual(rInforme.status, 0, 'informe-qa debe fallar sin .sdd.json');
    assert.match(rInforme.stderr, /\.sdd\.json/, 'informe-qa stderr debe mencionar .sdd.json');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('SPEC-024 CA-6: los scripts completan con exit 0 cuando existe .sdd.json en el proyecto', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-con-sdd-'));
  try {
    fs.writeFileSync(path.join(tmp, '.sdd.json'), JSON.stringify({ idioma: 'es' }));
    const docs = path.join(tmp, 'docs');
    fs.mkdirSync(path.join(docs, 'epicas'), { recursive: true });

    // 1. scaffold.mjs epica
    const rScaffold = spawnSync(process.execPath, [SCRIPTS.scaffold, 'epica', 'Mi Epica', '--id', 'EPIC-FIX', '--dir', docs], {
      cwd: tmp,
      encoding: 'utf8',
    });
    assert.equal(rScaffold.status, 0, `scaffold falló: ${rScaffold.stderr}`);
    assert.ok(fs.existsSync(path.join(docs, 'epicas', 'EPIC-FIX', '_epica.md')));

    // 2. tablero.mjs
    const rTablero = spawnSync(process.execPath, [SCRIPTS.tablero, '--dir', docs], {
      cwd: tmp,
      encoding: 'utf8',
    });
    assert.equal(rTablero.status, 0, `tablero falló: ${rTablero.stderr}`);
    assert.ok(fs.existsSync(path.join(docs, 'tablero.md')));

    // 3. estado.mjs (aprobar la épica)
    const epicaMd = path.join(docs, 'epicas', 'EPIC-FIX', '_epica.md');
    const rEstado = spawnSync(process.execPath, [SCRIPTS.estado, epicaMd, 'aprobada', '--por', 'Alberto'], {
      cwd: tmp,
      encoding: 'utf8',
    });
    assert.equal(rEstado.status, 0, `estado falló: ${rEstado.stderr}`);

    // 4. valida.mjs
    const rValida = spawnSync(process.execPath, [SCRIPTS.valida, '--dir', docs], {
      cwd: tmp,
      encoding: 'utf8',
    });
    assert.equal(rValida.status, 0, `valida falló: ${rValida.stderr}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
