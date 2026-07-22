import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../../../core/lib/frontmatter.mjs';

// CA-4: la superficie de disparo de opencode son SKILL.md por rol (subagente),
// con frontmatter name/description y cuerpo que INSTRUYE al primary a delegar vía
// la tool `task` (ADR-007 §Decisión punto 1), SIN prefijo de plugin (tremen-sdd:).
// La coincidencia de la description con la canónica la fuerza el check
// descripcion-fuente-unica (RN-11), generalizado a opencode.
const DIST = path.resolve('dist/opencode');
const SKILLS = path.join(DIST, 'skills');
// Los seis subagentes tienen skill; el orquestador NO (es el primary que despacha,
// no un subagente al que se delega — análogo a que en Kimi el raíz no es un skill).
const ROLES = ['sdd-producto', 'sdd-arquitecto', 'sdd-implementador', 'sdd-verificador', 'sdd-documentalista', 'sdd-como-vamos'];

for (const rol of ROLES) {
  test(`CA-4: ${rol} tiene SKILL.md válido y despacha vía task sin prefijo de plugin`, () => {
    const p = path.join(SKILLS, rol, 'SKILL.md');
    assert.ok(fs.existsSync(p), `debe existir skills/${rol}/SKILL.md`);
    const { data, body } = parseFrontmatter(fs.readFileSync(p, 'utf8'));
    assert.equal(data.name, rol, 'frontmatter name coincide con el rol');
    assert.ok(data.description && data.description.length > 0, 'frontmatter description presente');
    assert.match(body, new RegExp(`task\\(subagent_type:\\s*"${rol}"`), 'el cuerpo despacha al subagente vía la tool task');
    assert.ok(!/tremen-sdd:/.test(body), 'no usa prefijo de plugin (tremen-sdd:)');
  });
}

test('CA-4: no hay skill sdd-orquestador (el orquestador es el primary, no un subagente delegado)', () => {
  assert.ok(!fs.existsSync(path.join(SKILLS, 'sdd-orquestador')),
    'el orquestador es el agente primary en opencode; no se despacha como skill');
});
