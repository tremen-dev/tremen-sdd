---
id: SPEC-008
tipo: ledger
epica: EPIC-002
---
# Ledger — SPEC-008 Limpieza de tooling y CI

## Resumen
- Fase: en-revision (implementación completa; pendiente de verificación)
- Rama: `ft/SPEC-008-limpieza-de-tooling-y-ci`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `adapters/claude-code/hooks/calidad.mjs`: rama `auto` (`esAuto`) degrada a `none` si `!tieneConfig(linter, cwd)` antes de invocar (líneas ~32-37); refleja en `dist/claude-code/hooks/calidad.mjs` vía build | `adapters/claude-code/tests/calidad.test.mjs`: "CA-1: auto SIN config del linter -> no invoca linter, exit 0, stderr vacío" (stub ruff exit 2 en PATH, sin `ruff.toml` → `code===0`, `stderr===''`) y "CA-1: linter ausente (== auto) SIN config -> exit 0, stderr vacío" | Adversarial independiente contra `dist/…/calidad.mjs` en cwd temporal: `auto` + `.mjs` SIN `eslint.config.*`, stub eslint exit 2 en PATH → `code=0`, `stderr=''`; ídem con clave `linter` ausente. Es el caso que hoy daba exit 2. Suite: ambos tests verdes en los 222 | ✅ |
| CA-2 | `adapters/claude-code/hooks/calidad.mjs`: `tieneConfig()` (helper nuevo) detecta config de eslint/ruff/dart en raíz; con config presente `auto` sí invoca y el linter gobierna el exit | `adapters/claude-code/tests/calidad.test.mjs`: "CA-2: auto CON config presente (ruff.toml) y stub OK -> exit 0" (stub ruff exit 0 → `code===0`) y "CA-2: auto CON config presente (ruff.toml) y stub con hallazgos -> exit 2" (stub ruff exit 2 → `code===2` + `stderr` match `/ruff/`) | Adversarial: cwd temporal con `ruff.toml` + stub ruff → exit 0 gobierna `code=0`, exit 2 gobierna `code=2` (`stderr` menciona `ruff`); y con `eslint.config.mjs` + stub `npx` exit 2 → `code=2` (config detectada dispara el lint). Suite: ambos tests verdes | ✅ |
| CA-3 | `adapters/claude-code/hooks/calidad.mjs`: la comprobación de config **solo** condiciona `esAuto`; `linter` explícito conserva su rama (fail-open `r.error \|\| r.status===null`) sin exigir config | Los **5 tests existentes** de `calidad.test.mjs` verbatim y verdes (artefacto incoherente→2, coherente→0, `linter none`→0, fail-open sin `.sdd.json`→0, ruff real vía stub con espacio→0) | Fuente: la guarda es `if (esAuto && linter !== 'none' && !tieneConfig(...))` (l.38) — solo toca `auto`. Los 5 tests originales (l.25-86 del test) verbatim y verdes dentro de los 222 | ✅ |
| CA-4 | Sin cambios en la rama `validateFile` (artefactos SDD); el fix vive solo en la rama de código | `calidad.test.mjs`: los 2 tests de artefacto existentes verbatim (desincronizado→2 con `/historial/`; coherente→0) | Rama `validateFile` (l.23-30) sin cambios; los 2 tests de artefacto verdes en la suite | ✅ |
| CA-5 | `.github/workflows/ci.yml`: `actions/checkout@v4`→`@v7`, `actions/setup-node@v4`→`@v7`; `node-version: '22'` del job intacto | Inspección YAML: `grep` de `actions/(checkout\|setup-node)@` devuelve solo `@v7`, ningún `@v4` (líneas 14 y 17) | Inspección del YAML: `checkout@v7` (l.14), `setup-node@v7` (l.17), `node-version: '22'` (l.19); sin `@v4`. Observado en el run real `29933037942` (headSha ad85d49, ubuntu-latest): success y **annotations_count=0** → sin warning "Node.js 20 is deprecated" | ✅ |
| CA-6 | `core/scripts/estado.mjs` **sin tocar** (0 diff) | `git diff --stat core/scripts/estado.mjs` vacío; `core/tests/estado.test.mjs` verbatim y verde dentro de los 222 | `git diff --stat main` de `core/scripts/estado.mjs` y `core/tests/estado.test.mjs` → ambos vacíos (0 diff); máquina de estados intacta, regresión de specs migradas no agravada | ✅ |
| CA-7 | Conjunto completo del cambio; fix reflejado en `dist/` vía `tools/build-adapter.mjs` (copia verbatim; `diff` fuente↔dist idéntico) | `npm test` → **222 pass / 0 fail** (9 en `calidad.test.mjs`, incluidos los 4 nuevos de CA-1/CA-2); `npm run check` → OK. CI pendiente sobre la rama | `npm test` → 222 pass / 0 fail; `npm run check` → OK (exit 0). `diff` fuente↔`dist/claude-code/hooks/calidad.mjs` idénticos (build verbatim, RN-05). CI run `29933037942` success | ✅ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

