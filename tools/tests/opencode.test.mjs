import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildAdapter } from '../build-adapter.mjs';
import { walk, REPO_ROOT } from '../checks/_util.mjs';
import { checkReferencias } from '../checks/referencias.mjs';
import { checkManifiestos } from '../checks/manifiestos.mjs';
import { checkTodosAdaptadores } from '../checks/roles-fuente-unica.mjs';
import { checkDescripciones } from '../checks/descripcion-fuente-unica.mjs';
import { PASOS } from '../check.mjs';

// Firma del árbol de salida: rutas relativas ordenadas + sha256 del contenido.
function snapshot(dir) {
  return walk(dir).map((f) => {
    const rel = path.relative(dir, f).replaceAll('\\', '/');
    const hash = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
    return `${rel}:${hash}`;
  }).sort();
}
function tmp(pfx) { return fs.mkdtempSync(path.join(os.tmpdir(), pfx)); }

// --- CA-7: build de opencode determinista, idempotente y autocontenido -------

test('CA-7: el build de opencode es idempotente — dos ejecuciones dan árbol idéntico', () => {
  const out = tmp('sdd-oc-idem-');
  const snap1 = snapshot(buildAdapter('opencode', { outDir: out }));
  const snap2 = snapshot(buildAdapter('opencode', { outDir: out }));
  assert.deepEqual(snap2, snap1);
});

test('CA-7: el build de opencode es autocontenido con el núcleo dentro y sin tests', () => {
  const dist = buildAdapter('opencode', { outDir: tmp('sdd-oc-sc-') });
  assert.ok(fs.existsSync(path.join(dist, 'opencode.json')), 'manifiesto opencode.json presente');
  assert.ok(fs.existsSync(path.join(dist, 'agents', 'sdd-orquestador.md')), 'agente primary presente');
  assert.ok(fs.existsSync(path.join(dist, 'core', 'roles', 'es', 'sdd-implementador.md')), 'núcleo bajo core/');
  assert.ok(!fs.existsSync(path.join(dist, 'tests')), 'los tests de desarrollo no viajan en el artefacto');
});

// --- CA-5: referencias del artefacto opencode (generalización del check) ------

test('CA-5: el adaptador opencode construido resuelve sus refs a core internas y sin plugin-root', () => {
  const dist = buildAdapter('opencode', { outDir: tmp('sdd-oc-ref-') });
  assert.equal(checkReferencias(dist).ok, true);
});

test('CA-5: un agente opencode con ../ que escapa del artefacto hace fallar el check', () => {
  const dist = tmp('sdd-oc-ref-esc-');
  fs.mkdirSync(path.join(dist, 'agents'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'opencode.json'), '{"agent":{}}');
  fs.mkdirSync(path.join(dist, 'core', 'roles', 'es'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'agents', 'sdd-x.md'), 'Lee `../../core/roles/es/sdd-x.md` (escapa el artefacto).\n');
  const { ok, errores } = checkReferencias(dist);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /escapa/.test(e)));
});

test('CA-5: un token de plugin-root en el artefacto opencode hace fallar el check', () => {
  const dist = tmp('sdd-oc-ref-pr-');
  fs.mkdirSync(path.join(dist, 'commands'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'opencode.json'), '{"agent":{}}');
  fs.writeFileSync(path.join(dist, 'commands', 'sdd-tablero.md'), 'Ejecuta `${CLAUDE_PLUGIN_ROOT}/core/scripts/tablero.mjs`.\n');
  const { ok, errores } = checkReferencias(dist);
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /plugin-root/.test(e)));
});

// --- CA-2: roles-fuente-unica generalizado cubre opencode --------------------

test('CA-2: roles-fuente-unica vigila los TRES adaptadores y opencode pasa', () => {
  const { ok, adaptadores } = checkTodosAdaptadores(REPO_ROOT);
  assert.equal(ok, true);
  assert.ok(adaptadores.includes('opencode'), 'debe vigilar opencode');
});

test('CA-2: un agente opencode que embebe el cuerpo del rol hace fallar el check', () => {
  const repo = tmp('sdd-oc-roles-');
  const ag = path.join(repo, 'adapters', 'opencode', 'agents');
  fs.mkdirSync(ag, { recursive: true });
  fs.writeFileSync(path.join(ag, 'sdd-x.md'), 'Lee `../core/roles/<idioma>/sdd-x.md`.\n\n## Misión\nHaces cosas.\n');
  const { ok, infractores } = checkTodosAdaptadores(repo);
  assert.equal(ok, false);
  assert.ok(infractores.some((i) => i.adaptador === 'opencode' && /embebe prosa de rol/.test(i.motivo)));
});

