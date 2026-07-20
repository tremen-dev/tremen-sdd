#!/usr/bin/env node
// CA-4 (base de CE-1): ningún fichero bajo core/ importa o resuelve una ruta que
// escape de core/. Solo se permite node:* y otros ficheros de core/. Es análisis
// de imports/rutas (importSpecifiers), NO grep de cadenas.
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, walk, importSpecifiers, dentroDe } from './_util.mjs';
import { esEntrypoint } from '../../core/lib/entrypoint.mjs';

export function analizaNucleo(coreDir = path.join(REPO_ROOT, 'core')) {
  const violaciones = [];
  for (const f of walk(coreDir, (n) => n.endsWith('.mjs'))) {
    const specs = importSpecifiers(fs.readFileSync(f, 'utf8'));
    for (const spec of specs) {
      if (spec.startsWith('node:')) continue;
      if (spec.startsWith('.') || spec.startsWith('/')) {
        const resuelto = path.resolve(path.dirname(f), spec);
        if (!dentroDe(coreDir, resuelto)) {
          violaciones.push({ fichero: path.relative(coreDir, f), spec, motivo: 'escapa de core/' });
        }
      } else {
        // Bare specifier: ni node:* ni relativo. El núcleo no depende de paquetes.
        violaciones.push({ fichero: path.relative(coreDir, f), spec, motivo: 'dependencia externa no permitida' });
      }
    }
  }
  return { ok: violaciones.length === 0, violaciones };
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  const { ok, violaciones } = analizaNucleo();
  if (!ok) {
    console.error('[nucleo-aislado] FALLA:\n' + violaciones.map((v) => ` - ${v.fichero}: '${v.spec}' (${v.motivo})`).join('\n'));
    process.exit(1);
  }
  console.log('[nucleo-aislado] OK: el núcleo no referencia nada fuera de core/.');
}
