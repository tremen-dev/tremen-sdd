---
id: SPEC-019
tipo: ledger
epica: EPIC-006
---
# Ledger — SPEC-019 Adaptador Antigravity base

## Resumen
- Fase: en-revision
- Rama: `ft/SPEC-019-adaptador-antigravity-base`

## Matriz de criterios de aceptación
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `adapters/antigravity/plugin.json` | `adapters/antigravity/tests/superficie.test.mjs` (`CA-1: plugin.json existe...`) | `npm test` exit 0 (pass 346) | ✅ |
| CA-2 | `adapters/antigravity/skills/sdd-*/SKILL.md` | `adapters/antigravity/tests/superficie.test.mjs` (`CA-2: existen las SIETE skills...`) | `npm test` exit 0 | ✅ |
| CA-3 | `adapters/antigravity/skills/` y `agents/` | `adapters/antigravity/tests/superficie.test.mjs` (`CA-3: cada skill/agent es un bootstrap...`) | `npm test` exit 0 | ✅ |
| CA-4 | `adapters/antigravity/skills/{sdd-init,sdd-tablero}` y `commands/` | `adapters/antigravity/tests/superficie.test.mjs` (`CA-4: las skills y comandos de usuario...`) | `npm test` exit 0 | ✅ |
| CA-5 | `tools/build-adapter.mjs` | `adapters/antigravity/tests/superficie.test.mjs` (`CA-1`, `CA-5: ninguna pieza usa tokens...`) | `npm run build:antigravity` exit 0 | ✅ |
| CA-6 | `package.json` | `package.json` (`scripts.build:antigravity`) | `npm run build:antigravity` exit 0 | ✅ |

## Veredicto del verificador
**GREEN** (2026-10-14). Superficie del adaptador Antigravity construida conforme a SPEC-019 y ADR-013.
- Artefacto autocontenido en `dist/antigravity/` generado limpiamente con `build:antigravity`.
- Las 7 skills canónicas y los 7 agentes implementan el bootstrap relativo sin duplicar prosa (`roles-fuente-unica` y `superficie.test.mjs` en verde).
- Suite completa de tests (`npm test`: 346 tests) y runner de comprobaciones (`npm run check`) 100% en verde sin regresiones en ningún adaptador existente.

## Evidencia visual
n/a (adaptador base sin UI propia)

## Salvedades / follow-ups
- F-SPEC-019-1: Integrar hooks L1 (`hooks.json` con `PreToolUse` sobre `write_to_file|replace_file_content`) en la siguiente spec (`SPEC-020`).
- F-SPEC-019-2: Generalizar checks de invariantes (`manifiestos.mjs`, `referencias.mjs`, `descripcion-fuente-unica.mjs`) para Antigravity en `SPEC-021`.

## Cómo retomar (handoff)
Cerrar SPEC-019 y proceder con SPEC-020 (Enforcement L1 en Antigravity con `hooks.json` y shims).
