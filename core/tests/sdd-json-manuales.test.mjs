import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { leerSddJson, ESQUEMA_SDD_JSON } from '../lib/sdd-json.mjs';

// SPEC-032 CA-8 (ADR-020 §9, ADR-019): .sdd.json admite `recetaManuales` y
// `registroManuales`, strings no vacíos.
const CORE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VALIDA = path.join(CORE, 'scripts', 'valida.mjs');

function proyecto(sdd) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-spec032-json-')));
  fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify(sdd));
  fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
  return dir;
}
const corre = (dir) => spawnSync(process.execPath, [VALIDA, '--dir', 'docs'], { cwd: dir, encoding: 'utf8' });

test('CA-8 (a): las dos claves con rutas son válidas y valida da OK (sin comprobar que existan en disco)', () => {
  const dir = proyecto({ recetaManuales: 'docs/manuales/receta.md', registroManuales: 'docs/manuales/registro.md' });
  const l = leerSddJson(dir);
  assert.equal(l.estado, 'valida', l.motivo);
  assert.equal(l.config.recetaManuales, 'docs/manuales/receta.md');
  const r = corre(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(!fs.existsSync(path.join(dir, 'docs', 'manuales')));
});

for (const clave of ['recetaManuales', 'registroManuales']) {
  for (const valor of ['', 3, null, [], true]) {
    test(`CA-8 (b): ${clave} = ${JSON.stringify(valor)} es ilegible y el error nombra la clave y «un string no vacío»`, () => {
      const dir = proyecto({ [clave]: valor });
      const l = leerSddJson(dir);
      assert.equal(l.estado, 'ilegible');
      assert.match(l.motivo, new RegExp(`\`${clave}\`: se esperaba un string no vacío`));
      const r = corre(dir);
      assert.notEqual(r.status, 0);
      assert.ok(r.stderr.includes(`\`${clave}\``) && r.stderr.includes('un string no vacío'), r.stderr);
    });
  }
}

test('CA-8.3: las dos claves están en ESQUEMA_SDD_JSON', () => {
  assert.ok(Object.hasOwn(ESQUEMA_SDD_JSON, 'recetaManuales'));
  assert.ok(Object.hasOwn(ESQUEMA_SDD_JSON, 'registroManuales'));
});
