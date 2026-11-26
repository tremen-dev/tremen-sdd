// Fixtures compartidas de los tests de SPEC-030 (no es un test: no lo recoge el
// glob *.test.mjs). Proyectos temporales con .sdd.json, nunca el árbol real.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CORE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const VALIDA = path.join(CORE, 'scripts', 'valida.mjs');
export const ESTADO = path.join(CORE, 'scripts', 'estado.mjs');

// Historial coherente con el estado: aprobada por una persona antes de avanzar.
function frontmatterSpec(estado) {
  const h = ['  - {estado: borrador, fecha: 2026-11-01, por: sdd-arquitecto}'];
  if (estado !== 'borrador') h.push('  - {estado: aprobada, fecha: 2026-11-02, por: Alberto Fojo}');
  if (['en-progreso', 'en-revision'].includes(estado)) h.push('  - {estado: en-progreso, fecha: 2026-11-03, por: sdd-implementador}');
  if (estado === 'en-revision') h.push('  - {estado: en-revision, fecha: 2026-11-04, por: sdd-implementador}');
  return `---\nid: SPEC-001\ntipo: spec\nepica: EPIC-001\nestado: ${estado}\nhistorial:\n${h.join('\n')}\n---\n`;
}

// Matriz de ledger con la columna Estado indicada por CA: { 'CA-1': '✅', … }.
// SPEC-032 CA-5 (ADR-020 §4): un CA manual en ✅ exige su fila de evidencia. En
// las specs de estos tests el CA manual que puede ir en ✅ es CA-1, con una sola
// comprobación sin etiqueta; la sección de evidencia trae su fila (cambio de
// fixture justificado en el ledger de SPEC-032; las aserciones no cambian).
export function ledger(estados) {
  const filas = Object.entries(estados).map(([ca, e]) => `| ${ca} | x.mjs | x.test.mjs | ok | ${e} |`);
  return [
    '---', 'id: SPEC-001', 'tipo: ledger', 'epica: EPIC-001', '---', '# Ledger — SPEC-001', '',
    '## Matriz de criterios de aceptación',
    '| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |',
    '|---|---|---|---|---|',
    ...filas, '',
    '## Evidencia de CA manuales',
    '| CA | Entorno | Ejecutó | Observado | Commit | Fecha | Notas |',
    '|---|---|---|---|---|---|---|',
    '| CA-1 | | Alberto Fojo | el panel muestra el recurso | 1a2b3c4 | 2026-11-26 | |', '',
  ].join('\n');
}

// Proyecto temporal con una épica y SPEC-001 (cuerpo `cuerpo`); ledger opcional.
export function proyecto(cuerpo, { estado = 'borrador', ledger: textoLedger } = {}) {
  const raiz = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-spec030-')));
  fs.writeFileSync(path.join(raiz, '.sdd.json'), '{}');
  const ep = path.join(raiz, 'docs', 'epicas', 'EPIC-001-x');
  fs.mkdirSync(ep, { recursive: true });
  fs.writeFileSync(path.join(ep, '_epica.md'),
    '---\nid: EPIC-001\ntipo: epica\nestado: aprobada\nhistorial:\n  - {estado: borrador, fecha: 2026-11-01, por: sdd-producto}\n  - {estado: aprobada, fecha: 2026-11-01, por: Alberto Fojo}\n---\n# E\n');
  const spec = path.join(ep, 'SPEC-001-x.md');
  fs.writeFileSync(spec, frontmatterSpec(estado) + cuerpo);
  const led = path.join(ep, 'SPEC-001-x.ledger.md');
  if (textoLedger !== undefined) fs.writeFileSync(led, textoLedger);
  return { raiz, docs: path.join(raiz, 'docs'), spec, ledger: led };
}

export function valida(p) {
  const r = spawnSync(process.execPath, [VALIDA, '--dir', p.docs], { cwd: p.raiz, encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}

export function estadoCli(p, nuevo, por) {
  const r = spawnSync(process.execPath, [ESTADO, p.spec, nuevo, '--por', por], { cwd: p.raiz, encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}

// Una spec del modelo válida y pequeña: CA-1 manual, CA-2 automático.
export const CA1_MANUAL = ['### CA-1 [manual] — Recorrido', '- `ejecuta`: humano', '- `bloquea-hecho`: sí',
  '- `comprobacion`: el panel muestra el recurso activo'];
export const CA2_AUTO = ['### CA-2 — Automático', '- **Given**: …'];
export const cuerpo = (...bloques) => '# SPEC-001\n\n' + bloques.map((b) => b.join('\n')).join('\n\n') + '\n';

// SPEC-030 CA-1: el cuerpo de la fixture, tal como lo da la spec.
export const CUERPO_CA1 = [
  '# SPEC-001 — Fixture',
  '',
  '## Criterios de aceptación',
  '',
  '### CA-1 — Automático sin ficha',
  '- **Given**: …',
  '',
  '### CA-2 [manual] — Recorrido en dispositivo',
  '',
  '- `ejecuta`: orquestador',
  '- `bloquea-hecho`: sí',
  '- `precondiciones`: app de la tienda desinstalada',
  '- `precondiciones`: cuenta con el feature activo',
  '- `consentimiento`: desinstalar la app del móvil de pruebas',
  '- `manos`: cambio de IAM en producción',
  '- `comprobacion` [staging]: GET /recurso con cuenta con el feature → 200; sin él → 403',
  '- `comprobacion` [produccion]: la misma, contra producción',
  '- `depende-de`: CA-1',
  '- **Given**: …',
  '  - `ejecuta`: esto ya no es ficha, es texto del CA',
  '',
  '- **CA-3** [manual]: Dado … cuando … entonces …',
  '  - `ejecuta`: humano',
  '  - `bloquea-hecho`: no',
  '  - `cuando`: tras-merge',
  '  - `comprobacion`: la limpieza programada aparece activa en el panel',
  '',
  '- **CA-4**: Dado … cuando … entonces …',
  '  - `bloquea-hecho`: no',
  '  - `depende-de`: CA-2, CA-3',
  '',
  '### CA-M5 [manual] — Revisión de idioma',
  '- `ejecuta`: humano',
  '- `bloquea-hecho`: si',
  '- `comprobacion`: la persona revisora firma la lista de cadenas',
  '',
  '<!--',
  '### CA-6 [manual] — Ejemplo dentro de un comentario',
  '-->',
  '',
].join('\n');
