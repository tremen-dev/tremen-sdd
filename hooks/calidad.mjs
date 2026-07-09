#!/usr/bin/env node
// PostToolUse: exit 2 devuelve el problema a Claude como feedback accionable.
// (a) artefactos SDD: coherencia frontmatter/estado/historial (valida.mjs).
// (b) código: linter del proyecto (autodetección u override en .sdd.json).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readPayload, readConfig } from './_comun.mjs';
import { validateFile } from '../scripts/valida.mjs';

const ES_ARTEFACTO = /(^|[\\/])((SPEC|TASK|ADR)-[^\\/]+\.md|_epica\.md)$/;

try {
  const payload = readPayload();
  const cwd = payload.cwd || process.cwd();
  const cfg = readConfig(cwd);
  if (!cfg || cfg.gates?.calidad === false) process.exit(0);
  const fichero = payload.tool_input?.file_path ?? '';
  if (!fichero || !fs.existsSync(fichero)) process.exit(0);

  if (ES_ARTEFACTO.test(fichero) && !fichero.endsWith('.ledger.md')) {
    const errores = validateFile(fichero, path.join(cwd, 'docs'));
    if (errores.length) {
      console.error(`[sdd-calidad] Artefacto inconsistente:\n` + errores.map((e) => ` - ${e}`).join('\n'));
      process.exit(2);
    }
    process.exit(0);
  }

  const ext = path.extname(fichero);
  const linter = cfg.linter === 'auto' || !cfg.linter ? autodetecta(ext) : cfg.linter;
  const cmd = comando(linter, fichero);
  if (!cmd) process.exit(0);
  const r = spawnSync(cmd[0], cmd.slice(1), { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.error || r.status === null) process.exit(0); // linter no instalado: fail-open
  if (r.status !== 0) {
    console.error(`[sdd-calidad] ${linter} encontró problemas:\n${r.stdout}${r.stderr}`);
    process.exit(2);
  }
  process.exit(0);
} catch { process.exit(0); }

function autodetecta(ext) {
  if (ext === '.py') return 'ruff';
  if (['.js', '.jsx', '.ts', '.tsx', '.mjs'].includes(ext)) return 'eslint';
  if (ext === '.dart') return 'dart';
  return 'none';
}

function comando(linter, fichero) {
  if (linter === 'ruff') return ['ruff', 'check', fichero];
  if (linter === 'eslint') return ['npx', 'eslint', fichero];
  if (linter === 'dart') return ['dart', 'analyze', fichero];
  return null;
}
