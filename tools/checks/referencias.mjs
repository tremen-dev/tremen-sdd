#!/usr/bin/env node
// CA-7: en el adaptador CONSTRUIDO (dist/<harness>/, con el núcleo bajo core/),
// todas las referencias adaptador->núcleo apuntan a rutas internas al plugin root
// y NINGUNA lo escapa:
//  - prosa de agents/roles/skills/commands: ${CLAUDE_PLUGIN_ROOT}/... sin '../'
//    que escape, y cada ruta concreta declarada resuelve a un fichero existente;
//  - imports ESM (hooks) hacia el núcleo resuelven DENTRO del plugin root;
//  - queda PROHIBIDA la forma refutada ${CLAUDE_PLUGIN_ROOT}/../../...
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, walk, importSpecifiers, dentroDe } from './_util.mjs';
import { esEntrypoint } from '../../core/lib/entrypoint.mjs';

const RE_PLUGIN_ROOT = /\$\{CLAUDE_PLUGIN_ROOT\}(\/[^\s"'`)\]\\]*)/g;
const TIENE_PLACEHOLDER = /<[^>]+>/; // p.ej. <idioma>, <rol>: refs genéricas de plantilla

export function checkReferencias(distDir) {
  const errores = [];
  const textos = walk(distDir, (n) => /\.(md|json|mjs)$/.test(n));

  // 1) Referencias ${CLAUDE_PLUGIN_ROOT}/...
  for (const f of textos) {
    const s = fs.readFileSync(f, 'utf8');
    const rel = path.relative(distDir, f);
    let m;
    RE_PLUGIN_ROOT.lastIndex = 0;
    while ((m = RE_PLUGIN_ROOT.exec(s))) {
      let ruta = m[1].replace(/[.,]$/, ''); // limpia puntuación final de prosa
      if (/\/\.\.(\/|$)/.test(ruta) || ruta.startsWith('/..')) {
        errores.push(`${rel}: referencia con '../' (forma refutada): \${CLAUDE_PLUGIN_ROOT}${m[1]}`);
        continue;
      }
      const concreta = ruta.replaceAll('<idioma>', 'es');
      if (TIENE_PLACEHOLDER.test(concreta)) continue; // plantilla genérica: no resoluble
      const resuelto = path.join(distDir, concreta);
      if (!dentroDe(distDir, resuelto)) { errores.push(`${rel}: ruta escapa del plugin root: ${concreta}`); continue; }
      if (!fs.existsSync(resuelto)) errores.push(`${rel}: ruta declarada no existe en el artefacto: ${concreta}`);
    }
  }

  // 2) Imports ESM: ningún relativo escapa el plugin root.
  for (const f of walk(distDir, (n) => n.endsWith('.mjs'))) {
    const rel = path.relative(distDir, f);
    for (const spec of importSpecifiers(fs.readFileSync(f, 'utf8'))) {
      if (spec.startsWith('node:') || !(spec.startsWith('.') || spec.startsWith('/'))) continue;
      const resuelto = path.resolve(path.dirname(f), spec);
      if (!dentroDe(distDir, resuelto)) errores.push(`${rel}: import ESM escapa el plugin root: '${spec}'`);
      else if (!fs.existsSync(resuelto)) errores.push(`${rel}: import ESM no resuelve a fichero: '${spec}'`);
    }
  }

  // 3) Adaptadores SIN variable de plugin-root (Kimi, opencode): la resolución
  //    del núcleo es por ruta INTERNA relativa al fichero (CA-4 / SPEC-010 CA-5).
  if (esKimi(distDir)) errores.push(...referenciasKimi(distDir));
  else if (esOpencode(distDir)) errores.push(...referenciasOpencode(distDir));

  return { ok: errores.length === 0, errores };
}

// ¿el artefacto declara agentes YAML (Kimi) en agents/?
function esKimi(distDir) {
  const ag = path.join(distDir, 'agents');
  return fs.existsSync(ag) && walk(ag, (n) => n.endsWith('.yaml')).length > 0;
}

// ¿el artefacto es de opencode? (manifiesto opencode.json en la raíz).
function esOpencode(distDir) {
  return fs.existsSync(path.join(distDir, 'opencode.json'));
}

const RE_SPP = /^\s*system_prompt_path:\s*(.+?)\s*$/m;
const RE_CORE_REL = /(?:\.\.?\/)+core\/[^\s"'`)\]]+/g;
const RE_PLUGIN_TOKEN = /\$\{[A-Z_]*PLUGIN_ROOT[A-Z_]*\}/;

// Comprueba, en un artefacto tipo Kimi, que ninguna referencia usa una variable
// de plugin-root (que Kimi no ofrece) y que las refs relativas al núcleo son
// internas y existentes. Cubre TAMBIÉN el subárbol core/ copiado en dist/ (segundo
// guardián): desde SPEC-004 el núcleo es agnóstico al harness (${SDD_ROOT}, no un
// token de un harness), así que una reintroducción de token de harness bajo core/
// se caza aquí a nivel build, además del check nucleo-agnostico en origen.
function referenciasKimi(distDir) {
  const errores = [];

  // (a) system_prompt_path de cada YAML: relativo al YAML, interno y existente.
  for (const f of walk(distDir, (n) => n.endsWith('.yaml'))) {
    const rel = path.relative(distDir, f);
    const m = RE_SPP.exec(fs.readFileSync(f, 'utf8'));
    if (!m) continue;
    const valor = m[1].replace(/^["']|["']$/g, '');
    const resuelto = path.resolve(path.dirname(f), valor);
    if (!dentroDe(distDir, resuelto)) { errores.push(`${rel}: system_prompt_path escapa del artefacto: ${valor}`); continue; }
    if (!fs.existsSync(resuelto)) errores.push(`${rel}: system_prompt_path no existe en el artefacto: ${valor}`);
  }

  // (b) referencias relativas al núcleo en YAML/prompts: internas y existentes;
  //     y ninguna usa una variable de plugin-root (que Kimi no ofrece).
  errores.push(...referenciasInternas(distDir, (n) => /\.(md|yaml)$/.test(n), 'Kimi'));

  return errores;
}

// Comprueba, en un artefacto de opencode (agents/commands markdown + opencode.json),
// que ninguna referencia usa una variable de plugin-root (que opencode no ofrece,
// SPEC-010 CA-5) y que las refs relativas al núcleo (`../core/...`) son internas y
// existentes. Cubre .md (agents/commands/skills) y .json (opencode.json).
function referenciasOpencode(distDir) {
  return referenciasInternas(distDir, (n) => /\.(md|json)$/.test(n), 'opencode');
}

// Núcleo común a los adaptadores sin plugin-root (Kimi, opencode): sobre los
// ficheros que casan `filtro`, ninguno usa una variable de plugin-root y cada
// ref relativa `./|../ ... /core/...` resuelve INTERNA al artefacto y existe.
// Cubre TAMBIÉN el subárbol core/ copiado en dist/ (segundo guardián): una
// reintroducción de token de harness bajo core/ se caza aquí a nivel build.
function referenciasInternas(distDir, filtro, harness) {
  const errores = [];
  for (const f of walk(distDir, filtro)) {
    const rel = path.relative(distDir, f);
    const s = fs.readFileSync(f, 'utf8');
    if (RE_PLUGIN_TOKEN.test(s)) errores.push(`${rel}: usa una variable de plugin-root inexistente en ${harness}`);
    let m;
    RE_CORE_REL.lastIndex = 0;
    while ((m = RE_CORE_REL.exec(s))) {
      const concreta = m[0].replace(/[.,]$/, '').replaceAll('<idioma>', 'es');
      if (TIENE_PLACEHOLDER.test(concreta)) continue; // plantilla genérica
      const resuelto = path.resolve(path.dirname(f), concreta);
      if (!dentroDe(distDir, resuelto)) { errores.push(`${rel}: ref a core escapa del artefacto: ${m[0]}`); continue; }
      if (!fs.existsSync(resuelto)) errores.push(`${rel}: ref a core no existe en el artefacto: ${m[0]}`);
    }
  }
  return errores;
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  const distDir = path.join(REPO_ROOT, 'dist', process.argv[2] || 'claude-code');
  if (!fs.existsSync(distDir)) { console.error(`[referencias] No existe ${path.relative(REPO_ROOT, distDir)}. Ejecuta el build antes.`); process.exit(1); }
  const { ok, errores } = checkReferencias(distDir);
  if (!ok) { console.error('[referencias] FALLA:\n' + errores.map((e) => ' - ' + e).join('\n')); process.exit(1); }
  console.log('[referencias] OK: toda referencia resuelve dentro del plugin root.');
}
