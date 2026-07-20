---
id: SPEC-002
tipo: ledger
epica: EPIC-001
---
# Ledger — SPEC-002 Enforcement a git + CI

## Resumen
- Fase: en-progreso (REABIERTA tras RED de verificación en CI real; dos fixes
  cross-platform aplicados —guard CLI de entrypoint y bit +x del shim del
  pre-commit—, a la espera de re-verificación)
- Rama: `ft/SPEC-002-enforcement-a-git-ci`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `tools/install-hooks.mjs` (fija core.hooksPath **+ `chmodSync(shim, 0o755)`**); `tools/githooks/pre-commit` (shim sh→node, **modo git 100755 vía `git update-index --chmod=+x`**); `.gitattributes` (eol=lf del shim); `package.json` (script `hooks:install`). **FIX cross-platform (2ª reapertura):** en Linux git no ejecuta un hook sin bit +x → el pre-commit se saltaba y el commit procedía (exit 0) | `tools/tests/hooks-install.test.mjs` (core.hooksPath=tools/githooks; commit ejercita el hook; cero `dependencies`; script expuesto; **regresión cross-platform: `git ls-files -s` del shim empieza por `100755`, determinista en cualquier SO**) | Ejercido en vivo (Win/Git Bash): clon fresco sin `core.hooksPath` → `node tools/install-hooks.mjs` fija `core.hooksPath=tools/githooks` → commit vigilado en `main` **bloqueado** con RN-01 (shim sh→node OK). `package.json` **sin** clave `dependencies` (verificado). Repo real: `core.hooksPath=tools/githooks`. | ✅ |
| CA-2 | `tools/githooks/pre-commit.mjs` (capa require-spec, fail-closed, válvula `SDD_SKIP_GATE`) | `tools/tests/pre-commit.test.mjs` (CA-2a main aborta; SPEC-999 aborta; borrador aborta; CA-2b aprobada/en-progreso pasan; CA-2c SDD_SKIP_GATE pasa) | Ejercido en 7 repos git temporales con el hook real: `main`+vigilada→exit 1; `ft/SPEC-999` inexistente+vigilada→exit 1; spec `borrador`+vigilada→exit 1; `ft/SPEC-002` `aprobada`+vigilada→exit 0; `en-progreso`+vigilada→exit 0; `SDD_SKIP_GATE=1`→exit 0; `--no-verify`→exit 0. Mensaje de aborto cita RN-01 y ambas válvulas. | ✅ |
| CA-3 | `tools/githooks/pre-commit.mjs` (capa coherencia vía `validateFile` de `core/scripts/valida.mjs`) | `tools/tests/pre-commit.test.mjs` (CA-3 incoherente aborta; CA-3 bis coherente pasa) | Ejercido en repos temporales: artefacto con `estado: aprobada` e historial acabado en `borrador`→commit **aborta** (exit 1, cita RN-07 vía `validateFile`); artefacto coherente→exit 0. | ✅ |
| CA-4 | `tools/githooks/pre-commit.mjs` (ruta feliz) | `tools/tests/pre-commit.test.mjs` (CA-4 ruta no vigilada → exit 0) | Ejercido: `README.md` (no vigilada) en `main`→commit **exit 0** sin fricción. (También ruta feliz vigilada+spec válida en CA-2b.) | ✅ |
| CA-5 | `core/lib/require-spec.mjs` (fuente única: `parseSpecId`/`buscarSpec`/`evaluarRequireSpec`); `adapters/claude-code/hooks/require-spec.mjs` y `tools/githooks/pre-commit.mjs` la **importan** | `core/tests/require-spec-decision.test.mjs` (unitario del módulo); `tools/tests/require-spec-una-logica.test.mjs` (ambas capas importan; ninguna reimplementa el parseo); `nucleo-aislado` en verde (módulo no escapa de core/) | Inspección adversarial (grep source): `RAMA_SPEC_RE`/`ESTADOS_CODEABLES` viven **solo** en `core/lib/require-spec.mjs`. L1 y L2 **importan** `evaluarRequireSpec` y solo obtienen la rama (`git rev-parse --abbrev-ref`); ninguno reparsea `ft/SPEC` ni el estado. `nucleo-aislado` en verde en `npm run check`. | ✅ |
| CA-6 | `.github/workflows/ci.yml` (npm test + npm run check); `tools/check.mjs` (build→6 checks→valida). **FIX cross-platform (reapertura):** guard de entrypoint CLI extraído a fuente única `core/lib/entrypoint.mjs` (`esEntrypoint` con `pathToFileURL`) y aplicado a los 13 `.mjs` con CLI (5 `core/scripts/`, `tools/{build-adapter,check}`, 6 `tools/checks/`). El idiom viejo `file:///${argv1}` era no-op en Linux (4 barras) → `npm run build` no ensamblaba `dist/` en CI Ubuntu → caían los tests de hooks | `tools/tests/workflow.test.mjs` (estructura y pasos); `tools/tests/check.test.mjs` (PASOS; propagación exit≠0; valida sobre árbol limpio→0 y árbol que viola RN-07→≠0); **`core/tests/entrypoint.test.mjs` (regresión cross-platform del helper: reconoce ruta POSIX y Windows como entrypoint, rechaza fichero distinto; falla con el idiom viejo en cualquier SO)** | `ci.yml` YAML válido (`yaml.safe_load` OK, sin tabs); pasos `npm test` + `npm run check` con checkout+setup-node. `npm run check` real→**exit 0** sobre el árbol; `valida --dir` sobre árbol que viola RN-07→**exit 1**; runner propaga exit≠0 (test real). | ✅ |
| CA-7 | `tools/check.mjs` (incluye `nucleo-aislado` como paso requerido); `.github/workflows/ci.yml` | `tools/tests/check.test.mjs` (nucleo-aislado en PASOS; propaga exit≠0); test adversarial preexistente `tools/tests/nucleo-aislado.test.mjs` | `PASOS` de `tools/check.mjs` incluye `nucleo-aislado` (`node tools/checks/nucleo-aislado.mjs`) como paso requerido; `npm run check` lo ejecuta (`[nucleo-aislado] OK`) y propaga exit≠0. Test adversarial `nucleo-aislado.test.mjs` verde en la suite. | ✅ |
| CA-8 | `adapters/claude-code/hooks/_comun.mjs` (`normalizaRol`, una sola vez); `adapters/claude-code/hooks/protege-verdad.mjs` (usa `normalizaRol`) | `adapters/claude-code/tests/protege-verdad.test.mjs` (CA-8: permite `tremen-sdd:sdd-arquitecto`; deniega `tremen-sdd:sdd-implementador`; permite `sdd-producto` sin prefijo) | Ejercido contra el hook **construido en `dist/claude-code/hooks/protege-verdad.mjs`** editando `docs/fundacion/reglas.md`: `tremen-sdd:sdd-arquitecto`→**permite** (sin deny, exit 0); `tremen-sdd:sdd-implementador`→**deniega** (JSON deny); `sdd-producto` sin prefijo→**permite**; control `sdd-implementador` sin prefijo→deniega (compat). `normalizaRol` definido una vez en `_comun.mjs`. | ✅ |
| CA-9 | Sin cambios en `core/scripts/estado.mjs` ni en sus asserts | `core/tests/estado.test.mjs` intacto y verde; suite completa `npm test` verde (127 tests, baseline 84 + 43 nuevos) | `git diff main...HEAD` de `core/scripts/estado.mjs` y `core/tests/estado.test.mjs` **vacío** (sin cambios). Suite completa `npm test` = **127 tests, 0 fallos**. Regresión de specs migradas no agravada. | ✅ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

