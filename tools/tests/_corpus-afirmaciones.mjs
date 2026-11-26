// Validador del CORPUS de afirmaciones (SPEC-018 / ADR-012).
//
// QUÉ ES Y QUÉ NO ES. Esto NO es el check de coherencia docs↔repo: no lee
// FOUNDATION.md, no resuelve inventarios contra el árbol y no está cableado en
// `tools/check.mjs`. Ese check es la spec #2 de EPIC-005 y aquí no se escribe.
// Lo que este módulo valida es el CORPUS mismo —su esquema, su cobertura y su
// coherencia interna—, para que la spec #2 tenga RED que ejecutar el primer día
// en vez de una tabla en prosa que alguien tenga que interpretar.
//
// El corpus vive en `tools/tests/fixtures/afirmaciones/` y se compone de:
//   - `casos.json`       — un caso por fila: documento-ejemplo + veredicto esperado.
//   - `inventario.json`  — el anexo C de SPEC-018, ejecutable: las afirmaciones
//                          falsas del inventario cerrado de EPIC-005, cada una con
//                          su clase, su mecanismo y el caso que la demuestra.
//   - `inventarios.json` — el anexo D: registro cerrado de inventarios con su
//                          resolutor y su cardinalidad medida y fechada.
//   - `arbol.json`       — el árbol mínimo simulado contra el que resuelven M1 y M2.
//   - `docs/*.md`        — los documentos-ejemplo, uno por caso.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CORPUS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'afirmaciones');

// ---------------------------------------------------------------------------
// Listas CERRADAS. Ninguna se deriva del corpus (ADR-011 §4): si se derivaran,
// el corpus siempre se validaría a sí mismo y el validador no diría nada.
// ---------------------------------------------------------------------------

export const MECANISMOS = ['M1', 'M2', 'M3', 'ninguno'];
export const CLASES_CASO = ['V1', 'V2', 'V3', 'R', 'P'];
// El inventario admite además 'fuera': juicio, intención, pedagogía o
// procedimiento, que ADR-012 deja EXPLÍCITAMENTE fuera de la taxonomía y nunca
// verifica. No es un comodín: obliga a mecanismo 'ninguno' y a residual.
export const CLASES_INVENTARIO = [...CLASES_CASO, 'fuera'];
export const VEREDICTOS = ['verde', 'rojo'];
export const FORMAS = ['cifra', 'inventario', 'volatil-ok'];
export const SINTAXIS = ['valida', 'invalida'];

// Cobertura exigida por SPEC-018 CA-5: lista cerrada, con el veredicto que cada
// casilla obliga. Los que llevan un solo veredicto lo llevan porque el CA lo fija
// (una ruta fragmento NO se persigue: solo puede salir verde).
export const COBERTURA_EXIGIDA = {
  'M1-referencia-artefacto': ['verde', 'rojo'],
  'M1-ruta-anclada': ['verde', 'rojo'],
  'M1-ruta-fragmento': ['verde'],
  'M1-plantilla': ['verde'],
  'M2-cifra-marcada': ['verde', 'rojo'],
  'M2-cifra-sin-marcar': ['rojo'],
  'M2-enumeracion-miembro-que-falta': ['verde', 'rojo'],
  'M2-enumeracion-no-miembro': ['verde', 'rojo'],
  'M2-inventario-desconocido': ['rojo'],
  'M3-marca-volatil': ['verde', 'rojo'],
  'M3-exencion-explicita': ['verde'],
  'numero-en-identificador': ['verde'],
};

// Bucket extra para los casos cuya razón de ser es la GRAMÁTICA del anexo B y no
// una casilla de CA-5. No relaja nada: las 12 casillas de arriba siguen exigidas.
export const COBERTURA_GRAMATICA = 'gramatica-marcador';

// Reglas de la gramática del anexo B que el corpus debe ejercer (CA-6).
export const REGLAS_GRAMATICA = {
  B1: 'un nombre de inventario desconocido es ROJO, nunca verde silencioso',
  B2: 'el marcador nunca lleva el valor esperado',
  B3: 'la cifra se lee de la prosa en palabra o en dígito',
  B4: 'un número dentro de un identificador no es una cifra',
  B5: 'sdd:volatil-ok exige motivo no vacío',
  B6: 'un marcador de enumeración sin su cierre es ROJO',
};

