# tremen-sdd v1 — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el plugin de Claude Code `tremen-sdd` v1: scripts deterministas de scaffolding/estado/tablero/QA, 3 hooks de enforcement, 7 roles `sdd-*` con wrappers i18n-ready, plantillas estampables y comando `/sdd-init`.

**Architecture:** Plugin de Claude Code con marketplace propio. Las skills son wrappers finos que leen la lógica de `roles/es/`; todo lo mecánico lo hacen scripts Node sin dependencias en `scripts/` (invocados vía `${CLAUDE_PLUGIN_ROOT}`); los hooks (`hooks/hooks.json`) se auto-registran al habilitar el plugin y son fail-open en proyectos sin `.sdd.json`. `templates/` es autocontenido para que un futuro instalador externo lo consuma sin cambios.

**Tech Stack:** Node.js ≥ 18 (ESM `.mjs`, stdlib pura, sin dependencias npm), `node:test` para tests, git CLI, formato de plugins de Claude Code.

**Spec de referencia:** `docs/superpowers/specs/2026-07-09-tremen-sdd-design.md` (leerla ante cualquier duda).

## Global Constraints

- Node ≥ 18, módulos ESM (`.mjs`), **cero dependencias npm** (solo stdlib de Node).
- Tests con `node:test`: se ejecutan con `node --test tests/` desde la raíz del repo.
- Tokens canónicos (verbatim, NUNCA traducir ni renombrar): estados `borrador`, `aprobada`, `en-progreso`, `en-revision`, `hecho`, `bloqueada`; claves de frontmatter `id`, `tipo`, `epica`, `estado`, `aprobada-por`, `historial`; entrada de historial `{estado: X, fecha: YYYY-MM-DD, por: quien}`.
- IDs: regex `^(EPIC|SPEC|TASK|ADR)-\d{3}$`, más las épicas especiales `EPIC-FIX`, `EPIC-INFRA`, `EPIC-MANT`, `EPIC-MEJORA`.
- Rama de trabajo canónica: `ft/SPEC-NNN-slug`. Footer de commit: `Refs: SPEC-NNN`.
- Identificadores de código en inglés; mensajes de CLI, errores y todo texto de plantillas/roles en español.
- Compatible Windows: rutas con `node:path`, tolerar CRLF al parsear, git vía `execSync`.
- Commits frecuentes, Conventional Commits en español, terminados en:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- Los placeholders de plantillas usan `{{ID}}`, `{{SLUG}}`, `{{TITULO}}`, `{{FECHA}}`, `{{EPICA}}`.

## Mapa de ficheros (resultado final)

```
tremen-sdd/
├─ .claude-plugin/plugin.json, marketplace.json
├─ package.json
├─ lib/frontmatter.mjs
├─ scripts/scaffold.mjs, estado.mjs, valida.mjs, tablero.mjs, informe-qa.mjs
├─ hooks/hooks.json, require-spec.mjs, protege-verdad.mjs, calidad.mjs, _comun.mjs
├─ roles/es/sdd-{orquestador,producto,arquitecto,implementador,verificador,documentalista,como-vamos}.md
├─ skills/sdd-*/SKILL.md + trigger-eval.json   (7 skills)
├─ commands/sdd-init.md, sdd-tablero.md
├─ templates/
│   ├─ FOUNDATION.md, CLAUDE.md, sdd.json, roadmap.md, rol-dominio.md
│   ├─ fundacion/{vision.md, dominio.md, reglas.md, contexto.md}
│   └─ artefactos/{_epica.md, SPEC.md, SPEC.ledger.md, TASK.md, ADR.md}
└─ tests/*.test.mjs
```

---

### Task 1: Esqueleto del plugin

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `.claude-plugin/marketplace.json`
- Create: `package.json`
- Create: `.gitignore`

**Interfaces:**
- Produces: identidad del plugin (`name: tremen-sdd`) que usan la instalación y el marketplace; `package.json` con `"type": "module"` del que dependen todos los `.mjs`.

- [ ] **Step 1: Escribir los cuatro ficheros**

`.claude-plugin/plugin.json`:
```json
{
  "name": "tremen-sdd",
  "version": "0.1.0",
  "description": "Estándar SDD unificado de tremen.dev: roles sdd-*, hooks de enforcement, scaffolding determinista y plantillas para specs, épicas, ADRs y ledgers de evidencia.",
  "author": { "name": "Alberto Fojo" }
}
```

`.claude-plugin/marketplace.json`:
```json
{
  "name": "tremen-sdd",
  "owner": { "name": "Alberto Fojo" },
  "plugins": [
    {
      "name": "tremen-sdd",
      "source": "./",
      "description": "Estándar SDD unificado de tremen.dev (roles, hooks, scaffolding, plantillas)."
    }
  ]
}
```

`package.json`:
```json
{
  "name": "tremen-sdd",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test tests/" }
}
```

`.gitignore`:
```
node_modules/
*.log
.tmp/
```

- [ ] **Step 2: Verificar que los JSON parsean**

Run: `node -e "['.claude-plugin/plugin.json','.claude-plugin/marketplace.json','package.json'].forEach(f=>JSON.parse(require('fs').readFileSync(f,'utf8'))); console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .claude-plugin package.json .gitignore
git commit -m "feat: esqueleto del plugin tremen-sdd (plugin.json, marketplace, package)" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: lib/frontmatter.mjs — parser/serializador de frontmatter

**Files:**
- Create: `lib/frontmatter.mjs`
- Test: `tests/frontmatter.test.mjs`

**Interfaces:**
- Produces: `parseFrontmatter(text: string) -> { data: object, body: string }` y `stringifyFrontmatter(data: object, body: string) -> string`. Soporta valores escalares (string), listas planas y listas de objetos inline `- {k: v, k2: v2}` (formato del `historial`). Todos los valores se tratan como strings. Todos los scripts y hooks posteriores consumen estas dos funciones.

- [ ] **Step 1: Escribir los tests que fallan**

`tests/frontmatter.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, stringifyFrontmatter } from '../lib/frontmatter.mjs';

const DOC = `---
id: SPEC-001
tipo: spec
epica: EPIC-001
estado: en-revision
historial:
  - {estado: borrador, fecha: 2026-07-09, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-10, por: Alberto}
---
# Cuerpo

Texto.
`;

test('parsea claves escalares', () => {
  const { data } = parseFrontmatter(DOC);
  assert.equal(data.id, 'SPEC-001');
  assert.equal(data.estado, 'en-revision');
});

test('parsea historial como lista de objetos', () => {
  const { data } = parseFrontmatter(DOC);
  assert.equal(data.historial.length, 2);
  assert.deepEqual(data.historial[1], { estado: 'aprobada', fecha: '2026-07-10', por: 'Alberto' });
});

test('separa el cuerpo sin tocarlo', () => {
  const { body } = parseFrontmatter(DOC);
  assert.ok(body.startsWith('# Cuerpo'));
});

test('texto sin frontmatter devuelve data vacía y body intacto', () => {
  const { data, body } = parseFrontmatter('hola\n');
  assert.deepEqual(data, {});
  assert.equal(body, 'hola\n');
});

test('tolera CRLF', () => {
  const { data } = parseFrontmatter(DOC.replaceAll('\n', '\r\n'));
  assert.equal(data.id, 'SPEC-001');
  assert.equal(data.historial.length, 2);
});

