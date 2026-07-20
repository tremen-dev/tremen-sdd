import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseSpecId, buscarSpec, evaluarRequireSpec } from '../lib/require-spec.mjs';

// Monta un cwd temporal con docs/epicas/EPIC-001-x/SPEC-NNN-slug.md en el estado dado.
function proyecto({ id = 'SPEC-001', estado } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-rs-'));
  if (estado) {
    const ep = path.join(dir, 'docs', 'epicas', 'EPIC-001-x');
    fs.mkdirSync(ep, { recursive: true });
    fs.writeFileSync(path.join(ep, `${id}-alta.md`),
      `---\nid: ${id}\ntipo: spec\nepica: EPIC-001\nestado: ${estado}\nhistorial:\n  - {estado: ${estado}, fecha: 2026-07-01, por: x}\n---\n`);
  }
  return dir;
}

test('parseSpecId extrae el id de una rama ft/SPEC-NNN-slug', () => {
  assert.equal(parseSpecId('ft/SPEC-002-enforcement'), 'SPEC-002');
  assert.equal(parseSpecId('ft/SPEC-001-x'), 'SPEC-001');
});

test('parseSpecId devuelve null en ramas que no son de spec', () => {
  assert.equal(parseSpecId('main'), null);
  assert.equal(parseSpecId('ft/algo'), null);
  assert.equal(parseSpecId('feature/SPEC-001'), null);
  assert.equal(parseSpecId('ft/SPEC-1-corta'), null); // exige tres dígitos
});

test('buscarSpec localiza la spec bajo docs/epicas por id, ignorando el ledger', () => {
  const dir = proyecto({ estado: 'aprobada' });
  const p = buscarSpec(dir, 'SPEC-001');
  assert.ok(p && p.endsWith('SPEC-001-alta.md'));
  assert.equal(buscarSpec(dir, 'SPEC-999'), null);
});

test('evaluarRequireSpec deniega una rama que no es de spec (cita sdd-arquitecto)', () => {
  const dir = proyecto({ estado: 'aprobada' });
  const r = evaluarRequireSpec({ rama: 'main', cwd: dir });
  assert.equal(r.permitido, false);
  assert.match(r.motivo, /sdd-arquitecto/);
});

test('evaluarRequireSpec deniega si la spec no existe', () => {
  const dir = proyecto({ id: 'SPEC-001', estado: 'aprobada' });
  const r = evaluarRequireSpec({ rama: 'ft/SPEC-999-x', cwd: dir });
  assert.equal(r.permitido, false);
  assert.match(r.motivo, /SPEC-999/);
});

test('evaluarRequireSpec permite con spec aprobada', () => {
  const dir = proyecto({ estado: 'aprobada' });
  const r = evaluarRequireSpec({ rama: 'ft/SPEC-001-alta', cwd: dir });
  assert.equal(r.permitido, true);
});

test('evaluarRequireSpec permite con spec en-progreso', () => {
  const dir = proyecto({ estado: 'en-progreso' });
  const r = evaluarRequireSpec({ rama: 'ft/SPEC-001-alta', cwd: dir });
  assert.equal(r.permitido, true);
});

test('evaluarRequireSpec deniega con spec en borrador (cita el estado)', () => {
  const dir = proyecto({ estado: 'borrador' });
  const r = evaluarRequireSpec({ rama: 'ft/SPEC-001-alta', cwd: dir });
  assert.equal(r.permitido, false);
  assert.match(r.motivo, /borrador/);
});
