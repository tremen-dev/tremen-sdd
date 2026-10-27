// Resolución del idioma del proyecto, FUENTE ÚNICA (ADR-013 §2). La usan los
// scripts del núcleo, la lib require-spec y los hooks de cada adaptador.
//
// - Los idiomas soportados son los subdirectorios de core/roles/ (ADR-013 §1):
//   ningún código enumera idiomas; añadir uno es crear directorios.
// - `es` es el idioma origen: existe siempre y es el fallback.
// - La resolución NO avisa ni lanza: sin .sdd.json, sin campo `idioma`, con un
//   valor no soportado o con JSON corrupto devuelve `es`. El único sitio que
//   señala un `idioma` no soportado es el CLI de valida.mjs (leerIdiomaDeclarado).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const IDIOMA_ORIGEN = 'es';
export const CORE_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Subdirectorios de core/roles/, ordenados.
export function idiomasSoportados(coreDir = CORE_DIR) {
  try {
    return fs.readdirSync(path.join(coreDir, 'roles'), { withFileTypes: true })
      .filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [IDIOMA_ORIGEN];
  }
}

// Lo que declara el .sdd.json de `raiz`, sin interpretarlo:
// { fichero: hay .sdd.json legible, declarado: tiene campo idioma, valor }.
export function leerIdiomaDeclarado(raiz) {
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(path.join(raiz, '.sdd.json'), 'utf8'));
  } catch {
    return { fichero: false, declarado: false, valor: undefined };
  }
  const declarado = cfg !== null && typeof cfg === 'object' && Object.hasOwn(cfg, 'idioma');
  return { fichero: true, declarado, valor: declarado ? cfg.idioma : undefined };
}

// Idioma efectivo del proyecto cuya raíz es `raiz` (la que contiene .sdd.json).
export function resolverIdioma(raiz, { coreDir = CORE_DIR } = {}) {
  try {
    if (!raiz) return IDIOMA_ORIGEN;
    const { valor } = leerIdiomaDeclarado(raiz);
    return typeof valor === 'string' && idiomasSoportados(coreDir).includes(valor) ? valor : IDIOMA_ORIGEN;
  } catch {
    return IDIOMA_ORIGEN;
  }
}

// Raíz del proyecto que contiene `desde` (fichero o directorio): el primer
// ancestro con .sdd.json, o null si no hay ninguno.
export function buscarRaizProyecto(desde) {
  try {
    let dir = path.resolve(desde);
    for (;;) {
      if (fs.existsSync(path.join(dir, '.sdd.json'))) return dir;
      const padre = path.dirname(dir);
      if (padre === dir) return null;
      dir = padre;
    }
  } catch {
    return null;
  }
}

// Idioma del proyecto que contiene `desde`.
export function idiomaDesde(desde, opciones) {
  return resolverIdioma(buscarRaizProyecto(desde), opciones);
}
