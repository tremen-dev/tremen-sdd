#!/usr/bin/env node
// Ronda acotada después de un PARCIAL (ADR-020 §7, SPEC-032 CA-6 y CA-7):
//   node core/scripts/ronda-acotada.mjs <ruta de la spec> --desde <commit verificado>
// Dice si la ronda cabe y qué CA juzgar. SOLO LEE: no cambia ningún estado ni
// ninguna celda, y no escribe nada (el paso de ⏳ a ✅ lo da el verificador).
//
// La frontera es mecánica: el ledger de la spec, `_qa/<id>/` bajo el directorio
// de docs y el fichero de `registroManuales`, si está declarado. Los ficheros
// cambiados son los de `git diff --name-only --no-renames <V>..HEAD` más los
// seguidos con cambios sin commitear; un renombrado cuenta origen y destino. Lo que dice el ledger (secciones, filas, Estado) lo lee
// el lector único, core/lib/ca-manual.mjs; aquí solo hay git y rutas.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { esEntrypoint, exigirProyectoSdd } from '../lib/entrypoint.mjs';
import { idiomaDesde, resolverIdioma } from '../lib/idioma.mjs';
import { mensajesNucleo } from '../lib/mensajes.mjs';
import { parseFrontmatter } from '../lib/frontmatter.mjs';
import { leerSddJson } from '../lib/sdd-json.mjs';
import { mensajeSddJsonIlegible } from '../lib/sdd-json-mensaje.mjs';
import { leerCAs, esSpecDelModelo, leerLedger, compararRonda, rutaLedger } from '../lib/ca-manual.mjs';

// Subcomandos de git que usa el script: todos de lectura.
export const COMANDOS_GIT = Object.freeze(['rev-parse', 'merge-base', 'diff', 'show']);
const SHA = /^[0-9a-f]{7,40}$/i;

function git(args, cwd) {
  if (!COMANDOS_GIT.includes(args[0])) throw new Error(`ronda-acotada: subcomando de git no permitido: ${args[0]}`);
  const r = spawnSync('git', ['-c', 'core.quotepath=off', ...args], {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 256 * 1024 * 1024,
    // Sin locks opcionales: `git diff` no refresca el índice, así que no escribe.
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C', LANGUAGE: 'C' },
  });
  return { ok: !r.error && r.status === 0, out: r.stdout ?? '' };
}
const nombres = (r) => r.out.split('\0').filter(Boolean);
// Ficheros que cambian entre dos árboles, con rutas desde la raíz del repo git.
// `--no-renames` (F-V-1): con la detección de renombrados (por defecto o por
// `diff.renames`), `--name-only` solo lista el destino y el origen borrado
// escaparía de la frontera. `--no-relative`: con `diff.relative` y el proyecto
// en un subdirectorio del repo, git callaría lo de fuera del subdirectorio.
const ficherosCambiados = (cwd, ...refs) => nombres(git(['diff', '--name-only', '-z', '--no-renames', '--no-relative', ...refs], cwd));
const commitDe = (ref, cwd) => {
  if (!ref || ref.startsWith('-')) return null;
  const r = git(['rev-parse', '--verify', '-q', `${ref}^{commit}`], cwd);
  return r.ok ? r.out.trim() : null;
};

// Directorio de docs de la spec: el padre del `epicas/` que la contiene.
function dirDocs(spec, raiz) {
  for (let d = path.dirname(spec); d !== path.dirname(d); d = path.dirname(d)) {
    if (path.basename(d) === 'epicas') return path.dirname(d);
    if (d === raiz) break;
  }
  return path.join(raiz, 'docs');
}

