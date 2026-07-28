// ORÁCULO del corpus de afirmaciones (SPEC-018 / ADR-012).
//
// POR QUÉ EXISTE. La ronda 1 del verificador encontró que los veredictos del
// corpus estaban DECLARADOS, no derivados: se podía cambiar el árbol simulado
// —añadir un rol, quitar un adaptador— y los 30 tests seguían en verde. Un corpus
// así no es RED ejecutable: es una tabla en prosa con tests alrededor, que valida
// que está bien escrita y no que dice la verdad. Este módulo ata cada veredicto
// al árbol: si el árbol se mueve, los veredictos se mueven.
//
// QUÉ NO ES. No es el check de coherencia docs↔repo de la spec #2. No recorre
// `docs/fundacion/**` por autodescubrimiento, no aplica la tabla de extras
// declarados de `README.md`, no emite mensajes de usuario nombrando fichero /
// enunciado / clase, no declara a quién ha mirado (ADR-011 §6), no está cableado
// en `tools/check.mjs` ni en CI, y no pretende ser robusto sobre Markdown
// arbitrario: solo sobre los 25 documentos-ejemplo del corpus. Lo que resuelve es
// la GRAMÁTICA del anexo B —que SPEC-018 posee por CA-6, «la spec #2 no decide
// sintaxis»— y los RESOLUTORES del anexo D, para poder afirmar que un veredicto
// declarado es derivable. Todo lo demás sigue siendo trabajo de la spec #2.
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Resolutores (anexo D): del árbol a los miembros de un inventario.
// ---------------------------------------------------------------------------

const dirsBajo = (ficheros, base) => [...new Set(ficheros
  .filter((f) => f.startsWith(base))
  .map((f) => f.slice(base.length).split('/')[0])
  .filter(Boolean))].sort();

const ficherosBajo = (ficheros, base) => ficheros
  .filter((f) => f.startsWith(base) && !f.slice(base.length).includes('/'))
  .map((f) => f.slice(base.length)).sort();

// Un hook es lo que DECLARA EL MANIFIESTO del adaptador, no lo que hay suelto en
// un directorio (decisión del gate, 2026-07-29). El manifiesto es la fuente de
// verdad de qué ES un hook; contar ficheros depende de una convención de nombres
// que nadie verifica, y devolvía 4 donde la prosa correcta dice tres.
const MANIFIESTOS = [
  { fichero: 'hooks/hooks.json', lee: (txt) => {
    const doc = JSON.parse(txt);
    const cmds = [];
    for (const evento of Object.values(doc.hooks ?? {})) {
      for (const grupo of evento ?? []) {
        for (const h of grupo.hooks ?? []) if (h.command) cmds.push(h.command);
      }
    }
    return cmds;
  } },
  { fichero: 'hooks/hooks.toml', lee: (txt) => (txt.match(/^\s*command\s*=\s*"(.*)"\s*$/gm) ?? [])
    .map((l) => l.replace(/^\s*command\s*=\s*"/, '').replace(/"\s*$/, '')) },
  { fichero: 'opencode.json', lee: (txt) => JSON.parse(txt).plugin ?? [] },
];

const nombreDeComando = (cmd) => {
  const m = String(cmd).replace(/\\+/g, '').match(/([\w.-]+)\.(mjs|js|cjs)/g);
  return m ? path.basename(m[m.length - 1], path.extname(m[m.length - 1])) : null;
};

export function hooksDeclarados(arbol, adaptador) {
  const base = `adapters/${adaptador}/`;
  for (const m of MANIFIESTOS) {
    const rel = base + m.fichero;
    if (!arbol.ficheros.includes(rel)) continue;
    const txt = arbol.contenidos?.[rel];
    if (txt == null) return [];
    return [...new Set(m.lee(txt).map(nombreDeComando).filter(Boolean))].sort();
  }
  return [];
}

