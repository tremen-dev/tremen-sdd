#!/usr/bin/env node
// Ensambla el acta de verificación en HTML autocontenido (imágenes/vídeo en
// base64) a partir del ledger y de _qa/<SPEC-ID>/. Determinista: no usa LLM.
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../lib/frontmatter.mjs';
import { esEntrypoint, exigirProyectoSdd } from '../lib/entrypoint.mjs';
import { idiomaDesde, resolverIdioma } from '../lib/idioma.mjs';
import { mensajesNucleo } from '../lib/mensajes.mjs';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderReport(ledgerPath) {
  const raw = fs.readFileSync(ledgerPath, 'utf8');
  const { data, body } = parseFrontmatter(raw);
  const idioma = idiomaDesde(path.dirname(ledgerPath));
  const t = mensajesNucleo(idioma);
  const qaDir = path.join(path.dirname(ledgerPath), '_qa', data.id);
  if (!fs.existsSync(qaDir)) throw new Error(t('informe-qa.sin-qa', { qaDir, id: data.id }));
  const medios = fs.readdirSync(qaDir).filter((n) => /\.(png|webm)$/i.test(n)).sort().map((n) => {
    const b64 = fs.readFileSync(path.join(qaDir, n)).toString('base64');
    return /\.webm$/i.test(n)
      ? `<figure><video controls src="data:video/webm;base64,${b64}"></video><figcaption>${esc(n)}</figcaption></figure>`
      : `<figure><img src="data:image/png;base64,${b64}" alt="${esc(n)}"><figcaption>${esc(n)}</figcaption></figure>`;
  });
  // `lang` es el código del idioma resuelto; los textos, del catálogo.
  const html = `<!doctype html><html lang="${esc(idioma)}"><head><meta charset="utf-8">
<title>${esc(t('informe-qa.titulo', { id: data.id }))}</title>
<style>body{font:16px/1.5 system-ui;max-width:60rem;margin:2rem auto;padding:0 1rem}
figure{margin:1rem 0}img,video{max-width:100%;border:1px solid #ccc}
pre{background:#f6f6f6;padding:1rem;overflow-x:auto;white-space:pre-wrap}</style></head><body>
<h1>${esc(t('informe-qa.encabezado', { id: data.id }))}</h1>
<p>${esc(t('informe-qa.generado', { epica: data.epica ?? '—' }))}</p>
<h2>${esc(t('informe-qa.ledger'))}</h2><pre>${esc(body)}</pre>
<h2>${esc(t('informe-qa.evidencia', { n: medios.length }))}</h2>${medios.join('\n')}
</body></html>`;
  const out = path.join(qaDir, 'informe.html');
  return { html, out };
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  try {
    const ruta = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
    const raiz = exigirProyectoSdd(ruta);
    if (!process.argv[2]) {
      throw new Error(mensajesNucleo(resolverIdioma(raiz))('informe-qa.uso'));
    }
    const { html, out } = renderReport(ruta);
    fs.writeFileSync(out, html);
    console.log(`[informe-qa] ${out}`);
  } catch (e) {
    console.error(`[informe-qa] ${e.message}`);
    process.exit(1);
  }
}
