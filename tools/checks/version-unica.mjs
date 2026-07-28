#!/usr/bin/env node
// SPEC-016 CA-1c / ADR-010 §4: `package.json.version` del repo fuente es la ÚNICA
// fuente de versión. El build la ESTAMPA en el artefacto (PROVENANCE.json y el
// plugin.json de dist/), pero el árbol fuente también la declara —el plugin.json
// de claude-code viaja verbatim— y dos declaraciones que pueden divergir en
// silencio son exactamente el fallo que EPIC-004 existe para eliminar. Este check
// las enumera y FALLA si alguna diverge, si falta, o si la versión se declara
// además en la entrada del marketplace (la doc de Claude Code avisa: «Avoid
// setting version in both plugin.json and the marketplace entry»).
//
// Mira el ÁRBOL FUENTE, no dist/: lo generado es consecuencia, no fuente (RN-05).
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './_util.mjs';
import { esEntrypoint } from '../../core/lib/entrypoint.mjs';

const leeJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// Enumera las versiones declaradas en el árbol fuente. Autodescubre los
// adaptadores (patrón layout/roles-fuente-unica): un harness nuevo queda cubierto
// el día que se crea su directorio, sin tocar este check.
export function declaraciones(repoRoot = REPO_ROOT) {
  const out = [];
  const adaptersDir = path.join(repoRoot, 'adapters');
  if (!fs.existsSync(adaptersDir)) return out;
  for (const e of fs.readdirSync(adaptersDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!e.isDirectory()) continue;
    const plg = path.join(adaptersDir, e.name, '.claude-plugin', 'plugin.json');
    if (!fs.existsSync(plg)) continue; // no todo harness tiene plugin.json (Kimi, opencode)
    let doc;
    try { doc = leeJson(plg); } catch { doc = null; }
    out.push({ ubicacion: path.relative(repoRoot, plg).replaceAll('\\', '/'), version: doc?.version ?? null, invalido: doc === null });
  }
  return out;
}

export function checkVersionUnica(repoRoot = REPO_ROOT) {
  const errores = [];
  let esperada = null;
  try { esperada = leeJson(path.join(repoRoot, 'package.json')).version ?? null; }
  catch (e) { return { ok: false, errores: [`no se puede leer package.json: ${e.message}`], esperada: null, declaradas: [] }; }
  if (!esperada) errores.push('package.json no declara version (es la única fuente de versión, ADR-010 §4)');

  const declaradas = declaraciones(repoRoot);
  for (const d of declaradas) {
    if (d.invalido) { errores.push(`${d.ubicacion}: JSON inválido`); continue; }
    if (d.version == null) { errores.push(`${d.ubicacion}: no declara version (se esperaba ${esperada}, la de package.json)`); continue; }
    if (d.version !== esperada) {
      errores.push(`${d.ubicacion}: declara version ${d.version} y package.json declara ${esperada} — una sola fuente de versión (ADR-010 §4)`);
    }
  }

  // La entrada del marketplace NO debe declarar version (se resolvería antes que
  // el plugin.json y crearía una segunda fuente).
  const mk = path.join(repoRoot, '.claude-plugin', 'marketplace.json');
  if (fs.existsSync(mk)) {
    let doc;
    try { doc = leeJson(mk); } catch { doc = null; errores.push('.claude-plugin/marketplace.json: JSON inválido'); }
    for (const p of doc?.plugins ?? []) {
      if (p.version !== undefined) {
        errores.push(`.claude-plugin/marketplace.json: la entrada '${p.name ?? '?'}' declara version — la versión vive solo en plugin.json (ADR-010 §4)`);
      }
    }
  }

  return { ok: errores.length === 0, errores, esperada, declaradas };
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  const { ok, errores, esperada, declaradas } = checkVersionUnica();
  if (!ok) { console.error('[version-unica] FALLA:\n' + errores.map((e) => ' - ' + e).join('\n')); process.exit(1); }
  console.log(`[version-unica] OK: version ${esperada} en package.json y en ${declaradas.length} manifiesto(s) del fuente.`);
}