**GREEN — 2026-07-20 (sdd-verificador).** Los 9 CA cumplidos con evidencia
ejercida, no solo tests existentes. Verificado adversarialmente:

- **Suite real**: `npm test` = 127 tests, 0 fallos. `npm run check` = exit 0.
- **Pre-commit L2 (CA-2/3/4) ejercido en repos git temporales** con el hook
  real (`core.hooksPath`→`tools/githooks`): fail-closed real ante rama no-spec /
  spec inexistente / spec en `borrador` / artefacto incoherente; permite en rama
  de spec `aprobada`/`en-progreso`, artefacto coherente y ruta no vigilada. Las
  **dos válvulas** (`SDD_SKIP_GATE=1` y `--no-verify`) permiten el commit que de
  otro modo abortaría. Mensaje de aborto cita RN-01/RN-07 y las válvulas.
- **Una sola lógica (CA-5)**: la decisión require-spec vive solo en
  `core/lib/require-spec.mjs`; L1 y L2 la **importan** y no reparsean rama/estado
  (confirmado por grep del source, no solo por test). `nucleo-aislado` en verde.
- **CI (CA-6/7)**: `ci.yml` YAML válido; invoca `npm test` + `npm run check`;
  el runner incluye `nucleo-aislado` como paso requerido y propaga exit≠0
  (exit 0 en árbol real, exit 1 en árbol que viola RN-07).
