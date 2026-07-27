#!/usr/bin/env node
// Ensambla un adaptador instalable y AUTOCONTENIDO en dist/<harness>/.
// Cross-platform y DETERMINISTA (idempotente): copia verbatim la superficie de
// adapters/<harness>/ (menos sus tests de desarrollo) y el núcleo completo bajo
// dist/<harness>/core/, de modo que en el artefacto el núcleo se resuelve como
// ruta interna al plugin root (ADR-001). dist/ es gitignored en las ramas de
// fuente: core/ sigue siendo la única copia EDITABLE del método (ADR-010 §7).
// No reescribe lógica: copia, y ESTAMPA la procedencia (SPEC-016 CA-1).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { esEntrypoint } from '../core/lib/entrypoint.mjs';

const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Piezas de la superficie del adaptador que NO viajan en el plugin instalable.
const EXCLUYE_DEL_ADAPTADOR = new Set(['tests']);

// Fichero de trazabilidad que viaja DENTRO de cada árbol publicado (ADR-010 §5):
// llega a la cache del harness instalado y responde "¿qué versión tengo?" (CE-3).
export const PROVENANCE = 'PROVENANCE.json';

// JSON estable: 2 espacios y salto final. Determinista por construcción.
export const escribeJson = (destino, obj) => fs.writeFileSync(destino, JSON.stringify(obj, null, 2) + '\n');

const leeJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

// Datos de procedencia de UN árbol. La `fecha` es la del COMMIT de fuente en UTC,
// no la hora de pared: si fuese la hora de build, dos corridas del mismo commit
// no serían byte-idénticas y se rompería el determinismo que exige ADR-001 y
// verifica SPEC-016 CA-2 ([H4]). Sin git (o sin commits) no se puede afirmar que
// el árbol esté limpio: commit null y `sucio: true`, que es el lado seguro.
export function procedencia(harness, { repoRoot = REPO_ROOT } = {}) {
  const version = leeJson(path.join(repoRoot, 'package.json')).version ?? null;
  let commit = null;
  let fecha = null;
  let sucio = true;
  try {
    commit = git(['rev-parse', 'HEAD'], repoRoot);
    fecha = new Date(git(['show', '-s', '--format=%cI', 'HEAD'], repoRoot)).toISOString();
    sucio = git(['status', '--porcelain'], repoRoot).length > 0;
  } catch {
    commit = null;
    fecha = null;
    sucio = true;
  }
  return { version, commit, harness, fecha, sucio };
}

export function buildAdapter(harness, { repoRoot = REPO_ROOT, outDir, proc } = {}) {
  const adapterDir = path.join(repoRoot, 'adapters', harness);
  const coreDir = path.join(repoRoot, 'core');
  if (!fs.existsSync(adapterDir)) {
    throw new Error(`No existe el adaptador adapters/${harness}.`);
  }
  if (!fs.existsSync(coreDir)) {
    throw new Error('No existe core/. El build empaqueta el núcleo dentro del adaptador.');
  }
  outDir ??= path.join(repoRoot, 'dist', harness);

  // Limpieza total para que dos ejecuciones den un árbol idéntico (idempotencia).
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  // 1) Superficie del adaptador (menos sus tests de desarrollo), en orden estable.
  for (const entry of fs.readdirSync(adapterDir).sort()) {
    if (EXCLUYE_DEL_ADAPTADOR.has(entry)) continue;
    fs.cpSync(path.join(adapterDir, entry), path.join(outDir, entry), { recursive: true });
  }

  // 2) Núcleo completo bajo dist/<harness>/core/ (ruta interna al plugin root).
  fs.cpSync(coreDir, path.join(outDir, 'core'), { recursive: true });

  // 3) Procedencia + sello de versión (SPEC-016 CA-1, ADR-010 §4 y §5).
  //    package.json.version es la ÚNICA fuente de versión; el artefacto la lleva
  //    estampada para que "lo instalado" sea identificable sin leer el fuente.
  const p = proc ?? procedencia(harness, { repoRoot });
  escribeJson(path.join(outDir, PROVENANCE), p);
  const pluginJson = path.join(outDir, '.claude-plugin', 'plugin.json');
  if (fs.existsSync(pluginJson)) {
    escribeJson(pluginJson, { ...leeJson(pluginJson), version: p.version });
  }

  return outDir;
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  const harness = process.argv[2] || 'claude-code';
  try {
    const out = buildAdapter(harness);
    console.log(`[build-adapter] ${harness} -> ${path.relative(REPO_ROOT, out)}`);
  } catch (e) {
    console.error(`[build-adapter] ${e.message}`);
    process.exit(1);
  }
}
