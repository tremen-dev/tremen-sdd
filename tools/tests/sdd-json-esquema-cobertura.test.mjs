import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { REPO_ROOT } from '../checks/_util.mjs';
import { ESQUEMA_SDD_JSON, leerSddJson } from '../../core/lib/sdd-json.mjs';

// SPEC-029 CA-5 — el esquema de ADR-019 §1 cubre todo lo que el método lee de
// .sdd.json. Si una spec futura lee un campo nuevo sin añadirlo al esquema
// (ADR-019, "Campo nuevo"), este test falla y nombra el campo y el fichero.

const lista = (dir, filtro) => {
  const abs = path.join(REPO_ROOT, dir);
  return fs.existsSync(abs) ? fs.readdirSync(abs).filter(filtro).map((n) => `${dir}/${n}`) : [];
};

// Ficheros que leen la configuración de .sdd.json.
function consumidores() {
  const ficheros = [];
  for (const a of fs.readdirSync(path.join(REPO_ROOT, 'adapters'))) {
    ficheros.push(...lista(`adapters/${a}/hooks`, (n) => n.endsWith('.mjs')));
    ficheros.push(...lista(`adapters/${a}/plugins`, (n) => n.endsWith('.mjs')));
  }
  ficheros.push(...lista('tools/githooks', (n) => n.endsWith('.mjs')));
  // El código de core/ que lee .sdd.json: el que importa el lector (sin el
  // propio lector, que es donde vive el esquema).
  for (const dir of ['core/lib', 'core/scripts']) {
    for (const f of lista(dir, (n) => n.endsWith('.mjs') && n !== 'sdd-json.mjs')) {
      const src = fs.readFileSync(path.join(REPO_ROOT, f), 'utf8');
      if (/from\s*['"][^'"]*\/sdd-json\.mjs['"]/.test(src)) ficheros.push(f);
    }
  }
  return ficheros;
}

// Accesos `cfg.<campo>` y `cfg.gates.<campo>`, con o sin `?.`. También cuentan
// las otras formas en que el método nombra el objeto leído: `config`
// (lectura.config) y `leido` (el objeto de un esquema inválido, en valida.mjs).
const RE_ACCESO = /\b(?:cfg|config|leido)\??\.([A-Za-z_$][\w$]*)(?:\??\.([A-Za-z_$][\w$]*))?/g;

// Se buscan en el código, no en literales ni comentarios ('eslint.config.js'
// no es un acceso a `config.js`).
const sinLiterales = (src) => src
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''")
  .replace(/\/\/[^\n]*/g, '');

function camposLeidos(src) {
  const campos = new Set();
  for (const m of sinLiterales(src).matchAll(RE_ACCESO)) {
    campos.add(m[1]);
    if (m[1] === 'gates' && m[2]) campos.add(`gates.${m[2]}`);
  }
  return campos;
}

const enEsquema = (campo) => {
  const [raiz, sub] = campo.split('.');
  const desc = ESQUEMA_SDD_JSON[raiz];
  return !!desc && (!sub || Object.hasOwn(desc.campos ?? {}, sub));
};

test('CA-5: el detector encuentra los accesos de hoy (no es un test vacío)', () => {
  const todos = new Set();
  for (const f of consumidores()) for (const c of camposLeidos(fs.readFileSync(path.join(REPO_ROOT, f), 'utf8'))) todos.add(c);
  for (const c of ['idioma', 'rutasVigiladas', 'linter', 'gates', 'gates.requireSpec', 'gates.protegeVerdad', 'gates.calidad']) {
    assert.ok(todos.has(c), `no se detecta ${c}`);
  }
  assert.ok(consumidores().includes('core/lib/idioma.mjs'));
  assert.ok(consumidores().includes('core/scripts/valida.mjs'));
  assert.deepEqual([...camposLeidos('a = cfg?.foo; b = lectura.config.gates?.bar;')].sort(), ['foo', 'gates', 'gates.bar']);
  assert.deepEqual([...camposLeidos("x = ['eslint.config.js']; // cfg.nada")], []);
  // Un campo leído que no esté en el esquema se reporta.
  assert.equal(enEsquema('prefijo'), false);
  assert.equal(enEsquema('gates.nuevo'), false);
  assert.equal(enEsquema('gates.calidad'), true);
});

for (const f of consumidores()) {
  test(`CA-5.1: cada campo de .sdd.json que lee ${f} está en el esquema`, () => {
    const fuera = [...camposLeidos(fs.readFileSync(path.join(REPO_ROOT, f), 'utf8'))].filter((c) => !enEsquema(c));
    assert.deepEqual(fuera, [], `${f} lee ${fuera.map((c) => `\`${c}\``).join(', ')}, que no está en ESQUEMA_SDD_JSON (core/lib/sdd-json.mjs)`);
  });
}

test('CA-5.2: la plantilla core/templates/sdd.json y el .sdd.json de este repo dan valida', () => {
  // La plantilla no se llama .sdd.json: se lee copiándola a su nombre en un
  // directorio temporal.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-plantilla-'));
  fs.copyFileSync(path.join(REPO_ROOT, 'core', 'templates', 'sdd.json'), path.join(tmp, '.sdd.json'));
  const plantilla = leerSddJson(tmp);
  assert.equal(plantilla.estado, 'valida', plantilla.motivo);
  const repo = leerSddJson(REPO_ROOT);
  assert.equal(repo.estado, 'valida', repo.motivo);
});
