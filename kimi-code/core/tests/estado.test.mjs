import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { transition, TRANSITIONS } from '../scripts/estado.mjs';
import { parseFrontmatter } from '../lib/frontmatter.mjs';

// El historial se construye coherente con el estado: una spec más allá de
// 'borrador' solo llega ahí pasando por una aprobación humana, y ahora el
// script lo exige. Un fixture que la saltara probaría una spec imposible.
function specTmp(estado) {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-')), 'SPEC-001-x.md');
  const historial = ['  - {estado: borrador, fecha: 2026-07-01, por: sdd-arquitecto}'];
  if (estado !== 'borrador') historial.push('  - {estado: aprobada, fecha: 2026-07-02, por: Alberto}');
  if (!['borrador', 'aprobada'].includes(estado)) {
    historial.push(`  - {estado: ${estado}, fecha: 2026-07-03, por: sdd-implementador}`);
  }
  fs.writeFileSync(f, `---\nid: SPEC-001\ntipo: spec\nepica: EPIC-001\nestado: ${estado}\nhistorial:\n${historial.join('\n')}\n---\n# X\n`);
  return f;
}

test('transición válida actualiza estado y añade historial', () => {
  const f = specTmp('borrador');
  transition(f, 'aprobada', 'Alberto', '2026-07-09');
  const { data } = parseFrontmatter(fs.readFileSync(f, 'utf8'));
  assert.equal(data.estado, 'aprobada');
  assert.equal(data.historial.length, 2);
  assert.deepEqual(data.historial[1], { estado: 'aprobada', fecha: '2026-07-09', por: 'Alberto' });
});

test('transición inválida lanza y no toca el fichero', () => {
  const f = specTmp('borrador');
  const antes = fs.readFileSync(f, 'utf8');
  assert.throws(() => transition(f, 'hecho', 'x'), /no permitida/);
  assert.equal(fs.readFileSync(f, 'utf8'), antes);
});

test('bloqueada es alcanzable desde cualquier estado no terminal y reversible', () => {
  const f = specTmp('en-progreso');
  transition(f, 'bloqueada', 'sdd-orquestador', '2026-07-09');
  transition(f, 'en-progreso', 'sdd-orquestador', '2026-07-10');
  const { data } = parseFrontmatter(fs.readFileSync(f, 'utf8'));
  assert.equal(data.estado, 'en-progreso');
});

test('hecho es terminal', () => {
  assert.deepEqual(TRANSITIONS['hecho'], []);
});

// El gate humano. El state machine impone el orden de los estados; estos
// imponen quién firma. Sin ellos, un rol que se topa con "Permitidas: aprobada"
// puede auto-aprobarse y seguir: el hook require-spec ya le deja codear.
test('aprobada rechaza la firma de un rol sdd-* y no toca el fichero', () => {
  const f = specTmp('borrador');
  const antes = fs.readFileSync(f, 'utf8');
  assert.throws(() => transition(f, 'aprobada', 'sdd-implementador'), /gate humano/);
  assert.throws(() => transition(f, 'aprobada', 'sdd-orquestador'), /gate humano/);
  assert.equal(fs.readFileSync(f, 'utf8'), antes);
});

test('aprobada rechaza la firma ausente (el default del CLI)', () => {
  const f = specTmp('borrador');
  assert.throws(() => transition(f, 'aprobada', 'desconocido'), /gate humano/);
  assert.throws(() => transition(f, 'aprobada', ''), /gate humano/);
  assert.throws(() => transition(f, 'aprobada', undefined), /gate humano/);
});

test('aprobada acepta firma humana y la estampa en aprobada-por', () => {
  const f = specTmp('borrador');
  transition(f, 'aprobada', 'Alberto', '2026-07-15');
  const { data } = parseFrontmatter(fs.readFileSync(f, 'utf8'));
  assert.equal(data.estado, 'aprobada');
  assert.equal(data['aprobada-por'], 'Alberto');
});