// --- CA-4: descripcion-fuente-unica generalizado cubre agentes+skills opencode -

test('CA-4: descripcion-fuente-unica enumera las superficies opencode (agent y skill)', () => {
  const { cubiertas } = checkDescripciones(REPO_ROOT);
  const claves = cubiertas.map((c) => `${c.adaptador}/${c.tipo}`);
  assert.ok(claves.includes('opencode/agent'), 'debe cubrir los agentes opencode');
  assert.ok(claves.includes('opencode/skill'), 'debe cubrir las skills opencode');
});

test('CA-4: una description opencode divergente hace fallar nombrando rol+superficie', () => {
  const repo = tmp('sdd-oc-desc-');
  const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
  const LARGA = 'Rol de prueba tremen-sdd — "haz X". NO para otra cosa.';
  w(path.join(repo, 'core', 'roles', 'es', '_descripciones.json'), JSON.stringify({ 'sdd-arquitecto': { larga: LARGA, corta: 'x' } }));
  // El agente opencode DIVERGE de la canónica: debe fallar nombrando opencode/agent.
  w(path.join(repo, 'adapters', 'opencode', 'agents', 'sdd-arquitecto.md'),
    '---\nname: sdd-arquitecto\ndescription: >\n  Texto PARAFRASEADO que no coincide.\nmode: subagent\n---\nCuerpo; ../core/roles/ es la fuente.\n');
  const { ok, errores } = checkDescripciones(repo);
  assert.equal(ok, false);
  const e = errores.join('\n');
  assert.match(e, /sdd-arquitecto/);
  assert.match(e, /opencode/);
});

// --- CA-6: manifiestos-opencode valida opencode.json (bloque agent + permisos) -

test('CA-6: los manifiestos del adaptador opencode construido son válidos', () => {
  assert.equal(checkManifiestos(REPO_ROOT, 'opencode').ok, true);
});

// Crea un dist/opencode mínimo pero estructuralmente válido para tests negativos.
function crearOpencodeMinimo(repo, mut = (m) => m) {
  const dist = path.join(repo, 'dist', 'opencode');
  fs.mkdirSync(path.join(dist, 'agents'), { recursive: true });
  fs.mkdirSync(path.join(dist, 'commands'), { recursive: true });
  fs.mkdirSync(path.join(dist, 'skills'), { recursive: true });
  const subs = ['sdd-producto', 'sdd-arquitecto', 'sdd-implementador', 'sdd-verificador', 'sdd-documentalista', 'sdd-como-vamos'];
  const readonly = new Set(['sdd-verificador', 'sdd-como-vamos']);
  const man = {
    // SPEC-011 CA-3: permission estático de los generados (RN-05), complementario al plugin.
    permission: { edit: { 'docs/tablero.md': 'deny', 'dist/**': 'deny' } },
    agent: {
      'sdd-orquestador': {
        mode: 'primary',
        permission: { edit: 'deny', task: Object.fromEntries([['*', 'deny'], ...subs.map((r) => [r, 'allow'])]) },
      },
    },
  };
  // SPEC-014 CA-3 (ADR-009): el verificador NO es read-only puro — escribe su
  // ledger/_qa (edit granular deny-por-defecto); como-vamos sí es deny en seco.
  for (const r of subs) {
    let edit = 'allow';
    if (r === 'sdd-como-vamos') edit = 'deny';
    if (r === 'sdd-verificador') edit = { '*': 'deny', 'docs/epicas/**/*.ledger.md': 'allow', 'docs/_qa/**': 'allow' };
    man.agent[r] = { mode: 'subagent', permission: { edit, task: 'deny' } };
  }
  mut(man);
  fs.writeFileSync(path.join(dist, 'opencode.json'), JSON.stringify(man, null, 2));
  for (const r of ['sdd-orquestador', ...subs]) fs.writeFileSync(path.join(dist, 'agents', `${r}.md`), 'x ../core/roles/\n');
  for (const c of ['sdd-init', 'sdd-tablero']) fs.writeFileSync(path.join(dist, 'commands', `${c}.md`), 'x ../core/scripts/\n');
  // SPEC-011 CA-4/CA-5: el plugin de enforcement L1 viaja EMPAQUETADO en plugins/.
  fs.mkdirSync(path.join(dist, 'plugins'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'plugins', 'require-spec.mjs'), "import { evaluarRequireSpec } from '../core/lib/require-spec.mjs';\n");
  return repo;
}

