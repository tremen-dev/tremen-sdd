import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { leerSddJson } from '../lib/sdd-json.mjs';
import { mensajeSddJsonIlegible } from '../lib/sdd-json-mensaje.mjs';

// SPEC-027 CA-4 — un solo mensaje accionable para un .sdd.json ilegible, definido
// una vez en el catálogo del núcleo (ADR-017 §3). Las capas (hooks, plugin,
// pre-commit y valida.mjs) lo comprueban contra esta MISMA función.
const CORE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function ilegible(contenido) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-json-msg-'));
  fs.writeFileSync(path.join(dir, '.sdd.json'), contenido);
  return leerSddJson(dir);
}

test('CA-4: el texto nombra la ruta absoluta, el motivo, que los gates no se pueden evaluar, cómo arreglarlo y la válvula', () => {
  const lectura = ilegible('{ roto');
  const txt = mensajeSddJsonIlegible(lectura);
  assert.ok(path.isAbsolute(lectura.ruta));
  assert.ok(txt.includes(lectura.ruta), '1. ruta absoluta');
  assert.ok(txt.includes(lectura.motivo), '2. motivo del parser');
  assert.match(txt, /los gates no se pueden evaluar mientras el fichero sea ilegible/i, '3.');
  assert.ok(txt.includes('core/templates/sdd.json'), '4. plantilla de referencia');
  assert.match(txt, /'\/sdd-init' en modo migración/, '4. /sdd-init en modo migración');
  assert.ok(txt.includes('SDD_SKIP_GATE=1'), '5. válvula');
});

test('CA-4: con un valor que no es objeto, el motivo es "no es un objeto JSON"', () => {
  assert.ok(mensajeSddJsonIlegible(ilegible('[]')).includes('no es un objeto JSON'));
});

test('CA-4: el texto es una clave del catálogo del núcleo (sdd-json.ilegible)', () => {
  const cat = JSON.parse(fs.readFileSync(path.join(CORE, 'mensajes', 'es', 'mensajes.json'), 'utf8'));
  assert.equal(typeof cat['sdd-json.ilegible'], 'string');
  assert.ok(cat['sdd-json.ilegible'].includes('{ruta}') && cat['sdd-json.ilegible'].includes('{motivo}'));
});

test('CA-7: el catálogo ya no dice que los hooks traten el fichero como ausente', () => {
  const txt = fs.readFileSync(path.join(CORE, 'mensajes', 'es', 'mensajes.json'), 'utf8');
  assert.doesNotMatch(txt, /tratan como ausente|gates están apagados/);
});
