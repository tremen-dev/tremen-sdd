---
id: SPEC-021
tipo: ledger
epica: EPIC-006
---
# Ledger — SPEC-021 Integración de checks de invariantes y runner

## Resumen
- Fase: hecho
- Rama: `ft/SPEC-021-integracion-de-checks-de-invariantes-y-runner`

## Matriz de criterios de aceptación
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `tools/checks/layout.mjs` | `tools/tests/layout.test.mjs` | `npm test` exit 0 | ✅ |
| CA-2 | `tools/checks/referencias.mjs` | `tools/tests/referencias.test.mjs` | `npm test` exit 0 | ✅ |
| CA-3 | `tools/checks/manifiestos.mjs` | `tools/tests/manifiestos.test.mjs` | `npm test` exit 0 | ✅ |
| CA-4 | `tools/checks/descripcion-fuente-unica.mjs` | `tools/tests/descripcion-fuente-unica.test.mjs` | `npm run check` exit 0 (50 superficies) | ✅ |
| CA-5 | `tools/check.mjs` | `tools/tests/check.test.mjs` | `npm run check` exit 0 (todos en verde) | ✅ |

## Veredicto del verificador
**GREEN** (2026-10-14). El adaptador Antigravity está plenamente integrado en los guardianes de invariantes del repositorio.
- `layout`: frontera núcleo/adaptador materializada para los cuatro harnesses (`antigravity`, `claude-code`, `kimi-code`, `opencode`).
- `referencias`: todas las referencias relativas de Antigravity resuelven dentro del plugin root sin tokens de otros harnesses.
- `manifiestos`: `checkManifiestosAntigravity` valida `plugin.json`, `hooks/hooks.json` y la presencia de los 7 roles.
- `descripcion-fuente-unica`: 50 superficies (skills y agents de los 4 adaptadores) coinciden byte a byte con `_descripciones.json` (RN-11).
- `check.mjs`: `PASOS` incluye `build-antigravity`, `referencias-antigravity` y `manifiestos-antigravity`.

## Evidencia visual
n/a

## Salvedades / follow-ups
- F-SPEC-021-1: Scaffolding (`sdd-init` con `AGENTS.md`) y actualización de documentación arquitectónica en `SPEC-022`.

## Cómo retomar (handoff)
Cerrar SPEC-021 y proceder con SPEC-022 (Scaffolding y documentación).
