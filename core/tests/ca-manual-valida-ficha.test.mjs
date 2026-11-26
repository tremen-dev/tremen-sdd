import test from 'node:test';
import assert from 'node:assert/strict';
import { proyecto, valida, cuerpo, CA1_MANUAL, CA2_AUTO, CUERPO_CA1 } from './_ca-manual-fixtures.mjs';

// SPEC-030 CA-2: valida.mjs informa de los errores de ficha de una spec del
// modelo (ADR-020 §1, §2), nombrando fichero, CA y clave, sin parar en el primero.

const sin = (lineas, clave) => lineas.filter((l) => !l.includes(`\`${clave}\``));
const manual = (...ficha) => ['### CA-1 [manual] — Recorrido', ...ficha];

// [caso, cuerpo, CA, clave, qué se esperaba (regex)]
const CASOS = [
  ['(a) falta ejecuta', cuerpo(sin(CA1_MANUAL, 'ejecuta'), CA2_AUTO), 'CA-1', 'ejecuta', /falta/],
  ['(b) falta bloquea-hecho', cuerpo(sin(CA1_MANUAL, 'bloquea-hecho'), CA2_AUTO), 'CA-1', 'bloquea-hecho', /falta/],
  ['(c) falta comprobacion', cuerpo(sin(CA1_MANUAL, 'comprobacion'), CA2_AUTO), 'CA-1', 'comprobacion', /falta/],
  ['(d) clave desconocida', cuerpo([...CA1_MANUAL, '- `ejecutor`: humano'], CA2_AUTO), 'CA-1', 'ejecutor', /desconocida/],
  ['(e) ejecuta: agente', cuerpo(manual('- `ejecuta`: agente', '- `bloquea-hecho`: sí', '- `comprobacion`: x'), CA2_AUTO),
    'CA-1', 'ejecuta', /humano, orquestador, implementador, verificador/],
  ['(e) bloquea-hecho: quizá', cuerpo(manual('- `ejecuta`: humano', '- `bloquea-hecho`: quizá', '- `comprobacion`: x'), CA2_AUTO),
    'CA-1', 'bloquea-hecho', /sí, si, no/],
  ['(e) cuando: luego', cuerpo([...CA1_MANUAL, '- `cuando`: luego'], CA2_AUTO), 'CA-1', 'cuando', /codigo, tras-merge/],
  ['(f) ejecuta en un CA sin marca', cuerpo(CA1_MANUAL, [CA2_AUTO[0], '- `ejecuta`: humano']), 'CA-2', 'ejecuta', /solo la admite un CA \[manual\]/],
  ['(f) comprobacion en un CA sin marca', cuerpo(CA1_MANUAL, [CA2_AUTO[0], '- `comprobacion`: x']), 'CA-2', 'comprobacion', /solo la admite un CA \[manual\]/],
  ['(g) ejecuta dos veces', cuerpo([...CA1_MANUAL, '- `ejecuta`: orquestador'], CA2_AUTO), 'CA-1', 'ejecuta', /repetida/],
  ['(h) consentimiento con ejecuta: verificador',
    cuerpo(manual('- `ejecuta`: verificador', '- `bloquea-hecho`: sí', '- `consentimiento`: borrar datos', '- `comprobacion`: x'), CA2_AUTO),
    'CA-1', 'consentimiento', /`humano` u `orquestador`/],
  ['(h) consentimiento con ejecuta: implementador',
    cuerpo(manual('- `ejecuta`: implementador', '- `bloquea-hecho`: sí', '- `consentimiento`: borrar datos', '- `comprobacion`: x'), CA2_AUTO),
    'CA-1', 'consentimiento', /`humano` u `orquestador`/],
  ['(i) tras-merge con bloquea-hecho: sí', cuerpo([...CA1_MANUAL, '- `cuando`: tras-merge'], CA2_AUTO),
    'CA-1', 'cuando', /exige `bloquea-hecho: no`/],
  ['(j) dos comprobacion sin entorno', cuerpo([...CA1_MANUAL, '- `comprobacion`: otra'], CA2_AUTO), 'CA-1', 'comprobacion', /ambigua/],
  ['(j) dos comprobacion con el mismo entorno',
    cuerpo(manual('- `ejecuta`: humano', '- `bloquea-hecho`: sí', '- `comprobacion` [staging]: a', '- `comprobacion` [staging]: b'), CA2_AUTO),
    'CA-1', 'comprobacion', /repetida/],
  ['(j) comprobacion con texto vacío',
    cuerpo(manual('- `ejecuta`: humano', '- `bloquea-hecho`: sí', '- `comprobacion`:'), CA2_AUTO), 'CA-1', 'comprobacion', /vacía/],
  ['(k) depende-de a un CA inexistente', cuerpo([...CA1_MANUAL, '- `depende-de`: CA-9'], CA2_AUTO), 'CA-1', 'depende-de', /CA-9/],
  ['(k) depende-de a sí mismo', cuerpo([...CA1_MANUAL, '- `depende-de`: CA-1'], CA2_AUTO), 'CA-1', 'depende-de', /sí mismo/],
  ['(k) ciclo CA-1 → CA-2 → CA-1', cuerpo([...CA1_MANUAL, '- `depende-de`: CA-2'], [CA2_AUTO[0], '- `depende-de`: CA-1']),
    'CA-1', 'depende-de', /CA-1 → CA-2 → CA-1/],
  ['(l) CA-M7 sin [manual]', cuerpo(CA1_MANUAL, ['### CA-M7 — Sin marca', '- **Given**: …']), 'CA-M7', '[manual]', /se espera la marca/],
];

for (const [caso, texto, ca, clave, esperado] of CASOS) {
  test(`CA-2 ${caso}: sale con error que nombra fichero, CA y clave y dice lo esperado`, () => {
    const { code, out } = valida(proyecto(texto));
    assert.notEqual(code, 0, out);
    const linea = out.split('\n').find((l) => l.includes('SPEC-001-x.md') && l.includes(`${ca}:`) && l.includes(clave));
    assert.ok(linea, `ninguna línea nombra SPEC-001-x.md, ${ca} y ${clave}:\n${out}`);
    assert.match(linea, esperado);
  });
}

test('CA-2: con dos errores en dos CA distintos, aparecen los dos', () => {
  const texto = cuerpo(sin(CA1_MANUAL, 'ejecuta'), [CA2_AUTO[0], '- `comprobacion`: x']);
  const { code, out } = valida(proyecto(texto));
  assert.notEqual(code, 0);
  assert.match(out, /CA-1:.*`ejecuta`/);
  assert.match(out, /CA-2:.*`comprobacion`/);
  assert.match(out, /2 error/);
});

test('CA-2: la fixture de CA-1, como spec completa, da valida sin errores', () => {
  const { code, out } = valida(proyecto(CUERPO_CA1));
  assert.equal(code, 0, out);
  assert.match(out, /OK/);
});

test('CA-2: la spec mínima del modelo de los casos es válida (los casos solo cambian lo que prueban)', () => {
  const { code, out } = valida(proyecto(cuerpo(CA1_MANUAL, CA2_AUTO)));
  assert.equal(code, 0, out);
});