**GREEN — 2026-07-22 (sdd-verificador).** Los 7 CA en verde con Implementado + Test + Verif.
Evidencia ejercida sobre artefactos, no relato:
- **CE-3 adversarial** contra `dist/claude-code/hooks/calidad.mjs` en cwd temporales: (a) `linter:"auto"`
  con `.mjs` y SIN `eslint.config.*` → NO invoca el linter (stub eslint exit 2 en PATH ignorado): `exit 0`,
  `stderr` vacío — el caso que hoy daba exit 2 queda corregido; ídem con clave `linter` ausente. (b) CON
  config (`ruff.toml` / `eslint.config.mjs`) presente → sí lintea y el exit del linter gobierna (stub
  exit 0 → `code 0`; stub exit 2 → `code 2` con mensaje). La guarda `if (esAuto && …)` (l.38) confina el
  cambio a la rama `auto`; `linter` explícito y `validateFile` intactos.
- **CE-4** observado en el run real `29933037942` (headSha ad85d49, ubuntu-latest): conclusion=success y
  **0 anotaciones** → sin warning "Node.js 20 is deprecated". `ci.yml`: `checkout@v7`, `setup-node@v7`,
  `node-version:'22'`; sin `@v4`.
- **Suite/higiene**: `npm test` 222 pass / 0 fail; `npm run check` OK. `core/scripts/estado.mjs` y
  `core/tests/estado.test.mjs` con 0 diff vs `main` (CA-6). Fuente↔`dist` del hook idénticos (RN-05).
- **Nota**: el hook del plugin INSTALADO (cache v0.4.0) ladró con "eslint sin config" al escribir un
  `.mjs` durante esta verificación — es el bug CE-3 reproducido en vivo desde la versión cacheada, ajeno
  a los artefactos del repo (que ya están corregidos); se propagará al plugin en el próximo release.

Spec transicionada a `hecho` por sdd-verificador.

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-008/. Informe HTML opcional: _qa/SPEC-008/informe.html -->

## Salvedades / follow-ups
<!-- IDs F-SPEC-008-1, F-SPEC-008-2… con destino (spec futura o EPIC-MEJORA). -->

- **F-SPEC-008-1** (destino: EPIC-MEJORA, no urgente): `tieneConfig()` cubre config en la **raíz del
  proyecto** con los ficheros convencionales de eslint/ruff/dart, tal como acota la spec (Fuera de
  alcance). Config heredada de un monorepo padre o en subdirectorio se trata como "sin config" → `none`
  (fail-safe silencioso, comportamiento deseado). Si algún proyecto usuario lo necesitara, sería spec
  aparte.
- **Nota (no follow-up):** durante la implementación, el hook `calidad` **instalado** del plugin
  (`${CLAUDE_PLUGIN_ROOT}/hooks/calidad.mjs`, versión cacheada v0.4.0) ladró con `eslint sin config`
  en cada Edit de `.mjs` — es exactamente el bug de CE-3 reproducido en vivo. No afecta al repo: el
  fix ya está en el **fuente** del adaptador; se propagará al plugin instalado en el próximo release.

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->

**Estado:** implementación completa, suite y check verdes en local; spec transicionada a `en-revision`.
Falta **solo** la verificación adversarial (sdd-verificador) y el run de CI sobre la rama.

**Qué se hizo (CE-3 + CE-4):**
1. `adapters/claude-code/hooks/calidad.mjs` (VIGILADO): nuevo helper `tieneConfig(linter, cwd)` y
   guarda `if (esAuto && linter !== 'none' && !tieneConfig(linter, cwd)) linter = 'none';`. Semántica de
   `auto` = acierta por extensión **Y** existe config del linter en la raíz. Sin config → `none` (no
   lint, exit 0, sin ruido). Config detectada por linter:
   - eslint: `eslint.config.{js,mjs,cjs,ts}`, cualquier `.eslintrc*`, o `eslintConfig` en `package.json`.
   - ruff: `ruff.toml`, `.ruff.toml`, o sección `[tool.ruff...]` en `pyproject.toml`.
   - dart: `analysis_options.yaml`.
   Un `linter` **explícito** (none/eslint/ruff/dart) NO pasa por esta comprobación (CA-3 intacto).
2. `.github/workflows/ci.yml` (no vigilado): `checkout@v4`→`@v7`, `setup-node@v4`→`@v7`. `node-version:
   '22'` del job sin tocar.
3. Tests nuevos en `adapters/claude-code/tests/calidad.test.mjs` (no vigilado): 2 de CA-1 + 2 de CA-2,
   con stub de `ruff` en PATH (patrón del test de quoting existente). Los 5 tests previos, verbatim.

**Cómo re-verificar:** `npm test` (222 pass / 0 fail) y `npm run check` (OK). `git diff --stat
core/scripts/estado.mjs` debe ser vacío (CA-6). `diff adapters/claude-code/hooks/calidad.mjs
dist/claude-code/hooks/calidad.mjs` → idénticos (build verbatim, RN-05). Inspección de `ci.yml`: sin
`@v4`. CI sobre la rama pendiente de correr (CA-5/CA-7 parte observable).

**`core/scripts/estado.mjs` NO se tocó** (CA-6). Decisiones de gate respetadas: opción (a) —arreglar la
semántica de `auto`, `.sdd.json` conserva `linter:"auto"`—; sin ADR.
