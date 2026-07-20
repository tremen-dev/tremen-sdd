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
