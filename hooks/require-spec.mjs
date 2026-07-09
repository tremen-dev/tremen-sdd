#!/usr/bin/env node
// Gate PreToolUse: no se edita código vigilado sin rama ft/SPEC-NNN-slug y
// spec en 'aprobada' o 'en-progreso'. FAIL-OPEN: ante cualquier duda, permite.
// Válvula de escape: SDD_SKIP_GATE=1 (la reporta /sdd-como-vamos).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { readPayload, readConfig, deny, allow } from './_comun.mjs';
import { parseFrontmatter } from '../lib/frontmatter.mjs';

try {
  if (process.env.SDD_SKIP_GATE === '1') allow();
  const payload = readPayload();
  const cwd = payload.cwd || process.cwd();
  const cfg = readConfig(cwd);
  if (!cfg || cfg.gates?.requireSpec === false) allow();
  const fichero = payload.tool_input?.file_path ?? '';
  const rel = path.relative(cwd, fichero).replaceAll('\\', '/');
  if (rel.startsWith('..') || !(cfg.rutasVigiladas ?? []).some((r) => rel.startsWith(r))) allow();
  const rama = execSync('git rev-parse --abbrev-ref HEAD', { cwd, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
  const m = rama.match(/^ft\/(SPEC-\d{3})-/);
  if (!m) deny(`La rama '${rama}' no es una rama de spec (ft/SPEC-NNN-slug). Crea o aprueba la spec con /sdd-arquitecto y trabaja en su rama.`);
  const spec = buscarSpec(cwd, m[1]);
  if (!spec) deny(`No existe ${m[1]} bajo docs/epicas/. Créala con /sdd-arquitecto.`);
  const { data } = parseFrontmatter(fs.readFileSync(spec, 'utf8'));
  if (!['aprobada', 'en-progreso'].includes(data.estado)) {
    deny(`${m[1]} está en estado '${data.estado}'; para codear necesita 'aprobada' o 'en-progreso'. Pide la aprobación humana o transiciona con scripts/estado.mjs.`);
  }
  allow();
} catch { allow(); } // fail-open

function buscarSpec(cwd, id) {
  const base = path.join(cwd, 'docs', 'epicas');
  if (!fs.existsSync(base)) return null;
  for (const ep of fs.readdirSync(base)) {
    const dir = path.join(base, ep);
    if (!fs.statSync(dir).isDirectory()) continue;
    const f = fs.readdirSync(dir).find((n) => n.startsWith(id + '-') && n.endsWith('.md') && !n.endsWith('.ledger.md'));
    if (f) return path.join(dir, f);
  }
  return null;
}
