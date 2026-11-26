// SPEC-018 — corpus ejecutable de afirmaciones (CA-2..CA-7).
//
// Este test NO verifica la documentación real: verifica el CORPUS con el que la
// spec #2 de EPIC-005 hará TDD. Su valor es que el corpus sea EJECUTABLE —que se
// pueda cargar, recorrer y ejercer— y no una tabla en prosa que alguien tenga que
// interpretar. El check de coherencia docs↔repo no se escribe aquí (fuera de
// alcance de SPEC-018).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  CORPUS_DIR, COBERTURA_EXIGIDA, REGLAS_GRAMATICA, FORMAS, SINTAXIS,
  RECUENTO_RECONCILIADO, RECUENTO_POR_MECANISMO,
  cargaCorpus, validaCorpus, materializaArbol,
} from './_corpus-afirmaciones.mjs';

const corpus = cargaCorpus();
// Copia profunda: los tests de mutación no deben contaminarse entre sí.
const clona = () => JSON.parse(JSON.stringify(corpus));

test('CA-4: el corpus existe, se carga y valida contra su esquema', () => {
  const { ok, errores } = validaCorpus(corpus);
  assert.equal(ok, true, 'el corpus no valida:\n' + errores.map((e) => ' - ' + e).join('\n'));
});

test('CA-4: cada caso apunta a un documento-ejemplo que existe en el corpus', () => {
  for (const c of corpus.casos) {
    assert.ok(fs.existsSync(path.join(CORPUS_DIR, c.documento)),
      `${c.id}: el documento ${c.documento} no existe`);
  }
});

test('CA-4: el validador falla si se añade un caso sin mecanismo', () => {
  const c = clona();
  const nuevo = { ...c.casos[0], id: 'caso-sin-mecanismo' };
  delete nuevo.mecanismo;
  c.casos.push(nuevo);
  const { ok, errores } = validaCorpus(c);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /caso-sin-mecanismo/.test(e) && /falta 'mecanismo'/.test(e)), errores.join('\n'));
});

test('CA-4: el validador falla si se añade un caso sin veredicto', () => {
  const c = clona();
  const nuevo = { ...c.casos[0], id: 'caso-sin-veredicto' };
  delete nuevo.veredicto;
  c.casos.push(nuevo);
  const { ok, errores } = validaCorpus(c);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /caso-sin-veredicto/.test(e) && /falta 'veredicto'/.test(e)), errores.join('\n'));
});

test('CA-4: el validador falla si se añade un caso sin mensaje_esperado', () => {
  const c = clona();
  const nuevo = { ...c.casos[0], id: 'caso-sin-mensaje' };
  delete nuevo.mensaje_esperado;
  c.casos.push(nuevo);
  const { ok, errores } = validaCorpus(c);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /caso-sin-mensaje/.test(e) && /falta 'mensaje_esperado'/.test(e)), errores.join('\n'));
});

test('CA-4: un caso rojo con mensaje_esperado vacío no cuela', () => {
  const c = clona();
  const rojo = c.casos.find((x) => x.veredicto === 'rojo');
  rojo.mensaje_esperado = '   ';
  const { ok, errores } = validaCorpus(c);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /fragmento literal no vacío/.test(e)), errores.join('\n'));
});

test('CA-4: un caso que apunta a un documento inexistente no cuela', () => {
  const c = clona();
  c.casos[0].documento = 'docs/fantasma.md';
  const { ok, errores } = validaCorpus(c);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /no existe en el corpus/.test(e)), errores.join('\n'));
});

test('CA-2: el caso canónico del adaptador de Cursor se rechaza citando la cláusula P y registra su reformulación', () => {
  const cursor = corpus.casos.find((c) => /cursor/i.test(c.documento) || /cursor/i.test(c.nota ?? ''));
  assert.ok(cursor, 'el corpus debe contener el caso canónico de CA-2 (adaptador de Cursor "en el roadmap")');
  assert.equal(cursor.veredicto, 'rojo');
  assert.equal(cursor.clase, 'P');
  assert.equal(cursor.mecanismo, 'M3');
  assert.ok(cursor.mensaje_esperado && cursor.mensaje_esperado.trim() !== '',
    'debe declarar el fragmento de la cláusula citada');
  assert.ok(cursor.reformulacion && cursor.reformulacion.trim() !== '',
    'debe registrar la reformulación aceptable en forma R');
  // Y la prosa del documento-ejemplo contiene de verdad la afirmación prohibida.
  const doc = fs.readFileSync(path.join(CORPUS_DIR, cursor.documento), 'utf8');
  assert.match(doc, /en el roadmap/i);
});

