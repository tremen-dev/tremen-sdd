#!/usr/bin/env node
// PostToolUse: exit 2 devuelve el problema a Claude como feedback accionable.
// (a) artefactos SDD: coherencia frontmatter/estado/historial (valida.mjs).
// (b) código: linter del proyecto (autodetección u override en .sdd.json).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readPayload, readConfig } from './_comun.mjs';
import { validateFile } from '../core/scripts/valida.mjs';

const ES_ARTEFACTO = /(^|[\\/])((SPEC|TASK|ADR)-[^\\/]+\.md|_epica\.md)$/;

try {
  const payload = readPayload();
  const cwd = payload.cwd || process.cwd();
  const cfg = readConfig(cwd);
  if (!cfg || cfg.gates?.calidad === false) process.exit(0);
  const fichero = payload.tool_input?.file_path ?? '';
  if (!fichero) process.exit(0);
  const ruta = path.resolve(cwd, fichero);
  if (!fs.existsSync(ruta)) process.exit(0);

  if (ES_ARTEFACTO.test(ruta) && !ruta.endsWith('.ledger.md')) {
    const errores = validateFile(ruta, path.join(cwd, 'docs'));
    if (errores.length) {
      console.error(`[sdd-calidad] Artefacto inconsistente:\n` + errores.map((e) => ` - ${e}`).join('\n'));
      process.exit(2);
    }
    process.exit(0);
  }

  const ext = path.extname(ruta);
  const linter = cfg.linter === 'auto' || !cfg.linter ? autodetecta(ext) : cfg.linter;
  const cmd = comando(linter, ruta);
  if (!cmd) process.exit(0);
  const usaShell = process.platform === 'win32';
  const args = usaShell ? cmd.slice(1).map((a) => /\s/.test(a) ? `"${a}"` : a) : cmd.slice(1);
  const r = spawnSync(cmd[0], args, { cwd, encoding: 'utf8', shell: usaShell });
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
