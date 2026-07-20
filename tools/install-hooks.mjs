#!/usr/bin/env node
// Instala el pre-commit L2 (ADR-002): apunta core.hooksPath al directorio
// VERSIONADO tools/githooks. Sin husky, sin symlinks, sin dependencias nuevas.
// Es un paso de setup POR CLON (no hay postinstall porque no hay ciclo de
// npm install con deps). Reejecútalo tras cada clon fresco: `npm run hooks:install`.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'tools/githooks';
try {
  execSync(`git config core.hooksPath ${DIR}`, { stdio: 'inherit' });
  // El bit ejecutable es imprescindible en POSIX: git NO ejecuta un hook sin +x
  // (en Windows git no rastrea el modo, pero chmod es inocuo). Garantizarlo aquí
  // cubre el caso de un shim que llegó al árbol sin +x (p. ej. copia con cpSync).
  const shim = path.join(DIR, 'pre-commit');
  if (fs.existsSync(shim)) fs.chmodSync(shim, 0o755);
  console.log(`[hooks:install] core.hooksPath = ${DIR}. El pre-commit L2 está activo.`);
} catch (e) {
  console.error(`[hooks:install] no se pudo configurar core.hooksPath: ${e.message}`);
  process.exit(1);
}
