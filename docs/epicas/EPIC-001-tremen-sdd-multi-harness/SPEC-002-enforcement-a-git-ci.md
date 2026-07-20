---
id: SPEC-002
tipo: spec
epica: EPIC-001
estado: hecho
aprobada-por:
historial:
  - {estado: borrador, fecha: 2026-07-20, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-20, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-07-20, por: Alberto Fojo}
  - {estado: en-revision, fecha: 2026-07-20, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-07-20, por: sdd-verificador}
  - {estado: en-revision, fecha: 2026-07-20, por: sdd-implementador}
  - {estado: hecho, fecha: 2026-07-20, por: Alberto Fojo}
---
# SPEC-002 — Enforcement a git + CI

## Problema

El enforcement de tremen-sdd vive hoy solo como tres hooks del adaptador Claude
Code (`adapters/claude-code/hooks/`), todos **fail-open**. Eso deja dos agujeros
que EPIC-001 obliga a cerrar:

- **Atado al harness (CE-4 / RN-03)**: si el harness no tiene hooks, o alguien
  edita por fuera (git directo, otro editor, un segundo harness sin la config de
  hooks), la garantía "**nada se codea sin spec aprobada**" (RN-01) no se sostiene.
- **Fail-open no es garantía**: los hooks avisan pero por diseño nunca bloquean.
  RN-01 exige una capa que **bloquee de verdad**, independiente del harness.

Además, dos defectos abiertos tocan esta zona y entran aquí:

- **CE-1 sin guardián automático**: `tools/checks/nucleo-aislado.mjs` (regla de
  dependencia adaptador→núcleo, RN-02) existe pero no corre en ningún CI; solo se
  ejerce vía su test. La regla debe vigilarse en cada PR.
- **F-SPEC-001-3** (ledger de SPEC-001, y `[ABIERTO]` en `contexto.md`):
  `protege-verdad.mjs` compara `payload.agent_type` contra
  `['main','sdd-arquitecto','sdd-producto']`, pero el subagente de plugin llega
  como `tremen-sdd:sdd-arquitecto` y **no casa** → el dueño legítimo
  (arquitecto/producto) ve **denegada** la escritura de documentos de verdad. Es
  código vigilado (`adapters/claude-code/hooks/`), así que se arregla en esta spec.

Esta spec materializa el modelo de enforcement en capas de **ADR-002** para el
**propio repo tremen-sdd** (dogfooding, RN-10): saca las garantías duras a **git
pre-commit** (fail-closed local) y **GitHub Actions** (fail-closed autoritativo),
**reutilizando** la lógica ya existente en `core/` y `tools/` sin reescribirla, y
arregla F-SPEC-001-3.

## Usuarios / roles afectados

- **Quien desarrolla en tremen-sdd** (humano o agente, dentro o fuera del harness):
  gana una garantía que ya no depende de que el harness tenga hooks.
- **sdd-implementador / sdd-verificador**: la implementación toca rutas vigiladas
  (`adapters/claude-code/hooks/`, `core/scripts/`) → entra por rama
  `ft/SPEC-002-*` con esta spec aprobada.
- **sdd-arquitecto / sdd-producto**: dejan de ver bloqueada la escritura de
  documentos de verdad cuando corren como subagente de plugin (F-SPEC-001-3).

## Criterios de aceptación
<!-- Cada CA verificable con un test. Rutas relativas a la raíz del repo. -->

- **CA-1 — Instalación reproducible del pre-commit (setup, sin deps nuevas)**.
  Dado un clon del repo **sin** `core.hooksPath` configurado, **cuando** se
  ejecuta el comando de instalación documentado (script npm, p. ej.
  `npm run hooks:install`), **entonces** `git config core.hooksPath` devuelve el
  directorio de hooks **versionado** del repo y un commit posterior dispara el
  pre-commit. Verificable: test en un repo git temporal que corre el comando y
  asierta (a) el valor de `core.hooksPath`, (b) que un commit ejercita el hook, y
  (c) que `package.json` **sigue sin `dependencies`** (cero deps de terceros). El
  mecanismo funciona en Windows (shim `#!/bin/sh` invocando `node`).

