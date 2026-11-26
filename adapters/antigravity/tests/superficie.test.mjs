import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../../../core/lib/frontmatter.mjs';

const DIST = path.resolve('dist/antigravity');
const IDIOMA = 'es';
const ROLES = [
  'sdd-producto',
  'sdd-arquitecto',
  'sdd-implementador',
  'sdd-verificador',
  'sdd-documentalista',
  'sdd-como-vamos',
  'sdd-orquestador',
];
const ROLES_PESADOS = [
  'sdd-arquitecto',
  'sdd-implementador',
  'sdd-verificador',
  'sdd-documentalista',
];
const ROLES_DIRECTOS = [
  'sdd-producto',
  'sdd-como-vamos',
];
const COMANDOS = ['sdd-init', 'sdd-tablero'];

function interno(p) {
  const rel = path.relative(DIST, p);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

test('CA-1: plugin.json existe en el artefacto y declara nombre tremen-sdd', () => {
  const p = path.join(DIST, 'plugin.json');
  assert.ok(fs.existsSync(p), 'dist/antigravity/plugin.json debe existir');
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.equal(doc.name, 'tremen-sdd');
});

test('CA-1: PROVENANCE.json existe en el artefacto con harness antigravity', () => {
  const p = path.join(DIST, 'PROVENANCE.json');
  assert.ok(fs.existsSync(p), 'dist/antigravity/PROVENANCE.json debe existir');
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.equal(doc.harness, 'antigravity');
});

test('CA-2: existen las SIETE skills canónicas con su SKILL.md', () => {
  for (const rol of ROLES) {
    const p = path.join(DIST, 'skills', rol, 'SKILL.md');
    assert.ok(fs.existsSync(p), `debe existir skills/${rol}/SKILL.md`);
    const { data } = parseFrontmatter(fs.readFileSync(p, 'utf8'));
    assert.equal(data.name, rol);
    assert.ok(data.description && data.description.length > 0, `${rol} debe declarar description`);
  }
});

test('CA-3 / CA-5: dist/antigravity/agents/ NO existe en el artefacto (ADR-014)', () => {
  assert.ok(!fs.existsSync(path.join(DIST, 'agents')), 'dist/antigravity/agents no debe existir');
});

test('CA-1 / CA-5: las 4 skills de roles pesados prohíben autoejecución y prescriben invoke_subagent self', () => {
  for (const rol of ROLES_PESADOS) {
    const f = path.join(DIST, 'skills', rol, 'SKILL.md');
    assert.ok(fs.existsSync(f), `debe existir skills/${rol}/SKILL.md`);
    const texto = fs.readFileSync(f, 'utf8');
    assert.ok(!/^##\s+(Misión|Flujo|Reglas duras)/m.test(texto), `la skill ${rol} NO embebe el cuerpo del rol (RN-06)`);
    assert.match(texto, /PROHIBIDO autoejecutar/i, `la skill ${rol} debe prohibir autoejecución en el contexto principal`);
    assert.match(texto, /invoke_subagent/, `la skill ${rol} debe nombrar invoke_subagent`);
    assert.match(texto, /"TypeName":\s*"self"/, `la skill ${rol} debe especificar TypeName: "self"`);
    assert.match(texto, new RegExp(`"Role":\\s*"${rol}"`), `la skill ${rol} debe especificar Role: "${rol}"`);
  }
});

test('CA-2 / CA-5: sdd-orquestador declara delegación con invoke_subagent self y referencia su rol de núcleo', () => {
  const f = path.join(DIST, 'skills', 'sdd-orquestador', 'SKILL.md');
  assert.ok(fs.existsSync(f), 'debe existir skills/sdd-orquestador/SKILL.md');
  const texto = fs.readFileSync(f, 'utf8');
  assert.ok(!/^##\s+(Misión|Flujo|Reglas duras)/m.test(texto), 'sdd-orquestador NO embebe el cuerpo del rol (RN-06)');
  const m = texto.match(/((?:\.\.\/)+core\/roles\/[^\s`"']+)/);
  assert.ok(m, 'sdd-orquestador referencia el rol de núcleo por ruta relativa');
  const rolPath = path.resolve(path.dirname(f), m[1].replaceAll('<idioma>', IDIOMA));
  assert.ok(interno(rolPath), 'la ruta al núcleo resuelve INTERNA al artefacto para sdd-orquestador');
  assert.ok(fs.existsSync(rolPath), `el fichero de rol del núcleo existe: ${rolPath}`);
  assert.match(texto, /invoke_subagent/, 'sdd-orquestador debe nombrar invoke_subagent');
  assert.match(texto, /"TypeName":\s*"self"/, 'sdd-orquestador debe especificar TypeName: "self"');
});

test('CA-5: las skills directas (sdd-producto, sdd-como-vamos) conservan su contrato de lectura', () => {
  for (const rol of ROLES_DIRECTOS) {
    const f = path.join(DIST, 'skills', rol, 'SKILL.md');
    assert.ok(fs.existsSync(f), `debe existir skills/${rol}/SKILL.md`);
    const texto = fs.readFileSync(f, 'utf8');
    assert.ok(!/^##\s+(Misión|Flujo|Reglas duras)/m.test(texto), `la skill ${rol} NO embebe el cuerpo del rol (RN-06)`);
    const m = texto.match(/((?:\.\.\/)+core\/roles\/[^\s`"']+)/);
    assert.ok(m, `la skill ${rol} referencia el rol de núcleo por ruta relativa`);
    const rolPath = path.resolve(path.dirname(f), m[1].replaceAll('<idioma>', IDIOMA));
    assert.ok(interno(rolPath), `la ruta al núcleo resuelve INTERNA al artefacto para ${rol}`);
    assert.ok(fs.existsSync(rolPath), `el fichero de rol del núcleo existe: ${rolPath}`);
    assert.match(fs.readFileSync(rolPath, 'utf8'), /##\s+Misión/, `el rol resuelto contiene el cuerpo del system prompt para ${rol}`);
  }
});

test('CA-4: los comandos de usuario (sdd-init y sdd-tablero) existen en commands/', () => {
  for (const cmd of COMANDOS) {
    const cm = path.join(DIST, 'commands', `${cmd}.md`);
    assert.ok(fs.existsSync(cm), `debe existir commands/${cmd}.md`);
  }
});

test('CA-5: ninguna pieza del artefacto usa tokens de plugin-root', () => {
  for (const dir of ['commands', 'skills']) {
    const base = path.join(DIST, dir);
    if (!fs.existsSync(base)) continue;
    const stack = [base];
    while (stack.length) {
      const d = stack.pop();
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) { stack.push(p); continue; }
        if (!/\.(md|json)$/.test(e.name)) continue;
        assert.ok(!/\$\{[A-Z_]*PLUGIN_ROOT[A-Z_]*\}/.test(fs.readFileSync(p, 'utf8')), `${path.relative(DIST, p)} no debe usar un token de plugin-root`);
      }
    }
  }
});

test('CA-6: sdd-init estampa AGENTS.md y la plantilla existe en core/templates/es/AGENTS.md (SPEC-025 CA-8)', () => {
  const initFile = path.join(DIST, 'commands', 'sdd-init.md');
  const initText = fs.readFileSync(initFile, 'utf8');
  assert.match(initText, /AGENTS\.md/, 'sdd-init.md debe instruir estampar AGENTS.md');
  const tpl = path.join(DIST, 'core', 'templates', 'es', 'AGENTS.md');
  assert.ok(fs.existsSync(tpl), 'core/templates/es/AGENTS.md debe viajar en el artefacto');
});
