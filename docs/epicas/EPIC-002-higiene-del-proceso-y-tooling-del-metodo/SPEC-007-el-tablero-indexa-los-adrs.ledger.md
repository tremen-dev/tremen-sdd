---
id: SPEC-007
tipo: ledger
epica: EPIC-002
---
# Ledger — SPEC-007 El tablero indexa los ADRs

## Resumen
- Fase: en-revision (implementación completa; pendiente de verificación)
- Rama: `ft/SPEC-007-el-tablero-indexa-los-adrs`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `core/scripts/tablero.mjs` (`renderBoard`, bloque `## ADRs` entre épicas y Resumen) | `core/tests/tablero.test.mjs`: "el tablero emite la sección ## ADRs con su tabla (CA-1)", "los ADRs se ordenan por id ascendente (CA-1)", "la sección ## ADRs va después de las épicas y antes de ## Resumen (CA-1)" | | ❌ |
| CA-2 | `docs/tablero.md` regenerado con `node core/scripts/tablero.mjs` (GENERADO por `tablero.mjs`, RN-05) | Evidencia: `docs/tablero.md` casa `ADR-001`..`ADR-006`, todas con estado `aprobada` | | ❌ |
| CA-3 | `core/scripts/tablero.mjs` (lógica de épicas/specs sin tocar; sección `## ADRs` omitida si no hay `docs/adr/`) | `core/tests/tablero.test.mjs`: los 4 tests existentes verbatim + "sin docs/adr/ no se emite la sección ## ADRs (corolario CA-3/CA-4)" | | ❌ |
| CA-4 | n-a (es trabajo de test) | `core/tests/tablero.test.mjs`: 4 tests nuevos (fixture `docsConAdrs()` con `docs/adr/ADR-001-*.md` y ADR-002; caso sin `adr/`) | | ❌ |
| CA-5 | Conjunto completo del cambio | `npm test` → 216 pass / 0 fail; `npm run check` OK; `node core/scripts/valida.mjs` OK | | ❌ |
| CA-6 | `core/scripts/estado.mjs` **sin tocar** (0 diff) | `git diff --stat` no lista `estado.mjs`; `core/tests/estado.test.mjs` verbatim y verde (dentro de los 216) | | ❌ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-007/. Informe HTML opcional: _qa/SPEC-007/informe.html -->

## Salvedades / follow-ups
- **F-SPEC-007-1 (entorno, no bloqueante para el commit)**: el hook PostToolUse
  `calidad.mjs` (linter `auto`) autodetecta un **eslint global v10.7.0** y ejecuta
  `npx eslint <fichero>` en cada Edit de `.mjs`. El repo **no** tiene config eslint
  ni depende de eslint, así que falla con "couldn't find eslint.config". No afecta al
  **git pre-commit** (`tools/githooks/pre-commit.mjs`, que NO corre eslint) ni a
  `npm test`/`check`/`valida` (todos verdes). Es ruido del harness, ajeno a esta spec.
  Destino sugerido: EPIC-002 (CE-3, "linter sin ruido") o ajuste del fail-open de
  `calidad.mjs` para tratar el error de configuración de eslint como "no configurado".

## Cómo retomar (handoff)
Implementación **completa** y en `en-revision`. Cambios (rama `ft/SPEC-007-el-tablero-indexa-los-adrs`):
- `core/scripts/tablero.mjs`: `renderBoard` escanea `docsDir/adr/`, filtra `ADR-*.md`,
  ordena por nombre y emite `## ADRs` (tabla `ADR | Estado | Título | Último cambio`)
  entre las épicas y `## Resumen`. Título derivado del nombre de fichero (`ADR-NNN-`…`.md`),
  igual que las specs. Sin `docs/adr/` la sección se omite. Los ADRs NO entran en el Resumen.
- `core/tests/tablero.test.mjs`: 4 tests nuevos (los 4 existentes intactos y verdes).
- `docs/tablero.md`: regenerado (GENERADO, no editado a mano) → muestra ADR-001..006 `aprobada`.
- `core/scripts/estado.mjs`: **intacto** (0 diff).
Verificación pendiente (sdd-verificador): CA-1..CA-6 contra la spec; llenar Verif./Estado.
Comandos de evidencia: `node --test core/tests/tablero.test.mjs`, `npm test`, `npm run check`,
`git diff --stat`, y leer `## ADRs` en `docs/tablero.md`.
