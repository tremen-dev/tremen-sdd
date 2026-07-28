// SPEC-018 — los veredictos del corpus se DERIVAN del árbol simulado.
//
// La ronda 1 del verificador encontró el defecto de fondo: los veredictos estaban
// DECLARADOS en `casos.json` y nada los comprobaba. Se podía añadir un rol o
// quitar un adaptador del árbol y los 30 tests seguían en verde — un corpus que
// valida que está bien escrito, no que dice la verdad. Este fichero cierra eso:
// cada veredicto se calcula resolviendo contra `arbol.json`, y el bloque E1
// reproduce el experimento del verificador como test permanente.
//
// El criterio, literal: «si tocas el árbol y todo sigue verde, no lo has
// arreglado».
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CORPUS_DIR, cargaCorpus } from './_corpus-afirmaciones.mjs';
import {
  evalua, evaluaCaso, resuelveInventario, parseMarcadores, hooksDeclarados,
} from './_oraculo-afirmaciones.mjs';

const corpus = cargaCorpus();
const ctx = { arbol: corpus.arbol, registro: corpus.registro, lexico: corpus.lexico };
const de = (id) => corpus.casos.find((c) => c.id === id);
const evaluaTodos = (contexto = ctx) => corpus.casos.map((c) => ({
  caso: c, derivado: evaluaCaso(c, CORPUS_DIR, contexto),
}));

// ---------------------------------------------------------------------------
// F-V-1 / F-V-2 — veredicto derivado, no declarado
// ---------------------------------------------------------------------------

test('F-V-1: TODO veredicto declarado coincide con el veredicto derivado del árbol', () => {
  const fallos = [];
  for (const { caso, derivado } of evaluaTodos()) {
    if (derivado.veredicto !== caso.veredicto) {
      fallos.push(`${caso.id}: declara ${caso.veredicto} y el árbol da ${derivado.veredicto}`
        + (derivado.motivos.length ? `\n      ${derivado.motivos.join('\n      ')}` : ''));
    }
  }
  assert.equal(fallos.length, 0, 'veredictos no derivables:\n  - ' + fallos.join('\n  - '));
});

test('F-V-1: los casos VERDES sobreviven al check ENTERO, no solo a su mecanismo declarado', () => {
  // El finding literal: `numero-en-identificador-verde` citaba RN-08 / ADR-011 /
  // SPEC-017 ausentes de su propio árbol, y `M3-marca-volatil-verde` —el ejemplar
  // de «así se dice bien en forma R»— citaba SPEC-002, también ausente. Un verde
  // que solo pasa su propio mecanismo enseña que la reformulación que RN-12
  // recomienda no pasaría el check.
  for (const { caso, derivado } of evaluaTodos()) {
    if (caso.veredicto !== 'verde') continue;
    assert.equal(derivado.motivos.length, 0,
      `${caso.id} debe salir verde con TODOS los mecanismos aplicados:\n  ${derivado.motivos.join('\n  ')}`);
  }
});

test('F-V-1: cada caso ROJO lo es por el motivo que declara, no por otro cualquiera', () => {
  for (const { caso, derivado } of evaluaTodos()) {
    if (caso.veredicto !== 'rojo') continue;
    assert.ok(derivado.motivos.length > 0, `${caso.id}: declara rojo y el árbol no encuentra motivo`);
    assert.ok(derivado.motivos.some((m) => m.includes(caso.mensaje_esperado)),
      `${caso.id}: ningún motivo derivado contiene ${JSON.stringify(caso.mensaje_esperado)}\n  ${derivado.motivos.join('\n  ')}`);
  }
});

test('F-V-3: la sintaxis declarada del anexo B es lo que el parser lee del documento', () => {
  for (const c of corpus.casos) {
    if (c.sintaxis === null) continue;
    const texto = fs.readFileSync(path.join(CORPUS_DIR, c.documento), 'utf8');
    const { errores } = parseMarcadores(texto);
    assert.equal(errores.length === 0, c.sintaxis === 'valida',
      `${c.id}: declara sintaxis '${c.sintaxis}' y el parser dice lo contrario (${JSON.stringify(errores)})`);
  }
});

// ---------------------------------------------------------------------------
// Resolutores (anexo D) y decisiones del gate del 2026-07-29
// ---------------------------------------------------------------------------

test('CA-7: la cardinalidad de cada inventario se RESUELVE del árbol, no se declara', () => {
  const esperado = {
    adaptadores: 3, harnesses: 3, checks: 3, roles: 4, reglas: 8,
    'hooks-claude-code': 3, 'hooks-kimi-code': 2, 'hooks-opencode': 1,
  };
  for (const [nombre, n] of Object.entries(esperado)) {
    const inv = resuelveInventario(nombre, corpus.arbol, corpus.registro);
    assert.ok(inv, `${nombre}: sin resolutor`);
    assert.equal(inv.cardinalidad, n, `${nombre}: el árbol simulado da ${inv.cardinalidad}, no ${n}`);
  }
});

