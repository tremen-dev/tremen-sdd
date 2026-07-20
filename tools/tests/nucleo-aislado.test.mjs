import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { analizaNucleo } from '../checks/nucleo-aislado.mjs';
import { REPO_ROOT } from '../checks/_util.mjs';

test('CA-4: el núcleo real no referencia nada fuera de core/', () => {
  assert.equal(analizaNucleo(path.join(REPO_ROOT, 'core')).ok, true);
});

test('CA-4: un núcleo limpio (node:* + relativos internos) pasa', () => {
  const core = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-core-ok-'));
  fs.writeFileSync(path.join(core, 'a.mjs'), "import fs from 'node:fs';\nimport { b } from './b.mjs';\n");
  fs.writeFileSync(path.join(core, 'b.mjs'), 'export const b = 1;\n');
  assert.equal(analizaNucleo(core).ok, true);
});

test('CA-4: un import que escapa de core/ hace fallar el check', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-core-mal-'));
  const core = path.join(base, 'core');
  fs.mkdirSync(core, { recursive: true });
  fs.mkdirSync(path.join(base, 'adapters'), { recursive: true });
  fs.writeFileSync(path.join(core, 'sucio.mjs'), "import { z } from '../adapters/z.mjs';\n");
  const { ok, violaciones } = analizaNucleo(core);
  assert.equal(ok, false);
  assert.ok(violaciones.some((v) => v.motivo === 'escapa de core/'));
});

test('CA-4: una dependencia externa (bare specifier) hace fallar el check', () => {
  const core = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-core-bare-'));
  fs.writeFileSync(path.join(core, 'x.mjs'), "import yaml from 'yaml';\n");
  const { ok, violaciones } = analizaNucleo(core);
  assert.equal(ok, false);
  assert.ok(violaciones.some((v) => v.motivo === 'dependencia externa no permitida'));
});
