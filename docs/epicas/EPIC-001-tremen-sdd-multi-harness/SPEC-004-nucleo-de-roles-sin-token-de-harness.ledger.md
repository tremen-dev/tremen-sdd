---
id: SPEC-004
tipo: ledger
epica: EPIC-001
---
# Ledger — SPEC-004 Nucleo de roles sin token de harness

## Resumen
- Fase: en-revision (implementación completa, pendiente de verificación).
- Rama: `ft/SPEC-004-nucleo-de-roles-sin-token-de-harness`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 (núcleo sin token de harness) | `core/roles/es/*.md` (rename `${CLAUDE_PLUGIN_ROOT}`→`${SDD_ROOT}`, 9 sitios, 6 ficheros); `tools/checks/nucleo-agnostico.mjs` (allowlist `${SDD_*}` sobre prosa de `core/`) | `tools/tests/nucleo-agnostico.test.mjs` › "el núcleo real (tras el rename) es agnóstico"; contaminados `${CLAUDE_PLUGIN_ROOT}`/`${GEMINI_ROOT}`/`${KIMI_HOME}` fallan | | |
| CA-2 (referencia neutral; cuerpo intacto) | `core/roles/es/*.md` (solo rename del prefijo; `## Misión`/`## Flujo`/`## Reglas duras` sin tocar) | `nucleo-agnostico.test.mjs` › `${SDD_ROOT}/<ruta>` resoluble y plantilla `<…>` ignorada; check `roles-fuente-unica` verde (ningún agent embebe el cuerpo); `git diff` = 9 ins / 9 del, solo prefijo | | |
| CA-3 (check de invariante en CI) | `tools/checks/nucleo-agnostico.mjs`; cableado en `tools/check.mjs` (paso `nucleo-agnostico`) | `tools/tests/nucleo-agnostico.test.mjs` (7 casos: agnóstico pasa, contaminados fallan nombrando fichero+token, `${SDD_ROOT}/<ruta>` inexistente falla); `tools/tests/check.test.mjs` › "nucleo-agnostico está cableado en el runner" | | |
| CA-4 (retirar el parche del pase Kimi) | `tools/checks/referencias.mjs` (eliminado el filtro `enAdaptador` que excluía `core/` en `referenciasKimi`; `dist/<harness>/core/` queda cubierto) | `tools/tests/referencias.test.mjs` › "el pase Kimi ya no excluye core/…" (token bajo `dist/kimi/core/` con ruta que resuelve → falla por plugin-root); build kimi real: `referencias.mjs kimi-code` verde | | |
| CA-5 (ambos adaptadores resuelven; bootstrap mapea `${SDD_ROOT}`) | Claude: `adapters/claude-code/agents/*.md` (4) y `skills/{sdd-producto,sdd-orquestador,sdd-como-vamos}/SKILL.md` (mapeo `${SDD_ROOT}`→`${CLAUDE_PLUGIN_ROOT}`); Kimi: `adapters/kimi-code/agents/prompts/*.md` (7) (mapeo `${SDD_ROOT}`→raíz del artefacto, ruta relativa) | Checks sobre dist: `referencias` (claude) y `referencias-kimi` verdes; `roles-fuente-unica` (ambos) verde; `npm test` incluye tests de superficie de ambos adaptadores | | |
| CA-6 (no regresión; `estado.mjs` no agravado) | Sin cambios en `core/scripts/estado.mjs` ni rutas vigiladas; runner `tools/check.mjs` con el paso nuevo | `npm test` 196/196 verde (core + tools + ambos adaptadores); `npm run check` verde; `git diff --name-only` no incluye `core/scripts/estado.mjs`; `core/tests/estado.test.mjs` intacto | | |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-004/. Informe HTML opcional: _qa/SPEC-004/informe.html -->

## Salvedades / follow-ups
<!-- IDs F-SPEC-004-1, F-SPEC-004-2… con destino (spec futura o EPIC-MEJORA). -->

- Ninguna nueva bloqueante. El check `nucleo-agnostico` analiza solo la **prosa**
  (`.md`) de `core/` (roles y plantillas), que es donde vive la fuga de token de
  harness (CE-1/CE-3); los `.mjs`/imports ya los cubre `nucleo-aislado`. Ampliar el
  allowlist a otros tipos de fichero del núcleo sería un follow-up de higiene, no
  necesario para SPEC-004.
- Inconsistencia menor preexistente **corregida de paso** dentro del alcance de
  CA-5: los tres bootstraps-skill (`sdd-producto`, `sdd-orquestador`, `sdd-como-vamos`)
  listaban los scripts como `scripts/<x>.mjs` (sin `core/`), mientras los agents usaban
  `core/scripts/<x>.mjs`. El nuevo párrafo de mapeo uniforma ambos a `${SDD_ROOT}/core/scripts/<x>.mjs`.
- Regresión conocida de `estado.mjs` (specs migradas): **no tocada, no agravada**
  (fuera de alcance por decisión de la spec).

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->

Implementación **completa**, todos los CA cubiertos con test. Estado: `en-revision`.

- **Verificación pendiente** (sdd-verificador): rellenar columnas Verif./Estado y el
  veredicto. Comandos de verificación reproducibles:
  - `npm test` → 196/196 verde (build claude+kimi + core + tools + ambos adaptadores).
  - `npm run check` → build + los 7 checks (incl. `nucleo-agnostico`) + `valida`, verde.
  - `node tools/checks/nucleo-agnostico.mjs` → OK (cero tokens de harness en `core/`).
  - `grep -rn 'CLAUDE_PLUGIN_ROOT' core/roles/` → sin resultados (0 tokens; antes 9).
  - `git diff core/roles/es/` → 9 ins / 9 del, exclusivamente el prefijo del token.
- **Núcleo agnóstico**: `core/roles/es/*.md` usa `${SDD_ROOT}`; el token del harness
  vive solo en la superficie de cada adaptador (bootstrap).
- **Sin rutas vigiladas tocadas**; `core/scripts/estado.mjs` intacto.
- Nota de entorno: el hook PostToolUse del plugin instalado (0.3.0) dispara `eslint`
  sin config y emite ruido en cada escritura; es ajeno al repo (el pre-commit real,
  `tools/githooks/pre-commit.mjs`, no usa eslint) y no afecta a build/checks/tests.
