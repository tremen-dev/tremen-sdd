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
  const esAuto = cfg.linter === 'auto' || !cfg.linter;
  let linter = esAuto ? autodetecta(ext) : cfg.linter;
  // `auto` no basta con acertar por extensión: exige que el linter esté
  // realmente CONFIGURADO en la raíz del proyecto. Sin su config, tratar como
  // `none` (no lint, exit 0, sin ruido). Un `linter` explícito NO exige config.
  if (esAuto && linter !== 'none' && !tieneConfig(linter, cwd)) linter = 'none';
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

// ¿El linter autodetectado está CONFIGURADO en la raíz del proyecto? Solo
// gobierna la rama `auto`: si no hay config, `auto` degrada a `none` (silencio,
// no ruido). Ficheros de config convencionales de cada linter soportado.
function tieneConfig(linter, cwd) {
  if (linter === 'eslint') {
    const flat = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts'];
    let entradas = [];
    try { entradas = fs.readdirSync(cwd); } catch { /* raíz ilegible: sin config */ }
    if (entradas.some((e) => flat.includes(e) || e.startsWith('.eslintrc'))) return true;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
      if (pkg.eslintConfig) return true;
    } catch { /* sin package.json o sin la clave */ }
    return false;
  }
  if (linter === 'ruff') {
    if (fs.existsSync(path.join(cwd, 'ruff.toml')) || fs.existsSync(path.join(cwd, '.ruff.toml'))) return true;
    try {
      if (/^\s*\[tool\.ruff/m.test(fs.readFileSync(path.join(cwd, 'pyproject.toml'), 'utf8'))) return true;
    } catch { /* sin pyproject.toml o sin la sección */ }
    return false;
  }
  if (linter === 'dart') return fs.existsSync(path.join(cwd, 'analysis_options.yaml'));
  return false;
}

function comando(linter, fichero) {
  if (linter === 'ruff') return ['ruff', 'check', fichero];
  if (linter === 'eslint') return ['npx', 'eslint', fichero];
  if (linter === 'dart') return ['dart', 'analyze', fichero];
  return null;
}
