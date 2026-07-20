import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkReferencias } from '../checks/referencias.mjs';
import { buildAdapter } from '../build-adapter.mjs';

test('CA-7: el adaptador construido resuelve todas sus referencias dentro del plugin root', () => {
  const dist = buildAdapter('claude-code', { outDir: fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-ref-ok-')) });
  assert.equal(checkReferencias(dist).ok, true);
});

test('CA-7: la forma refutada ${CLAUDE_PLUGIN_ROOT}/../../ hace fallar el check', () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-ref-mal-'));
  fs.mkdirSync(path.join(dist, 'agents'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'agents', 'a.md'),
    'Lee `${CLAUDE_PLUGIN_ROOT}/../../core/roles/es/sdd-x.md`.\n');
  const { ok, errores } = checkReferencias(dist);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /forma refutada/.test(e)));
});

test('CA-7: una ruta declarada que no existe en el artefacto hace fallar el check', () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-ref-noexiste-'));
  fs.mkdirSync(path.join(dist, 'commands'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'commands', 'c.md'),
    'Ejecuta `node "${CLAUDE_PLUGIN_ROOT}/core/scripts/fantasma.mjs"`.\n');
  const { ok, errores } = checkReferencias(dist);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /no existe en el artefacto/.test(e)));
});

test('CA-7: un import ESM que escapa del plugin root hace fallar el check', () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-ref-import-'));
  fs.mkdirSync(path.join(dist, 'hooks'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'hooks', 'h.mjs'), "import { x } from '../../core/lib/frontmatter.mjs';\n");
  const { ok, errores } = checkReferencias(dist);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /import ESM escapa el plugin root/.test(e)));
});
