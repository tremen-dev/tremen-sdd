---
id: SPEC-023
tipo: ledger
epica: EPIC-FIX
---
# Ledger — SPEC-023 Despacho real de subagentes en Antigravity con contexto aislado

## Resumen
- Fase: **hecho** (GREEN de sdd-verificador, 2026-10-15; verificación adversarial completa)
- Rama: `ft/SPEC-023-despacho-real-de-subagentes-en-antigravity-con-contexto-aislado`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `adapters/antigravity/skills/sdd-{arquitecto,implementador,verificador,documentalista}/SKILL.md` | `adapters/antigravity/tests/superficie.test.mjs` (roles pesados prohíben autoejecución y delegan invoke_subagent self) | Inspeccionados los 4 `SKILL.md`. Cada uno prohíbe taxativamente la autoejecución en el contexto principal e instruye a delegar con `invoke_subagent` (`TypeName: "self"`, `Role: "sdd-<rol>"`). Verificado con `node --test adapters/antigravity/tests/superficie.test.mjs` (10/10 OK) | ✅ |
| CA-2 | `adapters/antigravity/skills/sdd-orquestador/SKILL.md` | `adapters/antigravity/tests/superficie.test.mjs` (orquestador declara invoke_subagent self) | Inspeccionado `sdd-orquestador/SKILL.md` (líneas 18-32). Prescribe explícitamente `invoke_subagent` (`TypeName: "self"`, `Role: "sdd-<rol>"`) y espera de reporte vía `send_message`. Verificado con `adapters/antigravity/tests/superficie.test.mjs` | ✅ |
| CA-3 | `adapters/antigravity/agents/` (eliminado) | `adapters/antigravity/tests/superficie.test.mjs` (dist/antigravity/agents/ no existe) | Confirmada la inexistencia de `adapters/antigravity/agents/` y `dist/antigravity/agents/`. Ejecutado `npm run build:antigravity` comprobando que no genera `agents/`. Verificado con `superficie.test.mjs` | ✅ |
| CA-4 | `tools/checks/{layout,manifiestos,descripcion-fuente-unica}.mjs` | `tools/tests/layout.test.mjs` (antigravity sin agents/) | Inspeccionados `layout.mjs` (`MINIMO_COMUN = ['skills/', 'tests/']`, `EXTRAS_POR_HARNESS.antigravity` sin `agents/`), `manifiestos.mjs` (`checkManifiestosAntigravity` sin `agents/`) y `descripcion-fuente-unica.mjs`. Ejecutados `node --test tools/tests/layout.test.mjs` (21/21 OK) y `npm run check` (10/10 OK) | ✅ |
| CA-5 | `adapters/antigravity/tests/superficie.test.mjs` | `adapters/antigravity/tests/superficie.test.mjs` (suite completa en verde) | Ejecutada la suite unitaria: `node --test adapters/antigravity/tests/superficie.test.mjs` (10 tests pass, 0 fail) y `npm run test:adapter` (104 tests pass, 0 fail). Cero aserciones obsoletas sobre `agents/` | ✅ |
| CA-6 | `core/roles/es/sdd-orquestador.md` | `tools/tests/{roles-fuente-unica,nucleo-agnostico}.test.mjs` | Inspeccionada la sección "Cómo se delega" en `sdd-orquestador.md`. Prosa neutra y agnóstica al harness, nombra `invoke_subagent` (Antigravity), `Agent` (Claude/Kimi) y `task` (opencode). Aprobado por `nucleo-agnostico`, `nucleo-aislado` y `fuente-unica` | ✅ |
| CA-7 | `docs/arquitectura.md` | `tools/tests/layout.test.mjs` + `npm run check` | Inspeccionado `docs/arquitectura.md` (líneas 124-125, 249, 250, 310-313, 485-488). Describe el despacho con `invoke_subagent (self)`, la ausencia de `agents/` y la cita a ADR-014 como enmienda a ADR-013. ADR-014 aprobado. `node core/scripts/valida.mjs` OK | ✅ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

**GREEN — 2026-10-15, sdd-verificador.** 7/7 CA en ✅, cero salvedades.

**Evidencia de verificación adversarial:**
1. **Inspección de artefactos**:
   - Se verificó que las 4 skills de roles pesados en `adapters/antigravity/skills/` prohíben taxativamente la autoejecución en el hilo principal y prescriben invocar `invoke_subagent` con `TypeName: "self"` y `Role: "sdd-<rol>"`.
   - Se verificó que `adapters/antigravity/skills/sdd-orquestador/SKILL.md` prescribe delegar a los roles pesados con `invoke_subagent` (`TypeName: "self"`) y esperar el reporte vía `send_message`.
   - Se verificó la eliminación efectiva del subdirectorio `agents/` en `adapters/antigravity/` y en `dist/antigravity/`.
   - Se verificó que `tools/checks/layout.mjs` sitúa `MINIMO_COMUN = ['skills/', 'tests/']` y declara `agents/` únicamente en los extras de `claude-code`, `kimi-code` y `opencode`.
   - Se verificó que `core/roles/es/sdd-orquestador.md` describe la delegación de forma agnóstica y neutra sin tokens acoplados, preservando RN-02 y RN-06.
   - Se verificó la sincronización documental en `docs/arquitectura.md` y `docs/adr/ADR-014-despacho-de-subagentes-en-google-antigravity-con-invoke-subagent-self.md` (aprobada por Alberto Fojo).
2. **Gates automáticos ejecutados**:
   - `npm test`: 357 tests ejecutados, 357 pass, 0 fail.
   - `npm run check`: build de los 4 adaptadores + 10 invariant checks (`descripcion-fuente-unica`, `fuente-unica`, `layout`, `manifiestos`, `nucleo-agnostico`, `nucleo-aislado`, `prosa-gates`, `referencias`, `roles-fuente-unica`, `version-unica`) + `valida` en verde.
   - `node --test adapters/antigravity/tests/superficie.test.mjs`: 10 tests pass, 0 fail.
   - `node --test tools/tests/layout.test.mjs`: 21 tests pass, 0 fail.

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-023/. Informe HTML opcional: _qa/SPEC-023/informe.html -->

**n-a: SPEC-023 no tiene superficie de UI.** Es un refactor de arquitectura, infraestructura y tooling de adaptador. No aplica captura visual con Playwright. Toda la evidencia es reproducible vía tests y checks en consola.

## Salvedades / follow-ups
<!-- IDs F-SPEC-023-1, F-SPEC-023-2… con destino (spec futura o EPIC-MEJORA). -->
Ninguna. Todos los criterios de aceptación se han cumplido sin desviaciones ni degradaciones.

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->
Verificación adversarial completada con veredicto GREEN. SPEC-023 transicionada a `hecho`. Listo para cierre y documentación por sdd-documentalista.
