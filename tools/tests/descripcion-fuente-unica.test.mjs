import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkDescripciones } from '../checks/descripcion-fuente-unica.mjs';
import { REPO_ROOT } from '../checks/_util.mjs';
import { PASOS } from '../check.mjs';

// --- Helpers de fixture -------------------------------------------------------

// Frontmatter .md con `description:` en escalar plegado (`>`); `cuerpoDesc`
// puede traer varias líneas para ejercitar el plegado YAML (saltos -> espacios).
function md(name, cuerpoDesc, extra = '') {
  const plegado = cuerpoDesc.split('\n').map((l) => '  ' + l).join('\n');
  return `---\nname: ${name}\ndescription: >\n${plegado}\n${extra}---\nCuerpo del rol; core/roles/ es la fuente.\n`;
}

function yamlRaiz(subs) {
  let s = 'version: 1\nextend: default\nagent:\n  name: sdd-orquestador\n'
    + 'system_prompt_path: ./prompts/sdd-orquestador.md\nsubagents:\n';
  for (const [rol, desc] of Object.entries(subs)) {
    s += `  ${rol}:\n    path: ./${rol}.yaml\n    description: ${desc}\n`;
  }
  return s;
}

// Construye un árbol mínimo pero estructuralmente completo bajo `repo`.
function crearArbol(repo, { canonica, agents = {}, skillsClaude = {}, skillsKimi = {}, subagents = {} }) {
  const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
  w(path.join(repo, 'core', 'roles', 'es', '_descripciones.json'), JSON.stringify(canonica, null, 2));
  for (const [rol, desc] of Object.entries(agents)) {
    w(path.join(repo, 'adapters', 'claude-code', 'agents', `${rol}.md`), md(rol, desc));
  }
  for (const [rol, desc] of Object.entries(skillsClaude)) {
    w(path.join(repo, 'adapters', 'claude-code', 'skills', rol, 'SKILL.md'), md(rol, desc));
  }
  for (const [rol, desc] of Object.entries(skillsKimi)) {
    w(path.join(repo, 'adapters', 'kimi-code', 'skills', rol, 'SKILL.md'), md(rol, desc));
  }
  w(path.join(repo, 'adapters', 'kimi-code', 'agents', 'sdd-orquestador.yaml'), yamlRaiz(subagents));
  return repo;
}

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-desc-')); }

const LARGA = 'Única autora de SPECs y ADRs — "escribe la spec". NO para implementar.';
const CORTA = 'Única autora de SPECs y ADRs; convierte una petición en una spec.';

function arbolAlineado(repo) {
  return crearArbol(repo, {
    canonica: { 'sdd-arquitecto': { larga: LARGA, corta: CORTA } },
    // El agent trae la descripción partida en dos líneas plegadas: el plegado
    // YAML debe colapsarlas a la misma cadena normalizada que la canónica.
    agents: { 'sdd-arquitecto': 'Única autora de SPECs y ADRs — "escribe la spec".\nNO para implementar.' },
    skillsClaude: { 'sdd-arquitecto': LARGA },
    skillsKimi: { 'sdd-arquitecto': LARGA },
    subagents: { 'sdd-arquitecto': CORTA },
  });
}

// --- CA-1: la canónica real existe, parsea y declara larga+corta por rol -----

test('CA-1: core/roles/es/_descripciones.json declara larga+corta no vacías para los 6 roles', () => {
  const canon = JSON.parse(fs.readFileSync(
    path.join(REPO_ROOT, 'core', 'roles', 'es', '_descripciones.json'), 'utf8'));
  const ROLES = ['sdd-producto', 'sdd-arquitecto', 'sdd-implementador',
    'sdd-verificador', 'sdd-documentalista', 'sdd-como-vamos'];
  for (const rol of ROLES) {
    assert.ok(canon[rol], `falta el rol ${rol} en la canónica`);
    assert.equal(typeof canon[rol].larga, 'string');
    assert.ok(canon[rol].larga.trim().length > 0, `${rol}.larga vacía`);
    assert.equal(typeof canon[rol].corta, 'string');
    assert.ok(canon[rol].corta.trim().length > 0, `${rol}.corta vacía`);
  }
  // El orquestador es el raíz (superficie de disparo Claude skill), no un
  // subagente: declara larga (no necesita corta, no está en el mapa subagents).
  assert.ok(canon['sdd-orquestador']?.larga?.trim().length > 0, 'falta sdd-orquestador.larga');
});

