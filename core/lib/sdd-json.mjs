// Lector ÚNICO de .sdd.json (ADR-017 §1). Lo usan los hooks y plugins de los
// cuatro adaptadores, el pre-commit L2 y la resolución del idioma: ningún otro
// sitio hace JSON.parse de .sdd.json. Tres estados:
//   - ausente:  no hay fichero (proyecto sin tremen-sdd, ADR-015);
//   - valida:   es un objeto JSON (con un BOM UTF-8 inicial, también);
//   - ilegible: existe pero no se puede leer o no es un objeto JSON. NO es un
//     fallo de la herramienta: es un estado determinado que cierra los gates
//     (ADR-017 §2).
// No localiza la raíz: lee la que le pasan. Solo importa node:* (RN-02).
import fs from 'node:fs';
import path from 'node:path';

export const SDD_JSON = '.sdd.json';
export const MOTIVO_NO_OBJETO = 'no es un objeto JSON';

// { estado: 'ausente' | 'valida' | 'ilegible', ruta, config?, motivo? }
export function leerSddJson(raiz) {
  const ruta = path.resolve(raiz, SDD_JSON);
  let texto;
  try {
    texto = fs.readFileSync(ruta, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return { estado: 'ausente', ruta };
    return { estado: 'ilegible', ruta, motivo: e.message };
  }
  if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1);
  let config;
  try {
    config = JSON.parse(texto);
  } catch (e) {
    return { estado: 'ilegible', ruta, motivo: e.message };
  }
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    return { estado: 'ilegible', ruta, motivo: MOTIVO_NO_OBJETO };
  }
  return { estado: 'valida', ruta, config };
}

// ¿`fichero` (relativo a `raiz` o absoluto) es el propio .sdd.json de `raiz`?
// Es la única escritura que require-spec permite con la configuración ilegible,
// para poder arreglarla desde el harness (ADR-017 §2).
export function esSddJsonDe(raiz, fichero) {
  if (!fichero) return false;
  return path.relative(path.resolve(raiz), path.resolve(raiz, fichero)) === SDD_JSON;
}