test('Gate 2026-07-29: un hook es lo que DECLARA EL MANIFIESTO, no un fichero suelto', () => {
  assert.deepEqual(hooksDeclarados(corpus.arbol, 'claude-code'),
    ['calidad', 'protege-verdad', 'require-spec']);
  assert.deepEqual(hooksDeclarados(corpus.arbol, 'kimi-code'),
    ['protege-verdad', 'require-spec']);
  assert.deepEqual(hooksDeclarados(corpus.arbol, 'opencode'), ['require-spec']);

  // El árbol conserva el _comun.mjs que hacía fallar al resolutor ingenuo: contar
  // ficheros da 4 para claude-code, el manifiesto da 3. Si alguien vuelve a
  // contar ficheros, este test lo caza.
  const sueltos = corpus.arbol.ficheros.filter((f) => /^adapters\/claude-code\/hooks\/.*\.mjs$/.test(f));
  assert.equal(sueltos.length, 4);
  assert.notEqual(sueltos.length, hooksDeclarados(corpus.arbol, 'claude-code').length);

  // Y opencode es el caso que demuestra que no es cosmético: sin directorio
  // hooks/, contar ficheros da 0; el manifiesto declara 1.
  const hooksSueltosOpencode = corpus.arbol.ficheros.filter((f) => f.startsWith('adapters/opencode/hooks/'));
  assert.equal(hooksSueltosOpencode.length, 0);
  assert.equal(hooksDeclarados(corpus.arbol, 'opencode').length, 1);
});

test('Gate 2026-07-29: «hoy» solo es volátil si la frase trae además un token de estado del repo', () => {
  assert.ok(corpus.lexico.volatilidad.condicionados.some((c) => c.token === 'hoy'));

  const honesta = 'Toda afirmación sobre un CLI externo se ancla con versión y fecha: hoy, 2026-07-29, opencode 1.18.5.';
  assert.equal(evalua(honesta, ctx).veredicto, 'verde', 'datar una medición con «hoy» es prosa honesta');

  const volatil = 'Hoy instalar exige un build local desde `tools/build-adapter.mjs`.';
  const r = evalua(volatil, ctx);
  assert.equal(r.veredicto, 'rojo');
  assert.ok(r.motivos.some((m) => /volatilidad 'hoy'/.test(m)), r.motivos.join('\n'));
});

test('F-V-4: el léxico cerrado de M3 se entrega como DATO, no como conocimiento tácito', () => {
  const { volatilidad, inventarios_en_prosa, cardinales, anclas, universo_de_miembros } = corpus.lexico;
  assert.ok(volatilidad.incondicionales.includes('aún no'));
  assert.ok(volatilidad.incondicionales.includes('en el roadmap'));
  assert.ok(volatilidad.condicionados.every((c) => c.token && c.condicion && c.motivo));
  // F-SPEC-018-3: el léxico que obliga a marcar es más ancho que el registro.
  assert.equal(inventarios_en_prosa.mapa.papeles, 'roles');
  assert.equal(inventarios_en_prosa.mapa.roles, 'roles');
  assert.equal(cardinales.tres, 3);
  assert.ok(anclas.prefijos.includes('core/'));
  // El universo hace decidible «ningún no-miembro» sin heurística sobre la frase.
  assert.ok(universo_de_miembros.harnesses['gemini-cli']);
});

// ---------------------------------------------------------------------------
// E1 — el experimento del verificador, institucionalizado como test.
// «Si tocas el árbol y todo sigue verde, no lo has arreglado.»
// ---------------------------------------------------------------------------

const conArbol = (mut) => {
  const arbol = JSON.parse(JSON.stringify(corpus.arbol));
  mut(arbol);
  return { ...ctx, arbol };
};

test('E1: añadir un rol al árbol mueve el veredicto del caso que habla de roles', () => {
  const ctxMas = conArbol((a) => a.ficheros.push('core/roles/es/sdd-orquestador.md')); // 4 -> 5
  assert.equal(evaluaCaso(de('M2-cifra-marcada-roles-rojo'), CORPUS_DIR, ctx).veredicto, 'rojo',
    'con 4 roles en el árbol, «5 roles» es falso');
  assert.equal(evaluaCaso(de('M2-cifra-marcada-roles-rojo'), CORPUS_DIR, ctxMas).veredicto, 'verde',
    'con 5 roles pasa a ser CIERTO: el rojo tiene que desaparecer solo');
});

