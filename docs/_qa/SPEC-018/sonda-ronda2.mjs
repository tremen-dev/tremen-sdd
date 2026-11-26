// Sonda del verificador, ronda 2. Mutaciones DISTINTAS de las que trae la suite,
// para comprobar que el árbol enriquecido sigue discriminando y que los
// veredictos siguen atados a él.
import fs from 'node:fs';
import path from 'node:path';
import { CORPUS_DIR, cargaCorpus } from 'file:///D:/src/tremen-sdd/tools/tests/_corpus-afirmaciones.mjs';
import { evalua, evaluaCaso, resuelveInventario, hooksDeclarados }
  from 'file:///D:/src/tremen-sdd/tools/tests/_oraculo-afirmaciones.mjs';

const corpus = cargaCorpus();
const base = { arbol: corpus.arbol, registro: corpus.registro, lexico: corpus.lexico };
const clonaArbol = (mut) => { const a = JSON.parse(JSON.stringify(corpus.arbol)); mut(a); return { ...base, arbol: a }; };

const foto = (ctx) => Object.fromEntries(corpus.casos.map((c) => [c.id, evaluaCaso(c, CORPUS_DIR, ctx).veredicto]));
const control = foto(base);

console.log('=== 0. CONTROL: derivado vs declarado ===');
let desajustes = 0;
for (const c of corpus.casos) {
  if (control[c.id] !== c.veredicto) { desajustes++; console.log(`  DESAJUSTE ${c.id}: declara ${c.veredicto}, deriva ${control[c.id]}`); }
}
console.log(`  ${corpus.casos.length} casos, ${desajustes} desajustes`);
console.log(`  rojos declarados: ${corpus.casos.filter((c) => c.veredicto === 'rojo').length} · verdes: ${corpus.casos.filter((c) => c.veredicto === 'verde').length}`);

const mut = (nombre, ctx) => {
  const f = foto(ctx);
  const movidos = corpus.casos.filter((c) => f[c.id] !== control[c.id]);
  console.log(`\n=== ${nombre} ===`);
  if (!movidos.length) { console.log('  NO SE MOVIÓ NADA  <-- sospechoso'); return; }
  for (const c of movidos) {
    const m = evaluaCaso(c, CORPUS_DIR, ctx).motivos;
    console.log(`  ${c.id}: ${control[c.id]} -> ${f[c.id]}${m.length ? '   [' + m.join(' | ') + ']' : ''}`);
  }
};

// A) un adaptador MÁS (cursor): 3 -> 4
mut('A. añado adapters/cursor/ (adaptadores 3 -> 4)',
  clonaArbol((a) => a.ficheros.push('adapters/cursor/agents/sdd-arquitecto.md')));

// B) una regla MÁS en el contenido de reglas.md: 8 -> 9
mut('B. añado RN-09 al contenido de reglas.md (reglas 8 -> 9)',
  clonaArbol((a) => { a.contenidos['docs/fundacion/reglas.md'] += '\n- **RN-09 — Nadie aprueba su propio trabajo.**\n'; }));

// C) quito ADR-012 del árbol
mut('C. quito docs/adr/ADR-012-*.md del árbol',
  clonaArbol((a) => { a.ficheros = a.ficheros.filter((f) => !f.includes('ADR-012')); }));

// D) quito docs/fundacion/dominio.md
mut('D. quito docs/fundacion/dominio.md del árbol',
  clonaArbol((a) => { a.ficheros = a.ficheros.filter((f) => f !== 'docs/fundacion/dominio.md'); }));

// E) quito el fichero suelto calidad.mjs pero NO el manifiesto
mut('E. borro adapters/claude-code/hooks/calidad.mjs pero dejo el manifiesto intacto',
  clonaArbol((a) => { a.ficheros = a.ficheros.filter((f) => f !== 'adapters/claude-code/hooks/calidad.mjs'); }));

// ---------------------------------------------------------------------------
console.log('\n=== F. ¿EL ÁRBOL ENRIQUECIDO SIGUE DISCRIMINANDO? ===');
const sondas = [
  ['ADR inexistente en el árbol', 'La decisión la fija ADR-005.'],
  ['RN inexistente en el árbol', 'Lo gobierna RN-10 y también RN-11.'],
  ['SPEC inexistente en el árbol', 'Lo cerró SPEC-013.'],
  ['EPIC inexistente en el árbol', 'Trabajo de EPIC-002.'],
  ['ruta anclada inexistente', 'El publicador vive en `core/scripts/publica.mjs`.'],
  ['ruta anclada existente', 'La máquina de estados vive en `core/scripts/estado.mjs`.'],
  ['artefactos existentes', 'Lo fija ADR-011, lo ejerció SPEC-017 dentro de EPIC-005, y lo gobierna RN-08.'],
];
for (const [nombre, txt] of sondas) {
  const r = evalua(txt, base);
  console.log(`  ${r.veredicto.padEnd(5)} ${nombre.padEnd(32)} ${r.motivos.join(' | ')}`);
}
const ids = [...new Set([...JSON.stringify(corpus.arbol).matchAll(/(RN|ADR|SPEC|EPIC)-\d+/g)].map((m) => m[0]))].sort();
console.log('  artefactos que el árbol materializa:', ids.join(' '));

// ---------------------------------------------------------------------------
console.log('\n=== G. ¿CIRCULARIDAD DESPLAZADA? muto los DATOS que alimentan al oráculo ===');
const clonaLexico = (m) => { const l = JSON.parse(JSON.stringify(corpus.lexico)); m(l); return { ...base, lexico: l }; };
mut('G1. quito gemini-cli del universo_de_miembros',
  clonaLexico((l) => { delete l.universo_de_miembros.harnesses['gemini-cli']; }));
mut('G2. quito «en el roadmap» del léxico de volatilidad',
  clonaLexico((l) => { l.volatilidad.incondicionales = l.volatilidad.incondicionales.filter((t) => t !== 'en el roadmap'); }));
mut('G3. quito «adaptadores» del mapa sustantivo -> inventario',
  clonaLexico((l) => { delete l.inventarios_en_prosa.mapa.adaptadores; }));
const clonaRegistro = (m) => { const r = JSON.parse(JSON.stringify(corpus.registro)); m(r); return { ...base, registro: r }; };
mut('G4. cambio la cardinalidad DECLARADA de adaptadores a 99 en inventarios.json',
  clonaRegistro((r) => { r.find((x) => x.nombre === 'adaptadores').cardinalidad = 99; }));

console.log('\n=== H. resolutores contra el ÁRBOL SIMULADO ===');
for (const n of ['adaptadores', 'harnesses', 'checks', 'roles', 'reglas', 'hooks-claude-code', 'hooks-kimi-code', 'hooks-opencode']) {
  const inv = resuelveInventario(n, corpus.arbol, corpus.registro);
  console.log(`  ${n.padEnd(20)} = ${inv.cardinalidad}  ${JSON.stringify(inv.miembros)}`);
}
