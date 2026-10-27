import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { traductor, interpola } from '../lib/mensajes.mjs';

// SPEC-025 CA-2 — catálogo de mensajes con fallback por clave (ADR-016 §2).
const CORE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function catalogos() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-cat-'));
  const pon = (idioma, obj) => {
    fs.mkdirSync(path.join(dir, idioma), { recursive: true });
    fs.writeFileSync(path.join(dir, idioma, 'mensajes.json'), JSON.stringify(obj));
  };
  pon('es', { k1: 'Hola {nombre}, tienes {n} avisos.', k2: 'Solo en es.' });
  pon('zz', { k1: '[zz] Hola {nombre}, tienes {n} avisos.' });
  return dir;
}

test('CA-2: k1 en zz devuelve el texto zz con sus {variables} interpoladas', () => {
  const t = traductor(catalogos(), 'zz');
  assert.equal(t('k1', { nombre: 'Ana', n: 3 }), '[zz] Hola Ana, tienes 3 avisos.');
});

test('CA-2: k2, que falta en zz, cae al texto es', () => {
  assert.equal(traductor(catalogos(), 'zz')('k2'), 'Solo en es.');
});

test('CA-2: una clave que no existe en es lanza un error que la nombra', () => {
  assert.throws(() => traductor(catalogos(), 'zz')('no-existe'), /no-existe/);
  assert.throws(() => traductor(catalogos(), 'es')('no-existe'), /no-existe/);
});

test('CA-2: un idioma sin catálogo cae entero a es', () => {
  assert.equal(traductor(catalogos(), 'eu')('k1', { nombre: 'Ana', n: 1 }), 'Hola Ana, tienes 1 avisos.');
});

test('CA-2: interpola solo {nombre}; ${…} y variables ausentes se dejan tal cual', () => {
  assert.equal(interpola('a {x} b {y}', { x: '1' }), 'a 1 b {y}');
  assert.equal(interpola('valor: {v}', { v: '{x}' }), 'valor: {x}', 'no reinterpola el valor insertado');
});

test('CA-2: ningún catálogo bajo core/ contiene la secuencia ${', () => {
  const dir = path.join(CORE, 'mensajes');
  const catalogosNucleo = fs.readdirSync(dir).map((i) => path.join(dir, i, 'mensajes.json'));
  assert.ok(catalogosNucleo.length > 0);
  for (const f of catalogosNucleo) {
    const txt = fs.readFileSync(f, 'utf8');
    assert.ok(!txt.includes('${'), `${f} contiene \${`);
    for (const v of Object.values(JSON.parse(txt))) assert.equal(typeof v, 'string');
  }
});
