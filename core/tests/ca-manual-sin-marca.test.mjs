import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { transition } from '../scripts/estado.mjs';
import { parseFrontmatter } from '../lib/frontmatter.mjs';
import { leerCAs, esSpecDelModelo } from '../lib/ca-manual.mjs';
import { proyecto, valida, ledger, VALIDA } from './_ca-manual-fixtures.mjs';

// SPEC-030 CA-5 (ADR-020 §11, EPIC-008 CE-7): sin la marca [manual], nada cambia.
const SIN_MARCA = [
  '# SPEC-001', '',
  '### CA-1 — Recorrido en dispositivo (CA manual, propietario)',
  '- **Given**: un CA manual (propietario) que ejecuta el humano', '',
  '### CA-M1 — Revisión de idioma',
  '- **Given**: …', '',
].join('\n');
const LEDGER = ledger({ 'CA-1': '⚠️', 'CA-M1': '🚧' });

test('CA-5 (a): valida no da ningún error nuevo a una spec sin [manual] que dice «manual» y usa CA-M1', () => {
  const p = proyecto(SIN_MARCA, { estado: 'en-revision', ledger: LEDGER });
  assert.equal(esSpecDelModelo(leerCAs(SIN_MARCA)), false);
  const { code, out } = valida(p);
  assert.equal(code, 0, out);
});

test('CA-5 (a): esa spec pasa a hecho, como hoy: la guarda de CA-4 no se aplica', () => {
  const p = proyecto(SIN_MARCA, { estado: 'en-revision', ledger: LEDGER });
  transition(p.spec, 'hecho', 'sdd-verificador', '2026-11-26');
  assert.equal(parseFrontmatter(fs.readFileSync(p.spec, 'utf8')).data.estado, 'hecho');
});

test('CA-5 (b): una lista `rutasVigiladas` justo debajo de un CA no da error sin la marca', () => {
  const texto = SIN_MARCA.replace('### CA-1 — Recorrido en dispositivo (CA manual, propietario)\n',
    '### CA-1 — Recorrido en dispositivo (CA manual, propietario)\n- `rutasVigiladas`: core/scripts/\n');
  assert.equal(leerCAs(texto)[0].entradas[0].clave, 'rutasVigiladas', 'el lector la ve, pero no se valida');
  const { code, out } = valida(proyecto(texto, { estado: 'en-revision', ledger: LEDGER }));
  assert.equal(code, 0, out);
});

// (c) El árbol real, solo lectura.
const REPO = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const hashDocs = () => {
  const h = crypto.createHash('sha256');
  const stack = [path.join(REPO, 'docs')];
  const ficheros = [];
  while (stack.length) {
    const d = stack.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p); else if (e.name.endsWith('.md')) ficheros.push(p);
    }
  }
  for (const f of ficheros.sort()) h.update(f).update(fs.readFileSync(f));
  return h.digest('hex');
};

test('CA-5 (c): valida sobre el árbol real sale «OK» y no modifica ninguna spec ni ledger', () => {
  const antes = hashDocs();
  const r = spawnSync(process.execPath, [VALIDA], { cwd: REPO, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /\[valida\] OK/);
  assert.equal(hashDocs(), antes);
});

test('CA-5 (c)/CA-1: SPEC-030 no es una spec del modelo (su ejemplo va en un bloque de código)', () => {
  const dir = path.join(REPO, 'docs', 'epicas', 'EPIC-008-modelo-de-ca-manual');
  const f = fs.readdirSync(dir).find((n) => /^SPEC-030-.*(?<!\.ledger)\.md$/.test(n));
  const cas = leerCAs(parseFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8')).body);
  assert.deepEqual(cas.map((c) => c.id), ['CA-1', 'CA-2', 'CA-3', 'CA-4', 'CA-5', 'CA-6', 'CA-7']);
  assert.equal(esSpecDelModelo(cas), false);
});
