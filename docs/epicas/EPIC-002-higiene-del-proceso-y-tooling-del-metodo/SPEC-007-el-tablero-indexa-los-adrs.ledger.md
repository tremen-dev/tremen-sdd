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
| CA-1 | `core/scripts/tablero.mjs` (`renderBoard`, bloque `## ADRs` entre épicas y Resumen; fila con **4 celdas separadas** `id \| estado \| título \| último`, corregido tras RED) | `core/tests/tablero.test.mjs`: "el tablero emite la sección ## ADRs con su tabla (CA-1)" (deepEqual de las 4 celdas), "la fila de ADR tiene el título en columna propia, distinto del id (CA-1)", "el nº de columnas de cada fila de ADR == nº de columnas de la cabecera (CA-1)" (guarda cabecera-vs-fila), "los ADRs se ordenan por id ascendente (CA-1)", "la sección ## ADRs va después de las épicas y antes de ## Resumen (CA-1)" | **RED**: cabecera de 4 columnas `\| ADR \| Estado \| Título \| Último cambio \|` (línea 45) pero la fila emite solo **3 celdas** `\| id — título \| estado \| último \|` (línea 49). Tabla markdown malformada: el "último cambio" se renderiza bajo la columna "Título" y "Último cambio" queda vacía; la columna "Título" nunca muestra el título. Viola el contrato de columnas de CA-1. Los tests nuevos no lo detectan porque su regex de fila se escribió al formato defectuoso (3 celdas). | ❌ |
| CA-2 | `docs/tablero.md` regenerado con `node core/scripts/tablero.mjs` (GENERADO por `tablero.mjs`, RN-05) | Evidencia: `docs/tablero.md` casa `ADR-001`..`ADR-006`, todas con estado `aprobada` | Regeneré yo (`node core/scripts/tablero.mjs`, idempotente: 0 diff git). La sección `## ADRs` existe con ADR-001..006 y estado `aprobada` presente. PERO la tabla hereda el defecto de CA-1 (filas de 3 celdas bajo cabecera de 4): datos presentes pero presentación rota. Bloqueado por CA-1. | ⚠️ |
| CA-3 | `core/scripts/tablero.mjs` (lógica de épicas/specs sin tocar; sección `## ADRs` omitida si no hay `docs/adr/`) | `core/tests/tablero.test.mjs`: los 4 tests existentes verbatim + "sin docs/adr/ no se emite la sección ## ADRs (corolario CA-3/CA-4)" | OK: diff de `tablero.mjs` solo AÑADE el bloque ADR entre el bucle de épicas y el Resumen; lógica épicas/specs y Resumen intactas. Diff de tests sin eliminaciones (4 tests previos verbatim). Test "sin docs/adr/" verde. | ✅ |
| CA-4 | n-a (es trabajo de test) | `core/tests/tablero.test.mjs`: 4 tests nuevos (fixture `docsConAdrs()` con `docs/adr/ADR-001-*.md` y ADR-002; caso sin `adr/`) | Existen 4 tests nuevos y pasan (8/8 en la suite). Salvedad: los tests aseveran el formato de fila defectuoso (3 celdas), por eso no capturan el fallo de CA-1; test presente pero débil. | ⚠️ |
| CA-5 | Conjunto completo del cambio | `npm test` → 216 pass / 0 fail; `npm run check` OK; `node core/scripts/valida.mjs` OK | OK: `npm test` 216 pass / 0 fail (yo); `npm run check` OK (yo); CI run 29929935031 VERDE en Ubuntu sobre ad08e36 (`gh run view`). | ✅ |
| CA-6 | `core/scripts/estado.mjs` **sin tocar** (0 diff) | `git diff --stat` no lista `estado.mjs`; `core/tests/estado.test.mjs` verbatim y verde (dentro de los 216) | OK: `git diff --stat main HEAD` NO lista `core/scripts/estado.mjs` (0 diff). `estado.test.mjs` 13/13 verde. Regresión de specs migradas no agravada. | ✅ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

**RED — 2026-07-22 (sdd-verificador).** CA-1 incumplido: `renderBoard` emite la
sección `## ADRs` con una cabecera de **4 columnas** (`ADR | Estado | Título |
Último cambio`, línea 45) pero cada fila de datos tiene solo **3 celdas**
(`| id — título | estado | último cambio |`, línea 49 — copiado del formato de
specs, que sí es de 3 columnas). Resultado: tabla markdown malformada. Al
renderizar, el valor "último cambio" aparece bajo la columna **Título** y la
columna **Último cambio** queda **vacía**; el título derivado del fichero nunca
ocupa su propia columna. CA-1 exige explícitamente esas 4 columnas con el título
en columna propia. Los 4 tests nuevos pasan pero NO detectan el fallo: su regex
de fila se escribió sobre el mismo formato defectuoso de 3 celdas, así que
validan el bug en vez de la spec.

Verde en el resto: CA-3 (no-regresión: lógica épicas/specs y Resumen intactas,
4 tests previos verbatim), CA-5 (`npm test` 216/0, `check` OK, CI 29929935031
VERDE), CA-6 (`estado.mjs` 0 diff, `estado.test.mjs` 13/13). CA-2 y CA-4 quedan
con salvedad, dependientes del arreglo de CA-1.

Un solo CA en rojo = RED. La spec NO se cierra.

### Findings accionables (para sdd-implementador)
- **F1 (bloqueante, CA-1)**: en `core/scripts/tablero.mjs:49`, emitir 4 celdas
  alineadas con la cabecera. Sugerencia:
  `\`| ${d.id} | ${d.estado} | ${f.replace(/^ADR-\d{3}-/, '').replace(/\.md$/, '')} | ${ultimo ? ...\`` — id, estado, título y último cambio como celdas distintas.
- **F2 (test complice, CA-4)**: actualizar la regex de fila de los 2 tests
  nuevos en `core/tests/tablero.test.mjs` para aseverar las **4 celdas**
  separadas (título en su columna), de modo que el test proteja el contrato de
  CA-1 y no el formato roto. Considerar una aserción de conteo de columnas
  cabecera-vs-fila.
- Tras corregir, **regenerar** `docs/tablero.md` (`node core/scripts/tablero.mjs`).

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
