import test from 'node:test';
import assert from 'node:assert/strict';
import { parseYamlKimi } from '../checks/_yaml.mjs';

// Parser YAML MÍNIMO para validar los agentes de Kimi (Node no trae YAML y el
// repo no tiene dependencias). Subset: mapas anidados por indentación (2 esp.),
// secuencias de escalares (- item), y escalares con/sin comillas. No es YAML general.

test('escalares planos: string, número y comillas', () => {
  const doc = parseYamlKimi(
    'version: 1\nextend: default\nsystem_prompt_path: "./prompts/x.md"\n',
  );
  assert.equal(doc.version, '1');
  assert.equal(doc.extend, 'default');
  assert.equal(doc.system_prompt_path, './prompts/x.md');
});

test('mapa anidado (agent.name)', () => {
  const doc = parseYamlKimi('agent:\n  name: sdd-implementador\n');
  assert.deepEqual(doc.agent, { name: 'sdd-implementador' });
});

test('secuencia de escalares (allowed_tools)', () => {
  const doc = parseYamlKimi('allowed_tools:\n  - Read\n  - Write\n  - Edit\n');
  assert.deepEqual(doc.allowed_tools, ['Read', 'Write', 'Edit']);
});

test('mapa de mapas (subagents: { rol: { path, description } })', () => {
  const doc = parseYamlKimi(
    'subagents:\n' +
    '  sdd-arquitecto:\n' +
    '    path: ./sdd-arquitecto.yaml\n' +
    '    description: Convierte una petición en spec.\n' +
    '  sdd-implementador:\n' +
    '    path: ./sdd-implementador.yaml\n' +
    '    description: Implementa una spec aprobada.\n',
  );
  assert.deepEqual(Object.keys(doc.subagents), ['sdd-arquitecto', 'sdd-implementador']);
  assert.equal(doc.subagents['sdd-arquitecto'].path, './sdd-arquitecto.yaml');
  assert.equal(doc.subagents['sdd-implementador'].description, 'Implementa una spec aprobada.');
});

test('ignora comentarios de línea completa y líneas en blanco', () => {
  const doc = parseYamlKimi('# comentario\nversion: 1\n\n# otro\nextend: default\n');
  assert.deepEqual(doc, { version: '1', extend: 'default' });
});

test('documento completo de un subagente Kimi', () => {
  const doc = parseYamlKimi([
    'version: 1',
    'extend: default',
    'agent:',
    '  name: sdd-verificador',
    'system_prompt_path: ./prompts/sdd-verificador.md',
    'allowed_tools:',
    '  - Read',
    '  - Grep',
    '  - Glob',
    '  - Bash',
    '',
  ].join('\n'));
  assert.equal(doc.agent.name, 'sdd-verificador');
  assert.equal(doc.extend, 'default');
  assert.equal(doc.system_prompt_path, './prompts/sdd-verificador.md');
  assert.deepEqual(doc.allowed_tools, ['Read', 'Grep', 'Glob', 'Bash']);
});

test('YAML inválido (indentación imposible) lanza', () => {
  assert.throws(() => parseYamlKimi('   - suelto sin clave\n'));
});
