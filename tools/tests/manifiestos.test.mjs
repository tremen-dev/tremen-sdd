import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkManifiestos } from '../checks/manifiestos.mjs';
import { REPO_ROOT } from '../checks/_util.mjs';

// Usa el dist/ real ya construido (npm test y test:tools ejecutan el build antes).
// No reconstruye aquí: durante la corrida paralela los tests de hooks del
// adaptador leen ese mismo dist/, y un rebuild concurrente los rompería.
const DIST = path.join(REPO_ROOT, 'dist', 'claude-code');

test('CA-8(a): los manifiestos del artefacto construido son válidos y descubribles', () => {
  assert.equal(checkManifiestos(REPO_ROOT, 'claude-code').ok, true);
});

// CA-8(b) end-to-end mínimo: el núcleo viaja DENTRO del plugin, así que un agent
// resuelve su fichero de rol por ruta interna ${CLAUDE_PLUGIN_ROOT}/core/roles/...
test('CA-8(b): un agent resuelve su rol por ruta interna al plugin root en el artefacto', () => {
  const dist = DIST;
  const agent = fs.readFileSync(path.join(dist, 'agents', 'sdd-implementador.md'), 'utf8');
  const m = agent.match(/\$\{CLAUDE_PLUGIN_ROOT\}(\/core\/roles\/[^\s`"']+)/);
  assert.ok(m, 'el agent debe referenciar su rol bajo ${CLAUDE_PLUGIN_ROOT}/core/roles/');
  const rolPath = path.join(dist, m[1].replace('<idioma>', 'es'));
  assert.ok(fs.existsSync(rolPath), `el rol debe existir en el artefacto: ${rolPath}`);
  const cuerpo = fs.readFileSync(rolPath, 'utf8');
  assert.match(cuerpo, /##\s+Misión/, 'el fichero de rol resuelto contiene el cuerpo del system prompt');
});

test('CA-8(a): un marketplace con source equivocado hace fallar el check', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-mani-mal-'));
  fs.mkdirSync(path.join(repo, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.claude-plugin', 'marketplace.json'),
    JSON.stringify({ plugins: [{ name: 'tremen-sdd', source: './otro' }] }));
  const { ok, errores } = checkManifiestos(repo, 'claude-code');
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /source "\.\/dist\/claude-code"/.test(e)));
});
