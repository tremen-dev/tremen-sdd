import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkAgentsProsa, checkTodosAdaptadores } from '../checks/roles-fuente-unica.mjs';
import { REPO_ROOT } from '../checks/_util.mjs';

test('CA-6: los agents reales referencian el rol, no lo copian', () => {
  assert.equal(checkAgentsProsa(path.join(REPO_ROOT, 'adapters', 'claude-code', 'agents')).ok, true);
});

test('CA-2/CA-6: la generalización vigila AMBOS adaptadores y ambos pasan', () => {
  const { ok, adaptadores } = checkTodosAdaptadores(REPO_ROOT);
  assert.equal(ok, true);
  assert.ok(adaptadores.includes('claude-code'), 'debe vigilar claude-code');
  assert.ok(adaptadores.includes('kimi-code'), 'debe vigilar kimi-code');
});

test('CA-2/CA-6: un bootstrap de Kimi que embebe el cuerpo del rol hace fallar', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-kimi-roles-'));
  const ag = path.join(repo, 'adapters', 'kimi-code', 'agents', 'prompts');
  fs.mkdirSync(ag, { recursive: true });
  fs.writeFileSync(path.join(ag, 'sdd-x.md'),
    'Lee `../../core/roles/<idioma>/sdd-x.md`.\n\n## Misión\nHaces cosas.\n');
  const { ok, infractores } = checkTodosAdaptadores(repo);
  assert.equal(ok, false);
  assert.ok(infractores.some((i) => i.adaptador === 'kimi-code' && /embebe prosa de rol/.test(i.motivo)));
});

test('CA-6: un agent que solo referencia core/roles/ pasa', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-agents-ok-'));
  fs.writeFileSync(path.join(dir, 'sdd-x.md'),
    'Eres el rol X.\nLee `${CLAUDE_PLUGIN_ROOT}/core/roles/<idioma>/sdd-x.md` y síguelo.\n');
  assert.equal(checkAgentsProsa(dir).ok, true);
});

test('CA-6: un agent que embebe el cuerpo del rol hace fallar el check', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-agents-mal-'));
  fs.writeFileSync(path.join(dir, 'sdd-y.md'),
    'Eres el rol Y.\nLee `${CLAUDE_PLUGIN_ROOT}/core/roles/<idioma>/sdd-y.md`.\n\n## Misión\nHaces cosas.\n');
  const { ok, infractores } = checkAgentsProsa(dir);
  assert.equal(ok, false);
  assert.ok(infractores.some((i) => /embebe prosa de rol/.test(i.motivo)));
});

test('CA-6: un agent que no referencia core/roles/ hace fallar el check', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-agents-ref-'));
  fs.writeFileSync(path.join(dir, 'sdd-z.md'), 'Eres el rol Z y actúas por tu cuenta.\n');
  const { ok, infractores } = checkAgentsProsa(dir);
  assert.equal(ok, false);
  assert.ok(infractores.some((i) => /no referencia core\/roles\//.test(i.motivo)));
});
