#!/usr/bin/env node
// Única vía sancionada para cambiar el estado de un artefacto: valida la
// transición y añade la entrada de historial de forma atómica.
import fs from 'node:fs';
import { parseFrontmatter, stringifyFrontmatter } from '../lib/frontmatter.mjs';
import { esEntrypoint } from '../lib/entrypoint.mjs';
import { hoy } from '../lib/fecha.mjs';

export const TRANSITIONS = {
  borrador: ['aprobada', 'bloqueada'],
  aprobada: ['en-progreso', 'bloqueada'],
  'en-progreso': ['en-revision', 'bloqueada'],
  'en-revision': ['hecho', 'en-progreso', 'bloqueada'],
  bloqueada: ['borrador', 'aprobada', 'en-progreso', 'en-revision'],
  hecho: [],
};

// TRANSITIONS impone el ORDEN de los estados; esto impone QUIÉN firma los dos
// que son gates. Va en el script y no en los ficheros de rol a propósito: el
// mensaje de una transición fallida lista 'aprobada' entre las permitidas, y un
// agente que quiera desbloquearse lee esa lista como una invitación. La prosa
// del rol no le detiene; esto sí.
// Una persona: firma no vacía, no el default del CLI ('desconocido') y no un
// rol del método (namespace cerrado 'sdd-*'). Es el predicado de todo gate humano.
const esPersona = (por) => Boolean(por) && por !== 'desconocido' && !/^sdd-/i.test(por);

// La firma es una política por (tipo, estado destino), no una regla global: por
// eso los firmantes de 'hecho' leen data.tipo (ADR-006).
export const FIRMANTES = {
  // Gate humano: lo firma una persona. Ni un rol sdd-*, ni una firma ausente.
  aprobada: (por) => esPersona(por),
  // El cierre de una ÉPICA es un milestone del humano (persona, nunca un rol,
  // ni siquiera sdd-verificador). El de una spec/task lo firma el verificador
  // tras su GREEN: juez independiente ≠ autor, no es autocertificación (18ad848).
  hecho: (por, tipo) => (tipo === 'epica' ? esPersona(por) : /^sdd-verificador$/i.test(por)),
};

const MOTIVO_FIRMA = {
  aprobada: () => "'aprobada' es el gate humano: lo firma una persona con --por, y ningún rol sdd-* puede firmarlo. Presenta la spec y espera el OK explícito del humano.",
  hecho: (tipo) => (tipo === 'epica'
    ? "cerrar una épica ('hecho') es un gate humano: es un milestone del humano, lo firma una persona con --por, y ningún rol sdd-* (incluidos sdd-verificador y sdd-documentalista) puede cerrarla."
    : "'hecho' lo firma SOLO sdd-verificador, tras su veredicto GREEN con evidencia en el ledger. Nadie certifica su propio trabajo."),
};

// Estados que implican que ya se está construyendo. El gate humano no es un
// estado por el que se pasa —'bloqueada' es alcanzable desde 'borrador' y sale
// a 'en-progreso', así que el rodeo borrador -> bloqueada -> en-progreso deja a
// cualquiera codeando una spec que nadie aprobó, y require-spec lo permite—: es
// un HECHO DEL HISTORIAL, que es append-only y lo escribe este script.
const REQUIEREN_APROBACION = ['en-progreso', 'en-revision', 'hecho'];

export function fueAprobadaPorHumano(data) {
  return (data.historial ?? []).some(
    (h) => h?.estado === 'aprobada' && FIRMANTES.aprobada((h.por ?? '').trim()),
  );
}

export function transition(ruta, nuevoEstado, por, fecha) {
  fecha ??= hoy();
  const { data, body } = parseFrontmatter(fs.readFileSync(ruta, 'utf8'));
  const actual = data.estado;
  if (!TRANSITIONS[actual]) throw new Error(`Estado actual desconocido: '${actual}'.`);
  if (!TRANSITIONS[actual].includes(nuevoEstado)) {
    throw new Error(`Transición no permitida: ${actual} -> ${nuevoEstado}. Permitidas: ${TRANSITIONS[actual].join(', ') || '(ninguna, estado terminal)'}.`);
  }
  const firmaValida = FIRMANTES[nuevoEstado];
  if (firmaValida && !firmaValida((por ?? '').trim(), data.tipo)) {
    throw new Error(`Firma inválida para '${nuevoEstado}' (--por '${por ?? ''}'). ${MOTIVO_FIRMA[nuevoEstado](data.tipo)}`);
  }
  if (REQUIEREN_APROBACION.includes(nuevoEstado) && !fueAprobadaPorHumano(data)) {
    throw new Error(`'${nuevoEstado}' exige una aprobación humana previa, y el historial de esta spec no tiene ninguna entrada 'aprobada' firmada por una persona. El gate no se rodea por 'bloqueada': pide el OK del humano.`);
  }
  data.estado = nuevoEstado;
  // La plantilla de spec tiene el campo y nadie lo rellenaba: la aprobación
  // vivía solo en el historial, donde hay que ir a buscarla.
  if (nuevoEstado === 'aprobada') data['aprobada-por'] = por;
  data.historial = [...(data.historial ?? []), { estado: nuevoEstado, fecha, por }];
  fs.writeFileSync(ruta, stringifyFrontmatter(data, body));
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  const [ruta, nuevoEstado] = process.argv.slice(2);
  const por = process.argv.includes('--por') ? process.argv[process.argv.indexOf('--por') + 1] : 'desconocido';
  try {
    transition(ruta, nuevoEstado, por);
    console.log(`[estado] ${ruta}: -> ${nuevoEstado} (por ${por})`);
  } catch (e) {
    console.error(`[estado] ${e.message}`);
    process.exit(1);
  }
}
