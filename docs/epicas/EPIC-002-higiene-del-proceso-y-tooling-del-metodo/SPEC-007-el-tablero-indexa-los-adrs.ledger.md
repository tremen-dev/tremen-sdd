---
id: SPEC-007
tipo: ledger
epica: EPIC-002
---
# Ledger — SPEC-007 El tablero indexa los ADRs

## Resumen
- Fase: hecho (GREEN — re-verificación de CA-1 tras RED)
- Rama: `ft/SPEC-007-el-tablero-indexa-los-adrs`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `core/scripts/tablero.mjs` (`renderBoard`, bloque `## ADRs` entre épicas y Resumen; fila con **4 celdas separadas** `id \| estado \| título \| último`, corregido tras RED) | `core/tests/tablero.test.mjs`: "el tablero emite la sección ## ADRs con su tabla (CA-1)" (deepEqual de las 4 celdas), "la fila de ADR tiene el título en columna propia, distinto del id (CA-1)", "el nº de columnas de cada fila de ADR == nº de columnas de la cabecera (CA-1)" (guarda cabecera-vs-fila), "los ADRs se ordenan por id ascendente (CA-1)", "la sección ## ADRs va después de las épicas y antes de ## Resumen (CA-1)" | **GREEN (re-verif. 2026-07-22)**: `tablero.mjs:50` ahora emite **4 celdas** `\| ${id} \| ${estado} \| ${título} \| ${último} \|`, alineadas con la cabecera de 4 columnas. Ejercido: `node core/scripts/tablero.mjs` → `docs/tablero.md` sección `## ADRs` con cabecera `\| ADR \| Estado \| Título \| Último cambio \|` y filas de 4 celdas; el título (p. ej. `estructura-del-repo-para-multi-harness`) ocupa su **columna propia**, distinto del id; el último cambio en su columna. Ubicada tras las épicas y antes de `## Resumen`, ADRs ordenados por id ascendente. Tabla ya **no malformada**. | ✅ |
| CA-2 | `docs/tablero.md` regenerado con `node core/scripts/tablero.mjs` (GENERADO por `tablero.mjs`, RN-05) | Evidencia: `docs/tablero.md` casa `ADR-001`..`ADR-006`, todas con estado `aprobada` | **GREEN**: regeneré yo (`node core/scripts/tablero.mjs`, idempotente: 0 diff git). La sección `## ADRs` lista **ADR-001..ADR-006**, cada una con estado `aprobada`, en filas de **4 celdas bien formadas** (ya sin el defecto de CA-1). Presentación correcta. | ✅ |
| CA-3 | `core/scripts/tablero.mjs` (lógica de épicas/specs sin tocar; sección `## ADRs` omitida si no hay `docs/adr/`) | `core/tests/tablero.test.mjs`: los 4 tests existentes verbatim + "sin docs/adr/ no se emite la sección ## ADRs (corolario CA-3/CA-4)" | OK: diff de `tablero.mjs` solo AÑADE el bloque ADR entre el bucle de épicas y el Resumen; lógica épicas/specs y Resumen intactas. Diff de tests sin eliminaciones (4 tests previos verbatim). Test "sin docs/adr/" verde. | ✅ |
| CA-4 | n-a (es trabajo de test) | `core/tests/tablero.test.mjs`: tests nuevos (fixture `docsConAdrs()` con `docs/adr/ADR-001-*.md` y ADR-002; caso sin `adr/`) | **GREEN — tests NO cómplices**: aseveran las **4 celdas separadas** con `deepEqual` (título en columna propia, distinto del id) + guarda de **conteo cabecera-vs-fila** (helpers `celdas()`/`filaAdr()`). Prueba adversarial (verificador): apliqué esas 3 aserciones a una fila defectuosa de 3 celdas (`\| id — título \| estado \| último \|`) → **3/3 fallan** (deepEqual, `c[2]==título`, y `len(fila)=3 != cabecera=4`). Los tests protegen el contrato de CA-1, no el formato roto. | ✅ |
| CA-5 | Conjunto completo del cambio | `npm test` → 218 pass / 0 fail; `npm run check` OK | **GREEN (re-verif.)**: corrí yo `npm test` → **218 pass / 0 fail**; `npm run check` → OK (build claude+kimi + checks + valida). **CI run 29930767418 VERDE** (`success`, `completed`) sobre headSha **6506d8e** (== HEAD). | ✅ |
| CA-6 | `core/scripts/estado.mjs` **sin tocar** (0 diff) | `git diff --stat` no lista `estado.mjs`; `core/tests/estado.test.mjs` verbatim y verde (dentro de los 218) | **GREEN**: `git diff --name-only main...HEAD -- core/scripts/estado.mjs` **vacío** (0 diff). `core/tests/estado.test.mjs` sin eliminaciones (verbatim) y verde dentro de los 218. Regresión de specs migradas **no agravada**. | ✅ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

