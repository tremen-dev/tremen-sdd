import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const YAML = path.join(REPO, '.github', 'workflows', 'ci.yml');

test('CA-6c: el workflow de CI existe', () => {
  assert.ok(fs.existsSync(YAML), 'falta .github/workflows/ci.yml');
});

test('CA-6c: el workflow tiene la estructura mínima válida (on/jobs/runs-on/steps)', () => {
  const t = fs.readFileSync(YAML, 'utf8');
  for (const clave of ['on:', 'jobs:', 'runs-on:', 'steps:']) {
    assert.match(t, new RegExp('^\\s*' + clave.replace(':', ':'), 'm'), `falta '${clave}'`);
  }
  // Dispara en push y PR.
  assert.match(t, /push:/);
  assert.match(t, /pull_request:/);
  // Sin tabuladores (YAML los prohíbe).
  assert.ok(!t.includes('\t'), 'el YAML no debe contener tabuladores');
});

test('CA-6: el workflow invoca npm test (build + núcleo + tools + adaptador)', () => {
  const t = fs.readFileSync(YAML, 'utf8');
  assert.match(t, /run:\s*npm test/);
});

test('CA-6/CA-7: el workflow invoca npm run check (6 checks + valida, incluye nucleo-aislado)', () => {
  const t = fs.readFileSync(YAML, 'utf8');
  assert.match(t, /run:\s*npm run check/);
});

test('CA-6c: el workflow usa checkout y setup-node (entorno reproducible)', () => {
  const t = fs.readFileSync(YAML, 'utf8');
  assert.match(t, /actions\/checkout/);
  assert.match(t, /actions\/setup-node/);
});

// --- SPEC-016 CA-5: la ÚNICA concesión de L3 es ignorar `release` en `push` ---
// La rama de publicación solo contiene artefacto (ni package.json, ni tools/, ni
// core/), así que un run sobre ella está condenado a fallar. ADR-010 §8 acota el
// cambio a `branches-ignore: ['release']` bajo `push`, y estos tests fijan que no
// crezca: cualquier otro filtro cambiaría la garantía sobre main y sobre ft/**.

// El bloque `on:` (hasta la siguiente clave top-level, p.ej. `jobs:`). Normaliza
// CRLF: el repo se dogfoodea en Windows y CI corre en ubuntu.
function bloqueOn(t) {
  const m = t.replaceAll('\r\n', '\n').match(/^on:\n([\s\S]*?)(?=^\S)/m);
  return m ? m[1] : '';
}

test('CA-5: push declara branches-ignore con release (y solo release)', () => {
  const on = bloqueOn(fs.readFileSync(YAML, 'utf8'));
  assert.match(on, /push:\s*\n\s+branches-ignore:\s*\['release'\]/,
    "el bloque `on:` no declara `push: branches-ignore: ['release']`");
});

test('CA-5: el disparo no gana branches, paths ni tags (no se puede combinar branches con branches-ignore)', () => {
  const on = bloqueOn(fs.readFileSync(YAML, 'utf8'));
  for (const filtro of ['branches:', 'paths:', 'paths-ignore:', 'tags:', 'tags-ignore:']) {
    assert.ok(!new RegExp('^\\s+' + filtro, 'm').test(on), `el disparo gana '${filtro}': fuera de lo que ADR-010 §8 permite`);
  }
});

test('CA-5: pull_request sigue SIN filtros (un PR desde release contra main corre la suite y falla)', () => {
  const on = bloqueOn(fs.readFileSync(YAML, 'utf8'));
  assert.match(on, /^\s+pull_request:\s*$/m, 'pull_request ha ganado filtros: se debilita la protección de main');
});

test('CA-5: los jobs y pasos no ganan exclusiones (if/continue-on-error)', () => {
  const t = fs.readFileSync(YAML, 'utf8');
  assert.ok(!/^\s+if:/m.test(t), 'un job o paso gana un `if:`: la cobertura dejaría de ser incondicional');
  assert.ok(!/continue-on-error/.test(t), 'un paso gana `continue-on-error`: CI dejaría de ser fail-closed');
});
