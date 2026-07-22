#!/usr/bin/env node
// Runner agregado (ADR-002): reproducible en local y en CI (L3). Encadena
// build -> los SEIS checks de invariantes contra el árbol real -> valida sobre
// docs. Cualquier paso con exit != 0 tumba el runner (fail-closed). No
// reimplementa nada: invoca los scripts existentes de tools/ y core/.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esEntrypoint } from '../core/lib/entrypoint.mjs';

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export const PASOS = [
  { nombre: 'build', cmd: ['node', 'tools/build-adapter.mjs', 'claude-code'] },
  { nombre: 'build-kimi', cmd: ['node', 'tools/build-adapter.mjs', 'kimi-code'] },
  { nombre: 'layout', cmd: ['node', 'tools/checks/layout.mjs'] },
  { nombre: 'nucleo-aislado', cmd: ['node', 'tools/checks/nucleo-aislado.mjs'] },
  { nombre: 'nucleo-agnostico', cmd: ['node', 'tools/checks/nucleo-agnostico.mjs'] },
  { nombre: 'fuente-unica', cmd: ['node', 'tools/checks/fuente-unica.mjs'] },
  { nombre: 'referencias', cmd: ['node', 'tools/checks/referencias.mjs'] },
  { nombre: 'referencias-kimi', cmd: ['node', 'tools/checks/referencias.mjs', 'kimi-code'] },
  // roles-fuente-unica itera sobre TODOS los adaptadores (claude-code y kimi-code).
  { nombre: 'roles-fuente-unica', cmd: ['node', 'tools/checks/roles-fuente-unica.mjs'] },
  { nombre: 'manifiestos', cmd: ['node', 'tools/checks/manifiestos.mjs'] },
  { nombre: 'manifiestos-kimi', cmd: ['node', 'tools/checks/manifiestos.mjs', 'kimi-code'] },
  // descripcion-fuente-unica itera sobre AMBOS adaptadores (RN-11 / SPEC-005).
  { nombre: 'descripcion-fuente-unica', cmd: ['node', 'tools/checks/descripcion-fuente-unica.mjs'] },
  // prosa-gates: la prosa del documentalista prohíbe cerrar épicas (SPEC-006 CA-6).
  { nombre: 'prosa-gates', cmd: ['node', 'tools/checks/prosa-gates.mjs'] },
  { nombre: 'valida', cmd: ['node', 'core/scripts/valida.mjs', '--dir', 'docs'] },
];

export function ejecuta(pasos = PASOS, { cwd = REPO } = {}) {
  for (const p of pasos) {
    const r = spawnSync(p.cmd[0], p.cmd.slice(1), { cwd, stdio: 'inherit' });
    const code = r.status ?? 1;
    if (code !== 0) {
      console.error(`[check] paso '${p.nombre}' falló (exit ${code}).`);
      return code;
    }
  }
  console.log('[check] OK: build (claude+kimi) + checks (ambos adaptadores) + valida en verde.');
  return 0;
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  process.exit(ejecuta());
}
