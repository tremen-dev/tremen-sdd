import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { checkProsaGates, checkPrecondicionSdd, DOC_DOCUMENTALISTA, REGLAS_REQUERIDAS } from '../checks/prosa-gates.mjs';
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

// SPEC-024 CA-3: Guarda de precondición .sdd.json en todos los bootstraps de agentes y sdd-init.md
test('SPEC-024 CA-3: todos los bootstraps de agentes (18) declaran precondición .sdd.json en arranque obligatorio y sdd-init estampa .sdd.json antes de valida.mjs', () => {
  const adaptersDir = path.join(REPO_ROOT, 'adapters');
  const agentes = [];

  // Claude Code
  const claudeAgentsDir = path.join(adaptersDir, 'claude-code', 'agents');
  for (const f of fs.readdirSync(claudeAgentsDir).sort()) {
    if (f.startsWith('sdd-') && f.endsWith('.md')) agentes.push(path.join(claudeAgentsDir, f));
  }
  // Kimi Code
  const kimiAgentsDir = path.join(adaptersDir, 'kimi-code', 'agents', 'prompts');
  for (const f of fs.readdirSync(kimiAgentsDir).sort()) {
    if (f.startsWith('sdd-') && f.endsWith('.md')) agentes.push(path.join(kimiAgentsDir, f));
  }
  // Opencode
  const opencodeAgentsDir = path.join(adaptersDir, 'opencode', 'agents');
  for (const f of fs.readdirSync(opencodeAgentsDir).sort()) {
    if (f.startsWith('sdd-') && f.endsWith('.md')) agentes.push(path.join(opencodeAgentsDir, f));
  }

  assert.equal(agentes.length, 18, 'debe haber exactamente 18 ficheros de agentes (4 claude + 7 kimi + 7 opencode)');

  for (const a of agentes) {
    const rel = path.relative(REPO_ROOT, a);
    const contenido = fs.readFileSync(a, 'utf8');
    assert.doesNotMatch(contenido, /si el fichero o el campo no existen/i, `${rel} no debe contener el antipatrón de fallback`);
    assert.match(contenido, /## Arranque obligatorio/, `${rel} debe tener sección ## Arranque obligatorio`);
    assert.match(contenido, /\.sdd\.json/, `${rel} debe mencionar .sdd.json`);
    assert.match(contenido, /para(?:r)?\s+inmediatamente/i, `${rel} debe ordenar parar inmediatamente si no existe .sdd.json`);
  }

  // Comandos sdd-init en modo migración
  const initFiles = [
    path.join(adaptersDir, 'claude-code', 'commands', 'sdd-init.md'),
    path.join(adaptersDir, 'opencode', 'commands', 'sdd-init.md'),
    path.join(adaptersDir, 'antigravity', 'commands', 'sdd-init.md'),
  ];
  for (const f of initFiles) {
    const rel = path.relative(REPO_ROOT, f);
    const contenido = fs.readFileSync(f, 'utf8');
    assert.match(contenido, /\.sdd\.json/, `${rel} debe mencionar .sdd.json en modo migración`);
    // En modo migración (Paso 2), debe estampar .sdd.json antes de correr valida.mjs
    const paso2 = contenido.slice(contenido.indexOf('## Paso 2'));
    assert.match(paso2, /\.sdd\.json[\s\S]*?valida\.mjs/, `${rel} debe estampar .sdd.json antes de correr valida.mjs en Paso 2`);
  }
});

// SPEC-024 CA-4: Check mecánico checkPrecondicionSdd
test('SPEC-024 CA-4: checkPrecondicionSdd sobre fixtures sintéticos detecta antipatrón, omisión y falta de parada', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-check-precondicion-'));
  try {
    const rolesDir = path.join(tmp, 'core', 'roles', 'es');
    fs.mkdirSync(rolesDir, { recursive: true });

    // Fixture con antipatrón
    fs.writeFileSync(path.join(rolesDir, 'sdd-rol1.md'),
      '# Rol 1\n## Reglas\nLee .sdd.json (si el fichero o el campo no existen, usa es). PARA inmediatamente.');
    let res = checkPrecondicionSdd(tmp);
    assert.equal(res.ok, false);
    assert.ok(res.infractores.some((i) => /antipatrón|antipatron/i.test(i.motivo)));

    // Fixture sin mención a .sdd.json
    fs.writeFileSync(path.join(rolesDir, 'sdd-rol1.md'),
      '# Rol 1\n## Reglas\nNo menciona el fichero de configuracion. PARA inmediatamente.');
    res = checkPrecondicionSdd(tmp);
    assert.equal(res.ok, false);
    assert.ok(res.infractores.some((i) => /no menciona \.sdd\.json/i.test(i.motivo)));

    // Fixture sin orden de parada
    fs.writeFileSync(path.join(rolesDir, 'sdd-rol1.md'),
      '# Rol 1\n## Reglas\nMenciona .sdd.json pero no ordena parar.');
    res = checkPrecondicionSdd(tmp);
    assert.equal(res.ok, false);
    assert.ok(res.infractores.some((i) => /parada/i.test(i.motivo)));

    // Fixture válido
    fs.writeFileSync(path.join(rolesDir, 'sdd-rol1.md'),
      '# Rol 1\n## Reglas\nSi no existe .sdd.json en la raiz, PARA inmediatamente: no ejecutes el rol.');
    res = checkPrecondicionSdd(tmp);
    assert.equal(res.ok, true);
    assert.equal(res.infractores.length, 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('SPEC-024 CA-4: checkPrecondicionSdd sobre el árbol real pasa en verde y descubre 51 ficheros', () => {
  const res = checkPrecondicionSdd(REPO_ROOT);
  assert.equal(res.ok, true, `No debe haber infractores: ${JSON.stringify(res.infractores)}`);
  assert.equal(res.infractores.length, 0);
  assert.equal(res.ficheros.length, 51, 'debe descubrir 7 roles + 26 skills + 18 agentes = 51 ficheros');
});

test('SPEC-024 CA-4: CLI node tools/checks/prosa-gates.mjs sale con código 0', () => {
  const r = spawnSync(process.execPath, [path.join(REPO_ROOT, 'tools', 'checks', 'prosa-gates.mjs')], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, `stderr: ${r.stderr}`);
  assert.match(r.stdout, /\[prosa-gates\] OK/);
});

// SPEC-028 CA-1/CA-2 (ADR-018 §1, ADR-012): la prosa del orquestador sincroniza
// con el remoto antes de trabajar y ramifica desde origin/<rama por defecto>.
import { checkProsaOrquestador, DOC_ORQUESTADOR, REGLAS_ORQUESTADOR, normalizaProsa } from '../checks/prosa-gates.mjs';

const ORQ = fs.readFileSync(path.join(REPO_ROOT, DOC_ORQUESTADOR), 'utf8');
const ORQ_N = normalizaProsa(ORQ);

test('SPEC-028 CA-2: los cuatro marcadores de la regla están definidos', () => {
  assert.deepEqual(REGLAS_ORQUESTADOR.map((r) => r.id),
    ['fetch-antes-de-leer', 'rama-por-defecto-frente-a-origin', 'parada-ante-divergencia', 'rama-desde-origin']);
});

test('SPEC-028 CA-2.1: la prosa real del orquestador pasa el check', () => {
  const r = checkProsaOrquestador(ORQ);
  assert.equal(r.ok, true, JSON.stringify(r.faltan));
});

test('SPEC-028 CA-1: el rol fija las condiciones de la sincronización', () => {
  // 1. git fetch antes de leer estado, crear artefactos o despachar subagentes.
  assert.match(ORQ_N, /git fetch antes de leer estado \(specs, tablero, ids\), crear artefactos o despachar a un subagente/);
  // origin/<rama por defecto> es la que apunta origin/HEAD.
  assert.match(ORQ_N, /origin\/head/);
  // 2. fast-forward; si no se puede (divergencia o rama en otro worktree), PARA.
  assert.match(ORQ_N, /fast-forward/);
  assert.match(ORQ_N, /en uso en otro worktree/);
  // 3. fetch fallido: decirlo al humano y seguir solo con su OK explícito.
  assert.match(ORQ_N, /si git fetch falla[^.]*dile al humano[^.]*sigue solo con su ok explicito/);
  // 4. la rama, desde origin/<rama por defecto>, nunca desde el HEAD local.
  assert.match(ORQ_N, /git switch -c ft\/spec-nnn-slug origin\/<rama por defecto>/);
  assert.match(ORQ_N, /nunca desde el head local/);
  // 5. el encargo lleva rama y commit base, al implementador y al verificador.
  assert.match(ORQ_N, /commit base/);
  assert.match(ORQ_N, /sdd-implementador[^.]*rama y el commit base/);
  assert.match(ORQ_N, /sdd-verificador[^.]*rama y el commit base/);
  // 6. fuera de git o sin remoto, la regla no aplica.
  assert.match(ORQ_N, /fuera de git, o sin remoto, esta regla no aplica/);
});

test('SPEC-028 CA-1: el rol conserva la precondición .sdd.json y la prohibición de editar', () => {
  assert.match(ORQ, /no existe `\.sdd\.json` en la raíz del proyecto/);
  assert.match(ORQ, /PARA inmediatamente: no\s+ejecutes el rol/);
  assert.match(ORQ, /No edites specs, código ni documentos de verdad/);
  // La sincronización va después de la precondición: con .sdd.json ausente no se toca git.
  assert.ok(ORQ.indexOf('.sdd.json') < ORQ.indexOf('git fetch'));
});

for (const regla of REGLAS_ORQUESTADOR) {
  test(`SPEC-028 CA-2.2: sin el marcador '${regla.id}' el check falla y lo nombra`, () => {
    const sin = ORQ_N.replace(regla.re, '');
    assert.notEqual(sin, ORQ_N, 'el fixture debe quitar el marcador');
    const r = checkProsaOrquestador(sin);
    assert.equal(r.ok, false);
    assert.deepEqual(r.faltan.map((f) => f.id), [regla.id]);

    // El CLI sobre un árbol fixture (solo core/roles/es) sale con != 0 y lo nombra.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-prosa-orq-'));
    try {
      const roles = path.join(tmp, 'core', 'roles', 'es');
      fs.cpSync(path.join(REPO_ROOT, 'core', 'roles', 'es'), roles, { recursive: true });
      fs.writeFileSync(path.join(roles, 'sdd-orquestador.md'), sin);
      const cli = spawnSync(process.execPath, [path.join(REPO_ROOT, 'tools', 'checks', 'prosa-gates.mjs'), '--raiz', tmp], { encoding: 'utf8' });
      assert.notEqual(cli.status, 0, cli.stdout);
      assert.ok(cli.stderr.includes(regla.que), cli.stderr);
      assert.ok(cli.stderr.includes(regla.id), cli.stderr);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
}

test('SPEC-028 CA-2.2: el CLI con --raiz sobre una copia intacta sale con 0', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-prosa-orq-'));
  try {
    fs.cpSync(path.join(REPO_ROOT, 'core', 'roles', 'es'), path.join(tmp, 'core', 'roles', 'es'), { recursive: true });
    const cli = spawnSync(process.execPath, [path.join(REPO_ROOT, 'tools', 'checks', 'prosa-gates.mjs'), '--raiz', tmp], { encoding: 'utf8' });
    assert.equal(cli.status, 0, cli.stderr);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
