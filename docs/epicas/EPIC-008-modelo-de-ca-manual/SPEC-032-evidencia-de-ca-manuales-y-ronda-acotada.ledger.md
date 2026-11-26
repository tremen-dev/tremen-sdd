---
id: SPEC-032
tipo: ledger
epica: EPIC-008
---
# Ledger — SPEC-032 Evidencia de CA manuales y ronda acotada

## Resumen
- Fase: <!-- refleja el estado de la spec; la fuente de verdad es el frontmatter de la spec -->
- Rama: `ft/SPEC-032-evidencia-de-ca-manuales-y-ronda-acotada`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/salvedad sin aceptar · 🚧 en curso · ❌ sin empezar · n-a · ⏳ CA manual pendiente (solo en un CA [manual]) -->
<!-- Calificadores de ✅ (ADR-020 §4 de tremen-sdd), cada uno como mucho una vez: ✅ [desviación] (se cumplió la comprobación con otro medio) · ✅ [salvedad: <persona>, <AAAA-MM-DD>] (una persona aceptó la diferencia ese día) · ✅ [confirmado: <persona>, <AAAA-MM-DD>] (lo ejecutó un agente y la persona confirmó el resultado). -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad no aceptada por una persona nunca es ✅ (RN-12 de tremen-sdd): queda en ⚠️ hasta que una persona la acepta. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `core/lib/ca-manual.mjs` (`titulosLedger`, `leerLedger`: secciones de nivel 2 por título, títulos y cabecera de evidencia leídos de `core/templates/<idioma>/artefactos/SPEC.ledger.md`); `core/scripts/valida.mjs` y `core/scripts/estado.mjs` (`guardaHecho`) lo usan; textos `valida.ledger.*` y `estado.hecho-sin-matriz`/`-matriz-ambigua` | `core/tests/ca-manual-secciones.test.mjs`: (a) y (c) lector + valida + hecho; (b) impostora; (d) ambigua (valida nombra las dos líneas, hecho se niega); (e) sin sección; fin de sección en nivel 1/2; 1.6 títulos = plantilla por idioma y sin literales en el lector | | ❌ |
| CA-2 |  |  | | ❌ |
| CA-3 | `core/templates/es/artefactos/SPEC.ledger.md` (sección «Evidencia de CA manuales» tras la matriz, con comentario de ADR-020 §8); `tools/tests/golden/scaffold-es.json` (solo la entrada del ledger) | `tools/tests/ledger-evidencia-plantilla.test.mjs`: 3.1 cabecera y sin filas; 3.2 comentario; 3.3 lector sobre el ledger de scaffold; 3.4 valida (también con la spec pasada a modelo); 3.5 la entrada del golden es la plantilla sustituida. `tools/tests/golden-es.test.mjs` sin cambios | | ❌ |
| CA-4 |  |  | | ❌ |
| CA-5 |  |  | | ❌ |
| CA-6 |  |  | | ❌ |
| CA-7 |  |  | | ❌ |
| CA-8 |  |  | | ❌ |
| CA-9 |  |  | | ❌ |
| CA-10 |  |  | | ❌ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-032/. Informe HTML opcional: _qa/SPEC-032/informe.html -->

## Salvedades / follow-ups
<!-- IDs F-SPEC-032-1, F-SPEC-032-2… con destino (spec futura o EPIC-MEJORA). -->

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->
