import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { REPO_ROOT, walk } from '../checks/_util.mjs';
import { buildAdapter } from '../build-adapter.mjs';
import { ejecutaCasos, ejecutaScaffold, VARIANTES } from './golden/_casos.mjs';

// SPEC-019 CA-5 — el idioma llega a cada emisor. Árbol temporal (nunca el real)
// con un idioma sintético `zz` en las tres raíces del núcleo y en los mensajes de
// Claude Code y Kimi Code; cada texto `zz` es el `es` con el prefijo '[zz] '. Se
// construyen los adaptadores de ese árbol y se recorre el MISMO golden de CA-3.
const MARCA = '[zz] ';
const HARNESSES = ['claude-code', 'kimi-code', 'opencode'];
const GOLDEN = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'tools', 'tests', 'golden', 'es.json'), 'utf8'));
const GOLDEN_SCAFFOLD = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'tools', 'tests', 'golden', 'scaffold-es.json'), 'utf8'));

const catalogoZz = (dirMensajes) => {
  const es = JSON.parse(fs.readFileSync(path.join(dirMensajes, 'es', 'mensajes.json'), 'utf8'));
  fs.mkdirSync(path.join(dirMensajes, 'zz'), { recursive: true });
  fs.writeFileSync(path.join(dirMensajes, 'zz', 'mensajes.json'),
    JSON.stringify(Object.fromEntries(Object.entries(es).map(([k, v]) => [k, MARCA + v])), null, 2));
};

function arbolZz() {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-zz-arbol-'));
  fs.cpSync(path.join(REPO_ROOT, 'core'), path.join(raiz, 'core'), { recursive: true });
  fs.cpSync(path.join(REPO_ROOT, 'adapters'), path.join(raiz, 'adapters'), { recursive: true });
  const core = path.join(raiz, 'core');
  // core/roles/zz/ (lo que hace de zz un idioma soportado).
  fs.cpSync(path.join(core, 'roles', 'es'), path.join(core, 'roles', 'zz'), { recursive: true });
  // core/templates/zz/: el es con el primer encabezado marcado.
  const tplEs = path.join(core, 'templates', 'es');
  for (const f of walk(tplEs)) {
    const destino = path.join(core, 'templates', 'zz', path.relative(tplEs, f));
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, fs.readFileSync(f, 'utf8').replace(/^# /m, `# ${MARCA}`));
  }
  catalogoZz(path.join(core, 'mensajes'));
  catalogoZz(path.join(raiz, 'adapters', 'claude-code', 'mensajes'));
  catalogoZz(path.join(raiz, 'adapters', 'kimi-code', 'mensajes'));
  const dist = {};
  for (const h of HARNESSES) {
    dist[h] = buildAdapter(h, {
      repoRoot: raiz, outDir: path.join(raiz, 'dist', h),
      proc: { version: '0.0.0', commit: null, harness: h, fecha: null, sucio: true },
    });
  }
  return { core, dist };
}

const { core, dist } = arbolZz();
const ZZ = { ...VARIANTES.es, idioma: 'zz' };
const r = await ejecutaCasos({ coreDir: core, dist, sddJson: ZZ });

const contiene = (caso, txt) => assert.ok(r[caso].includes(txt), `${caso}: falta ${JSON.stringify(txt)} en ${JSON.stringify(r[caso])}`);

test('CA-5(a): estado.mjs — transición ilegal y firma inválida en zz', () => {
  contiene('estado.no-permitida', `[estado] ${MARCA}Transición no permitida: borrador -> hecho.`);
  contiene('estado.firma-aprobada', `[estado] ${MARCA}Firma inválida para 'aprobada'`);
  contiene('estado.firma-aprobada', `. ${MARCA}'aprobada' es el gate humano`);
});

test('CA-5(b): valida.mjs — errores en zz', () => {
  contiene('valida.varios', `${MARCA}[valida] 4 error(es):`);
  contiene('valida.varios', ` - ${MARCA}epicas/EPIC-001-x/SPEC-002-mal.md: id 'SPEC-003'`);
});

test('CA-5(c): motivo de require-spec en zz por Claude Code, Kimi Code y opencode', () => {
  for (const n of ['sin-rama', 'inexistente', 'borrador']) {
    contiene(`require-spec.lib.${n}`, MARCA);
    assert.ok(r[`require-spec.claude.${n}`].startsWith(`deny: ${MARCA}`), n);
    assert.ok(r[`require-spec.kimi.${n}`].startsWith(`deny: ${MARCA}`), n);
    assert.ok(r[`require-spec.opencode.${n}`].startsWith(`throw: ${MARCA}`), n);
  }
});

test('CA-5(d): las dos denegaciones de protege-verdad en zz, en Claude Code y Kimi Code', () => {
  for (const h of ['claude', 'kimi']) {
    assert.ok(r[`protege-verdad.${h}.tablero`].startsWith(`deny: ${MARCA}docs/tablero.md es GENERADO`), h);
    assert.ok(r[`protege-verdad.${h}.verdad`].startsWith(`deny: ${MARCA}'FOUNDATION.md' es un documento de verdad`), h);
  }
});

test('CA-5(e): el prefijo de calidad en zz', () => {
  contiene('calidad.artefacto', `${MARCA}[sdd-calidad] Artefacto inconsistente:`);
  contiene('calidad.linter', `${MARCA}[sdd-calidad] ruff encontró problemas:`);
});

test('CA-5(f): cabecera, etiquetas y cabeceras de tabla del tablero en zz; identificadores intactos', () => {
  const t = r['tablero.render'];
  for (const l of ['<!-- GENERADO', '# Tablero', 'Actualizado: 2026-01-01', '| Spec | Estado |', '## ADRs', '| ADR | Estado |', '## Resumen']) {
    assert.ok(t.includes(MARCA + l), `falta ${MARCA}${l}`);
  }
  assert.ok(t.includes('| SPEC-001 — alta | aprobada | 2026-07-01 (Alberto) |'));
  assert.ok(t.includes('- aprobada: 1'));
});

test('CA-5(g): el lang del informe QA es zz', () => {
  assert.ok(r['informe-qa.render'].startsWith('<!doctype html><html lang="zz">'));
});

test('CA-5(h): scaffold toma los artefactos de core/templates/zz/artefactos/', async () => {
  const sc = await ejecutaScaffold({ coreDir: core, sddJson: ZZ });
  assert.deepEqual(Object.keys(sc), Object.keys(GOLDEN_SCAFFOLD));
  for (const [f, txt] of Object.entries(sc)) {
    assert.ok(txt.includes(`\n# ${MARCA}`), `${f} no sale de la plantilla zz`);
    assert.equal(txt.replace(`# ${MARCA}`, '# '), GOLDEN_SCAFFOLD[f], `${f}: solo cambia el texto de la plantilla`);
  }
});

test('CA-5: quitando la marca zz, cada salida es el golden es (solo cambia el texto; ADR-013 §4)', () => {
  for (const [caso, esperado] of Object.entries(GOLDEN)) {
    const sinMarca = r[caso].replaceAll(MARCA, '').replace('<html lang="zz">', '<html lang="es">');
    assert.equal(sinMarca, esperado, caso);
    if (caso !== 'informe-qa.cli-exito') assert.notEqual(r[caso], esperado, `${caso} no salió en zz`);
  }
});
