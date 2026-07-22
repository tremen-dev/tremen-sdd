---
id: SPEC-008
tipo: spec
epica: EPIC-002
estado: en-progreso
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-07-22, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-22, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-07-22, por: sdd-implementador}
---
# SPEC-008 — Limpieza de tooling y CI

## Problema
<!-- Qué duele y a quién. Cita reglas de negocio (RN-xx) de docs/fundacion/reglas.md. -->

Dos ruidos de tooling, ambos observados durante EPIC-001/EPIC-002, cerrados aquí en una sola spec
(cubren **CE-3** y **CE-4** de EPIC-002). Ninguno cambia el comportamiento *deseado* del método;
ambos eliminan avisos espurios que erosionan la confianza en el pipeline.

**CE-3 — el linter `auto` ladra sin config.** El hook `adapters/claude-code/hooks/calidad.mjs`, con
`.sdd.json.linter: "auto"` (el valor de este repo), autodetecta el linter **por la extensión del
fichero** (`.mjs` → `eslint`) y corre `npx eslint <fichero>` en cada Edit. Pero el repo **no tiene
`eslint.config.*`** (ni depende de eslint): `npx eslint` encuentra un eslint global, no halla config
y termina con **`exit 2`**. El hook interpreta ese `2` como "el linter encontró problemas" y lo
propaga (`process.exit(2)`), devolviendo ruido accionable falso a cada escritura de `.mjs`. La causa
raíz: la autodetección de `auto` decide **solo por extensión**, sin comprobar que el linter esté
realmente **configurado** en el proyecto. El fail-open existente (`r.error || r.status === null`,
línea 39) solo cubre "linter no instalado", no "instalado pero sin config". **CE-3** exige que
`calidad`/`linter:"auto"` **no falle cuando no hay config de linter presente**.

**CE-4 — CI avisa de Node 20 deprecado.** `.github/workflows/ci.yml` usa `actions/checkout@v4` y
`actions/setup-node@v4`, cuyo **runtime interno de la action** es Node 20, que GitHub deprecia; cada
run muestra "Node.js 20 is deprecated…". **CE-4** exige que el workflow **no emita ese aviso
evitable**. (Nota: `setup-node` con `node-version: '22'` fija el Node del *job*, no el runtime de la
*action*; son cosas distintas — el aviso es por el runtime de la action, no por el del job.)

**Restricciones de proceso.**
- `adapters/claude-code/hooks/calidad.mjs` está bajo **ruta vigilada** (`.sdd.json.rutasVigiladas` →
  `adapters/claude-code/hooks/`): el arreglo de CE-3 entra por **rama de spec** `ft/SPEC-008-*`
  (**RN-01**, **RN-10**). Es la **única** copia de esta lógica (no hay gemelo en `core/` ni en el
  adaptador `kimi-code`, que no tiene hook `calidad`).
- `.github/workflows/ci.yml` **no** está bajo ruta vigilada; y **`core/scripts/estado.mjs` NO se
  toca** (CA-6) — la regresión conocida de specs migradas no se agrava.

## Usuarios / roles afectados

- **Mantenedores de tremen-sdd** (humano): dejan de recibir el `exit 2` espurio de eslint en cada
  Edit de `.mjs`, y el run de CI deja de mostrar el warning de Node 20.
- **Proyectos usuarios de tremen-sdd** (beneficiario indirecto): cualquier proyecto con
  `linter:"auto"` y sin config de linter deja de sufrir el mismo ruido; el arreglo de CE-3 es
  robusto para todos, no solo para este repo (ver Notas para el gate).
- **sdd-implementador**: modifica `adapters/claude-code/hooks/calidad.mjs` (la autodetección de
  `auto`) y `.github/workflows/ci.yml`; añade tests en `adapters/claude-code/tests/calidad.test.mjs`.
  **No toca** `core/scripts/estado.mjs` ni la máquina de estados.
- **sdd-verificador**: valida los CA (con/sin config; YAML de CI; suite y CI verdes; `estado.mjs`
  intacto).

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA debe ser verificable con un test. -->