// { admisible, motivos: [{ codigo, ...vars }], desde, pendientes, nuevas, ledger }
export function evaluarRonda(rutaSpec, desde) {
  const motivos = [];
  const spec = fs.realpathSync(path.resolve(rutaSpec));
  const raiz = fs.realpathSync(exigirProyectoSdd(spec));
  const idioma = idiomaDesde(path.dirname(spec));
  const { data, body } = parseFrontmatter(fs.readFileSync(spec, 'utf8'));
  const cas = leerCAs(body);
  if (!esSpecDelModelo(cas)) motivos.push({ codigo: 'spec-no-modelo' });
  if (data.estado !== 'en-revision') motivos.push({ codigo: 'spec-no-en-revision', estado: data.estado });

  // ADR-017: un .sdd.json ilegible cierra; no se sabe si declara el registro.
  const lectura = leerSddJson(raiz);
  let registro = null;
  if (lectura.estado === 'ilegible') motivos.push({ codigo: 'sdd-json-ilegible', motivo: mensajeSddJsonIlegible(lectura) });
  else if (lectura.estado === 'valida' && Object.hasOwn(lectura.config, 'registroManuales')) {
    registro = path.resolve(raiz, lectura.config.registroManuales);
  }

  const top = git(['rev-parse', '--show-toplevel'], raiz);
  const resultado = { motivos, desde, pendientes: [], nuevas: [] };
  if (!top.ok) {
    motivos.push({ codigo: 'sin-repo' });
    return { ...resultado, admisible: false };
  }
  const raizGit = fs.realpathSync(top.out.trim());
  const rel = (p) => path.relative(raizGit, p).split(path.sep).join('/');
  const ledger = rutaLedger(spec);
  const ledgerRel = rel(ledger);
  const qa = `${rel(dirDocs(spec, raiz))}/_qa/${data.id}/`.replace(/^\//, '');
  const registroRel = registro ? rel(registro) : null;
  const enFrontera = (f) => f === ledgerRel || f.startsWith(qa) || (registroRel !== null && f === registroRel);
  resultado.ledger = ledgerRel;

  const v = commitDe(desde, raiz);
  if (!v) motivos.push({ codigo: 'desde-inexistente', desde: desde ?? '' });
  else if (!git(['merge-base', '--is-ancestor', v, 'HEAD'], raiz).ok) motivos.push({ codigo: 'desde-no-antepasado', desde });
  else {
    resultado.desde = v;
    const cambiados = new Set([
      ...ficherosCambiados(raiz, v, 'HEAD'),
      ...ficherosCambiados(raiz, 'HEAD'),
    ]);
    for (const f of [...cambiados].sort()) if (!enFrontera(f)) motivos.push({ codigo: 'fuera-de-frontera', fichero: f });

    const enV = git(['show', `${v}:${ledgerRel}`], raiz);
    if (!enV.ok) motivos.push({ codigo: 'ledger-sin-v', ledger: ledgerRel });
    else {
      const hoy = fs.existsSync(ledger) ? fs.readFileSync(ledger, 'utf8') : '';
      const r = compararRonda(cas, leerLedger(enV.out, idioma), leerLedger(hoy, idioma));
      motivos.push(...r.motivos);
      resultado.pendientes = r.pendientes;
      resultado.nuevas = r.nuevas;
      // ADR-020 §7: la evidencia nueva se produjo sobre V o sobre un commit al
      // que solo separan de V cambios dentro de la frontera.
      for (const fila of r.nuevas) {
        const c = SHA.test(fila.commit) ? commitDe(fila.commit, raiz) : null;
        if (!c) { motivos.push({ codigo: 'commit-inexistente', ca: fila.ca, commit: fila.commit, linea: fila.linea }); continue; }
        const fuera = ficherosCambiados(raiz, v, c).filter((f) => !enFrontera(f));
        if (fuera.length) motivos.push({ codigo: 'commit-otro-codigo', ca: fila.ca, commit: fila.commit, linea: fila.linea, ficheros: fuera.join(', ') });
      }
    }
  }
  return { ...resultado, admisible: motivos.length === 0 };
}

// Texto de un motivo, desde el catálogo del núcleo.
function textoMotivo(t, m, ledger) {
  if (m.codigo === 'ledger') {
    return t('ronda.motivo.ledger', { donde: m.donde, detalle: t(`valida.ledger.${m.error}`, { rel: ledger, ...m }) });
  }
  return t(`ronda.motivo.${m.codigo}`, m);
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  const [ruta] = process.argv.slice(2);
  const i = process.argv.indexOf('--desde');
  const desde = i === -1 ? undefined : process.argv[i + 1];
  try {
    const raiz = exigirProyectoSdd(ruta ?? process.cwd());
    const t = mensajesNucleo(resolverIdioma(raiz));
    if (!ruta || ruta.startsWith('--') || !desde) {
      console.error(t('ronda.uso'));
      process.exit(1);
    }
    const r = evaluarRonda(ruta, desde);
    if (!r.admisible) {
      console.error(t('ronda.no-admisible', { n: r.motivos.length }) + '\n'
        + r.motivos.map((m) => ` - ${textoMotivo(t, m, r.ledger)}`).join('\n'));
      process.exit(1);
    }
    const lineas = [t('ronda.admisible', { ruta, desde: r.desde })];
    for (const ca of r.pendientes) {
      const filas = r.nuevas.filter((f) => f.ca === ca);
      lineas.push(` - ${t('ronda.juzgar', { ca, n: filas.length })}`);
      for (const f of filas) lineas.push(`     ${t('ronda.fila', { linea: f.linea, fila: `| ${f.celdas.join(' | ')} |` })}`);
    }
    console.log(lineas.join('\n'));
  } catch (e) {
    console.error(`[ronda-acotada] ${e.message}`);
    process.exit(1);
  }
}
