#!/usr/bin/env node
// CA-1: la frontera núcleo/adaptador está materializada en el árbol.
//  (a) el método vive bajo core/ y NO fuera de él;
//  (b) el empaque de Claude Code vive bajo adapters/claude-code/ y NO en la raíz;
//  (c) el tooling de build vive en tools/;
//  (d) el único empaque en la raíz es .claude-plugin/marketplace.json.
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './_util.mjs';
import { esEntrypoint } from '../../core/lib/entrypoint.mjs';

const DIRS_METODO = ['lib', 'scripts', 'templates', 'roles', 'tests'];
const DIRS_ADAPTADOR = ['agents', 'skills', 'commands', 'hooks'];

const existe = (p) => fs.existsSync(p);

export function checkLayout(repoRoot = REPO_ROOT) {
  const errores = [];
  const core = path.join(repoRoot, 'core');
  const cc = path.join(repoRoot, 'adapters', 'claude-code');

  // (a) núcleo presente bajo core/
  for (const d of DIRS_METODO) {
    if (!existe(path.join(core, d))) errores.push(`falta core/${d}/`);
  }
  // (a) método NO en la raíz
  for (const d of DIRS_METODO) {
    if (existe(path.join(repoRoot, d))) errores.push(`método fuera de core/: /${d}/ en la raíz`);
  }

  // (b) superficie de Claude Code bajo adapters/claude-code/
  if (!existe(path.join(cc, '.claude-plugin', 'plugin.json'))) {
    errores.push('falta adapters/claude-code/.claude-plugin/plugin.json');
  }
  for (const d of [...DIRS_ADAPTADOR, 'tests']) {
    if (!existe(path.join(cc, d))) errores.push(`falta adapters/claude-code/${d}/`);
  }
  // (b) superficie de adaptador NO en la raíz
  for (const d of DIRS_ADAPTADOR) {
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

  return { ok: errores.length === 0, errores };
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  const { ok, errores } = checkLayout();
  if (!ok) { console.error('[layout] FALLA:\n' + errores.map((e) => ' - ' + e).join('\n')); process.exit(1); }
  console.log('[layout] OK: frontera núcleo/adaptador materializada.');
}