- **CA-1 (`auto` SIN config de linter presente → no lanza, exit 0 — CE-3)**: Dado un proyecto con
  `.sdd.json.linter: "auto"` (o `linter` ausente) y **sin** fichero de config del linter que le
  tocaría por extensión (p. ej. edita un `.mjs` y **no** existe `eslint.config.{js,mjs,cjs,ts}`,
  `.eslintrc*` ni la clave `eslintConfig` en `package.json` en la raíz del proyecto), **cuando** el
  hook `calidad` corre sobre ese fichero, **entonces** **no invoca el linter** y termina con
  **`exit 0`** sin escribir nada en `stderr`. Verificable con test (contra `dist/claude-code/hooks/
  calidad.mjs`): proyecto `auto`, `src/x.mjs`, sin config → `code === 0` y `stderr` vacío. **Este es
  el caso que hoy da `exit 2` ruidoso** (test de regresión de CE-3).

- **CA-2 (`auto` CON config presente → sí lint — adversarial, CE-3)**: Dado un proyecto con
  `linter: "auto"` y **con** el fichero de config del linter presente en la raíz (p. ej.
  `eslint.config.mjs` para `.mjs`, o el análogo de `ruff`/`dart`), **cuando** el hook corre sobre un
  fichero de esa extensión, **entonces** **sí** invoca el linter y su resultado gobierna el exit
  (linter OK → `exit 0`; linter con hallazgos → `exit 2` con el mensaje). Verificable con test que,
  con un **stub** del binario en `PATH` (patrón del test existente "regresión quoting win32", líneas
  60-86) y un fichero de config presente, comprueba: (a) con stub que sale 0 → `code === 0`; (b) con
  stub que sale 2 → `code === 2`. Blinda que el arreglo **no desactiva** el linter cuando el proyecto
  sí lo configura.

- **CA-3 (linter explícito NO cambia — no-regresión)**: Dado un proyecto con `linter` **explícito**
  (p. ej. `"ruff"`, `"eslint"`, `"none"`), **cuando** el hook corre, **entonces** el comportamiento
  es **idéntico al actual**: `none` → `exit 0` sin lanzar; un linter nombrado → se lanza con
  fail-open si no está instalado (`r.error || r.status === null` → `exit 0`). La comprobación de
  config **solo** condiciona la rama `auto`; un `linter` explícito **no** exige config. Verificable:
  los **cinco tests existentes** de `adapters/claude-code/tests/calidad.test.mjs` (artefacto
  incoherente → 2; artefacto coherente → 0; `linter none` → 0; fail-open sin `.sdd.json` → 0; linter
  real vía stub con espacio → 0) quedan **verbatim y verdes**.

- **CA-4 (validación de artefactos SDD intacta)**: Dado un fichero artefacto SDD (`SPEC-*.md`,
  `_epica.md`, `ADR-*.md`), **cuando** el hook corre, **entonces** la rama de `validateFile`
  (coherencia frontmatter/estado/historial, líneas 23-30) se comporta **igual que hoy**: `exit 2` si
  hay incoherencia, `exit 0` si es coherente. El cambio de CE-3 vive **solo** en la rama de código
  (autodetección del linter), **no** toca la de artefactos. Verificable: los dos tests de artefacto
  existentes siguen verdes.

- **CA-5 (`ci.yml` usa actions con runtime que NO emite el aviso de Node 20 — CE-4)**: Dado
  `.github/workflows/ci.yml`, **cuando** se inspecciona, **entonces** `actions/checkout` y
  `actions/setup-node` están pinneadas a una **major cuyo runtime interno es Node 24** — es decir
  **`@v5` o superior** para ambas (la migración a `node24` ocurrió en la `v5` de cada una; majores
  actuales al 2026-07-22: `checkout@v7`, `setup-node@v7`), y **ninguna** referencia `@v4` ni inferior.
  El resto del workflow (jobs, `node-version: '22'` del job, pasos `npm test` / `npm run check`) se
  mantiene. Verificable por inspección del YAML (no contiene `actions/checkout@v4` ni
  `actions/setup-node@v4`; sí `@v5`+); y **observable** en el run real de CI, que deja de mostrar
  "Node.js 20 is deprecated…".

