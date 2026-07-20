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

  return { ok: errores.length === 0, errores };
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  const distDir = path.join(REPO_ROOT, 'dist', process.argv[2] || 'claude-code');
  if (!fs.existsSync(distDir)) { console.error(`[referencias] No existe ${path.relative(REPO_ROOT, distDir)}. Ejecuta el build antes.`); process.exit(1); }
  const { ok, errores } = checkReferencias(distDir);
  if (!ok) { console.error('[referencias] FALLA:\n' + errores.map((e) => ' - ' + e).join('\n')); process.exit(1); }
  console.log('[referencias] OK: toda referencia resuelve dentro del plugin root.');
}
