#!/usr/bin/env node
// SPEC-006 CA-6: la prosa del documentalista debe contener la regla dura de que
// NO ejecuta transiciones de gate ni cierra/propone cerrar una épica — el cierre
// de épica es un gate humano. Este check verifica la PRESENCIA de la regla escrita
// (RN-06, fuente única). La garantía de comportamiento es la barrera estructural
// de estado.mjs (SPEC-006 CA-1..CA-4); esto solo refuerza en prosa.
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, walk } from './_util.mjs';
import { esEntrypoint } from '../../core/lib/entrypoint.mjs';

export const DOC_DOCUMENTALISTA = 'core/roles/es/sdd-documentalista.md';

// Normaliza para que la comprobación no sea frágil ante acentos, mayúsculas,
// marcas markdown (*, `) o espaciado: quita diacríticos y colapsa blancos.
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[*`]/g, '').replace(/\s+/g, ' ');

// Marcadores que la prosa del documentalista DEBE contener (CA-6). No es un
// censo de wording exacto: son los tres conceptos irrenunciables.
export const REGLAS_REQUERIDAS = [
  { id: 'no-ejecuta-gate', re: /no ejecutas transiciones de gate/, que: 'que no ejecuta transiciones de gate humano' },
  { id: 'no-propone-cerrar-epica', re: /ni propones cerrar una epica/, que: 'que no cierra ni propone cerrar una épica' },
  { id: 'cierre-epica-es-humano', re: /cierre de epica es un gate humano/, que: 'que el cierre de épica es un gate humano' },
];

export function checkProsaGates(contenido) {
  const t = norm(contenido);
  const faltan = REGLAS_REQUERIDAS.filter((r) => !r.re.test(t));
  return { ok: faltan.length === 0, faltan };
}

// SPEC-024 CA-4 (ADR-015 §2.4): Autodescubrimiento y verificación de la guarda
// de precondición .sdd.json en roles, skills y agentes de todos los adaptadores.
export function checkPrecondicionSdd(repoRoot = REPO_ROOT) {
  const ficheros = [];
  const infractores = [];

  // 1. core/roles/es/sdd-*.md
  const rolesDir = path.join(repoRoot, 'core', 'roles', 'es');
  if (fs.existsSync(rolesDir)) {
    for (const f of fs.readdirSync(rolesDir).sort()) {
      if (f.startsWith('sdd-') && f.endsWith('.md')) ficheros.push(path.join(rolesDir, f));
    }
  }

  // 2. adapters/*/skills/sdd-*/SKILL.md y adapters/*/agents/**/*.md
  const adaptersDir = path.join(repoRoot, 'adapters');
  if (fs.existsSync(adaptersDir)) {
    for (const h of fs.readdirSync(adaptersDir).sort()) {
      const skillsDir = path.join(adaptersDir, h, 'skills');
      if (fs.existsSync(skillsDir)) {
        for (const d of fs.readdirSync(skillsDir).sort()) {
          if (!d.startsWith('sdd-')) continue;
          const skillFile = path.join(skillsDir, d, 'SKILL.md');
          if (fs.existsSync(skillFile)) ficheros.push(skillFile);
        }
      }
      const agentsDir = path.join(adaptersDir, h, 'agents');
      if (fs.existsSync(agentsDir)) {
        for (const a of walk(agentsDir, (n) => n.endsWith('.md')).sort()) {
          ficheros.push(a);
        }
      }
    }
  }

  const RE_ANTIPATRON = /si el fichero o el campo no existen/i;
  const RE_SDD_JSON = /\.sdd\.json/;
  const RE_PARADA = /para(?:r)?\s+inmediatamente/i;

  for (const f of ficheros) {
    const s = fs.readFileSync(f, 'utf8');
    const rel = path.relative(repoRoot, f);
    if (RE_ANTIPATRON.test(s)) {
      infractores.push({ fichero: rel, motivo: 'contiene antipatrón de fallback ante fichero ausente' });
    } else if (!RE_SDD_JSON.test(s)) {
      infractores.push({ fichero: rel, motivo: 'no menciona .sdd.json' });
    } else if (!RE_PARADA.test(s)) {
      infractores.push({ fichero: rel, motivo: 'no incluye instrucción de parada cuando .sdd.json no existe' });
    }
  }

  return { ok: infractores.length === 0, infractores, ficheros };
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  const { ok: okDoc, faltan } = checkProsaGates(fs.readFileSync(path.join(REPO_ROOT, DOC_DOCUMENTALISTA), 'utf8'));
  if (!okDoc) {
    console.error(`[prosa-gates] FALLA: la prosa de sdd-documentalista (${DOC_DOCUMENTALISTA}) no contiene la regla dura esperada:\n`
      + faltan.map((r) => ` - falta ${r.que}`).join('\n'));
    process.exit(1);
  }
  const { ok: okSdd, infractores } = checkPrecondicionSdd(REPO_ROOT);
  if (!okSdd) {
    console.error('[prosa-gates] FALLA: guarda de precondicion .sdd.json no respetada:\n'
      + infractores.map((i) => ` - ${i.fichero}: ${i.motivo}`).join('\n'));
    process.exit(1);
  }
  console.log('[prosa-gates] OK: sdd-documentalista prohíbe explícitamente cerrar/proponer cerrar épicas; guarda .sdd.json verificada.');
}
