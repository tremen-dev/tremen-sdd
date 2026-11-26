// Lector ÚNICO de .sdd.json (ADR-017 §1). Lo usan los hooks y plugins de los
// cuatro adaptadores, el pre-commit L2 y la resolución del idioma: ningún otro
// sitio hace JSON.parse de .sdd.json. Tres estados:
//   - ausente:  no hay fichero (proyecto sin tremen-sdd, ADR-015);
//   - valida:   es un objeto JSON (con un BOM UTF-8 inicial, también);
//   - ilegible: existe pero no se puede leer, no es un objeto JSON o no cumple
//     el esquema mínimo de ADR-019 §1 (ESQUEMA_SDD_JSON). NO es un fallo de la
//     herramienta: es un estado determinado que cierra los gates (ADR-017 §2,
//     ADR-019 §2).
// No localiza la raíz: lee la que le pasan. Solo importa node:* (RN-02).
import fs from 'node:fs';
import path from 'node:path';

export const SDD_JSON = '.sdd.json';
export const MOTIVO_NO_OBJETO = 'no es un objeto JSON';

// Valores de `linter` que entiende el hook calidad (ADR-019 §1): lista cerrada.
export const LINTERS = Object.freeze(['auto', 'none', 'ruff', 'eslint', 'dart']);

// Esquema mínimo de .sdd.json (ADR-019 §1), declarado UNA vez y como dato (§3).
// Un campo ausente toma su valor por defecto; uno presente debe tener su tipo, y
// `null` cuenta como tipo equivocado. Las claves desconocidas, en la raíz o en
// `gates`, se aceptan. Un campo nuevo de .sdd.json se añade aquí en el mismo
// cambio: tools/tests/sdd-json-esquema-cobertura.test.mjs lo vigila (SPEC-029 CA-5).
export const ESQUEMA_SDD_JSON = Object.freeze({
  idioma: { tipo: 'string' },
  rutasVigiladas: { tipo: 'lista-de-strings' },
  linter: { tipo: 'uno-de', valores: LINTERS },
  gates: {
    tipo: 'objeto',
    campos: {
      requireSpec: { tipo: 'booleano' },
      protegeVerdad: { tipo: 'booleano' },
      calidad: { tipo: 'booleano' },
    },
  },
});

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Cómo se comprueba cada tipo del esquema y cómo se describe lo esperado.
const TIPOS = {
  string: { esperado: () => 'un string', valido: (v) => typeof v === 'string' },
  booleano: { esperado: () => 'un booleano', valido: (v) => typeof v === 'boolean' },
  objeto: { esperado: () => 'un objeto', valido: esObjeto },
  'lista-de-strings': {
    esperado: () => 'un array de strings no vacíos',
    valido: (v) => Array.isArray(v) && v.every((e) => typeof e === 'string' && e !== ''),
  },
  'uno-de': {
    esperado: (d) => `uno de ${d.valores.join(', ')}`,
    valido: (v, d) => typeof v === 'string' && d.valores.includes(v),
  },
};

// Todos los campos de `obj` que no cumplen `esquema`, en el orden del esquema:
// [{ campo, esperado, encontrado }]. Un objeto mal tipado no se recorre por dentro.
function erroresDeEsquema(obj, esquema = ESQUEMA_SDD_JSON, prefijo = '') {
  const errores = [];
  for (const [nombre, desc] of Object.entries(esquema)) {
    if (!Object.hasOwn(obj, nombre)) continue;
    const valor = obj[nombre];
    const campo = prefijo + nombre;
    const tipo = TIPOS[desc.tipo];
    if (!tipo.valido(valor, desc)) {
      errores.push({ campo, esperado: tipo.esperado(desc), encontrado: JSON.stringify(valor) ?? String(valor) });
    } else if (desc.campos) {
      errores.push(...erroresDeEsquema(valor, desc.campos, campo + '.'));
    }
  }
  return errores;
}

const motivoDeEsquema = (errores) => errores
  .map((e) => `\`${e.campo}\`: se esperaba ${e.esperado}, se encontró ${e.encontrado}`).join('; ');

// { estado: 'ausente' | 'valida' | 'ilegible', ruta, config?, motivo? }
// Si es ilegible por esquema, lleva además `errores` (los de erroresDeEsquema)
// y `leido` (el objeto tal cual, solo para diagnóstico: valida.mjs lo usa para
// informar también de un `idioma` no soportado, ADR-019 §4). Nunca `config`.
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
  const errores = erroresDeEsquema(config);
  if (errores.length) {
    return { estado: 'ilegible', ruta, motivo: motivoDeEsquema(errores), errores, leido: config };
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