test('roundtrip parse -> stringify conserva datos y cuerpo', () => {
  const { data, body } = parseFrontmatter(DOC);
  const out = stringifyFrontmatter(data, body);
  const again = parseFrontmatter(out);
  assert.deepEqual(again.data, data);
  assert.equal(again.body, body);
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `node --test tests/frontmatter.test.mjs`
Expected: FAIL — `Cannot find module '../lib/frontmatter.mjs'`

- [ ] **Step 3: Implementación mínima**

`lib/frontmatter.mjs`:
```js
// Frontmatter YAML restringido: escalares string, listas planas y listas de
// objetos inline {k: v}. Suficiente para los artefactos tremen-sdd; no es YAML general.

export function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: text };
  const data = {};
  let currentKey = null;
  for (const raw of m[1].split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const listItem = raw.match(/^\s+-\s+(.*)$/);
    if (listItem && currentKey) {
      data[currentKey].push(parseValue(listItem[1]));
      continue;
    }
    const kv = raw.match(/^([\w][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    if (value === '') {
      data[key] = [];
      currentKey = key;
    } else {
      data[key] = parseValue(value);
      currentKey = null;
    }
  }
  return { data, body: text.slice(m[0].length) };
}

function parseValue(v) {
  v = v.trim();
  if (v.startsWith('{') && v.endsWith('}')) {
    const obj = {};
    for (const pair of v.slice(1, -1).split(',')) {
      const i = pair.indexOf(':');
      if (i === -1) continue;
      obj[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
    }
    return obj;
  }
  return v;
}

export function stringifyFrontmatter(data, body) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${typeof item === 'object' ? inline(item) : item}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n') + body;
}

function inline(obj) {
  return '{' + Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(', ') + '}';
}
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

Run: `node --test tests/frontmatter.test.mjs`
Expected: `pass 6`

- [ ] **Step 5: Commit**

```bash
git add lib/frontmatter.mjs tests/frontmatter.test.mjs
git commit -m "feat: parser/serializador de frontmatter sin dependencias" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Plantillas de artefactos SDD

**Files:**
- Create: `templates/artefactos/_epica.md`
- Create: `templates/artefactos/SPEC.md`
- Create: `templates/artefactos/SPEC.ledger.md`
- Create: `templates/artefactos/TASK.md`
- Create: `templates/artefactos/ADR.md`

**Interfaces:**
- Produces: plantillas con placeholders `{{ID}}`, `{{SLUG}}`, `{{TITULO}}`, `{{FECHA}}`, `{{EPICA}}` que `scaffold.mjs` (Task 4) rellena. El frontmatter de cada una usa los tokens canónicos de Global Constraints.

- [ ] **Step 1: Escribir las cinco plantillas**

`templates/artefactos/_epica.md`:
```markdown
---
id: {{ID}}
tipo: epica
estado: borrador
historial:
  - {estado: borrador, fecha: {{FECHA}}, por: sdd-producto}
---
# {{ID}} — {{TITULO}}

## Objetivo
<!-- Qué capacidad de negocio entrega esta épica y por qué ahora. -->

## Criterios de éxito
<!-- Medibles. Cómo sabremos que la épica cumplió su promesa. -->

## Alcance
- Dentro:
- Fuera (aparcado a propósito, no por descuido):

## Specs
<!-- Tabla DERIVADA de los frontmatters; la regenera /sdd-tablero. No editar a mano. -->
| Spec | Título | Estado |
|---|---|---|

## Riesgos
```

`templates/artefactos/SPEC.md`:
```markdown
---
id: {{ID}}
tipo: spec
epica: {{EPICA}}
estado: borrador
aprobada-por:
historial:
  - {estado: borrador, fecha: {{FECHA}}, por: sdd-arquitecto}
---
# {{ID}} — {{TITULO}}

## Problema
<!-- Qué duele y a quién. Cita reglas de negocio (RN-xx) de docs/fundacion/reglas.md. -->

## Usuarios / roles afectados

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA debe ser verificable con un test. -->
- **CA-1**: Dado … cuando … entonces …

## Entidades y reglas afectadas
<!-- Cita RN-xx, ADR-NNN y términos de docs/fundacion/dominio.md. Referencia, no dupliques. -->

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

## Notas para el gate humano
<!-- Lo que quien aprueba necesita saber para decidir. -->
```

`templates/artefactos/SPEC.ledger.md`:
```markdown
---
id: {{ID}}
tipo: ledger
epica: {{EPICA}}
---
# Ledger — {{ID}} {{TITULO}}

## Resumen
- Fase: <!-- refleja el estado de la spec; la fuente de verdad es el frontmatter de la spec -->
- Rama: `ft/{{ID}}-{{SLUG}}`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | | | | ❌ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/{{ID}}/. Informe HTML opcional: _qa/{{ID}}/informe.html -->

## Salvedades / follow-ups
<!-- IDs F-{{ID}}-1, F-{{ID}}-2… con destino (spec futura o EPIC-MEJORA). -->

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->
```

`templates/artefactos/TASK.md`:
```markdown
---
id: {{ID}}
tipo: task
epica: {{EPICA}}
estado: borrador
historial:
  - {estado: borrador, fecha: {{FECHA}}, por: sdd-arquitecto}
---
# {{ID}} — {{TITULO}}

## Contexto y objetivo

## Pasos
- [ ] …

## Verificación
<!-- Comando(s) y resultado esperado. -->
```

`templates/artefactos/ADR.md`:
```markdown
---
id: {{ID}}
tipo: adr
estado: borrador
historial:
  - {estado: borrador, fecha: {{FECHA}}, por: sdd-arquitecto}
---
# {{ID}}: {{TITULO}}

- Deciders: <!-- rol que propone; humano que aprueba, con fecha y matices de la negociación -->
- Specs relacionadas: <!-- SPEC-NNN que lo originan o lo consumen -->

## Contexto

## Decisión

## Consecuencias
### Positivas
### Negativas / follow-ups

## Alternativas consideradas
<!-- Cada una con el motivo de rechazo. -->

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
```

- [ ] **Step 2: Verificar que los frontmatters de plantilla parsean**

Run: `node -e "import('./lib/frontmatter.mjs').then(m=>{const fs=require('fs');for(const f of ['_epica','SPEC','SPEC.ledger','TASK','ADR']){const t=fs.readFileSync('templates/artefactos/'+f+'.md','utf8').replaceAll('{{FECHA}}','2026-01-01');const d=m.parseFrontmatter(t).data;if(!d.tipo&&f!=='SPEC.ledger')throw f;}console.log('OK')})"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add templates/artefactos
git commit -m "feat: plantillas canónicas de épica, spec, ledger, task y ADR" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: scripts/scaffold.mjs — creación numerada de artefactos

**Files:**
- Create: `scripts/scaffold.mjs`
- Test: `tests/scaffold.test.mjs`

**Interfaces:**
- Consumes: `parseFrontmatter` de `lib/frontmatter.mjs`; plantillas de `templates/artefactos/` (Task 3).
- Produces: CLI `node scripts/scaffold.mjs <epica|spec|task|adr> "<titulo>" [--epica EPIC-NNN] [--dir <docsDir>]` que imprime la ruta creada. Exporta `nextId(docsDir, prefijo) -> 'PREFIJO-NNN'` y `createArtifact(opts) -> rutaCreada` (usadas por tests y reutilizables). Una spec crea también su ledger. `slugify(titulo)` -> kebab-case sin acentos.

- [ ] **Step 1: Escribir los tests que fallan**

`tests/scaffold.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { nextId, createArtifact, slugify } from '../scripts/scaffold.mjs';
import { parseFrontmatter } from '../lib/frontmatter.mjs';

function tmpDocs() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  fs.mkdirSync(path.join(dir, 'epicas'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'adr'), { recursive: true });
  return dir;
}

test('slugify quita acentos y pasa a kebab-case', () => {
  assert.equal(slugify('Alta de facturación rápida'), 'alta-de-facturacion-rapida');
});

test('nextId devuelve 001 en docs vacío y max+1 con existentes', () => {
  const docs = tmpDocs();
  assert.equal(nextId(docs, 'EPIC'), 'EPIC-001');
  fs.mkdirSync(path.join(docs, 'epicas', 'EPIC-007-x'), { recursive: true });
  assert.equal(nextId(docs, 'EPIC'), 'EPIC-008');
});

test('nextId ignora las épicas especiales EPIC-FIX etc.', () => {
  const docs = tmpDocs();
  fs.mkdirSync(path.join(docs, 'epicas', 'EPIC-FIX'), { recursive: true });
  assert.equal(nextId(docs, 'EPIC'), 'EPIC-001');
});

test('createArtifact epica crea carpeta y _epica.md con frontmatter', () => {
  const docs = tmpDocs();
  const ruta = createArtifact({ tipo: 'epica', titulo: 'Facturación', docsDir: docs, fecha: '2026-07-09' });
  assert.ok(ruta.endsWith(path.join('EPIC-001-facturacion', '_epica.md')));
  const { data } = parseFrontmatter(fs.readFileSync(ruta, 'utf8'));
  assert.equal(data.id, 'EPIC-001');
  assert.equal(data.estado, 'borrador');
  assert.equal(data.historial[0].por, 'sdd-producto');
});

test('createArtifact spec crea spec + ledger dentro de su épica', () => {
  const docs = tmpDocs();
  createArtifact({ tipo: 'epica', titulo: 'Facturación', docsDir: docs, fecha: '2026-07-09' });
  const ruta = createArtifact({ tipo: 'spec', titulo: 'Alta factura', epica: 'EPIC-001', docsDir: docs, fecha: '2026-07-09' });
  assert.ok(ruta.endsWith('SPEC-001-alta-factura.md'));
  assert.ok(fs.existsSync(ruta.replace(/\.md$/, '.ledger.md')));
  const { data } = parseFrontmatter(fs.readFileSync(ruta, 'utf8'));
  assert.equal(data.epica, 'EPIC-001');
});

test('createArtifact spec sin épica existente lanza error', () => {
  const docs = tmpDocs();
  assert.throws(() => createArtifact({ tipo: 'spec', titulo: 'x', epica: 'EPIC-099', docsDir: docs, fecha: '2026-07-09' }), /EPIC-099/);
});

test('createArtifact adr crea en docs/adr', () => {
  const docs = tmpDocs();
  const ruta = createArtifact({ tipo: 'adr', titulo: 'Usar Turso', docsDir: docs, fecha: '2026-07-09' });
  assert.ok(ruta.endsWith('ADR-001-usar-turso.md'));
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `node --test tests/scaffold.test.mjs`
Expected: FAIL — `Cannot find module '../scripts/scaffold.mjs'`

- [ ] **Step 3: Implementación mínima**

`scripts/scaffold.mjs`:
```js
#!/usr/bin/env node
// Crea artefactos SDD numerados desde plantilla. La numeración la hace ESTE
// script, nunca el LLM ("la estructura se scriptea, el juicio se escribe").
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TPL = (name) => path.join(PLUGIN_ROOT, 'templates', 'artefactos', name);
const TIPOS = {
  epica: { prefijo: 'EPIC', plantilla: '_epica.md' },
  spec: { prefijo: 'SPEC', plantilla: 'SPEC.md' },
  task: { prefijo: 'TASK', plantilla: 'TASK.md' },
  adr: { prefijo: 'ADR', plantilla: 'ADR.md' },
};

export function slugify(titulo) {
  return titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function nextId(docsDir, prefijo) {
  let max = 0;
  const re = new RegExp(`^${prefijo}-(\\d{3})`);
  const stack = [docsDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const m = e.name.match(re);
      if (m) max = Math.max(max, Number(m[1]));
      if (e.isDirectory()) stack.push(path.join(dir, e.name));
    }
  }
  return `${prefijo}-${String(max + 1).padStart(3, '0')}`;
}

function findEpicaDir(docsDir, epicaId) {
  const base = path.join(docsDir, 'epicas');
  if (!fs.existsSync(base)) return null;
  return fs.readdirSync(base).map((n) => path.join(base, n))
    .find((p) => path.basename(p) === epicaId || path.basename(p).startsWith(epicaId + '-')) ?? null;
}

export function createArtifact({ tipo, titulo, epica, docsDir, fecha }) {
  const cfg = TIPOS[tipo];
  if (!cfg) throw new Error(`Tipo desconocido: ${tipo}. Usa epica|spec|task|adr.`);
  fecha ??= new Date().toISOString().slice(0, 10);
  const id = nextId(docsDir, cfg.prefijo);
  const slug = slugify(titulo);
  const rellena = (tpl) => tpl
    .replaceAll('{{ID}}', id).replaceAll('{{SLUG}}', slug)
    .replaceAll('{{TITULO}}', titulo).replaceAll('{{FECHA}}', fecha)
    .replaceAll('{{EPICA}}', epica ?? '');
  let destino;
  if (tipo === 'epica') {
    const dir = path.join(docsDir, 'epicas', `${id}-${slug}`);
    fs.mkdirSync(dir, { recursive: true });
    destino = path.join(dir, '_epica.md');
  } else if (tipo === 'adr') {
    fs.mkdirSync(path.join(docsDir, 'adr'), { recursive: true });
    destino = path.join(docsDir, 'adr', `${id}-${slug}.md`);
  } else {
    if (!epica) throw new Error(`Un ${tipo} necesita --epica EPIC-NNN.`);
    const epicaDir = findEpicaDir(docsDir, epica);
    if (!epicaDir) throw new Error(`No existe la épica ${epica} bajo ${docsDir}/epicas.`);
    destino = path.join(epicaDir, `${id}-${slug}.md`);
  }
  fs.writeFileSync(destino, rellena(fs.readFileSync(TPL(cfg.plantilla), 'utf8')));
  if (tipo === 'spec') {
    fs.writeFileSync(destino.replace(/\.md$/, '.ledger.md'),
      rellena(fs.readFileSync(TPL('SPEC.ledger.md'), 'utf8')));
  }
  return destino;
}

// CLI: node scaffold.mjs <tipo> "<titulo>" [--epica EPIC-NNN] [--dir docs]
if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  const [tipo, titulo] = process.argv.slice(2);
  const epica = process.argv.includes('--epica') ? process.argv[process.argv.indexOf('--epica') + 1] : undefined;
  const dir = process.argv.includes('--dir') ? process.argv[process.argv.indexOf('--dir') + 1] : 'docs';
  try {
    console.log(createArtifact({ tipo, titulo, epica, docsDir: path.resolve(dir) }));
  } catch (e) {
    console.error(`[scaffold] ${e.message}`);
    process.exit(1);
  }
}
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

Run: `node --test tests/scaffold.test.mjs`
Expected: `pass 7`

- [ ] **Step 5: Commit**

```bash
git add scripts/scaffold.mjs tests/scaffold.test.mjs
git commit -m "feat: scaffold determinista de artefactos con numeracion por script" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: scripts/estado.mjs — transiciones con historial

**Files:**
- Create: `scripts/estado.mjs`
- Test: `tests/estado.test.mjs`

**Interfaces:**
- Consumes: `parseFrontmatter`/`stringifyFrontmatter` (Task 2).
- Produces: CLI `node scripts/estado.mjs <ruta.md> <nuevo-estado> --por <quien>`. Exporta `transition(ruta, nuevoEstado, por, fecha?) -> void` (lanza `Error` si la transición no está permitida) y la tabla `TRANSITIONS`. El hook `calidad.mjs` (Task 11) y `valida.mjs` (Task 6) reutilizan el vocabulario.

- [ ] **Step 1: Escribir los tests que fallan**

`tests/estado.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { transition, TRANSITIONS } from '../scripts/estado.mjs';
import { parseFrontmatter } from '../lib/frontmatter.mjs';

function specTmp(estado) {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-')), 'SPEC-001-x.md');
  fs.writeFileSync(f, `---\nid: SPEC-001\ntipo: spec\nepica: EPIC-001\nestado: ${estado}\nhistorial:\n  - {estado: ${estado}, fecha: 2026-07-01, por: sdd-arquitecto}\n---\n# X\n`);
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
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `node --test tests/estado.test.mjs`
Expected: FAIL — `Cannot find module '../scripts/estado.mjs'`

- [ ] **Step 3: Implementación mínima**

`scripts/estado.mjs`:
```js
#!/usr/bin/env node
// Única vía sancionada para cambiar el estado de un artefacto: valida la
// transición y añade la entrada de historial de forma atómica.
import fs from 'node:fs';
import { parseFrontmatter, stringifyFrontmatter } from '../lib/frontmatter.mjs';

export const TRANSITIONS = {
  borrador: ['aprobada', 'bloqueada'],
  aprobada: ['en-progreso', 'bloqueada'],
  'en-progreso': ['en-revision', 'bloqueada'],
  'en-revision': ['hecho', 'en-progreso', 'bloqueada'],
  bloqueada: ['borrador', 'aprobada', 'en-progreso', 'en-revision'],
  hecho: [],
};

export function transition(ruta, nuevoEstado, por, fecha) {
  fecha ??= new Date().toISOString().slice(0, 10);
  const { data, body } = parseFrontmatter(fs.readFileSync(ruta, 'utf8'));
  const actual = data.estado;
  if (!TRANSITIONS[actual]) throw new Error(`Estado actual desconocido: '${actual}'.`);
  if (!TRANSITIONS[actual].includes(nuevoEstado)) {
    throw new Error(`Transición no permitida: ${actual} -> ${nuevoEstado}. Permitidas: ${TRANSITIONS[actual].join(', ') || '(ninguna, estado terminal)'}.`);
  }
  data.estado = nuevoEstado;
  data.historial = [...(data.historial ?? []), { estado: nuevoEstado, fecha, por }];
  fs.writeFileSync(ruta, stringifyFrontmatter(data, body));
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  const [ruta, nuevoEstado] = process.argv.slice(2);
  const por = process.argv.includes('--por') ? process.argv[process.argv.indexOf('--por') + 1] : 'desconocido';
  try {
    transition(ruta, nuevoEstado, por);
    console.log(`[estado] ${ruta}: -> ${nuevoEstado} (por ${por})`);
  } catch (e) {
    console.error(`[estado] ${e.message}`);
    process.exit(1);
  }
}
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

Run: `node --test tests/estado.test.mjs`
Expected: `pass 4`

- [ ] **Step 5: Commit**

```bash
git add scripts/estado.mjs tests/estado.test.mjs
git commit -m "feat: transiciones de estado atomicas con historial auditado" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: scripts/valida.mjs — lint de artefactos

**Files:**
- Create: `scripts/valida.mjs`
- Test: `tests/valida.test.mjs`

**Interfaces:**
- Consumes: `parseFrontmatter` (Task 2), `TRANSITIONS` (Task 5, para el vocabulario de estados).
- Produces: CLI `node scripts/valida.mjs [--dir docs]` (exit 1 si hay errores) y export `validate(docsDir) -> string[]` (lista de errores, vacía si todo ok). También `validateFile(ruta) -> string[]` para comprobar un solo artefacto (lo usa el hook `calidad.mjs`). Reglas: frontmatter parseable; `id` presente y coincidente con el nombre del fichero; `estado` en vocabulario; última entrada de `historial` coincide con `estado`; `epica` referenciada existe.

- [ ] **Step 1: Escribir los tests que fallan**

`tests/valida.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { validate, validateFile } from '../scripts/valida.mjs';

function docsTmp() {
  const docs = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  const ep = path.join(docs, 'epicas', 'EPIC-001-facturas');
  fs.mkdirSync(ep, { recursive: true });
  fs.writeFileSync(path.join(ep, '_epica.md'),
    '---\nid: EPIC-001\ntipo: epica\nestado: aprobada\nhistorial:\n  - {estado: borrador, fecha: 2026-07-01, por: sdd-producto}\n  - {estado: aprobada, fecha: 2026-07-02, por: Alberto}\n---\n# E\n');
  fs.writeFileSync(path.join(ep, 'SPEC-001-alta.md'),
    '---\nid: SPEC-001\ntipo: spec\nepica: EPIC-001\nestado: borrador\nhistorial:\n  - {estado: borrador, fecha: 2026-07-01, por: sdd-arquitecto}\n---\n# S\n');
  return { docs, ep };
}

test('docs válido devuelve cero errores', () => {
  const { docs } = docsTmp();
  assert.deepEqual(validate(docs), []);
});

test('detecta id que no coincide con el nombre del fichero', () => {
  const { docs, ep } = docsTmp();
  fs.writeFileSync(path.join(ep, 'SPEC-002-otra.md'),
    '---\nid: SPEC-009\ntipo: spec\nepica: EPIC-001\nestado: borrador\nhistorial:\n  - {estado: borrador, fecha: 2026-07-01, por: x}\n---\n');
  const errores = validate(docs);
  assert.equal(errores.length, 1);
  assert.match(errores[0], /SPEC-002-otra\.md/);
});

test('detecta estado fuera de vocabulario', () => {
  const { ep } = docsTmp();
  const f = path.join(ep, 'SPEC-003-mal.md');
  fs.writeFileSync(f, '---\nid: SPEC-003\ntipo: spec\nepica: EPIC-001\nestado: terminado\nhistorial:\n  - {estado: terminado, fecha: 2026-07-01, por: x}\n---\n');
  assert.match(validateFile(f).join(';'), /estado 'terminado' no válido/);
});

test('detecta historial desincronizado del estado', () => {
  const { ep } = docsTmp();
  const f = path.join(ep, 'SPEC-004-drift.md');
  fs.writeFileSync(f, '---\nid: SPEC-004\ntipo: spec\nepica: EPIC-001\nestado: aprobada\nhistorial:\n  - {estado: borrador, fecha: 2026-07-01, por: x}\n---\n');
  assert.match(validateFile(f).join(';'), /historial/);
});

test('detecta épica referenciada inexistente', () => {
  const { docs, ep } = docsTmp();
  fs.writeFileSync(path.join(ep, 'SPEC-005-huerfana.md'),
    '---\nid: SPEC-005\ntipo: spec\nepica: EPIC-099\nestado: borrador\nhistorial:\n  - {estado: borrador, fecha: 2026-07-01, por: x}\n---\n');
  assert.match(validate(docs).join(';'), /EPIC-099/);
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `node --test tests/valida.test.mjs`
Expected: FAIL — `Cannot find module '../scripts/valida.mjs'`

- [ ] **Step 3: Implementación mínima**

`scripts/valida.mjs`:
```js
#!/usr/bin/env node
// Lint de artefactos SDD: frontmatter, IDs, estados, historial y referencias.
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../lib/frontmatter.mjs';
import { TRANSITIONS } from './estado.mjs';

const ID_RE = /^(EPIC|SPEC|TASK|ADR)-(\d{3}|FIX|INFRA|MANT|MEJORA)/;
const ESTADOS = Object.keys(TRANSITIONS);

export function validateFile(ruta, docsDir) {
  const errores = [];
  const nombre = path.basename(ruta);
  const rel = docsDir ? path.relative(docsDir, ruta) : nombre;
  const { data } = parseFrontmatter(fs.readFileSync(ruta, 'utf8'));
  if (!data.id) return [`${rel}: sin frontmatter o sin 'id'`];
  if (data.tipo === 'ledger') return errores; // el ledger no lleva estado propio
  const enNombre = (nombre === '_epica.md')
    ? path.basename(path.dirname(ruta)).match(ID_RE)?.[0]
    : nombre.match(ID_RE)?.[0];
  if (enNombre && data.id !== enNombre) {
    errores.push(`${rel}: id '${data.id}' no coincide con el nombre del fichero ('${enNombre}')`);
  }
  if (!ESTADOS.includes(data.estado)) {
    errores.push(`${rel}: estado '${data.estado}' no válido (${ESTADOS.join(', ')})`);
  }
  const ultimo = data.historial?.at(-1);
  if (!ultimo || ultimo.estado !== data.estado) {
    errores.push(`${rel}: la última entrada de historial no coincide con estado '${data.estado}'. Usa scripts/estado.mjs para transicionar.`);
  }
  if (data.epica && docsDir) {
    const base = path.join(docsDir, 'epicas');
    const existe = fs.existsSync(base) && fs.readdirSync(base)
      .some((n) => n === data.epica || n.startsWith(data.epica + '-'));
    if (!existe) errores.push(`${rel}: referencia a épica inexistente '${data.epica}'`);
  }
  return errores;
}

export function validate(docsDir) {
  const errores = [];
  const stack = [docsDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name.endsWith('.md') && ID_RE.test(e.name.replace(/^_epica\.md$/, path.basename(dir)))) {
        if (e.name === '_epica.md' || ID_RE.test(e.name)) errores.push(...validateFile(p, docsDir));
      }
    }
  }
  return errores;
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  const dir = process.argv.includes('--dir') ? process.argv[process.argv.indexOf('--dir') + 1] : 'docs';
  const errores = validate(path.resolve(dir));
  if (errores.length) {
    console.error(`[valida] ${errores.length} error(es):\n` + errores.map((e) => ` - ${e}`).join('\n'));
    process.exit(1);
  }
  console.log('[valida] OK');
}
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

Run: `node --test tests/valida.test.mjs`
Expected: `pass 5`

- [ ] **Step 5: Commit**

```bash
git add scripts/valida.mjs tests/valida.test.mjs
git commit -m "feat: lint de frontmatters, IDs, estados y referencias" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: scripts/tablero.mjs — tablero regenerado desde frontmatters

**Files:**
- Create: `scripts/tablero.mjs`
- Test: `tests/tablero.test.mjs`

**Interfaces:**
- Consumes: `parseFrontmatter` (Task 2).
- Produces: CLI `node scripts/tablero.mjs [--dir docs]` que (re)escribe `docs/tablero.md`. Export `renderBoard(docsDir, fecha?) -> string` (markdown). El tablero es SIEMPRE derivado: cabecera con aviso "generado, no editar" (el hook `protege-verdad.mjs` bloquea su edición manual).

- [ ] **Step 1: Escribir los tests que fallan**

`tests/tablero.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { renderBoard } from '../scripts/tablero.mjs';

function docsTmp() {
  const docs = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  const ep = path.join(docs, 'epicas', 'EPIC-001-facturas');
  fs.mkdirSync(ep, { recursive: true });
  fs.writeFileSync(path.join(ep, '_epica.md'),
    '---\nid: EPIC-001\ntipo: epica\nestado: aprobada\nhistorial:\n  - {estado: aprobada, fecha: 2026-07-02, por: Alberto}\n---\n# EPIC-001 — Facturas\n');
  fs.writeFileSync(path.join(ep, 'SPEC-001-alta.md'),
    '---\nid: SPEC-001\ntipo: spec\nepica: EPIC-001\nestado: hecho\nhistorial:\n  - {estado: hecho, fecha: 2026-07-05, por: sdd-verificador}\n---\n# SPEC-001 — Alta\n');
  fs.writeFileSync(path.join(ep, 'SPEC-002-envio.md'),
    '---\nid: SPEC-002\ntipo: spec\nepica: EPIC-001\nestado: en-progreso\nhistorial:\n  - {estado: en-progreso, fecha: 2026-07-06, por: sdd-implementador}\n---\n# SPEC-002 — Envío\n');
  return docs;
}

test('el tablero lleva aviso de generado', () => {
  assert.match(renderBoard(docsTmp(), '2026-07-09'), /NO EDITAR A MANO/);
});

test('agrupa specs por épica con su estado', () => {
  const md = renderBoard(docsTmp(), '2026-07-09');
  assert.match(md, /## EPIC-001/);
  assert.match(md, /SPEC-001.*hecho/);
  assert.match(md, /SPEC-002.*en-progreso/);
});

test('resume el recuento por estado', () => {
  const md = renderBoard(docsTmp(), '2026-07-09');
  assert.match(md, /hecho: 1/);
  assert.match(md, /en-progreso: 1/);
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `node --test tests/tablero.test.mjs`
Expected: FAIL — `Cannot find module '../scripts/tablero.mjs'`

- [ ] **Step 3: Implementación mínima**

`scripts/tablero.mjs`:
```js
#!/usr/bin/env node
// Regenera docs/tablero.md desde los frontmatters. Único escritor autorizado
// del tablero; editarlo a mano lo bloquea el hook protege-verdad.
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../lib/frontmatter.mjs';

function leer(ruta) {
  return parseFrontmatter(fs.readFileSync(ruta, 'utf8')).data;
}

export function renderBoard(docsDir, fecha) {
  fecha ??= new Date().toISOString().slice(0, 10);
  const base = path.join(docsDir, 'epicas');
  const lineas = [
    '<!-- GENERADO por tremen-sdd (scripts/tablero.mjs). NO EDITAR A MANO. -->',
    `# Tablero`, '', `Actualizado: ${fecha}`, '',
  ];
  const recuento = {};
  for (const epDir of (fs.existsSync(base) ? fs.readdirSync(base).sort() : [])) {
    const dir = path.join(base, epDir);
    if (!fs.statSync(dir).isDirectory()) continue;
    const epica = fs.existsSync(path.join(dir, '_epica.md')) ? leer(path.join(dir, '_epica.md')) : { id: epDir, estado: '?' };
    lineas.push(`## ${epica.id} — ${epDir.replace(/^EPIC-[^-]+-?/, '') || epica.id} (${epica.estado})`, '');
    lineas.push('| Spec | Estado | Último cambio |', '|---|---|---|');
    for (const f of fs.readdirSync(dir).filter((n) => /^SPEC-.*\.md$/.test(n) && !n.endsWith('.ledger.md')).sort()) {
      const d = leer(path.join(dir, f));
      recuento[d.estado] = (recuento[d.estado] ?? 0) + 1;
      const ultimo = d.historial?.at(-1);
      lineas.push(`| ${d.id} — ${f.replace(/^SPEC-\d{3}-/, '').replace(/\.md$/, '')} | ${d.estado} | ${ultimo ? `${ultimo.fecha} (${ultimo.por})` : '—'} |`);
    }
    lineas.push('');
  }
  lineas.push('## Resumen', '', ...Object.entries(recuento).map(([e, n]) => `- ${e}: ${n}`), '');
  return lineas.join('\n');
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  const dir = path.resolve(process.argv.includes('--dir') ? process.argv[process.argv.indexOf('--dir') + 1] : 'docs');
  fs.writeFileSync(path.join(dir, 'tablero.md'), renderBoard(dir));
  console.log(`[tablero] regenerado ${path.join(dir, 'tablero.md')}`);
}
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

Run: `node --test tests/tablero.test.mjs`
Expected: `pass 3`

- [ ] **Step 5: Commit**

```bash
git add scripts/tablero.mjs tests/tablero.test.mjs
git commit -m "feat: tablero regenerable desde frontmatters" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: scripts/informe-qa.mjs — informe HTML de verificación

**Files:**
- Create: `scripts/informe-qa.mjs`
- Test: `tests/informe-qa.test.mjs`

**Interfaces:**
- Consumes: `parseFrontmatter` (Task 2); estructura ledger + `_qa/SPEC-NNN/` de Task 3.
- Produces: CLI `node scripts/informe-qa.mjs <ruta.ledger.md>` que escribe `_qa/<SPEC-ID>/informe.html` autocontenido (capturas PNG y vídeos webm embebidos en base64) y lo imprime. Export `renderReport(ledgerPath) -> { html: string, out: string }`. Lo invoca el rol sdd-verificador con `--informe`.

- [ ] **Step 1: Escribir los tests que fallan**

`tests/informe-qa.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { renderReport } from '../scripts/informe-qa.mjs';

const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  const ledger = path.join(dir, 'SPEC-001-alta.ledger.md');
  fs.writeFileSync(ledger, '---\nid: SPEC-001\ntipo: ledger\nepica: EPIC-001\n---\n# Ledger — SPEC-001\n\n## Veredicto del verificador\nGREEN (2026-07-09)\n');
  const qa = path.join(dir, '_qa', 'SPEC-001');
  fs.mkdirSync(qa, { recursive: true });
  fs.writeFileSync(path.join(qa, 'ca1-movil.png'), PNG_1PX);
  return ledger;
}

test('genera html autocontenido con la captura embebida', () => {
  const { html, out } = renderReport(fixture());
  assert.match(html, /<html/);
  assert.match(html, /data:image\/png;base64,/);
  assert.match(html, /ca1-movil/);
  assert.ok(out.endsWith(path.join('_qa', 'SPEC-001', 'informe.html')));
});

test('incluye el contenido del ledger (veredicto)', () => {
  const { html } = renderReport(fixture());
  assert.match(html, /GREEN \(2026-07-09\)/);
});

test('falla claro si no existe carpeta _qa', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  const ledger = path.join(dir, 'SPEC-002-x.ledger.md');
  fs.writeFileSync(ledger, '---\nid: SPEC-002\ntipo: ledger\n---\n# L\n');
  assert.throws(() => renderReport(ledger), /_qa/);
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `node --test tests/informe-qa.test.mjs`
Expected: FAIL — `Cannot find module '../scripts/informe-qa.mjs'`

- [ ] **Step 3: Implementación mínima**

`scripts/informe-qa.mjs`:
```js
#!/usr/bin/env node
// Ensambla el acta de verificación en HTML autocontenido (imágenes/vídeo en
// base64) a partir del ledger y de _qa/<SPEC-ID>/. Determinista: no usa LLM.
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../lib/frontmatter.mjs';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function renderReport(ledgerPath) {
  const raw = fs.readFileSync(ledgerPath, 'utf8');
  const { data, body } = parseFrontmatter(raw);
  const qaDir = path.join(path.dirname(ledgerPath), '_qa', data.id);
  if (!fs.existsSync(qaDir)) throw new Error(`No existe ${qaDir} (_qa/${data.id}). Ejecuta primero la verificación con capturas.`);
  const medios = fs.readdirSync(qaDir).filter((n) => /\.(png|webm)$/i.test(n)).sort().map((n) => {
    const b64 = fs.readFileSync(path.join(qaDir, n)).toString('base64');
    return n.endsWith('.webm')
      ? `<figure><video controls src="data:video/webm;base64,${b64}"></video><figcaption>${esc(n)}</figcaption></figure>`
      : `<figure><img src="data:image/png;base64,${b64}" alt="${esc(n)}"><figcaption>${esc(n)}</figcaption></figure>`;
  });
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Informe QA — ${esc(data.id)}</title>
<style>body{font:16px/1.5 system-ui;max-width:60rem;margin:2rem auto;padding:0 1rem}
figure{margin:1rem 0}img,video{max-width:100%;border:1px solid #ccc}
pre{background:#f6f6f6;padding:1rem;overflow-x:auto;white-space:pre-wrap}</style></head><body>
<h1>Informe de verificación — ${esc(data.id)}</h1>
<p>Generado por tremen-sdd (informe-qa.mjs). Épica: ${esc(data.epica ?? '—')}.</p>
<h2>Ledger</h2><pre>${esc(body)}</pre>
<h2>Evidencia (${medios.length})</h2>${medios.join('\n')}
</body></html>`;
  const out = path.join(qaDir, 'informe.html');
  return { html, out };
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  try {
    const { html, out } = renderReport(path.resolve(process.argv[2]));
    fs.writeFileSync(out, html);
    console.log(`[informe-qa] ${out}`);
  } catch (e) {
    console.error(`[informe-qa] ${e.message}`);
    process.exit(1);
  }
}
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

Run: `node --test tests/informe-qa.test.mjs`
Expected: `pass 3`

- [ ] **Step 5: Commit**

```bash
git add scripts/informe-qa.mjs tests/informe-qa.test.mjs
git commit -m "feat: acta de verificacion HTML autocontenida desde ledger y capturas" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: hooks/_comun.mjs + hooks/require-spec.mjs + hooks.json

**Files:**
- Create: `hooks/_comun.mjs`
- Create: `hooks/require-spec.mjs`
- Create: `hooks/hooks.json`
- Test: `tests/require-spec.test.mjs`

**Interfaces:**
- Consumes: `parseFrontmatter` (Task 2).
- Produces: `_comun.mjs` exporta `readPayload() -> object` (stdin JSON), `readConfig(cwd) -> object|null` (`.sdd.json`), `deny(reason) -> never` (imprime JSON PreToolUse deny y exit 0) y `allow() -> never` (exit 0 sin output). `require-spec.mjs` es ejecutable por hook. `hooks.json` registra los tres hooks del plugin (los de Tasks 10-11 ya quedan referenciados aquí). Contrato de comportamiento: **fail-open** — sin `.sdd.json`, sin git, o ante cualquier excepción, permite.

- [ ] **Step 1: Escribir los tests que fallan**

`tests/require-spec.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync, execSync } from 'node:child_process';