test('E1: quitar el adaptador opencode mueve los casos de adaptadores y de harnesses', () => {
  const ctxMenos = conArbol((a) => { a.ficheros = a.ficheros.filter((f) => !f.startsWith('adapters/opencode/')); });

  // El verde de la cifra pasa a rojo: la prosa dice tres y quedan dos.
  assert.equal(evaluaCaso(de('M2-cifra-marcada-adaptadores-verde'), CORPUS_DIR, ctx).veredicto, 'verde');
  assert.equal(evaluaCaso(de('M2-cifra-marcada-adaptadores-verde'), CORPUS_DIR, ctxMenos).veredicto, 'rojo');

  // El rojo de la enumeración incompleta pasa a verde: ya no falta opencode.
  assert.equal(evaluaCaso(de('M2-enumeracion-miembro-que-falta-rojo'), CORPUS_DIR, ctx).veredicto, 'rojo');
  assert.equal(evaluaCaso(de('M2-enumeracion-miembro-que-falta-rojo'), CORPUS_DIR, ctxMenos).veredicto, 'verde');

  // Y el tramo que enumera los tres harnesses pasa a nombrar un NO-MIEMBRO.
  const enumeracion = evaluaCaso(de('M2-enumeracion-no-miembro-verde'), CORPUS_DIR, ctxMenos);
  assert.equal(enumeracion.veredicto, 'rojo');
  assert.ok(enumeracion.motivos.some((m) => /opencode/.test(m)), enumeracion.motivos.join('\n'));
});

test('E1: mover el árbol mueve VARIOS veredictos — ninguno es inmune por declaración', () => {
  const ctxMutado = conArbol((a) => {
    a.ficheros.push('core/roles/es/sdd-orquestador.md');
    a.ficheros = a.ficheros.filter((f) => !f.startsWith('adapters/opencode/'));
  });
  const movidos = corpus.casos.filter((c) => evaluaCaso(c, CORPUS_DIR, ctxMutado).veredicto !== c.veredicto);
  assert.ok(movidos.length >= 4,
    `mover el árbol debe mover varios veredictos; se movieron ${movidos.length}. `
    + 'Si no se mueve ninguno, están declarados otra vez y no derivados.');
});

test('E1: cambiar el manifiesto de hooks mueve el caso del inventario parametrizado', () => {
  const ctxMenosHook = conArbol((a) => {
    const rel = 'adapters/claude-code/hooks/hooks.json';
    const doc = JSON.parse(a.contenidos[rel]);
    delete doc.hooks.PostToolUse;            // 3 -> 2 hooks declarados
    a.contenidos[rel] = JSON.stringify(doc, null, 2);
  });
  assert.equal(evaluaCaso(de('M2-cifra-marcada-hooks-verde'), CORPUS_DIR, ctx).veredicto, 'verde');
  assert.equal(evaluaCaso(de('M2-cifra-marcada-hooks-verde'), CORPUS_DIR, ctxMenosHook).veredicto, 'rojo',
    'quitar un hook del MANIFIESTO debe romper la cifra, aunque el fichero .mjs siga en el árbol');
});

test('E1: añadir un check a PASOS rompe la enumeración marcada de checks', () => {
  // `checks` es el resolutor que lee CONTENIDO de código, no nombres de fichero,
  // y el único junto a hooks que ADR-011 §2 justifica como enumeración. Si su
  // enumeración no se moviera, el caso verde sería decorativo.
  const ctxMasCheck = conArbol((a) => {
    a.contenidos['tools/check.mjs'] += "PASOS.push({ nombre: 'nuevo', cmd: ['node', 'tools/checks/nuevo.mjs'] });\n";
  });
  assert.equal(evaluaCaso(de('M2-enumeracion-completa-checks-verde'), CORPUS_DIR, ctx).veredicto, 'verde');
  const r = evaluaCaso(de('M2-enumeracion-completa-checks-verde'), CORPUS_DIR, ctxMasCheck);
  assert.equal(r.veredicto, 'rojo');
  assert.ok(r.motivos.some((m) => /nuevo/.test(m)), r.motivos.join('\n'));
});

test('E1: borrar el marcador de un documento verde lo pone en rojo (el marcado es obligatorio)', () => {
  const caso = de('M2-cifra-marcada-adaptadores-verde');
  const texto = fs.readFileSync(path.join(CORPUS_DIR, caso.documento), 'utf8');
  assert.equal(evalua(texto, ctx).veredicto, 'verde');

  const sinMarcador = texto.replace(/<!--\s*sdd:cifra[^>]*-->\s*/g, '');
  const r = evalua(sinMarcador, ctx);
  assert.equal(r.veredicto, 'rojo', 'quitar el marcador debe disparar el marcado obligatorio');
  assert.ok(r.motivos.some((m) => /sin marcador/.test(m)), r.motivos.join('\n'));
});

test('E1: renombrar un artefacto del árbol cuelga la referencia que lo cita', () => {
  const ctxSinSpec = conArbol((a) => {
    a.ficheros = a.ficheros.filter((f) => !f.includes('SPEC-002'));
  });
  assert.equal(evaluaCaso(de('M3-marca-volatil-verde'), CORPUS_DIR, ctx).veredicto, 'verde');
  const r = evaluaCaso(de('M3-marca-volatil-verde'), CORPUS_DIR, ctxSinSpec);
  assert.equal(r.veredicto, 'rojo');
  assert.ok(r.motivos.some((m) => /SPEC-002/.test(m)), r.motivos.join('\n'));
});
