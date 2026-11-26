import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../checks/_util.mjs';
import { idiomasSoportados } from '../../core/lib/idioma.mjs';

// SPEC-025 CA-7 — sdd-init no acepta ni genera un `idioma` no soportado
// (ADR-016 §2). sdd-init lo ejecuta un LLM: se verifica sobre su prosa.
const INITS = [['claude-code', '${CLAUDE_PLUGIN_ROOT}/core'], ['opencode', '../core'], ['antigravity', '../core']];
const lee = (h) => fs.readFileSync(path.join(REPO_ROOT, 'adapters', h, 'commands', 'sdd-init.md'), 'utf8');
const seccion = (s, titulo) => {
  const i = s.indexOf(titulo);
  assert.ok(i >= 0, `falta la sección ${titulo}`);
  const j = s.indexOf('\n## ', i + titulo.length);
  return s.slice(i, j === -1 ? undefined : j);
};

for (const [h, raiz] of INITS) {
  test(`CA-7(a) ${h}: ofrece como idiomas los subdirectorios de core/roles/, no una lista fija`, () => {
    const p1 = seccion(lee(h), '## Paso 1');
    assert.ok(p1.includes(`los idiomas soportados son los subdirectorios de\n     \`${raiz}/roles/\``));
    assert.match(p1, /no uses una lista fija/);
    assert.doesNotMatch(lee(h), /hoy solo `es`/);
  });

  test(`CA-7(b) ${h}: se niega a escribir un idioma fuera de la lista y vuelve a preguntar`, () => {
    const p1 = seccion(lee(h), '## Paso 1');
    assert.match(p1, /Si la respuesta no es uno de ellos, no la aceptes/);
    assert.match(p1, /vuelve a preguntar/);
    assert.match(p1, /Nunca escribas en `\.sdd\.json` un `idioma`\s+fuera de esa lista/);
  });

  test(`CA-7(c) ${h}: en migración señala un idioma no soportado antes de copiar plantillas`, () => {
    const p2 = seccion(lee(h), '## Paso 2');
    const paso0 = p2.indexOf('0. Si ya existe `.sdd.json`, comprueba su `idioma` antes de nada.');
    assert.ok(paso0 >= 0, 'el paso 0 de migración revisa el idioma');
    const paso1 = p2.indexOf('\n1. ', paso0);
    assert.ok(paso1 > paso0, 'la revisión va antes que nada más');
    const texto = p2.slice(paso0, paso1);
    assert.match(texto, /idioma no soportado/);
    assert.match(texto, /pide\s+que elija uno antes de copiar plantillas/);
  });

  test(`CA-7(d) ${h}: en migración estampa .sdd.json, ya con un idioma soportado, antes de llamar a los scripts`, () => {
    const p2 = seccion(lee(h), '## Paso 2');
    const estampa = p2.indexOf('estampa');
    assert.ok(estampa >= 0);
    const resto = p2.slice(estampa);
    assert.match(resto, /^estampa\s+primero `\.sdd\.json` \(kit base del Paso 1\.2, con un `idioma` soportado\)/);
    assert.ok(resto.indexOf('.sdd.json') < resto.indexOf('valida.mjs'), 'estampa .sdd.json antes de valida.mjs');
  });
}

test('CA-7: el idioma de core/templates/sdd.json es un idioma soportado', () => {
  const { idioma } = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'core', 'templates', 'sdd.json'), 'utf8'));
  assert.ok(idiomasSoportados().includes(idioma), `idioma '${idioma}'`);
});