const HOOK = path.resolve('hooks/require-spec.mjs');

function proyecto({ rama, estadoSpec } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  execSync('git init -b main', { cwd: dir });
  fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify({
    idioma: 'es', rutasVigiladas: ['src/'], linter: 'none',
    gates: { requireSpec: true, protegeVerdad: true, calidad: true },
  }));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  if (estadoSpec) {
    const ep = path.join(dir, 'docs', 'epicas', 'EPIC-001-x');
    fs.mkdirSync(ep, { recursive: true });
    fs.writeFileSync(path.join(ep, 'SPEC-001-alta.md'),
      `---\nid: SPEC-001\ntipo: spec\nepica: EPIC-001\nestado: ${estadoSpec}\nhistorial:\n  - {estado: ${estadoSpec}, fecha: 2026-07-01, por: x}\n---\n`);
  }
  fs.writeFileSync(path.join(dir, 'a.txt'), 'x');
  execSync('git add -A && git -c user.email=t@t -c user.name=t commit -m x', { cwd: dir, shell: true });
  if (rama) execSync(`git checkout -b ${rama}`, { cwd: dir });
  return dir;
}

function corre(cwd, filePath, env = {}) {
  const payload = JSON.stringify({ cwd, tool_name: 'Edit', tool_input: { file_path: filePath } });
  const r = spawnSync('node', [HOOK], { input: payload, encoding: 'utf8', env: { ...process.env, ...env } });
  return { code: r.status, out: r.stdout.trim() };
}