- **CA-2 — El pre-commit bloquea código vigilado sin spec (fail-closed, RN-01)**.
  Dado un cambio *staged* bajo una ruta vigilada (`.sdd.json.rutasVigiladas`) y una
  rama que **no** es `ft/SPEC-NNN-slug` con spec en `aprobada`/`en-progreso`
  (p. ej. `main`; o `ft/SPEC-999-x` inexistente; o su spec en `borrador`),
  **cuando** se hace `git commit`, **entonces** el commit se **aborta** con exit
  ≠ 0 y un mensaje que cita la regla (RN-01) y cómo proceder. Dado el **mismo**
  cambio en rama `ft/SPEC-002-*` con SPEC-002 en `aprobada`/`en-progreso`,
  **entonces** el commit **procede**. **Y** dado el cambio que de otro modo
  abortaría (rama inválida+vigilada), **cuando** se hace `git commit` con
  **`SDD_SKIP_GATE=1`** en el entorno, **entonces** el pre-commit **permite** el
  commit —la misma válvula que honran los hooks L1, por coherencia entre capas—;
  **sin** la variable, **aborta**. Verificable: test con repos git temporales —
  (a) rama inválida+vigilada → falla; (b) rama de spec válida+vigilada → pasa;
  (c) rama inválida+vigilada con `SDD_SKIP_GATE=1` → pasa. (La segunda válvula,
  `git commit --no-verify`, es nativa de git y no dispara el hook; no requiere
  código propio.)

- **CA-3 — El pre-commit bloquea artefactos SDD incoherentes (RN-07)**.
  Dado un artefacto SDD *staged* cuyo `estado` declarado **no** coincide con la
  última entrada de `historial` (o con frontmatter inválido), **cuando** se hace
  `git commit`, **entonces** el commit se **aborta** (misma lógica
  `validateFile`/`validate` de `core/scripts/valida.mjs`, no una copia). Dado un
  artefacto coherente, **entonces** procede. Verificable: test con un artefacto
  incoherente staged (falla) y uno coherente (pasa).

- **CA-4 — El pre-commit permite un commit limpio**.
  Dado un cambio *staged* que **no** viola ninguna regla (ruta no vigilada; o ruta
  vigilada en una rama de spec válida; artefactos coherentes), **cuando** se hace
  `git commit`, **entonces** el commit **tiene éxito** (exit 0) sin fricción.
  Verificable: test de la ruta feliz en repo temporal.

- **CA-5 — Una sola lógica de la regla require-spec, sin copia (invariante
  anti-duplicación)**. Dado que la decisión require-spec (parseo de rama
  `ft/SPEC-NNN`, localización de la spec, comprobación de
  `estado ∈ {aprobada, en-progreso}`) debe existir una sola vez, **cuando** se
  implementa el pre-commit, **entonces** esa decisión vive en **un único módulo de
  `core/`** con su propio test unitario, y **tanto** el hook `require-spec.mjs`
  (L1) **como** el pre-commit (L2) la **invocan** (no la reimplementan).
  Verificable: (a) test unitario del módulo compartido; (b) inspección/test de que
  `require-spec.mjs` y el pre-commit **importan** ese módulo y no contienen su
  propio parseo de rama/estado; (c) `tools/checks/nucleo-aislado.mjs` sigue en
  verde (el módulo compartido no escapa de `core/`, RN-02).

- **CA-6 — Workflow de CI que ejecuta los guardianes (fail-closed)**.
  Dado un push o PR al repositorio en GitHub, **cuando** corre el workflow
  (`.github/workflows/*.yml`), **entonces** ejecuta, como pasos que tumban el job
  ante exit ≠ 0: (1) `npm test` (build + núcleo + tools + adaptador); (2) los
  **seis** checks de `tools/checks/` contra el árbol/artefacto reales; (3)
  `core/scripts/valida.mjs --dir docs` sobre todos los artefactos. Verificable:
  (a) el workflow existe y contiene esos pasos; (b) un runner agregado
  reproducible (script npm, p. ej. `npm run check`, que hace build → los 6 checks
  → `valida`) sale exit 0 sobre el árbol real y exit ≠ 0 sobre un árbol que viola
  una regla; (c) el YAML del workflow es válido y sus pasos invocan esos scripts.