- **CA-6 (`estado.mjs` intacto y regresión de specs migradas no agravada)**: Dado el `git diff` de la
  rama, **cuando** se inspecciona, **entonces** `core/scripts/estado.mjs` **no aparece modificado**
  (0 líneas de diff) y la **regresión conocida de specs migradas** (deuda abierta a propósito) **no
  se agrava**. Verificable: `git diff --stat` no lista `core/scripts/estado.mjs`; los tests de
  `core/tests/estado.test.mjs` siguen **verbatim y verdes**. (SPEC-008 no toca ninguna máquina de
  estados; esta CA es la salvaguarda explícita.)

- **CA-7 (suite completa y CI verde)**: Dado el conjunto de cambios, **cuando** corre `npm test`
  (build de ambos adaptadores → checks de invariantes → tests del núcleo/tools → tests del adaptador
  contra `dist/`), **entonces** la suite queda **verde** con conteo de tests **≥** el previo **más**
  los tests nuevos de CA-1/CA-2, y **CI** queda verde sobre la rama. Nota de build (RN-05): los tests
  del hook corren contra `dist/claude-code/hooks/calidad.mjs`, que `tools/build-adapter.mjs` copia
  **verbatim** desde `adapters/claude-code/hooks/calidad.mjs`; el cambio debe hacerse en el **fuente**
  del adaptador y reflejarse tras el build (no editar `dist/` a mano). Verificable: salida de
  `npm test` y run de CI verdes.

## Entidades y reglas afectadas
<!-- Cita RN-xx, ADR-NNN y términos de docs/fundacion/dominio.md. Referencia, no dupliques. -->

- **EPIC-002, CE-3 y CE-4**: esta spec los **materializa** en un solo cambio de higiene.
- **RN-01 / RN-10** (nada sin spec bajo ruta vigilada; dogfooding): `adapters/claude-code/hooks/` es
  **VIGILADA** → el arreglo de CE-3 entra por rama `ft/SPEC-008-slug`.
- **RN-05** (`dist/` es GENERADO): el hook viaja a `dist/claude-code/` vía `tools/build-adapter.mjs`
  (copia verbatim); se edita el **fuente** en `adapters/`, nunca `dist/` a mano. Los tests corren
  contra `dist/` (línea 8 de `calidad.test.mjs`), así que exigen build previo (ya en `npm test`).
- **RN-02** (dependencia solo adaptador → núcleo): la lógica de detección de config se añade **dentro
  del hook del adaptador** (`adapters/claude-code/hooks/calidad.mjs`), con `node:fs`/`node:path`; **no**
  se introduce dependencia de `core/` hacia el adaptador ni se contamina el núcleo.
- **`.github/workflows/ci.yml`** (CE-4): **no vigilado**; el enforcement L3 de **ADR-002/RN-03** sigue
  intacto (solo cambian las versiones de dos actions, no los pasos `npm test` / `npm run check`).
- **`.sdd.json`** (raíz): **no vigilado**. Esta spec **conserva** `linter: "auto"` y **arregla la
  semántica de `auto`**; no lo cambia a `"none"` (ver Notas para el gate, decisión abierta).
- **Lección SPEC-002 (entrypoints CLI)**: `calidad.mjs` es un hook (no CLI con `esEntrypoint`) y no
  añade entrypoint; cualquier util nuevo que necesitara bloque CLI usaría
  `core/lib/entrypoint.mjs` — aquí **no aplica**, se anota por trazabilidad.
