// SPEC-031: el historial del frontmatter conserva las notas con comas y comillas.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, stringifyFrontmatter } from '../lib/frontmatter.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_REPO = path.resolve(AQUI, '..', '..');
const ESTADO = path.join(RAIZ_REPO, 'core', 'scripts', 'estado.mjs');
const VALIDA = path.join(RAIZ_REPO, 'core', 'scripts', 'valida.mjs');

// Casos de CA-1: [id, nota tal como está en el fichero, valor parseado].
const CASOS = [
  ['a', '"CA-10, CA-11 y CA-12"', 'CA-10, CA-11 y CA-12'],
  ['b', '"ver CA-1: refutada"', 'ver CA-1: refutada'],
  ['c', '"llaves {dentro} y fin }"', 'llaves {dentro} y fin }'],
  ['d', '"dijo \\"vale\\", y siguió"', 'dijo "vale", y siguió'],
  ['e', '"barra \\\\ invertida"', 'barra \\ invertida'],
  ['f', "'simples, con ''apóstrofo'' dentro'", "simples, con 'apóstrofo' dentro"],
  ['g', 'sin comillas ni nada raro', 'sin comillas ni nada raro'],
];

const ALBERTO = '{estado: aprobada, fecha: 2026-11-26, por: Alberto Fojo}';

function docCon(lineasHistorial) {
  return '---\nid: SPEC-001\ntipo: spec\nestado: aprobada\nhistorial:\n'
    + lineasHistorial.map((l) => `  - ${l}\n`).join('') + '---\n# Cuerpo\n';
}

// ---------- CA-1 ----------

for (const [id, enFichero, esperado] of CASOS) {
  test(`CA-1 (${id}): la nota ${enFichero} parsea a su valor`, () => {
    const linea = `{estado: en-progreso, fecha: 2026-10-18, por: sdd-verificador, nota: ${enFichero}}`;
    const { data } = parseFrontmatter(docCon([linea]));
    const h = data.historial[0];
    assert.deepEqual(Object.keys(h), ['estado', 'fecha', 'por', 'nota']);
    assert.equal(h.estado, 'en-progreso');
    assert.equal(h.fecha, '2026-10-18');
    assert.equal(h.por, 'sdd-verificador');
    assert.equal(h.nota, esperado);
  });
}

test('CA-1.4: una entrada sin comillas parsea igual que hoy', () => {
  const { data } = parseFrontmatter(docCon([ALBERTO]));
  assert.deepEqual(data.historial[0], { estado: 'aprobada', fecha: '2026-11-26', por: 'Alberto Fojo' });
});

test('CA-1: todas las notas en un mismo historial', () => {
  const lineas = CASOS.map(([, enFichero]) =>
    `{estado: borrador, fecha: 2026-10-18, por: sdd-arquitecto, nota: ${enFichero}}`);
  const { data } = parseFrontmatter(docCon([...lineas, ALBERTO]));
  assert.deepEqual(data.historial.map((h) => h.nota), [...CASOS.map(([, , v]) => v), undefined]);
});

// ---------- CA-2 ----------

function historialDe(notas) {
  return [
    ...notas.map((nota) => ({ estado: 'borrador', fecha: '2026-10-18', por: 'sdd-arquitecto', nota })),
    { estado: 'aprobada', fecha: '2026-11-26', por: 'Alberto Fojo' },
  ];
}

test('CA-2.1: entrecomilla con comillas dobles lo que lo necesita, escapando \\ y "', () => {
  const casos = [
    ['a, b', '"a, b"'],
    ['a: b', '"a: b"'],
    ['a {b', '"a {b"'],
    ['a } b', '"a } b"'],
    ['dijo "vale"', '"dijo \\"vale\\""'],
    ["'empieza", '"\'empieza"'],
    [' espacio', '" espacio"'],
    ['espacio ', '"espacio "'],
    ['barra \\ y , coma', '"barra \\\\ y , coma"'],
  ];
  for (const [valor, escrito] of casos) {
    const texto = stringifyFrontmatter({ h: [{ nota: valor }] }, '');
    assert.equal(texto, `---\nh:\n  - {nota: ${escrito}}\n---\n`, `valor ${JSON.stringify(valor)}`);
  }
});

test('CA-2.2: el resto se escribe tal cual; la entrada de Alberto Fojo sale byte a byte igual', () => {
  const texto = docCon([ALBERTO]);
  const { data, body } = parseFrontmatter(texto);
  assert.equal(stringifyFrontmatter(data, body), texto);
  const plano = stringifyFrontmatter({ h: [{ nota: "barra \\ invertida; O'Brien" }] }, '');
  assert.equal(plano, "---\nh:\n  - {nota: barra \\ invertida; O'Brien}\n---\n");
});

test('CA-2.3: ida y vuelta devuelve los mismos objetos para (a)-(g)', () => {
  const historial = historialDe(CASOS.map(([, , v]) => v));
  const data = { id: 'SPEC-001', estado: 'aprobada', historial };
  const { data: vuelta } = parseFrontmatter(stringifyFrontmatter(data, '# C\n'));
  assert.deepEqual(vuelta, data);
});

