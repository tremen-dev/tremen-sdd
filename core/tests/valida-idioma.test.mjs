import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// SPEC-025 CA-6 — valida.mjs falla ante un `idioma` no soportado o un .sdd.json
// ilegible (ADR-016 §2). Orden: barrera (ADR-015), .sdd.json, artefactos.
const CORE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VALIDA = path.join(CORE, 'scripts', 'valida.mjs');

function proyecto(sdd, { roto = false, crudo } = {}) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-valida-idioma-')));
  if (crudo !== undefined) fs.writeFileSync(path.join(dir, '.sdd.json'), crudo);
  else if (sdd !== undefined) fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify(sdd));
  const ep = path.join(dir, 'docs', 'epicas', 'EPIC-001-x');
  fs.mkdirSync(ep, { recursive: true });
  fs.writeFileSync(path.join(ep, '_epica.md'), '---\nid: EPIC-001\ntipo: epica\nestado: borrador\nhistorial:\n  - {estado: borrador, fecha: 2026-07-01, por: x}\n---\n');
  if (roto) fs.writeFileSync(path.join(ep, 'SPEC-001-x.md'), '---\nid: SPEC-001\ntipo: spec\nepica: EPIC-001\nestado: aprobada\nhistorial:\n  - {estado: borrador, fecha: 2026-07-01, por: x}\n---\n');
  return dir;
}

const corre = (dir, script = VALIDA) => spawnSync('node', [script, '--dir', 'docs'], { cwd: dir, encoding: 'utf8' });

test('CA-6(a): idioma "eu" -> exit != 0, nombra el valor y los soportados', () => {
  const r = corre(proyecto({ idioma: 'eu' }));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /"eu"/);
  assert.match(r.stderr, /Idiomas soportados: es\./);
});

test('CA-6(b): idioma 5 (no es una cadena) -> exit != 0, nombra el valor', () => {
  const r = corre(proyecto({ idioma: 5 }));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /no soportado: 5\./);
  assert.match(r.stderr, /Idiomas soportados: es\./);
});

test('CA-6(a): con errores de artefactos, se informan todos en la misma ejecución', () => {
  const r = corre(proyecto({ idioma: 'eu' }, { roto: true }));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /^\[valida\] 2 error\(es\):\n - \.sdd\.json: `idioma` no soportado: "eu"\. Idiomas soportados: es\.\n - epicas[\\/]EPIC-001-x[\\/]SPEC-001-x\.md: la última entrada de historial/);
});

for (const [caso, sdd] of [['c', { idioma: 'es' }], ['d', { rutasVigiladas: ['src/'] }]]) {
  test(`CA-6(${caso}): ${JSON.stringify(sdd) ?? 'sin .sdd.json'} -> exit 0 y la salida de hoy`, () => {
    const r = corre(proyecto(sdd));
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '[valida] OK\n');
    assert.equal(r.stderr, '');
  });
}

test('CA-6(e): sin .sdd.json -> la barrera de ADR-015 (código 1, el mensaje del código base) y ningún error de idioma', () => {
  const dir = proyecto(undefined);
  const r = corre(dir);
  assert.equal(r.status, 1);
  assert.equal(r.stdout, '');
  assert.equal(r.stderr, `[valida] No se encontró '.sdd.json' en ${path.join(dir, 'docs')} ni en sus ancestros. tremen-sdd no está activo en este proyecto. Ejecuta '/sdd-init' para inicializarlo.\n`);
  assert.doesNotMatch(r.stderr, /`idioma`|no soportado/);
});

test('CA-6(g): .sdd.json con JSON corrupto -> exit != 0, nombra el fichero y dice que los hooks lo tratan como ausente', () => {
  const r = corre(proyecto(undefined, { crudo: '{ "idioma": "es", ' }));
  assert.notEqual(r.status, 0);
  assert.equal(r.stderr, '[valida] 1 error(es):\n - .sdd.json: no es un JSON legible. Los hooks lo tratan como ausente: el proyecto parece activo, pero todos los gates están apagados.\n');
});

test('CA-6(g): con errores de artefactos, el .sdd.json ilegible va primero y se informan todos', () => {
  const r = corre(proyecto(undefined, { crudo: 'no-json', roto: true }));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /^\[valida\] 2 error\(es\):\n - \.sdd\.json: no es un JSON legible\.[^\n]*\n - epicas[\\/]EPIC-001-x[\\/]SPEC-001-x\.md: la última entrada de historial/);
});

test('CA-6(f): idioma "zz" con la fixture zz -> exit 0', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-zz-core-'));
  const core = path.join(raiz, 'core');
  fs.cpSync(CORE, core, { recursive: true });
  fs.cpSync(path.join(core, 'roles', 'es'), path.join(core, 'roles', 'zz'), { recursive: true });
  const r = corre(proyecto({ idioma: 'zz' }), path.join(core, 'scripts', 'valida.mjs'));
  assert.equal(r.status, 0, r.stderr);
});

test('CA-6: validateFile (hook calidad, pre-commit) no habla del idioma', async () => {
  const { validateFile } = await import('../scripts/valida.mjs');
  const dir = proyecto({ idioma: 'eu' });
  const epica = path.join(dir, 'docs', 'epicas', 'EPIC-001-x', '_epica.md');
  assert.deepEqual(validateFile(epica, path.join(dir, 'docs')), []);
});
