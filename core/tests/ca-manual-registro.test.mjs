import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { transition } from '../scripts/estado.mjs';
import { parseFrontmatter } from '../lib/frontmatter.mjs';
import { proyecto, estadoCli, ledgerSecciones } from './_evidencia-fixtures.mjs';

// SPEC-032 CA-9 (ADR-021): con `registroManuales` declarado, `en-revision` exige
// una línea del registro con SPEC-001 y el CA para cada CA manual bloqueante sin
// cerrar. CA-1 automático; CA-2 manual bloqueante; CA-3 manual que no bloquea.
const SPEC = ['# SPEC-001', '',
  '### CA-1 — Automático', '- **Given**: …', '',
  '### CA-2 [manual] — Bloquea', '- `ejecuta`: humano', '- `bloquea-hecho`: sí', '- `comprobacion`: el panel muestra el recurso', '',
  '### CA-3 [manual] — No bloquea', '- `ejecuta`: humano', '- `bloquea-hecho`: no', '- `comprobacion`: la tarea aparece activa', ''].join('\n');
const SIN_MODELO = SPEC.replaceAll(' [manual]', '').replace(/^- `(ejecuta|comprobacion)`.*$/gm, '- texto');
const REGISTRO = 'docs/manuales/registro.md';

// matriz: estados de la matriz (sin CA-2 si no se da); registro: texto, o null si no existe.
function crea({ matriz, registro = '', declarado = true, spec = SPEC }) {
  const p = proyecto(spec, { estado: 'en-progreso', ledger: ledgerSecciones({ matriz, evidencia: [] }) });
  fs.writeFileSync(path.join(p.raiz, '.sdd.json'), JSON.stringify(declarado ? { registroManuales: REGISTRO } : {}));
  if (registro !== null) {
    fs.mkdirSync(path.join(p.raiz, 'docs', 'manuales'), { recursive: true });
    fs.writeFileSync(path.join(p.raiz, REGISTRO), registro);
  }
  return p;
}
const estadoDe = (p) => parseFrontmatter(fs.readFileSync(p.spec, 'utf8')).data.estado;
const EN_ESPERA = { 'CA-1': '✅', 'CA-2': '⏳', 'CA-3': '⏳' };
const LINEA = '- 2026-11-26 SPEC-001 CA-2: probado en el móvil de pruebas\n';

const PASAN = [
  ['(a) sin registroManuales', { matriz: EN_ESPERA, declarado: false, registro: null }],
  ['(b) con la línea de SPEC-001 y CA-2', { matriz: EN_ESPERA, registro: LINEA }],
  ['(h) CA-2 en ❌ con su línea', { matriz: { ...EN_ESPERA, 'CA-2': '❌' }, registro: LINEA }],
  ['(i) CA-2 en ✅ y CA-3 en ❌, registro vacío', { matriz: { ...EN_ESPERA, 'CA-2': '✅ [confirmado: Alberto Fojo, 2026-11-26]', 'CA-3': '❌' } }],
  ['(i) CA-2 en n-a, registro vacío', { matriz: { ...EN_ESPERA, 'CA-2': 'n-a', 'CA-3': '❌' } }],
  ['(j) spec que no es del modelo, registro vacío', { matriz: { 'CA-1': '❌', 'CA-2': '❌', 'CA-3': '❌' }, spec: SIN_MODELO }],
];
for (const [caso, opciones] of PASAN) {
  test(`CA-9 ${caso}: pasa a en-revision`, () => {
    const p = crea(opciones);
    transition(p.spec, 'en-revision', 'sdd-implementador', '2026-11-26');
    assert.equal(estadoDe(p), 'en-revision');
  });
}

const SE_NIEGAN = [
  ['(c) sin la línea', { matriz: EN_ESPERA, registro: '- otra cosa\n' }],
  ['(c) con CA-2 de otra spec', { matriz: EN_ESPERA, registro: '- SPEC-002 CA-2 probado\n- SPEC-001 CA-1 probado\n' }],
  ['(c) con CA-20 de esta spec', { matriz: EN_ESPERA, registro: '- SPEC-001 CA-20 probado\n' }],
  ['(c) con SPEC-0011 y CA-2', { matriz: EN_ESPERA, registro: '- SPEC-0011 CA-2 probado\n' }],
  ['(d) el registro no existe', { matriz: EN_ESPERA, registro: null }],
  ['(e) CA-2 en ❌ y CA-3 en ⏳, registro vacío', { matriz: { ...EN_ESPERA, 'CA-2': '❌' } }],
  ['(f) CA-2 en ⚠️', { matriz: { ...EN_ESPERA, 'CA-2': '⚠️' } }],
  ['(f) CA-2 en 🚧', { matriz: { ...EN_ESPERA, 'CA-2': '🚧' } }],
  ['(f) CA-2 con la celda vacía', { matriz: { ...EN_ESPERA, 'CA-2': '' } }],
  ['(g) sin fila de CA-2', { matriz: { 'CA-1': '✅', 'CA-3': '⏳' } }],
];
for (const [caso, opciones] of SE_NIEGAN) {
  test(`CA-9 ${caso}: se niega, nombra CA-2 y la ruta del registro, y no toca la spec`, () => {
    const p = crea(opciones);
    const antes = fs.readFileSync(p.spec);
    let error;
    assert.throws(() => transition(p.spec, 'en-revision', 'sdd-implementador'), (e) => { error = e; return true; });
    assert.match(error.message, /\bCA-2\b/);
    assert.doesNotMatch(error.message, /\bCA-3\b/, 'CA-3 no bloquea: no se nombra');
    assert.ok(error.message.includes(path.join(p.raiz, REGISTRO)) || error.message.includes(REGISTRO), error.message);
    assert.ok(fs.readFileSync(p.spec).equals(antes), 'la spec no cambia byte a byte');
  });
}

for (const [caso, opciones] of [SE_NIEGAN[0], SE_NIEGAN[5]]) {
  test(`CA-9 ${caso}: el CLI de estado.mjs sale con código distinto de 0 y nombra CA-2 y el registro`, () => {
    const p = crea(opciones);
    const { code, out } = estadoCli(p, 'en-revision', 'sdd-implementador');
    assert.notEqual(code, 0, out);
    assert.match(out, /\bCA-2\b/);
    assert.match(out, /registro\.md/);
    assert.equal(estadoDe(p), 'en-progreso');
  });
}

test('CA-9.5: la aprobación humana se comprueba antes que el registro', () => {
  const p = crea({ matriz: EN_ESPERA, registro: null });
  const texto = fs.readFileSync(p.spec, 'utf8').replace(/^ {2}- \{estado: aprobada.*\n/m, '');
  fs.writeFileSync(p.spec, texto);
  assert.throws(() => transition(p.spec, 'en-revision', 'sdd-implementador'), (e) => !/registro/.test(e.message) && /aprob/i.test(e.message));
});

test('CA-9: con un .sdd.json ilegible, una spec del modelo no pasa a en-revision (ADR-017)', () => {
  const p = crea({ matriz: EN_ESPERA, registro: LINEA });
  fs.writeFileSync(path.join(p.raiz, '.sdd.json'), JSON.stringify({ registroManuales: '' }));
  assert.throws(() => transition(p.spec, 'en-revision', 'sdd-implementador'), /\.sdd\.json/);
  assert.equal(estadoDe(p), 'en-progreso');
});
