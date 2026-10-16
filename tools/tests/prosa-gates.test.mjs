import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { checkProsaGates, DOC_DOCUMENTALISTA, REGLAS_REQUERIDAS } from '../checks/prosa-gates.mjs';
import { REPO_ROOT } from '../checks/_util.mjs';

// SPEC-006 CA-6: check de PRESENCIA de la regla dura en la prosa canónica del
// documentalista (RN-06, fuente única).

test('CA-6: la prosa real de sdd-documentalista contiene la regla dura (el check PASA)', () => {
  const contenido = fs.readFileSync(path.join(REPO_ROOT, DOC_DOCUMENTALISTA), 'utf8');
  assert.equal(checkProsaGates(contenido).ok, true);
});

test('CA-6: una prosa SIN la regla dura hace FALLAR el check, nombrando lo que falta', () => {
  const sinRegla = '# Rol: sdd-documentalista\n\n## Misión\nRegeneras el tablero y validas.\n';
  const { ok, faltan } = checkProsaGates(sinRegla);
  assert.equal(ok, false);
  assert.equal(faltan.length, REGLAS_REQUERIDAS.length);
  assert.ok(faltan.some((r) => /épica/.test(r.que)));
});

test('CA-6: basta con que falte UNA de las reglas para que el check falle', () => {
  // Contiene dos de los tres marcadores; falta "ni propones cerrar una épica".
  const casi = 'No ejecutas transiciones de gate humano. El cierre de épica es un gate humano.';
  const { ok, faltan } = checkProsaGates(casi);
  assert.equal(ok, false);
  assert.ok(faltan.some((r) => r.id === 'no-propone-cerrar-epica'));
});

test('CA-6: la normalización tolera acentos y marcas markdown', () => {
  const conMarkdown = '**No ejecutas transiciones de gate** humano; '
    + '`ni propones cerrar una épica`; el cierre de épica es un gate humano.';
  assert.equal(checkProsaGates(conMarkdown).ok, true);
});

// SPEC-024 CA-1: Guarda de precondición .sdd.json en los 7 roles del núcleo
test('SPEC-024 CA-1: los 7 roles del núcleo bajo core/roles/es/ declaran la precondición .sdd.json y orden de parada', () => {
  const rolesDir = path.join(REPO_ROOT, 'core', 'roles', 'es');
  const roles = fs.readdirSync(rolesDir).filter((f) => f.startsWith('sdd-') && f.endsWith('.md')).sort();
  assert.equal(roles.length, 7, 'debe haber exactamente 7 roles en core/roles/es');

  for (const rol of roles) {
    const contenido = fs.readFileSync(path.join(rolesDir, rol), 'utf8');
    assert.doesNotMatch(contenido, /si el fichero o el campo no existen/i, `${rol} no debe contener el antipatrón de fallback`);
    assert.match(contenido, /\.sdd\.json/, `${rol} debe mencionar .sdd.json`);
    assert.match(contenido, /para(?:r)?\s+inmediatamente/i, `${rol} debe ordenar parar inmediatamente si no existe .sdd.json`);
    assert.match(contenido, /no\s+ejecutes\s+el\s+rol/i, `${rol} debe prohibir ejecutar el rol sin .sdd.json`);
  }
});

// SPEC-024 CA-2: Guarda de precondición .sdd.json en todas las skills de los 4 adaptadores
test('SPEC-024 CA-2: todas las skills de los 4 adaptadores declaran la precondición .sdd.json y orden de parada', () => {
  const adaptersDir = path.join(REPO_ROOT, 'adapters');
  const skills = [];
  for (const h of fs.readdirSync(adaptersDir).sort()) {
    const sDir = path.join(adaptersDir, h, 'skills');
    if (!fs.existsSync(sDir)) continue;
    for (const d of fs.readdirSync(sDir).sort()) {
      if (!d.startsWith('sdd-')) continue;
      const f = path.join(sDir, d, 'SKILL.md');
      if (fs.existsSync(f)) skills.push({ harness: h, rol: d, ruta: f });
    }
  }
  assert.equal(skills.length, 26, 'debe haber exactamente 26 skills (7 claude, 6 kimi, 6 opencode, 7 antigravity)');

  for (const s of skills) {
    const contenido = fs.readFileSync(s.ruta, 'utf8');
    const id = `${s.harness}/${s.rol}`;
    assert.doesNotMatch(contenido, /si el fichero o el campo no existen/i, `${id} no debe contener el antipatrón de fallback`);
    assert.match(contenido, /\.sdd\.json/, `${id} debe mencionar .sdd.json`);
    assert.match(contenido, /para(?:r)?\s+inmediatamente/i, `${id} debe ordenar parar inmediatamente si no existe .sdd.json`);

    // Roles pesados en antigravity: Prompt de invoke_subagent debe ordenar verificar .sdd.json
    if (s.harness === 'antigravity' && ['sdd-arquitecto', 'sdd-implementador', 'sdd-verificador', 'sdd-documentalista'].includes(s.rol)) {
      assert.match(contenido, /invoke_subagent[\s\S]*?\.sdd\.json/, `${id} debe incluir verificación de .sdd.json en el Prompt de invoke_subagent`);
    }
  }
});
