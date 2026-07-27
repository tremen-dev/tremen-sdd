#!/usr/bin/env node
// Publicación del artefacto en la rama `release` (ADR-010, SPEC-016).
//
// La rama `release` es HUÉRFANA y 100% GENERADA: nadie edita un fichero suyo a
// mano. Este script es el único autor. Ensambla el árbol de ADR-010 §2 —los tres
// adaptadores construidos en la RAÍZ, más el catálogo de Claude Code, la
// procedencia y un README generado— y, en modo publicación, lo comitea sobre un
// WORKTREE APARTE, nunca conmutando el checkout de desarrollo.
//
// Lo que este script NO hace, a propósito: empujar y crear el Release. Publicar
// hacia fuera es irreversible (un tag publicado no se re-publica, ADR-010 §4), así
// que el último paso lo ejecuta una persona con los comandos que el script imprime.
//
// Y lo que no necesita: `git commit --no-verify` ni SDD_SKIP_GATE=1. Los gates no
// se saltan porque no se disparan (ADR-010 §9): ningún fichero publicado cae bajo
// las rutasVigiladas ni es un artefacto SDD de docs/. Si algún día publicar
// necesitara una válvula, el mecanismo estaría mal, no la válvula.
//
// Uso:
//   node tools/publica.mjs --dry-run --out <dir>   ensambla y valida, sin git
//   node tools/publica.mjs --local                 + worktree, commit y tag LOCALES
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { esEntrypoint } from '../core/lib/entrypoint.mjs';
import { procedencia, escribeJson, PROVENANCE } from './build-adapter.mjs';

const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Los tres harnesses que viajan en cada publicación (ADR-010 §2). El coste
// marginal de publicar los tres en el mismo commit es cero, y CE-2 los exige.
export const HARNESSES = ['claude-code', 'kimi-code', 'opencode'];

// Contenido EXACTO de la raíz del ref publicado. Es contrato verificable: si
// aparece algo más o falta algo, el árbol no es el que ADR-010 §2 fija.
export const LAYOUT_RAIZ = ['.claude-plugin', 'PROVENANCE.json', 'README.md', ...HARNESSES];

export const RAMA = 'release';

const leeJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

export function git(args, cwd = REPO_ROOT) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

// Vacía dir conservando .git (en un worktree, borrarlo lo desconectaría del repo).
function vacia(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const e of fs.readdirSync(dir)) {
    if (e === '.git') continue;
    fs.rmSync(path.join(dir, e), { recursive: true, force: true });
  }
}

