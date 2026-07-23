import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// CA-5 (invariante anti-duplicación): la decisión require-spec vive en UN módulo
// de core/; tanto el hook L1 como el pre-commit L2 lo IMPORTAN y no reimplementan
// el parseo de rama ft/SPEC-NNN ni la comprobación de estado.
const REPO = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const MODULO = path.join(REPO, 'core', 'lib', 'require-spec.mjs');
const HOOK_L1 = path.join(REPO, 'adapters', 'claude-code', 'hooks', 'require-spec.mjs');
const HOOK_L1_KIMI = path.join(REPO, 'adapters', 'kimi-code', 'hooks', 'require-spec.mjs');
const PLUGIN_L1_OPENCODE = path.join(REPO, 'adapters', 'opencode', 'plugins', 'require-spec.mjs');
const PRECOMMIT_L2 = path.join(REPO, 'tools', 'githooks', 'pre-commit.mjs');

// Regex del parseo de rama: debe aparecer SOLO en el módulo compartido.
const RE_RAMA = /ft\\\/\(SPEC/; // el literal /^ft\/(SPEC-\d{3})-/ del código fuente

test('CA-5a: el módulo compartido existe en core/ y exporta evaluarRequireSpec', () => {
  assert.ok(fs.existsSync(MODULO));
  const src = fs.readFileSync(MODULO, 'utf8');
  assert.match(src, /export function evaluarRequireSpec/);
});

test('CA-5b: el hook L1 importa el módulo compartido', () => {
  const src = fs.readFileSync(HOOK_L1, 'utf8');
  assert.match(src, /import\s*\{[^}]*evaluarRequireSpec[^}]*\}\s*from\s*['"][^'"]*core\/lib\/require-spec\.mjs['"]/);
});

test('CA-5b: el hook L1 de Kimi importa el módulo compartido (shim, no copia)', () => {
  const src = fs.readFileSync(HOOK_L1_KIMI, 'utf8');
  assert.match(src, /import\s*\{[^}]*evaluarRequireSpec[^}]*\}\s*from\s*['"][^'"]*core\/lib\/require-spec\.mjs['"]/);
});

test('CA-5b: el hook L1 de Kimi NO reimplementa el parseo de rama ft/SPEC-NNN', () => {
  const src = fs.readFileSync(HOOK_L1_KIMI, 'utf8');
  assert.ok(!RE_RAMA.test(src), 'el hook L1 de Kimi contiene su propio parseo de rama (duplicación)');
});

test('SPEC-011 CA-2: el plugin L1 de opencode importa el módulo compartido (shim, no copia)', () => {
  const src = fs.readFileSync(PLUGIN_L1_OPENCODE, 'utf8');
  assert.match(src, /import\s*\{[^}]*evaluarRequireSpec[^}]*\}\s*from\s*['"][^'"]*core\/lib\/require-spec\.mjs['"]/);
});

test('SPEC-011 CA-2: el plugin L1 de opencode NO reimplementa el parseo de rama ft/SPEC-NNN', () => {
  const src = fs.readFileSync(PLUGIN_L1_OPENCODE, 'utf8');
  assert.ok(!RE_RAMA.test(src), 'el plugin L1 de opencode contiene su propio parseo de rama (duplicación)');
});

test('CA-5b: el pre-commit L2 importa el módulo compartido', () => {
  const src = fs.readFileSync(PRECOMMIT_L2, 'utf8');
  assert.match(src, /import\s*\{[^}]*evaluarRequireSpec[^}]*\}\s*from\s*['"][^'"]*core\/lib\/require-spec\.mjs['"]/);
});

test('CA-5b: el hook L1 NO reimplementa el parseo de rama ft/SPEC-NNN', () => {
  const src = fs.readFileSync(HOOK_L1, 'utf8');
  assert.ok(!RE_RAMA.test(src), 'el hook L1 contiene su propio parseo de rama (duplicación)');
});

test('CA-5b: el pre-commit L2 NO reimplementa el parseo de rama ft/SPEC-NNN', () => {
  const src = fs.readFileSync(PRECOMMIT_L2, 'utf8');
  assert.ok(!RE_RAMA.test(src), 'el pre-commit L2 contiene su propio parseo de rama (duplicación)');
});

test('CA-5b: la regex de rama vive en el módulo compartido (fuente única)', () => {
  const src = fs.readFileSync(MODULO, 'utf8');
  assert.ok(RE_RAMA.test(src), 'el módulo compartido debe contener el parseo de rama');
});
