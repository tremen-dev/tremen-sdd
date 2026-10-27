// SPEC-025 CA-3: captura los golden ejecutando el CÓDIGO BASE, no el de la rama.
//
//   node tools/tests/golden/captura.mjs <árbol-base>
//
// <árbol-base> es un worktree del commit base (origin/main en el punto de
// integración, anotado en el ledger) con los cuatro adaptadores construidos
// (`npm run build:all` dentro del worktree). Escribe es.json, scaffold-es.json y
// barrera-es.json junto a este fichero. Las variantes `es` y `sin-idioma` deben
// dar lo mismo en el código base (no conoce el idioma); si no, aborta.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ejecutaCasos, ejecutaScaffold, ejecutaBarrera, VARIANTES } from './_casos.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const base = path.resolve(process.argv[2] ?? '');
if (!process.argv[2] || !fs.existsSync(path.join(base, 'core'))) {
  console.error('Uso: captura.mjs <árbol-base con core/ y dist/>');
  process.exit(1);
}
const coreDir = path.join(base, 'core');
const dist = Object.fromEntries(['claude-code', 'kimi-code', 'opencode', 'antigravity'].map((h) => [h, path.join(base, 'dist', h)]));
const escribe = (n, obj) => fs.writeFileSync(path.join(AQUI, n), JSON.stringify(obj, null, 2) + '\n');

const es = await ejecutaCasos({ coreDir, dist, sddJson: VARIANTES.es });
const sin = await ejecutaCasos({ coreDir, dist, sddJson: VARIANTES['sin-idioma'] });
if (JSON.stringify(es) !== JSON.stringify(sin)) {
  console.error('[captura] el código base da salidas distintas con y sin idioma');
  process.exit(1);
}
escribe('es.json', es);
escribe('scaffold-es.json', await ejecutaScaffold({ coreDir, sddJson: VARIANTES.es }));
escribe('barrera-es.json', ejecutaBarrera({ coreDir }));
console.log(`[captura] ${Object.keys(es).length} casos desde ${base}`);