- **CA-8**: `protege-verdad` en `dist/` reconoce al dueño con prefijo de plugin
  (permite `tremen-sdd:sdd-arquitecto`, deniega `tremen-sdd:sdd-implementador`,
  permite `sdd-producto` sin prefijo).
- **CA-1/CA-9**: install-hooks reproducible end-to-end; `estado.mjs`/
  `estado.test.mjs` sin cambios; cero `dependencies` de terceros.

Salvedad **F-SPEC-002-1** (coherencia sobre árbol de trabajo, no blob staged en
staging parcial) aceptada como follow-up a EPIC-MEJORA; usa `validateFile` tal
como pide CA-3, no bloquea. No es CA en RED.

Nota: la aprobación de la spec (gate humano) NO la ejecuta el verificador.

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

### Reapertura 2026-07-21 — bug cross-platform del guard CLI (RED en CI real)

La verificación previa (GREEN) solo se ejerció en **Windows**. El GitHub Actions
real (Ubuntu) destapó un bug que rompía el build en Linux: los 13 `.mjs` con
entrypoint CLI usaban el idiom
`import.meta.url === new URL(\`file:///${argv1.replaceAll('\\\\','/')}\`).href`,
correcto **solo** en Windows. En Linux `argv1` empieza por `/`, así que
`file:///` + `/home/…` = `file:////home/…` (CUATRO barras) y **nunca** casa con
el `import.meta.url` de tres barras → el bloque CLI **no se ejecutaba**.
Consecuencia: `node tools/build-adapter.mjs` era no-op → `npm run build` no
ensamblaba `dist/` → los tests de hooks del adaptador fallaban
(`Cannot find module dist/claude-code/hooks/*.mjs`).

**Arreglo (TDD):** extraída la decisión a **fuente única** `core/lib/entrypoint.mjs`
(`export function esEntrypoint(importMetaUrl, argv1)` con `pathToFileURL` de
`node:url`, que normaliza igual en todo SO). Las **13** ocurrencias reemplazadas
por `if (esEntrypoint(import.meta.url, process.argv[1])) {`:
`core/scripts/{valida,estado,scaffold,tablero,informe-qa}.mjs`,
`tools/{build-adapter,check}.mjs`,
`tools/checks/{layout,nucleo-aislado,fuente-unica,referencias,roles-fuente-unica,manifiestos}.mjs`.
Dirección de dependencia respetada (tools/checks → core/lib; el núcleo no importa
adaptadores) → `nucleo-aislado` sigue verde.

**Test de regresión** `core/tests/entrypoint.test.mjs`: unitario del helper,
**independiente de la plataforma** — reconoce como entrypoint una ruta POSIX
(`pathToFileURL('/tmp/foo.mjs').href` + argv1 `/tmp/foo.mjs`) y una Windows,
rechaza un fichero distinto y el caso "sólo importado" (sin argv1). Falla con el
idiom viejo en **cualquier** SO (el POSIX daba cuatro barras). Primero en RED
(módulo inexistente), luego GREEN con el helper.

