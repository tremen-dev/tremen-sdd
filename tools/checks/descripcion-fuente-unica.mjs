#!/usr/bin/env node
// SPEC-005 / ADR-005 / RN-11: la `description` de disparo de cada rol tiene una
// FUENTE CANÓNICA ÚNICA en core/roles/es/_descripciones.json (forma `larga` para
// la superficie de disparo agent/skill; forma `corta` para el blurb del mapa
// `subagents:` de Kimi). El harness lee ese campo LITERAL —no puede referenciar un
// fichero como sí hace el cuerpo (RN-06)—, así que las copias siguen autoradas en
// cada adaptador pero DEBEN COINCIDIR con la canónica. Este check las enumera y,
// para cada rol y cada superficie de AMBOS adaptadores (Claude agents+skills, Kimi
// skills + mapa subagents), compara la description autorada —normalizando el
// plegado YAML (`>` colapsa saltos a espacios)— con su forma canónica, y FALLA
// nombrando rol + superficie + forma esperada si diverge, falta, o no está cubierta.
// Es el ENFORCEMENT de RN-11. No reescribe lógica ni toca el build (RN-02, ADR-001/004).
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './_util.mjs';
import { parseYamlKimi } from './_yaml.mjs';
import { esEntrypoint } from '../../core/lib/entrypoint.mjs';

// Normaliza para la comparación: colapsa cualquier run de espacios/saltos (el
// plegado YAML del escalar `>` produce saltos que valen como espacio) y recorta.
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

// Extrae la `description` del frontmatter de un .md: soporta escalar inline
// (`description: texto`) y escalar plegado por bloque (`description: >` + líneas
// indentadas). Devuelve el texto crudo (sin normalizar) o null si no hay campo.
export function descripcionFrontmatter(texto) {
  const fm = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const lineas = fm[1].split(/\r?\n/);
  const idx = lineas.findIndex((l) => /^description:/.test(l));
  if (idx === -1) return null;
  const head = lineas[idx].slice('description:'.length).trim();
  // Inline: hay valor y NO es un indicador de bloque (`>`, `|`, con `+`/`-`).
  if (head && !/^[>|][+-]?$/.test(head)) return head;
  // Bloque: recoge las líneas siguientes más indentadas que la clave (indent 0);
  // una línea en blanco no cierra el bloque (sería un salto de párrafo del `>`).
  const out = [];
  for (let i = idx + 1; i < lineas.length; i++) {
    const l = lineas[i];
    if (l.trim() === '') continue;
    const indent = l.length - l.trimStart().length;
    if (indent === 0) break; // otra clave top-level del frontmatter
    out.push(l.trim());
  }
  return out.length ? out.join(' ') : null;
}

function listaDir(dir, filtro) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).filter(filtro).map((e) => e.name).sort();
}

// Enumera TODAS las superficies de disparo con description de ambos adaptadores,
// cada una con su rol, la forma canónica que le toca y la description autorada.
export function enumeraSuperficies(repoRoot = REPO_ROOT) {
  const sup = [];
  const leerMd = (fichero, meta) => {
    const desc = descripcionFrontmatter(fs.readFileSync(fichero, 'utf8'));
    sup.push({ ...meta, ubicacion: path.relative(repoRoot, fichero), descripcion: desc });
  };

  // (1) agents markdown con description en frontmatter → larga. Claude y opencode
  //     definen un agente por fichero .md (top-level) con description; Kimi no
  //     (sus agentes son YAML y sus prompts no llevan frontmatter de disparo).
  for (const adaptador of ['claude-code', 'opencode']) {
    const agentsDir = path.join(repoRoot, 'adapters', adaptador, 'agents');
    for (const f of listaDir(agentsDir, (e) => e.isFile() && e.name.endsWith('.md'))) {
      leerMd(path.join(agentsDir, f), { adaptador, tipo: 'agent', forma: 'larga', rol: f.replace(/\.md$/, '') });
    }
  }
  // (2) Claude skills → larga   (3) Kimi skills → larga   (opencode skills → larga)
  for (const adaptador of ['claude-code', 'kimi-code', 'opencode']) {
    const skillsDir = path.join(repoRoot, 'adapters', adaptador, 'skills');
    for (const rol of listaDir(skillsDir, (e) => e.isDirectory())) {
      const skill = path.join(skillsDir, rol, 'SKILL.md');
      if (fs.existsSync(skill)) leerMd(skill, { adaptador, tipo: 'skill', forma: 'larga', rol });
    }
  }
  // (4) Kimi mapa subagents del raíz → corta
  const raizPath = path.join(repoRoot, 'adapters', 'kimi-code', 'agents', 'sdd-orquestador.yaml');
  if (fs.existsSync(raizPath)) {
    let raiz;
    try { raiz = parseYamlKimi(fs.readFileSync(raizPath, 'utf8')); } catch { raiz = null; }
    const subs = raiz?.subagents ?? {};
    for (const rol of Object.keys(subs)) {
      sup.push({
        adaptador: 'kimi-code', tipo: 'subagents', forma: 'corta', rol,
        ubicacion: `${path.relative(repoRoot, raizPath)} → subagents.${rol}`,
        descripcion: subs[rol]?.description ?? null,
      });
    }
  }
  return sup;
}

export function checkDescripciones(repoRoot = REPO_ROOT) {
  const canonPath = path.join(repoRoot, 'core', 'roles', 'es', '_descripciones.json');
  let canonica;
  try { canonica = JSON.parse(fs.readFileSync(canonPath, 'utf8')); }
  catch (e) { return { ok: false, errores: [`no se puede leer la canónica ${path.relative(repoRoot, canonPath)}: ${e.message}`], cubiertas: [] }; }

  const errores = [];
  const cubiertas = [];
  for (const s of enumeraSuperficies(repoRoot)) {
    const marca = `${s.rol} [${s.adaptador}/${s.tipo}] (${s.ubicacion})`;
    const esperada = canonica?.[s.rol]?.[s.forma];
    if (esperada === undefined) {
      errores.push(`${marca}: superficie NO CUBIERTA — no hay forma '${s.forma}' para '${s.rol}' en la canónica (${path.relative(repoRoot, canonPath)}).`);
      continue;
    }
    if (s.descripcion == null) {
      errores.push(`${marca}: falta la description (se esperaba la forma '${s.forma}' canónica).`);
      continue;
    }
    cubiertas.push({ adaptador: s.adaptador, tipo: s.tipo, rol: s.rol, forma: s.forma });
    if (norm(s.descripcion) !== norm(esperada)) {
      errores.push(`${marca}: la description NO COINCIDE con la forma '${s.forma}' canónica.\n`
        + `      esperada: ${norm(esperada)}\n      autorada: ${norm(s.descripcion)}`);
    }
  }
  return { ok: errores.length === 0, errores, cubiertas };
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  const { ok, errores, cubiertas } = checkDescripciones();
  if (!ok) {
    console.error('[descripcion-fuente-unica] FALLA (RN-11):\n' + errores.map((e) => ' - ' + e).join('\n'));
    process.exit(1);
  }
  console.log(`[descripcion-fuente-unica] OK: ${cubiertas.length} superficies coinciden con su forma canónica (RN-11).`);
}