test('CA-2: el validador falla si un caso de clase P rechazado se queda sin reformulación', () => {
  const c = clona();
  const p = c.casos.find((x) => x.clase === 'P' && x.veredicto === 'rojo');
  delete p.reformulacion;
  const { ok, errores } = validaCorpus(c);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /reformulacion/.test(e)), errores.join('\n'));
});

test('CA-3: cada entrada del inventario tiene exactamente una clase y exactamente un mecanismo', () => {
  assert.equal(corpus.inventario.length, RECUENTO_RECONCILIADO);
  for (const e of corpus.inventario) {
    assert.ok(!Array.isArray(e.clase), `#${e.n}: la clase no puede ser una lista`);
    assert.ok(!Array.isArray(e.mecanismo), `#${e.n}: el mecanismo no puede ser una lista`);
    assert.ok(['M1', 'M2', 'M3', 'ninguno'].includes(e.mecanismo), `#${e.n}: mecanismo fuera del set cerrado`);
  }
  const cuenta = (m) => corpus.inventario.filter((e) => e.mecanismo === m).length;
  for (const [m, n] of Object.entries(RECUENTO_POR_MECANISMO)) {
    assert.equal(cuenta(m), n, `el anexo C reconciliado dice ${n} entradas con mecanismo ${m}`);
  }
});

test('CA-3: las entradas que ningún mecanismo caza quedan enumeradas como residual de revisión humana', () => {
  const residuales = corpus.inventario.filter((e) => e.mecanismo === 'ninguno');
  assert.equal(residuales.length, RECUENTO_POR_MECANISMO.ninguno);
  for (const e of residuales) {
    assert.equal(e.residual, true, `#${e.n}: un residual se declara, no se olvida`);
    assert.ok(e.motivo_residual && e.motivo_residual.trim() !== '', `#${e.n}: falta el motivo del residual`);
  }
  // La cita existente pero equivocada (RN-08 donde va RN-01) es uno de ellos:
  // M1 comprueba existencia, no pertinencia (ADR-012 §2).
  assert.ok(residuales.some((e) => /RN-08/.test(e.afirmacion) && /RN-01/.test(e.afirmacion)),
    'el residual de la cita equivocada pero existente debe estar enumerado');
});

test('CA-3: el validador falla si una entrada del inventario declara dos clases', () => {
  const c = clona();
  c.inventario[0].clase = ['V2', 'P'];
  const { ok, errores } = validaCorpus(c);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /más de una clase/.test(e)), errores.join('\n'));
});

test('CA-3: el validador falla si una entrada del inventario carece de clase', () => {
  const c = clona();
  delete c.inventario[0].clase;
  const { ok, errores } = validaCorpus(c);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /carece de clase/.test(e)), errores.join('\n'));
});

test('CA-3: el validador falla si una entrada declara un mecanismo fuera del set cerrado', () => {
  const c = clona();
  c.inventario[0].mecanismo = 'M4';
  const { ok, errores } = validaCorpus(c);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /fuera del set cerrado/.test(e)), errores.join('\n'));
});

test('CA-3: el validador falla si el recuento del inventario se desvía del reconciliado en el gate', () => {
  const c = clona();
  c.inventario.pop();
  const { ok, errores } = validaCorpus(c);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => new RegExp(`recuento reconciliado.*${RECUENTO_RECONCILIADO}`).test(e)), errores.join('\n'));
});

test('CA-3: toda entrada cazada apunta a un caso real del corpus', () => {
  const ids = new Set(corpus.casos.map((c) => c.id));
  for (const e of corpus.inventario) {
    if (e.mecanismo === 'ninguno') { assert.equal(e.caso ?? null, null); continue; }
    assert.ok(ids.has(e.caso), `#${e.n}: apunta al caso '${e.caso}', que no existe`);
  }
});

test('CA-5: hay al menos un caso por casilla de la lista cerrada de cobertura', () => {
  for (const [clave, veredictos] of Object.entries(COBERTURA_EXIGIDA)) {
    for (const v of veredictos) {
      assert.ok(corpus.casos.some((c) => c.cobertura === clave && c.veredicto === v),
        `falta un caso ${v.toUpperCase()} para '${clave}'`);
    }
  }
});

