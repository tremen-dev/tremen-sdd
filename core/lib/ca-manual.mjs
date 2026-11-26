// Lector ÚNICO del modelo de CA manual (ADR-020, SPEC-030). Es el único módulo
// del núcleo que reconoce los CA de una spec, la marca `[manual]`, la ficha de
// cada CA y las marcas de la columna Estado del ledger. valida.mjs y estado.mjs
// lo importan; ninguno de los dos tiene su propio reconocimiento.
//
// Devuelve datos y errores con CÓDIGO, no texto: el texto lo pone quien informa,
// desde su catálogo de mensajes (ADR-016).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esPersona } from './persona.mjs';

// --- Texto que no cuenta: comentarios HTML y bloques de código (ADR-020 §2) ---

// Devuelve las líneas de `texto` con el contenido de los comentarios HTML y de
// los bloques de código (``` o ~~~, también sangrados) sustituido por blancos.
// Conserva el número de líneas, para que los errores puedan dar la línea real.
export function lineasVisibles(texto) {
  const lineas = texto.split(/\r?\n/);
  const out = [];
  let enComentario = false;
  let valla = null; // la valla que abrió el bloque de código, p. ej. '```'
  for (const linea of lineas) {
    if (valla) {
      const cierre = linea.match(/^\s*(`{3,}|~{3,})\s*$/);
      if (cierre && cierre[1][0] === valla[0] && cierre[1].length >= valla.length) valla = null;
      out.push('');
      continue;
    }
    if (!enComentario) {
      const apertura = linea.match(/^\s*(`{3,}|~{3,})/);
      if (apertura) {
        valla = apertura[1];
        out.push('');
        continue;
      }
    }
    let visible = '';
    let resto = linea;
    while (resto.length) {
      if (enComentario) {
        const fin = resto.indexOf('-->');
        if (fin === -1) { resto = ''; break; }
        resto = resto.slice(fin + 3);
        enComentario = false;
      } else {
        const ini = resto.indexOf('<!--');
        if (ini === -1) { visible += resto; break; }
        visible += resto.slice(0, ini);
        resto = resto.slice(ini + 4);
        enComentario = true;
      }
    }
    out.push(visible);
  }
  return out;
}

// --- CA y ficha (ADR-020 §1, §2) ---

