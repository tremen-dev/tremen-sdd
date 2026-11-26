---
id: SPEC-031
tipo: ledger
epica: EPIC-FIX
---
# Ledger — SPEC-031 El historial del frontmatter conserva las notas con comas y comillas

## Resumen
- Fase: <!-- refleja el estado de la spec; la fuente de verdad es el frontmatter de la spec -->
- Rama: `ft/SPEC-031-el-historial-del-frontmatter-conserva-las-notas-con-comas-y-comillas`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `core/lib/frontmatter.mjs` (`parseValue` → `parseInline`, `readQuoted`) | `core/tests/frontmatter-comillas.test.mjs` — «CA-1 (a)»…«CA-1 (g)», «CA-1.4», «CA-1: todas las notas en un mismo historial» | | ❌ |
| CA-2 | `core/lib/frontmatter.mjs` (`inline` → `inlineValue`) | `core/tests/frontmatter-comillas.test.mjs` — «CA-2.1», «CA-2.2», «CA-2.3», «CA-2.4» | | ❌ |
| CA-3 | sin código propio: lo dan CA-1 y CA-2 vía `core/scripts/estado.mjs` (sin cambios) | `core/tests/frontmatter-comillas.test.mjs` — «CA-3: una transición con estado.mjs no estropea las entradas anteriores» (CLI `estado.mjs` + CLI `valida.mjs` en proyecto temporal) | | ❌ |
| CA-4 | sin código propio (test de guarda) | `core/tests/frontmatter-comillas.test.mjs` — «CA-4: los artefactos de docs/ no cambian al parsear y serializar» (ficheros con seguimiento bajo `docs/`; LF byte a byte, CRLF normalizado) | | ❌ |
| CA-5 | `CHANGELOG.md` (0.5.1 › Corregido) | `npm test` 688/688, `npm run check` OK, `node core/scripts/valida.mjs` OK; tests previos de frontmatter/estado/valida/tablero sin tocar | | ❌ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-031/. Informe HTML opcional: _qa/SPEC-031/informe.html -->

## Salvedades / follow-ups
<!-- IDs F-SPEC-031-1, F-SPEC-031-2… con destino (spec futura o EPIC-MEJORA). -->

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->
- Implementación terminada (sdd-implementador, 2026-11-26): CA-1 a CA-5 con test en `core/tests/frontmatter-comillas.test.mjs`; el fix vive solo en `core/lib/frontmatter.mjs`, ningún consumidor cambia.
- Decisiones del humano aplicadas: sin aviso de comillas desparejadas en `valida.mjs`; `nota: "simple"` puede perder las comillas al reserializar (aceptado).
- Líneas ya rotas (comilla sin cerrar o texto tras la comilla de cierre): se leen sin comillas, igual que antes del fix; no se reparan (CE-FIX-2).
- Siguiente paso: sdd-verificador sobre la rama `ft/SPEC-031-el-historial-del-frontmatter-conserva-las-notas-con-comas-y-comillas`.
