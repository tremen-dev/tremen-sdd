#!/usr/bin/env node
// Ensambla un adaptador instalable y AUTOCONTENIDO en dist/<harness>/.
// Cross-platform y DETERMINISTA (idempotente): copia verbatim la superficie de
// adapters/<harness>/ (menos sus tests de desarrollo) y el núcleo completo bajo
// dist/<harness>/core/, de modo que en el artefacto el núcleo se resuelve como
// ruta interna al plugin root (ADR-001). dist/ es gitignored: core/ sigue siendo
// la única copia versionada del método. No reescribe lógica: solo copia.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Piezas de la superficie del adaptador que NO viajan en el plugin instalable.
const EXCLUYE_DEL_ADAPTADOR = new Set(['tests']);

export function buildAdapter(harness, { repoRoot = REPO_ROOT, outDir } = {}) {
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

  return outDir;
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  const harness = process.argv[2] || 'claude-code';
  try {
    const out = buildAdapter(harness);
    console.log(`[build-adapter] ${harness} -> ${path.relative(REPO_ROOT, out)}`);
  } catch (e) {
    console.error(`[build-adapter] ${e.message}`);
    process.exit(1);
  }
}
