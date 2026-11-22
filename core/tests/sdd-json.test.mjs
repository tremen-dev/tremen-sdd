import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { leerSddJson, esSddJsonDe } from '../lib/sdd-json.mjs';

// SPEC-027 CA-1 — lector único de .sdd.json con tres estados (ADR-017 §1).
const LIB = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'lib', 'sdd-json.mjs');

function raiz(contenido) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-json-'));
  if (contenido !== undefined) fs.writeFileSync(path.join(dir, '.sdd.json'), contenido);
  return dir;
}

const CFG_C = { idioma: 'es', rutasVigiladas: ['src/'] };

test('CA-1(a): sin .sdd.json -> ausente', () => {
  const dir = raiz();
  const r = leerSddJson(dir);
  assert.equal(r.estado, 'ausente');
  assert.equal(r.ruta, path.join(dir, '.sdd.json'));
});

test('CA-1(b): {} -> valida', () => {
  const r = leerSddJson(raiz('{}'));
  assert.equal(r.estado, 'valida');
  assert.deepEqual(r.config, {});
});

test('CA-1(c): configuración válida -> valida, con esa configuración', () => {
  const r = leerSddJson(raiz(JSON.stringify(CFG_C)));
  assert.equal(r.estado, 'valida');
  assert.deepEqual(r.config, CFG_C);
});

test('CA-1(d): el JSON de (c) con BOM UTF-8 -> valida, con la misma configuración', () => {
  const r = leerSddJson(raiz('﻿' + JSON.stringify(CFG_C)));
  assert.equal(r.estado, 'valida');
  assert.deepEqual(r.config, CFG_C);
});

test('CA-1(e): { roto -> ilegible, con el mensaje del parser en el motivo', () => {
  let parser;
  try { JSON.parse('{ roto'); } catch (e) { parser = e.message; }
  const dir = raiz('{ roto');
  const r = leerSddJson(dir);
  assert.equal(r.estado, 'ilegible');
  assert.equal(r.ruta, path.join(dir, '.sdd.json'));
  assert.ok(r.motivo.includes(parser), r.motivo);
});

test('CA-1(f): fichero vacío -> ilegible', () => {
  const r = leerSddJson(raiz(''));
  assert.equal(r.estado, 'ilegible');
  assert.ok(r.motivo);
});

for (const v of ['null', '[]', '42', '"x"']) {
  test(`CA-1(g): ${v} -> ilegible, "no es un objeto JSON"`, () => {
    const r = leerSddJson(raiz(v));
    assert.equal(r.estado, 'ilegible');
    assert.equal(r.motivo, 'no es un objeto JSON');
  });
}

test('CA-1(h): .sdd.json es un directorio -> ilegible', () => {
  const dir = raiz();
  fs.mkdirSync(path.join(dir, '.sdd.json'));
  const r = leerSddJson(dir);
  assert.equal(r.estado, 'ilegible');
  assert.ok(r.motivo);
});

test('CA-1: el módulo solo importa node:*', () => {
  const src = fs.readFileSync(LIB, 'utf8');
  const imports = [...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1] ?? m[2]);
  assert.ok(imports.length > 0);
  for (const i of imports) assert.match(i, /^node:/, i);
});

test('ADR-017 §2: esSddJsonDe reconoce el propio .sdd.json de la raíz, en ruta relativa y absoluta', () => {
  const dir = raiz('{ roto');
  assert.equal(esSddJsonDe(dir, '.sdd.json'), true);
  assert.equal(esSddJsonDe(dir, path.join(dir, '.sdd.json')), true);
  assert.equal(esSddJsonDe(dir, path.join(dir, 'src', '.sdd.json')), false);
  assert.equal(esSddJsonDe(dir, 'README.md'), false);
});