test('CA-2.4: serializar, parsear y volver a serializar da el mismo texto', () => {
  const data = { id: 'SPEC-001', estado: 'aprobada', historial: historialDe(CASOS.map(([, , v]) => v)) };
  const primera = stringifyFrontmatter(data, '# C\n');
  const { data: d2, body } = parseFrontmatter(primera);
  assert.equal(stringifyFrontmatter(d2, body), primera);
});

// ---------- CA-3 ----------

test('CA-3: una transición con estado.mjs no estropea las entradas anteriores', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-031-'));
  fs.writeFileSync(path.join(raiz, '.sdd.json'), '{ "idioma": "es" }\n');
  const ep = path.join(raiz, 'docs', 'epicas', 'EPIC-001-x');
  fs.mkdirSync(ep, { recursive: true });
  fs.writeFileSync(path.join(ep, '_epica.md'),
    '---\nid: EPIC-001\ntipo: epica\nestado: aprobada\nhistorial:\n  - {estado: borrador, fecha: 2026-07-01, por: sdd-producto}\n  - {estado: aprobada, fecha: 2026-07-02, por: Alberto}\n---\n# E\n');
  const [a, b, c, d, e] = CASOS.slice(0, 5).map(([, , v]) => v);
  const data = {
    id: 'SPEC-001', tipo: 'spec', epica: 'EPIC-001', estado: 'aprobada', 'aprobada-por': 'Alberto Fojo',
    historial: [
      { estado: 'borrador', fecha: '2026-10-01', por: 'sdd-arquitecto', nota: a },
      { estado: 'aprobada', fecha: '2026-10-02', por: 'Alberto Fojo', nota: b },
      { estado: 'bloqueada', fecha: '2026-10-03', por: 'sdd-arquitecto', nota: c },
      { estado: 'aprobada', fecha: '2026-10-04', por: 'Alberto Fojo', nota: d },
      { estado: 'bloqueada', fecha: '2026-10-05', por: 'sdd-arquitecto', nota: e },
      { estado: 'aprobada', fecha: '2026-10-06', por: 'Alberto Fojo' },
    ],
  };
  const spec = path.join(ep, 'SPEC-001-x.md');
  const antes = stringifyFrontmatter(data, '# S\n');
  fs.writeFileSync(spec, antes);

  const r = spawnSync(process.execPath, [ESTADO, spec, 'en-progreso', '--por', 'sdd-implementador'],
    { cwd: raiz, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);

  const despues = fs.readFileSync(spec, 'utf8');
  const fm = (t) => t.split('\n---\n')[0].split('\n');
  const lAntes = fm(antes);
  const lDespues = fm(despues);
  // Solo cambian la línea de estado y la entrada nueva, que va al final del historial.
  assert.equal(lDespues.length, lAntes.length + 1);
  const nueva = lDespues.at(-1);
  assert.match(nueva, /^ {2}- \{estado: en-progreso, fecha: \d{4}-\d{2}-\d{2}, por: sdd-implementador\}$/);
  lAntes.forEach((linea, i) => {
    if (linea.startsWith('estado: ')) assert.equal(lDespues[i], 'estado: en-progreso');
    else assert.equal(lDespues[i], linea, `línea ${i + 1} del frontmatter`);
  });
  const { data: tras } = parseFrontmatter(despues);
  assert.deepEqual(tras.historial.slice(0, 6), data.historial);

  const v = spawnSync(process.execPath, [VALIDA, '--dir', path.join(raiz, 'docs')], { cwd: raiz, encoding: 'utf8' });
  assert.equal(v.status, 0, v.stderr + v.stdout);
});

// ---------- CA-4 ----------

test('CA-4: los artefactos de docs/ no cambian al parsear y serializar', (t) => {
  let ficheros;
  try {
    ficheros = execFileSync('git', ['ls-files', '-z', '--', 'docs'], { cwd: RAIZ_REPO, encoding: 'utf8' })
      .split('\0').filter((f) => f.endsWith('.md'));
  } catch {
    t.skip('sin git: no hay ficheros con seguimiento que comprobar');
    return;
  }
  const lf = (s) => s.replace(/\r\n/g, '\n');
  const fallos = [];
  let revisados = 0;
  for (const rel of ficheros) {
    const abs = path.join(RAIZ_REPO, rel);
    if (!fs.existsSync(abs)) continue;
    const texto = fs.readFileSync(abs, 'utf8');
    if (!/^---\r?\n[\s\S]*?\r?\n---/.test(texto)) continue;
    revisados++;
    const { data, body } = parseFrontmatter(texto);
    const salida = stringifyFrontmatter(data, body);
    const crlf = texto.includes('\r\n');
    const [esperado, obtenido] = crlf ? [lf(texto), lf(salida)] : [texto, salida];
    if (esperado === obtenido) continue;
    const le = esperado.split('\n');
    const lo = obtenido.split('\n');
    const difs = [];
    for (let i = 0; i < Math.max(le.length, lo.length) && difs.length < 5; i++) {
      if (le[i] !== lo[i]) difs.push(`  l.${i + 1}: ${JSON.stringify(le[i])} -> ${JSON.stringify(lo[i])}`);
    }
    fallos.push(`${rel}${crlf ? ' (CRLF)' : ''}\n${difs.join('\n')}`);
  }
  assert.ok(revisados > 0, 'no se encontró ningún artefacto con frontmatter');
  assert.equal(fallos.length, 0, `ficheros que cambian al reescribirse:\n${fallos.join('\n')}`);
});