test('CA-5: una ruta fragmento y una plantilla salen VERDES (no se persiguen, por diseño)', () => {
  for (const clave of ['M1-ruta-fragmento', 'M1-plantilla', 'numero-en-identificador']) {
    const casos = corpus.casos.filter((c) => c.cobertura === clave);
    assert.ok(casos.length > 0, `sin casos para ${clave}`);
    for (const c of casos) assert.equal(c.veredicto, 'verde', `${c.id}: ${clave} no puede salir rojo`);
  }
});

test('CA-5: el validador falla NOMBRANDO la casilla vacía', () => {
  const c = clona();
  c.casos = c.casos.filter((x) => !(x.cobertura === 'M2-cifra-sin-marcar' && x.veredicto === 'rojo'));
  const { ok, errores } = validaCorpus(c);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /cobertura CA-5 incompleta/.test(e) && /M2-cifra-sin-marcar/.test(e)), errores.join('\n'));
});

test('CA-6: cada forma del anexo B tiene un ejemplo válido y uno inválido', () => {
  for (const f of FORMAS) {
    for (const s of SINTAXIS) {
      assert.ok(corpus.casos.some((c) => c.forma === f && c.sintaxis === s),
        `la forma '${f}' no tiene ejemplo con sintaxis ${s}`);
    }
  }
});

test('CA-6: las seis reglas de la gramática del anexo B tienen caso', () => {
  for (const r of Object.keys(REGLAS_GRAMATICA)) {
    assert.ok(corpus.casos.some((c) => (c.reglas_gramatica ?? []).includes(r)),
      `la regla ${r} (${REGLAS_GRAMATICA[r]}) no tiene caso`);
  }
});

test('CA-6: el validador falla si una forma del anexo B se queda sin ejemplo inválido', () => {
  const c = clona();
  c.casos = c.casos.filter((x) => !(x.forma === 'volatil-ok' && x.sintaxis === 'invalida'));
  const { ok, errores } = validaCorpus(c);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /forma 'volatil-ok'/.test(e) && /invalida/.test(e)), errores.join('\n'));
});

test('CA-6: el marcador con el valor incrustado es un caso ROJO del corpus (anexo B, regla 2)', () => {
  const caso = corpus.casos.find((c) => (c.reglas_gramatica ?? []).includes('B2'));
  assert.ok(caso, 'falta el caso de la regla B2');
  assert.equal(caso.veredicto, 'rojo');
  const doc = fs.readFileSync(path.join(CORPUS_DIR, caso.documento), 'utf8');
  assert.match(doc, /<!--\s*sdd:cifra\s+\w+=/, 'el documento-ejemplo debe contener el marcador con valor');
});

test('CA-7: cada inventario del anexo D declara nombre, resolutor y cardinalidad medida y fechada', () => {
  assert.ok(corpus.registro.length > 0);
  for (const r of corpus.registro) {
    assert.ok(r.nombre, 'falta nombre canónico');
    assert.ok(r.resolutor, `${r.nombre}: falta resolutor`);
    assert.match(r.medido, /^\d{4}-\d{2}-\d{2}$/, `${r.nombre}: la cardinalidad debe ir fechada`);
    const tiene = Number.isInteger(r.cardinalidad)
      || Object.keys(r.cardinalidad_por_parametro ?? {}).length > 0;
    assert.ok(tiene, `${r.nombre}: falta la cardinalidad medida`);
  }
});

test('CA-7: ningún resolutor exige conocer un harness concreto salvo los que ADR-011 §2 justifica', () => {
  for (const r of corpus.registro) {
    if (r.adr011 === 'enumeracion-justificada') {
      assert.match(r.nombre, /^(checks|hooks-)/,
        `${r.nombre}: ADR-011 §2 solo justifica enumerar 'checks' y 'hooks-<adaptador>'`);
    } else {
      assert.equal(r.adr011, 'autodescubrimiento', `${r.nombre}: mecanismo ADR-011 no declarado`);
    }
  }
});

