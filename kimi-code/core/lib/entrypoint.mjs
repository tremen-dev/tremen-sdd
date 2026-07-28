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
import { pathToFileURL } from 'node:url';

// ¿El módulo cuyo import.meta.url es `importMetaUrl` se ejecutó como entrypoint
// (`node <argv1>`)? Devuelve false si no hay argv1 (módulo sólo importado).
export function esEntrypoint(importMetaUrl, argv1) {
  return Boolean(argv1) && importMetaUrl === pathToFileURL(argv1).href;
}
