---
id: SPEC-023
tipo: ledger
epica: EPIC-FIX
---
# Ledger — SPEC-023 Despacho real de subagentes en Antigravity con contexto aislado

## Resumen
- Fase: en-revision
- Rama: `ft/SPEC-023-despacho-real-de-subagentes-en-antigravity-con-contexto-aislado`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `adapters/antigravity/skills/sdd-{arquitecto,implementador,verificador,documentalista}/SKILL.md` | `adapters/antigravity/tests/superficie.test.mjs` (roles pesados prohíben autoejecución y delegan invoke_subagent self) | | ❌ |
| CA-2 | `adapters/antigravity/skills/sdd-orquestador/SKILL.md` | `adapters/antigravity/tests/superficie.test.mjs` (orquestador declara invoke_subagent self) | | ❌ |
| CA-3 | `adapters/antigravity/agents/` (eliminado) | `adapters/antigravity/tests/superficie.test.mjs` (dist/antigravity/agents/ no existe) | | ❌ |
| CA-4 | `tools/checks/{layout,manifiestos,descripcion-fuente-unica}.mjs` | `tools/tests/layout.test.mjs` (antigravity sin agents/) | | ❌ |
| CA-5 | `adapters/antigravity/tests/superficie.test.mjs` | `adapters/antigravity/tests/superficie.test.mjs` (suite completa en verde) | | ❌ |
| CA-6 | `core/roles/es/sdd-orquestador.md` | `tools/tests/{roles-fuente-unica,nucleo-agnostico}.test.mjs` | | ❌ |
| CA-7 | `docs/arquitectura.md` | `tools/tests/layout.test.mjs` + `npm run check` | | ❌ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-023/. Informe HTML opcional: _qa/SPEC-023/informe.html -->

## Salvedades / follow-ups
<!-- IDs F-SPEC-023-1, F-SPEC-023-2… con destino (spec futura o EPIC-MEJORA). -->

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->
Implementación completa de SPEC-023 finalizada por sdd-implementador cubriendo los 7 Criterios de Aceptación. Tests unitarios (357 tests) y los 10 checks de invariantes pasando en verde. Listo para verificación adversarial por sdd-verificador.
