import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../checks/_util.mjs';

// SPEC-029 CA-6.3 (CE-FIX-2) — el CHANGELOG avisa de qué .sdd.json antes
// aceptados pasan a cerrar los gates, desde qué versión y cómo se arreglan.
test('CA-6.3: CHANGELOG.md tiene la entrada de SPEC-029 en una sección sin publicar', () => {
  const s = fs.readFileSync(path.join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
  const i = s.indexOf('(SPEC-029');
  assert.ok(i >= 0, 'falta la entrada de SPEC-029');
  const seccion = s.lastIndexOf('\n## ', i);
  const cabecera = s.slice(seccion + 1, s.indexOf('\n', seccion + 1));
  assert.match(cabecera, /^## \[Sin publicar\] — \d+\.\d+\.\d+$/);
  const fin = s.indexOf('\n- **', i);
  const entrada = s.slice(i, fin === -1 ? s.indexOf('\n## ', i) : fin);
  const version = cabecera.match(/(\d+\.\d+\.\d+)$/)[1];
  assert.ok(entrada.includes(`A partir de ${version}`), 'dice desde qué versión');
  for (const campo of ['rutasVigiladas', 'linter', 'gates', 'idioma', 'null']) {
    assert.ok(entrada.includes(`\`${campo}\``), `nombra ${campo}`);
  }
  assert.match(entrada, /Cómo se arregla/);
  assert.match(entrada, /valida\.mjs/);
});
