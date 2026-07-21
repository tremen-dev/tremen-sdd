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

// --- Adaptador Kimi (CA-11): manifiestos = agentes YAML + mapa subagents + tools ---

test('CA-11: los manifiestos del adaptador Kimi construido son válidos', () => {
  assert.equal(checkManifiestos(REPO_ROOT, 'kimi-code').ok, true);
});

test('CA-11: el raíz declara los SEIS sdd-* en subagents y cada path existe', () => {
  const dist = path.join(REPO_ROOT, 'dist', 'kimi-code');
  const raiz = fs.readFileSync(path.join(dist, 'agents', 'sdd-orquestador.yaml'), 'utf8');
  for (const rol of ['sdd-producto', 'sdd-arquitecto', 'sdd-implementador', 'sdd-verificador', 'sdd-documentalista', 'sdd-como-vamos']) {
    assert.match(raiz, new RegExp(`${rol}:`), `el mapa subagents debe declarar ${rol}`);
    assert.ok(fs.existsSync(path.join(dist, 'agents', `${rol}.yaml`)), `debe existir el YAML de ${rol}`);
  }
});

test('CA-11: un subagente Kimi sin allowed_tools hace fallar el check', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-mani-kimi-'));
  crearKimiMinimo(repo, { implementadorSinTools: true });
  const { ok, errores } = checkManifiestos(repo, 'kimi-code');
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /allowed_tools/.test(e)));
});

test('CA-11: un verificador con permiso de escritura (Write) hace fallar el check', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-mani-kimi-rw-'));
  crearKimiMinimo(repo, { verificadorConWrite: true });
  const { ok, errores } = checkManifiestos(repo, 'kimi-code');
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /read-only/.test(e) && /verificador/.test(e)));
});

// Crea un dist/kimi-code mínimo pero estructuralmente válido para tests negativos.
function crearKimiMinimo(repo, { implementadorSinTools = false, verificadorConWrite = false } = {}) {
  const dist = path.join(repo, 'dist', 'kimi-code');
  const ag = path.join(dist, 'agents', 'prompts');
  fs.mkdirSync(ag, { recursive: true });
  fs.mkdirSync(path.join(dist, 'hooks'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'hooks', 'hooks.toml'),
    '[[hooks]]\ncommand = "node \\"<ARTIFACT_ROOT>/hooks/require-spec.mjs\\""\n[[hooks]]\ncommand = "node \\"<ARTIFACT_ROOT>/hooks/protege-verdad.mjs\\""\n');
  const roles = ['sdd-producto', 'sdd-arquitecto', 'sdd-implementador', 'sdd-verificador', 'sdd-documentalista', 'sdd-como-vamos'];
  let subs = 'subagents:\n';
  for (const r of roles) subs += `  ${r}:\n    path: ./${r}.yaml\n    description: x\n`;
  fs.writeFileSync(path.join(dist, 'agents', 'sdd-orquestador.yaml'),
    `version: 1\nextend: default\nagent:\n  name: sdd-orquestador\nsystem_prompt_path: ./prompts/sdd-orquestador.md\nallowed_tools:\n  - Read\n  - Agent\n${subs}`);
  fs.writeFileSync(path.join(ag, 'sdd-orquestador.md'), 'x core/roles/\n');
  for (const r of roles) {
    let tools = ['Read', 'Grep', 'Glob', 'Bash'];
    if (r === 'sdd-implementador') tools = ['Read', 'Write', 'Edit', 'Bash'];
    if (r === 'sdd-implementador' && implementadorSinTools) tools = [];
    if (r === 'sdd-verificador' && verificadorConWrite) tools = ['Read', 'Write', 'Bash'];
    if (r === 'sdd-como-vamos') tools = ['Read', 'Grep', 'Glob'];
    const lista = tools.length ? 'allowed_tools:\n' + tools.map((t) => `  - ${t}`).join('\n') + '\n' : '';
    fs.writeFileSync(path.join(dist, 'agents', `${r}.yaml`),
      `version: 1\nextend: default\nagent:\n  name: ${r}\nsystem_prompt_path: ./prompts/${r}.md\n${lista}`);
    fs.writeFileSync(path.join(ag, `${r}.md`), 'x core/roles/\n');
  }
}

test('CA-8(a): un marketplace con source equivocado hace fallar el check', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-mani-mal-'));
  fs.mkdirSync(path.join(repo, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.claude-plugin', 'marketplace.json'),
    JSON.stringify({ plugins: [{ name: 'tremen-sdd', source: './otro' }] }));
  const { ok, errores } = checkManifiestos(repo, 'claude-code');
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /source "\.\/dist\/claude-code"/.test(e)));
});