test('CA-6: el manifiesto mínimo válido pasa el check', () => {
  const { ok, errores } = checkManifiestos(crearOpencodeMinimo(tmp('sdd-oc-man-ok-')), 'opencode');
  assert.equal(ok, true, JSON.stringify(errores));
});

test('CA-6: el orquestador con mode != primary hace fallar', () => {
  const repo = crearOpencodeMinimo(tmp('sdd-oc-man-p-'), (m) => { m.agent['sdd-orquestador'].mode = 'subagent'; });
  const { ok, errores } = checkManifiestos(repo, 'opencode');
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /sdd-orquestador/.test(e) && /primary/.test(e)));
});

test('CA-6: falta un subagente en el bloque agent hace fallar', () => {
  const repo = crearOpencodeMinimo(tmp('sdd-oc-man-miss-'), (m) => { delete m.agent['sdd-implementador']; });
  const { ok, errores } = checkManifiestos(repo, 'opencode');
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /sdd-implementador/.test(e)));
});

test('CA-6: un rol read-only con permission.edit allow hace fallar', () => {
  const repo = crearOpencodeMinimo(tmp('sdd-oc-man-rw-'), (m) => { m.agent['sdd-verificador'].permission.edit = 'allow'; });
  const { ok, errores } = checkManifiestos(repo, 'opencode');
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /sdd-verificador/.test(e) && /ledger/.test(e)));
});

// SPEC-014 CA-3 (lazo ADR-009, ejercido contra el CLI real 1.18.5): con
// `permission.edit: "deny"` en seco opencode RETIRA la tool edit del agente
// ("Model tried to call unavailable tool 'edit'") y el verificador no puede
// escribir su ledger — la política ADR-009 ("no escribe fuentes, SÍ el ledger")
// exige el edit GRANULAR: deny catch-all + allow SOLO ledger/_qa.
test('SPEC-014 CA-3: el verificador con edit deny EN SECO hace fallar (ADR-009: debe poder su ledger)', () => {
  const repo = crearOpencodeMinimo(tmp('sdd-oc-man-adr9a-'), (m) => { m.agent['sdd-verificador'].permission.edit = 'deny'; });
  const { ok, errores } = checkManifiestos(repo, 'opencode');
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /sdd-verificador/.test(e) && /ledger/.test(e)));
});

test('SPEC-014 CA-3: el verificador con un allow FUERA de ledger/_qa hace fallar (ADR-009: fuentes no)', () => {
  const repo = crearOpencodeMinimo(tmp('sdd-oc-man-adr9b-'), (m) => {
    m.agent['sdd-verificador'].permission.edit['src/**'] = 'allow';
  });
  const { ok, errores } = checkManifiestos(repo, 'opencode');
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /sdd-verificador/.test(e) && /fuentes|allow/.test(e)));
});

test('SPEC-014 CA-3: como-vamos SIGUE siendo read-only en seco (ADR-009 punto 5)', () => {
  const repo = crearOpencodeMinimo(tmp('sdd-oc-man-adr9c-'), (m) => { m.agent['sdd-como-vamos'].permission.edit = 'allow'; });
  const { ok, errores } = checkManifiestos(repo, 'opencode');
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /sdd-como-vamos/.test(e) && /read-only/.test(e)));
});

test('CA-6: el orquestador sin permission.task hace fallar', () => {
  const repo = crearOpencodeMinimo(tmp('sdd-oc-man-task-'), (m) => { delete m.agent['sdd-orquestador'].permission.task; });
  const { ok, errores } = checkManifiestos(repo, 'opencode');
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /permission\.task/.test(e)));
});

// SPEC-011 CA-5: la aserción de SPEC-010 "NO debe registrar el plugin" se ACTUALIZA:
// con el enforcement, registrar el plugin (o no) ya no es un error; el estado con
// enforcement es válido. El plugin viaja como fichero local auto-descubierto.
test('SPEC-011 CA-5: registrar el plugin en opencode.json YA NO hace fallar el check', () => {
  const repo = crearOpencodeMinimo(tmp('sdd-oc-man-plugin-'), (m) => { m.plugin = ['./plugins/require-spec.mjs']; });
  const { ok, errores } = checkManifiestos(repo, 'opencode');
  assert.equal(ok, true, JSON.stringify(errores));
});

