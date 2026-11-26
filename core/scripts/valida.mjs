#!/usr/bin/env node
// Lint de artefactos SDD: frontmatter, IDs, estados, historial y referencias.
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../lib/frontmatter.mjs';
import { TRANSITIONS } from './estado.mjs';
import { esEntrypoint, exigirProyectoSdd } from '../lib/entrypoint.mjs';
import { idiomaDesde, idiomasSoportados, resolverIdioma } from '../lib/idioma.mjs';
import { mensajesNucleo } from '../lib/mensajes.mjs';
import { leerSddJson } from '../lib/sdd-json.mjs';
import { mensajeSddJsonIlegible } from '../lib/sdd-json-mensaje.mjs';
import { leerCAs, esSpecDelModelo, erroresFicha, erroresMarcas, leerMatriz, rutaLedger } from '../lib/ca-manual.mjs';

const ID_RE = /^(EPIC|SPEC|TASK|ADR)-(\d{3}|FIX|INFRA|MANT|MEJORA)/;
const ESTADOS = Object.keys(TRANSITIONS);

export function validateFile(ruta, docsDir) {
  const errores = [];
  const nombre = path.basename(ruta);
  const rel = docsDir ? path.relative(docsDir, ruta) : nombre;
  const { data } = parseFrontmatter(fs.readFileSync(ruta, 'utf8'));
  const t = mensajesNucleo(idiomaDesde(docsDir ?? path.dirname(ruta)));
  if (!data.id) return [t('valida.sin-id', { rel })];
  if (data.tipo === 'ledger') return errores; // el ledger no lleva estado propio
  const enNombre = (nombre === '_epica.md')
    ? path.basename(path.dirname(ruta)).match(ID_RE)?.[0]
    : nombre.match(ID_RE)?.[0];
  if (enNombre && data.id !== enNombre) {
    errores.push(t('valida.id-no-coincide', { rel, id: data.id, enNombre }));
  }
  if (!ESTADOS.includes(data.estado)) {
    errores.push(t('valida.estado-no-valido', { rel, estado: data.estado, estados: ESTADOS.join(', ') }));
  }
  const ultimo = data.historial?.at(-1);
  if (!ultimo || ultimo.estado !== data.estado) {
    errores.push(t('valida.historial-no-coincide', { rel, estado: data.estado }));
  }
  if (data.epica && docsDir) {
    const base = path.join(docsDir, 'epicas');
    const existe = fs.existsSync(base) && fs.readdirSync(base)
      .some((n) => n === data.epica || n.startsWith(data.epica + '-'));
    if (!existe) errores.push(t('valida.epica-inexistente', { rel, epica: data.epica }));
  }
  if (data.tipo === 'spec') errores.push(...erroresModeloCaManual(ruta, docsDir, t));
  return errores;
}

// SPEC-030 CA-2/CA-3 (ADR-020 §11): solo una spec con algún CA [manual] (y su
// ledger) se valida contra el modelo. El reconocimiento es del lector único.
function erroresModeloCaManual(ruta, docsDir, t) {
  const relDe = (p) => (docsDir ? path.relative(docsDir, p) : path.basename(p));
  const cas = leerCAs(parseFrontmatter(fs.readFileSync(ruta, 'utf8')).body);
  if (!esSpecDelModelo(cas)) return [];
  const rel = relDe(ruta);
  const errores = erroresFicha(cas).map((e) => t(`valida.ficha.${e.codigo}`, { rel, ca: e.ca, clave: e.clave, ...e.vars }));
  const ledger = rutaLedger(ruta);
  if (fs.existsSync(ledger)) {
    const relLedger = relDe(ledger);
    for (const e of erroresMarcas(cas, leerMatriz(fs.readFileSync(ledger, 'utf8')))) {
      errores.push(t(`valida.marca.${e.codigo}`, { rel: relLedger, ca: e.ca, celda: e.celda, ...e.vars }));
    }
  }
  return errores;
}

// Errores del .sdd.json de `raiz` (la de buscarRaizSdd / exigirProyectoSdd), en
// orden: el de ilegible (incluido un esquema inválido, ADR-019 §2) y el de un
// `idioma` no soportado (ADR-016 §2). Lee con el lector único (ADR-019 §3), así
// que CI ve lo mismo que los hooks. Solo lo usa el CLI: validateFile no cambia y
// los hooks siguen sin hablar del idioma. Sin campo `idioma`, no hay error de
// idioma (CE-4); sin fichero, actúa antes la barrera.
export function erroresSddJson(raiz) {
  if (!raiz) return [];
  const lectura = leerSddJson(raiz);
  if (lectura.estado === 'ausente') return [];
  const errores = [];
  let declarado = false;
  let valor;
  if (lectura.estado === 'ilegible') {
    // El mismo texto que emiten los hooks y el pre-commit, que lo tratan como
    // gates cerrados (ADR-017 §3, SPEC-027 CA-7).
    errores.push(mensajeSddJsonIlegible(lectura));
    // Con el esquema inválido por otros campos, un `idioma` string no soportado
    // también se informa (ADR-019 §4). Si `idioma` es el campo mal tipado, su
    // error es el de esquema y no el de no soportado.
    const idiomaMalTipado = lectura.errores?.some((e) => e.campo === 'idioma');
    if (lectura.leido && !idiomaMalTipado && Object.hasOwn(lectura.leido, 'idioma')) {
      declarado = true;
      valor = lectura.leido.idioma;
    }
  } else if (Object.hasOwn(lectura.config, 'idioma')) {
    declarado = true;
    valor = lectura.config.idioma;
  }
  const soportados = idiomasSoportados();
  if (declarado && !soportados.includes(valor)) {
    errores.push(mensajesNucleo(resolverIdioma(raiz))('valida.idioma-no-soportado', {
      valor: JSON.stringify(valor) ?? String(valor), soportados: soportados.join(', '),
    }));
  }
  return errores;
}

export function validate(docsDir) {
  const errores = [];
  const stack = [docsDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name.endsWith('.md') && ID_RE.test(e.name.replace(/^_epica\.md$/, path.basename(dir)))) {
        if (e.name === '_epica.md' || ID_RE.test(e.name)) errores.push(...validateFile(p, docsDir));
      }
    }
  }
  return errores;
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  try {
    const dir = process.argv.includes('--dir') ? process.argv[process.argv.indexOf('--dir') + 1] : 'docs';
    const docsDir = path.resolve(dir);
    // Orden (SPEC-025 CA-6): barrera de ADR-015, después .sdd.json, después artefactos.
    const raiz = exigirProyectoSdd(docsDir);
    const t = mensajesNucleo(resolverIdioma(raiz));
    const errores = [...erroresSddJson(raiz), ...validate(docsDir)];
    if (errores.length) {
      console.error(t('valida.cli-errores', { n: errores.length }) + '\n' + errores.map((e) => ` - ${e}`).join('\n'));
      process.exit(1);
    }
    console.log(t('valida.cli-ok'));
  } catch (e) {
    console.error(`[valida] ${e.message}`);
    process.exit(1);
  }
}
