// Catálogos de mensajes por idioma (ADR-016 §2). Un catálogo es
// <dir>/<idioma>/mensajes.json: un objeto plano `clave -> plantilla`, con
// interpolación `{nombre}` (nunca `${…}`, reservado bajo core/ a `${SDD_*}`,
// ADR-004). La MISMA función sirve al núcleo (core/mensajes/) y a cada
// adaptador, que le pasa su propio directorio (adapters/<harness>/mensajes/).
//
// Fallback por clave: si falta en el idioma pedido (o falta su catálogo), se usa
// la de `es`. Una clave que no existe ni en `es` es un error de programación.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// `es` es el idioma origen (ADR-016 §1). Vive aquí, y idioma.mjs lo reexporta,
// para que entrypoint.mjs (barrera de ADR-015) lea el catálogo sin un ciclo de
// módulos: mensajes.mjs no importa nada del núcleo.
export const IDIOMA_ORIGEN = 'es';
export const MENSAJES_NUCLEO = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'mensajes');

function leeCatalogo(dir, idioma) {
  try {
    const obj = JSON.parse(fs.readFileSync(path.join(dir, idioma, 'mensajes.json'), 'utf8'));
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

// Sustituye cada `{nombre}` presente en `vars`; lo demás queda literal. Una sola
// pasada: el valor insertado no se vuelve a interpolar.
export function interpola(plantilla, vars = {}) {
  return plantilla.replace(/\{([A-Za-z0-9_-]+)\}/g, (m, k) => (Object.hasOwn(vars, k) ? String(vars[k]) : m));
}

// Devuelve t(clave, vars) para el catálogo de `dir` en `idioma`.
export function traductor(dir, idioma = IDIOMA_ORIGEN) {
  const origen = leeCatalogo(dir, IDIOMA_ORIGEN);
  const propio = idioma === IDIOMA_ORIGEN ? origen : leeCatalogo(dir, idioma);
  return (clave, vars) => {
    const plantilla = Object.hasOwn(propio, clave) ? propio[clave]
      : Object.hasOwn(origen, clave) ? origen[clave] : undefined;
    if (typeof plantilla !== 'string') {
      throw new Error(`Clave de mensaje inexistente en el catálogo '${IDIOMA_ORIGEN}' de ${dir}: '${clave}'`);
    }
    return interpola(plantilla, vars);
  };
}

// Traductor del catálogo del núcleo.
export function mensajesNucleo(idioma) {
  return traductor(MENSAJES_NUCLEO, idioma);
}
