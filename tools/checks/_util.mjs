// Utilidades compartidas por los checks de CI de tremen-sdd.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

// Lista recursiva de ficheros bajo dir. filtro(name) opcional por nombre.
export function walk(dir, filtro) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (!filtro || filtro(e.name)) out.push(p);
    }
  }
  return out;
}

// Extrae los especificadores de import/export-from/import() de un módulo ESM.
// Es ANÁLISIS DE IMPORTS (no grep de cadenas): solo mira las cláusulas de módulo.
export function importSpecifiers(codigo) {
  const specs = [];
  const patrones = [
    /\bimport\b[^;]*?\bfrom\s*['"]([^'"]+)['"]/g, // import ... from 'x'
    /\bexport\b[^;]*?\bfrom\s*['"]([^'"]+)['"]/g, // export ... from 'x'
    /\bimport\s*['"]([^'"]+)['"]/g,               // import 'x' (side-effect)
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,      // import('x') dinámico
  ];
  for (const re of patrones) {
    let m;
    while ((m = re.exec(codigo))) specs.push(m[1]);
  }
  return specs;
}

// ¿resuelto queda dentro de raiz? (evita fugas por '../').
export function dentroDe(raiz, resuelto) {
  const rel = path.relative(raiz, resuelto);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}
