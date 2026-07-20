#!/usr/bin/env node
// Pre-commit L2 (ADR-002): garantía LOCAL, FAIL-CLOSED, independiente del harness.
// Bloquea el commit (exit != 0) si el conjunto staged viola una regla expresable
// sobre contenido staged: require-spec (RN-01) y coherencia de artefactos (RN-07).
// NO reimplementa nada: invoca la MISMA lógica de core/ que usa el hook L1.
// Dos válvulas auditables: 'git commit --no-verify' (nativa de git, no dispara
// este hook) y SDD_SKIP_GATE=1 (coherencia entre capas con L1).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { evaluarRequireSpec } from '../../core/lib/require-spec.mjs';
import { validateFile } from '../../core/scripts/valida.mjs';

if (process.env.SDD_SKIP_GATE === '1') process.exit(0);

function git(args, cwd) {
  return execSync(`git ${args}`, { cwd, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
}

function leerConfig(root) {
  try { return JSON.parse(fs.readFileSync(path.join(root, '.sdd.json'), 'utf8')); } catch { return null; }
}

function esArtefactoSdd(rel) {
  rel = rel.replaceAll('\\', '/');
  if (!rel.startsWith('docs/') || !rel.endsWith('.md')) return false;
  const base = rel.slice(rel.lastIndexOf('/') + 1);
  return base === '_epica.md' || /^(EPIC|SPEC|TASK|ADR)-(\d{3}|FIX|INFRA|MANT|MEJORA)/.test(base);
}

function bloquear(msg) {
  console.error('\n[pre-commit] Commit BLOQUEADO (fail-closed, ADR-002 L2).\n' + msg
    + "\nVálvulas auditables: 'git commit --no-verify' o SDD_SKIP_GATE=1.\n");
  process.exit(1);
}

try {
  const repoRoot = git('rev-parse --show-toplevel', process.cwd());
  const cfg = leerConfig(repoRoot);
  const staged = git('diff --cached --name-only --diff-filter=ACMR', repoRoot)
    .split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (staged.length === 0) process.exit(0);

  // --- Capa require-spec (RN-01): código vigilado exige rama de spec válida ---
  if (!cfg || cfg.gates?.requireSpec !== false) {
    const vigiladas = (cfg?.rutasVigiladas ?? []).map((r) => {
      r = r.replaceAll('\\', '/');
      return r.endsWith('/') ? r : r + '/';
    });
    const tocaVigilado = staged.some((f) => {
      const rel = f.replaceAll('\\', '/');
      return vigiladas.some((r) => rel.startsWith(r) || rel + '/' === r);
    });
    if (tocaVigilado) {
      const rama = git('rev-parse --abbrev-ref HEAD', repoRoot);
      const { permitido, motivo } = evaluarRequireSpec({ rama, cwd: repoRoot });
      if (!permitido) bloquear(`RN-01 (nada se codea sin spec aprobada): ${motivo}`);
    }
  }

  // --- Capa coherencia de artefactos (RN-07): misma lógica que valida.mjs ---
  if (!cfg || cfg.gates?.calidad !== false) {
    const docsDir = path.join(repoRoot, 'docs');
    const errores = [];
    for (const f of staged) {
      const abs = path.join(repoRoot, f);
      if (!esArtefactoSdd(f) || !fs.existsSync(abs)) continue;
      errores.push(...validateFile(abs, docsDir));
    }
    if (errores.length) {
      bloquear('RN-07 (coherencia estado/historial de artefactos SDD):\n'
        + errores.map((e) => ` - ${e}`).join('\n'));
    }
  }

  process.exit(0);
} catch (e) {
  // Fail-closed: una garantía que cede ante un error no es garantía (ADR-002).
  bloquear(`Error inesperado en el gate: ${e.message}`);
}
