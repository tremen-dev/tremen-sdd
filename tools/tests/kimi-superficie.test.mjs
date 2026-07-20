import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, walk } from '../checks/_util.mjs';

// CA-1: la superficie del adaptador Kimi es una LISTA CERRADA de piezas de
// adaptador —agents/, skills/, hooks/, tests/— y NINGÚN fichero del método
// (lib/scripts/templates/roles viven solo en core/). Tampoco hay commands/
// (Kimi no tiene slash-commands de usuario por fichero).
const KIMI = path.join(REPO_ROOT, 'adapters', 'kimi-code');
const existe = (p) => fs.existsSync(path.join(KIMI, p));

test('CA-1: existen las piezas de adaptador esperadas', () => {
  for (const d of ['agents', 'skills', 'hooks', 'tests']) {
    assert.ok(existe(d), `debe existir adapters/kimi-code/${d}/`);
  }
});

test('CA-1: NO hay directorios del método bajo el adaptador', () => {
  for (const d of ['lib', 'scripts', 'templates', 'roles', 'core']) {
    assert.ok(!existe(d), `adapters/kimi-code/${d}/ no debe existir (el método vive en core/)`);
  }
});

test('CA-1: NO hay commands/ (Kimi no tiene slash-commands por fichero)', () => {
  assert.ok(!existe('commands'), 'adapters/kimi-code/commands/ no debe existir');
});

test('CA-1: los directorios de primer nivel están en la lista cerrada', () => {
  const permitidos = new Set(['agents', 'skills', 'hooks', 'tests']);
  for (const e of fs.readdirSync(KIMI, { withFileTypes: true })) {
    if (e.isDirectory()) assert.ok(permitidos.has(e.name), `directorio inesperado en la superficie: ${e.name}`);
  }
});

test('CA-1: ningún fichero de la superficie es una copia de prosa de rol del núcleo', () => {
  // Los bootstrap de agents/ REFERENCIAN el rol; no lo copian (cuerpo con ## Misión).
  for (const f of walk(KIMI, (n) => n.endsWith('.md'))) {
    if (f.includes(`${path.sep}tests${path.sep}`)) continue;
    const s = fs.readFileSync(f, 'utf8');
    assert.ok(!/^##\s+Misión/m.test(s), `${path.relative(KIMI, f)} embebe cuerpo de rol del núcleo`);
  }
});