- **CA-7 — CE-1 vigilada en CI (regla de dependencia RN-02)**.
  Dado el workflow de CI, **cuando** corre, **entonces**
  `tools/checks/nucleo-aislado.mjs` se ejecuta contra el árbol real como paso
  requerido (dentro del runner agregado de CA-6), de modo que un `core/`
  contaminado (import que escapa de `core/` o dependencia externa) **tumba** el
  job. Verificable: el runner agregado incluye `nucleo-aislado`; su test
  adversarial (core contaminado → exit 1, ya existente por SPEC-001 CA-4) más la
  propagación del exit ≠ 0 por el runner.

- **CA-8 — F-SPEC-001-3 arreglado: `protege-verdad` reconoce al dueño con prefijo
  de plugin**. Dado un payload PreToolUse con `agent_type`
  `tremen-sdd:sdd-arquitecto` editando `docs/fundacion/reglas.md`, **cuando** corre
  `protege-verdad`, **entonces** **permite** (dueño reconocido tras normalizar el
  prefijo `<plugin>:`). Dado `agent_type` `tremen-sdd:sdd-implementador` (no dueño)
  sobre el mismo fichero, **entonces** **deniega**. Dado `sdd-producto` **sin**
  prefijo, **entonces** **sigue permitiendo** (compatibilidad hacia atrás).
  Verificable: casos nuevos en `adapters/claude-code/tests/protege-verdad.test.mjs`
  contra el hook construido en `dist/`. La normalización del prefijo se hace una
  sola vez (en `_comun.mjs`) para reuso.

- **CA-9 — No agravar la regresión conocida ni romper lo verde (dogfooding)**.
  Dado el conjunto de cambios de esta spec, **cuando** se ejecuta `npm test`,
  **entonces** los tests de `core/tests/estado.test.mjs` siguen verdes (la
  regresión de specs migradas **no** se agrava; sus asserts no se tocan) y la
  suite completa queda verde con un conteo **≥** al previo más los tests nuevos
  (CA-1..CA-8). Verificable: `npm test` verde; diff de `estado.test.mjs` sin
  cambios de asserts.

## Entidades y reglas afectadas

- **Reglas**: RN-01 (nada sin spec aprobada — destino final git+CI), RN-02
  (dependencia adaptador→núcleo, guardada por `nucleo-aislado`), RN-03
  (enforcement independiente del harness), RN-07 (coherencia estado/historial vía
  `valida`), RN-10 (dogfooding).
- **Decisión**: **ADR-002** (modelo de enforcement en capas: L1 harness fail-open,
  L2 git pre-commit fail-closed, L3 CI fail-closed; una sola lógica). Esta spec es
  su materialización; no la duplica.
- **Lógica reutilizada (no reescrita)**: `core/scripts/valida.mjs`
  (`validateFile`, `validate`, CLI `--dir`), `core/scripts/estado.mjs`
  (`TRANSITIONS`), `core/lib/frontmatter.mjs`, y los seis
  `tools/checks/*.mjs` (`layout`, `nucleo-aislado`, `fuente-unica`, `referencias`,
  `roles-fuente-unica`, `manifiestos`), cada uno con CLI exit 0/1.
- **Código vigilado tocado**: `adapters/claude-code/hooks/` (`protege-verdad.mjs`,
  `_comun.mjs`, `require-spec.mjs` para delegar en el módulo compartido) y
  `core/scripts/` (nuevo módulo de decisión require-spec). Nuevo utillaje de repo
  en `tools/` (runner agregado, hooks versionados, orquestador del pre-commit) y
  `.github/workflows/`.

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

