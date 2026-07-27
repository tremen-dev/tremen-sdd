#!/usr/bin/env node
// CA-1: la frontera núcleo/adaptador está materializada en el árbol.
//  (a) el método vive bajo core/ y NO fuera de él;
//  (b) cada adaptador de adapters/ tiene su superficie en el árbol y NO en la raíz;
//  (c) el tooling de build vive en tools/;
//  (d) el único empaque en la raíz es .claude-plugin/marketplace.json.
//
// Generalización (ADR-011, SPEC-017): el invariante "un adaptador existe como
// superficie completa en el árbol" es COMÚN a cualquier adaptador, así que se
// comprueba por AUTODESCUBRIMIENTO —iterando adapters/ como hace
// roles-fuente-unica—; ningún nombre de harness es necesario para que la
// comprobación ocurra. Lo que sí difiere por harness (ADR-003, ADR-007) son los
// EXTRAS, y esos viven en una tabla declarativa: un adaptador no declarado se
// juzga solo por el mínimo común y no falla por carecer de los extras de otro.
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './_util.mjs';
import { esEntrypoint } from '../../core/lib/entrypoint.mjs';

const DIRS_METODO = ['lib', 'scripts', 'templates', 'roles', 'tests'];

// Mínimo común exigido a TODO adaptador descubierto bajo adapters/ (ADR-011 §1 y §3).
const MINIMO_COMUN = ['agents/', 'skills/', 'tests/'];

// Extras AS-BUILT por harness (ADR-011 §3). Un sufijo '/' marca directorio.
// Declarar un harness aquí implica dos cosas: debe existir, y debe tener esto.
const EXTRAS_POR_HARNESS = {
  'claude-code': ['.claude-plugin/plugin.json', 'commands/', 'hooks/'],
  'kimi-code': ['hooks/'],
  'opencode': ['opencode.json', 'commands/', 'plugins/'],
};

// Lista CERRADA de superficie de adaptador prohibida en la raíz del repo
// (ADR-011 §4): NUNCA se deriva de readdir(adapters/*), porque un adaptador con
// un directorio llamado docs/, core/ o tools/ convertiría en infracción el de la
// raíz. El autodescubrimiento amplía cobertura, jamás prohibiciones.
const SUPERFICIE_PROHIBIDA_RAIZ = ['agents', 'skills', 'commands', 'hooks', 'plugins'];

const existe = (p) => fs.existsSync(p);

// Lista los adaptadores del sistema de ficheros (patrón roles-fuente-unica).
function descubreAdaptadores(adaptersDir) {
  if (!existe(adaptersDir)) return [];
  return fs.readdirSync(adaptersDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export function checkLayout(repoRoot = REPO_ROOT) {
  const errores = [];
  const core = path.join(repoRoot, 'core');
  const adaptersDir = path.join(repoRoot, 'adapters');

  // (a) núcleo presente bajo core/
  for (const d of DIRS_METODO) {
    if (!existe(path.join(core, d))) errores.push(`falta core/${d}/`);
  }
  // (a) método NO en la raíz
  for (const d of DIRS_METODO) {
    if (existe(path.join(repoRoot, d))) errores.push(`método fuera de core/: /${d}/ en la raíz`);
  }

  // (b) superficie de CADA adaptador, autodescubierto
  const adaptadores = descubreAdaptadores(adaptersDir);
  const exigencias = (h) => [...MINIMO_COMUN, ...(EXTRAS_POR_HARNESS[h] ?? [])];
  for (const h of adaptadores) {
    for (const rel of exigencias(h)) {
      if (!existe(path.join(adaptersDir, h, rel.replace(/\/$/, '')))) {
        errores.push(`falta adapters/${h}/${rel}`);
      }
    }
  }
  // (b) un harness declarado que no existe es fallo, no verde por ausencia
  for (const h of Object.keys(EXTRAS_POR_HARNESS)) {
    if (!adaptadores.includes(h)) errores.push(`falta el adaptador declarado adapters/${h}/`);
  }
  // (b) superficie de adaptador NO en la raíz
  for (const d of SUPERFICIE_PROHIBIDA_RAIZ) {
    if (existe(path.join(repoRoot, d))) errores.push(`superficie de adaptador en la raíz: /${d}/`);
  }
  if (existe(path.join(repoRoot, '.claude-plugin', 'plugin.json'))) {
    errores.push('plugin.json de adaptador en la raíz (.claude-plugin/plugin.json)');
  }

  // (c) tooling de build
  if (!existe(path.join(repoRoot, 'tools', 'build-adapter.mjs'))) {
    errores.push('falta tools/build-adapter.mjs');
  }

  // (d) el único empaque en la raíz es marketplace.json
  if (!existe(path.join(repoRoot, '.claude-plugin', 'marketplace.json'))) {
    errores.push('falta .claude-plugin/marketplace.json en la raíz');
  }

  return { ok: errores.length === 0, errores, adaptadores };
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  const { ok, errores, adaptadores } = checkLayout();
  if (!ok) { console.error('[layout] FALLA:\n' + errores.map((e) => ' - ' + e).join('\n')); process.exit(1); }
  // ADR-011 §6: el check declara a quién ha mirado; un verde anónimo no distingue
  // "los miré todos" de "no miré ninguno".
  console.log(`[layout] OK: frontera núcleo/adaptador materializada (${adaptadores.join(', ')}).`);
}