**Verificación local (Windows):** `npm test` = **131 tests, 0 fallos** (127
previos + 4 del helper). `npm run build` ensambla `dist/claude-code/` con la
superficie de hooks (`protege-verdad`, `require-spec`, `calidad`, `_comun`,
`hooks.json`) y copia `core/lib/entrypoint.mjs` a `dist/…/core/lib/`.
`npm run check` = **exit 0** (build + 6 checks + valida). CLI vivos, no no-op:
`node core/scripts/valida.mjs --dir docs` → `[valida] OK`; los 6 checks imprimen
su `[…] OK` como subprocesos. **Pendiente: re-verificación en CI real (Ubuntu)**
por sdd-verificador — es justo lo que este arreglo pretende poner en verde.

### Reapertura 2026-07-21 (2) — bit +x del shim del pre-commit (RED en CI real)

Con el build ya verde en Linux, el CI real dejó **5 RED**, todos del pre-commit
(CA-1b, CA-2a y variantes, CA-3): los tests esperaban que el commit **abortara**
(exit≠0) y en Linux obtenían exit 0 → el pre-commit **no bloqueaba**.

**Causa raíz:** el shim `tools/githooks/pre-commit` estaba committeado con modo
git **100644 (no ejecutable)**. En POSIX git **no ejecuta** un hook sin bit +x →
el hook se salta → el commit procede. En Windows pasaba porque git no rastrea el
bit de ejecución. Además `install-hooks.mjs` no hacía `chmod` y el test copia el
dir con `fs.cpSync` (preserva 644) antes de instalar.

**Arreglo:**
1. `git update-index --chmod=+x tools/githooks/pre-commit` → shim committeado como
   **100755** (verificado con `git ls-files -s`; el blob no cambia, LF intacto).
2. `tools/install-hooks.mjs` ahora hace `fs.chmodSync('tools/githooks/pre-commit',
   0o755)` tras fijar `core.hooksPath` → el setup garantiza el +x aunque el fichero
   llegue sin él (esto arregla también el test, que instala tras el `cpSync`).
3. Test de regresión **platform-independent** en `tools/tests/hooks-install.test.mjs`:
   asserta que `git ls-files -s tools/githooks/pre-commit` empieza por `100755`
   (el modo del índice git es determinista en cualquier SO; el bit del filesystem
   no es fiable en Windows).

**Verificación local (Windows):** `npm test` = **132 tests, 0 fallos** (131 + 1
del modo git). Los 5 tests que fallaban en Linux dependen de que install-hooks
deje el shim ejecutable en el repo temporal; con (2) deberían pasar también en
Linux. **Pendiente: re-vigilar el CI real (Ubuntu)** por el coordinador.

### Estado de la implementación (previo, sigue vigente)

Implementación **completa**; los 9 CA tienen código + test en verde. Suite
`npm test` = **131 tests, 0 fallos** (127 previos + 4 del helper de entrypoint).
El runner real `npm run check` sale **exit 0** sobre el árbol actual.

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
Nuevos por la reapertura (fix cross-platform): `core/lib/entrypoint.mjs`,
`core/tests/entrypoint.test.mjs`.
Editados: `adapters/claude-code/hooks/{require-spec,protege-verdad,_comun}.mjs`,
`adapters/claude-code/tests/protege-verdad.test.mjs`, `package.json`,
`.gitattributes`, `README.md`, `docs/arquitectura.md`.
Editados por la reapertura 1 (guard CLI → `esEntrypoint`):
`core/scripts/{valida,estado,scaffold,tablero,informe-qa}.mjs`,
`tools/{build-adapter,check}.mjs`,
`tools/checks/{layout,nucleo-aislado,fuente-unica,referencias,roles-fuente-unica,manifiestos}.mjs`.
Editados por la reapertura 2 (bit +x del shim): `tools/install-hooks.mjs`
(añade `chmodSync`), `tools/tests/hooks-install.test.mjs` (test de modo git),
y modo git de `tools/githooks/pre-commit` (100644 → 100755, sin cambio de contenido).
