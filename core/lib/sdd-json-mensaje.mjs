// Mensaje ÚNICO para un .sdd.json ilegible (ADR-017 §3, SPEC-027 CA-4). Lo
// emiten, con el mismo texto, los hooks y el plugin L1, el pre-commit L2 y
// valida.mjs (L3). Ninguna capa lo redacta por su cuenta: es la clave
// `sdd-json.ilegible` del catálogo del núcleo. Separado de sdd-json.mjs para que
// el lector siga importando solo node:* (RN-02).
import path from 'node:path';
import { idiomaDesde } from './idioma.mjs';
import { mensajesNucleo } from './mensajes.mjs';

// `lectura` es el resultado 'ilegible' de leerSddJson: { ruta, motivo }.
export function mensajeSddJsonIlegible({ ruta, motivo }) {
  return mensajesNucleo(idiomaDesde(path.dirname(ruta)))('sdd-json.ilegible', { ruta, motivo });
}
