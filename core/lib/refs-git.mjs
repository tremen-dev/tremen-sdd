// Lectura de los refs que git ya tiene en local (ADR-018 §3, SPEC-028). Solo
// comandos de LECTURA sobre la base de objetos local: nunca contacta con el
// remoto (ni fetch ni ls-remote), así que funciona sin red. Solo importa node:*
// (RN-02, nucleo-aislado).
//
// No decide nada: devuelve, por ref, las rutas bajo el directorio de docs, y la
// decisión (negarse, saltar o seguir) la toma la función pura de scaffold.mjs.
// Ante cualquier problema (sin binario, fuera de un repo, sin remotos, error de
// git) devuelve un estado degradado y scaffold numera como siempre.
import { spawnSync } from 'node:child_process';

// Subcomandos permitidos: todos de lectura local. Cualquier otro es un error de
// programación (y un test vigila que no aparezcan fetch/ls-remote/pull).
export const COMANDOS_GIT = Object.freeze(['rev-parse', 'symbolic-ref', 'for-each-ref', 'ls-tree']);

class GitNoDisponible extends Error {}

function git(args, cwd) {
  if (!COMANDOS_GIT.includes(args[0])) throw new Error(`refs-git: subcomando no permitido: ${args[0]}`);
  const r = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 15000,
    maxBuffer: 256 * 1024 * 1024,
    // Sin prompts de credenciales, sin locks opcionales (no toca el índice) y
    // con mensajes en inglés estable para reconocer "not a git repository".
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C', LANGUAGE: 'C' },
  });
  if (r.error) {
    if (r.error.code === 'ENOENT') throw new GitNoDisponible();
    throw r.error;
  }
  return r;
}

const corto = (refname) => refname.replace(/^refs\/remotes\//, '').replace(/^refs\/heads\//, '');

// Lee los refs locales para `docsDir`. Devuelve:
//   { estado: 'ok', defecto: 'origin/main' | null, porRef: { [ref]: string[] } }
// o, degradado, { estado: 'sin-binario' | 'sin-repo' | 'sin-remoto' | 'error', detalle? }.
// Las rutas son relativas a la raíz del repo, con '/'.
export function leeRefs(docsDir) {
  try {
    const pre = git(['rev-parse', '--show-prefix'], docsDir);
    if (pre.status !== 0) {
      if (/not a git repository/i.test(pre.stderr)) return { estado: 'sin-repo' };
      return { estado: 'error', detalle: primeraLinea(pre.stderr) };
    }
    const prefijo = pre.stdout.trim();

    const lista = git(['for-each-ref', '--format=%(refname)', 'refs/remotes', 'refs/heads'], docsDir);
    if (lista.status !== 0) return { estado: 'error', detalle: primeraLinea(lista.stderr) };
    const refs = lista.stdout.split('\n').map((s) => s.trim()).filter(Boolean)
      .filter((r) => !(r.startsWith('refs/remotes/') && r.endsWith('/HEAD')));
    if (!refs.some((r) => r.startsWith('refs/remotes/'))) return { estado: 'sin-remoto' };

    // Rama por defecto: origin/HEAD; si no existe, origin/main y luego origin/master.
    let defecto = null;
    const head = git(['symbolic-ref', '-q', 'refs/remotes/origin/HEAD'], docsDir);
    if (head.status === 0 && refs.includes(head.stdout.trim())) defecto = head.stdout.trim();
    else defecto = ['refs/remotes/origin/main', 'refs/remotes/origin/master'].find((r) => refs.includes(r)) ?? null;

    // Rama actual (ninguna si HEAD está desacoplado): no es una reserva ajena.
    const actual = git(['symbolic-ref', '-q', 'HEAD'], docsDir);
    const rActual = actual.status === 0 ? actual.stdout.trim() : null;

    const porRef = {};
    for (const ref of refs) {
      if (ref === rActual) continue;
      const args = ['ls-tree', '-r', '-z', '--name-only', '--full-tree', ref];
      if (prefijo) args.push('--', prefijo);
      const ls = git(args, docsDir);
      if (ls.status !== 0) return { estado: 'error', detalle: primeraLinea(ls.stderr) };
      porRef[corto(ref)] = ls.stdout.split('\0').filter(Boolean);
    }
    return { estado: 'ok', defecto: defecto ? corto(defecto) : null, porRef };
  } catch (e) {
    if (e instanceof GitNoDisponible) return { estado: 'sin-binario' };
    return { estado: 'error', detalle: primeraLinea(e.message) };
  }
}

function primeraLinea(s) {
  return String(s ?? '').split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? '';
}
