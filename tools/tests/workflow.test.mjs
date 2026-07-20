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
