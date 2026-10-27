import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, walk } from '../checks/_util.mjs';

// SPEC-025 CA-8 — plantillas por idioma en core/templates/<idioma>/ (ADR-016 §1).
const TPL = path.join(REPO_ROOT, 'core', 'templates');
const ESTE = fileURLToPath(import.meta.url);

// Lo que colgaba de core/templates/ en el código base, salvo sdd.json. Incluye
// AGENTS.md, la plantilla que añadió el adaptador antigravity.
const ANTES = [
  'AGENTS.md', 'CLAUDE.md', 'FOUNDATION.md', 'roadmap.md', 'rol-dominio.md',
  'artefactos/ADR.md', 'artefactos/SPEC.ledger.md', 'artefactos/SPEC.md', 'artefactos/TASK.md', 'artefactos/_epica.md',
  'fundacion/contexto.md', 'fundacion/dominio.md', 'fundacion/reglas.md', 'fundacion/vision.md',
];

const rel = (base, f) => path.relative(base, f).split(path.sep).join('/');

test('CA-8: core/templates/es/ contiene exactamente las plantillas de antes, salvo sdd.json', () => {
  const es = path.join(TPL, 'es');
  assert.deepEqual(walk(es).map((f) => rel(es, f)).sort(), [...ANTES].sort());
});

test('CA-8: core/templates/sdd.json sigue en su sitio y no hay plantillas sueltas fuera de un conjunto', () => {
  assert.ok(fs.existsSync(path.join(TPL, 'sdd.json')));
  const sueltos = fs.readdirSync(TPL, { withFileTypes: true }).filter((e) => !e.isDirectory()).map((e) => e.name);
  assert.deepEqual(sueltos, ['sdd.json']);
});

// Ruta antigua: core/templates/ seguido de una plantilla de las de antes, o del
// propio directorio como origen de copia; o el path.join de scaffold.
const RUTA_ANTIGUA = /templates\/(?:artefactos|fundacion|AGENTS\.md|CLAUDE\.md|FOUNDATION\.md|roadmap\.md|rol-dominio\.md)|templates\/[`'"\s)]|'templates',\s*(?:'artefactos'|'AGENTS\.md')/;

test('CA-8: ningún fichero bajo core/, adapters/ ni tools/ cita las rutas antiguas', () => {
  const infractores = [];
  for (const raiz of ['core', 'adapters', 'tools']) {
    for (const f of walk(path.join(REPO_ROOT, raiz), (n) => /\.(mjs|md|json|yaml|toml)$/.test(n))) {
      if (f === ESTE) continue;
      const lineas = fs.readFileSync(f, 'utf8').split('\n');
      lineas.forEach((l, i) => { if (RUTA_ANTIGUA.test(l)) infractores.push(`${rel(REPO_ROOT, f)}:${i + 1}: ${l.trim()}`); });
    }
  }
  assert.deepEqual(infractores, []);
});

test('CA-8: los sdd-init de Claude Code, opencode y antigravity copian desde core/templates/<idioma>/', () => {
  for (const [h, raiz] of [['claude-code', '${CLAUDE_PLUGIN_ROOT}/core'], ['opencode', '../core'], ['antigravity', '../core']]) {
    const s = fs.readFileSync(path.join(REPO_ROOT, 'adapters', h, 'commands', 'sdd-init.md'), 'utf8');
    assert.ok(s.includes(`Copia desde \`${raiz}/templates/<idioma>/\``), `${h}: copia desde templates/<idioma>/`);
    // antigravity no ofrece roles de dominio en su sdd-init (código base).
    if (h !== 'antigravity') assert.ok(s.includes(`\`${raiz}/templates/<idioma>/rol-dominio.md\``), `${h}: rol-dominio desde templates/<idioma>/`);
    assert.ok(s.includes(`\`${raiz}/templates/sdd.json\` → \`.sdd.json\``), `${h}: sdd.json desde templates/`);
  }
});
