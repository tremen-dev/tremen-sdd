import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { analizaNucleoAgnostico } from '../checks/nucleo-agnostico.mjs';
import { REPO_ROOT } from '../checks/_util.mjs';

// Crea un núcleo sintético base/core/ y devuelve su ruta coreDir. ${SDD_ROOT}
// resuelve a base (la raíz que CONTIENE core/).
function nucleoTmp(prefijo) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), prefijo));
  const core = path.join(base, 'core');
  fs.mkdirSync(path.join(core, 'roles', 'es'), { recursive: true });
  fs.mkdirSync(path.join(core, 'scripts'), { recursive: true });
  return core;
}

test('CA-1/CA-3(a): el núcleo real (tras el rename) es agnóstico al harness', () => {
  assert.equal(analizaNucleoAgnostico(path.join(REPO_ROOT, 'core')).ok, true);
});

test('CA-3(b): un núcleo con ${SDD_ROOT} y ruta existente pasa (allowlist)', () => {
  const core = nucleoTmp('sdd-agn-ok-');
  fs.writeFileSync(path.join(core, 'scripts', 'estado.mjs'), '// script\n');
  fs.writeFileSync(path.join(core, 'roles', 'es', 'x.md'),
    'Invoca `node "${SDD_ROOT}/core/scripts/estado.mjs" <spec> hecho`.\n');
  assert.equal(analizaNucleoAgnostico(core).ok, true);
});

test('CA-3(a): un ${CLAUDE_PLUGIN_ROOT} bajo core/ hace fallar y el mensaje nombra fichero y token', () => {
  const core = nucleoTmp('sdd-agn-claude-');
  fs.writeFileSync(path.join(core, 'roles', 'es', 'x.md'),
    'Invoca `node "${CLAUDE_PLUGIN_ROOT}/core/scripts/estado.mjs"`.\n');
  const { ok, errores } = analizaNucleoAgnostico(core);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /x\.md/.test(e) && /\$\{CLAUDE_PLUGIN_ROOT\}/.test(e)));
});

test('CA-3(a): un token de harness futuro/desconocido (${GEMINI_ROOT}) también se caza (allowlist, no denylist)', () => {
  const core = nucleoTmp('sdd-agn-gemini-');
  fs.writeFileSync(path.join(core, 'roles', 'es', 'x.md'),
    'Ejemplo con `${GEMINI_ROOT}/core/scripts/x.mjs`.\n');
  const { ok, errores } = analizaNucleoAgnostico(core);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /\$\{GEMINI_ROOT\}/.test(e)));
});

test('CA-3(a): ${KIMI_HOME} bajo core/ hace fallar', () => {
  const core = nucleoTmp('sdd-agn-kimi-');
  fs.writeFileSync(path.join(core, 'roles', 'es', 'x.md'),
    'Ejemplo con `${KIMI_HOME}/core/x.md`.\n');
  const { ok, errores } = analizaNucleoAgnostico(core);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /\$\{KIMI_HOME\}/.test(e)));
});

test('CA-3(c): un ${SDD_ROOT}/<ruta> que no existe en el núcleo hace fallar', () => {
  const core = nucleoTmp('sdd-agn-noexiste-');
  fs.writeFileSync(path.join(core, 'roles', 'es', 'x.md'),
    'Invoca `node "${SDD_ROOT}/core/scripts/fantasma.mjs"`.\n');
  const { ok, errores } = analizaNucleoAgnostico(core);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /no existe/.test(e) && /fantasma\.mjs/.test(e)));
});

test('CA-3(c): un ${SDD_ROOT}/<ruta> con placeholder <…> de plantilla no se intenta resolver', () => {
  const core = nucleoTmp('sdd-agn-plantilla-');
  fs.writeFileSync(path.join(core, 'roles', 'es', 'x.md'),
    'Genérico: `${SDD_ROOT}/core/roles/<idioma>/<rol>.md`.\n');
  assert.equal(analizaNucleoAgnostico(core).ok, true);
});
