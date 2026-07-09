#!/usr/bin/env node
// Ensambla el acta de verificación en HTML autocontenido (imágenes/vídeo en
// base64) a partir del ledger y de _qa/<SPEC-ID>/. Determinista: no usa LLM.
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../lib/frontmatter.mjs';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderReport(ledgerPath) {
  const raw = fs.readFileSync(ledgerPath, 'utf8');
  const { data, body } = parseFrontmatter(raw);
  const qaDir = path.join(path.dirname(ledgerPath), '_qa', data.id);
  if (!fs.existsSync(qaDir)) throw new Error(`No existe ${qaDir} (_qa/${data.id}). Ejecuta primero la verificación con capturas.`);
  const medios = fs.readdirSync(qaDir).filter((n) => /\.(png|webm)$/i.test(n)).sort().map((n) => {
    const b64 = fs.readFileSync(path.join(qaDir, n)).toString('base64');
    return /\.webm$/i.test(n)
      ? `<figure><video controls src="data:video/webm;base64,${b64}"></video><figcaption>${esc(n)}</figcaption></figure>`
      : `<figure><img src="data:image/png;base64,${b64}" alt="${esc(n)}"><figcaption>${esc(n)}</figcaption></figure>`;
  });
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Informe QA — ${esc(data.id)}</title>
<style>body{font:16px/1.5 system-ui;max-width:60rem;margin:2rem auto;padding:0 1rem}
figure{margin:1rem 0}img,video{max-width:100%;border:1px solid #ccc}
pre{background:#f6f6f6;padding:1rem;overflow-x:auto;white-space:pre-wrap}</style></head><body>
<h1>Informe de verificación — ${esc(data.id)}</h1>
<p>Generado por tremen-sdd (informe-qa.mjs). Épica: ${esc(data.epica ?? '—')}.</p>
<h2>Ledger</h2><pre>${esc(body)}</pre>
<h2>Evidencia (${medios.length})</h2>${medios.join('\n')}
</body></html>`;
  const out = path.join(qaDir, 'informe.html');
  return { html, out };
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  try {
    const { html, out } = renderReport(path.resolve(process.argv[2]));
    fs.writeFileSync(out, html);
    console.log(`[informe-qa] ${out}`);
  } catch (e) {
    console.error(`[informe-qa] ${e.message}`);
    process.exit(1);
  }
}
