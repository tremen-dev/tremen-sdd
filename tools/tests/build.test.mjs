import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildAdapter } from '../build-adapter.mjs';
import { walk } from '../checks/_util.mjs';

// Firma del árbol de salida: rutas relativas ordenadas + sha256 del contenido.
function snapshot(dir) {
  return walk(dir).map((f) => {
    const rel = path.relative(dir, f).replaceAll('\\', '/');
    const hash = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
    return `${rel}:${hash}`;
  }).sort();
}

test('CA-9(c): el build es idempotente — dos ejecuciones dan un árbol idéntico', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-build-idem-'));
  const snap1 = snapshot(buildAdapter('claude-code', { outDir: out }));
  const snap2 = snapshot(buildAdapter('claude-code', { outDir: out }));
  assert.deepEqual(snap2, snap1);
});

test('CA-9(c)/CA-3: el build produce un artefacto autocontenido con el núcleo dentro', () => {
  const dist = buildAdapter('claude-code', { outDir: fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-build-sc-')) });
  assert.ok(fs.existsSync(path.join(dist, '.claude-plugin', 'plugin.json')), 'plugin.json presente');
  assert.ok(fs.existsSync(path.join(dist, 'core', 'roles', 'es', 'sdd-implementador.md')), 'núcleo bajo core/');
  assert.ok(fs.existsSync(path.join(dist, 'hooks', 'require-spec.mjs')), 'hooks presentes');
});
