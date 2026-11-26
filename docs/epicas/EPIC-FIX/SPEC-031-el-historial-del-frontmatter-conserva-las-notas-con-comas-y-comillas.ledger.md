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
| CA-1 | `core/lib/frontmatter.mjs` (`parseValue` → `parseInline`, `readQuoted`) | `core/tests/frontmatter-comillas.test.mjs` — «CA-1 (a)»…«CA-1 (g)», «CA-1.4», «CA-1: todas las notas en un mismo historial» | 15/15 en `frontmatter-comillas.test.mjs`; script propio: los 7 literales (a)–(g) de la tabla parsean exacto con LF y con CRLF, claves exactas `estado, fecha, por, nota`; `nota` en primera posición y sin espacio tras `:` también; entrada de Alberto Fojo igual que antes | ✅ |
| CA-2 | `core/lib/frontmatter.mjs` (`inline` → `inlineValue`) | `core/tests/frontmatter-comillas.test.mjs` — «CA-2.1», «CA-2.2», «CA-2.3», «CA-2.4» | tests verdes + script propio de ida y vuelta con 47 valores (comas, `:`, `{`/`}`, `"`, `\`, `\"`, `''`, `'` inicial, espacios y tab en extremos, vacío, `{estado: x}`, `k: v, k2: v2`…): 0 fallos en objetos y en el texto de la doble serialización; entrada de Alberto Fojo byte a byte | ✅ |
| CA-3 | sin código propio: lo dan CA-1 y CA-2 vía `core/scripts/estado.mjs` (sin cambios) | `core/tests/frontmatter-comillas.test.mjs` — «CA-3: una transición con estado.mjs no estropea las entradas anteriores» (CLI `estado.mjs` + CLI `valida.mjs` en proyecto temporal) | test verde + flujo real propio: proyecto temporal con notas escritas a mano (la de la entrada 11, `:` y llaves, `\"` y `\\`, `''`), en LF y en CRLF; `estado.mjs` a en-progreso y a en-revision salen 0, entrada nueva al final, líneas previas estables tras la 2ª transición; `valida.mjs --dir` sale 0 | ✅ |
| CA-4 | sin código propio (test de guarda) | `core/tests/frontmatter-comillas.test.mjs` — «CA-4: los artefactos de docs/ no cambian al parsear y serializar» (ficheros con seguimiento bajo `docs/`; LF byte a byte, CRLF normalizado) | test verde sobre todos los `.md` con seguimiento bajo `docs/`; no es vacío (aserción `revisados > 0`) y lista ficheros y líneas si falla | ✅ |
| CA-5 | `CHANGELOG.md` (0.5.1 › Corregido) | `npm test` 688/688, `npm run check` OK, `node core/scripts/valida.mjs` OK; tests previos de frontmatter/estado/valida/tablero sin tocar | `npm test` 688/688 (0 fail), `npm run check` OK, `node core/scripts/valida.mjs` OK; diff f6c0324..HEAD solo toca `core/lib/frontmatter.mjs`, el test nuevo, `CHANGELOG.md`, spec y ledger (ningún test previo modificado); CHANGELOG 0.5.1 › Corregido dice qué, desde cuándo, que no hay que hacer nada y CE-FIX-2 | ✅ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->
**GREEN**: 2026-11-26, sdd-verificador. CA-1 a CA-5 cumplidos, con evidencia propia: los tests de la spec, los gates completos, 47 valores adversariales de ida y vuelta y el flujo real de `estado.mjs` + `valida.mjs` en un proyecto temporal con LF y con CRLF. Sin regresiones. Se respetan las decisiones del humano: no hay aviso de comillas desparejadas, y `nota: "simple"` pierde las comillas (lo he observado).

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-031/. Informe HTML opcional: _qa/SPEC-031/informe.html -->
n-a: sin UI (librería del núcleo y CLI).

## Salvedades / follow-ups
<!-- IDs F-SPEC-031-1, F-SPEC-031-2… con destino (spec futura o EPIC-MEJORA). -->
- Observación (no bloquea; ningún CA lo cubre): una nota entre comillas simples se reescribe con comillas dobles (`'a, b'` pasa a `"a, b"`). Una línea ya rota (`nota: "abierta, sin cerrar}`) se reescribe como `nota: "\"abierta"`. El valor parseado se conserva en los dos casos y lo único que cambia es el texto. Es coherente con CE-FIX-2 (las líneas rotas no se reparan). Sin follow-up salvo que lo pida el humano.

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->
- Implementación terminada (sdd-implementador, 2026-11-26): CA-1 a CA-5 con test en `core/tests/frontmatter-comillas.test.mjs`; el fix vive solo en `core/lib/frontmatter.mjs`, ningún consumidor cambia.
- Decisiones del humano aplicadas: sin aviso de comillas desparejadas en `valida.mjs`; `nota: "simple"` puede perder las comillas al reserializar (aceptado).
- Líneas ya rotas (comilla sin cerrar o texto tras la comilla de cierre): se leen sin comillas, igual que antes del fix; no se reparan (CE-FIX-2).
- Siguiente paso: sdd-verificador sobre la rama `ft/SPEC-031-el-historial-del-frontmatter-conserva-las-notas-con-comas-y-comillas`.