// Devuelve { miembros, cardinalidad } de un inventario, calculados SOBRE EL ÁRBOL.
export function resuelveInventario(nombre, arbol, registro) {
  const entrada = registro.find((r) => (r.patron ? new RegExp(r.patron).test(nombre) : r.nombre === nombre));
  if (!entrada) return null;
  let miembros;
  switch (entrada.criterio) {
    case 'directorios':
      miembros = dirsBajo(arbol.ficheros, entrada.base);
      break;
    case 'ficheros':
      miembros = ficherosBajo(arbol.ficheros, entrada.base)
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.replace(/\.md$/, ''))
        .filter((f) => !f.startsWith('_'));
      break;
    case 'pasos-de-PASOS': {
      const txt = arbol.contenidos?.[entrada.base] ?? '';
      miembros = [...new Set([...txt.matchAll(/tools\/checks\/([\w-]+)\.mjs/g)].map((m) => m[1]))].sort();
      break;
    }
    case 'cabeceras': {
      const txt = arbol.contenidos?.[entrada.base] ?? '';
      miembros = (txt.match(/^- \*\*RN-\d{2} —/gm) ?? []).map((h) => h.slice(5, 10));
      break;
    }
    case 'manifiesto': {
      const adaptador = nombre.replace(/^hooks-/, '');
      miembros = hooksDeclarados(arbol, adaptador);
      break;
    }
    default:
      return null;
  }
  return { nombre: entrada.nombre, miembros, cardinalidad: miembros.length };
}

// ---------------------------------------------------------------------------
// Superficie de M1: qué artefactos y qué rutas existen en el árbol.
// ---------------------------------------------------------------------------

export function artefactos(arbol) {
  const ids = new Set();
  for (const f of arbol.ficheros) {
    for (const m of f.matchAll(/\b(ADR|SPEC|EPIC|TASK)-(\d{3})\b/g)) ids.add(`${m[1]}-${m[2]}`);
  }
  const reglas = arbol.contenidos?.['docs/fundacion/reglas.md'] ?? '';
  for (const m of reglas.matchAll(/\bRN-(\d{2})\b/g)) ids.add(`RN-${m[1]}`);
  return ids;
}

export function rutas(arbol) {
  const set = new Set(arbol.ficheros);
  for (const f of arbol.ficheros) {
    const partes = f.split('/');
    for (let i = 1; i < partes.length; i += 1) {
      set.add(partes.slice(0, i).join('/') + '/');
      set.add(partes.slice(0, i).join('/'));
    }
  }
  return set;
}

// ---------------------------------------------------------------------------
// Gramática del anexo B: marcadores. SPEC-018 la posee (CA-6).
// ---------------------------------------------------------------------------

const RE_MARCADOR = /<!--\s*(\/?)sdd:(cifra|inventario|volatil-ok)([^>]*?)-->/g;

export function parseMarcadores(texto) {
  const marcadores = [];
  const errores = [];
  const pila = [];
  for (const m of texto.matchAll(RE_MARCADOR)) {
    const [crudo, cierre, tipo, restoCrudo] = m;
    const resto = restoCrudo.trim();
    const marcador = { tipo, cierre: cierre === '/', arg: resto, inicio: m.index, fin: m.index + crudo.length, crudo };
    if (marcador.cierre) {
      if (tipo !== 'inventario') { errores.push({ regla: 'B6', mensaje: `sdd:${tipo} no tiene forma de cierre` }); continue; }
      if (!pila.length) { errores.push({ regla: 'B6', mensaje: 'cierre <!-- /sdd:inventario --> sin apertura' }); continue; }
      const abre = pila.pop();
      abre.finTramo = m.index;
      continue;
    }
    if (tipo === 'cifra' || tipo === 'inventario') {
      if (resto.includes('=')) {
        // Anexo B regla 2: el marcador NUNCA lleva el valor esperado.
        errores.push({ regla: 'B2', mensaje: `el marcador no lleva el valor esperado: '${resto}'` });
        continue;
      }
      if (!/^[a-z0-9-]+$/.test(resto)) {
        errores.push({ regla: 'B2', mensaje: `sdd:${tipo} exige un nombre de inventario: '${resto}'` });
        continue;
      }
      marcador.inventario = resto;
      if (tipo === 'inventario') pila.push(marcador);
    }
    if (tipo === 'volatil-ok' && resto === '') {
      // Anexo B regla 5: exención sin motivo es ROJO. No hay exención global.
      errores.push({ regla: 'B5', mensaje: 'sdd:volatil-ok exige <motivo> no vacío' });
      continue;
    }
    marcadores.push(marcador);
  }
  for (const abierto of pila) {
    errores.push({ regla: 'B6', mensaje: `sdd:inventario '${abierto.inventario}' sin su cierre` });
  }
  return { marcadores, errores };
}

// ---------------------------------------------------------------------------
// Ámbito (anexo B): el enunciado que el marcador abarca. «frase hasta '.', o
// celda de tabla, o ítem de lista».
// ---------------------------------------------------------------------------

const soloMarcadores = (s) => s.replace(/<!--[\s\S]*?-->/g, '').replace(/[^\p{L}\p{N}]/gu, '') === '';

