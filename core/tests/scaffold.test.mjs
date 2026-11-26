import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { nextId, createArtifact, slugify } from '../scripts/scaffold.mjs';
import { parseFrontmatter } from '../lib/frontmatter.mjs';

function tmpDocs() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  fs.mkdirSync(path.join(dir, 'epicas'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'adr'), { recursive: true });
  return dir;
}

test('slugify quita acentos y pasa a kebab-case', () => {
  assert.equal(slugify('Alta de facturación rápida'), 'alta-de-facturacion-rapida');
});

test('nextId devuelve 001 en docs vacío y max+1 con existentes', () => {
  const docs = tmpDocs();
  assert.equal(nextId(docs, 'EPIC'), 'EPIC-001');
  fs.mkdirSync(path.join(docs, 'epicas', 'EPIC-007-x'), { recursive: true });
  assert.equal(nextId(docs, 'EPIC'), 'EPIC-008');
});

test('nextId ignora las épicas especiales EPIC-FIX etc.', () => {
  const docs = tmpDocs();
  fs.mkdirSync(path.join(docs, 'epicas', 'EPIC-FIX'), { recursive: true });
  assert.equal(nextId(docs, 'EPIC'), 'EPIC-001');
});

test('createArtifact epica crea carpeta y _epica.md con frontmatter', () => {
  const docs = tmpDocs();
  const ruta = createArtifact({ tipo: 'epica', titulo: 'Facturación', docsDir: docs, fecha: '2026-07-09' });
  assert.ok(ruta.endsWith(path.join('EPIC-001-facturacion', '_epica.md')));
  const { data } = parseFrontmatter(fs.readFileSync(ruta, 'utf8'));
  assert.equal(data.id, 'EPIC-001');
  assert.equal(data.estado, 'borrador');
  assert.equal(data.historial[0].por, 'sdd-producto');
});

test('createArtifact spec crea spec + ledger dentro de su épica', () => {
  const docs = tmpDocs();
  createArtifact({ tipo: 'epica', titulo: 'Facturación', docsDir: docs, fecha: '2026-07-09' });
  const ruta = createArtifact({ tipo: 'spec', titulo: 'Alta factura', epica: 'EPIC-001', docsDir: docs, fecha: '2026-07-09' });
  assert.ok(ruta.endsWith('SPEC-001-alta-factura.md'));
  assert.ok(fs.existsSync(ruta.replace(/\.md$/, '.ledger.md')));
  const { data } = parseFrontmatter(fs.readFileSync(ruta, 'utf8'));
  assert.equal(data.epica, 'EPIC-001');
});

test('createArtifact spec sin épica existente lanza error', () => {
  const docs = tmpDocs();
  assert.throws(() => createArtifact({ tipo: 'spec', titulo: 'x', epica: 'EPIC-099', docsDir: docs, fecha: '2026-07-09' }), /EPIC-099/);
});

test('createArtifact adr crea en docs/adr', () => {
  const docs = tmpDocs();
  const ruta = createArtifact({ tipo: 'adr', titulo: 'Usar Turso', docsDir: docs, fecha: '2026-07-09' });
  assert.ok(ruta.endsWith('ADR-001-usar-turso.md'));
});

test('createArtifact epica con --id EPIC-FIX crea la carpeta bucket sin slug', () => {
  const docs = tmpDocs();
  const ruta = createArtifact({ tipo: 'epica', titulo: 'Fixes varios', docsDir: docs, fecha: '2026-07-09', id: 'EPIC-FIX' });
  assert.ok(ruta.endsWith(path.join('EPIC-FIX', '_epica.md')));
  const { data } = parseFrontmatter(fs.readFileSync(ruta, 'utf8'));
  assert.equal(data.id, 'EPIC-FIX');
});

test('createArtifact epica con --id inválido lanza error', () => {
  const docs = tmpDocs();
  assert.throws(() => createArtifact({ tipo: 'epica', titulo: 'x', docsDir: docs, fecha: '2026-07-09', id: 'EPIC-999' }), /EPIC-999/);
});

