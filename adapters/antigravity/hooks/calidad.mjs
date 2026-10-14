#!/usr/bin/env node
// PostToolUse: valida coherencia de frontmatters en artefactos SDD editados.
import fs from 'node:fs';
import path from 'node:path';
import { readPayload, readConfig, extractFilePath, extractCwd } from './_comun.mjs';
import { validateFile } from '../core/scripts/valida.mjs';

const ES_ARTEFACTO = /(^|[\\/])((SPEC|TASK|ADR)-[^\\/]+\.md|_epica\.md)$/;

try {
  const payload = readPayload();
  const cwd = extractCwd(payload);
  const cfg = readConfig(cwd);
  if (!cfg || cfg.gates?.calidad === false) process.exit(0);
  const fichero = extractFilePath(payload);
  if (!fichero) process.exit(0);
  const ruta = path.resolve(cwd, fichero);
  if (!fs.existsSync(ruta)) process.exit(0);

  if (ES_ARTEFACTO.test(ruta) && !ruta.endsWith('.ledger.md')) {
    const errores = validateFile(ruta, path.join(cwd, 'docs'));
    if (errores.length) {
      console.error(`[sdd-calidad] Artefacto inconsistente:\n` + errores.map((e) => ` - ${e}`).join('\n'));
    }
  }
  console.log(JSON.stringify({}));
  process.exit(0);
} catch {
  console.log(JSON.stringify({}));
  process.exit(0);
}