function troceaParrafo(texto) {
  const partes = texto.split(/(?<=\.)\s+/);
  const out = [];
  let pendiente = '';
  for (const p of partes) {
    if (soloMarcadores(p)) { pendiente += p + ' '; continue; }
    out.push((pendiente + p).trim());
    pendiente = '';
  }
  if (pendiente.trim()) out.push(pendiente.trim());
  return out;
}

export function enunciados(texto) {
  const out = [];
  let parrafo = [];
  let enCodigo = false;
  const cierra = () => {
    if (parrafo.length) out.push(...troceaParrafo(parrafo.join(' ')));
    parrafo = [];
  };
  for (const linea of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*```/.test(linea)) { cierra(); enCodigo = !enCodigo; continue; }
    if (enCodigo) continue;
    if (/^\s*$/.test(linea)) { cierra(); continue; }
    if (/^\s*\|/.test(linea)) {
      cierra();
      for (const celda of linea.split('|').slice(1, -1)) {
        const t = celda.trim();
        if (t && !/^-+$/.test(t)) out.push(t);
      }
      continue;
    }
    if (/^\s*#/.test(linea)) { cierra(); out.push(linea.trim()); continue; }
    parrafo.push(linea.trim());
  }
  cierra();
  return out;
}

// ---------------------------------------------------------------------------
// Escaneo de cifras: anexo B regla 3 (palabra o dígito) y regla 4 (los números
// dentro de un identificador se excluyen ANTES de mirar).
// ---------------------------------------------------------------------------

export const enmascaraIdentificadores = (s) => s
  .replace(/\b(?:RN|ADR|SPEC|EPIC|TASK|CA|CE|F-SPEC|L|D)-?\d+(?:-\d+)*/g, (m) => ' '.repeat(m.length))
  .replace(/\bv?\d+\.\d+(?:\.\d+)?\b/g, (m) => ' '.repeat(m.length))
  .replace(/\b\d{4}-\d{2}-\d{2}\b/g, (m) => ' '.repeat(m.length));

function reCifraConSustantivo(lexico) {
  const cardinales = Object.keys(lexico.cardinales).filter((k) => k !== 'descripcion');
  const sustantivos = Object.keys(lexico.inventarios_en_prosa.mapa);
  return new RegExp(
    `\\b(?:\\*\\*)?(${cardinales.join('|')}|\\d+)(?:\\*\\*)?\\s+(?:[\\p{L}]+\\s+){0,2}(${sustantivos.join('|')})\\b`,
    'giu');
}

function reCardinalSuelto(lexico) {
  const cardinales = Object.keys(lexico.cardinales).filter((k) => k !== 'descripcion');
  return new RegExp(`\\b(?:\\*\\*)?(${cardinales.join('|')}|\\d+)(?:\\*\\*)?\\b`, 'iu');
}

const valorCardinal = (txt, lexico) => {
  const t = txt.toLowerCase().replace(/\*/g, '');
  return /^\d+$/.test(t) ? Number(t) : lexico.cardinales[t] ?? null;
};

// ---------------------------------------------------------------------------
// El oráculo: deriva el veredicto de UN documento contra el árbol.
// ---------------------------------------------------------------------------

export function evalua(texto, { arbol, registro, lexico }) {
  const motivos = [];
  const idsArbol = artefactos(arbol);
  const rutasArbol = rutas(arbol);
  const { marcadores, errores } = parseMarcadores(texto);
  for (const e of errores) motivos.push(`${e.regla}: ${e.mensaje}`);

  const esPlantilla = (tok) => lexico.plantillas.marcas.some((m) => tok.includes(m));

  // --- M1: referencias e identificadores --------------------------------------
  for (const m of texto.matchAll(/\b(RN-\d{2}|ADR-\d{3}|SPEC-\d{3}|EPIC-\d{3}|TASK-\d{3})\b/g)) {
    if (!idsArbol.has(m[1])) motivos.push(`M1: referencia colgada '${m[1]}'`);
  }

  // --- M1: rutas ANCLADAS entre backticks (los fragmentos se ignoran) ---------
  for (const m of texto.matchAll(/`([^`\n]+)`/g)) {
    const tok = m[1].trim();
    if (esPlantilla(tok)) continue;
    const anclada = lexico.anclas.prefijos.some((p) => tok.startsWith(p))
      || lexico.anclas.ficheros_raiz.includes(tok);
    if (!anclada) continue; // fragmento: NO se persigue (ADR-012 §2)
    if (!rutasArbol.has(tok) && !rutasArbol.has(tok.replace(/\/$/, ''))) {
      motivos.push(`M1: ruta anclada inexistente '${tok}'`);
    }
  }

  // --- M2: tramos de enumeración marcados ------------------------------------
  for (const marc of marcadores.filter((x) => x.tipo === 'inventario' && x.finTramo != null)) {
    const inv = resuelveInventario(marc.inventario, arbol, registro);
    if (!inv) { motivos.push(`M2: inventario desconocido '${marc.inventario}'`); continue; }
    const tramo = texto.slice(marc.fin, marc.finTramo);
    const universo = lexico.universo_de_miembros[inv.nombre] ?? null;
    const alias = (id) => universo?.[id] ?? [id];
    for (const miembro of inv.miembros) {
      if (!alias(miembro).some((a) => tramo.includes(a))) {
        motivos.push(`M2: al inventario '${marc.inventario}' le falta el miembro '${miembro}'`);
      }
    }
    if (universo) {
      for (const [id, nombres] of Object.entries(universo)) {
        if (inv.miembros.includes(id)) continue;
        const citado = nombres.find((n) => tramo.includes(n));
        if (citado) motivos.push(`M2: el inventario '${marc.inventario}' no incluye '${citado}'`);
      }
    }
  }

  // --- M2: cifras marcadas y cifras SIN marcar (marcado obligatorio) ----------
  const reConSust = reCifraConSustantivo(lexico);
  const reSuelto = reCardinalSuelto(lexico);
  for (const unidad of enunciados(texto)) {
    const marcasCifra = [...unidad.matchAll(/<!--\s*sdd:cifra\s+([a-z0-9-]+)\s*-->/g)].map((m) => m[1]);
    const limpia = enmascaraIdentificadores(unidad);
    reConSust.lastIndex = 0;
    const conSust = reConSust.exec(limpia);

    if (marcasCifra.length) {
      for (const nombre of marcasCifra) {
        const inv = resuelveInventario(nombre, arbol, registro);
        if (!inv) { motivos.push(`M2: inventario desconocido '${nombre}'`); continue; }
        const bruto = conSust ? conSust[0] : (reSuelto.exec(limpia) ?? [null])[0];
        if (bruto == null) { motivos.push(`M2: el marcador '${nombre}' no acompaña a ninguna cifra`); continue; }
        const escrita = valorCardinal((bruto.match(/\*{0,2}([\wáéíóúñ]+)/) ?? [])[1] ?? '', lexico);
        if (escrita !== inv.cardinalidad) {
          motivos.push(`M2: la cifra escrita «${bruto.trim()}» no cuadra con el inventario '${nombre}' (${inv.cardinalidad} en el árbol)`);
        }
      }
      continue;
    }
    // Marcado OBLIGATORIO (ADR-012 §3): cardinal + sustantivo de inventario sin
    // marcador es ROJO. Dejarlo pasar sería elegir el falso negativo silencioso.
    if (conSust && !/<!--\s*sdd:/.test(unidad)) {
      motivos.push(`M2: cifra sin marcador «${conSust[0].trim()}» (inventario '${lexico.inventarios_en_prosa.mapa[conSust[2].toLowerCase()]}')`);
    }
  }

  // --- M3: léxico de volatilidad ---------------------------------------------
  const nombresRegistro = registro.map((r) => r.nombre);
  const tieneTokenDeEstado = (unidad) => {
    const limpia = enmascaraIdentificadores(unidad);
    if (lexico.anclas.prefijos.some((p) => unidad.includes(p))) return true;
    reConSust.lastIndex = 0;
    if (reConSust.test(limpia)) return true;
    return nombresRegistro.some((n) => unidad.includes(n));
  };
  for (const unidad of enunciados(texto)) {
    const exenta = /<!--\s*sdd:volatil-ok\s+\S[\s\S]*?-->/.test(unidad);
    const encontradas = [];
    for (const tok of lexico.volatilidad.incondicionales) {
      if (new RegExp(`\\b${tok}\\b`, 'i').test(unidad)) encontradas.push(tok);
    }
    for (const c of lexico.volatilidad.condicionados) {
      if (new RegExp(`\\b${c.token}\\b`, 'i').test(unidad) && tieneTokenDeEstado(unidad)) encontradas.push(c.token);
    }
    if (!encontradas.length || exenta) continue;
    for (const tok of encontradas) motivos.push(`M3: marca de volatilidad '${tok}' sin exención explícita`);
  }

  return { veredicto: motivos.length ? 'rojo' : 'verde', motivos };
}

export function evaluaCaso(caso, corpusDir, ctx) {
  const texto = fs.readFileSync(path.join(corpusDir, caso.documento), 'utf8');
  return evalua(texto, ctx);
}
