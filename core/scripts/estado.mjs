#!/usr/bin/env node
// Única vía sancionada para cambiar el estado de un artefacto: valida la
// transición y añade la entrada de historial de forma atómica.
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter, stringifyFrontmatter } from '../lib/frontmatter.mjs';
import { buscarRaizSdd, esEntrypoint, exigirProyectoSdd } from '../lib/entrypoint.mjs';
import { hoy } from '../lib/fecha.mjs';
import { idiomaDesde, resolverIdioma } from '../lib/idioma.mjs';
import { mensajesNucleo } from '../lib/mensajes.mjs';
import { esPersona } from '../lib/persona.mjs';
import { leerSddJson } from '../lib/sdd-json.mjs';
import { mensajeSddJsonIlegible } from '../lib/sdd-json-mensaje.mjs';
import {
  leerCAs, esSpecDelModelo, leerLedger, bloqueosHecho, manualesSinCerrar, enRegistro, rutaLedger,
} from '../lib/ca-manual.mjs';

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
// Una persona: el predicado de todo gate humano (ADR-006). Vive en una fuente
// única, core/lib/persona.mjs, porque también lo usan los calificadores
// `salvedad` y `confirmado` del ledger (ADR-020 §4).

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

// Clave de catálogo (core/mensajes/<idioma>/) con el motivo de cada firma inválida.
const MOTIVO_FIRMA = {
  aprobada: () => 'estado.motivo-firma-aprobada',
  hecho: (tipo) => (tipo === 'epica' ? 'estado.motivo-firma-hecho-epica' : 'estado.motivo-firma-hecho'),
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

// SPEC-030 CA-4 (ADR-020 §5): en una spec con algún CA [manual], 'hecho' exige
// que cada CA que bloquea el cierre esté cerrado en la matriz del ledger. Igual
// que FIRMANTES: la prosa del rol no detiene a un agente; la máquina de estados
// sí. Sin la marca no se aplica (ADR-020 §11). Lee con el lector único.
function guardaHecho(ruta, body, t, idioma) {
  const cas = leerCAs(body);
  if (!esSpecDelModelo(cas)) return;
  const ledger = rutaLedger(ruta);
  if (!fs.existsSync(ledger)) throw new Error(t('estado.hecho-sin-ledger', { ledger }));
  const bloqueos = bloqueosHecho(cas, leerLedger(fs.readFileSync(ledger, 'utf8'), idioma));
  if (!bloqueos.length) return;
  // SPEC-032 CA-1: un ledger sin matriz, o con dos, no dice qué CA cierran.
  const deLedger = bloqueos.filter((b) => !b.ca);
  if (deLedger.length) {
    throw new Error(deLedger.map((b) => t(`estado.hecho-${b.codigo}`, { ledger, ...b.vars })).join(' '));
  }
  const texto = {
    'sin-fila': (b) => t('estado.hecho-bloqueo-sin-fila', { ca: b.ca }),
    abierto: (b) => t('estado.hecho-bloqueo', { ca: b.ca, celda: b.celda }),
    repetida: (b) => t('estado.hecho-bloqueo-repetida', { ca: b.ca, ...b.vars }),
    'sin-evidencia': (b) => t('estado.hecho-bloqueo-sin-evidencia', { ca: b.ca, entorno: b.entorno }),
  };
  throw new Error(t('estado.hecho-bloqueado', { lista: bloqueos.map((b) => texto[b.codigo](b)).join('; ') }));
}

// SPEC-032 CA-9 (ADR-021): con `registroManuales` declarado en .sdd.json, una
// spec del modelo no pasa a 'en-revision' si algún CA manual bloqueante sin
// cerrar (estadoCierra del lector) no tiene en el registro una línea con el id
// de la spec y el del CA. Un registro declarado que no existe, o un .sdd.json
// ilegible, niegan la transición: ante la duda el gate se cierra (ADR-017).
function guardaRegistro(ruta, data, body, t, idioma) {
  const cas = leerCAs(body);
  if (!esSpecDelModelo(cas)) return;
  const raiz = buscarRaizSdd(ruta);
  if (!raiz) return;
  const lectura = leerSddJson(raiz);
  if (lectura.estado === 'ilegible') {
    throw new Error(t('estado.revision-sdd-json-ilegible', { motivo: mensajeSddJsonIlegible(lectura) }));
  }
  if (lectura.estado !== 'valida' || !Object.hasOwn(lectura.config, 'registroManuales')) return;
  const registro = path.resolve(raiz, lectura.config.registroManuales);
  const ledger = rutaLedger(ruta);
  const leido = leerLedger(fs.existsSync(ledger) ? fs.readFileSync(ledger, 'utf8') : '', idioma);
  const pendientes = manualesSinCerrar(cas, leido);
  if (!fs.existsSync(registro)) {
    throw new Error(t('estado.revision-registro-inexistente', { registro, lista: pendientes.join(', ') || '-' }));
  }
  const texto = fs.readFileSync(registro, 'utf8');
  const faltan = pendientes.filter((id) => !enRegistro(texto, data.id, id));
  if (faltan.length) throw new Error(t('estado.revision-registro-faltan', { registro, spec: data.id, lista: faltan.join(', ') }));
}

export function transition(ruta, nuevoEstado, por, fecha) {
  fecha ??= hoy();
  const { data, body } = parseFrontmatter(fs.readFileSync(ruta, 'utf8'));
  const idioma = idiomaDesde(path.dirname(path.resolve(ruta)));
  const t = mensajesNucleo(idioma);
  const actual = data.estado;
  if (!TRANSITIONS[actual]) throw new Error(t('estado.desconocido', { actual }));
  if (!TRANSITIONS[actual].includes(nuevoEstado)) {
    const permitidas = TRANSITIONS[actual].join(', ') || t('estado.ninguna-terminal');
    throw new Error(t('estado.transicion-no-permitida', { actual, nuevo: nuevoEstado, permitidas }));
  }
  const firmaValida = FIRMANTES[nuevoEstado];
  if (firmaValida && !firmaValida((por ?? '').trim(), data.tipo)) {
    const motivo = t(MOTIVO_FIRMA[nuevoEstado](data.tipo));
    throw new Error(t('estado.firma-invalida', { nuevo: nuevoEstado, por: por ?? '', motivo }));
  }
  if (REQUIEREN_APROBACION.includes(nuevoEstado) && !fueAprobadaPorHumano(data)) {
    throw new Error(t('estado.sin-aprobacion-humana', { nuevo: nuevoEstado }));
  }
  if (nuevoEstado === 'hecho' && data.tipo === 'spec') guardaHecho(ruta, body, t, idioma);
  if (nuevoEstado === 'en-revision' && data.tipo === 'spec') guardaRegistro(ruta, data, body, t, idioma);
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
    const raiz = exigirProyectoSdd(ruta ?? process.cwd());
    transition(ruta, nuevoEstado, por);
    const t = mensajesNucleo(resolverIdioma(raiz));
    console.log(t('estado.cli-exito', { ruta, nuevo: nuevoEstado, por }));
  } catch (e) {
    console.error(`[estado] ${e.message}`);
    process.exit(1);
  }
}