// --- CA-3(a): pasa con el árbol alineado -------------------------------------

test('CA-3a: el check PASA con un árbol alineado (plegado YAML normalizado)', () => {
  const { ok, errores } = checkDescripciones(arbolAlineado(tmp()));
  assert.equal(ok, true, 'errores: ' + JSON.stringify(errores));
});

// --- CA-3(b): falla nombrando rol + superficie + forma ------------------------

test('CA-3b: una description de adaptador divergente hace fallar el check, nombrando rol+superficie+forma', () => {
  const repo = tmp();
  arbolAlineado(repo);
  // Contamina SOLO el skill de Kimi.
  fs.writeFileSync(path.join(repo, 'adapters', 'kimi-code', 'skills', 'sdd-arquitecto', 'SKILL.md'),
    md('sdd-arquitecto', 'Texto PARAFRASEADO que no coincide con la canónica.'));
  const { ok, errores } = checkDescripciones(repo);
  assert.equal(ok, false);
  const e = errores.join('\n');
  assert.match(e, /sdd-arquitecto/);
  assert.match(e, /kimi-code/);
  assert.match(e, /skill/);
  assert.match(e, /larga/);
});

// --- CA-3(b) bis: description que falta (rol sin canónica) --------------------

test('CA-3b: una superficie sin forma canónica se reporta como no cubierta', () => {
  const repo = tmp();
  arbolAlineado(repo);
  // Añade un skill Claude para un rol que NO está en la canónica.
  const fantasma = path.join(repo, 'adapters', 'claude-code', 'skills', 'sdd-fantasma');
  fs.mkdirSync(fantasma, { recursive: true });
  fs.writeFileSync(path.join(fantasma, 'SKILL.md'), md('sdd-fantasma', 'Rol inventado sin entrada canónica.'));
  const { ok, errores } = checkDescripciones(repo);
  assert.equal(ok, false);
  assert.ok(errores.some((x) => /sdd-fantasma/.test(x)), 'debe nombrar el rol no cubierto');
});

// --- CA-4: cobertura de las cuatro superficies de ambos adaptadores ----------

test('CA-4: el check enumera las cuatro superficies (agent+skill Claude, skill+subagents Kimi)', () => {
  const { cubiertas } = checkDescripciones(arbolAlineado(tmp()));
  const claves = cubiertas.map((c) => `${c.adaptador}/${c.tipo}`);
  assert.ok(claves.includes('claude-code/agent'));
  assert.ok(claves.includes('claude-code/skill'));
  assert.ok(claves.includes('kimi-code/skill'));
  assert.ok(claves.includes('kimi-code/subagents'));
});

test('CA-4: si se añade un skill sin canónica, el check lo reporta como no cubierto (no lo ignora)', () => {
  const repo = tmp();
  arbolAlineado(repo);
  const nuevo = path.join(repo, 'adapters', 'kimi-code', 'skills', 'sdd-nuevo');
  fs.mkdirSync(nuevo, { recursive: true });
  fs.writeFileSync(path.join(nuevo, 'SKILL.md'), md('sdd-nuevo', 'Skill nuevo que nadie declaró en la canónica.'));
  const { ok, errores } = checkDescripciones(repo);
  assert.equal(ok, false);
  assert.ok(errores.some((x) => /sdd-nuevo/.test(x)));
});

// --- CA-2 / CA-6: el check pasa contra el ÁRBOL REAL (drift cerrado) ----------

test('CA-2: el check pasa contra el árbol real del repo (conteo de divergencias = 0)', () => {
  const { ok, errores } = checkDescripciones(REPO_ROOT);
  assert.equal(ok, true, 'divergencias: ' + JSON.stringify(errores, null, 2));
});

// --- CA-3(d): el paso está cableado en el runner tools/check.mjs --------------

test('CA-3d: descripcion-fuente-unica está cableado en PASOS de tools/check.mjs', () => {
  const paso = PASOS.find((p) => p.nombre === 'descripcion-fuente-unica');
  assert.ok(paso, "falta el paso 'descripcion-fuente-unica' en el runner");
  assert.deepEqual(paso.cmd, ['node', 'tools/checks/descripcion-fuente-unica.mjs']);
});