// Campos admitidos en un caso. Cerrado: un campo de más es un error, no un extra
// silencioso — el mismo criterio con el que el corpus juzga a la prosa.
const CAMPOS_CASO = new Set(['id', 'mecanismo', 'clase', 'documento', 'veredicto',
  'mensaje_esperado', 'reformulacion', 'nota', 'cobertura', 'forma', 'sintaxis',
  'reglas_gramatica', 'inventario']);

const CAMPOS_INVENTARIO = new Set(['n', 'donde', 'afirmacion', 'clase', 'mecanismo',
  'caso', 'residual', 'motivo_residual', 'nota']);

const CAMPOS_REGISTRO = new Set(['nombre', 'patron', 'resolutor', 'base', 'criterio',
  'exclusiones', 'cardinalidad', 'cardinalidad_por_parametro', 'medido', 'adr011', 'nota']);

// Recuento reconciliado en el gate del 2026-07-28 (SPEC-018 *Notas*, tensión 1 y
// 2): el inventario cerrado de EPIC-005 son 13 afirmaciones + las 4 de
// FOUNDATION.md y vision.md que el gate añadió al ampliarlo. No es "quince".
export const RECUENTO_RECONCILIADO = 17;
export const RECUENTO_POR_MECANISMO = { M1: 0, M2: 7, M3: 8, ninguno: 2 };

