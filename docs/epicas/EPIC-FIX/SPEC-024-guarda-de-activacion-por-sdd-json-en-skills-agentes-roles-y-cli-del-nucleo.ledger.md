---
id: SPEC-024
tipo: ledger
epica: EPIC-FIX
---
# Ledger — SPEC-024 Guarda de activacion por sdd-json en skills agentes roles y CLI del nucleo

## Resumen
- Fase: en-revision
- Rama: `ft/SPEC-024-guarda-de-activacion-por-sdd-json-en-skills-agentes-roles-y-cli-del-nucleo`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | core/roles/es/sdd-*.md | tools/tests/prosa-gates.test.mjs ("SPEC-024 CA-1") | | ❌ |
| CA-2 | adapters/*/skills/sdd-*/SKILL.md | tools/tests/prosa-gates.test.mjs ("SPEC-024 CA-2") | | ❌ |
| CA-3 | adapters/*/agents/**/*.md, adapters/*/commands/sdd-init.md | tools/tests/prosa-gates.test.mjs ("SPEC-024 CA-3") | | ❌ |
| CA-4 | tools/checks/prosa-gates.mjs | tools/tests/prosa-gates.test.mjs ("SPEC-024 CA-4") | | ❌ |
| CA-5 | core/lib/entrypoint.mjs | core/tests/entrypoint.test.mjs ("SPEC-024 CA-5") | | ❌ |
| CA-6 | core/scripts/*.mjs, tools/tests/check.test.mjs | core/tests/cli-sdd-guard.test.mjs ("SPEC-024 CA-6") | | ❌ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-024/. Informe HTML opcional: _qa/SPEC-024/informe.html -->

## Salvedades / follow-ups
<!-- IDs F-SPEC-024-1, F-SPEC-024-2… con destino (spec futura o EPIC-MEJORA). -->

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->
- Implementación de SPEC-024 (CA-1 a CA-6) completada por `sdd-implementador`.
- CA-1: Precondición `.sdd.json` y orden de parada añadidos a los 7 roles canónicos de `core/roles/es/sdd-*.md`.
- CA-2: Precondición `.sdd.json` y orden de parada añadidos a las 26 skills de los 4 adaptadores (`claude-code`, `kimi-code`, `opencode`, `antigravity`), eliminando el antipatrón de auto-ejecución sin `.sdd.json`.
- CA-3: Precondición `.sdd.json` añadida a `## Arranque obligatorio` de los 18 agentes (`claude-code`, `kimi-code`, `opencode`), y comandos `sdd-init.md` actualizados para estampar `.sdd.json` en paso 2 antes de invocar `valida.mjs`.
- CA-4: Check mecánico `checkPrecondicionSdd` implementado en `tools/checks/prosa-gates.mjs` autodescubriendo los 51 ficheros, y cableado en el CLI y en el runner `npm run check`.
- CA-5: Funciones puras `buscarRaizSdd(desde)` y `exigirProyectoSdd(desde)` exportadas en `core/lib/entrypoint.mjs` (fail-closed al encontrar `.git` sin `.sdd.json`).
- CA-6: Barrera fail-closed en el CLI de los 5 scripts del núcleo (`scaffold.mjs`, `estado.mjs`, `tablero.mjs`, `valida.mjs`, `informe-qa.mjs`), manteniendo puras las funciones exportadas, y fixture `arbolDocs` en `tools/tests/check.test.mjs` adaptado para incluir `.sdd.json`.
- Estado: spec transicionada a `en-revision`. Lista para verificación adversarial por `sdd-verificador`.
