#!/usr/bin/env node
// CA-1/CA-3 (SPEC-004, ADR-004): el NÚCLEO es agnóstico al harness. Analiza la
// prosa de core/ EN ORIGEN y FALLA si aparece cualquier placeholder estilo
// entorno `${...}` que NO sea propio del núcleo (`${SDD_*}`). Es una ALLOWLIST,
// no una denylist: así caza también un token de un harness futuro no visto
// (p. ej. `${GEMINI_ROOT}`), no solo `${CLAUDE_PLUGIN_ROOT}`/`${KIMI_*}`.
// Además, para cada `${SDD_ROOT}/<ruta>` valida que la <ruta> resuelve a un
// fichero EXISTENTE del núcleo (recupera la validación de existencia que daba
// `referencias` en el build de Claude). NO reescribe lógica: es análisis de
// prosa sobre los .md del núcleo (roles y plantillas).
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, walk, dentroDe } from './_util.mjs';
import { esEntrypoint } from '../../core/lib/entrypoint.mjs';

// Placeholder estilo entorno: `${IDENT}` con IDENT en MAYÚSCULAS (convención de
// variable de entorno). Los `<…>` de plantilla usan otra sintaxis y no casan.
const RE_TOKEN = /\$\{([A-Z][A-Z0-9_]*)\}/g;
// Referencia a un script/fichero del núcleo vía el placeholder neutro.
const RE_SDD_ROOT = /\$\{SDD_ROOT\}(\/[^\s"'`)\]\\]*)/g;
const TIENE_PLACEHOLDER = /<[^>]+>/; // p.ej. <idioma>, <rol>: refs genéricas de plantilla

export function analizaNucleoAgnostico(coreDir = path.join(REPO_ROOT, 'core')) {
  const errores = [];
  // ${SDD_ROOT} = "la raíz que CONTIENE core/": el padre del propio coreDir.
  const rootDir = path.dirname(coreDir);

  for (const f of walk(coreDir, (n) => n.endsWith('.md'))) {
    const s = fs.readFileSync(f, 'utf8');
    const rel = path.relative(coreDir, f);

    // (a) Allowlist: bajo core/ solo se admite `${SDD_*}`; cualquier otro
    //     `${...}` estilo entorno es una fuga de token de harness.
    let m;
    RE_TOKEN.lastIndex = 0;
    while ((m = RE_TOKEN.exec(s))) {
      if (m[1].startsWith('SDD_')) continue; // propio del núcleo: permitido
      errores.push(`${rel}: token de harness no permitido bajo core/ (allowlist ${'${SDD_*}'}): ${m[0]}`);
    }

    // (b) Cada `${SDD_ROOT}/<ruta>` debe resolver a un fichero existente del núcleo.
    RE_SDD_ROOT.lastIndex = 0;
    while ((m = RE_SDD_ROOT.exec(s))) {
      const ruta = m[1].replace(/[.,]$/, ''); // limpia puntuación final de prosa
      if (TIENE_PLACEHOLDER.test(ruta)) continue; // plantilla genérica: no resoluble
      const resuelto = path.join(rootDir, ruta);
      if (!dentroDe(coreDir, resuelto)) { errores.push(`${rel}: ${m[0]} no resuelve dentro de core/`); continue; }
      if (!fs.existsSync(resuelto)) errores.push(`${rel}: ruta referida no existe en el núcleo: ${ruta}`);
    }
  }

  return { ok: errores.length === 0, errores };
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  const { ok, errores } = analizaNucleoAgnostico();
  if (!ok) {
    console.error('[nucleo-agnostico] FALLA:\n' + errores.map((e) => ' - ' + e).join('\n'));
    process.exit(1);
  }
  console.log('[nucleo-agnostico] OK: el núcleo no nombra ningún token de harness (allowlist ${SDD_*}).');
}