// SPEC-011 CA-3: el check exige el permission estático de los GENERADOS (RN-05).
test('SPEC-011 CA-3: falta el deny estático de un generado (dist/**) hace fallar', () => {
  const repo = crearOpencodeMinimo(tmp('sdd-oc-man-gen-'), (m) => { delete m.permission.edit['dist/**']; });
  const { ok, errores } = checkManifiestos(repo, 'opencode');
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /dist\/\*\*/.test(e) && /denegar/.test(e)));
});

test('SPEC-011 CA-3: sin bloque permission.edit estático hace fallar', () => {
  const repo = crearOpencodeMinimo(tmp('sdd-oc-man-noperm-'), (m) => { delete m.permission; });
  const { ok, errores } = checkManifiestos(repo, 'opencode');
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /permission\.edit/.test(e)));
});

// SPEC-011 CA-4/CA-5: el check exige el plugin de enforcement EMPAQUETADO.
test('SPEC-011 CA-5: falta plugins/require-spec.mjs en el artefacto hace fallar', () => {
  const repo = crearOpencodeMinimo(tmp('sdd-oc-man-noplugin-'));
  fs.rmSync(path.join(repo, 'dist', 'opencode', 'plugins'), { recursive: true, force: true });
  const { ok, errores } = checkManifiestos(repo, 'opencode');
  assert.equal(ok, false);
  assert.ok(errores.some((e) => /plugins\/require-spec\.mjs/.test(e)));
});

// SPEC-011 CA-4: el build EMPAQUETA el plugin bajo dist/opencode/plugins/ (autocontenido).
test('SPEC-011 CA-4: el build de opencode copia el plugin de enforcement a plugins/', () => {
  const dist = buildAdapter('opencode', { outDir: tmp('sdd-oc-plugin-') });
  const plugin = path.join(dist, 'plugins', 'require-spec.mjs');
  assert.ok(fs.existsSync(plugin), 'plugins/require-spec.mjs presente en el artefacto');
  // El import del plugin al núcleo resuelve por ruta INTERNA al artefacto (sin plugin-root).
  const resuelto = path.resolve(path.dirname(plugin), '../core/lib/require-spec.mjs');
  assert.ok(fs.existsSync(resuelto), 'el import ../core/lib/require-spec.mjs resuelve dentro del artefacto');
  assert.ok(!/PLUGIN_ROOT/.test(fs.readFileSync(plugin, 'utf8')), 'el plugin no usa token de plugin-root');
});

test('SPEC-011 CA-4: el build de opencode con el plugin sigue siendo idempotente', () => {
  const out = tmp('sdd-oc-plugin-idem-');
  const s1 = snapshot(buildAdapter('opencode', { outDir: out }));
  const s2 = snapshot(buildAdapter('opencode', { outDir: out }));
  assert.deepEqual(s2, s1);
  assert.ok(s1.some((e) => e.startsWith('plugins/require-spec.mjs:')), 'el plugin entra en la firma del árbol');
});

// --- CA-9: los pasos de opencode están cableados en el runner tools/check.mjs -

test('CA-9: build/referencias/manifiestos de opencode están cableados en PASOS', () => {
  for (const nombre of ['build-opencode', 'referencias-opencode', 'manifiestos-opencode']) {
    assert.ok(PASOS.find((p) => p.nombre === nombre), `falta el paso '${nombre}' en el runner`);
  }
});

// SPEC-011 CA-6: L2 (pre-commit) y L3 (CI) cubren opencode SIN ninguna rama de código
// condicionada al harness: operan sobre contenido staged / árbol real. La garantía
// "nada se codea sin spec aprobada" no depende de que opencode ejecute el plugin.
test('SPEC-011 CA-6: el pre-commit L2 es harness-agnóstico (sin rama condicionada a opencode)', () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'tools', 'githooks', 'pre-commit.mjs'), 'utf8');
  assert.ok(!/opencode/i.test(src), 'el pre-commit no debe tener ninguna rama que dependa de opencode');
  // Reutiliza la MISMA lógica compartida del núcleo que consume el plugin L1.
  assert.match(src, /evaluarRequireSpec/);
});

test('SPEC-011 CA-6: el runner agregado incluye los tres pasos de opencode', () => {
  const n = PASOS.map((p) => p.nombre);
  for (const paso of ['build-opencode', 'referencias-opencode', 'manifiestos-opencode']) {
    assert.ok(n.includes(paso), `falta el paso '${paso}' en el runner agregado (L3/CI)`);
  }
});
