// Fixtures compartidas de los tests de SPEC-032 (no es un test: no lo recoge el
// glob *.test.mjs). Reutiliza el proyecto temporal de SPEC-030 y añade ledgers
// con secciones, tabla de evidencia y repos git temporales. Nunca el árbol real.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export { proyecto, valida, estadoCli, VALIDA, ESTADO } from './_ca-manual-fixtures.mjs';

const CORE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const RONDA = path.join(CORE, 'scripts', 'ronda-acotada.mjs');

export const CABECERA_MATRIZ = '| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |';
export const CABECERA_EVIDENCIA = '| CA | Entorno | Ejecutó | Observado | Commit | Fecha | Notas |';
export const SHA40 = '1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d';

// Filas de matriz: { 'CA-1': '✅' } o [['CA-1', '✅'], …] (para repetir un id).
export const filasMatriz = (estados) => (Array.isArray(estados) ? estados : Object.entries(estados))
  .map(([ca, e]) => `| ${ca} | x.mjs | x.test.mjs | ok | ${e} |`);

// Una fila de evidencia a partir de sus celdas (en el orden de la cabecera).
export const filaEvidencia = (...c) => `| ${c.join(' | ')} |`;

// Tabla: cabecera, separador y filas.
export const tabla = (cabecera, filas) => {
  const n = cabecera.split('|').length - 2;
  return [cabecera, '|' + '---|'.repeat(n), ...filas];
};

// Ledger con secciones. `matriz`: estados (ver filasMatriz) o null (sin sección
// de matriz). `evidencia`: filas de evidencia o null (sin sección). `antes`:
// líneas que van en «Resumen», antes de la matriz. `evidenciaPrimero`: la sección
// de evidencia va delante de la de la matriz.
export function ledgerSecciones({ matriz = {}, evidencia = [], antes = [], evidenciaPrimero = false, cabeceraEvidencia = CABECERA_EVIDENCIA } = {}) {
  const secMatriz = matriz === null ? [] : ['## Matriz de criterios de aceptación', '<!-- comentario -->',
    ...tabla(CABECERA_MATRIZ, filasMatriz(matriz)), ''];
  const secEvidencia = evidencia === null ? [] : ['## Evidencia de CA manuales', '<!-- solo se añaden filas -->',
    ...tabla(cabeceraEvidencia, evidencia), ''];
  return [
    '---', 'id: SPEC-001', 'tipo: ledger', 'epica: EPIC-001', '---', '# Ledger — SPEC-001', '',
    '## Resumen', '- Fase: x', ...antes, '',
    ...(evidenciaPrimero ? [...secEvidencia, ...secMatriz] : [...secMatriz, ...secEvidencia]),
    '## Veredicto del verificador', '', '## Salvedades / follow-ups', '',
  ].join('\n');
}

// Spec del modelo de CA-4/CA-5: CA-1 automático, CA-2 manual con [staging] y
// [produccion], CA-3 manual con una comprobación sin etiqueta.
export const ca2 = (bloquea = 'sí') => ['### CA-2 [manual] — En dos entornos', '- `ejecuta`: humano', `- \`bloquea-hecho\`: ${bloquea}`,
  '- `comprobacion` [staging]: GET /x con la cuenta sin el feature → 403',
  '- `comprobacion` [produccion]: la misma, contra producción'];
export const SPEC_EVIDENCIA = (bloqueaCa2 = 'sí') => ['# SPEC-001', '',
  '### CA-1 — Automático', '- **Given**: …', '',
  ...ca2(bloqueaCa2), '',
  '### CA-3 [manual] — Una comprobación', '- `ejecuta`: orquestador', '- `bloquea-hecho`: sí',
  '- `comprobacion`: el panel muestra el recurso activo', ''].join('\n');

// Evidencia completa de SPEC_EVIDENCIA.
export const EVIDENCIA_COMPLETA = [
  filaEvidencia('CA-2', 'staging', 'Alberto Fojo', '403 sin el feature', '1a2b3c4', '2026-11-26', ''),
  filaEvidencia('CA-2', 'produccion', 'Alberto Fojo', '403 sin el feature', '1a2b3c4', '2026-11-26', ''),
  filaEvidencia('CA-3', '', 'sdd-orquestador', 'recurso activo', SHA40, '2026-11-26', 'consentimiento confirmado'),
];

// --- Repos git temporales (CA-6, CA-7) ---

export function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

// Inicializa un repo en la raíz del proyecto y commitea todo. Devuelve el SHA.
export function repo(raiz) {
  git(raiz, 'init', '-q', '-b', 'main');
  git(raiz, 'config', 'user.email', 'test@example.com');
  git(raiz, 'config', 'user.name', 'Test');
  git(raiz, 'config', 'core.autocrlf', 'false');
  return commitTodo(raiz, 'inicio');
}

export function commitTodo(raiz, mensaje) {
  git(raiz, 'add', '-A');
  git(raiz, 'commit', '-q', '--allow-empty', '-m', mensaje);
  return git(raiz, 'rev-parse', 'HEAD');
}

export function escribe(raiz, rel, texto) {
  const f = path.join(raiz, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, texto);
}

export function ronda(p, desde) {
  const r = spawnSync(process.execPath, [RONDA, p.spec, '--desde', desde], { cwd: p.raiz, encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}