- **Sin ADR**: no hay decisión estructural inmutable que constriña trabajo futuro; es higiene
  acotada. La **política de `auto`** ("detectar linter por extensión **y** exigir su config
  presente; si no, tratar como `none`") la fija esta spec; si el humano la considera constrictiva a
  nivel de método, puede pedir elevarla a ADR en el gate (ver Notas).

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

- **Tocar `core/scripts/estado.mjs`** o la **regresión conocida de specs migradas**: fuera; SPEC-008
  solo la **no agrava** (CA-6).
- **Los otros items de EPIC-002**: CE-1 (SPEC-006) y CE-2 (SPEC-007) ya cerrados; SPEC-008 cierra
  CE-3+CE-4.
- **Añadir un `eslint.config.*` real al repo / que el repo dependa de eslint**: fuera. El repo es
  cero-deps a propósito; el arreglo hace que `auto` **no exija** linter, no que lo introduzca.
- **Extender la detección de config a linters no soportados hoy** o a rutas de config no estándar: la
  detección cubre los tres linters ya soportados (`eslint`, `ruff`, `dart`) con sus ficheros de config
  convencionales en la **raíz del proyecto**; casos exóticos (config heredada de un monorepo padre,
  config en subdirectorio) quedan fuera — se tratan como "sin config" → `none` (fail-safe silencioso,
  no ruidoso), que es exactamente el comportamiento deseado.
- **Pinnear las actions por SHA** (en vez de por tag `@vN`): fuera; se mantiene el estilo por-major
  del workflow actual. (Si se quisiera por seguridad de supply-chain, sería mejora aparte.)
- **Un hook `calidad` para el adaptador `kimi-code`**: hoy no existe; crearlo es trabajo aparte.

## Notas para el gate humano
<!-- Lo que quien aprueba necesita saber para decidir. -->

> Esta spec sigue en `borrador`; la arquitecta **NO** la aprueba (RN-09). **No la acompaña ningún
> ADR**: es higiene acotada, sin decisión estructural inmutable. Dos decisiones abiertas, ambas para
> el humano; el resto son propuestas cerradas por la arquitecta, vetables en el gate.

1. **DECISIÓN DE GATE (CE-3) — cómo arreglar el ruido de `auto`. Recomendación de la arquitecta:
   opción (a).**
   - **(a) [recomendada] Arreglar la semántica de `auto`**: la autodetección solo activa un linter si
     —además de tocar por extensión— **existe su fichero de config** en la raíz del proyecto
     (eslint: `eslint.config.{js,mjs,cjs,ts}` / `.eslintrc*` / `eslintConfig` en `package.json`; ruff:
     `ruff.toml` / `.ruff.toml` / `[tool.ruff]` en `pyproject.toml`; dart: `analysis_options.yaml`).
     Si no hay config → se trata como `none` (no lint, `exit 0`). **Ventaja**: robusto y **beneficia a
     todos los proyectos usuarios**, no solo a este repo; `.sdd.json` conserva `auto`.
   - **(b) Poner `linter: "none"` en el `.sdd.json` de este repo**: silencia el ruido **aquí** en una
     línea, pero **no arregla** el método (cualquier otro proyecto con `auto` sin config seguiría
     ladrando) y **desactiva** el linter para este repo aunque algún día se añada config. La arquitecta
     la **desaconseja** como solución única; podría combinarse con (a) si además se quiere linter off
     aquí, pero no es necesario.
   - **La épica (CE-3) se cumple con (a)**. Si el humano prefiere (b), la spec y sus CA se reescriben
     (los CA actuales asumen (a)).

2. **DECISIÓN DE GATE (CE-3) — ¿elevar la política de `auto` a ADR?** La regla "auto = extensión **y**
   config presente" es una **política del método** que afecta a todos los proyectos usuarios. La
   arquitecta la juzga **acotada** (no constriñe trabajo futuro de forma inmutable) y la fija en esta
   spec **sin ADR**, en coherencia con SPEC-007. Si el humano la considera una frontera de diseño que
   merezca decisión inmutable, puede pedir un ADR en el gate antes de implementar.

3. **CE-4 — versiones verificadas, no inventadas (2026-07-22).** La migración de runtime a **Node 24**
   ocurrió en la **`v5`** tanto de `actions/checkout` como de `actions/setup-node` (confirmado en las
   release notes de `checkout@v5.0.0` y `setup-node@v5.0.0`). Majores **actuales**: `checkout@v7`
   (`v7.0.1`) y `setup-node@v7` (`v7.0.0`). **Propuesta**: pinnear ambas a la **major actual**
   (`checkout@v7`, `setup-node@v7`); el CA solo exige `@v5`+ (cualquiera evita el aviso). El
   `node-version: '22'` del job se mantiene (fija el Node del job, no el runtime de la action).

4. **Dogfooding / código vigilado (RN-01, RN-05, RN-10).** Se toca `adapters/claude-code/hooks/
   calidad.mjs` (**VIGILADO** → rama `ft/SPEC-008-*`) y `adapters/claude-code/tests/calidad.test.mjs`
   (test, no vigilado). `.github/workflows/ci.yml` y `.sdd.json` **no** son vigilados. `dist/` es
   **GENERADO** (no se edita a mano; se reconstruye en `npm test`). **`core/scripts/estado.mjs` no se
   toca** (CA-6).
