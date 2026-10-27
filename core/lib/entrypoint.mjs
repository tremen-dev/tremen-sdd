// Detección de entrypoint CLI, FUENTE ÚNICA y cross-platform.
//
// Un módulo .mjs que también actúa como CLI necesita saber si se ejecutó
// directamente (`node fichero.mjs`) o si sólo se importó. El idiom clásico
//   import.meta.url === new URL(`file:///${argv1.replaceAll('\\','/')}`).href
// es correcto SOLO en Windows: en POSIX `argv1` empieza por `/`, así que
// `file:///` + `/home/...` da CUATRO barras (`file:////home/...`) y nunca casa
// con el `import.meta.url` de tres barras → el bloque CLI no corre en Linux.
//
// `pathToFileURL` normaliza la ruta al MISMO esquema que Node usa para
// `import.meta.url` en cualquier plataforma, así que la comparación es fiable.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { mensajesNucleo, IDIOMA_ORIGEN } from './mensajes.mjs';

// ¿El módulo cuyo import.meta.url es `importMetaUrl` se ejecutó como entrypoint
// (`node <argv1>`)? Devuelve false si no hay argv1 (módulo sólo importado).
export function esEntrypoint(importMetaUrl, argv1) {
  return Boolean(argv1) && importMetaUrl === pathToFileURL(argv1).href;
}

// SPEC-024 CA-5 (ADR-015 §3.1): Asciende buscando .sdd.json con corte en .git.
// Si encuentra .sdd.json devuelve la ruta absoluta de la raíz. Si encuentra
// una frontera .git sin .sdd.json en ese nivel, o la raíz del FS, devuelve null.
export function buscarRaizSdd(desde = process.cwd()) {
  let cur = path.resolve(desde);
  try {
    if (fs.existsSync(cur) && !fs.statSync(cur).isDirectory()) {
      cur = path.dirname(cur);
    }
  } catch {
    // Si da error al hacer stat, continúa desde cur
  }

  while (true) {
    if (fs.existsSync(path.join(cur, '.sdd.json'))) {
      return cur;
    }
    if (fs.existsSync(path.join(cur, '.git'))) {
      return null;
    }
    const padre = path.dirname(cur);
    if (padre === cur) {
      return null;
    }
    cur = padre;
  }
}

// SPEC-024 CA-5 (ADR-015 §3.1): Barrera fail-closed. Exige que el proyecto
// objetivo tenga .sdd.json. Si no, lanza un Error que sugiere /sdd-init.
export function exigirProyectoSdd(desde = process.cwd()) {
  const raiz = buscarRaizSdd(desde);
  if (!raiz) {
    // Sin .sdd.json no hay idioma que leer: la barrera habla siempre `es` (ADR-016 §2).
    throw new Error(mensajesNucleo(IDIOMA_ORIGEN)('entrypoint.sin-sdd-json', { ruta: path.resolve(desde) }));
  }
  return raiz;
}
