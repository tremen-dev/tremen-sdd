import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { hoy } from '../lib/fecha.mjs';

const LIB = pathToFileURL(path.resolve(import.meta.dirname, '../lib/fecha.mjs')).href;

test('formatea como YYYY-MM-DD', () => {
  assert.match(hoy(), /^\d{4}-\d{2}-\d{2}$/);
});

test('rellena mes y día con cero', () => {
  assert.equal(hoy(new Date(2026, 0, 5, 12, 0)), '2026-01-05');
});

test('sigue el calendario LOCAL, no el UTC', () => {
  // Construida con componentes locales: en cualquier zona horaria, esta fecha
  // es el 30 de agosto a las 00:30 de la mañana para quien está delante.
  assert.equal(hoy(new Date(2026, 7, 30, 0, 30)), '2026-08-30');
});

// La regresión concreta: un ledger fechado el 29 en transiciones hechas el 30.
// Se fuerza la zona horaria para que el test valga en cualquier máquina.
test('en Madrid, a las 00:30, no estampa el día anterior', () => {
  const script = `
    import { hoy } from ${JSON.stringify(LIB)};
    const d = new Date('2026-08-29T22:30:00Z'); // 00:30 del 30 en Madrid
    console.log(JSON.stringify({ local: hoy(d), utc: d.toISOString().slice(0, 10) }));
  `;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    env: { ...process.env, TZ: 'Europe/Madrid' },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  const { local, utc } = JSON.parse(r.stdout);
  assert.equal(local, '2026-08-30', 'debe estampar el día local');
  assert.equal(utc, '2026-08-29', 'y UTC es justo el que se equivocaba');
});
