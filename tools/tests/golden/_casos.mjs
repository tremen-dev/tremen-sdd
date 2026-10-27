// SPEC-025 CA-3/CA-5: ejecutor de los casos golden de mensajes. Recorre UNA rama
// de error o de éxito por cada texto que emite el código base (origin/main en el
// punto de integración, ver el ledger): los scripts del núcleo, la lib
// require-spec, los hooks de Claude Code, de Kimi Code y de antigravity y el
// plugin de opencode, y devuelve { caso: salida }. `ejecutaBarrera` recorre
// aparte el mensaje de la barrera de ADR-015 (CLI sin .sdd.json).
//
// Es parametrizable por árbol (núcleo + adaptadores construidos) y por el
// contenido de `.sdd.json`, para que el MISMO recorrido sirva al golden `es`
// (CA-3, árbol real) y a la fixture `zz` (CA-5, árbol temporal).
//
// Normalización (lo único que no es byte a byte, porque no es texto del método):
// la ruta del proyecto temporal se sustituye por <PROY>, los separadores de ruta
// se llevan a '/' y CRLF a LF (salida de un linter stub en Windows).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync, execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const BASE_SDD = { rutasVigiladas: ['src/'], linter: 'none', gates: { requireSpec: true, protegeVerdad: true, calidad: true } };

// Configuraciones de proyecto que usan los golden.
export const VARIANTES = {
  es: { idioma: 'es', ...BASE_SDD },
  'sin-idioma': { ...BASE_SDD },
};

const spec = ({ id = 'SPEC-001', tipo = 'spec', epica = 'EPIC-001', estado, historial }) => {
  const h = historial ?? [estado];
  const filas = h.map((e) => `  - {estado: ${e}, fecha: 2026-07-01, por: ${e === 'aprobada' ? 'Alberto' : 'x'}}`).join('\n');
  return `---\nid: ${id}\ntipo: ${tipo}\n${epica ? `epica: ${epica}\n` : ''}estado: ${estado}\nhistorial:\n${filas}\n---\n# ${id}\n`;
};

function nuevoProyecto(sddJson, { git = false } = {}) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-golden-')));
  if (sddJson) fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify(sddJson));
  fs.mkdirSync(path.join(dir, 'docs', 'epicas', 'EPIC-001-x'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs', 'epicas', 'EPIC-001-x', '_epica.md'),
    spec({ id: 'EPIC-001', tipo: 'epica', epica: null, estado: 'aprobada', historial: ['borrador', 'aprobada'] }));
  if (git) {
    execSync('git init -b main', { cwd: dir, stdio: 'ignore' });
    fs.writeFileSync(path.join(dir, 'a.txt'), 'x');
    execSync('git add -A && git -c user.email=t@t -c user.name=t commit -m x', { cwd: dir, shell: true, stdio: 'ignore' });
  }
  return dir;
}

const escribe = (dir, rel, txt) => {
  const p = path.join(dir, ...rel.split('/'));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, txt);
  return p;
};

function normaliza(s, dir) {
  let out = String(s ?? '').replace(/\r\n/g, '\n');
  for (const d of [dir, dir.replaceAll('\\', '/')]) out = out.split(d).join('<PROY>');
  return out.replaceAll('\\', '/');
}

