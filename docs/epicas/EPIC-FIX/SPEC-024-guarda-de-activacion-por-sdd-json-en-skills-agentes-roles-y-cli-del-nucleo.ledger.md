---
id: SPEC-024
tipo: ledger
epica: EPIC-FIX
---
# Ledger — SPEC-024 Guarda de activacion por sdd-json en skills agentes roles y CLI del nucleo

## Resumen
- Fase: hecho
- Rama: `ft/SPEC-024-guarda-de-activacion-por-sdd-json-en-skills-agentes-roles-y-cli-del-nucleo`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | core/roles/es/sdd-*.md | tools/tests/prosa-gates.test.mjs ("SPEC-024 CA-1") | Inspección de 7 roles en `core/roles/es/`: todos contienen la precondición `.sdd.json` y orden de parada inmediata. `nucleo-agnostico.mjs` en verde. | ✅ |
| CA-2 | adapters/*/skills/sdd-*/SKILL.md | tools/tests/prosa-gates.test.mjs ("SPEC-024 CA-2") | Verificadas 26 skills fuente y 26 en `dist/`: sin antipatrón de fallback, con precondición `.sdd.json` y parada inmediata. Prompt de invoke_subagent en 4 roles pesados de antigravity incluye comprobación de `.sdd.json`. | ✅ |
| CA-3 | adapters/*/agents/**/*.md, adapters/*/commands/sdd-init.md | tools/tests/prosa-gates.test.mjs ("SPEC-024 CA-3") | Verificados 18 bootstraps de agentes en claude-code, kimi-code y opencode: sección `## Arranque obligatorio` con guarda `.sdd.json` y parada. `sdd-init.md` (Paso 2) estampa `.sdd.json` antes de correr `valida.mjs`. `roles-fuente-unica` y `referencias` en verde. | ✅ |
| CA-4 | tools/checks/prosa-gates.mjs | tools/tests/prosa-gates.test.mjs ("SPEC-024 CA-4") | `checkPrecondicionSdd` autodescubre 51 ficheros, detecta antipatrón, omisión y falta de parada en fixtures sintéticos, pasa en verde (0 infractores) en el árbol real y CLI sale con código 0. Cableado en `check.mjs`. | ✅ |
| CA-5 | core/lib/entrypoint.mjs | core/tests/entrypoint.test.mjs ("SPEC-024 CA-5") | `buscarRaizSdd` y `exigirProyectoSdd` resuelven raíz con `.sdd.json` (incluyendo subdirectorios), cortan en frontera `.git` sin `.sdd.json` devolviendo null / lanzando error con mención a `/sdd-init`. `nucleo-aislado.mjs` en verde (solo `node:*`). | ✅ |
| CA-6 | core/scripts/*.mjs, tools/tests/check.test.mjs | core/tests/cli-sdd-guard.test.mjs ("SPEC-024 CA-6") | Barrera fail-closed verificada en CLI de `scaffold.mjs`, `estado.mjs`, `tablero.mjs`, `valida.mjs`, `informe-qa.mjs` (exit != 0 y no tocan disco sin `.sdd.json`; exit 0 con `.sdd.json`). Funciones programáticas exportadas puras. `npm test` (373 tests) y `npm run check` (10 checks + valida) 100% en verde. | ✅ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->
- **Veredicto**: `GREEN`
- **Fecha**: 2026-10-16
- **Verificador**: `sdd-verificador`
- **Resumen**: Verificación adversarial e independiente completada sobre la rama `ft/SPEC-024-guarda-de-activacion-por-sdd-json-en-skills-agentes-roles-y-cli-del-nucleo`. Los 6 criterios de aceptación (CA-1 a CA-6) están plenamente cumplidos con evidencia en código, tests unitarios, checks mecánicos y ejecución CLI real. Gates automáticos del proyecto en verde: `npm run build:all` (exit 0), `npm test` (373 tests pass, 0 fail), `npm run check` (10 checks + valida OK).

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-024/. Informe HTML opcional: _qa/SPEC-024/informe.html -->
- No aplica: no hay componentes UI ni interfaces visuales afectadas (cambios de prosa en roles/skills/agentes, check de invariantes y barrera estructural en scripts CLI).

## Salvedades / follow-ups
<!-- IDs F-SPEC-024-1, F-SPEC-024-2… con destino (spec futura o EPIC-MEJORA). -->
- Ninguna.

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
