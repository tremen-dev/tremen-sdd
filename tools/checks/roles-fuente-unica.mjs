#!/usr/bin/env node
// CA-6 (base de CE-3): ningún agents/*.md embebe el cuerpo del system prompt del
// rol (## Misión / ## Flujo / ## Reglas duras); solo REFERENCIA el rol como única
// fuente (core/roles/<idioma>/...). core/roles/ es la única ruta con el cuerpo.
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, walk } from './_util.mjs';
import { esEntrypoint } from '../../core/lib/entrypoint.mjs';

const SECCIONES_CUERPO = [/^##\s+Misión/m, /^##\s+Flujo/m, /^##\s+Reglas duras/m];

export function checkAgentsProsa(agentsDir = path.join(REPO_ROOT, 'adapters', 'claude-code', 'agents')) {
  const infractores = [];
  for (const f of walk(agentsDir, (n) => n.endsWith('.md'))) {
    const s = fs.readFileSync(f, 'utf8');
    const rel = path.relative(agentsDir, f);
    const embebidas = SECCIONES_CUERPO.filter((re) => re.test(s)).map((re) => re.source);
    if (embebidas.length) infractores.push({ fichero: rel, motivo: `embebe prosa de rol (${embebidas.join(', ')})` });
    else if (!/core\/roles\//.test(s)) infractores.push({ fichero: rel, motivo: 'no referencia core/roles/ como fuente del rol' });
  }
  return { ok: infractores.length === 0, infractores };
}

// Generalización a TODOS los adaptadores (CA-2/CA-6): itera sobre adapters/*/agents/
// —recursivo, así cubre tanto los agents .md de Claude como los bootstrap .md de
// Kimi bajo agents/prompts/—. No reimplementa la regla: reutiliza checkAgentsProsa.
export function checkTodosAdaptadores(repoRoot = REPO_ROOT) {
  const adaptersDir = path.join(repoRoot, 'adapters');
  const infractores = [];
  const adaptadores = [];
  if (fs.existsSync(adaptersDir)) {
    for (const h of fs.readdirSync(adaptersDir).sort()) {
      const agentsDir = path.join(adaptersDir, h, 'agents');
      if (!fs.existsSync(agentsDir)) continue;
      adaptadores.push(h);
      for (const i of checkAgentsProsa(agentsDir).infractores) infractores.push({ ...i, adaptador: h });
    }
  }
  return { ok: infractores.length === 0, infractores, adaptadores };
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  const { ok, infractores, adaptadores } = checkTodosAdaptadores();
  if (!ok) {
    console.error('[roles-fuente-unica] FALLA:\n' + infractores.map((i) => ` - [${i.adaptador}] ${i.fichero}: ${i.motivo}`).join('\n'));
    process.exit(1);
  }
  console.log(`[roles-fuente-unica] OK: los agents referencian el rol, no lo copian (${adaptadores.join(', ')}).`);
}
