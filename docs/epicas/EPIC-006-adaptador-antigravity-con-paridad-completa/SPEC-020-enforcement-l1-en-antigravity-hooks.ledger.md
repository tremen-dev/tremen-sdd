---
id: SPEC-020
tipo: ledger
epica: EPIC-006
---
# Ledger — SPEC-020 Enforcement L1 en Antigravity hooks

## Resumen
- Fase: en-revision
- Rama: `ft/SPEC-020-enforcement-l1-en-antigravity-hooks`

## Matriz de criterios de aceptación
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `adapters/antigravity/hooks/hooks.json` | `adapters/antigravity/tests/enforcement.test.mjs` | `npm test` exit 0 | ✅ |
| CA-2 | `adapters/antigravity/hooks/_comun.mjs` | `adapters/antigravity/tests/enforcement.test.mjs` (`CA-3: require-spec deniega...`) | `npm test` exit 0 | ✅ |
| CA-3 | `adapters/antigravity/hooks/require-spec.mjs` | `adapters/antigravity/tests/enforcement.test.mjs` (`CA-3: require-spec...`) | `npm test` exit 0 | ✅ |
| CA-4 | `adapters/antigravity/hooks/protege-verdad.mjs` | `adapters/antigravity/tests/enforcement.test.mjs` (`CA-4: protege-verdad...`) | `npm test` exit 0 | ✅ |
| CA-5 | `adapters/antigravity/tests/enforcement.test.mjs` | `adapters/antigravity/tests/enforcement.test.mjs` | `node --test` exit 0 (pass 7) | ✅ |

## Veredicto del verificador
**GREEN** (2026-10-14). Enforcement L1 de Antigravity implementado y verificado.
- `hooks.json` intercepta `PreToolUse` sobre `write_to_file|replace_file_content|multi_replace_file_content`.
- Emite `{ decision: 'deny', reason }` bloqueando de forma dura cualquier edición no autorizada fuera de rama `ft/SPEC-NNN` con spec aprobada.
- Degrada fail-open ante ausencia de `.sdd.json` o con `SDD_SKIP_GATE=1`.
- Tests unitarios dedicados pasan con 7/7 casos en verde.

## Evidencia visual
n/a (lógica de hooks de CLI/IDE)

## Salvedades / follow-ups
- F-SPEC-020-1: Generalizar checks de invariantes (`manifiestos.mjs`, `referencias.mjs`, etc.) en `SPEC-021`.

## Cómo retomar (handoff)
Cerrar SPEC-020 y proceder con SPEC-021 (Integración de checks de invariantes y runner).