**GREEN — 2026-07-22 (sdd-verificador, re-verificación tras RED).** El RED previo
de **CA-1** está **corregido**: `core/scripts/tablero.mjs:50` emite ahora **4 celdas**
`| ${id} | ${estado} | ${título} | ${último} |`, alineadas con la cabecera de 4
columnas. Ejercido con `node core/scripts/tablero.mjs`: en `docs/tablero.md` la
sección `## ADRs` (líneas 23-33) tiene la cabecera `| ADR | Estado | Título |
Último cambio |` y **6 filas de 4 celdas**; el **título** derivado del fichero
ocupa su **columna propia**, distinto del id, y el **último cambio** en la suya.
La tabla ya **no está malformada**. Ubicada tras las épicas y antes de `## Resumen`,
ADRs ordenados por id ascendente.

Los findings F1 y F2 del RED están resueltos:
- **F1 (CA-1)**: fila de 4 celdas separadas (verificado en código y en el tablero real).
- **F2 (CA-4, tests cómplices)**: los tests ahora aseveran las 4 celdas con
  `deepEqual` (título en columna propia, distinto del id) + guarda de conteo
  **cabecera-vs-fila**. **Prueba adversarial** del verificador: apliqué esas
  aserciones a una fila defectuosa de 3 celdas → **3/3 fallan**. Tests **no cómplices**.

Verde en todos los CA: CA-1 ✅ (corregido), CA-2 ✅ (ADR-001..006 `aprobada`,
bien formadas), CA-3 ✅ (épicas/specs/Resumen intactos, 4 tests previos verbatim,
sin `docs/adr/` no emite sección), CA-4 ✅ (tests nuevos no cómplices), CA-5 ✅
(`npm test` 218/0, `check` OK, CI 29930767418 VERDE sobre HEAD 6506d8e), CA-6 ✅
(`estado.mjs` 0 diff, `estado.test.mjs` verbatim, regresión no agravada).

Todos los CA en verde = GREEN. La spec se cierra (→ `hecho`).

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
Implementación **completa** y en `en-revision`. **RED de CA-1 corregido** (iteración 2).
Cambios (rama `ft/SPEC-007-el-tablero-indexa-los-adrs`):
- `core/scripts/tablero.mjs`: `renderBoard` escanea `docsDir/adr/`, filtra `ADR-*.md`,
  ordena por nombre y emite `## ADRs` (tabla `ADR | Estado | Título | Último cambio`)
  entre las épicas y `## Resumen`. **F1 aplicado**: la fila emite **4 celdas separadas**
  `| ${id} | ${estado} | ${título} | ${último} |` (antes 3 → tabla malformada). Título
  derivado del nombre de fichero (`ADR-NNN-`…`.md`), en su columna propia. Sin `docs/adr/`
  la sección se omite. Los ADRs NO entran en el Resumen.
- `core/tests/tablero.test.mjs`: **6 tests** de ADRs (los 4 existentes intactos y verdes).
  **F2 aplicado**: los tests aseveran las 4 celdas con `deepEqual` (título en columna propia,
  distinto del id) + guarda de **conteo de columnas cabecera-vs-fila** (helpers `celdas()`/`filaAdr()`).
- `docs/tablero.md`: regenerado (GENERADO, no a mano) → `## ADRs` bien formada, ADR-001..006
  `aprobada`, título y último cambio cada uno en su columna.
- `core/scripts/estado.mjs`: **intacto** (0 diff en `main...HEAD`).
Evidencia iteración 2: `npm test` **218 pass / 0 fail**; `npm run check` OK; `git diff --name-only
main...HEAD -- core/scripts/estado.mjs` vacío. Verificación pendiente (sdd-verificador):
re-verificar CA-1/CA-2/CA-4 y actualizar Verif./Estado.