test('CA-7: para cada inventario del anexo D existe un caso M2 en el corpus', () => {
  for (const r of corpus.registro) {
    const casa = (n) => (r.patron ? new RegExp(r.patron).test(n) : n === r.nombre);
    assert.ok(corpus.casos.some((c) => c.mecanismo === 'M2' && c.inventario && casa(c.inventario)),
      `el inventario '${r.nombre}' no tiene caso M2 en el corpus`);
  }
});

test('CA-7: el validador falla si un inventario del registro se queda sin caso M2', () => {
  const c = clona();
  c.registro.push({
    nombre: 'epicas',
    resolutor: 'directorios bajo docs/epicas/',
    base: 'docs/epicas/',
    criterio: 'directorios',
    cardinalidad: 5,
    medido: '2026-07-28',
    adr011: 'autodescubrimiento',
  });
  const { ok, errores } = validaCorpus(c);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /epicas/.test(e) && /CA-7/.test(e)), errores.join('\n'));
});

test('CA-4: el árbol mínimo simulado permite ejecutar el corpus sin tocar el repo real', () => {
  const { arbol } = corpus;
  assert.ok(Array.isArray(arbol.ficheros) && arbol.ficheros.length > 0);
  // Los inventarios que los casos M2 afirman deben tener soporte en el árbol.
  const bases = corpus.registro.map((r) => r.base).filter(Boolean);
  for (const b of bases) {
    assert.ok(arbol.ficheros.some((f) => f.startsWith(b)),
      `el árbol simulado no materializa nada bajo '${b}': los casos M2 de ese inventario no serían ejecutables`);
  }
  // Ninguna ruta del árbol simulado escapa hacia arriba.
  for (const f of arbol.ficheros) {
    assert.ok(!f.startsWith('/') && !f.includes('..'), `ruta insegura en arbol.json: ${f}`);
  }
});

test('CA-4: el corpus es EJECUTABLE — el árbol se materializa y todos los casos se pueden recorrer', () => {
  const raiz = materializaArbol(corpus.arbol, fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-corpus-')));
  for (const f of corpus.arbol.ficheros) {
    assert.ok(fs.existsSync(path.join(raiz, f)), `el árbol materializado no tiene ${f}`);
  }
  // Los ficheros con contenido declarado lo conservan: los resolutores de
  // 'checks' y 'reglas' leen contenido, no solo nombres.
  for (const [rel, contenido] of Object.entries(corpus.arbol.contenidos ?? {})) {
    assert.equal(fs.readFileSync(path.join(raiz, rel), 'utf8'), contenido);
  }
  // Recorrido completo: esto es exactamente el bucle con el que la spec #2 hará
  // su RED el primer día — documento + árbol + veredicto esperado, sin leer prosa.
  let ejercidos = 0;
  for (const c of corpus.casos) {
    const doc = fs.readFileSync(path.join(CORPUS_DIR, c.documento), 'utf8');
    assert.ok(doc.trim().length > 0, `${c.id}: documento vacío`);
    if (c.veredicto === 'rojo') {
      assert.ok(typeof c.mensaje_esperado === 'string' && c.mensaje_esperado.length > 0);
    }
    ejercidos += 1;
  }
  assert.equal(ejercidos, corpus.casos.length);
  fs.rmSync(raiz, { recursive: true, force: true });
});

test('CA-6: cada caso rojo con marcador declara un mensaje_esperado que aparece LITERALMENTE en su documento', () => {
  // Si el fragmento esperado no está en el documento, el corpus está mintiendo
  // sobre lo que el check tendrá delante y la spec #2 perseguiría un fantasma.
  // ÚNICA excepción, y es estructural: cuando el fallo es «falta un miembro», el
  // fragmento nombra justo lo que NO está escrito. Ahí se exige lo contrario.
  for (const c of corpus.casos) {
    if (c.veredicto !== 'rojo') continue;
    const doc = fs.readFileSync(path.join(CORPUS_DIR, c.documento), 'utf8');
    if (c.cobertura === 'M2-enumeracion-miembro-que-falta') {
      assert.ok(!doc.includes(c.mensaje_esperado),
        `${c.id}: el miembro que falta ${JSON.stringify(c.mensaje_esperado)} no puede estar en el documento`);
      continue;
    }
    assert.ok(doc.includes(c.mensaje_esperado),
      `${c.id}: el fragmento esperado ${JSON.stringify(c.mensaje_esperado)} no aparece en ${c.documento}`);
  }
});
