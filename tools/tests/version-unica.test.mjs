// SPEC-016 CA-1c — hay UN check del repo, cableado en `npm run check`, que FALLA
// si alguna versión declarada en el árbol fuente diverge de package.json.version
// (ADR-010 §4: una sola fuente de versión), y que impide declarar `version` a la
// vez en el plugin.json y en la entrada del marketplace (regla de Claude Code:
// «Avoid setting version in both plugin.json and the marketplace entry»).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkVersionUnica } from '../checks/version-unica.mjs';
import { PASOS } from '../check.mjs';

const REPO = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

// Fixture: repo mínimo con package.json + un adaptador con plugin.json + marketplace.
function fixture({ pkgVersion = '1.0.0', pluginVersion = '1.0.0', entradaMarketplace = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-verunica-'));
  fs.mkdirSync(path.join(dir, 'adapters', 'demo', '.claude-plugin'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', version: pkgVersion }));
  const plg = { name: 'demo' };
  if (pluginVersion !== null) plg.version = pluginVersion;
  fs.writeFileSync(path.join(dir, 'adapters', 'demo', '.claude-plugin', 'plugin.json'), JSON.stringify(plg));
  fs.writeFileSync(path.join(dir, '.claude-plugin', 'marketplace.json'), JSON.stringify({
    name: 'demo', plugins: [{ name: 'demo', source: './dist/demo', ...entradaMarketplace }],
  }));
  return dir;
}

test('CA-1c: el check pasa sobre el árbol fuente real del repo', () => {
  const { ok, errores } = checkVersionUnica(REPO);
  assert.ok(ok, 'version-unica falla en el repo:\n' + errores.join('\n'));
});

test('CA-1c: FALLA si un plugin.json del fuente declara una version distinta de package.json', () => {
  const { ok, errores } = checkVersionUnica(fixture({ pkgVersion: '0.5.0', pluginVersion: '0.4.0' }));
  assert.equal(ok, false);
  assert.ok(errores.join('\n').includes('0.4.0'), 'el error no nombra la versión divergente');
});

test('CA-1c: FALLA si un plugin.json del fuente no declara version', () => {
  const { ok, errores } = checkVersionUnica(fixture({ pluginVersion: null }));
  assert.equal(ok, false);
  assert.match(errores.join('\n'), /version/i);
});

test('CA-1c: FALLA si la entrada del marketplace declara version (ADR-010 §4b)', () => {
  const { ok, errores } = checkVersionUnica(fixture({ entradaMarketplace: { version: '1.0.0' } }));
  assert.equal(ok, false);
  assert.match(errores.join('\n'), /marketplace/i);
});

test('CA-1c: pasa cuando todo el árbol fuente declara la misma version que package.json', () => {
  const { ok } = checkVersionUnica(fixture({ pkgVersion: '2.3.4', pluginVersion: '2.3.4' }));
  assert.equal(ok, true);
});

test('CA-1c: version-unica está cableado en el runner (lo ejerce `npm run check`)', () => {
  const paso = PASOS.find((p) => p.nombre === 'version-unica');
  assert.ok(paso, "falta el paso 'version-unica' en el runner");
  assert.deepEqual(paso.cmd, ['node', 'tools/checks/version-unica.mjs']);
});
