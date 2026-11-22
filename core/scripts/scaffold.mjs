#!/usr/bin/env node
// Crea artefactos SDD numerados desde plantilla. La numeración la hace ESTE
// script, nunca el LLM ("la estructura se scriptea, el juicio se escribe").
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esEntrypoint, exigirProyectoSdd } from '../lib/entrypoint.mjs';
import { hoy } from '../lib/fecha.mjs';
import { idiomaDesde, IDIOMA_ORIGEN } from '../lib/idioma.mjs';
import { mensajesNucleo } from '../lib/mensajes.mjs';
import { leeRefs } from '../lib/refs-git.mjs';

const PLUGIN_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// Plantillas por idioma (ADR-016 §1): core/templates/<idioma>/artefactos/. Si el
// conjunto del idioma no trae la plantilla, se usa la de `es` (como el fallback
// por clave de los catálogos); en CI eso no ocurre, lo impide la paridad.
const TPL = (name, idioma) => {
  const propia = path.join(PLUGIN_ROOT, 'templates', idioma, 'artefactos', name);
  return fs.existsSync(propia) ? propia : path.join(PLUGIN_ROOT, 'templates', IDIOMA_ORIGEN, 'artefactos', name);
};
const TIPOS = {
  epica: { prefijo: 'EPIC', plantilla: '_epica.md' },
  spec: { prefijo: 'SPEC', plantilla: 'SPEC.md' },
  task: { prefijo: 'TASK', plantilla: 'TASK.md' },
  adr: { prefijo: 'ADR', plantilla: 'ADR.md' },
};

// Épicas "bucket": no nacen de una idea de producto sino que agrupan trabajo
// transversal (fixes, infra, mantenimiento, mejoras). Vía de creación
// sancionada: --id, restringido a este set cerrado.
export const EPICAS_BUCKET = ['EPIC-FIX', 'EPIC-INFRA', 'EPIC-MANT', 'EPIC-MEJORA'];

export function slugify(titulo) {
  return titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const reId = (prefijo) => new RegExp(`^${prefijo}-(\\d{3})`);
const formatea = (prefijo, n) => `${prefijo}-${String(n).padStart(3, '0')}`;
const maxNum = (ids) => ids.reduce((m, id) => Math.max(m, Number(id.slice(id.lastIndexOf('-') + 1))), 0);

// Ids (PREFIJO-NNN) presentes en el árbol local bajo docsDir.
export function idsLocales(docsDir, prefijo) {
  const ids = new Set();
  const re = reId(prefijo);
  const stack = [docsDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const m = e.name.match(re);
      if (m) ids.add(formatea(prefijo, Number(m[1])));
      if (e.isDirectory()) stack.push(path.join(dir, e.name));
    }
  }
  return [...ids];
}

export function nextId(docsDir, prefijo) {
  return formatea(prefijo, maxNum(idsLocales(docsDir, prefijo)) + 1);
}

// Ids de `prefijo` en las rutas de un ref (ADR-018 §3): la MISMA expresión que
// nextId, aplicada a cada segmento. La ruta de un id es la ruta truncada en el
// segmento que lo nombra; si hay varias (spec y ledger), la más corta.
export function idsEnRutas(rutas, prefijo) {
  const re = reId(prefijo);
  const ids = {};
  for (const ruta of rutas) {
    const segs = ruta.split('/');
    for (let i = 0; i < segs.length; i++) {
      const m = segs[i].match(re);
      if (!m) continue;
      const id = formatea(prefijo, Number(m[1]));
      const r = segs.slice(0, i + 1).join('/');
      if (!ids[id] || r.length < ids[id].length) ids[id] = r;
    }
  }
  return ids;
}

// Decisión pura de ADR-018 §2 (SPEC-028 CA-6.2). `locales`: ids del árbol local;
// `porRef`: { ref: { id: ruta } }; `defecto`: rama por defecto del remoto, o null
// (entonces la negativa no se evalúa). Devuelve:
//  - { accion: 'seguir', id }            nada que saltar;
//  - { accion: 'saltar', id, saltados }  ids reservados solo en otras ramas;
//  - { accion: 'negar', id, ref, ruta }  el candidato está en la rama por defecto:
//                                        la base local va por detrás.
export function decideId({ prefijo, locales, porRef, defecto }) {
  const saltados = [];
  for (let n = maxNum(locales) + 1; ; n++) {
    const id = formatea(prefijo, n);
    if (defecto && porRef[defecto]?.[id]) return { accion: 'negar', id, ref: defecto, ruta: porRef[defecto][id] };
    const reservas = Object.keys(porRef).filter((r) => r !== defecto && porRef[r][id]);
    if (!reservas.length) return saltados.length ? { accion: 'saltar', id, saltados } : { accion: 'seguir', id };
    saltados.push({ id, refs: reservas });
  }
}

function findEpicaDir(docsDir, epicaId) {
  const base = path.join(docsDir, 'epicas');
  if (!fs.existsSync(base)) return null;
  return fs.readdirSync(base).map((n) => path.join(base, n))
    .find((p) => path.basename(p) === epicaId || path.basename(p).startsWith(epicaId + '-')) ?? null;
}

