#!/usr/bin/env node
// Regenera docs/tablero.md desde los frontmatters. Único escritor autorizado
// del tablero; editarlo a mano lo bloquea el hook protege-verdad.
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../lib/frontmatter.mjs';
import { esEntrypoint } from '../lib/entrypoint.mjs';
import { hoy } from '../lib/fecha.mjs';

function leer(ruta) {
  return parseFrontmatter(fs.readFileSync(ruta, 'utf8')).data;
}

export function renderBoard(docsDir, fecha) {
  fecha ??= hoy();
  const base = path.join(docsDir, 'epicas');
  const lineas = [
    '<!-- GENERADO por tremen-sdd (scripts/tablero.mjs). NO EDITAR A MANO. -->',
    `# Tablero`, '', `Actualizado: ${fecha}`, '',
  ];
  const recuento = {};
  for (const epDir of (fs.existsSync(base) ? fs.readdirSync(base).sort() : [])) {
    const dir = path.join(base, epDir);
    if (!fs.statSync(dir).isDirectory()) continue;
    const epica = fs.existsSync(path.join(dir, '_epica.md')) ? leer(path.join(dir, '_epica.md')) : { id: epDir, estado: '?' };
    const slugDir = epDir.replace(/^EPIC-[^-]+-?/, '');
    const titulo = slugDir ? `${epica.id} — ${slugDir}` : epica.id;
    lineas.push(`## ${titulo} (${epica.estado})`, '');
    lineas.push('| Spec | Estado | Último cambio |', '|---|---|---|');
    for (const f of fs.readdirSync(dir).filter((n) => /^SPEC-.*\.md$/.test(n) && !n.endsWith('.ledger.md')).sort()) {
      const d = leer(path.join(dir, f));
      recuento[d.estado] = (recuento[d.estado] ?? 0) + 1;
      const ultimo = d.historial?.at(-1);
      lineas.push(`| ${d.id} — ${f.replace(/^SPEC-\d{3}-/, '').replace(/\.md$/, '')} | ${d.estado} | ${ultimo ? `${ultimo.fecha} (${ultimo.por})` : '—'} |`);
    }
    lineas.push('');
  }
  // Sección global de ADRs: entre las épicas y el Resumen. Se OMITE si no hay
  // docs/adr/ (o está vacío), para no alterar la salida existente. Los ADRs NO
  // se cuentan en el Resumen (semántica del recuento = specs por estado).
  const adrDir = path.join(docsDir, 'adr');
  const adrs = (fs.existsSync(adrDir) ? fs.readdirSync(adrDir) : [])
    .filter((n) => /^ADR-.*\.md$/.test(n)).sort();
  if (adrs.length) {
    lineas.push('## ADRs', '');
    lineas.push('| ADR | Estado | Título | Último cambio |', '|---|---|---|---|');
    for (const f of adrs) {
      const d = leer(path.join(adrDir, f));
      const titulo = f.replace(/^ADR-\d{3}-/, '').replace(/\.md$/, '');
      const ultimo = d.historial?.at(-1);
      lineas.push(`| ${d.id} | ${d.estado} | ${titulo} | ${ultimo ? `${ultimo.fecha} (${ultimo.por})` : '—'} |`);
    }
    lineas.push('');
  }
  lineas.push('## Resumen', '', ...Object.entries(recuento).map(([e, n]) => `- ${e}: ${n}`), '');
  return lineas.join('\n');
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  const dir = path.resolve(process.argv.includes('--dir') ? process.argv[process.argv.indexOf('--dir') + 1] : 'docs');
  fs.writeFileSync(path.join(dir, 'tablero.md'), renderBoard(dir));
  console.log(`[tablero] regenerado ${path.join(dir, 'tablero.md')}`);
}
