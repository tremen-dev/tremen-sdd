import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { leerSddJson, LINTERS } from '../lib/sdd-json.mjs';

// SPEC-029 CA-1 y CA-2 — el lector único aplica el esquema mínimo de ADR-019 §1:
// un objeto con un campo mal tipado es 'ilegible' (ADR-019 §2), y el motivo
// enumera todos los campos que fallan.
const CORE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function raiz(contenido) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-json-esquema-'));
  fs.writeFileSync(path.join(dir, '.sdd.json'), typeof contenido === 'string' ? contenido : JSON.stringify(contenido));
  return dir;
}
const lee = (contenido) => leerSddJson(raiz(contenido));

// --- CA-1: casos válidos ---

test('CA-1(a): la plantilla core/templates/sdd.json -> valida', () => {
  const r = lee(fs.readFileSync(path.join(CORE, 'templates', 'sdd.json'), 'utf8'));
  assert.equal(r.estado, 'valida', r.motivo);
});

test('CA-1(b): {} -> valida, sin campos (todos toman su valor por defecto)', () => {
  const r = lee({});
  assert.equal(r.estado, 'valida');
  assert.deepEqual(r.config, {});
});

test('CA-1(c): {"rutasVigiladas":[]} -> valida', () => {
  assert.equal(lee({ rutasVigiladas: [] }).estado, 'valida');
});

test('CA-1(d): {"idioma":"zz"} -> valida (el soporte es de ADR-016, no del esquema)', () => {
  assert.equal(lee({ idioma: 'zz' }).estado, 'valida');
});

test('CA-1(e): claves desconocidas en la raíz y en gates -> valida', () => {
  const cfg = { otraClave: 1, gates: { futuro: true } };
  const r = lee(cfg);
  assert.equal(r.estado, 'valida', r.motivo);
  assert.deepEqual(r.config, cfg);
});

for (const linter of ['auto', 'none', 'ruff', 'eslint', 'dart']) {
  test(`CA-1: {"linter":"${linter}"} -> valida`, () => {
    assert.equal(lee({ linter }).estado, 'valida');
  });
}

test('CA-1: la lista de linters del esquema son exactamente los cinco valores de calidad', () => {
  assert.deepEqual([...LINTERS], ['auto', 'none', 'ruff', 'eslint', 'dart']);
});

// --- CA-1: casos ilegibles, cada variante por separado ---

const ILEGIBLES = [
  ['f', { rutasVigiladas: 'src/' }, 'rutasVigiladas'],
  ['g', { rutasVigiladas: ['src/', 3] }, 'rutasVigiladas'],
  ['g', { rutasVigiladas: [''] }, 'rutasVigiladas'],
  ['h', { linter: 'biome' }, 'linter'],
  ['h', { linter: 1 }, 'linter'],
  ['i', { gates: 'off' }, 'gates'],
  ['i', { gates: [] }, 'gates'],
  ['i', { gates: { requireSpec: 'false' } }, 'gates.requireSpec'],
  ['j', { idioma: 42 }, 'idioma'],
  ['k', { idioma: null }, 'idioma'],
  ['k', { rutasVigiladas: null }, 'rutasVigiladas'],
  ['k', { linter: null }, 'linter'],
  ['k', { gates: null }, 'gates'],
];

for (const [caso, cfg, campo] of ILEGIBLES) {
  test(`CA-1(${caso}): ${JSON.stringify(cfg)} -> ilegible, el motivo nombra \`${campo}\``, () => {
    const dir = raiz(cfg);
    const r = leerSddJson(dir);
    assert.equal(r.estado, 'ilegible');
    assert.equal(r.ruta, path.join(dir, '.sdd.json'));
    assert.equal(r.config, undefined, 'un esquema inválido no entrega configuración aplicable');
    assert.ok(r.motivo.includes(`\`${campo}\``), r.motivo);
  });
}

test('CA-1(k): un interruptor de gates a null también es ilegible', () => {
  for (const g of ['requireSpec', 'protegeVerdad', 'calidad']) {
    const r = lee({ gates: { [g]: null } });
    assert.equal(r.estado, 'ilegible', g);
    assert.ok(r.motivo.includes(`\`gates.${g}\``), r.motivo);
  }
});

// --- CA-2: el motivo enumera todos los campos que fallan ---

test('CA-2: tres campos mal tipados -> ilegible y el motivo nombra los tres con lo esperado y lo encontrado', () => {
  const r = lee({ rutasVigiladas: 'src/', linter: 'biome', gates: { calidad: 'no' } });
  assert.equal(r.estado, 'ilegible');
  const partes = r.motivo.split('; ');
  const de = (campo) => partes.find((p) => p.includes(`\`${campo}\``));
  const rv = de('rutasVigiladas');
  assert.ok(rv, r.motivo);
  assert.match(rv, /se esperaba un array de strings no vacíos, se encontró "src\/"/);
  const li = de('linter');
  assert.ok(li, r.motivo);
  assert.match(li, /se esperaba uno de auto, none, ruff, eslint, dart, se encontró "biome"/);
  const gc = de('gates.calidad');
  assert.ok(gc, r.motivo);
  assert.match(gc, /se esperaba un booleano, se encontró "no"/);
  assert.deepEqual(r.errores.map((e) => e.campo), ['rutasVigiladas', 'linter', 'gates.calidad']);
});

test('CA-2: lo encontrado se muestra como JSON (null, números, arrays)', () => {
  assert.match(lee({ linter: null }).motivo, /se encontró null/);
  assert.match(lee({ idioma: 42 }).motivo, /`idioma`: se esperaba un string, se encontró 42/);
  assert.match(lee({ rutasVigiladas: ['src/', 3] }).motivo, /se encontró \["src\/",3\]/);
});
