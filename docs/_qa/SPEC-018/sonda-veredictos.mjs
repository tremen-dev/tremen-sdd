// Sonda del verificador: aplica los mecanismos M1 y M3 tal y como ADR-012 los
// define, sobre CADA documento del corpus, contra el árbol simulado de arbol.json.
// No es el check de la spec #2: es la comprobación mínima de que cada caso puede
// salir del color que declara bajo el bucle que LEEME.md publica.
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'D:/src/tremen-sdd/tools/tests/fixtures/afirmaciones';
const casos = JSON.parse(fs.readFileSync(path.join(DIR, 'casos.json'), 'utf8'));
const arbol = JSON.parse(fs.readFileSync(path.join(DIR, 'arbol.json'), 'utf8'));

const ficheros = new Set(arbol.ficheros);
const dirs = new Set();
for (const f of arbol.ficheros) {
  const partes = f.split('/');
  for (let i = 1; i < partes.length; i++) dirs.add(partes.slice(0, i).join('/') + '/');
}
const existe = (p) => ficheros.has(p) || dirs.has(p) || dirs.has(p + '/') || ficheros.has(p.replace(/\/$/, ''));

// Artefactos que el árbol simulado materializa
const reglas = new Set([...(arbol.contenidos['docs/fundacion/reglas.md'].match(/RN-\d{2}/g) ?? [])]);
const adrs = new Set(arbol.ficheros.filter(f => f.startsWith('docs/adr/')).map(f => f.match(/ADR-\d{3}/)[0]));
const specs = new Set(arbol.ficheros.map(f => f.match(/SPEC-\d{3}/)?.[0]).filter(Boolean));
const epics = new Set(arbol.ficheros.map(f => f.match(/EPIC-\d{3}/)?.[0]).filter(Boolean));

const RAICES = ['core/', 'adapters/', 'tools/', 'docs/', 'site/'];
const LEXICO = ['aún no', 'aun no', 'por ahora', 'migrará', 'en el roadmap', 'pendiente', 'sin resolver', 'hoy'];

for (const c of casos) {
  const txt = fs.readFileSync(path.join(DIR, c.documento), 'utf8');
  const fallos = [];

  // M1 — identificadores citados que no resuelven (plantillas NNN excluidas)
  for (const id of txt.match(/\b(?:RN-\d{2}|ADR-\d{3}|SPEC-\d{3}|EPIC-\d{3})\b/g) ?? []) {
    const ok = id.startsWith('RN') ? reglas.has(id)
      : id.startsWith('ADR') ? adrs.has(id)
      : id.startsWith('SPEC') ? specs.has(id) : epics.has(id);
    if (!ok) fallos.push(`M1 id colgado: ${id}`);
  }
  // M1 — rutas ancladas entre backticks
  for (const m of txt.match(/`[^`\n]+`/g) ?? []) {
    const r = m.slice(1, -1);
    if (!RAICES.some(x => r.startsWith(x))) continue;
    if (/NNN|<[a-z]+>|\$\{/.test(r)) continue;          // plantilla
    if (!existe(r)) fallos.push(`M1 ruta anclada colgada: ${r}`);
  }
  // M3 — léxico de volatilidad (sin mirar exenciones)
  const exento = /<!--\s*sdd:volatil-ok\s+\S/.test(txt);
  for (const l of LEXICO) {
    const re = new RegExp(`(^|[^\\w])${l}([^\\w]|$)`, 'i');
    if (re.test(txt)) fallos.push(`M3 léxico «${l}»${exento ? ' (hay exención con motivo en el doc)' : ''}`);
  }

  const color = fallos.length ? 'ROJO' : 'verde';
  const choca = (c.veredicto === 'verde' && fallos.length > 0);
  if (choca || process.env.TODO) {
    console.log(`${choca ? '### CHOCA' : '   '} ${c.id} [declara ${c.veredicto}] -> sonda ${color}`);
    for (const f of fallos) console.log(`        ${f}`);
  }
}