test('deniega edición en src/ desde main', () => {
  const dir = proyecto();
  const { out } = corre(dir, path.join(dir, 'src', 'app.ts'));
  const j = JSON.parse(out);
  assert.equal(j.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /sdd-arquitecto/);
});

test('permite con rama ft/SPEC-001-* y spec aprobada', () => {
  const dir = proyecto({ rama: 'ft/SPEC-001-alta', estadoSpec: 'aprobada' });
  assert.equal(corre(dir, path.join(dir, 'src', 'app.ts')).out, '');
});

test('deniega si la spec está en borrador', () => {
  const dir = proyecto({ rama: 'ft/SPEC-001-alta', estadoSpec: 'borrador' });
  assert.match(corre(dir, path.join(dir, 'src', 'app.ts')).out, /borrador/);
});

test('permite ficheros fuera de rutasVigiladas', () => {
  const dir = proyecto();
  assert.equal(corre(dir, path.join(dir, 'docs', 'notas.md')).out, '');
});

test('fail-open: sin .sdd.json permite', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  assert.equal(corre(dir, path.join(dir, 'src', 'app.ts')).out, '');
});

test('la válvula SDD_SKIP_GATE=1 permite', () => {
  const dir = proyecto();
  assert.equal(corre(dir, path.join(dir, 'src', 'app.ts'), { SDD_SKIP_GATE: '1' }).out, '');
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `node --test tests/require-spec.test.mjs`
Expected: FAIL — hook inexistente (spawn devuelve error / asserts fallan)

- [ ] **Step 3: Implementación mínima**

`hooks/_comun.mjs`:
```js
import fs from 'node:fs';
import path from 'node:path';

export function readPayload() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}

export function readConfig(cwd) {
  try { return JSON.parse(fs.readFileSync(path.join(cwd, '.sdd.json'), 'utf8')); } catch { return null; }
}

export function deny(reason) {
  console.log(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }));
  process.exit(0);
}

export function allow() { process.exit(0); }
```

`hooks/require-spec.mjs`:
```js
#!/usr/bin/env node
// Gate PreToolUse: no se edita código vigilado sin rama ft/SPEC-NNN-slug y
// spec en 'aprobada' o 'en-progreso'. FAIL-OPEN: ante cualquier duda, permite.
// Válvula de escape: SDD_SKIP_GATE=1 (la reporta /sdd-como-vamos).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { readPayload, readConfig, deny, allow } from './_comun.mjs';
import { parseFrontmatter } from '../lib/frontmatter.mjs';

try {
  if (process.env.SDD_SKIP_GATE === '1') allow();
  const payload = readPayload();
  const cwd = payload.cwd || process.cwd();
  const cfg = readConfig(cwd);
  if (!cfg || cfg.gates?.requireSpec === false) allow();
  const fichero = payload.tool_input?.file_path ?? '';
  const rel = path.relative(cwd, fichero).replaceAll('\\', '/');
  if (rel.startsWith('..') || !(cfg.rutasVigiladas ?? []).some((r) => rel.startsWith(r))) allow();
  const rama = execSync('git rev-parse --abbrev-ref HEAD', { cwd, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
  const m = rama.match(/^ft\/(SPEC-\d{3})-/);
  if (!m) deny(`La rama '${rama}' no es una rama de spec (ft/SPEC-NNN-slug). Crea o aprueba la spec con /sdd-arquitecto y trabaja en su rama.`);
  const spec = buscarSpec(cwd, m[1]);
  if (!spec) deny(`No existe ${m[1]} bajo docs/epicas/. Créala con /sdd-arquitecto.`);
  const { data } = parseFrontmatter(fs.readFileSync(spec, 'utf8'));
  if (!['aprobada', 'en-progreso'].includes(data.estado)) {
    deny(`${m[1]} está en estado '${data.estado}'; para codear necesita 'aprobada' o 'en-progreso'. Pide la aprobación humana o transiciona con scripts/estado.mjs.`);
  }
  allow();
} catch { allow(); } // fail-open

function buscarSpec(cwd, id) {
  const base = path.join(cwd, 'docs', 'epicas');
  if (!fs.existsSync(base)) return null;
  for (const ep of fs.readdirSync(base)) {
    const dir = path.join(base, ep);
    if (!fs.statSync(dir).isDirectory()) continue;
    const f = fs.readdirSync(dir).find((n) => n.startsWith(id + '-') && n.endsWith('.md') && !n.endsWith('.ledger.md'));
    if (f) return path.join(dir, f);
  }
  return null;
}
```

`hooks/hooks.json`:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          { "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/require-spec.mjs\"" },
          { "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/protege-verdad.mjs\"" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          { "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/calidad.mjs\"" }
        ]
      }
    ]
  }
}
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

