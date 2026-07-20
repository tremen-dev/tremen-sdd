#!/usr/bin/env node
// CA-9 (b): core/ es la única copia versionada del método. No existe ninguna copia
// del núcleo comiteada fuera de core/ (ni dentro de un adaptador, ni en dist/), y
// dist/ no tiene ficheros trackeados. Protege CE-1/CE-3.
import { execSync } from 'node:child_process';
import { REPO_ROOT } from './_util.mjs';
import { esEntrypoint } from '../../core/lib/entrypoint.mjs';

const norm = (p) => p.replaceAll('\\', '/');

export function trackedFiles(repoRoot = REPO_ROOT) {
  return execSync('git ls-files', { cwd: repoRoot, encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter(Boolean).map(norm);
}

// Rutas de los ficheros reales del núcleo, relativas a core/ (p.ej.
// 'roles/es/sdd-implementador.md', 'scripts/estado.mjs'). Sirven para detectar
// copias exactas del núcleo fuera de core/ sin falsos positivos con assets que
// solo comparten un nombre de carpeta (p.ej. site/assets/roles/*.svg).
export function coreRelPaths(files) {
  return files.filter((p) => p.startsWith('core/')).map((p) => p.slice('core/'.length));
}

export function checkFuenteUnica(files, coreRel = coreRelPaths(files)) {
  const infractores = [];
  const rel = new Set(coreRel);
  for (const f of files) {
    const p = norm(f);
    if (p === 'dist' || p.startsWith('dist/')) { infractores.push({ fichero: p, motivo: 'dist/ no debe estar trackeado (gitignored)' }); continue; }
    if (p.includes('/core/')) { infractores.push({ fichero: p, motivo: "copia del núcleo en un directorio 'core/' anidado fuera de core/" }); continue; }
    if (p.startsWith('core/')) continue; // el propio núcleo
    // ¿replica exacta de un fichero del núcleo, colocada fuera de core/?
    for (const cr of rel) {
      if (p === cr || p.endsWith('/' + cr)) { infractores.push({ fichero: p, motivo: `copia del fichero de núcleo core/${cr} fuera de core/` }); break; }
    }
  }
  return { ok: infractores.length === 0, infractores };
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  const { ok, infractores } = checkFuenteUnica(trackedFiles());
  if (!ok) {
    console.error('[fuente-unica] FALLA:\n' + infractores.map((i) => ` - ${i.fichero}: ${i.motivo}`).join('\n'));
    process.exit(1);
  }
  console.log('[fuente-unica] OK: core/ es la única copia versionada del núcleo.');
}
