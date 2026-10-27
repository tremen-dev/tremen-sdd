#!/usr/bin/env node
// Lint de artefactos SDD: frontmatter, IDs, estados, historial y referencias.
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../lib/frontmatter.mjs';
import { TRANSITIONS } from './estado.mjs';
import { esEntrypoint, exigirProyectoSdd } from '../lib/entrypoint.mjs';
import { idiomaDesde, idiomasSoportados, leerIdiomaDeclarado, resolverIdioma } from '../lib/idioma.mjs';
import { mensajesNucleo } from '../lib/mensajes.mjs';

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
  return errores;
}

// Error si el .sdd.json de `raiz` (la de buscarRaizSdd / exigirProyectoSdd) es
// ilegible o declara un `idioma` no soportado (ADR-016 §2), o null. Solo lo usa
// el CLI: validateFile no cambia y los hooks siguen sin hablar del idioma. Sin
// campo `idioma`, no hay error (CE-4); sin fichero, actúa antes la barrera.
export function errorIdioma(raiz) {
  if (!raiz) return null;
  const { existe, fichero, declarado, valor } = leerIdiomaDeclarado(raiz);
  const t = mensajesNucleo(resolverIdioma(raiz));
  // Ilegible: los hooks lo tratan como ausente y apagan todos los gates.
  if (existe && !fichero) return t('valida.sdd-json-ilegible');
  const soportados = idiomasSoportados();
  if (!declarado || (typeof valor === 'string' && soportados.includes(valor))) return null;
  return t('valida.idioma-no-soportado', {
    valor: JSON.stringify(valor) ?? String(valor), soportados: soportados.join(', '),
  });
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
    const errIdioma = errorIdioma(raiz);
    const errores = [...(errIdioma ? [errIdioma] : []), ...validate(docsDir)];
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