Run: `node --test tests/require-spec.test.mjs`
Expected: `pass 6`

- [ ] **Step 5: Commit**

```bash
git add hooks/_comun.mjs hooks/require-spec.mjs hooks/hooks.json tests/require-spec.test.mjs
git commit -m "feat: hook require-spec fail-open con valvula de escape" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: hooks/protege-verdad.mjs — docs canónicos con dueño único

**Files:**
- Create: `hooks/protege-verdad.mjs`
- Test: `tests/protege-verdad.test.mjs`

**Interfaces:**
- Consumes: `readPayload`, `readConfig`, `deny`, `allow` de `hooks/_comun.mjs` (Task 9).
- Produces: hook PreToolUse. Reglas: `docs/tablero.md` se deniega SIEMPRE (solo lo escribe `tablero.mjs`, que al usar `fs` directo no pasa por hooks); `FOUNDATION.md` y `docs/fundacion/*` solo los escriben `main`, `sdd-arquitecto` o `sdd-producto` (rol leído de `payload.agent_type ?? payload.agent_name ?? 'main'`). Fail-open ante errores; respeta `gates.protegeVerdad === false` y `SDD_SKIP_GATE=1`.

- [ ] **Step 1: Escribir los tests que fallan**

`tests/protege-verdad.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const HOOK = path.resolve('hooks/protege-verdad.mjs');

function proyecto() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify({
    idioma: 'es', rutasVigiladas: ['src/'], linter: 'none',
    gates: { requireSpec: true, protegeVerdad: true, calidad: true },
  }));
  return dir;
}

function corre(cwd, filePath, agentType) {
  const payload = JSON.stringify({ cwd, tool_name: 'Edit', agent_type: agentType, tool_input: { file_path: filePath } });
  return spawnSync('node', [HOOK], { input: payload, encoding: 'utf8' }).stdout.trim();
}

test('deniega tablero.md a cualquiera', () => {
  const dir = proyecto();
  assert.match(corre(dir, path.join(dir, 'docs', 'tablero.md'), 'main'), /deny/);
});

test('deniega FOUNDATION.md a un rol no dueño', () => {
  const dir = proyecto();
  const out = corre(dir, path.join(dir, 'FOUNDATION.md'), 'sdd-implementador');
  assert.match(out, /deny/);
  assert.match(out, /propón/i);
});

test('permite FOUNDATION.md a sdd-arquitecto y a main', () => {
  const dir = proyecto();
  assert.equal(corre(dir, path.join(dir, 'FOUNDATION.md'), 'sdd-arquitecto'), '');
  assert.equal(corre(dir, path.join(dir, 'FOUNDATION.md'), undefined), '');
});

test('deniega docs/fundacion/* a rol no dueño y permite a sdd-producto', () => {
  const dir = proyecto();
  const f = path.join(dir, 'docs', 'fundacion', 'vision.md');
  assert.match(corre(dir, f, 'sdd-verificador'), /deny/);
  assert.equal(corre(dir, f, 'sdd-producto'), '');
});

test('fail-open sin .sdd.json', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  assert.equal(corre(dir, path.join(dir, 'docs', 'tablero.md'), 'main'), '');
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `node --test tests/protege-verdad.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implementación mínima**

`hooks/protege-verdad.mjs`:
```js
#!/usr/bin/env node
// Los documentos de verdad tienen dueño único. Los demás roles PROPONEN el
// cambio en su informe; no lo escriben. El tablero solo lo escribe su script.
import path from 'node:path';
import { readPayload, readConfig, deny, allow } from './_comun.mjs';

const DUENOS_FUNDACION = ['main', 'sdd-arquitecto', 'sdd-producto'];

try {
  if (process.env.SDD_SKIP_GATE === '1') allow();
  const payload = readPayload();
  const cwd = payload.cwd || process.cwd();
  const cfg = readConfig(cwd);
  if (!cfg || cfg.gates?.protegeVerdad === false) allow();
  const rel = path.relative(cwd, payload.tool_input?.file_path ?? '').replaceAll('\\', '/');
  const rol = payload.agent_type ?? payload.agent_name ?? 'main';
  if (rel === 'docs/tablero.md') {
    deny('docs/tablero.md es GENERADO: regenéralo con /sdd-tablero (scripts/tablero.mjs); no se edita a mano.');
  }
  const esVerdad = rel === 'FOUNDATION.md' || rel.startsWith('docs/fundacion/');
  if (esVerdad && !DUENOS_FUNDACION.includes(rol)) {
    deny(`'${rel}' es un documento de verdad (dueños: sdd-arquitecto, sdd-producto). Propón el cambio en tu informe en vez de escribirlo.`);
  }
  allow();
} catch { allow(); }
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

Run: `node --test tests/protege-verdad.test.mjs`
Expected: `pass 5`

- [ ] **Step 5: Commit**

```bash
git add hooks/protege-verdad.mjs tests/protege-verdad.test.mjs
git commit -m "feat: hook protege-verdad con dueno unico por documento" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: hooks/calidad.mjs — feedback de linter y coherencia de estado

**Files:**
- Create: `hooks/calidad.mjs`
- Test: `tests/calidad.test.mjs`

**Interfaces:**
- Consumes: `readPayload`, `readConfig` (Task 9); `validateFile` de `scripts/valida.mjs` (Task 6).
- Produces: hook PostToolUse. Comportamiento: (a) si el fichero editado es un artefacto SDD (`SPEC-*.md`, `EPIC` `_epica.md`, `TASK-*.md`, `ADR-*.md`), ejecuta `validateFile` y ante errores escribe en stderr y sale con **exit 2** (feedback accionable a Claude); (b) si es código, autodetecta linter (`.py`→`ruff check`, `.js/.jsx/.ts/.tsx/.mjs`→`npx eslint` si hay config, `.dart`→`dart analyze`; override con `cfg.linter`: `ruff|eslint|dart|none|auto`) y ante fallo sale con exit 2 con la salida del linter; linter ausente → exit 0. Fail-open general.

- [ ] **Step 1: Escribir los tests que fallan**

`tests/calidad.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const HOOK = path.resolve('hooks/calidad.mjs');

function proyecto(linter = 'none') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  fs.writeFileSync(path.join(dir, '.sdd.json'), JSON.stringify({
    idioma: 'es', rutasVigiladas: ['src/'], linter,
    gates: { requireSpec: true, protegeVerdad: true, calidad: true },
  }));
  return dir;
}

function corre(cwd, filePath) {
  const payload = JSON.stringify({ cwd, tool_name: 'Edit', tool_input: { file_path: filePath } });
  const r = spawnSync('node', [HOOK], { input: payload, encoding: 'utf8' });
  return { code: r.status, err: r.stderr };
}

test('spec con estado/historial desincronizados -> exit 2 con mensaje', () => {
  const dir = proyecto();
  const ep = path.join(dir, 'docs', 'epicas', 'EPIC-001-x');
  fs.mkdirSync(ep, { recursive: true });
  const f = path.join(ep, 'SPEC-001-mal.md');
  fs.writeFileSync(f, '---\nid: SPEC-001\ntipo: spec\nepica: EPIC-001\nestado: aprobada\nhistorial:\n  - {estado: borrador, fecha: 2026-07-01, por: x}\n---\n');
  const { code, err } = corre(dir, f);
  assert.equal(code, 2);
  assert.match(err, /historial/);
});

test('spec coherente -> exit 0', () => {
  const dir = proyecto();
  const ep = path.join(dir, 'docs', 'epicas', 'EPIC-001-x');
  fs.mkdirSync(ep, { recursive: true });
  const f = path.join(ep, 'SPEC-001-bien.md');
  fs.writeFileSync(f, '---\nid: SPEC-001\ntipo: spec\nepica: EPIC-001\nestado: borrador\nhistorial:\n  - {estado: borrador, fecha: 2026-07-01, por: x}\n---\n');
  assert.equal(corre(dir, f).code, 0);
});

test('código con linter none -> exit 0', () => {
  const dir = proyecto('none');
  const f = path.join(dir, 'src', 'app.py');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, 'x=1\n');
  assert.equal(corre(dir, f).code, 0);
});

test('fail-open sin .sdd.json -> exit 0', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  const f = path.join(dir, 'a.py');
  fs.writeFileSync(f, 'x=1\n');
  assert.equal(corre(dir, f).code, 0);
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `node --test tests/calidad.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implementación mínima**

`hooks/calidad.mjs`:
```js
#!/usr/bin/env node
// PostToolUse: exit 2 devuelve el problema a Claude como feedback accionable.
// (a) artefactos SDD: coherencia frontmatter/estado/historial (valida.mjs).
// (b) código: linter del proyecto (autodetección u override en .sdd.json).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readPayload, readConfig } from './_comun.mjs';
import { validateFile } from '../scripts/valida.mjs';

const ES_ARTEFACTO = /(^|[\\/])((SPEC|TASK|ADR)-[^\\/]+\.md|_epica\.md)$/;

try {
  const payload = readPayload();
  const cwd = payload.cwd || process.cwd();
  const cfg = readConfig(cwd);
  if (!cfg || cfg.gates?.calidad === false) process.exit(0);
  const fichero = payload.tool_input?.file_path ?? '';
  if (!fichero || !fs.existsSync(fichero)) process.exit(0);

  if (ES_ARTEFACTO.test(fichero) && !fichero.endsWith('.ledger.md')) {
    const errores = validateFile(fichero, path.join(cwd, 'docs'));
    if (errores.length) {
      console.error(`[sdd-calidad] Artefacto inconsistente:\n` + errores.map((e) => ` - ${e}`).join('\n'));
      process.exit(2);
    }
    process.exit(0);
  }

  const ext = path.extname(fichero);
  const linter = cfg.linter === 'auto' || !cfg.linter ? autodetecta(ext) : cfg.linter;
  const cmd = comando(linter, fichero);
  if (!cmd) process.exit(0);
  const r = spawnSync(cmd[0], cmd.slice(1), { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.error || r.status === null) process.exit(0); // linter no instalado: fail-open
  if (r.status !== 0) {
    console.error(`[sdd-calidad] ${linter} encontró problemas:\n${r.stdout}${r.stderr}`);
    process.exit(2);
  }
  process.exit(0);
} catch { process.exit(0); }

function autodetecta(ext) {
  if (ext === '.py') return 'ruff';
  if (['.js', '.jsx', '.ts', '.tsx', '.mjs'].includes(ext)) return 'eslint';
  if (ext === '.dart') return 'dart';
  return 'none';
}

function comando(linter, fichero) {
  if (linter === 'ruff') return ['ruff', 'check', fichero];
  if (linter === 'eslint') return ['npx', 'eslint', fichero];
  if (linter === 'dart') return ['dart', 'analyze', fichero];
  return null;
}
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

Run: `node --test tests/calidad.test.mjs`
Expected: `pass 4`

- [ ] **Step 5: Ejecutar TODA la suite y commit**

Run: `node --test tests/`
Expected: todos los tests de Tasks 2-11 en verde.

```bash
git add hooks/calidad.mjs tests/calidad.test.mjs
git commit -m "feat: hook calidad con linter autodetectado y coherencia de artefactos" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 12: Plantillas de proyecto (lo que estampa /sdd-init)

**Files:**
- Create: `templates/FOUNDATION.md`
- Create: `templates/CLAUDE.md`
- Create: `templates/sdd.json` (se estampa como `.sdd.json`)
- Create: `templates/roadmap.md`
- Create: `templates/rol-dominio.md`
- Create: `templates/fundacion/vision.md`
- Create: `templates/fundacion/dominio.md`
- Create: `templates/fundacion/reglas.md`
- Create: `templates/fundacion/contexto.md`

**Interfaces:**
- Consumes: convención de placeholders de Task 3 (`{{PROYECTO}}`, `{{FECHA}}`, `{{DOMINIO}}` — el comando `/sdd-init` los rellena).
- Produces: el kit completo que `/sdd-init` (Task 16) copia a un proyecto.

- [ ] **Step 1: Escribir las nueve plantillas**

`templates/FOUNDATION.md`:
```markdown
# FOUNDATION — {{PROYECTO}}

> Constitución del proyecto. Las decisiones D-N están **locked**: solo un ADR
> aceptado puede reinterpretarlas o supersederlas. Dueños: sdd-arquitecto y
> sdd-producto (hook protege-verdad).

- Creado: {{FECHA}}
- Dominio: {{DOMINIO}}

## Decisiones locked
<!-- Una por línea, numeradas y datadas. Ej.: -->
- **D-1** ({{FECHA}}): <!-- decisión fundacional 1 -->

## Alcance
- Dentro:
- Fuera:

## No-negociables
<!-- Seguridad, cumplimiento, invariantes del dominio. -->

## Cómo se trabaja aquí
Este proyecto sigue el estándar **tremen-sdd**: nada se implementa sin una
SPEC aprobada; las decisiones técnicas se registran como ADR inmutables; la
evidencia de verificación vive en el ledger de cada spec. Roles: /sdd-orquestador
(entrada), /sdd-producto, /sdd-arquitecto, /sdd-implementador, /sdd-verificador,
/sdd-documentalista, /sdd-como-vamos.
```

`templates/CLAUDE.md`:
```markdown
# {{PROYECTO}}

Proyecto gestionado con el estándar **tremen-sdd**. Antes de trabajar:

1. Lee `FOUNDATION.md` (constitución; decisiones locked).
2. Lee `docs/fundacion/contexto.md` (contexto maestro del proyecto).
3. Todo trabajo entra por `/sdd-orquestador`; nada se codea sin SPEC aprobada.
4. El estado vive en el frontmatter de cada spec; el tablero (`docs/tablero.md`)
   es generado — regenéralo con `/sdd-tablero`, nunca lo edites.

Idioma de trabajo: español (docs/specs). Código e identificadores: inglés.
Los términos de dominio de `docs/fundacion/dominio.md` no se traducen.
```

`templates/sdd.json`:
```json
{
  "idioma": "es",
  "rutasVigiladas": ["src/", "lib/"],
  "linter": "auto",
  "gates": { "requireSpec": true, "protegeVerdad": true, "calidad": true }
}
```

`templates/roadmap.md`:
```markdown
---
tipo: roadmap
---
# Roadmap — {{PROYECTO}}

> Curado por sdd-producto. Secuencia de épicas, horizonte y criterios de corte.
> El estado fino por spec vive en el tablero; aquí vive la INTENCIÓN.

## Ahora (en curso)

## Después (comprometido, sin empezar)

## Más adelante (idea, sin compromiso)

## Criterios de corte
<!-- Qué haría subir o bajar una épica de sección. -->
```

`templates/rol-dominio.md`:
```markdown
---
name: sdd-{{SLUG}}
description: >
  Autoridad de dominio de {{DOMINIO}} para {{PROYECTO}}. Consúltala cuando una
  spec, diseño o implementación toque {{DOMINIO}}: confirma corrección, cita
  fuentes y avisa de cualquier cambio que rompa un invariante. Advisory:
  guarda el modelo, no implementa. (Triggers: "{{DOMINIO}}", "es esto correcto",
  "revisa esta regla".)
---
# Rol de dominio — {{TITULO}}

## Misión
Guardar los invariantes de {{DOMINIO}} definidos en `docs/fundacion/dominio.md`
y `docs/fundacion/reglas.md`.

## Reglas duras
- NUNCA inventes datos del dominio: cita la fuente (documento, normativa, RN-xx).
- Si la fuente puede haber cambiado (normativa, APIs externas), búscala online antes de concluir.
- Avisas y propones; NO implementas ni editas specs (eso es de sdd-arquitecto).
- Deja constancia escrita de cada dictamen en la spec o ledger correspondiente (sección de notas).

## Salidas
- Dictamen: correcto / incorrecto / dudoso, con evidencia y fuente.
- Lista de invariantes afectados y specs que habría que revisar.
```

`templates/fundacion/vision.md`:
```markdown
# Visión — {{PROYECTO}}

## El problema

## Para quién

## La promesa
<!-- Qué será verdad cuando esto funcione. Métricas norte si las hay. -->

## Qué NO es este producto
```

`templates/fundacion/dominio.md`:
```markdown
# Dominio y lenguaje ubicuo — {{PROYECTO}}

> Glosario canónico. Estos términos NO se traducen ni se anglicizan en código,
> UI ni documentación. Si un término falta, se añade aquí antes de usarse.

| Término | Definición | Notas |
|---|---|---|
```

`templates/fundacion/reglas.md`:
```markdown
# Reglas de negocio — {{PROYECTO}}

> Numeradas y estables: las specs y ADRs las citan como RN-xx. No se borran;
> se marcan derogadas con fecha y motivo.

- **RN-01**: <!-- primera regla de negocio -->
```

`templates/fundacion/contexto.md`:
```markdown
# Contexto maestro — {{PROYECTO}}

> Documento vivo: TODO lo que un agente (o una persona) necesita para situarse.
> Se actualiza al cambiar el rumbo; la historia fina vive en ADRs y specs.

## Qué es y en qué punto está

## Stack y arquitectura (resumen as-built)

## Decisiones clave hasta hoy
<!-- Referencias a ADR-NNN, no duplicar su contenido. -->

## Riesgos y preguntas abiertas
```

- [ ] **Step 2: Verificación**

Run: `node -e "const fs=require('fs');['FOUNDATION.md','CLAUDE.md','sdd.json','roadmap.md','rol-dominio.md','fundacion/vision.md','fundacion/dominio.md','fundacion/reglas.md','fundacion/contexto.md'].forEach(f=>{const t=fs.readFileSync('templates/'+f,'utf8');if(!t.length)throw f});JSON.parse(fs.readFileSync('templates/sdd.json','utf8'));console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add templates
git commit -m "feat: plantillas de proyecto para /sdd-init (foundation, fundacion, roadmap, rol de dominio)" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 13: roles/es/ — orquestador, producto, arquitecto

**Files:**
- Create: `roles/es/sdd-orquestador.md`
- Create: `roles/es/sdd-producto.md`
- Create: `roles/es/sdd-arquitecto.md`

**Interfaces:**
- Consumes: scripts de Tasks 4-7 (los roles los invocan por ruta `${CLAUDE_PLUGIN_ROOT}/scripts/…`); máquina de estados de Task 5; plantillas de Task 3.
- Produces: definiciones de rol que los wrappers de Task 15 cargan. Contrato común a TODOS los roles (repetido en cada fichero): comunicación solo por artefactos; el subagente devuelve un informe final, no el razonamiento; la numeración y las transiciones de estado se hacen con scripts, nunca a mano.

- [ ] **Step 1: Escribir los tres roles**

`roles/es/sdd-orquestador.md`:
```markdown
# Rol: sdd-orquestador — entrada y conducción del pipeline

## Misión
Eres la puerta de entrada de TODO trabajo. Clasificas la petición, localizas
(o encargas) su spec y conduces el pipeline haciendo cumplir los gates. No
produces artefactos: coordinas a los demás roles como subagentes.

## Flujo
1. Clasifica la petición: ¿feature nueva (épica/spec), bug (EPIC-FIX), infra
   (EPIC-INFRA), mantenimiento (EPIC-MANT), mejora (EPIC-MEJORA)?
2. Busca la spec que gobierna el trabajo (`docs/epicas/`). Si no existe:
   - intención difusa → delega en sdd-producto (épica),
   - alcance claro → delega en sdd-arquitecto (spec).
3. GATE HUMANO: una spec pasa de `borrador` a `aprobada` SOLO cuando el humano
   lo dice explícitamente. Preséntale la spec y espera. Registra la transición
   con `node "${CLAUDE_PLUGIN_ROOT}/scripts/estado.mjs" <spec> aprobada --por <humano>`.
4. Con spec aprobada: crea la rama `ft/SPEC-NNN-slug` y delega en
   sdd-implementador (subagente).
5. Al terminar la implementación, delega en sdd-verificador (subagente).
   - RED → devuelve los findings a sdd-implementador. MÁXIMO 3 iteraciones;
     a la tercera en rojo, PARA y escala al humano con el ledger como resumen.
   - GREEN → transiciona la spec a `hecho`, delega el cierre en
     sdd-documentalista, haz push y abre el PR.
6. El PR lleva: checklist de CA copiada de la spec, enlace al ledger, footer
   `Refs: SPEC-NNN`. EL MERGE ES SIEMPRE HUMANO. Tu trabajo termina en el PR.

## Reglas duras
- Nada se codea sin spec en `aprobada`/`en-progreso` (el hook require-spec es
  la red; tú eres la primera línea).
- Cada rol corre como SUBAGENTE con contexto aislado y devuelve solo su informe.
  La comunicación entre roles va por artefactos (spec, ledger), nunca por contexto.
- No edites specs, código ni documentos de verdad: eso es de sus dueños.
- Los estados se cambian SOLO con scripts/estado.mjs (deja historial).
```

`roles/es/sdd-producto.md`:
```markdown
# Rol: sdd-producto — product owner y guardián del roadmap

## Misión
Dueño de la intención: visión, prioridad y roadmap. Conviertes ideas difusas
en épicas con criterios de éxito medibles. Custodias `docs/fundacion/vision.md`
y `docs/roadmap.md`.

## Flujo
1. Ante una intención nueva: pregunta hasta entender problema, para quién y
   cómo se mide el éxito (una pregunta por mensaje; propone opciones).
2. Crea la épica con
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.mjs" epica "<título>"`
   y redacta objetivo, criterios de éxito, alcance dentro/fuera y riesgos.
3. Coloca la épica en `docs/roadmap.md` (Ahora/Después/Más adelante) y explica
   el porqué de la posición.
4. El desglose en specs es de sdd-arquitecto; puedes proponer una tabla
   orientativa, no autorarla.

## Reglas duras
- "Fuera de alcance" se escribe SIEMPRE: aparcado a propósito, no por descuido.
- No tomas decisiones técnicas (stack, datos): eso es ADR de sdd-arquitecto.
- No inventes datos de negocio: cita fuentes o márcalo como hipótesis a validar.
- Escribes solo en: docs/fundacion/vision.md, docs/roadmap.md y épicas.
```

`roles/es/sdd-arquitecto.md`:
```markdown
# Rol: sdd-arquitecto — specs y decisiones

## Misión
Única autora de SPECs y ADRs. Conviertes una épica (o petición concreta) en
specs implementables y testables, y registras cada decisión técnica no trivial
como ADR inmutable. Dueño (con sdd-producto) de FOUNDATION.md y docs/fundacion/.

## Flujo
1. Lee FOUNDATION.md, docs/fundacion/ y los ADR existentes ANTES de decidir.
2. Crea la spec:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.mjs" spec "<título>" --epica EPIC-NNN`
   Rellena: problema, roles afectados, CA en Given/When/Then (cada CA
   verificable con un test), entidades y RN-xx citadas, fuera de alcance,
   notas para el gate humano.
3. Toda decisión que constriña trabajo futuro (stack, datos, fronteras,
   integraciones) → ADR:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.mjs" adr "<título>"`
   con contexto, decisión, consecuencias y alternativas rechazadas con motivo.
   En `Deciders` registra quién propone y quién aprueba, con matices.
4. Presenta spec y ADRs al humano vía el orquestador. NO los apruebes tú.

## Reglas duras
- Las specs REFERENCIAN las fuentes de verdad (dominio.md, reglas.md, ADRs),
  no las duplican.
- Un ADR aceptado es INMUTABLE: para cambiarlo, escribe otro que lo supersede.
- No implementas: ni código, ni tests. Diseñas y especificas.
- CA sin forma verificable = spec incompleta. Reescríbela.
```

- [ ] **Step 2: Verificación**

Run: `node -e "const fs=require('fs');['sdd-orquestador','sdd-producto','sdd-arquitecto'].forEach(r=>{const t=fs.readFileSync('roles/es/'+r+'.md','utf8');if(!/## Misión/.test(t)||!/## Reglas duras/.test(t))throw r});console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add roles/es
git commit -m "feat: roles orquestador, producto y arquitecto" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 14: roles/es/ — implementador, verificador, documentalista, como-vamos

**Files:**
- Create: `roles/es/sdd-implementador.md`
- Create: `roles/es/sdd-verificador.md`
- Create: `roles/es/sdd-documentalista.md`
- Create: `roles/es/sdd-como-vamos.md`

**Interfaces:**
- Consumes: scripts (Tasks 4-8), ledger (Task 3), máquina de estados (Task 5).
- Produces: los cuatro roles restantes que cargan los wrappers de Task 15.

- [ ] **Step 1: Escribir los cuatro roles**

`roles/es/sdd-implementador.md`:
```markdown
# Rol: sdd-implementador — código contra spec

## Misión
Implementas los criterios de aceptación de UNA spec aprobada, y nada más allá
de ellos. Cada CA lleva su test. Mantienes tu mitad del ledger.

## Flujo
1. Lee la spec, su épica, los ADR citados y FOUNDATION.md. Si algo contradice
   la spec, PARA y repórtalo al orquestador (no lo "arregles" por tu cuenta).
2. Verifica que estás en la rama `ft/SPEC-NNN-slug`. Transiciona a en-progreso:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/estado.mjs" <spec> en-progreso --por sdd-implementador`
3. Trabaja CA a CA con TDD (usa la skill test-driven-development si está
   disponible): test que falla → mínimo código → verde → commit.
4. Tras cada CA, actualiza TU mitad del ledger: columnas
   `Implementado (fichero)` y `Test (fichero/caso)`.
5. Commits Conventional Commits en la rama, footer `Refs: SPEC-NNN`.
6. Al terminar: transiciona a `en-revision`, rellena "Cómo retomar (handoff)"
   del ledger y devuelve un informe corto (qué CA cubriste, con qué ficheros).

## Reglas duras
- PROHIBIDO: tocar las columnas Verif./Estado del ledger, marcar la spec como
  hecho, hacer push/PR/merge, editar la spec o documentos de verdad.
- Nada fuera de los CA: si descubres trabajo necesario no especificado,
  anótalo en "Salvedades / follow-ups" del ledger (F-SPEC-NNN-x) y sigue.
- Un CA sin test no está implementado.
```

`roles/es/sdd-verificador.md`:
```markdown
# Rol: sdd-verificador — gate adversarial

## Misión
Juez independiente. POR DEFECTO ASUMES QUE NINGÚN CA ESTÁ CUMPLIDO y buscas
la evidencia que te obligue a cambiar de opinión. Si dudas, DEVUELVES.
No editas código JAMÁS: observas, ejecutas y juzgas.

## Flujo
1. Lee la spec (los CA son tu contrato) y el ledger. NO leas el razonamiento
   del implementador: solo artefactos.
2. Gates automáticos: tests completos del proyecto (vigila regresiones), lint,
   typecheck. Cualquier fallo = RED inmediato.
3. Por cada CA: localiza el test que lo demuestra y comprueba que no es un
   test vacío. Ejecuta el flujo real cuando aplique.
4. UI: verifica con Playwright (MCP) en los viewports del proyecto; captura
   evidencia en `_qa/SPEC-NNN/` (PNG por CA; vídeo si aporta). Comprueba que
   el DOM respeta el lenguaje ubicuo de docs/fundacion/dominio.md.
5. Rellena TU mitad del ledger (columnas Verif. y Estado por CA, sección
   "Veredicto del verificador") y el mapa de evidencia visual.
6. Veredicto: GREEN (todos los CA ✅ o ⚠️ justificada y aceptada) o RED (lista
   de findings accionables). Con `--informe`, genera el acta HTML:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/informe-qa.mjs" <ledger>`
7. Si GREEN, transiciona tú la spec:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/estado.mjs" <spec> hecho --por sdd-verificador`
   Si RED: `... en-progreso --por sdd-verificador` y devuelve los findings.

## Reglas duras
- Sin permiso de escritura sobre código, specs ni documentos de verdad.
- Un CA está ✅ solo con Implementado + Test + Verif. en verde. Salvedad = ⚠️,
  nunca ✅. "Casi" = RED.
- No arreglas nada: el que juzga no repara.
```

`roles/es/sdd-documentalista.md`:
```markdown
# Rol: sdd-documentalista — cierre mecánico del ciclo

## Misión
Dejas la casa ordenada cuando una spec llega a `hecho`: coherencia entre
artefactos, tablero al día, drift detectado. Trabajo mecánico y barato
(tier haiku); el juicio es de otros.

## Flujo
1. Regenera el tablero: `node "${CLAUDE_PLUGIN_ROOT}/scripts/tablero.mjs"`.
2. Valida los artefactos: `node "${CLAUDE_PLUGIN_ROOT}/scripts/valida.mjs"`.
   Reporta los errores; los arreglos de contenido son de sus dueños.
3. Comprueba que la tabla de specs de `_epica.md` refleja los frontmatters;
   si la épica tiene todas sus specs en `hecho`, propone al orquestador
   transicionarla.
4. Detecta drift docs↔código a tu alcance (enlaces rotos, rutas movidas,
   contexto.md desactualizado) y lista lo encontrado como propuestas.

## Reglas duras
- No escribes en documentos de verdad ni en specs: PROPONES en tu informe.
- El tablero solo se toca vía script.
```

`roles/es/sdd-como-vamos.md`:
```markdown
# Rol: sdd-como-vamos — informe de estado (read-only)

## Misión
Responder "¿cómo vamos? / ¿qué queda?" leyendo SOLO el filesystem. No escribes
nada, no tocas git: lees y reportas.

## Flujo
1. Recorre `docs/epicas/` leyendo frontmatters (estados + historial) y ledgers.
2. Agrupa por accionabilidad:
   - **Esperando al humano**: specs en `borrador` maduras (gate de aprobación).
   - **En curso**: `en-progreso` / `en-revision` (con días desde el último
     cambio, calculados del historial).
   - **Bloqueadas**: con su motivo si consta.
   - **Cerradas con residual**: en `hecho` pero con ⚠️ o follow-ups F-* abiertos
     en su ledger — el "hecho (…)" que esconde trabajo.
3. Contrasta con `docs/roadmap.md`: ¿lo en-curso coincide con "Ahora"?
4. AVISA si detectas `SDD_SKIP_GATE=1` en el entorno o gates desactivados en
   `.sdd.json`: la válvula de escape no debe volverse permanente.
5. Cierra sugiriendo el siguiente paso y el rol que lo haría.

## Reglas duras
- Read-only absoluto. Si algo está mal, se reporta; no se corrige aquí.
```

- [ ] **Step 2: Verificación**

Run: `node -e "const fs=require('fs');['sdd-implementador','sdd-verificador','sdd-documentalista','sdd-como-vamos'].forEach(r=>{const t=fs.readFileSync('roles/es/'+r+'.md','utf8');if(!/## Misión/.test(t)||!/## Reglas duras/.test(t))throw r});console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add roles/es
git commit -m "feat: roles implementador, verificador, documentalista y como-vamos" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 15: skills/ — wrappers finos + trigger-evals

**Files:**
- Create: `skills/sdd-orquestador/SKILL.md` y `skills/sdd-orquestador/trigger-eval.json`
- Create: `skills/sdd-producto/SKILL.md` y `skills/sdd-producto/trigger-eval.json`
- Create: `skills/sdd-arquitecto/SKILL.md` y `skills/sdd-arquitecto/trigger-eval.json`
- Create: `skills/sdd-implementador/SKILL.md` y `skills/sdd-implementador/trigger-eval.json`
- Create: `skills/sdd-verificador/SKILL.md` y `skills/sdd-verificador/trigger-eval.json`
- Create: `skills/sdd-documentalista/SKILL.md` y `skills/sdd-documentalista/trigger-eval.json`
- Create: `skills/sdd-como-vamos/SKILL.md` y `skills/sdd-como-vamos/trigger-eval.json`

**Interfaces:**
- Consumes: `roles/es/*.md` (Tasks 13-14).
- Produces: las 7 skills instalables. Cuerpo idéntico en todas salvo el nombre del rol; la `description` es única por skill (es lo que dispara) y lleva triggers en español e inglés.

- [ ] **Step 1: Escribir los 7 wrappers**

Cuerpo común (cambia solo `<rol>`):

```markdown
Primero lee `.sdd.json` en la raíz del proyecto y toma el campo `idioma`
(si el fichero o el campo no existen, usa `es`).
Después lee `${CLAUDE_PLUGIN_ROOT}/roles/<idioma>/<rol>.md` con la herramienta
Read y sigue sus instrucciones al pie de la letra.
```

`skills/sdd-orquestador/SKILL.md`:
```markdown
---
name: sdd-orquestador
description: >
  Entrada y router de todo trabajo en proyectos tremen-sdd. Úsalo al inicio de
  CUALQUIER petición de trabajo — "construye X", "añade Y", "arregla Z",
  "haz la épica entera", "drive this epic/task" — para clasificarla, localizar
  o encargar su spec y conducir el pipeline (producto → arquitecto →
  implementador → verificador) con sus gates humanos. Dispara siempre que
  llegue trabajo y no esté claro qué spec lo gobierna.
---
Primero lee `.sdd.json` en la raíz del proyecto y toma el campo `idioma`
(si el fichero o el campo no existen, usa `es`).
Después lee `${CLAUDE_PLUGIN_ROOT}/roles/<idioma>/sdd-orquestador.md` con la
herramienta Read y sigue sus instrucciones al pie de la letra.
```

`skills/sdd-producto/SKILL.md` — mismo cuerpo con `sdd-producto.md`; frontmatter:
```yaml
name: sdd-producto
description: >
  Product Owner y guardián del roadmap en proyectos tremen-sdd. Úsalo para
  definir o priorizar ÉPICAS, aclarar visión, criterios de éxito o el roadmap
  — "quiero una funcionalidad para…", "prioriza esto", "define la épica",
  "scope this epic", "update the roadmap". Dispara ante intención de producto
  sin épica aprobada. NO para specs detalladas (sdd-arquitecto) ni código.
```

`skills/sdd-arquitecto/SKILL.md` — cuerpo con `sdd-arquitecto.md`; frontmatter:
```yaml
name: sdd-arquitecto
description: >
  Única autora de SPECs y ADRs en proyectos tremen-sdd. Úsalo para convertir
  una épica o petición en una spec testable, registrar una decisión técnica
  (stack, datos, fronteras) como ADR, o refinar/mover una spec por su ciclo —
  "especifica X", "escribe la spec", "¿Postgres o Turso?", "write the spec",
  "record this decision as an ADR". NO para implementar (sdd-implementador).
```

`skills/sdd-implementador/SKILL.md` — cuerpo con `sdd-implementador.md`; frontmatter:
```yaml
name: sdd-implementador
description: >
  Implementa UNA spec aprobada de un proyecto tremen-sdd, CA a CA con TDD, y
  mantiene su mitad del ledger — "implementa SPEC-012", "codea esta spec",
  "implement the approved spec", "build this feature (ya especificada)".
  Dispara solo con spec aprobada; sin spec, deriva a sdd-orquestador.
```

`skills/sdd-verificador/SKILL.md` — cuerpo con `sdd-verificador.md`; frontmatter:
```yaml
name: sdd-verificador
description: >
  Gate adversarial de proyectos tremen-sdd: verifica una implementación contra
  los CA de su spec (tests, lint, flujo real, Playwright para UI), rellena el
  ledger con evidencia y emite GREEN/RED — "verifica SPEC-012", "¿cumple los
  criterios?", "QA esto", "verify this spec". Dispara al terminar cualquier
  implementación y antes de cualquier PR. Nunca edita código.
---
```

`skills/sdd-documentalista/SKILL.md` — cuerpo con `sdd-documentalista.md`; frontmatter:
```yaml
name: sdd-documentalista
description: >
  Cierre mecánico del ciclo tremen-sdd: regenera el tablero, valida artefactos,
  sincroniza índices y detecta drift docs↔código — "cierra la spec", "archiva",
  "regenera índices", "tidy up the docs". Dispara cuando una spec llega a
  hecho o los índices huelen a desactualizados. Tier barato (haiku).
```

`skills/sdd-como-vamos/SKILL.md` — cuerpo con `sdd-como-vamos.md`; frontmatter:
```yaml
name: sdd-como-vamos
description: >
  Informe read-only del estado de un proyecto tremen-sdd: qué espera al humano,
  qué está en curso o bloqueado, y las specs "cerradas con residual" — "¿cómo
  vamos?", "¿qué queda?", "estado del proyecto", "what's left", "project
  status". No escribe nada: lee frontmatters, ledgers y roadmap, y reporta.
```

- [ ] **Step 2: Escribir los 7 trigger-eval.json**

Formato común — 4+ casos por skill, mínimo 1 negativo. Contenido exacto:

`skills/sdd-orquestador/trigger-eval.json`:
```json
{ "cases": [
  { "query": "constrúyeme el alta de facturas", "should_trigger": true },
  { "query": "haz la épica entera de analytics", "should_trigger": true },
  { "query": "fix the login bug", "should_trigger": true },
  { "query": "¿cómo vamos con el proyecto?", "should_trigger": false },
  { "query": "¿qué es un ADR?", "should_trigger": false }
] }
```

`skills/sdd-producto/trigger-eval.json`:
```json
{ "cases": [
  { "query": "quiero que los usuarios puedan compartir informes", "should_trigger": true },
  { "query": "prioriza el roadmap del trimestre", "should_trigger": true },
  { "query": "define la épica de onboarding", "should_trigger": true },
  { "query": "escribe la spec del alta de facturas", "should_trigger": false },
  { "query": "implementa SPEC-003", "should_trigger": false }
] }
```

`skills/sdd-arquitecto/trigger-eval.json`:
```json
{ "cases": [
  { "query": "escribe la spec del alta de facturas", "should_trigger": true },
  { "query": "¿usamos Turso o Postgres? decídelo y déjalo registrado", "should_trigger": true },
  { "query": "record this decision as an ADR", "should_trigger": true },
  { "query": "implementa la spec aprobada", "should_trigger": false },
  { "query": "¿qué queda pendiente?", "should_trigger": false }
] }
```

`skills/sdd-implementador/trigger-eval.json`:
```json
{ "cases": [
  { "query": "implementa SPEC-012", "should_trigger": true },
  { "query": "codea la spec de envío de emails, ya está aprobada", "should_trigger": true },
  { "query": "implement the approved spec", "should_trigger": true },
  { "query": "verifica SPEC-012", "should_trigger": false },
  { "query": "define la épica de pagos", "should_trigger": false }
] }
```

`skills/sdd-verificador/trigger-eval.json`:
```json
{ "cases": [
  { "query": "verifica SPEC-012", "should_trigger": true },
  { "query": "¿cumple los criterios de aceptación?", "should_trigger": true },
  { "query": "QA the invoice flow against its spec", "should_trigger": true },
  { "query": "arregla el test que falla", "should_trigger": false },
  { "query": "escribe la spec", "should_trigger": false }
] }
```

`skills/sdd-documentalista/trigger-eval.json`:
```json
{ "cases": [
  { "query": "regenera el tablero y los índices", "should_trigger": true },
  { "query": "la spec ya está hecha, cierra y archiva", "should_trigger": true },
  { "query": "los docs están desincronizados con el código, revísalo", "should_trigger": true },
  { "query": "¿cómo vamos?", "should_trigger": false },
  { "query": "implementa SPEC-004", "should_trigger": false }
] }
```

`skills/sdd-como-vamos/trigger-eval.json`:
```json
{ "cases": [
  { "query": "¿cómo vamos?", "should_trigger": true },
  { "query": "¿qué queda pendiente del proyecto?", "should_trigger": true },
  { "query": "what's the project status?", "should_trigger": true },
  { "query": "constrúyeme el alta de facturas", "should_trigger": false },
  { "query": "regenera el tablero", "should_trigger": false }
] }
```

- [ ] **Step 3: Verificación**

Run: `node -e "const fs=require('fs');const roles=['sdd-orquestador','sdd-producto','sdd-arquitecto','sdd-implementador','sdd-verificador','sdd-documentalista','sdd-como-vamos'];roles.forEach(r=>{const s=fs.readFileSync('skills/'+r+'/SKILL.md','utf8');if(!s.includes('roles/<idioma>/'+r+'.md')&&!s.includes('roles/${idioma}/'+r))throw 'wrapper '+r;const j=JSON.parse(fs.readFileSync('skills/'+r+'/trigger-eval.json','utf8'));if(j.cases.length<4)throw 'eval '+r});console.log('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add skills
git commit -m "feat: 7 skills sdd-* como wrappers finos con trigger-evals" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 16: commands/ — /sdd-init y /sdd-tablero

**Files:**
- Create: `commands/sdd-init.md`
- Create: `commands/sdd-tablero.md`

**Interfaces:**
- Consumes: `templates/` (Tasks 3 y 12), scripts (Tasks 4-7).
- Produces: los dos comandos del plugin.

- [ ] **Step 1: Escribir los dos comandos**

`commands/sdd-init.md`:
```markdown
---
description: Inicializa (o migra) un proyecto al estándar tremen-sdd
---
Vas a adoptar el estándar tremen-sdd en este proyecto. Los hooks del plugin ya
están activos (fail-open: no hacen nada hasta que exista `.sdd.json`).

## Paso 0 — Detección
Comprueba si el proyecto ya tiene estructura SDD de alguna variante conocida:
`specs/` en raíz (estilo fortos/god-pain), `docs/epicas/` (estilo phis),
`project_management/` (estilo galiactivapp/xana), o nada.
- Si NO hay nada → modo NUEVO (Paso 1).
- Si hay una variante → modo MIGRACIÓN (Paso 2).

## Paso 1 — Modo nuevo
1. Pregunta (una a una): nombre del proyecto, dominio en una frase, rutas de
   código a vigilar (p. ej. `src/`), idioma (hoy solo `es`; confirma).
2. Copia desde `${CLAUDE_PLUGIN_ROOT}/templates/` a la raíz del proyecto,
   rellenando `{{PROYECTO}}`, `{{FECHA}}` (hoy) y `{{DOMINIO}}`:
   - `FOUNDATION.md`, `CLAUDE.md` (si ya existe CLAUDE.md, NO lo pises:
     muestra el bloque tremen-sdd para que el humano lo integre),
   - `sdd.json` → `.sdd.json` (con las rutas vigiladas respondidas),
   - `roadmap.md` → `docs/roadmap.md`,
   - `fundacion/*` → `docs/fundacion/`.
3. Crea `docs/epicas/` y `docs/adr/` vacíos y ejecuta
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/tablero.mjs"` para el primer tablero.
4. Ofrece generar roles de dominio desde
   `${CLAUDE_PLUGIN_ROOT}/templates/rol-dominio.md`: por cada uno, pide nombre
   y dominio, estampa la lógica en `.ai-context/skills/sdd-<slug>.md` y un
   wrapper en `.claude/skills/sdd-<slug>/SKILL.md` que la lea con Read.
5. Termina mostrando el flujo: "/sdd-producto para la primera épica →
   /sdd-arquitecto para su primera spec → gate humano → a construir".

## Paso 2 — Modo migración
1. Inventaría la variante detectada: dónde viven épicas/specs/ADRs, qué
   nomenclatura usan, qué estados aparecen.
2. Presenta un PLAN de migración (tabla origen → destino: renombrados a
   EPIC/SPEC/ADR-NNN, movimientos a docs/epicas y docs/adr, mapeo de estados
   antiguos a los canónicos, frontmatters a añadir) y los riesgos.
3. NO MUEVAS NADA sin aprobación explícita del humano. Con aprobación, migra
   por lotes pequeños, ejecutando `node "${CLAUDE_PLUGIN_ROOT}/scripts/valida.mjs"`
   tras cada lote, y termina con el Paso 1.2-1.3 (kit base + tablero).
```

`commands/sdd-tablero.md`:
```markdown
---
description: Regenera docs/tablero.md desde los frontmatters
---
Ejecuta `node "${CLAUDE_PLUGIN_ROOT}/scripts/tablero.mjs"` en la raíz del
proyecto y muestra al usuario el resumen final del tablero (recuento por
estado). Si el script falla, ejecuta también
`node "${CLAUDE_PLUGIN_ROOT}/scripts/valida.mjs"` y reporta los errores de
artefactos que expliquen el fallo. No edites docs/tablero.md a mano jamás.
```

- [ ] **Step 2: Verificación**

Run: `node -e "const fs=require('fs');['sdd-init','sdd-tablero'].forEach(c=>{const t=fs.readFileSync('commands/'+c+'.md','utf8');if(!t.includes('description:'))throw c});console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add commands
git commit -m "feat: comandos /sdd-init (nuevo y migracion) y /sdd-tablero" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 17: Integración E2E local

**Files:**
- Create: `docs/superpowers/verificacion-e2e.md` (checklist rellenada con los resultados)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: verificación manual del plugin instalado en un proyecto sandbox real.

- [ ] **Step 1: Instalar el plugin desde el marketplace local**

```bash
claude plugin marketplace add D:\src\tremen-sdd
claude plugin install tremen-sdd@tremen-sdd
```
Expected: instalación sin errores. (Alternativa para iterar: `claude --plugin-dir D:\src\tremen-sdd` en el sandbox.)

- [ ] **Step 2: Sandbox y ciclo completo por CLI de scripts**

```bash
mkdir %TEMP%\sdd-sandbox && cd %TEMP%\sdd-sandbox && git init -b main
```
Dentro de una sesión de Claude Code en el sandbox: ejecutar `/sdd-init` (modo nuevo, rutas vigiladas `src/`), y después, desde terminal:

```bash
node "<ruta-plugin>/scripts/scaffold.mjs" epica "Facturación"
node "<ruta-plugin>/scripts/scaffold.mjs" spec "Alta de factura" --epica EPIC-001
node "<ruta-plugin>/scripts/estado.mjs" docs/epicas/EPIC-001-facturacion/SPEC-001-alta-de-factura.md aprobada --por Alberto
node "<ruta-plugin>/scripts/tablero.mjs"
node "<ruta-plugin>/scripts/valida.mjs"
```
Expected: épica+spec+ledger creados, transición registrada en historial, tablero con SPEC-001 en `aprobada`, valida OK.

- [ ] **Step 3: Verificar los hooks en vivo**

En la sesión de Claude Code del sandbox (en rama `main`): pedir "crea src/app.ts con un hola mundo".
Expected: el hook require-spec DENIEGA con mensaje que menciona /sdd-arquitecto.
Después: `git checkout -b ft/SPEC-001-alta-de-factura` y repetir.
Expected: la edición pasa. Pedir luego "edita docs/tablero.md y añade una línea".
Expected: protege-verdad DENIEGA mencionando /sdd-tablero.

- [ ] **Step 4: Verificar una skill y registrar resultados**

En el sandbox: "¿cómo vamos?" debe disparar `sdd-como-vamos` y reportar SPEC-001 esperando implementación. Anotar en `docs/superpowers/verificacion-e2e.md` cada paso con PASA/FALLA y capturas de los deny. Si algo falla: arreglar, re-verificar y actualizar el checklist antes de seguir.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/verificacion-e2e.md
git commit -m "test: verificacion E2E del plugin en sandbox (init, scaffold, hooks, skills)" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 18: README y versión

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: todo el plugin terminado.
- Produces: portada del repo y tag v0.1.0.

- [ ] **Step 1: Escribir README.md**

Contenido: qué es tremen-sdd (3 líneas), instalación (`claude plugin marketplace add tremen-dev/tremen-sdd` + `claude plugin install`), inicio rápido (`/sdd-init` → `/sdd-producto` → gate → pipeline), tabla de las 7 skills + 2 comandos con una línea cada una, la máquina de estados en un diagrama de texto, los 3 hooks y su válvula (`SDD_SKIP_GATE=1`), estructura que estampa en un proyecto, y enlace al design doc (`docs/superpowers/specs/2026-07-09-tremen-sdd-design.md`). Todo en español.

- [ ] **Step 2: Suite completa y tag**

Run: `node --test tests/`
Expected: todo verde.

```bash
git add README.md
git commit -m "docs: README del plugin tremen-sdd" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git tag v0.1.0
```

---

## Fuera de alcance de este plan (fase 2+)

i18n gl/en (`roles/gl|en/`, plantillas traducidas), generador asistido de roles de dominio, `npx tremen-sdd init`, publicación en skills.sh, integración saas-generator, y la migración real de los proyectos existentes (gastio como piloto — se hará CON el plugin ya instalado usando `/sdd-init` modo migración; el design doc exige el piloto doble antes de declarar la v1 "estable", por eso este plan taggea v0.1.0).

Nota de simplificación respecto al design doc: la carpeta `agents/` (definiciones dedicadas de subagentes) se difiere — en v1 el orquestador lanza subagentes genéricos pasándoles el fichero de rol (`roles/es/*.md`) como instrucciones, que es funcionalmente equivalente. Se añadirán definiciones dedicadas si el piloto muestra que hacen falta (p. ej. para fijar `model: haiku` en el documentalista de forma declarativa).