// Las dos formas de la línea de un CA: encabezado (`### CA-3 [manual] — …`) y
// viñeta (`- **CA-3** [manual]: …`). En la viñeta, el id puede ir solo en la
// negrita o abrir un texto en negrita (`- **CA-3 — Título**`).
const CA_ENCABEZADO = /^\s{0,3}#{1,6}\s+(CA-M?\d+)(?![\w-])(\s*\[manual\])?/;
const CA_VINETA = /^\s*[-*+]\s+\*\*(CA-M?\d+)(?![\w-])[^*]*\*\*(\s*\[manual\])?/;
// Una línea de ficha: `` - `clave`: valor `` o `` - `clave` [entorno]: valor ``.
const LINEA_FICHA = /^\s*[-*+]\s+`([^`]+)`\s*(?:\[([^\]]*)\])?\s*:(.*)$/;

export const ID_CA_M = /^CA-M\d+$/;

export const EJECUTA = ['humano', 'orquestador', 'implementador', 'verificador'];
export const BLOQUEA_HECHO = ['sí', 'si', 'no'];
export const CUANDO = ['codigo', 'tras-merge'];
// Claves de la ficha (lista cerrada) y en qué CA se admiten.
const CLAVES = {
  ejecuta: { manual: true, automatico: false, repetible: false },
  'bloquea-hecho': { manual: true, automatico: true, repetible: false },
  comprobacion: { manual: true, automatico: false, repetible: true },
  precondiciones: { manual: true, automatico: false, repetible: true },
  consentimiento: { manual: true, automatico: false, repetible: true },
  manos: { manual: true, automatico: false, repetible: true },
  cuando: { manual: true, automatico: false, repetible: false },
  'depende-de': { manual: true, automatico: true, repetible: false },
};
const OBLIGATORIAS_MANUAL = ['ejecuta', 'bloquea-hecho', 'comprobacion'];

function reconocerCA(linea) {
  const m = linea.match(CA_ENCABEZADO) ?? linea.match(CA_VINETA);
  return m ? { id: m[1], manual: Boolean(m[2]) } : null;
}

// Lee los CA del cuerpo de una spec, en orden. Cada CA trae su ficha ya
// interpretada (con los valores por defecto de ADR-020 §2) y sus entradas en
// crudo, que son lo que valida erroresFicha.
export function leerCAs(texto) {
  const lineas = lineasVisibles(texto);
  const cas = [];
  for (let i = 0; i < lineas.length; i++) {
    const ca = reconocerCA(lineas[i]);
    if (!ca) continue;
    const entradas = [];
    let j = i + 1;
    while (j < lineas.length && !lineas[j].trim()) j++;
    for (; j < lineas.length; j++) {
      const m = lineas[j].match(LINEA_FICHA);
      if (!m || reconocerCA(lineas[j])) break;
      entradas.push({ clave: m[1].trim(), entorno: m[2] === undefined ? null : m[2].trim(), valor: m[3].trim(), linea: j + 1 });
    }
    cas.push(interpretar({ ...ca, linea: i + 1, entradas }));
  }
  return cas;
}

function interpretar(ca) {
  const valores = (clave) => ca.entradas.filter((e) => e.clave === clave);
  const primero = (clave) => valores(clave)[0]?.valor;
  const bloquea = primero('bloquea-hecho')?.toLowerCase();
  const cuando = primero('cuando');
  const depende = primero('depende-de');
  return {
    ...ca,
    ejecuta: primero('ejecuta') ?? null,
    // Lo que no es `no` bloquea: el valor por defecto es el seguro (ADR-020 §2).
    bloqueaHecho: bloquea !== 'no',
    cuando: cuando ?? 'codigo',
    precondiciones: valores('precondiciones').map((e) => e.valor),
    consentimiento: valores('consentimiento').map((e) => e.valor),
    manos: valores('manos').map((e) => e.valor),
    comprobaciones: valores('comprobacion').map((e) => ({ entorno: e.entorno, texto: e.valor })),
    dependeDe: depende ? depende.split(',').map((s) => s.trim()).filter(Boolean) : [],
  };
}

// «Una spec del modelo»: al menos un CA marcado `[manual]` (ADR-020 §11).
export function esSpecDelModelo(cas) {
  return cas.some((c) => c.manual);
}

// Errores de ficha de una spec del modelo: { ca, clave, codigo, vars }. No para
// en el primero. Solo tiene sentido en una spec del modelo (ADR-020 §11): quien
// llama decide si aplicarlo.
export function erroresFicha(cas) {
  const errores = [];
  const err = (ca, clave, codigo, vars = {}) => errores.push({ ca: ca.id, clave, codigo, vars });
  const ids = new Set(cas.map((c) => c.id));
  for (const ca of cas) {
    if (!ca.manual && ID_CA_M.test(ca.id)) err(ca, '[manual]', 'ca-m-sin-marca');
    const vistas = new Set();
    for (const e of ca.entradas) {
      const def = CLAVES[e.clave];
      if (!def) { err(ca, e.clave, 'clave-desconocida', { admitidas: Object.keys(CLAVES).join(', ') }); continue; }
      if (!(ca.manual ? def.manual : def.automatico)) { err(ca, e.clave, 'solo-manual'); continue; }
      if (!def.repetible && vistas.has(e.clave)) { err(ca, e.clave, 'repetida'); continue; }
      vistas.add(e.clave);
      const lista = { ejecuta: EJECUTA, 'bloquea-hecho': BLOQUEA_HECHO, cuando: CUANDO }[e.clave];
      if (lista && !lista.includes(e.valor.toLowerCase())) {
        err(ca, e.clave, 'valor-no-admitido', { valor: e.valor, admitidos: lista.join(', ') });
      }
    }
    if (ca.manual) {
      for (const clave of OBLIGATORIAS_MANUAL) {
        if (!ca.entradas.some((e) => e.clave === clave)) err(ca, clave, 'falta');
      }
      if (ca.consentimiento.length && ca.ejecuta && !['humano', 'orquestador'].includes(ca.ejecuta)) {
        err(ca, 'consentimiento', 'consentimiento-ejecuta', { valor: ca.ejecuta });
      }
      if (ca.cuando === 'tras-merge' && ca.bloqueaHecho) err(ca, 'cuando', 'tras-merge-bloquea');
      const entornos = new Set();
      let sinEntorno = 0;
      for (const c of ca.comprobaciones) {
        if (!c.texto) err(ca, 'comprobacion', 'comprobacion-vacia', { entorno: c.entorno ?? '' });
        if (c.entorno === null) {
          if (++sinEntorno === 2) err(ca, 'comprobacion', 'comprobacion-ambigua');
        } else if (entornos.has(c.entorno)) {
          err(ca, 'comprobacion', 'comprobacion-repetida', { entorno: c.entorno });
        } else entornos.add(c.entorno);
      }
    }
    for (const dep of ca.dependeDe) {
      if (dep === ca.id) err(ca, 'depende-de', 'dependencia-propia', { dep });
      else if (!ids.has(dep)) err(ca, 'depende-de', 'dependencia-inexistente', { dep });
    }
  }
  for (const ciclo of ciclos(cas)) {
    err({ id: ciclo[0] }, 'depende-de', 'dependencia-ciclo', { ciclo: ciclo.join(' → ') });
  }
  return errores;
}

// Ciclos de depende-de (sin contar la autodependencia, que tiene su error).
// Cada ciclo se informa una vez, empezando por el CA que aparece antes.
function ciclos(cas) {
  const grafo = new Map(cas.map((c) => [c.id, c.dependeDe.filter((d) => d !== c.id)]));
  const orden = new Map(cas.map((c, i) => [c.id, i]));
  const encontrados = new Map();
  const visitar = (id, camino) => {
    for (const dep of grafo.get(id) ?? []) {
      const k = camino.indexOf(dep);
      if (k !== -1) {
        const ciclo = camino.slice(k);
        const inicio = ciclo.reduce((a, b) => (orden.get(a) <= orden.get(b) ? a : b));
        const rot = [...ciclo.slice(ciclo.indexOf(inicio)), ...ciclo.slice(0, ciclo.indexOf(inicio))];
        const clave = [...rot].sort().join(',');
        if (!encontrados.has(clave)) encontrados.set(clave, [...rot, inicio]);
      } else if (grafo.has(dep)) visitar(dep, [...camino, dep]);
    }
  };
  for (const c of cas) visitar(c.id, [c.id]);
  return [...encontrados.values()];
}

// --- Matriz del ledger y marcas de Estado (ADR-020 §4) ---

// El ledger de una spec vive a su lado: SPEC-NNN-slug.md -> SPEC-NNN-slug.ledger.md.
export const rutaLedger = (rutaSpec) => rutaSpec.replace(/\.md$/, '.ledger.md');

const celdas = (linea) => linea.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
const ID_CA = /^CA-M?\d+$/;
const idDeCelda = (celda) => (celda ?? '').replace(/\*/g, '').trim();

// --- Secciones del ledger (SPEC-032 CA-1, F-SPEC-030-2) ---
//
// La matriz y la tabla de evidencia se localizan por el título de su sección de
// nivel 2, no por el orden de las tablas. Una sección acaba en el siguiente
// encabezado de nivel 1 o 2. Los títulos (y la cabecera de la evidencia) salen
// de la plantilla del ledger de cada idioma: aquí no hay una segunda copia.

const PLANTILLAS = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'templates');
const IDIOMA_ORIGEN = 'es';
const ENCABEZADO = /^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
const esLineaTabla = (l) => /^\s*\|/.test(l);

// Secciones de nivel 2: [{ titulo, desde, hasta }] (índices de línea, hasta exclusivo).
function secciones(lineas) {
  const out = [];
  let actual = null;
  lineas.forEach((l, i) => {
    const m = l.match(ENCABEZADO);
    if (!m || m[1].length > 2) return;
    if (actual) actual.hasta = i;
    actual = m[1].length === 2 ? { titulo: m[2].trim(), desde: i + 1, hasta: lineas.length } : null;
    if (actual) out.push(actual);
  });
  return out;
}

// Tablas de [desde, hasta): { linea (1-based, la cabecera), cabecera, filas: [{ celdas, linea }] }.
// La segunda línea de cada tabla es el separador.
function tablas(lineas, desde, hasta) {
  const out = [];
  for (let i = desde; i < hasta; i++) {
    if (!esLineaTabla(lineas[i])) continue;
    const t = { linea: i + 1, cabecera: celdas(lineas[i]), filas: [] };
    let j = i + 1;
    for (; j < hasta && esLineaTabla(lineas[j]); j++) {
      if (j > i + 1) t.filas.push({ celdas: celdas(lineas[j]), linea: j + 1 });
    }
    out.push(t);
    i = j;
  }
  return out;
}

const cacheTitulos = new Map();

// { matriz, evidencia, cabeceraEvidencia } de la plantilla del ledger del idioma
// (core/templates/<idioma>/artefactos/SPEC.ledger.md; si no existe, la de `es`).
// La matriz es la primera sección de la plantilla que trae una tabla; la
// evidencia, la segunda (CA-3: va detrás de la matriz).
export function titulosLedger(idioma = IDIOMA_ORIGEN) {
  if (cacheTitulos.has(idioma)) return cacheTitulos.get(idioma);
  const ruta = (i) => path.join(PLANTILLAS, i, 'artefactos', 'SPEC.ledger.md');
  const fichero = fs.existsSync(ruta(idioma)) ? ruta(idioma) : ruta(IDIOMA_ORIGEN);
  const lineas = lineasVisibles(fs.readFileSync(fichero, 'utf8'));
  const conTabla = secciones(lineas)
    .map((s) => ({ titulo: s.titulo, tablas: tablas(lineas, s.desde, s.hasta) }))
    .filter((s) => s.tablas.length);
  const titulos = {
    matriz: conTabla[0]?.titulo ?? null,
    evidencia: conTabla[1]?.titulo ?? null,
    cabeceraEvidencia: conTabla[1]?.tablas[0].cabecera ?? [],
  };
  cacheTitulos.set(idioma, titulos);
  return titulos;
}

// Columnas de una fila de evidencia, en el orden de la cabecera (ADR-020 §8).
const CAMPOS_EVIDENCIA = ['ca', 'entorno', 'ejecuto', 'observado', 'commit', 'fecha', 'notas'];

// Lee un ledger: { matriz, evidencia, errores }.
//   matriz:    { linea, filas: [{ id, celdas, celda, linea }] } o null si no hay
//              una única tabla `CA` en la sección de la matriz. El Estado es la
//              última columna.
//   evidencia: { linea, filas: [{ ca, entorno, ejecuto, observado, commit,
//              fecha, notas, celdas, linea }] } o null si no hay sección, hay
//              más de una tabla o su cabecera no es la de la plantilla.
//   errores:   [{ codigo, vars }] del ledger: sin-matriz, matriz-ambigua,
//              fila-repetida, evidencia-ambigua, evidencia-cabecera.
export function leerLedger(texto, idioma = IDIOMA_ORIGEN) {
  const t = titulosLedger(idioma);
  const lineas = lineasVisibles(texto);
  const secs = secciones(lineas);
  const tablasDe = (titulo) => secs.filter((s) => s.titulo === titulo).flatMap((s) => tablas(lineas, s.desde, s.hasta));
  const errores = [];

  let matriz = null;
  const tablasMatriz = tablasDe(t.matriz).filter((x) => x.cabecera[0] === 'CA');
  if (!tablasMatriz.length) errores.push({ codigo: 'sin-matriz', vars: { titulo: t.matriz } });
  else if (tablasMatriz.length > 1) {
    errores.push({ codigo: 'matriz-ambigua', vars: { titulo: t.matriz, lineas: tablasMatriz.map((x) => x.linea).join(', ') } });
  } else {
    const filas = tablasMatriz[0].filas
      .map((f) => ({ id: idDeCelda(f.celdas[0]), celdas: f.celdas, celda: f.celdas.at(-1), linea: f.linea }))
      .filter((f) => ID_CA.test(f.id));
    matriz = { linea: tablasMatriz[0].linea, filas };
    for (const [id, repetidas] of agrupar(filas, (f) => f.id)) {
      if (repetidas.length > 1) errores.push({ codigo: 'fila-repetida', vars: { ca: id, lineas: repetidas.map((f) => f.linea).join(', ') } });
    }
  }

  let evidencia = null;
  const tablasEvidencia = tablasDe(t.evidencia);
  const esperada = `| ${t.cabeceraEvidencia.join(' | ')} |`;
  if (tablasEvidencia.length > 1) {
    errores.push({ codigo: 'evidencia-ambigua', vars: { titulo: t.evidencia, lineas: tablasEvidencia.map((x) => x.linea).join(', ') } });
  } else if (tablasEvidencia.length === 1) {
    const tabla = tablasEvidencia[0];
    if (tabla.cabecera.join('|') !== t.cabeceraEvidencia.join('|')) {
      errores.push({ codigo: 'evidencia-cabecera', vars: { linea: tabla.linea, esperada, encontrada: `| ${tabla.cabecera.join(' | ')} |` } });
    } else {
      evidencia = {
        linea: tabla.linea,
        filas: tabla.filas.map((f) => ({
          ...Object.fromEntries(CAMPOS_EVIDENCIA.map((c, i) => [c, f.celdas[i] ?? ''])),
          ca: idDeCelda(f.celdas[0]), celdas: f.celdas, linea: f.linea,
        })),
      };
    }
  }
  return { matriz, evidencia, errores, columnasEvidencia: t.cabeceraEvidencia };
}

function agrupar(lista, clave) {
  const m = new Map();
  for (const x of lista) m.set(clave(x), [...(m.get(clave(x)) ?? []), x]);
  return m;
}

const BASES = ['✅', '⚠️', '🚧', '❌', 'n-a', '⏳'];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Analiza una celda de Estado: { base, calificadores, errores: [{codigo, vars}] }.
export function analizarEstado(celda) {
  const errores = [];
  const texto = (celda ?? '').trim().replace(/^⚠(?!️)/, '⚠️');
  const base = BASES.find((b) => texto.startsWith(b)) ?? null;
  if (!base) return { base: null, calificadores: [], errores: [{ codigo: 'marca-desconocida', vars: {} }] };
  let resto = texto.slice(base.length);
  const calificadores = [];
  for (;;) {
    const m = resto.match(/^\s*\[([^\]]*)\]/);
    if (!m) break;
    calificadores.push(m[1].trim());
    resto = resto.slice(m[0].length);
  }
  if (resto.trim()) errores.push({ codigo: 'texto-suelto', vars: { texto: resto.trim() } });
  const vistos = new Set();
  const leidos = [];
  for (const raw of calificadores) {
    const m = raw.match(/^([^:]+?)\s*(?::\s*(.*))?$/);
    const tipo = (m?.[1] ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const args = m?.[2];
    if (!['desviacion', 'salvedad', 'confirmado'].includes(tipo) || (tipo === 'desviacion' && args !== undefined)) {
      errores.push({ codigo: 'calificador-desconocido', vars: { calificador: raw } });
      continue;
    }
    if (base !== '✅') errores.push({ codigo: 'calificador-sin-cierre', vars: { calificador: raw } });
    if (vistos.has(tipo)) errores.push({ codigo: 'calificador-repetido', vars: { calificador: raw } });
    vistos.add(tipo);
    const cal = { tipo };
    if (tipo !== 'desviacion') {
      const coma = (args ?? '').lastIndexOf(',');
      cal.persona = (coma === -1 ? args ?? '' : args.slice(0, coma)).trim();
      cal.fecha = coma === -1 ? '' : args.slice(coma + 1).trim();
      if (!esPersona(cal.persona)) errores.push({ codigo: 'no-persona', vars: { calificador: raw, persona: cal.persona } });
      if (!FECHA.test(cal.fecha)) errores.push({ codigo: 'fecha', vars: { calificador: raw } });
    }
    leidos.push(cal);
  }
  return { base, calificadores: leidos, errores };
}

// Errores de marcas de un ledger de una spec del modelo: { ca, celda, codigo, vars }.
// `ledger` es lo que devuelve leerLedger.
export function erroresMarcas(cas, ledger) {
  const manuales = new Set(cas.filter((c) => c.manual).map((c) => c.id));
  const errores = [];
  for (const { id, celda } of ledger.matriz?.filas ?? []) {
    const a = analizarEstado(celda);
    for (const e of a.errores) errores.push({ ca: id, celda, ...e });
    if (a.base === '⏳' && !manuales.has(id)) errores.push({ ca: id, celda, codigo: 'pendiente-no-manual', vars: {} });
  }
  return errores;
}

// ¿Cierra la celda un CA bloqueante? ✅ (con calificadores válidos) o n-a (ADR-020 §5).
export function estadoCierra(celda) {
  const a = analizarEstado(celda);
  return a.errores.length === 0 && (a.base === '✅' || a.base === 'n-a');
}

// --- Evidencia de los CA manuales (ADR-020 §8, SPEC-032 CA-4, CA-5) ---

const COMMIT = /^[0-9a-f]{7,40}$/i;
// El entorno de una fila: vacío o `-` es la comprobación sin etiqueta (null).
const entornoDeFila = (e) => (e === '' || e === '-' ? null : e);
const etiquetaDe = (e) => (e === null ? '(vacío o -)' : e);

// Errores de las filas de evidencia: { ca, linea, columna, codigo, vars }. No para
// en el primero. `columna` es el nombre de la columna en la plantilla del idioma.
export function erroresEvidencia(cas, ledger) {
  const porId = new Map(cas.map((c) => [c.id, c]));
  const col = (i) => ledger.columnasEvidencia?.[i] ?? CAMPOS_EVIDENCIA[i];
  const errores = [];
  for (const f of ledger.evidencia?.filas ?? []) {
    const err = (i, codigo, vars = {}) => errores.push({ ca: f.ca, linea: f.linea, columna: col(i), codigo, vars });
    const ca = porId.get(f.ca);
    if (!ca) err(0, 'ca-inexistente');
    else if (!ca.manual) err(0, 'ca-no-manual');
    else {
      const admitidos = ca.comprobaciones.map((c) => c.entorno);
      if (!admitidos.includes(entornoDeFila(f.entorno))) {
        err(1, 'entorno', { valor: f.entorno, admitidos: admitidos.map(etiquetaDe).join(', ') });
      }
    }
    if (!f.ejecuto || f.ejecuto === 'desconocido') err(2, 'ejecuto', { valor: f.ejecuto });
    if (!f.observado) err(3, 'observado');
    if (!COMMIT.test(f.commit)) err(4, 'commit', { valor: f.commit });
    if (!FECHA.test(f.fecha)) err(5, 'fecha', { valor: f.fecha });
  }
  return errores;
}

// CA manuales en ✅ sin su evidencia: [{ ca, entorno }], uno por comprobación sin
// una fila de evidencia válida (ADR-020 §4: «se cumplió cada comprobación y su
// evidencia está registrada»). Un CA en otro Estado no exige evidencia.
export function faltaEvidencia(cas, ledger) {
  const conError = new Set(erroresEvidencia(cas, ledger).map((e) => e.linea));
  const validas = (ledger.evidencia?.filas ?? []).filter((f) => !conError.has(f.linea));
  const faltan = [];
  const vistos = new Set();
  for (const ca of cas.filter((c) => c.manual)) {
    const enCierre = (ledger.matriz?.filas ?? []).some((f) => f.id === ca.id && analizarEstado(f.celda).base === '✅');
    if (!enCierre || vistos.has(ca.id)) continue;
    vistos.add(ca.id);
    for (const { entorno } of ca.comprobaciones) {
      if (!validas.some((f) => f.ca === ca.id && entornoDeFila(f.entorno) === entorno)) faltan.push({ ca: ca.id, entorno: etiquetaDe(entorno) });
    }
  }
  return faltan;
}

// Filas de la matriz de un CA (vacío si no hay matriz).
const filasDe = (ledger, id) => (ledger.matriz?.filas ?? []).filter((f) => f.id === id);

// ¿Está cerrado el CA en la matriz? Una sola fila y su celda cierra.
export function caCerrado(ledger, id) {
  const filas = filasDe(ledger, id);
  return filas.length === 1 && estadoCierra(filas[0].celda);
}

// Lo que impide `hecho` a una spec del modelo (ADR-020 §5, SPEC-032 CA-1, CA-2,
// CA-5): [{ codigo, ca?, celda?, entorno?, vars? }] con codigo
//   sin-matriz | matriz-ambigua (del ledger) · repetida (un id con varias filas)
//   sin-fila | abierto (un CA bloqueante sin cerrar) · sin-evidencia (un CA
//   manual bloqueante en ✅ sin evidencia de una comprobación).
export function bloqueosHecho(cas, ledger) {
  const deLedger = ledger.errores.filter((e) => ['sin-matriz', 'matriz-ambigua'].includes(e.codigo));
  if (deLedger.length) return deLedger.map((e) => ({ codigo: e.codigo, vars: e.vars }));
  const bloqueos = ledger.errores.filter((e) => e.codigo === 'fila-repetida')
    .map((e) => ({ codigo: 'repetida', ca: e.vars.ca, vars: e.vars }));
  const repetidos = new Set(bloqueos.map((b) => b.ca));
  const bloqueantes = cas.filter((c) => c.bloqueaHecho);
  for (const c of bloqueantes) {
    if (repetidos.has(c.id)) continue;
    const filas = filasDe(ledger, c.id);
    if (!filas.length) bloqueos.push({ codigo: 'sin-fila', ca: c.id, celda: null });
    else if (!estadoCierra(filas[0].celda)) bloqueos.push({ codigo: 'abierto', ca: c.id, celda: filas[0].celda });
  }
  const ids = new Set(bloqueantes.map((c) => c.id));
  for (const f of faltaEvidencia(cas, ledger)) {
    if (ids.has(f.ca) && !repetidos.has(f.ca)) bloqueos.push({ codigo: 'sin-evidencia', ca: f.ca, entorno: f.entorno });
  }
  return bloqueos;
}

// CA manuales bloqueantes sin cerrar (ADR-021): cualquier Estado que no cierre
// según estadoCierra, también sin fila o con la fila repetida. Ids, en orden.
export function manualesSinCerrar(cas, ledger) {
  return cas.filter((c) => c.manual && c.bloqueaHecho && !caCerrado(ledger, c.id)).map((c) => c.id);
}

// ¿Tiene el CA entrada en el registro externo? Una misma línea con el id de la
// spec y el del CA, los dos como palabras completas (ADR-021 §2).
export function enRegistro(texto, idSpec, idCa) {
  // Los ids son letras, dígitos y guiones: no llevan metacaracteres de regex.
  const palabra = (id) => new RegExp(`(?<![A-Za-z0-9_])${id}(?![A-Za-z0-9_])`);
  const reSpec = palabra(idSpec);
  const reCa = palabra(idCa);
  return texto.split(/\r?\n/).some((l) => reSpec.test(l) && reCa.test(l));
}
