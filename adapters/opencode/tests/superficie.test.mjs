import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../../../core/lib/frontmatter.mjs';

// Verificación estática del adaptador opencode CONSTRUIDO (dist/opencode/), sin
// cuenta ni CLI de opencode — como el smoke test de Kimi (SPEC-003). El núcleo
// viaja en el MISMO artefacto bajo core/, y cada agente/comando resuelve su
// fuente única por ruta INTERNA. La confirmación en runtime ([H1]/[H4]) es el
// ejercicio del pipeline contra el CLI real (F-SPEC-010-1), spec posterior.
const DIST = path.resolve('dist/opencode');
const IDIOMA = 'es';
const SUBAGENTES = ['sdd-producto', 'sdd-arquitecto', 'sdd-implementador', 'sdd-verificador', 'sdd-documentalista', 'sdd-como-vamos'];
const AGENTES = ['sdd-orquestador', ...SUBAGENTES];
const COMANDOS = ['sdd-init', 'sdd-tablero'];

// ¿resuelto queda dentro del artefacto? (no escapa por '../').
function interno(p) {
  const rel = path.relative(DIST, p);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

// CA-1: existen los SIETE agentes de rol y su frontmatter declara el `mode` que
// fija ADR-007 (orquestador primary; los seis sdd-* subagent).
test('CA-1: hay un .md por rol para los SIETE roles del pipeline', () => {
  const presentes = fs.readdirSync(path.join(DIST, 'agents')).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')).sort();
  assert.deepEqual(presentes, [...AGENTES].sort());
});

test('CA-1: el orquestador es mode primary y los seis sdd-* son mode subagent', () => {
  const modo = (rol) => parseFrontmatter(fs.readFileSync(path.join(DIST, 'agents', `${rol}.md`), 'utf8')).data.mode;
  assert.equal(modo('sdd-orquestador'), 'primary', 'sdd-orquestador debe ser mode: primary');
  for (const rol of SUBAGENTES) assert.equal(modo(rol), 'subagent', `${rol} debe ser mode: subagent`);
});

// CA-2 / CA-5 / CA-8: cada agente es un BOOTSTRAP que referencia la prosa del
// núcleo por ruta interna existente, y NO embebe el cuerpo del rol.
for (const rol of AGENTES) {
  test(`CA-8: el agente ${rol} referencia su rol de núcleo por ruta interna existente (fuente única)`, () => {
    const boot = path.join(DIST, 'agents', `${rol}.md`);
    const texto = fs.readFileSync(boot, 'utf8');
    assert.ok(!/^##\s+(Misión|Flujo|Reglas duras)/m.test(texto), 'el bootstrap NO embebe el cuerpo del rol (RN-06)');
    const m = texto.match(/((?:\.\.\/)+core\/roles\/[^\s`"']+)/);
    assert.ok(m, 'el bootstrap referencia el rol de núcleo por ruta relativa');
    const rolPath = path.resolve(path.dirname(boot), m[1].replaceAll('<idioma>', IDIOMA));
    assert.ok(interno(rolPath), 'la ruta al núcleo resuelve INTERNA al artefacto (no escapa)');
    assert.ok(fs.existsSync(rolPath), `el fichero de rol del núcleo existe: ${rolPath}`);
    assert.match(fs.readFileSync(rolPath, 'utf8'), /##\s+Misión/, 'el rol resuelto contiene el cuerpo del system prompt');
  });
}

// CA-3 / CA-8: los comandos por fichero existen (nombre de fichero = nombre del
// comando) y su cuerpo invoca un script del núcleo por ruta interna existente.
for (const cmd of COMANDOS) {
  test(`CA-3: el comando /${cmd} existe y referencia un script del núcleo por ruta interna`, () => {
    const f = path.join(DIST, 'commands', `${cmd}.md`);
    assert.ok(fs.existsSync(f), `debe existir commands/${cmd}.md`);
    const texto = fs.readFileSync(f, 'utf8');
    const m = texto.match(/((?:\.\.\/)+core\/scripts\/[a-z-]+\.mjs)/);
    assert.ok(m, 'el comando referencia un script de core/scripts/ por ruta relativa');
    const scriptPath = path.resolve(path.dirname(f), m[1]);
    assert.ok(interno(scriptPath), 'el script resuelve INTERNO al artefacto');
    assert.ok(fs.existsSync(scriptPath), `el script del núcleo existe: ${m[1]}`);
    assert.ok(!/\$\{CLAUDE_PLUGIN_ROOT\}/.test(texto), 'no usa ${CLAUDE_PLUGIN_ROOT} (token de otro harness)');
  });
}

// CA-5: ninguna pieza de la superficie construida usa un token de plugin-root.
test('CA-5: ninguna pieza del artefacto usa ${CLAUDE_PLUGIN_ROOT} u otro plugin-root', () => {
  for (const dir of ['agents', 'commands', 'skills']) {
    const base = path.join(DIST, dir);
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
