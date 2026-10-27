import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../checks/_util.mjs';
import { checkPrecondicionSdd } from '../checks/prosa-gates.mjs';

// SPEC-025 CA-9 — los bootstraps (skills y agents) de los cuatro adaptadores usan
// `es` si el idioma declarado no tiene roles (ADR-016 §2). Se descubren igual que
// en checkPrecondicionSdd; se verifica sobre su prosa (los ejecuta un LLM).
const { ficheros } = checkPrecondicionSdd(REPO_ROOT);
const ADAPTADORES = path.join(REPO_ROOT, 'adapters') + path.sep;
const BOOTSTRAPS = ficheros.filter((f) => f.startsWith(ADAPTADORES));
const rel = (f) => path.relative(REPO_ROOT, f).split(path.sep).join('/');

// "si no existe `core/roles/<idioma>/` …, usa `es`", admitiendo saltos de línea.
const RE_FALLBACK_ROLES = /si no existe\s+`core\/roles\/<idioma>\/`[\s\S]{0,40}?usa\s+`es`/;

test('CA-9: se toman las skills y los agents de los cuatro adaptadores', () => {
  const harnesses = new Set(BOOTSTRAPS.map((f) => rel(f).split('/')[1]));
  assert.deepEqual([...harnesses].sort(), ['antigravity', 'claude-code', 'kimi-code', 'opencode']);
  for (const h of harnesses) {
    assert.ok(BOOTSTRAPS.some((f) => rel(f).startsWith(`adapters/${h}/skills/`)), `${h}: skills`);
  }
});

for (const f of BOOTSTRAPS) {
  test(`CA-9: ${rel(f)} usa es si no existe core/roles/<idioma>/`, () => {
    assert.match(fs.readFileSync(f, 'utf8'), RE_FALLBACK_ROLES);
  });
}

test('CA-9: checkPrecondicionSdd sigue en verde (sin antipatrón y con la parada sin .sdd.json)', () => {
  const { ok, infractores } = checkPrecondicionSdd(REPO_ROOT);
  assert.ok(ok, JSON.stringify(infractores));
});