function cli(script, args, cwd, env = {}) {
  const r = spawnSync('node', [script, ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
  return normaliza(`exit=${r.status}\n--stdout--\n${r.stdout}--stderr--\n${r.stderr}`, cwd);
}

function hook(script, cwd, payload, env = {}) {
  const r = spawnSync('node', [script], { input: JSON.stringify({ cwd, ...payload }), encoding: 'utf8', env: { ...process.env, ...env } });
  const out = r.stdout.trim();
  let razon = null;
  try {
    const j = JSON.parse(out);
    // Claude Code / Kimi Code: hookSpecificOutput; antigravity: { decision, reason } (ADR-013).
    razon = j.hookSpecificOutput?.permissionDecisionReason ?? (j.decision === 'deny' ? j.reason : null) ?? null;
  } catch { /* no es deny */ }
  return normaliza(razon !== null ? `deny: ${razon}` : `exit=${r.status}\n--stdout--\n${r.stdout}--stderr--\n${r.stderr}`, cwd);
}

// Stub de linter `ruff` que siempre encuentra un problema.
function stubRuff() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-golden-stub-'));
  if (process.platform === 'win32') {
    fs.writeFileSync(path.join(dir, 'ruff.cmd'), '@echo off\r\necho E1 problema de estilo\r\nexit /b 1\r\n');
  } else {
    const f = path.join(dir, 'ruff');
    fs.writeFileSync(f, '#!/bin/sh\necho "E1 problema de estilo"\nexit 1\n');
    fs.chmodSync(f, 0o755);
  }
  return dir;
}

// Proyecto git para require-spec: sin rama de spec / spec inexistente / spec en borrador.
function proyectosRequireSpec(sddJson) {
  const sinRama = nuevoProyecto(sddJson, { git: true });
  const inexistente = nuevoProyecto(sddJson, { git: true });
  execSync('git checkout -b ft/SPEC-009-x', { cwd: inexistente, stdio: 'ignore' });
  const borrador = nuevoProyecto(sddJson);
  escribe(borrador, 'docs/epicas/EPIC-001-x/SPEC-001-alta.md', spec({ estado: 'borrador' }));
  execSync('git init -b main', { cwd: borrador, stdio: 'ignore' });
  execSync('git add -A && git -c user.email=t@t -c user.name=t commit -m x', { cwd: borrador, shell: true, stdio: 'ignore' });
  execSync('git checkout -b ft/SPEC-001-alta', { cwd: borrador, stdio: 'ignore' });
  return { 'sin-rama': { dir: sinRama, rama: 'main' }, inexistente: { dir: inexistente, rama: 'ft/SPEC-009-x' }, borrador: { dir: borrador, rama: 'ft/SPEC-001-alta' } };
}

/**
 * @param {object} o
 * @param {string} o.coreDir   núcleo cuyos scripts se ejecutan.
 * @param {object} o.dist      { 'claude-code', 'kimi-code', opencode, antigravity } -> raíz del artefacto construido.
 * @param {object|null} o.sddJson  contenido de .sdd.json de los proyectos (null = sin fichero).
 */
export async function ejecutaCasos({ coreDir, dist, sddJson }) {
  const r = {};
  const S = (n) => path.join(coreDir, 'scripts', n);

  // --- estado.mjs (CLI): una rama por texto ---
  const ESTADO = [
    ['estado.desconocido', 'raro', 'borrador', []],
    ['estado.no-permitida', 'borrador', 'hecho', ['--por', 'Alberto']],
    ['estado.terminal', 'hecho', 'borrador', ['--por', 'Alberto']],
    ['estado.firma-aprobada', 'borrador', 'aprobada', ['--por', 'sdd-arquitecto']],
    ['estado.firma-aprobada-sin-por', 'borrador', 'aprobada', []],
    ['estado.firma-hecho-spec', 'en-revision', 'hecho', ['--por', 'Alberto']],
    ['estado.exito', 'borrador', 'aprobada', ['--por', 'Alberto']],
  ];
  for (const [caso, desde, hacia, extra] of ESTADO) {
    const dir = nuevoProyecto(sddJson);
    const historial = desde === 'en-revision' || desde === 'hecho' ? ['borrador', 'aprobada', 'en-progreso', desde] : [desde];
    escribe(dir, 'docs/epicas/EPIC-001-x/SPEC-001-alta.md', spec({ estado: desde, historial }));
    r[caso] = cli(S('estado.mjs'), ['docs/epicas/EPIC-001-x/SPEC-001-alta.md', hacia, ...extra], dir);
  }
  {
    const dir = nuevoProyecto(sddJson);
    escribe(dir, 'docs/epicas/EPIC-001-x/_epica.md',
      spec({ id: 'EPIC-001', tipo: 'epica', epica: null, estado: 'en-revision', historial: ['borrador', 'aprobada', 'en-progreso', 'en-revision'] }));
    r['estado.firma-hecho-epica'] = cli(S('estado.mjs'), ['docs/epicas/EPIC-001-x/_epica.md', 'hecho', '--por', 'sdd-verificador'], dir);
  }
  {
    const dir = nuevoProyecto(sddJson);
    escribe(dir, 'docs/epicas/EPIC-001-x/SPEC-001-alta.md', spec({ estado: 'bloqueada', historial: ['borrador', 'bloqueada'] }));
    r['estado.sin-aprobacion'] = cli(S('estado.mjs'), ['docs/epicas/EPIC-001-x/SPEC-001-alta.md', 'en-progreso', '--por', 'sdd-implementador'], dir);
  }

  // --- valida.mjs (CLI) ---
  {
    const dir = nuevoProyecto(sddJson);
    escribe(dir, 'docs/epicas/EPIC-001-x/SPEC-001-alta.md', spec({ estado: 'borrador' }));
    r['valida.ok'] = cli(S('valida.mjs'), ['--dir', 'docs'], dir);
  }
  {
    const dir = nuevoProyecto(sddJson);
    escribe(dir, 'docs/epicas/EPIC-001-x/SPEC-001-alta.md', '# sin frontmatter\n');
    r['valida.sin-id'] = cli(S('valida.mjs'), ['--dir', 'docs'], dir);
  }
  {
    const dir = nuevoProyecto(sddJson);
    escribe(dir, 'docs/epicas/EPIC-001-x/SPEC-002-mal.md',
      spec({ id: 'SPEC-003', epica: 'EPIC-099', estado: 'raro', historial: ['borrador'] }));
    r['valida.varios'] = cli(S('valida.mjs'), ['--dir', 'docs'], dir);
  }

  // --- scaffold.mjs (CLI): ramas de error ---
  const SCAFFOLD = [
    ['scaffold.tipo-desconocido', ['foo', 'X']],
    ['scaffold.id-no-epica', ['spec', 'X', '--id', 'EPIC-FIX', '--epica', 'EPIC-001']],
    ['scaffold.id-invalido', ['epica', 'X', '--id', 'EPIC-FOO']],
    ['scaffold.sin-epica', ['spec', 'X']],
    ['scaffold.epica-inexistente', ['spec', 'X', '--epica', 'EPIC-099']],
  ];
  for (const [caso, args] of SCAFFOLD) {
    const dir = nuevoProyecto(sddJson);
    r[caso] = cli(S('scaffold.mjs'), [...args, '--dir', 'docs'], dir);
  }

  // --- tablero.mjs: tablero generado + mensaje del CLI ---
  {
    const dir = nuevoProyecto(sddJson);
    escribe(dir, 'docs/epicas/EPIC-001-x/SPEC-001-alta.md', spec({ estado: 'aprobada', historial: ['borrador', 'aprobada'] }));
    escribe(dir, 'docs/epicas/EPIC-001-x/SPEC-002-baja.md', '---\nid: SPEC-002\ntipo: spec\nepica: EPIC-001\nestado: borrador\n---\n');
    fs.mkdirSync(path.join(dir, 'docs', 'epicas', 'EPIC-FIX'), { recursive: true });
    escribe(dir, 'docs/adr/ADR-001-usar-x.md', spec({ id: 'ADR-001', tipo: 'adr', epica: null, estado: 'borrador' }));
    const { renderBoard } = await import(pathToFileURL(S('tablero.mjs')).href);
    r['tablero.render'] = normaliza(renderBoard(path.join(dir, 'docs'), '2026-01-01'), dir);
    r['tablero.cli'] = cli(S('tablero.mjs'), ['--dir', 'docs'], dir);
  }

  // --- informe-qa.mjs: informe + error + éxito del CLI ---
  {
    const dir = nuevoProyecto(sddJson);
    const ledger = escribe(dir, 'docs/epicas/EPIC-001-x/SPEC-001-alta.ledger.md',
      '---\nid: SPEC-001\ntipo: ledger\nepica: EPIC-001\n---\n# Ledger — SPEC-001\n\n## Veredicto <del> verificador\nGREEN\n');
    const qa = path.join(path.dirname(ledger), '_qa', 'SPEC-001');
    fs.mkdirSync(qa, { recursive: true });
    fs.writeFileSync(path.join(qa, 'ca1.png'), PNG_1PX);
    fs.writeFileSync(path.join(qa, 'ca2.webm'), Buffer.from('webm'));
    const { renderReport } = await import(pathToFileURL(S('informe-qa.mjs')).href);
    r['informe-qa.render'] = normaliza(renderReport(ledger).html, dir);
    r['informe-qa.cli-exito'] = cli(S('informe-qa.mjs'), ['docs/epicas/EPIC-001-x/SPEC-001-alta.ledger.md'], dir);
    escribe(dir, 'docs/epicas/EPIC-001-x/SPEC-002-x.ledger.md', '---\nid: SPEC-002\ntipo: ledger\n---\n# L\n');
    r['informe-qa.cli-sin-qa'] = cli(S('informe-qa.mjs'), ['docs/epicas/EPIC-001-x/SPEC-002-x.ledger.md'], dir);
    r['informe-qa.cli-sin-args'] = cli(S('informe-qa.mjs'), [], dir);
  }

  // --- core/lib/require-spec.mjs y sus tres consumidores L1 ---
  const rs = proyectosRequireSpec(sddJson);
  const { evaluarRequireSpec } = await import(pathToFileURL(path.join(coreDir, 'lib', 'require-spec.mjs')).href);
  for (const [n, { dir, rama }] of Object.entries(rs)) {
    r[`require-spec.lib.${n}`] = normaliza(evaluarRequireSpec({ rama, cwd: dir }).motivo, dir);
  }
  if (sddJson) {
    for (const [n, { dir }] of Object.entries(rs)) {
      const payload = { tool_name: 'Edit', tool_input: { file_path: path.join(dir, 'src', 'app.ts') } };
      r[`require-spec.claude.${n}`] = hook(path.join(dist['claude-code'], 'hooks', 'require-spec.mjs'), dir, payload);
      r[`require-spec.kimi.${n}`] = hook(path.join(dist['kimi-code'], 'hooks', 'require-spec.mjs'), dir, payload);
      r[`require-spec.antigravity.${n}`] = hook(path.join(dist.antigravity, 'hooks', 'require-spec.mjs'), dir,
        { toolCall: { args: { TargetFile: path.join(dir, 'src', 'app.ts') } } });
      const mod = await import(pathToFileURL(path.join(dist.opencode, 'plugins', 'require-spec.mjs')).href);
      const before = (await mod.RequireSpecPlugin({ directory: dir, worktree: dir }))['tool.execute.before'];
      let txt = 'permitido';
      try { await before({ tool: 'edit' }, { args: { filePath: path.join(dir, 'src', 'app.ts') } }); } catch (e) { txt = `throw: ${e.message}`; }
      r[`require-spec.opencode.${n}`] = normaliza(txt, dir);
    }

    // --- protege-verdad: Claude Code y Kimi Code ---
    const dir = nuevoProyecto(sddJson);
    for (const [h, n] of [['claude-code', 'claude'], ['kimi-code', 'kimi']]) {
      const pv = path.join(dist[h], 'hooks', 'protege-verdad.mjs');
      r[`protege-verdad.${n}.tablero`] = hook(pv, dir, { tool_name: 'Edit', agent_type: 'main', tool_input: { file_path: path.join(dir, 'docs', 'tablero.md') } });
      r[`protege-verdad.${n}.verdad`] = hook(pv, dir, { tool_name: 'Edit', agent_type: 'sdd-implementador', tool_input: { file_path: path.join(dir, 'FOUNDATION.md') } });
    }
    r['protege-verdad.antigravity.tablero'] = hook(path.join(dist.antigravity, 'hooks', 'protege-verdad.mjs'), dir,
      { toolCall: { args: { TargetFile: path.join(dir, 'docs', 'tablero.md') } } });

    // --- calidad (Claude Code): artefacto inconsistente + linter con problemas ---
    const calidad = path.join(dist['claude-code'], 'hooks', 'calidad.mjs');
    const mal = escribe(dir, 'docs/epicas/EPIC-001-x/SPEC-001-mal.md', spec({ estado: 'aprobada', historial: ['borrador'] }));
    r['calidad.artefacto'] = hook(calidad, dir, { tool_name: 'Edit', tool_input: { file_path: mal } });
    r['calidad.antigravity.artefacto'] = hook(path.join(dist.antigravity, 'hooks', 'calidad.mjs'), dir,
      { toolCall: { args: { TargetFile: mal } } });
    const dirLint = nuevoProyecto({ ...sddJson, linter: 'ruff' });
    const py = escribe(dirLint, 'src/app.py', 'x=1\n');
    const stub = stubRuff();
    r['calidad.linter'] = hook(calidad, dirLint, { tool_name: 'Edit', tool_input: { file_path: py } },
      { PATH: `${stub}${path.delimiter}${process.env.PATH}` });
  }
  return r;
}

// SPEC-025 CA-3/CA-5(i) y CA-6(e): el CLI de cada uno de los cinco scripts del
// núcleo lanzado en un directorio sin .sdd.json (ni .git en el temporal) se para
// en la barrera de ADR-015. Devuelve { caso: salida }.
export function ejecutaBarrera({ coreDir }) {
  const r = {};
  const S = (n) => path.join(coreDir, 'scripts', n);
  const CASOS = [
    ['barrera.estado', 'estado.mjs', ['docs/epicas/EPIC-001-x/SPEC-001-alta.md', 'aprobada', '--por', 'Alberto']],
    ['barrera.valida', 'valida.mjs', ['--dir', 'docs']],
    ['barrera.tablero', 'tablero.mjs', ['--dir', 'docs']],
    ['barrera.scaffold', 'scaffold.mjs', ['spec', 'X', '--epica', 'EPIC-001', '--dir', 'docs']],
    ['barrera.informe-qa', 'informe-qa.mjs', ['docs/epicas/EPIC-001-x/SPEC-001-alta.ledger.md']],
  ];
  for (const [caso, script, args] of CASOS) {
    const dir = nuevoProyecto(null);
    escribe(dir, 'docs/epicas/EPIC-001-x/SPEC-001-alta.md', spec({ estado: 'borrador' }));
    escribe(dir, 'docs/epicas/EPIC-001-x/SPEC-001-alta.ledger.md', '---\nid: SPEC-001\ntipo: ledger\n---\n# L\n');
    r[caso] = cli(S(script), args, dir);
  }
  return r;
}

// SPEC-025 CA-4/CA-5(h): artefactos que scaffold.mjs crea con argumentos y fecha
// fijos (épica, spec + ledger, task y ADR). Devuelve { ruta relativa: contenido }.
export async function ejecutaScaffold({ coreDir, sddJson }) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-golden-sc-')));
  if (sddJson) fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify(sddJson));
  const docsDir = path.join(dir, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  const { createArtifact } = await import(pathToFileURL(path.join(coreDir, 'scripts', 'scaffold.mjs')).href);
  const fecha = '2026-01-01';
  const creados = [
    createArtifact({ tipo: 'epica', titulo: 'Facturación rápida', docsDir, fecha }),
    createArtifact({ tipo: 'epica', titulo: 'Arreglos', docsDir, fecha, id: 'EPIC-FIX' }),
    createArtifact({ tipo: 'spec', titulo: 'Alta de factura', epica: 'EPIC-001', docsDir, fecha }),
    createArtifact({ tipo: 'task', titulo: 'Subir logo', epica: 'EPIC-001', docsDir, fecha }),
    createArtifact({ tipo: 'adr', titulo: 'Usar Turso', docsDir, fecha }),
  ];
  creados.splice(3, 0, creados[2].replace(/\.md$/, '.ledger.md'));
  return Object.fromEntries(creados.map((p) => [path.relative(dir, p).split(path.sep).join('/'), fs.readFileSync(p, 'utf8')]));
}
