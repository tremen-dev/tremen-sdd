import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../checks/_util.mjs';
import { normalizaProsa } from '../checks/prosa-gates.mjs';
import { leerCAs, esSpecDelModelo, erroresFicha } from '../../core/lib/ca-manual.mjs';

// SPEC-030 CA-6 (ADR-020 §4, §5; RN-12): RN-12, la plantilla de spec, la del
// ledger y el rol del verificador dicen la misma regla. Se compara tras
// normalizar acentos, mayúsculas y marcas de markdown, como prosa-gates.
const REGLAS = 'docs/fundacion/reglas.md';
const TPL_SPEC = 'core/templates/es/artefactos/SPEC.md';
const TPL_LEDGER = 'core/templates/es/artefactos/SPEC.ledger.md';
const ROL = 'core/roles/es/sdd-verificador.md';
const lee = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

const FRASE = normalizaProsa('una salvedad no aceptada por una persona nunca es ✅');
const ANTIGUAS = ['una salvedad se marca ⚠️, nunca ✅', 'salvedad = ⚠️, nunca ✅', '⚠️ justificada y aceptada'].map(normalizaProsa);
// GREEN de ADR-020 §5: cada CA que bloquea `hecho` en ✅, con o sin calificadores, o en n-a.
const GREEN = /green[^.]*cada ca que bloquea hecho[^.]*✅[^.]*con o sin calificadores[^.]*n-a/;

// Fallos de un texto frente a la regla, cada uno con el fichero que lo tiene.
export function fallosRegla(rel, texto, { green = false, calificadores = false } = {}) {
  const t = normalizaProsa(texto);
  const fallos = [];
  if (!t.includes(FRASE)) fallos.push(`${rel}: no dice «una salvedad no aceptada por una persona nunca es ✅»`);
  if (!/\brn-12\b/.test(t)) fallos.push(`${rel}: no cita RN-12`);
  for (const vieja of ANTIGUAS) if (t.includes(vieja)) fallos.push(`${rel}: conserva la frase antigua «${vieja}»`);
  if (calificadores) {
    for (const marca of ['⏳', '[desviacion]', '[salvedad:', '[confirmado:']) {
      if (!t.includes(marca)) fallos.push(`${rel}: la leyenda no lista ${marca}`);
    }
  }
  if (green && !GREEN.test(t)) fallos.push(`${rel}: la definición de GREEN no es la de ADR-020 §5`);
  return fallos;
}

test('CA-6.3/6.6: la leyenda del ledger lista ⏳ y los tres calificadores y dice la regla citando RN-12', () => {
  assert.deepEqual(fallosRegla(TPL_LEDGER, lee(TPL_LEDGER), { calificadores: true }), []);
});

test('CA-6.4/6.6: el rol del verificador dice la regla citando RN-12, con el GREEN de ADR-020 §5', () => {
  assert.deepEqual(fallosRegla(ROL, lee(ROL), { green: true }), []);
});

test('CA-6.5: reglas.md contiene RN-12 con la frase', () => {
  const rn12 = lee(REGLAS).split(/\n(?=- \*\*RN-)/).find((p) => p.startsWith('- **RN-12'));
  assert.ok(rn12, 'reglas.md no tiene RN-12');
  assert.deepEqual(fallosRegla(REGLAS, rn12), []);
});

test('CA-6.5: RN-09 no cambia', () => {
  const rn09 = lee(REGLAS).split(/\n(?=- \*\*RN-)/).find((p) => p.startsWith('- **RN-09'));
  assert.equal(rn09.replace(/\r\n/g, '\n').trim(), [
    '- **RN-09 — Ningún rol aprueba su propio trabajo.** La transición a `aprobada` de',
    '  una épica, spec o ADR la realiza el humano en el gate, no el rol que la redactó.',
    '  Verificable: en el `historial`, el `por` de la entrada `aprobada` es una persona,',
    '  distinta del autor del `borrador`. No-negociable operativo del pipeline.',
  ].join('\n'));
});

test('CA-6.7: si un texto pierde la frase, el fallo nombra el fichero', () => {
  const sinFrase = lee(ROL).replace(/una\s+salvedad\s+no\s+aceptada\s+por\s+una\s+persona\s+nunca\s+es\s+✅/gi, 'algo distinto');
  const fallos = fallosRegla(ROL, sinFrase, { green: true });
  assert.ok(fallos.some((f) => f.startsWith(`${ROL}:`) && /nunca es ✅/.test(f)), fallos.join('\n'));
  const conVieja = lee(TPL_LEDGER) + '\nUna salvedad se marca ⚠️, nunca ✅.\n';
  assert.ok(fallosRegla(TPL_LEDGER, conVieja, { calificadores: true }).some((f) => f.startsWith(`${TPL_LEDGER}:`)));
});

test('CA-6.7: la comparación tolera acentos, mayúsculas y markdown', () => {
  const texto = '**Una salvedad NO aceptada por una persona nunca es ✅** (`RN-12`). GREEN: cada CA que bloquea `hecho` '
    + 'en ✅, con o sin calificadores, o en `n-a`.';
  assert.deepEqual(fallosRegla('x.md', texto, { green: true }), []);
});

test('CA-6.1: la plantilla de spec explica la marca y la ficha en un comentario, con un ejemplo que el lector acepta', () => {
  const tpl = lee(TPL_SPEC);
  const comentario = [...tpl.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1]).find((c) => c.includes('[manual]'));
  assert.ok(comentario, 'ningún comentario HTML de la plantilla trae un CA [manual]');
  assert.match(comentario, /ADR-020/);
  const cas = leerCAs(comentario);
  assert.equal(esSpecDelModelo(cas), true, 'el ejemplo es una spec del modelo');
  assert.deepEqual(erroresFicha(cas), []);
  const manual = cas.find((c) => c.manual);
  assert.ok(manual.ejecuta && manual.comprobaciones.length, 'el ejemplo trae ficha');
});

test('CA-6.2: la spec que crea scaffold.mjs no es una spec del modelo y valida la da por buena', () => {
  const raiz = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-spec030-sc-')));
  fs.writeFileSync(path.join(raiz, '.sdd.json'), '{}');
  fs.mkdirSync(path.join(raiz, 'docs'));
  const cli = (script, args) => spawnSync(process.execPath, [path.join(REPO_ROOT, 'core', 'scripts', script), ...args],
    { cwd: raiz, encoding: 'utf8' });
  assert.equal(cli('scaffold.mjs', ['epica', 'Facturas', '--dir', 'docs']).status, 0);
  const r = cli('scaffold.mjs', ['spec', 'Alta de factura', '--epica', 'EPIC-001', '--dir', 'docs']);
  assert.equal(r.status, 0, r.stderr);
  const dir = path.join(raiz, 'docs', 'epicas', fs.readdirSync(path.join(raiz, 'docs', 'epicas'))[0]);
  const spec = fs.readdirSync(dir).find((n) => /^SPEC-001-.*(?<!\.ledger)\.md$/.test(n));
  assert.equal(esSpecDelModelo(leerCAs(fs.readFileSync(path.join(dir, spec), 'utf8'))), false);
  const v = cli('valida.mjs', ['--dir', 'docs']);
  assert.equal(v.status, 0, v.stdout + v.stderr);
});
