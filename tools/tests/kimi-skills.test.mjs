import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../checks/_util.mjs';
import { parseFrontmatter } from '../../core/lib/frontmatter.mjs';

// CA-6: los skills de Kimi son SKILL.md válidos (frontmatter name/description) cuyo
// cuerpo INSTRUYE al agente raíz a delegar vía Agent(subagent_type: sdd-<rol>),
// SIN el prefijo de dispatch de Claude Code (tremen-sdd:).
const SKILLS = path.join(REPO_ROOT, 'adapters', 'kimi-code', 'skills');
const ROLES = ['sdd-arquitecto', 'sdd-implementador', 'sdd-verificador', 'sdd-producto', 'sdd-documentalista', 'sdd-como-vamos'];

for (const rol of ROLES) {
  test(`CA-6: ${rol} tiene frontmatter válido y delega al raíz sin prefijo de Claude`, () => {
    const p = path.join(SKILLS, rol, 'SKILL.md');
    assert.ok(fs.existsSync(p), `debe existir skills/${rol}/SKILL.md`);
    const { data, body } = parseFrontmatter(fs.readFileSync(p, 'utf8'));
    assert.equal(data.name, rol, 'frontmatter name coincide con el rol');
    assert.ok(data.description && data.description.length > 0, 'frontmatter description presente');
    assert.match(body, new RegExp(`Agent\\(subagent_type:\\s*"${rol}"`), 'el cuerpo instruye la delegación al raíz');
    assert.ok(!/tremen-sdd:/.test(body), 'no usa el prefijo de dispatch de Claude Code (tremen-sdd:)');
  });
}

test('CA-6: no hay un skill sdd-orquestador (en Kimi el orquestador es el raíz, no un skill)', () => {
  assert.ok(!fs.existsSync(path.join(SKILLS, 'sdd-orquestador')),
    'el orquestador es el agente raíz en Kimi; no se despacha como skill');
});
