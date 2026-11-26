// Lector ÚNICO del modelo de CA manual (ADR-020, SPEC-030). Es el único módulo
// del núcleo que reconoce los CA de una spec, la marca `[manual]`, la ficha de
// cada CA y las marcas de la columna Estado del ledger. valida.mjs y estado.mjs
// lo importan; ninguno de los dos tiene su propio reconocimiento.
//
// Devuelve datos y errores con CÓDIGO, no texto: el texto lo pone quien informa,
// desde su catálogo de mensajes (ADR-016).
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

// Filas de la matriz de CA del ledger: la primera tabla cuya cabecera empieza por
// `CA`. El Estado es la última columna. Devuelve Map id -> { celda, linea }.
export function leerMatriz(texto) {
  const lineas = lineasVisibles(texto);
  const filas = new Map();
  for (let i = 0; i < lineas.length; i++) {
    if (!/^\s*\|/.test(lineas[i]) || celdas(lineas[i])[0] !== 'CA') continue;
    for (let j = i + 2; j < lineas.length && /^\s*\|/.test(lineas[j]); j++) {
      const fila = celdas(lineas[j]);
      const id = fila[0].replace(/\*/g, '').trim();
      if (/^CA-M?\d+$/.test(id) && !filas.has(id)) filas.set(id, { celda: fila.at(-1), linea: j + 1 });
    }
    break;
  }
  return filas;
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
export function erroresMarcas(cas, matriz) {
  const manuales = new Set(cas.filter((c) => c.manual).map((c) => c.id));
  const errores = [];
  for (const [id, { celda }] of matriz) {
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

// CA bloqueantes que impiden `hecho`: [{ ca, celda }] (celda null: falta la fila).
export function bloqueosHecho(cas, matriz) {
  return cas.filter((c) => c.bloqueaHecho)
    .filter((c) => !matriz.has(c.id) || !estadoCierra(matriz.get(c.id).celda))
    .map((c) => ({ ca: c.id, celda: matriz.get(c.id)?.celda ?? null }));
}
