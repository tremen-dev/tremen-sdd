#!/usr/bin/env node
// Instala el pre-commit L2 (ADR-002): apunta core.hooksPath al directorio
// VERSIONADO tools/githooks. Sin husky, sin symlinks, sin dependencias nuevas.
// Es un paso de setup POR CLON (no hay postinstall porque no hay ciclo de
// npm install con deps). Reejecútalo tras cada clon fresco: `npm run hooks:install`.
import { execSync } from 'node:child_process';

const DIR = 'tools/githooks';
try {
  execSync(`git config core.hooksPath ${DIR}`, { stdio: 'inherit' });
  console.log(`[hooks:install] core.hooksPath = ${DIR}. El pre-commit L2 está activo.`);
} catch (e) {
  console.error(`[hooks:install] no se pudo configurar core.hooksPath: ${e.message}`);
  process.exit(1);
}
