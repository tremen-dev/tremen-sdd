// Resolución del idioma del proyecto, FUENTE ÚNICA (ADR-016 §2). La usan los
// scripts del núcleo, la lib require-spec y los hooks de cada adaptador.
//
// - Los idiomas soportados son los subdirectorios de core/roles/ (ADR-016 §1):
//   ningún código enumera idiomas; añadir uno es crear directorios.
// - `es` es el idioma origen: existe siempre y es el fallback.
// - La raíz del proyecto es la de ADR-015 (buscarRaizSdd, corta en .git): aquí
//   no hay una segunda búsqueda de raíz.
// - La resolución NO avisa ni lanza: sin .sdd.json, sin campo `idioma`, con un
//   valor no soportado o con JSON corrupto devuelve `es`. El único sitio que
//   señala un `idioma` no soportado o un .sdd.json ilegible es el CLI de
//   valida.mjs (leerIdiomaDeclarado).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buscarRaizSdd } from './entrypoint.mjs';
import { IDIOMA_ORIGEN } from './mensajes.mjs';

export { IDIOMA_ORIGEN };
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
// { existe: hay fichero, fichero: es JSON legible, declarado: tiene campo idioma, valor }.
export function leerIdiomaDeclarado(raiz) {
  const ruta = path.join(raiz, '.sdd.json');
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  } catch {
    return { existe: fs.existsSync(ruta), fichero: false, declarado: false, valor: undefined };
  }
  const declarado = cfg !== null && typeof cfg === 'object' && Object.hasOwn(cfg, 'idioma');
  return { existe: true, fichero: true, declarado, valor: declarado ? cfg.idioma : undefined };
}

// Idioma efectivo del proyecto cuya raíz es `raiz` (la que contiene .sdd.json,
// tal como la devuelve buscarRaizSdd o exigirProyectoSdd). Raíz nula: `es`.
export function resolverIdioma(raiz, { coreDir = CORE_DIR } = {}) {
  try {
    if (!raiz) return IDIOMA_ORIGEN;
    const { valor } = leerIdiomaDeclarado(raiz);
    return typeof valor === 'string' && idiomasSoportados(coreDir).includes(valor) ? valor : IDIOMA_ORIGEN;
  } catch {
    return IDIOMA_ORIGEN;
  }
}

// { raiz, idioma } del proyecto que contiene `desde` (fichero o directorio).
export function resolverDesde(desde, opciones) {
  let raiz = null;
  try { raiz = buscarRaizSdd(desde); } catch { /* sin raíz: es */ }
  return { raiz, idioma: resolverIdioma(raiz, opciones) };
}

// Idioma del proyecto que contiene `desde`.
export function idiomaDesde(desde, opciones) {
  return resolverDesde(desde, opciones).idioma;
}
