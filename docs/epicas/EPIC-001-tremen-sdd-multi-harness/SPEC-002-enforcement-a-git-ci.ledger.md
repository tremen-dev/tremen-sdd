---
id: SPEC-002
tipo: ledger
epica: EPIC-001
---
# Ledger — SPEC-002 Enforcement a git + CI

## Resumen
- Fase: en-revision (implementación completa, a la espera del verificador)
- Rama: `ft/SPEC-002-enforcement-a-git-ci`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `tools/install-hooks.mjs`; `tools/githooks/pre-commit` (shim sh→node); `.gitattributes` (eol=lf del shim); `package.json` (script `hooks:install`) | `tools/tests/hooks-install.test.mjs` (core.hooksPath=tools/githooks; commit ejercita el hook; cero `dependencies`; script expuesto) | | 🚧 |
| CA-2 | `tools/githooks/pre-commit.mjs` (capa require-spec, fail-closed, válvula `SDD_SKIP_GATE`) | `tools/tests/pre-commit.test.mjs` (CA-2a main aborta; SPEC-999 aborta; borrador aborta; CA-2b aprobada/en-progreso pasan; CA-2c SDD_SKIP_GATE pasa) | | 🚧 |
| CA-3 | `tools/githooks/pre-commit.mjs` (capa coherencia vía `validateFile` de `core/scripts/valida.mjs`) | `tools/tests/pre-commit.test.mjs` (CA-3 incoherente aborta; CA-3 bis coherente pasa) | | 🚧 |
| CA-4 | `tools/githooks/pre-commit.mjs` (ruta feliz) | `tools/tests/pre-commit.test.mjs` (CA-4 ruta no vigilada → exit 0) | | 🚧 |
| CA-5 | `core/lib/require-spec.mjs` (fuente única: `parseSpecId`/`buscarSpec`/`evaluarRequireSpec`); `adapters/claude-code/hooks/require-spec.mjs` y `tools/githooks/pre-commit.mjs` la **importan** | `core/tests/require-spec-decision.test.mjs` (unitario del módulo); `tools/tests/require-spec-una-logica.test.mjs` (ambas capas importan; ninguna reimplementa el parseo); `nucleo-aislado` en verde (módulo no escapa de core/) | | 🚧 |
| CA-6 | `.github/workflows/ci.yml` (npm test + npm run check); `tools/check.mjs` (build→6 checks→valida) | `tools/tests/workflow.test.mjs` (estructura y pasos); `tools/tests/check.test.mjs` (PASOS; propagación exit≠0; valida sobre árbol limpio→0 y árbol que viola RN-07→≠0) | | 🚧 |
| CA-7 | `tools/check.mjs` (incluye `nucleo-aislado` como paso requerido); `.github/workflows/ci.yml` | `tools/tests/check.test.mjs` (nucleo-aislado en PASOS; propaga exit≠0); test adversarial preexistente `tools/tests/nucleo-aislado.test.mjs` | | 🚧 |
| CA-8 | `adapters/claude-code/hooks/_comun.mjs` (`normalizaRol`, una sola vez); `adapters/claude-code/hooks/protege-verdad.mjs` (usa `normalizaRol`) | `adapters/claude-code/tests/protege-verdad.test.mjs` (CA-8: permite `tremen-sdd:sdd-arquitecto`; deniega `tremen-sdd:sdd-implementador`; permite `sdd-producto` sin prefijo) | | 🚧 |
| CA-9 | Sin cambios en `core/scripts/estado.mjs` ni en sus asserts | `core/tests/estado.test.mjs` intacto y verde; suite completa `npm test` verde (127 tests, baseline 84 + 43 nuevos) | | 🚧 |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-002/. Informe HTML opcional: _qa/SPEC-002/informe.html -->

## Salvedades / follow-ups

- **F-SPEC-002-1** — El pre-commit L2 valida la coherencia (CA-3) sobre el
  fichero del **árbol de trabajo**, no sobre el blob exactamente *staged*. Con
  el flujo normal (editar → `git add` → `git commit`) coinciden; solo diverge
  con *staging parcial* (fichero modificado tras stagearlo). Reutiliza
  `validateFile` tal cual pide CA-3. Endurecerlo a `git show :fichero` es mejora
  opcional. **Destino: EPIC-MEJORA.**
- **F-SPEC-001-2** (recordatorio, ya trazado) — el hook L1 `calidad` en modo
  `linter: auto` dispara ruido de eslint (no encuentra `eslint.config.js`) en
  cada Write/Edit durante la implementación. Es fail-open (no bloquea) y está
  **fuera de alcance** de esta spec. Destino ya asignado: EPIC-MEJORA.
- **Activación por clon (no es defecto)** — el pre-commit no queda activo hasta
  correr `npm run hooks:install` en cada clon (ADR-002, consecuencia asumida).
- **Acción humana post-merge (nota 4 de la spec, no CA)** — convertir el
  workflow en *required status check* sobre `main` es config de admin en GitHub.

## Cómo retomar (handoff)

Implementación **completa**; los 9 CA tienen código + test en verde. Suite
`npm test` = **127 tests, 0 fallos** (baseline previo 84 + 43 nuevos). El runner
real `npm run check` sale **exit 0** sobre el árbol actual.

Verificación pendiente (sdd-verificador): las columnas **Verif.** y **Estado**
del ledger están en 🚧 a la espera de su veredicto; yo (implementador) no las
toco. Comandos de verificación:

- `npm test` — suite completa (build + núcleo + tools + adaptador).
- `npm run check` — build → 6 checks → valida (lo mismo que CI).
- Tests nuevos por CA: `core/tests/require-spec-decision.test.mjs`,
  `tools/tests/{pre-commit,hooks-install,check,workflow,require-spec-una-logica}.test.mjs`,
  y los casos CA-8 en `adapters/claude-code/tests/protege-verdad.test.mjs`.

**Dogfooding / válvulas:** durante la iteración el pre-commit L2 NO estuvo
instalado (core.hooksPath sin configurar), así que ningún commit de código
necesitó válvula. Al cerrar se ejecutó `npm run hooks:install` (core.hooksPath =
`tools/githooks`), dejando el pre-commit **activo en el repo real**: este propio
commit del ledger lo atraviesa (cambio docs-only, coherente → permitido), prueba
viva de CA-4. Nota: con la spec ya en `en-revision`, el pre-commit **bloquearía**
nuevos commits de código *vigilado* (require-spec exige aprobada/en-progreso); es
el comportamiento correcto —la implementación está congelada para revisión—; si
el verificador devuelve RED, el pipeline reabre a `en-progreso`. Válvulas
auditables si hiciera falta: `git commit --no-verify` o `SDD_SKIP_GATE=1`.

Ficheros nuevos: `core/lib/require-spec.mjs`, `core/tests/require-spec-decision.test.mjs`,
`tools/githooks/{pre-commit,pre-commit.mjs}`, `tools/install-hooks.mjs`,
`tools/check.mjs`, `tools/tests/{pre-commit,hooks-install,check,workflow,require-spec-una-logica}.test.mjs`,
`.github/workflows/ci.yml`.
Editados: `adapters/claude-code/hooks/{require-spec,protege-verdad,_comun}.mjs`,
`adapters/claude-code/tests/protege-verdad.test.mjs`, `package.json`,
`.gitattributes`, `README.md`, `docs/arquitectura.md`.
