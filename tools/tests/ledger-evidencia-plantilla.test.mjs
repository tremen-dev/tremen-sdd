import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../checks/_util.mjs';
import { normalizaProsa } from '../checks/prosa-gates.mjs';
import { leerLedger } from '../../core/lib/ca-manual.mjs';

// SPEC-032 CA-3 (ADR-020 §8): la plantilla del ledger trae la sección
// «Evidencia de CA manuales», detrás de la matriz, con su tabla vacía y la regla.
const TPL_LEDGER = path.join(REPO_ROOT, 'core', 'templates', 'es', 'artefactos', 'SPEC.ledger.md');
const plantilla = () => fs.readFileSync(TPL_LEDGER, 'utf8').replace(/\r\n/g, '\n');
const CABECERA = '| CA | Entorno | Ejecutó | Observado | Commit | Fecha | Notas |';

// Texto de la sección «Evidencia de CA manuales» (hasta el siguiente ##).
const seccionEvidencia = (texto) => {
  const i = texto.indexOf('\n## Evidencia de CA manuales\n');
  assert.ok(i >= 0, 'la plantilla no tiene la sección «Evidencia de CA manuales»');
  const fin = texto.indexOf('\n## ', i + 1);
  return texto.slice(i + 1, fin === -1 ? texto.length : fin);
};

test('CA-3.1: la sección de evidencia va detrás de la matriz, con la cabecera de ADR-020 §8 y sin filas', () => {
  const t = plantilla();
  assert.ok(t.indexOf('\n## Matriz de criterios de aceptación\n') < t.indexOf('\n## Evidencia de CA manuales\n'));
  const tabla = seccionEvidencia(t).split('\n').filter((l) => l.trim().startsWith('|'));
  assert.deepEqual(tabla, [CABECERA, '|---|---|---|---|---|---|---|']);
});

test('CA-3.2: un comentario de la sección dice la regla de ADR-020 §8', () => {
  const sec = seccionEvidencia(plantilla());
  const comentarios = normalizaProsa((sec.match(/<!--[\s\S]*?-->/g) ?? []).join(' '));
  for (const frase of [
    'adr-020 §8',
    'solo se anaden filas',
    'la escribe quien ejecuto',
    'el orquestador si ejecuto el humano',
    'observado es el resultado de la `comprobacion`, no la salida del comando',
    'commit es el sha del codigo sobre el que se ejecuto',
    'no toca verif., estado ni el veredicto',
    'el paso de ⏳ a ✅ lo da siempre el verificador',
  ].map(normalizaProsa)) {
    assert.ok(comentarios.includes(frase), `el comentario no dice «${frase}»:\n${comentarios}`);
  }
});

function proyectoConScaffold() {
  const raiz = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-spec032-sc-')));
  fs.writeFileSync(path.join(raiz, '.sdd.json'), '{}');
  fs.mkdirSync(path.join(raiz, 'docs'));
  const cli = (script, args) => spawnSync(process.execPath, [path.join(REPO_ROOT, 'core', 'scripts', script), ...args],
    { cwd: raiz, encoding: 'utf8' });
  assert.equal(cli('scaffold.mjs', ['epica', 'Facturas', '--dir', 'docs']).status, 0);
  const r = cli('scaffold.mjs', ['spec', 'Alta de factura', '--epica', 'EPIC-001', '--dir', 'docs']);
  assert.equal(r.status, 0, r.stderr);
  const dir = path.join(raiz, 'docs', 'epicas', fs.readdirSync(path.join(raiz, 'docs', 'epicas'))[0]);
  const spec = path.join(dir, fs.readdirSync(dir).find((n) => /^SPEC-001-.*(?<!\.ledger)\.md$/.test(n)));
  return { raiz, cli, spec, ledger: spec.replace(/\.md$/, '.ledger.md') };
}

test('CA-3.3: el lector reconoce en el ledger recién creado la matriz y la evidencia, vacía', () => {
  const p = proyectoConScaffold();
  const l = leerLedger(fs.readFileSync(p.ledger, 'utf8'));
  assert.deepEqual(l.errores, []);
  assert.deepEqual(l.matriz.filas.map((f) => [f.id, f.celda]), [['CA-1', '❌']]);
  assert.ok(l.evidencia, 'no reconoce la tabla de evidencia');
  assert.deepEqual(l.evidencia.filas, []);
});

test('CA-3.4: la spec y el ledger recién creados pasan valida, también si la spec pasa a ser del modelo', () => {
  const p = proyectoConScaffold();
  let v = p.cli('valida.mjs', ['--dir', 'docs']);
  assert.equal(v.status, 0, v.stdout + v.stderr);
  const texto = fs.readFileSync(p.spec, 'utf8').replace(/^- \*\*CA-1\*\*: .*$/m,
    '- **CA-1** [manual]: Dado … cuando … entonces …\n  - `ejecuta`: humano\n  - `bloquea-hecho`: sí\n  - `comprobacion`: el panel muestra el recurso');
  assert.notEqual(texto, fs.readFileSync(p.spec, 'utf8'));
  fs.writeFileSync(p.spec, texto);
  v = p.cli('valida.mjs', ['--dir', 'docs']);
  assert.equal(v.status, 0, v.stdout + v.stderr);
});

test('CA-3.5: en el golden de scaffold solo cambia la entrada del ledger, que es la plantilla', () => {
  const golden = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'tools', 'tests', 'golden', 'scaffold-es.json'), 'utf8'));
  const clave = Object.keys(golden).find((k) => k.endsWith('.ledger.md'));
  const esperado = plantilla()
    .replaceAll('{{ID}}', 'SPEC-001').replaceAll('{{EPICA}}', 'EPIC-001')
    .replaceAll('{{TITULO}}', 'Alta de factura').replaceAll('{{SLUG}}', 'alta-de-factura');
  assert.equal(golden[clave], esperado);
});
