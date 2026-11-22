import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../checks/_util.mjs';

// SPEC-029 CA-7 — en modo migración, sdd-init comprueba el esquema de un
// .sdd.json existente con el CLI de valida.mjs ANTES de copiar plantillas o mover
// ficheros, para ante errores y no sobrescribe el .sdd.json (ADR-019 §5). sdd-init
// lo ejecuta un modelo: se verifica que la instrucción está escrita, no que el
// modelo la siga. Kimi Code no tiene sdd-init.
const INITS = ['claude-code', 'opencode', 'antigravity'];
const rel = (h) => `adapters/${h}/commands/sdd-init.md`;
const lee = (h) => fs.readFileSync(path.join(REPO_ROOT, rel(h)), 'utf8');
const paso2 = (h) => {
  const s = lee(h);
  const i = s.indexOf('## Paso 2');
  assert.ok(i >= 0, `${rel(h)}: falta el Paso 2`);
  const j = s.indexOf('\n## ', i + 1);
  return s.slice(i, j === -1 ? undefined : j);
};
// Las comprobaciones previas son el punto 0 del Paso 2; desde el punto 1 se
// inventaría, se planifica y se migra (copiar plantillas, mover ficheros).
const primeraCopia = (p2) => {
  const i = p2.indexOf('\n1. ');
  assert.ok(i >= 0, 'el Paso 2 tiene un punto 1');
  return i;
};

for (const h of INITS) {
  test(`CA-7.1 ${h}: comprueba el esquema con valida.mjs antes de copiar plantillas o mover ficheros`, () => {
    const p2 = paso2(h);
    const esquema = p2.indexOf('Comprueba también su esquema');
    assert.ok(esquema >= 0, `${rel(h)}: falta la comprobación previa del esquema de .sdd.json`);
    assert.ok(esquema < primeraCopia(p2), `${rel(h)}: la comprobación del esquema va antes de migrar nada`);
    const texto = p2.slice(esquema, primeraCopia(p2));
    assert.match(texto, /antes de copiar plantillas o mover\s+ficheros/, rel(h));
    assert.match(texto, /core\/scripts\/valida\.mjs/, rel(h));
    assert.match(texto, /errores de `\.sdd\.json`/, rel(h));
    assert.match(texto, /salen antes que\s+los de artefactos/, rel(h));
  });

  test(`CA-7.2 ${h}: ante errores de esquema enseña los campos y para`, () => {
    const p2 = paso2(h);
    const texto = p2.slice(p2.indexOf('Comprueba también su esquema'), primeraCopia(p2));
    assert.match(texto, /enséñale al humano los campos que fallan,\s+tal como los\s+da `valida\.mjs`/, `${rel(h)}: no enseña los campos`);
    assert.match(texto, /no copies ni muevas nada hasta que el `\.sdd\.json` se\s+corrija o el humano decida otra cosa de forma explícita/, `${rel(h)}: no para ante errores`);
  });

  test(`CA-7.3 ${h}: no sobrescribe el .sdd.json existente con la plantilla`, () => {
    const p2 = paso2(h);
    const texto = p2.slice(p2.indexOf('Comprueba también su esquema'), primeraCopia(p2));
    assert.match(texto, /No sobrescribas el\s+`\.sdd\.json` existente con la plantilla\s+para salir del error/, rel(h));
  });

  test(`CA-7 ${h}: la prosa no repite la tabla de tipos de ADR-019 §1`, () => {
    const s = lee(h);
    for (const re of [/array de strings/i, /booleano/i, /\bruff\b/, /\beslint\b/, /\bdart\b/, /no es una cadena/]) {
      assert.doesNotMatch(s, re, `${rel(h)} repite el esquema (${re}); su única fuente es el lector`);
    }
  });
}

test('CA-7: Kimi Code no tiene sdd-init', () => {
  assert.equal(fs.existsSync(path.join(REPO_ROOT, 'adapters', 'kimi-code', 'commands', 'sdd-init.md')), false);
});
