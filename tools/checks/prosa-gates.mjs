#!/usr/bin/env node
// SPEC-006 CA-6: la prosa del documentalista debe contener la regla dura de que
// NO ejecuta transiciones de gate ni cierra/propone cerrar una épica — el cierre
// de épica es un gate humano. Este check verifica la PRESENCIA de la regla escrita
// (RN-06, fuente única). La garantía de comportamiento es la barrera estructural
// de estado.mjs (SPEC-006 CA-1..CA-4); esto solo refuerza en prosa.
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './_util.mjs';
import { esEntrypoint } from '../../core/lib/entrypoint.mjs';

export const DOC_DOCUMENTALISTA = 'core/roles/es/sdd-documentalista.md';

// Normaliza para que la comprobación no sea frágil ante acentos, mayúsculas,
// marcas markdown (*, `) o espaciado: quita diacríticos y colapsa blancos.
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[*`]/g, '').replace(/\s+/g, ' ');

// Marcadores que la prosa del documentalista DEBE contener (CA-6). No es un
// censo de wording exacto: son los tres conceptos irrenunciables.
export const REGLAS_REQUERIDAS = [
  { id: 'no-ejecuta-gate', re: /no ejecutas transiciones de gate/, que: 'que no ejecuta transiciones de gate humano' },
  { id: 'no-propone-cerrar-epica', re: /ni propones cerrar una epica/, que: 'que no cierra ni propone cerrar una épica' },
  { id: 'cierre-epica-es-humano', re: /cierre de epica es un gate humano/, que: 'que el cierre de épica es un gate humano' },
];

export function checkProsaGates(contenido) {
  const t = norm(contenido);
  const faltan = REGLAS_REQUERIDAS.filter((r) => !r.re.test(t));
  return { ok: faltan.length === 0, faltan };
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  const { ok, faltan } = checkProsaGates(fs.readFileSync(path.join(REPO_ROOT, DOC_DOCUMENTALISTA), 'utf8'));
  if (!ok) {
    console.error(`[prosa-gates] FALLA: la prosa de sdd-documentalista (${DOC_DOCUMENTALISTA}) no contiene la regla dura esperada:\n`
      + faltan.map((r) => ` - falta ${r.que}`).join('\n'));
    process.exit(1);
  }
  console.log('[prosa-gates] OK: sdd-documentalista prohíbe explícitamente cerrar/proponer cerrar épicas.');
}
