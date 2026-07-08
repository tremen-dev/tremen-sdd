#!/usr/bin/env node
// Lint de artefactos SDD: frontmatter, IDs, estados, historial y referencias.
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../lib/frontmatter.mjs';
import { TRANSITIONS } from './estado.mjs';

const ID_RE = /^(EPIC|SPEC|TASK|ADR)-(\d{3}|FIX|INFRA|MANT|MEJORA)/;
const ESTADOS = Object.keys(TRANSITIONS);

export function validateFile(ruta, docsDir) {
  const errores = [];
  const nombre = path.basename(ruta);
  const rel = docsDir ? path.relative(docsDir, ruta) : nombre;
  const { data } = parseFrontmatter(fs.readFileSync(ruta, 'utf8'));
  if (!data.id) return [`${rel}: sin frontmatter o sin 'id'`];
  if (data.tipo === 'ledger') return errores; // el ledger no lleva estado propio
  const enNombre = (nombre === '_epica.md')
    ? path.basename(path.dirname(ruta)).match(ID_RE)?.[0]
    : nombre.match(ID_RE)?.[0];
  if (enNombre && data.id !== enNombre) {
    errores.push(`${rel}: id '${data.id}' no coincide con el nombre del fichero ('${enNombre}')`);
  }
  if (!ESTADOS.includes(data.estado)) {
    errores.push(`${rel}: estado '${data.estado}' no válido (${ESTADOS.join(', ')})`);
  }
  const ultimo = data.historial?.at(-1);
  if (!ultimo || ultimo.estado !== data.estado) {
    errores.push(`${rel}: la última entrada de historial no coincide con estado '${data.estado}'. Usa scripts/estado.mjs para transicionar.`);
  }
  if (data.epica && docsDir) {
    const base = path.join(docsDir, 'epicas');
    const existe = fs.existsSync(base) && fs.readdirSync(base)
      .some((n) => n === data.epica || n.startsWith(data.epica + '-'));
    if (!existe) errores.push(`${rel}: referencia a épica inexistente '${data.epica}'`);
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

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  const dir = process.argv.includes('--dir') ? process.argv[process.argv.indexOf('--dir') + 1] : 'docs';
  const errores = validate(path.resolve(dir));
  if (errores.length) {
    console.error(`[valida] ${errores.length} error(es):\n` + errores.map((e) => ` - ${e}`).join('\n'));
    process.exit(1);
  }
  console.log('[valida] OK');
}
