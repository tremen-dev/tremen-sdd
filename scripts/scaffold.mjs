#!/usr/bin/env node
// Crea artefactos SDD numerados desde plantilla. La numeración la hace ESTE
// script, nunca el LLM ("la estructura se scriptea, el juicio se escribe").
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TPL = (name) => path.join(PLUGIN_ROOT, 'templates', 'artefactos', name);
const TIPOS = {
  epica: { prefijo: 'EPIC', plantilla: '_epica.md' },
  spec: { prefijo: 'SPEC', plantilla: 'SPEC.md' },
  task: { prefijo: 'TASK', plantilla: 'TASK.md' },
  adr: { prefijo: 'ADR', plantilla: 'ADR.md' },
};

export function slugify(titulo) {
  return titulo.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function nextId(docsDir, prefijo) {
  let max = 0;
  const re = new RegExp(`^${prefijo}-(\\d{3})`);
  const stack = [docsDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const m = e.name.match(re);
      if (m) max = Math.max(max, Number(m[1]));
      if (e.isDirectory()) stack.push(path.join(dir, e.name));
    }
  }
  return `${prefijo}-${String(max + 1).padStart(3, '0')}`;
}

function findEpicaDir(docsDir, epicaId) {
  const base = path.join(docsDir, 'epicas');
  if (!fs.existsSync(base)) return null;
  return fs.readdirSync(base).map((n) => path.join(base, n))
    .find((p) => path.basename(p) === epicaId || path.basename(p).startsWith(epicaId + '-')) ?? null;
}

export function createArtifact({ tipo, titulo, epica, docsDir, fecha }) {
  const cfg = TIPOS[tipo];
  if (!cfg) throw new Error(`Tipo desconocido: ${tipo}. Usa epica|spec|task|adr.`);
  fecha ??= new Date().toISOString().slice(0, 10);
  const id = nextId(docsDir, cfg.prefijo);
  const slug = slugify(titulo);
  const rellena = (tpl) => tpl
    .replaceAll('{{ID}}', id).replaceAll('{{SLUG}}', slug)
    .replaceAll('{{TITULO}}', titulo).replaceAll('{{FECHA}}', fecha)
    .replaceAll('{{EPICA}}', epica ?? '');
  let destino;
  if (tipo === 'epica') {
    const dir = path.join(docsDir, 'epicas', `${id}-${slug}`);
    fs.mkdirSync(dir, { recursive: true });
    destino = path.join(dir, '_epica.md');
  } else if (tipo === 'adr') {
    fs.mkdirSync(path.join(docsDir, 'adr'), { recursive: true });
    destino = path.join(docsDir, 'adr', `${id}-${slug}.md`);
  } else {
    if (!epica) throw new Error(`Un ${tipo} necesita --epica EPIC-NNN.`);
    const epicaDir = findEpicaDir(docsDir, epica);
    if (!epicaDir) throw new Error(`No existe la épica ${epica} bajo ${docsDir}/epicas.`);
    destino = path.join(epicaDir, `${id}-${slug}.md`);
  }
  fs.writeFileSync(destino, rellena(fs.readFileSync(TPL(cfg.plantilla), 'utf8')));
  if (tipo === 'spec') {
    fs.writeFileSync(destino.replace(/\.md$/, '.ledger.md'),
      rellena(fs.readFileSync(TPL('SPEC.ledger.md'), 'utf8')));
  }
  return destino;
}

// CLI: node scaffold.mjs <tipo> "<titulo>" [--epica EPIC-NNN] [--dir docs]
if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  const [tipo, titulo] = process.argv.slice(2);
  const epica = process.argv.includes('--epica') ? process.argv[process.argv.indexOf('--epica') + 1] : undefined;
  const dir = process.argv.includes('--dir') ? process.argv[process.argv.indexOf('--dir') + 1] : 'docs';
  try {
    console.log(createArtifact({ tipo, titulo, epica, docsDir: path.resolve(dir) }));
  } catch (e) {
    console.error(`[scaffold] ${e.message}`);
    process.exit(1);
  }
}
