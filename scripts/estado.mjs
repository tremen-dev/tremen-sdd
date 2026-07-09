#!/usr/bin/env node
// Única vía sancionada para cambiar el estado de un artefacto: valida la
// transición y añade la entrada de historial de forma atómica.
import fs from 'node:fs';
import { parseFrontmatter, stringifyFrontmatter } from '../lib/frontmatter.mjs';

export const TRANSITIONS = {
  borrador: ['aprobada', 'bloqueada'],
  aprobada: ['en-progreso', 'bloqueada'],
  'en-progreso': ['en-revision', 'bloqueada'],
  'en-revision': ['hecho', 'en-progreso', 'bloqueada'],
  bloqueada: ['borrador', 'aprobada', 'en-progreso', 'en-revision'],
  hecho: [],
};

export function transition(ruta, nuevoEstado, por, fecha) {
  fecha ??= new Date().toISOString().slice(0, 10);
  const { data, body } = parseFrontmatter(fs.readFileSync(ruta, 'utf8'));
  const actual = data.estado;
  if (!TRANSITIONS[actual]) throw new Error(`Estado actual desconocido: '${actual}'.`);
  if (!TRANSITIONS[actual].includes(nuevoEstado)) {
    throw new Error(`Transición no permitida: ${actual} -> ${nuevoEstado}. Permitidas: ${TRANSITIONS[actual].join(', ') || '(ninguna, estado terminal)'}.`);
  }
  data.estado = nuevoEstado;
  data.historial = [...(data.historial ?? []), { estado: nuevoEstado, fecha, por }];
  fs.writeFileSync(ruta, stringifyFrontmatter(data, body));
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
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