// Asigna el id numerado. Sin `refs` (o si devuelve null) numera solo con el árbol
// local, como siempre. Con `refs` —{ defecto, porRef: { ref: rutas[] } } o una
// función que lo devuelve, llamada solo aquí, tras validar los argumentos— aplica
// ADR-018 §2: se niega (lanza) o salta avisando por `avisa`.
function asignaId({ docsDir, prefijo, refs, avisa, t }) {
  const info = typeof refs === 'function' ? refs() : refs;
  if (!info) return nextId(docsDir, prefijo);
  const porRef = Object.fromEntries(Object.entries(info.porRef).map(([r, rutas]) => [r, idsEnRutas(rutas, prefijo)]));
  const d = decideId({ prefijo, locales: idsLocales(docsDir, prefijo), porRef, defecto: info.defecto });
  if (d.accion === 'negar') throw new Error(t('scaffold.base-atrasada', { id: d.id, ref: d.ref, ruta: d.ruta }));
  if (d.accion === 'saltar') {
    const saltados = d.saltados.map((s) => t('scaffold.id-saltado', { id: s.id, refs: s.refs.join(', ') })).join(', ');
    avisa?.(t('scaffold.ids-saltados', { saltados, id: d.id }));
  }
  return d.id;
}

export function createArtifact({ tipo, titulo, epica, docsDir, fecha, id, refs, avisa }) {
  const idioma = idiomaDesde(docsDir);
  const t = mensajesNucleo(idioma);
  const cfg = TIPOS[tipo];
  if (!cfg) throw new Error(t('scaffold.tipo-desconocido', { tipo }));
  fecha ??= hoy();
  if (id !== undefined) {
    if (tipo !== 'epica') throw new Error(t('scaffold.id-solo-epica'));
    if (!EPICAS_BUCKET.includes(id)) {
      throw new Error(t('scaffold.id-invalido', { id, buckets: EPICAS_BUCKET.join(', ') }));
    }
  }
  // Las validaciones de la épica van antes de numerar: un error de argumentos no
  // consulta git (ni emite su nota).
  let epicaDir;
  if (tipo === 'spec' || tipo === 'task') {
    if (!epica) throw new Error(t('scaffold.necesita-epica', { tipo }));
    epicaDir = findEpicaDir(docsDir, epica);
    if (!epicaDir) throw new Error(t('scaffold.epica-inexistente', { epica, docsDir }));
  }
  // Los ids fijos de las épicas bucket no se numeran ni se comparan (ADR-018 §2).
  const idFinal = id ?? asignaId({ docsDir, prefijo: cfg.prefijo, refs, avisa, t });
  const slug = slugify(titulo);
  const rellena = (tpl) => tpl
    .replaceAll('{{ID}}', idFinal).replaceAll('{{SLUG}}', slug)
    .replaceAll('{{TITULO}}', titulo).replaceAll('{{FECHA}}', fecha)
    .replaceAll('{{EPICA}}', epica ?? '');
  let destino;
  if (tipo === 'epica') {
    const dir = path.join(docsDir, 'epicas', id ? idFinal : `${idFinal}-${slug}`);
    fs.mkdirSync(dir, { recursive: true });
    destino = path.join(dir, '_epica.md');
  } else if (tipo === 'adr') {
    fs.mkdirSync(path.join(docsDir, 'adr'), { recursive: true });
    destino = path.join(docsDir, 'adr', `${idFinal}-${slug}.md`);
  } else {
    destino = path.join(epicaDir, `${idFinal}-${slug}.md`);
  }
  fs.writeFileSync(destino, rellena(fs.readFileSync(TPL(cfg.plantilla, idioma), 'utf8')));
  if (tipo === 'spec') {
    fs.writeFileSync(destino.replace(/\.md$/, '.ledger.md'),
      rellena(fs.readFileSync(TPL('SPEC.ledger.md', idioma), 'utf8')));
  }
  return destino;
}

// CLI: node scaffold.mjs <tipo> "<titulo>" [--epica EPIC-NNN] [--dir docs]
if (esEntrypoint(import.meta.url, process.argv[1])) {
  const [tipo, titulo] = process.argv.slice(2);
  const epica = process.argv.includes('--epica') ? process.argv[process.argv.indexOf('--epica') + 1] : undefined;
  const id = process.argv.includes('--id') ? process.argv[process.argv.indexOf('--id') + 1] : undefined;
  const dir = process.argv.includes('--dir') ? process.argv[process.argv.indexOf('--dir') + 1] : 'docs';
  try {
    // La barrera de ADR-015 va antes que cualquier consulta a git.
    exigirProyectoSdd(dir);
    const docsDir = path.resolve(dir);
    const t = mensajesNucleo(idiomaDesde(docsDir));
    // ADR-018: refs locales de git (nunca el remoto). Degradado -> una línea de
    // nota y numeración local, como siempre.
    const refs = () => {
      const r = leeRefs(docsDir);
      if (r.estado === 'ok') return r;
      console.error(`[scaffold] ${t(`scaffold.nota-${r.estado}`, { detalle: r.detalle })}`);
      return null;
    };
    const avisa = (m) => console.error(`[scaffold] ${m}`);
    console.log(createArtifact({ tipo, titulo, epica, docsDir, id, refs, avisa }));
  } catch (e) {
    console.error(`[scaffold] ${e.message}`);
    process.exit(1);
  }
}
