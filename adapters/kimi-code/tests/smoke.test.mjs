import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseYamlKimi } from '../../../tools/checks/_yaml.mjs';

// CA-7: smoke test del pipeline Kimi SIN cuenta de Kimi. Verifica (a) el YAML del
// raíz y de cada subagente es cargable y su system_prompt_path resuelve; (b) la
// ruta al fichero de rol del núcleo existe y resuelve INTERNA al artefacto,
// demostrando que el núcleo viaja y se resuelve por ruta interna. Si (b) fallara,
// npm test se pone rojo → PARAR y devolver al gate (F-SPEC-003-1 para el CLI real).
const DIST = path.resolve('dist/kimi-code');
const IDIOMA = 'es';
const AGENTES = ['sdd-orquestador', 'sdd-producto', 'sdd-arquitecto', 'sdd-implementador', 'sdd-verificador', 'sdd-documentalista', 'sdd-como-vamos'];

// ¿resuelto queda dentro del artefacto? (no escapa por '../').
function interno(p) {
  const rel = path.relative(DIST, p);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

for (const rol of AGENTES) {
  test(`CA-7a: el YAML de ${rol} es cargable y su system_prompt_path resuelve`, () => {
    const yamlPath = path.join(DIST, 'agents', `${rol}.yaml`);
    const doc = parseYamlKimi(fs.readFileSync(yamlPath, 'utf8'));
    assert.equal(doc.agent.name, rol);
    assert.ok(doc.system_prompt_path, 'declara system_prompt_path');
    const boot = path.resolve(path.dirname(yamlPath), doc.system_prompt_path);
    assert.ok(interno(boot), 'el bootstrap resuelve interno al artefacto');
    assert.ok(fs.existsSync(boot), `el bootstrap existe: ${doc.system_prompt_path}`);
  });

  test(`CA-7b: el rol de núcleo de ${rol} existe y resuelve interno al artefacto`, () => {
    const boot = path.join(DIST, 'agents', 'prompts', `${rol}.md`);
    const texto = fs.readFileSync(boot, 'utf8');
    const m = texto.match(/((?:\.\.\/)+core\/roles\/[^\s`"']+)/);
    assert.ok(m, 'el bootstrap referencia el rol de núcleo por ruta relativa');
    const rolPath = path.resolve(path.dirname(boot), m[1].replaceAll('<idioma>', IDIOMA));
    assert.ok(interno(rolPath), 'la ruta al núcleo resuelve INTERNA al artefacto (no escapa)');
    assert.ok(fs.existsSync(rolPath), `el fichero de rol del núcleo existe: ${rolPath}`);
    assert.match(fs.readFileSync(rolPath, 'utf8'), /##\s+Misión/, 'el rol resuelto contiene el cuerpo del system prompt');
  });
}