// 'bloqueada' es alcanzable desde 'borrador' y sale a 'en-progreso': sin el
// check de historial, dos llamadas al script dejan a un rol codeando una spec
// que nadie aprobó, y require-spec lo permite porque solo mira el estado actual.
test('el rodeo borrador -> bloqueada -> en-progreso no salta el gate humano', () => {
  const f = specTmp('borrador');
  transition(f, 'bloqueada', 'sdd-implementador', '2026-07-15');
  assert.throws(() => transition(f, 'en-progreso', 'sdd-implementador'), /aprobación humana previa/);
  assert.throws(() => transition(f, 'en-revision', 'sdd-implementador'), /aprobación humana previa/);
});

test('tras la aprobación humana, bloqueada sigue siendo reversible a en-progreso', () => {
  const f = specTmp('borrador');
  transition(f, 'aprobada', 'Alberto', '2026-07-15');
  transition(f, 'bloqueada', 'sdd-orquestador', '2026-07-15');
  transition(f, 'en-progreso', 'sdd-implementador', '2026-07-16');
  const { data } = parseFrontmatter(fs.readFileSync(f, 'utf8'));
  assert.equal(data.estado, 'en-progreso');
});

// El gate adversarial: el que implementa no se certifica a sí mismo.
test('hecho solo lo firma sdd-verificador', () => {
  const f = specTmp('en-revision');
  assert.throws(() => transition(f, 'hecho', 'sdd-implementador'), /sdd-verificador/);
  assert.throws(() => transition(f, 'hecho', 'Alberto'), /sdd-verificador/);
  transition(f, 'hecho', 'sdd-verificador', '2026-07-15');
  const { data } = parseFrontmatter(fs.readFileSync(f, 'utf8'));
  assert.equal(data.estado, 'hecho');
});

// --- SPEC-006: la firma de 'hecho' depende de data.tipo ---
// Una épica en 'en-revision' con aprobación humana previa en su historial. El
// cierre de una épica es un milestone del humano: ningún rol sdd-* lo firma.
function epicaTmp() {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-')), 'EPIC-001-x.md');
  const historial = [
    '  - {estado: borrador, fecha: 2026-07-01, por: sdd-producto}',
    '  - {estado: aprobada, fecha: 2026-07-02, por: Alberto}',
    '  - {estado: en-progreso, fecha: 2026-07-03, por: sdd-orquestador}',
    '  - {estado: en-revision, fecha: 2026-07-04, por: sdd-orquestador}',
  ];
  fs.writeFileSync(f, `---\nid: EPIC-001\ntipo: epica\nestado: en-revision\nhistorial:\n${historial.join('\n')}\n---\n# X\n`);
  return f;
}

// CA-2: cierre de EPICA = persona, nunca un rol. Cierra la invasión del
// documentalista (proponer/cerrar la épica) que motivó CE-1.
test('epica -> hecho: cualquier rol sdd-* la RECHAZA (cierre de épica = gate humano)', () => {
  const f = epicaTmp();
  const antes = fs.readFileSync(f, 'utf8');
  assert.throws(() => transition(f, 'hecho', 'sdd-documentalista'), /gate humano/);
  assert.throws(() => transition(f, 'hecho', 'sdd-verificador'), /gate humano/);
  assert.throws(() => transition(f, 'hecho', 'sdd-orquestador'), /gate humano/);
  assert.equal(fs.readFileSync(f, 'utf8'), antes);
});

test('epica -> hecho: la firma de una persona la PERMITE', () => {
  const f = epicaTmp();
  transition(f, 'hecho', 'Alberto', '2026-07-20');
  const { data } = parseFrontmatter(fs.readFileSync(f, 'utf8'));
  assert.equal(data.estado, 'hecho');
});

// CA-2/CA-4: la rama por tipo NO contamina spec/task. Una spec sigue exigiendo
// sdd-verificador (statu quo de 18ad848), una épica exige persona.
test('la firma de hecho discrimina por tipo: spec exige verificador, epica exige persona', () => {
  const spec = specTmp('en-revision');
  assert.throws(() => transition(spec, 'hecho', 'Alberto'), /sdd-verificador/);
  const epica = epicaTmp();
  assert.throws(() => transition(epica, 'hecho', 'sdd-verificador'), /gate humano/);
});