const leeJson = (dir, f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

export function cargaCorpus(dir = CORPUS_DIR) {
  return {
    casos: leeJson(dir, 'casos.json'),
    inventario: leeJson(dir, 'inventario.json'),
    registro: leeJson(dir, 'inventarios.json'),
    arbol: leeJson(dir, 'arbol.json'),
    lexico: leeJson(dir, 'lexico.json'),
  };
}

// Materializa el árbol mínimo simulado de `arbol.json` en un directorio (patrón
// de tools/tests/referencias.test.mjs: el fixture se construye, no se comitea).
// Es el único trozo de código ejecutable que el corpus aporta, y existe para que
// la spec #2 pueda apuntar su check a una raíz real:
//     const raiz = materializaArbol(corpus.arbol, fs.mkdtempSync(...));
//     checkAfirmaciones(path.join(CORPUS_DIR, caso.documento), raiz);
// No resuelve ningún inventario ni interpreta ningún marcador: eso es la spec #2.
export function materializaArbol(arbol, destino) {
  for (const rel of arbol.ficheros) {
    const abs = path.join(destino, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, arbol.contenidos?.[rel] ?? '', 'utf8');
  }
  return destino;
}

// ---------------------------------------------------------------------------
// Validación. Función pura sobre el corpus ya cargado: se le puede pasar un
// corpus mutado para comprobar que el validador FALLA (y no solo que pasa).
// ---------------------------------------------------------------------------
export function validaCorpus(corpus, { dir = CORPUS_DIR } = {}) {
  const errores = [];
  const { casos, inventario, registro, arbol, lexico } = corpus;
  const err = (m) => errores.push(m);

  // --- lexico.json: los léxicos cerrados se ENTREGAN (F-V-4) -----------------
  // Si no se entregan como dato, la spec #2 se los inventa y el criterio se
  // pierde: el corpus dejaría de ser ejecutable justo en lo que M3 decide.
  if (!lexico?.volatilidad?.incondicionales?.length) {
    err('lexico.json: falta el léxico de volatilidad de M3 (lista cerrada, ADR-012)');
  }
  for (const c of lexico?.volatilidad?.condicionados ?? []) {
    if (!c.token || !c.condicion || !c.motivo) {
      err(`lexico.json: el token condicionado '${c.token ?? '?'}' debe declarar condición y motivo`);
    }
  }
  if (!Object.keys(lexico?.inventarios_en_prosa?.mapa ?? {}).length) {
    err('lexico.json: falta el mapa sustantivo → inventario (F-SPEC-018-3)');
  }
  for (const [sust, inv] of Object.entries(lexico?.inventarios_en_prosa?.mapa ?? {})) {
    const conocido = (registro ?? []).some((r) => r.nombre === inv || (r.patron && new RegExp(r.patron).test(inv))
      || r.nombre === inv);
    if (!conocido && inv !== 'hooks-<adaptador>') {
      err(`lexico.json: el sustantivo '${sust}' apunta al inventario '${inv}', que no está en el registro`);
    }
  }
  if (!lexico?.anclas?.prefijos?.length) err('lexico.json: falta la lista cerrada de anclas de ruta');
  if (!Object.keys(lexico?.cardinales ?? {}).length) err('lexico.json: falta la tabla de cardinales');

  // --- casos.json: esquema (CA-4) --------------------------------------------
  if (!Array.isArray(casos)) err('casos.json no es un array');
  const ids = new Set();
  for (const [i, c] of (Array.isArray(casos) ? casos : []).entries()) {
    const donde = `casos[${i}]${c?.id ? ` (${c.id})` : ''}`;
    if (!c || typeof c !== 'object') { err(`${donde}: no es un objeto`); continue; }
    for (const k of Object.keys(c)) {
      if (!CAMPOS_CASO.has(k)) err(`${donde}: campo no declarado '${k}'`);
    }
    if (!c.id) err(`${donde}: falta 'id'`);
    else if (ids.has(c.id)) err(`${donde}: 'id' duplicado`);
    else ids.add(c.id);

    if (!('mecanismo' in c)) err(`${donde}: falta 'mecanismo'`);
    else if (!MECANISMOS.includes(c.mecanismo)) err(`${donde}: 'mecanismo' fuera del set cerrado (${MECANISMOS.join('|')}): ${JSON.stringify(c.mecanismo)}`);

    if (!('clase' in c)) err(`${donde}: falta 'clase'`);
    else if (!CLASES_CASO.includes(c.clase)) err(`${donde}: 'clase' fuera del set cerrado (${CLASES_CASO.join('|')}): ${JSON.stringify(c.clase)}`);

    if (!('veredicto' in c)) err(`${donde}: falta 'veredicto'`);
    else if (!VEREDICTOS.includes(c.veredicto)) err(`${donde}: 'veredicto' fuera del set cerrado: ${JSON.stringify(c.veredicto)}`);

    // mensaje_esperado: obligatorio SIEMPRE como campo. En rojo debe ser un
    // fragmento literal no vacío; en verde debe ser null DECLARADO — un campo
    // ausente es un olvido, un null es una declaración auditable.
    if (!('mensaje_esperado' in c)) err(`${donde}: falta 'mensaje_esperado'`);
    else if (c.veredicto === 'rojo' && (typeof c.mensaje_esperado !== 'string' || c.mensaje_esperado.trim() === '')) {
      err(`${donde}: 'mensaje_esperado' debe ser un fragmento literal no vacío en un caso rojo`);
    } else if (c.veredicto === 'verde' && c.mensaje_esperado !== null) {
      err(`${donde}: 'mensaje_esperado' debe ser null en un caso verde (no hay error que esperar)`);
    }

    if (!c.nota || String(c.nota).trim() === '') err(`${donde}: falta 'nota' (por qué existe este caso)`);

    // Clase P: la reformulación aceptable en forma R es obligatoria — es la
    // medida de CE-4 (CA-2): rechazar citando la regla Y decir cómo se dice bien.
    if (c.clase === 'P' && c.veredicto === 'rojo') {
      if (typeof c.reformulacion !== 'string' || c.reformulacion.trim() === '') {
        err(`${donde}: un caso de clase P rechazado debe declarar 'reformulacion' (la forma R aceptable)`);
      }
    }

    // documento: debe existir en el disco. Un corpus que apunta a un fichero
    // fantasma no es ejecutable, es una tabla en prosa con otro formato.
    if (!c.documento) err(`${donde}: falta 'documento'`);
    else if (!fs.existsSync(path.join(dir, c.documento))) {
      err(`${donde}: 'documento' no existe en el corpus: ${c.documento}`);
    }

    // cobertura / forma / sintaxis
    const cobs = Object.keys(COBERTURA_EXIGIDA);
    if (!('cobertura' in c)) err(`${donde}: falta 'cobertura'`);
    else if (!cobs.includes(c.cobertura) && c.cobertura !== COBERTURA_GRAMATICA) {
      err(`${donde}: 'cobertura' fuera de la lista cerrada de CA-5: ${JSON.stringify(c.cobertura)}`);
    }
    if (!('forma' in c)) err(`${donde}: falta 'forma' (null si el caso no lleva marcador)`);
    else if (c.forma !== null && !FORMAS.includes(c.forma)) err(`${donde}: 'forma' fuera del anexo B: ${JSON.stringify(c.forma)}`);
    if (!('sintaxis' in c)) err(`${donde}: falta 'sintaxis' (null si el caso no lleva marcador)`);
    else if (c.sintaxis !== null && !SINTAXIS.includes(c.sintaxis)) err(`${donde}: 'sintaxis' fuera del anexo B: ${JSON.stringify(c.sintaxis)}`);
    if ((c.forma === null) !== (c.sintaxis === null)) err(`${donde}: 'forma' y 'sintaxis' deben ser ambas null o ambas no-null`);

    for (const r of c.reglas_gramatica ?? []) {
      if (!(r in REGLAS_GRAMATICA)) err(`${donde}: regla de gramática desconocida '${r}'`);
    }
    if (c.mecanismo === 'M2' && c.cobertura !== 'M2-inventario-desconocido' && !c.inventario) {
      err(`${donde}: un caso M2 debe declarar el 'inventario' que afirma`);
    }
  }

  // --- casos.json: cobertura (CA-5) ------------------------------------------
  for (const [clave, veredictos] of Object.entries(COBERTURA_EXIGIDA)) {
    for (const v of veredictos) {
      const hay = (casos ?? []).some((c) => c.cobertura === clave && c.veredicto === v);
      if (!hay) err(`cobertura CA-5 incompleta: falta un caso ${v.toUpperCase()} para '${clave}'`);
    }
  }

  // --- casos.json: gramática del anexo B (CA-6) ------------------------------
  for (const f of FORMAS) {
    for (const s of SINTAXIS) {
      const hay = (casos ?? []).some((c) => c.forma === f && c.sintaxis === s);
      if (!hay) err(`gramática anexo B incompleta: la forma '${f}' no tiene ejemplo con sintaxis ${s}`);
    }
  }
  for (const r of Object.keys(REGLAS_GRAMATICA)) {
    const hay = (casos ?? []).some((c) => (c.reglas_gramatica ?? []).includes(r));
    if (!hay) err(`gramática anexo B incompleta: la regla ${r} (${REGLAS_GRAMATICA[r]}) no tiene caso`);
  }

  // --- inventario.json: anexo C ejecutable (CA-3) ----------------------------
  if (!Array.isArray(inventario)) err('inventario.json no es un array');
  const inv = Array.isArray(inventario) ? inventario : [];
  if (inv.length !== RECUENTO_RECONCILIADO) {
    err(`inventario.json tiene ${inv.length} entradas y el recuento reconciliado en el gate es ${RECUENTO_RECONCILIADO}`);
  }
  const porMecanismo = { M1: 0, M2: 0, M3: 0, ninguno: 0 };
  for (const [i, e] of inv.entries()) {
    const donde = `inventario[${i}]${e?.n ? ` (#${e.n})` : ''}`;
    for (const k of Object.keys(e ?? {})) {
      if (!CAMPOS_INVENTARIO.has(k)) err(`${donde}: campo no declarado '${k}'`);
    }
    if (!e?.donde) err(`${donde}: falta 'donde' (el fichero de la afirmación)`);
    if (!e?.afirmacion) err(`${donde}: falta 'afirmacion'`);

    // "exactamente una clase": ni ninguna, ni una lista.
    if (!('clase' in (e ?? {}))) err(`${donde}: carece de clase`);
    else if (Array.isArray(e.clase)) err(`${donde}: declara más de una clase (${e.clase.join(', ')}); debe ser exactamente una`);
    else if (!CLASES_INVENTARIO.includes(e.clase)) err(`${donde}: clase fuera del set cerrado: ${JSON.stringify(e.clase)}`);

    // "exactamente un mecanismo", del set cerrado.
    if (!('mecanismo' in (e ?? {}))) err(`${donde}: carece de mecanismo`);
    else if (Array.isArray(e.mecanismo)) err(`${donde}: declara más de un mecanismo; debe ser exactamente uno`);
    else if (!MECANISMOS.includes(e.mecanismo)) err(`${donde}: mecanismo fuera del set cerrado (${MECANISMOS.join('|')}): ${JSON.stringify(e.mecanismo)}`);
    else porMecanismo[e.mecanismo] += 1;

    if (e?.clase === 'fuera' && e?.mecanismo !== 'ninguno') {
      err(`${donde}: clase 'fuera' (juicio/intención/procedimiento) no puede declarar mecanismo ${e.mecanismo}`);
    }
    // Residual DECLARADO, no olvidado (CA-3).
    if (e?.mecanismo === 'ninguno') {
      if (e.residual !== true) err(`${donde}: mecanismo 'ninguno' obliga a residual: true (revisión humana)`);
      if (!e.motivo_residual) err(`${donde}: mecanismo 'ninguno' obliga a 'motivo_residual'`);
      if (e.caso != null) err(`${donde}: mecanismo 'ninguno' no puede apuntar a un caso del corpus`);
    } else {
      if (e?.residual) err(`${donde}: residual solo es legítimo con mecanismo 'ninguno'`);
      if (!e?.caso) err(`${donde}: debe apuntar al caso del corpus que la demuestra`);
      else if (!ids.has(e.caso)) err(`${donde}: apunta al caso inexistente '${e.caso}'`);
    }
  }
  for (const [m, n] of Object.entries(RECUENTO_POR_MECANISMO)) {
    if (porMecanismo[m] !== n) err(`inventario.json: ${porMecanismo[m]} entradas con mecanismo ${m}; el anexo C reconciliado dice ${n}`);
  }

  // --- inventarios.json: anexo D (CA-7) --------------------------------------
  if (!Array.isArray(registro)) err('inventarios.json no es un array');
  for (const [i, r] of (Array.isArray(registro) ? registro : []).entries()) {
    const donde = `inventarios[${i}]${r?.nombre ? ` (${r.nombre})` : ''}`;
    for (const k of Object.keys(r ?? {})) {
      if (!CAMPOS_REGISTRO.has(k)) err(`${donde}: campo no declarado '${k}'`);
    }
    if (!r?.nombre) err(`${donde}: falta 'nombre' canónico`);
    if (!r?.resolutor) err(`${donde}: falta 'resolutor' (el artefacto del árbol desde el que se calcula)`);
    if (!r?.medido) err(`${donde}: falta 'medido' (la cardinalidad va fechada o no es una medición)`);
    const tieneCard = Number.isInteger(r?.cardinalidad)
      || (r?.cardinalidad_por_parametro && Object.keys(r.cardinalidad_por_parametro).length > 0);
    if (!tieneCard) err(`${donde}: falta la cardinalidad medida`);
    if (!['autodescubrimiento', 'enumeracion-justificada'].includes(r?.adr011)) {
      err(`${donde}: 'adr011' debe ser 'autodescubrimiento' o 'enumeracion-justificada'`);
    }
    // ADR-011 §2: solo se enumera lo que no existe sin conocer la estructura del
    // repo. Cualquier otro inventario que se declare enumeración es un atajo.
    if (r?.adr011 === 'enumeracion-justificada' && !/^(checks|hooks-)/.test(r?.nombre ?? '')) {
      err(`${donde}: enumeración no justificada por ADR-011 §2 (solo 'checks' y 'hooks-<adaptador>')`);
    }
    // CA-7: cada inventario del registro tiene al menos un caso M2 en el corpus.
    const casa = (n) => (r?.patron ? new RegExp(r.patron).test(n) : n === r?.nombre);
    if (!(casos ?? []).some((c) => c.mecanismo === 'M2' && c.inventario && casa(c.inventario))) {
      err(`inventario '${r?.nombre}' del anexo D no tiene ningún caso M2 en el corpus (CA-7)`);
    }
  }

  // --- coherencia casos ↔ registro -------------------------------------------
  const conocido = (n) => (registro ?? []).some((r) => (r.patron ? new RegExp(r.patron).test(n) : r.nombre === n));
  for (const c of casos ?? []) {
    if (c.mecanismo !== 'M2' || !c.inventario) continue;
    const esDesconocido = c.cobertura === 'M2-inventario-desconocido';
    if (!esDesconocido && !conocido(c.inventario)) {
      err(`casos (${c.id}): nombra el inventario '${c.inventario}', que no está en el registro del anexo D`);
    }
  }

  // --- arbol.json ------------------------------------------------------------
  if (!Array.isArray(arbol?.ficheros) || arbol.ficheros.length === 0) {
    err('arbol.json: falta la lista de ficheros del árbol mínimo simulado');
  }
  for (const p of Object.keys(arbol?.contenidos ?? {})) {
    if (!arbol.ficheros.includes(p)) err(`arbol.json: 'contenidos' declara ${p}, que no está en 'ficheros'`);
  }

  return { ok: errores.length === 0, errores };
}