- **Distribuir el kit de enforcement git+CI a proyectos usuarios** (instalar el
  pre-commit y el workflow en cualquier proyecto que use tremen-sdd, vía
  `/sdd-init`/plantillas). Esta spec **dogfooda CE-4 sobre el propio repo
  tremen-sdd**; portarlo a proyectos usuarios toca `/sdd-init` y `templates/` y es
  otra spec. **Resuelto por el gate: fuera** (ver nota 1).
- **Habilitar la protección de rama / *required status checks* en GitHub** (que el
  workflow **bloquee** el merge): es una acción de admin humano en la config del
  repo, no código. Esta spec **entrega** el workflow; el toggle lo activa el humano
  tras el merge (ver nota 4).
- **Bajar la regla de identidad de `protege-verdad` a git/CI**: git no conoce el
  rol de agente; por ADR-002 esa protección sigue siendo solo L1. No es hueco.
- **Arreglar la regresión de `estado.mjs` (specs migradas)**: aquí solo se exige
  **no agravarla** (CA-9); su arreglo es trabajo aparte.
- **F-SPEC-001-2** (ruido del linter `eslint` en modo `auto`): destino EPIC-MEJORA.
- **F-SPEC-001-1** (dedup de `description` agent↔skill): destino spec 2 de la épica.
- **Reescribir cualquier lógica de `core`/`tools`**: se **reutiliza**, no se rehace.

## Notas para el gate humano

> **Decisiones del gate (Alberto Fojo, 2026-07-20)** resueltas sobre las cinco
> preguntas iniciales; recogidas aquí para que quien apruebe vea el estado real.

1. **Alcance — RESUELTO: solo el repo tremen-sdd.** Esta spec dogfooda CE-4 sobre
   el **propio repo**; el kit git+CI instalable en proyectos usuarios vía
   `/sdd-init` queda **fuera** (otra spec). Confirmado por el gate.

2. **Válvulas de escape de L2 — RESUELTO: DOS válvulas.** El pre-commit respeta
   tanto `git commit --no-verify` (nativa de git) como **`SDD_SKIP_GATE=1`** (la
   misma que honran los hooks L1, por coherencia entre capas). Materializado en
   CA-2 (verificable) y en ADR-002. L1 sigue fail-open; L3 (CI) sin bypass local.

3. **Setup por clon — RESUELTO: aceptado.** `core.hooksPath` a un dir versionado
   + `npm run hooks:install` (sin husky, sin symlinks, sin deps nuevas). El paso
   manual por clon se asume y **se documenta como parte del trabajo** (parte de
   CA-1: el comando debe quedar documentado en el README/arquitectura del repo).

4. **Protección de rama — RESUELTO: acción humana post-merge, no CA.** El workflow
   se entrega; convertirlo en *required status check* sobre `main` (para que
   **bloquee** el merge) lo activará el admin tras el merge de esta spec. Queda
   como consecuencia/nota (ver ADR-002), **no** como criterio de aceptación.

5. **require-spec server-side en CI — RESUELTO: opcional, no CA.** Verificar en CI
   que el cambio vigilado de un PR viene de rama `ft/SPEC-NNN` con spec aprobada
   (vía `GITHUB_HEAD_REF`) es frágil (detached HEAD); se deja como
   **fortalecimiento opcional**, no CA, porque la protección de rama (nota 4) + el
   pre-commit (CA-2) ya cubren RN-01. Confirmado por el gate.

6. **Dogfooding cruzado durante la implementación (recordatorio, no decisión).**
   Implementar esta spec toca `adapters/claude-code/hooks/` y `core/scripts/`
   (rutas vigiladas), así que se hace en rama `ft/SPEC-002-*` con esta spec ya
   aprobada. El pre-commit en construcción puede dispararse sobre los propios
   commits de la spec; el implementador debe instalarlo al final o usar una válvula
   (`--no-verify` / `SDD_SKIP_GATE=1`) de forma auditada mientras itera.