// Catálogo de la rama publicada. Se DERIVA del marketplace.json de la fuente
// —mismo nombre, mismo owner, misma descripción: una sola fuente— cambiando lo
// único que cambia: el source deja de ser la ruta de build `./dist/<harness>` y
// pasa a ser el hermano `./<harness>` dentro del propio ref (ADR-010 §2). La
// entrada nunca declara `version`: la versión vive solo en plugin.json (§4).
export function catalogo(repoRoot = REPO_ROOT) {
  const mk = leeJson(path.join(repoRoot, '.claude-plugin', 'marketplace.json'));
  return {
    ...mk,
    plugins: (mk.plugins ?? []).map(({ version, ...p }) => ({
      ...p,
      source: String(p.source ?? '').replace(/^\.\/dist\//, './'),
    })),
  };
}

export function readme({ version, commit, fecha }) {
  return `# tremen-sdd — rama \`${RAMA}\` (artefacto publicado)

**Este ref es GENERADO. No se edita a mano.** Lo escribe \`tools/publica.mjs\`
desde el árbol de fuentes; cualquier cambio hecho aquí se pierde en la siguiente
publicación y rompe la contrastabilidad de \`PROVENANCE.json\`.

- **version**: \`${version}\`
- **commit de fuente**: \`${commit}\`
- **fecha (UTC)**: \`${fecha}\`

Esta rama es **huérfana**: no comparte historia con \`main\` y nunca se mezcla con
ella. Avanza con un commit por publicación, sin reescribir historia. El código
fuente, las specs y el método viven en \`main\`; aquí solo vive lo instalable.

## Qué hay aquí

| Ruta | Qué es |
|---|---|
| \`.claude-plugin/marketplace.json\` | catálogo de Claude Code; apunta a \`./claude-code\` |
| \`claude-code/\` | plugin autocontenido para Claude Code |
| \`kimi-code/\` | árbol autocontenido para Kimi Code |
| \`opencode/\` | árbol autocontenido para opencode |
| \`PROVENANCE.json\` | versión, commit de fuente y fecha de esta publicación |

Cada árbol lleva **su propio \`PROVENANCE.json\`** dentro, así que una instalación
puede responder "¿qué versión tengo?" sin salir de su cache.

## Cómo se instala

**Claude Code** (el \`#ref\` es obligatorio: sin él se apunta a \`main\`, cuyo
catálogo referencia una ruta de build que no existe en un clon):

\`\`\`
claude plugin marketplace add https://github.com/tremen-dev/tremen-sdd.git#v${version}
claude plugin install tremen-sdd@tremen-sdd
\`\`\`

**Kimi Code y opencode** (sin marketplace: se obtiene el ref por git plano y se
copia el árbol a su destino nativo, ADR-003 §6 y ADR-007):

\`\`\`
git clone --depth 1 --single-branch --branch v${version} \\
  https://github.com/tremen-dev/tremen-sdd.git <tmp>
cp -r <tmp>/opencode/. <proyecto>/.opencode/
\`\`\`

No hace falta \`npm install\` ni \`npm run build\` en ningún punto: lo que se
descarga ya está construido.

## Comparar bytes con el build de origen

Los árboles de este ref son byte-idénticos a los que produce
\`npm run build:all\` en el commit de fuente de arriba. Para **comprobarlo** en
Windows hay que desactivar la conversión de finales de línea al obtener el ref
—\`core.autocrlf\` viene a \`true\` en la instalación estándar de Git para Windows
y reescribiría los ficheros al checkout—:

\`\`\`
git -c core.autocrlf=false clone --depth 1 --single-branch --branch v${version} …
\`\`\`

Sin esa opción la instalación **funciona igual** (nada de lo publicado depende
del final de línea), pero la comparación byte a byte no cuadra.
`;
}

// Ensambla el árbol publicable en outDir. No toca git ni la red: es la operación
// que el modo seco expone y la que el modo publicación reutiliza tal cual, para
// que lo comiteado sea BYTE-IDÉNTICO a lo que se puede inspeccionar en local
// (CA-4b). Falla si falta el build de algún harness: mejor no publicar que
// publicar un árbol a medias.
export function ensambla({ repoRoot = REPO_ROOT, outDir, harnesses = HARNESSES } = {}) {
  if (!outDir) throw new Error('ensambla: falta outDir.');
  const proc = procedencia(null, { repoRoot });
  for (const h of harnesses) {
    if (!fs.existsSync(path.join(repoRoot, 'dist', h))) {
      throw new Error(`falta dist/${h}: ejecuta 'npm run build:all' antes de publicar.`);
    }
    // Un build viejo publicado como si fuese el de HEAD es exactamente la
    // divergencia "lo instalado ≠ lo mergeado" que EPIC-004 existe para matar.
    const prov = path.join(repoRoot, 'dist', h, PROVENANCE);
    const commitDist = fs.existsSync(prov) ? leeJson(prov).commit : null;
    if (commitDist !== proc.commit) {
      throw new Error(`el build de dist/${h} es de otro commit (${commitDist ?? 'sin procedencia'} != ${proc.commit}): re-ejecuta 'npm run build:all'.`);
    }
  }
  vacia(outDir);

  for (const h of harnesses) {
    fs.cpSync(path.join(repoRoot, 'dist', h), path.join(outDir, h), { recursive: true });
  }

  fs.mkdirSync(path.join(outDir, '.claude-plugin'), { recursive: true });
  escribeJson(path.join(outDir, '.claude-plugin', 'marketplace.json'), catalogo(repoRoot));

  // Procedencia de la publicación entera: la misma del build, con la lista de
  // árboles que viajan en este commit en lugar de un único harness.
  const { harness, ...base } = proc;
  const raiz = { ...base, harnesses: [...harnesses] };
  escribeJson(path.join(outDir, PROVENANCE), raiz);
  fs.writeFileSync(path.join(outDir, 'README.md'), readme(raiz));

  return outDir;
}

// Comprueba el contrato del árbol antes de comitear nada.
export function verificaLayout(dir) {
  const errores = [];
  // En un worktree, `.git` es un fichero-puntero al repo: es infraestructura de
  // git, no contenido publicado (no viaja en el checkout de nadie).
  const hay = fs.readdirSync(dir).filter((e) => e !== '.git').sort();
  const esperado = [...LAYOUT_RAIZ].sort();
  for (const e of esperado) if (!hay.includes(e)) errores.push(`falta '${e}' en la raíz del árbol publicado`);
  for (const e of hay) if (!esperado.includes(e)) errores.push(`sobra '${e}' en la raíz del árbol publicado`);
  const mk = path.join(dir, '.claude-plugin', 'marketplace.json');
  if (fs.existsSync(mk)) {
    for (const p of leeJson(mk).plugins ?? []) {
      if (p.version !== undefined) errores.push(`la entrada '${p.name}' del catálogo declara version (ADR-010 §4)`);
      if (!fs.existsSync(path.join(dir, p.source, '.claude-plugin', 'plugin.json'))) {
        errores.push(`el source '${p.source}' no resuelve a un plugin dentro del ref`);
      }
    }
  }
  return { ok: errores.length === 0, errores };
}

function ramaExiste(rama, repoRoot) {
  try { git(['rev-parse', '--verify', '--quiet', `refs/heads/${rama}`], repoRoot); return true; }
  catch { return false; }
}

// Crea (o reutiliza) un worktree de la rama de publicación. NUNCA conmuta el
// checkout de desarrollo: eso es explícitamente lo que ADR-010 §1 prohíbe.
function preparaWorktree(wtDir, { rama = RAMA, repoRoot = REPO_ROOT } = {}) {
  fs.rmSync(wtDir, { recursive: true, force: true });
  git(['worktree', 'prune'], repoRoot);
  if (ramaExiste(rama, repoRoot)) git(['worktree', 'add', wtDir, rama], repoRoot);
  else git(['worktree', 'add', '--orphan', '-b', rama, wtDir], repoRoot); // primera publicación
  return wtDir;
}

export function mensajeCommit({ version, commit }) {
  return `publica: tremen-sdd v${version}\n\n`
    + `Artefacto generado desde el commit de fuente ${commit}.\n`
    + 'Contenido 100% generado por tools/publica.mjs: no se edita a mano (ADR-010 §1).\n\n'
    + `version: ${version}\ncommit: ${commit}\n`;
}

// Publica EN LOCAL: worktree + commit + tag. No empuja ni crea el Release.
export function publicaLocal({ repoRoot = REPO_ROOT, rama = RAMA, wtDir } = {}) {
  const proc = procedencia(null, { repoRoot });
  if (proc.sucio) {
    throw new Error('el árbol de trabajo está sucio: una publicación tiene que ser contrastable contra un commit de fuente. Comitea o limpia antes.');
  }
  const tag = `v${proc.version}`;
  if (git(['tag', '--list', tag], repoRoot)) {
    throw new Error(`el tag ${tag} ya existe: un tag publicado no se re-publica (ADR-010 §4). Sube la versión.`);
  }
  wtDir ??= path.join(repoRoot, '.tmp', `worktree-${rama}`);
  preparaWorktree(wtDir, { rama, repoRoot });

  ensambla({ repoRoot, outDir: wtDir });
  const { ok, errores } = verificaLayout(wtDir);
  if (!ok) throw new Error('el árbol ensamblado no cumple el layout de ADR-010 §2:\n' + errores.map((e) => ' - ' + e).join('\n'));

  git(['add', '-A'], wtDir);
  // Sin --no-verify: el pre-commit L2 corre y tiene que pasar por sí solo.
  git(['commit', '-m', mensajeCommit(proc)], wtDir);
  const sha = git(['rev-parse', 'HEAD'], wtDir);
  git(['tag', '-a', tag, '-m', `tremen-sdd ${tag} (fuente ${proc.commit})`, sha], repoRoot);
  return { rama, tag, commitPublicacion: sha, commitFuente: proc.commit, version: proc.version, wtDir };
}

function uso() {
  console.error('uso: node tools/publica.mjs --dry-run --out <dir>   (ensambla y valida, sin git)\n'
    + '     node tools/publica.mjs --local                 (worktree + commit + tag LOCALES)');
  return 2;
}

export function cli(argv) {
  const seco = argv.includes('--dry-run');
  const local = argv.includes('--local');
  if (seco === local) return uso();

  if (seco) {
    const i = argv.indexOf('--out');
    const out = i >= 0 ? argv[i + 1] : null;
    if (!out) return uso();
    const dir = path.resolve(out);
    ensambla({ outDir: dir });
    const { ok, errores } = verificaLayout(dir);
    if (!ok) { console.error('[publica] layout INVÁLIDO:\n' + errores.map((e) => ' - ' + e).join('\n')); return 1; }
    console.log(`[publica] árbol de publicación ensamblado y válido en ${dir}`);
    console.log(`[publica] valídalo con el CLI real:  claude plugin validate "${dir}"`);
    return 0;
  }

  const r = publicaLocal({});
  console.log(`[publica] rama '${r.rama}' avanzada en LOCAL: commit ${r.commitPublicacion} (fuente ${r.commitFuente}), tag ${r.tag}.`);
  console.log('[publica] worktree: ' + r.wtDir);
  console.log('\n[publica] NADA se ha empujado. La publicación real la ejecuta una persona:\n'
    + `  git push origin ${r.rama}\n`
    + `  git push origin ${r.tag}\n`
    + `  gh release create ${r.tag} --title "tremen-sdd ${r.tag}" --notes-file <notas.md>\n`
    + '  (un tag publicado no se re-publica: revisa antes de empujar)');
  return 0;
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  try { process.exit(cli(process.argv.slice(2))); }
  catch (e) { console.error(`[publica] ${e.message}`); process.exit(1); }
}