// SPEC-028 CA-6.2 (ADR-018 §2 y §4): la decisión frente a los refs es una función
// pura, sin git. Recibe los ids locales y, por ref, los ids con su ruta en ese ref.
import { decideId } from '../scripts/scaffold.mjs';

test('SPEC-028 CA-6.2: sin refs (o sin ids en ellos) sigue con max local + 1', () => {
  assert.deepEqual(decideId({ prefijo: 'SPEC', locales: ['SPEC-001'], porRef: {}, defecto: null }),
    { accion: 'seguir', id: 'SPEC-002' });
  assert.deepEqual(decideId({ prefijo: 'SPEC', locales: [], porRef: { 'origin/main': {} }, defecto: 'origin/main' }),
    { accion: 'seguir', id: 'SPEC-001' });
});

test('SPEC-028 CA-6.2 (CA-3): el candidato existe en la rama por defecto -> se niega con id, ref y ruta', () => {
  const porRef = { 'origin/main': { 'SPEC-001': 'docs/a/SPEC-001-a.md', 'SPEC-002': 'docs/a/SPEC-002-b.md', 'SPEC-003': 'docs/a/SPEC-003-c.md' } };
  assert.deepEqual(decideId({ prefijo: 'SPEC', locales: ['SPEC-001'], porRef, defecto: 'origin/main' }),
    { accion: 'negar', id: 'SPEC-002', ref: 'origin/main', ruta: 'docs/a/SPEC-002-b.md' });
});

test('SPEC-028 CA-6.2 (CA-4): ids reservados solo en otras ramas se saltan, nombrando los refs', () => {
  const porRef = {
    'origin/main': { 'SPEC-001': 'docs/a/SPEC-001-a.md' },
    'origin/ft/SPEC-002-x': { 'SPEC-002': 'docs/a/SPEC-002-x.md', 'SPEC-003': 'docs/a/SPEC-003-y.md' },
    otra: { 'SPEC-004': 'docs/a/SPEC-004-z.md' },
  };
  assert.deepEqual(decideId({ prefijo: 'SPEC', locales: ['SPEC-001'], porRef, defecto: 'origin/main' }), {
    accion: 'saltar', id: 'SPEC-005', saltados: [
      { id: 'SPEC-002', refs: ['origin/ft/SPEC-002-x'] },
      { id: 'SPEC-003', refs: ['origin/ft/SPEC-002-x'] },
      { id: 'SPEC-004', refs: ['otra'] },
    ],
  });
});

test('SPEC-028 CA-6.2 (CA-4): un id reservado en varias ramas las nombra todas; el hueco libre se usa', () => {
  const porRef = { a: { 'ADR-002': 'x' }, b: { 'ADR-002': 'y', 'ADR-004': 'z' } };
  assert.deepEqual(decideId({ prefijo: 'ADR', locales: ['ADR-001'], porRef, defecto: null }),
    { accion: 'saltar', id: 'ADR-003', saltados: [{ id: 'ADR-002', refs: ['a', 'b'] }] });
});

test('SPEC-028 CA-6.2: sin rama por defecto (null) no se evalúa la negativa (CA-5 d)', () => {
  const porRef = { 'origin/ft/SPEC-002-x': { 'SPEC-002': 'r' } };
  assert.deepEqual(decideId({ prefijo: 'SPEC', locales: ['SPEC-001'], porRef, defecto: null }),
    { accion: 'saltar', id: 'SPEC-003', saltados: [{ id: 'SPEC-002', refs: ['origin/ft/SPEC-002-x'] }] });
});

test('SPEC-028 CA-6.2: si tras saltar el siguiente candidato está en la rama por defecto, se niega', () => {
  const porRef = { 'origin/main': { 'SPEC-003': 'r3' }, otra: { 'SPEC-002': 'r2' } };
  assert.deepEqual(decideId({ prefijo: 'SPEC', locales: ['SPEC-001'], porRef, defecto: 'origin/main' }),
    { accion: 'negar', id: 'SPEC-003', ref: 'origin/main', ruta: 'r3' });
});
