# Arquitectura del repo tremen-sdd

Guía de orientación para quien trabaja **en** tremen-sdd (no para quien lo usa
en su proyecto — eso está en el `README.md` y en `site/`). La *decisión* que
justifica esta estructura vive en
[`docs/adr/ADR-001`](adr/ADR-001-estructura-del-repo-para-multi-harness.md);
aquí se describe el **as-built** y el flujo de trabajo.

## El modelo: núcleo + adaptadores

El método SDD no sabe nada de ningún harness de agentes; el empaque de cada
harness sí. Esa frontera es la estructura del repo:

```
core/                      # NÚCLEO agnóstico — única copia versionada del método
  lib/                     #   frontmatter, utilidades
  scripts/                 #   estado.mjs (máquina de estados), scaffold, tablero, valida, informe-qa
  templates/               #   plantillas de artefactos y de /sdd-init
  roles/es/                #   prosa = system prompt de cada rol (fuente única)
  tests/                   #   tests del núcleo (corren directos)
adapters/                  # ADAPTADORES por harness (simétricos, ninguno en la raíz)
  claude-code/             #   .claude-plugin/, agents/, skills/, commands/, hooks/, tests/
  kimi-code/               #   agents/ (YAML + prompts/), skills/, hooks/, tests/
  opencode/                #   opencode.json, agents/, skills/, commands/, plugins/, tests/
tools/                     # utillaje a nivel de repo (ni núcleo ni adaptador)
  build-adapter.mjs        #   ensamblador del artefacto instalable
  checks/                  #   checks de invariantes (los ejerce CI y los tests)
  tests/                   #   tests de tools y de los checks
dist/                      # SALIDA de build — gitignored, nunca se comitea
.claude-plugin/            # marketplace.json en la raíz (escaparate repo-level)
docs/  site/               # documentación y web
```

### La regla de dependencia (invariante duro)
El acoplamiento va **siempre adaptador → núcleo, nunca al revés**. Ningún fichero
bajo `core/` importa, referencia ni resuelve una ruta que escape de `core/`
(solo `node:*` y otros ficheros de `core/`). Lo guarda
`tools/checks/nucleo-aislado.mjs` (análisis de imports, no grep de cadenas): un
núcleo contaminado hace fallar el check. Es la materialización de **CE-1** de
EPIC-001.

## El paso de build

Claude Code (y los harnesses de su familia) **copian solo el directorio del
plugin a su cache** al instalar; los directorios hermanos no viajan, y está
prohibido referenciar ficheros con `../` fuera del plugin root. Por eso el
núcleo no puede quedar "al lado" del adaptador: hay que **empaquetarlo dentro**.

`tools/build-adapter.mjs <harness>` ensambla un plugin **autocontenido** en
`dist/<harness>/`:
- copia la superficie de `adapters/<harness>/` (menos su carpeta `tests/`, que es
  de desarrollo),
- copia el núcleo completo bajo `dist/<harness>/core/`.

Así, dentro del artefacto, el núcleo se resuelve como **ruta interna** al plugin
root (`${CLAUDE_PLUGIN_ROOT}/core/…`), sin ningún `../` que escape. El build es
**determinista/idempotente** (dos corridas → árbol idéntico) y **cross-platform**
(no usa symlinks). `dist/` está en `.gitignore` **en las ramas de fuente**:
`core/` sigue siendo la única copia **editable** del método — nunca se comitea
una copia del núcleo fuera de `core/` en una rama de fuente (lo guarda
`tools/checks/fuente-unica.mjs`; el matiz "editable" y su alcance exacto, en
[ADR-010 §7](adr/ADR-010-mecanismo-de-publicacion-del-artefacto-rama-de-publicacion-en-el-repo-fuente.md)).

El build además **estampa la procedencia**: cada `dist/<harness>/` recibe un
`PROVENANCE.json` con `version`, `commit` de fuente, `harness`, `fecha` y `sucio`,
y el `plugin.json` del artefacto queda sellado con la versión de `package.json`
—la **única** fuente de versión, que `tools/checks/version-unica.mjs` obliga a no
divergir—. La `fecha` es la **del commit de fuente en UTC**, no la hora de build:
con la hora de pared, dos corridas del mismo commit no serían byte-idénticas y se
perdería el determinismo.

## Tests y checks

| Comando | Qué corre |
|---|---|
| `npm run build` | ensambla `dist/claude-code/` |
| `npm run build:kimi` | ensambla `dist/kimi-code/` |
| `npm run build:opencode` | ensambla `dist/opencode/` |
| `npm run build:all` | los **tres** adaptadores |
| `npm run test:core` | tests del núcleo, directos sobre `core/tests/` |
| `npm run test:tools` | `build:all` + tests de `tools/` (build y checks) |
| `npm run test:adapter` | `build:all` + tests de los tres adaptadores contra `dist/` |
| `npm test` | `build:all` + las tres capas de una vez |
| `npm run check` | runner agregado: los 3 builds → los checks (algunos, una vez por adaptador) → `valida` (lo que corre CI) |
| `node tools/publica.mjs --dry-run --out <dir>` | ensambla el árbol publicable de la rama `release`, sin tocar git |
| `node tools/publica.mjs --local` | + worktree, commit y tag **locales** (no empuja) |
| `npm run hooks:install` | activa el pre-commit L2 (`git config core.hooksPath tools/githooks`) |

Los tests del adaptador corren **contra el artefacto construido** (`dist/`),
porque es ahí donde el núcleo vive por ruta interna. Los del núcleo corren
directos y deben pasar **con `adapters/` y `dist/` ausentes** (aislamiento, CE-1).

Los checks de invariantes viven en `tools/checks/`, cada uno con su test, y
`PASOS` de `tools/check.mjs` es la lista autoritativa —un test comprueba que no
haya ninguno sin cablear—: `layout`
(estructura del repo), `nucleo-aislado` (regla de dependencia), `nucleo-agnostico`
(ningún token de harness bajo `core/`; solo `${SDD_*}` permitido), `referencias`
(ninguna ruta escapa el artefacto; nada de `${CLAUDE_PLUGIN_ROOT}/../../` ni, en
Kimi/opencode, `../` que escape), `roles-fuente-unica` (ningún agent/bootstrap embebe
el cuerpo del rol; solo lo referencia), `manifiestos` (Claude: plugin.json /
marketplace.json; Kimi: agentes YAML + mapa `subagents` + `allowed_tools` por rol;
opencode: `opencode.json` — bloque `agent` con `mode`, `permission.task` del primary,
`edit` granular ADR-009 del verificador y deny de generados),
`fuente-unica` (sin copia de núcleo comiteada fuera de `core/`),
`descripcion-fuente-unica` (la description de disparo de cada rol coincide entre la
canónica en `core/roles/es/_descripciones.json` y las superficies de los adaptadores),
`prosa-gates` (la prosa de `sdd-documentalista` prohíbe cerrar/proponer cerrar épicas — SPEC-006),
`version-unica` (`package.json.version` es la única fuente de versión: ningún
manifiesto del fuente diverge, y la entrada del marketplace no la declara — SPEC-016).
Los checks `layout`, `referencias`, `roles-fuente-unica`, `manifiestos` y
`descripcion-fuente-unica` están **generalizados a los tres adaptadores**
(claude-code, kimi-code y opencode), pero **no por el mismo mecanismo**, y cuál toca
lo decide **ADR-011** (¿el invariante existe sin conocer el harness?):
`referencias` y `manifiestos` **enumeran** —se invocan una vez por adaptador desde
`PASOS` de `tools/check.mjs`— porque qué es un manifiesto o una referencia válida
depende del harness; `descripcion-fuente-unica` enumera internamente las superficies
de los tres; `roles-fuente-unica` y `layout` **se autodescubren**, iterando el
directorio `adapters/` y aplicando la regla a lo que encuentren, así que un harness
nuevo queda cubierto el día que se crea su directorio. En `layout` el reparto es:
**mínimo común** exigido a todos (`agents/`, `skills/`, `tests/`) por
autodescubrimiento, más **extras declarativos por harness** en una tabla dentro del
check (claude-code: `.claude-plugin/plugin.json`, `commands/`, `hooks/`; kimi-code:
`hooks/`; opencode: `opencode.json`, `commands/`, `plugins/`), porque las superficies
difieren **por diseño** (ADR-003, ADR-007) y exigirlas a todos inventaría
incumplimientos; un adaptador no declarado se juzga solo por el mínimo común. La
lista de superficie de adaptador **prohibida en la raíz** sigue siendo una constante
cerrada (ADR-011 §4), nunca derivada del FS. `nucleo-aislado`, `nucleo-agnostico`,
`fuente-unica` y `prosa-gates` no se parametrizan por adaptador porque miran solo el
núcleo o el árbol comiteado. El YAML de los agentes Kimi se parsea con un loader
mínimo propio (`tools/checks/_yaml.mjs`), porque el núcleo no admite dependencias.

## La rama de publicación `release` (as-built)

El artefacto construido no se queda en `dist/`: se **publica** en una rama del
propio repo llamada `release`. La decisión, sus alternativas y su coste están en
[ADR-010](adr/ADR-010-mecanismo-de-publicacion-del-artefacto-rama-de-publicacion-en-el-repo-fuente.md);
aquí solo queda **qué hay montado**.

- **Qué es**: una rama **huérfana** (`git merge-base main release` no devuelve
  nada) cuyo contenido es **100% generado** por `tools/publica.mjs`. Avanza con un
  commit por publicación, sin force-push y sin reescribir historia. Nunca se
  mergea con `main`, en ningún sentido.
- **Qué contiene**, en la **raíz** (no bajo `dist/`, para que el `.gitignore` de
  la fuente no interfiera): `.claude-plugin/marketplace.json` con el plugin
  apuntando al hermano relativo `./claude-code`; `claude-code/`, `kimi-code/` y
  `opencode/`; `PROVENANCE.json`; y un `README.md` generado. Cada árbol lleva
  además **su propio** `PROVENANCE.json` dentro, así que llega a la cache del
  harness instalado.
- **Cómo se publica**: `npm run build:all` → `node tools/publica.mjs --local`
  (ensambla sobre un **worktree aparte**, nunca conmutando el checkout de
  desarrollo; commit + tag `v<version>` locales) → una persona empuja rama y tag y
  crea el Release. El script **no empuja**: publicar es irreversible y el último
  paso es humano.
- **Sin válvulas**: el commit de publicación pasa el pre-commit L2 **sin**
  `--no-verify` y **sin** `SDD_SKIP_GATE=1`. No es suerte: ningún fichero
  publicado cae bajo las `rutasVigiladas` de `.sdd.json` ni es un artefacto SDD de
  `docs/`, así que ninguna capa del gate se activa. Si algún día publicar
  necesitara una válvula, el mecanismo estaría mal.

**Qué parte de ADR-001 §5 sigue vigente.** ADR-010 §7 supersede **solo** la
cláusula «jamás se comitea», y **solo** para la rama `release`. Sigue en pie todo
lo demás: build determinista, salida a `dist/`, `dist/` gitignored en las ramas de
fuente, nada de symlinks y la regla de dependencia adaptador→núcleo. La invariante
se **reformula**, no se abandona: no existe ninguna copia **editable** del núcleo;
`core/` es la única fuente, y cualquier otra copia en git es artefacto generado en
una rama que no se edita a mano. `fuente-unica` lo verifica **igual que antes**,
sin modificarlo, porque corre sobre el `git ls-files` del checkout y no ve otra
rama.

**Qué le pasa a CI.** `.github/workflows/ci.yml` ignora `release` en el evento
`push` (`branches-ignore: ['release']`) y **nada más**: no gana `branches`,
`paths` ni `tags`, ni los jobs ganan `if`/`continue-on-error`. La rama publicada
no contiene fuente —sin `package.json`, sin `tools/`, sin `core/`— y un run sobre
ella solo podría fallar. Como al declarar únicamente `branches-ignore` los pushes
de **tag** dejan de disparar, la cobertura no se pierde: todo commit de fuente
llega a CI por el push de su rama y por su PR, y un tag apunta a un commit ya
validado. **`pull_request` no se filtra**, así que un PR que intentara mezclar
`release` en una rama de fuente corre la suite completa y falla — que es la
protección que se quiere. Es relevante porque la protección de rama que ADR-010
recomendaba **no está disponible** en el plan actual de GitHub: el hallazgo y sus
salidas están en [docs/operacion/proteger-la-rama-release.md](operacion/proteger-la-rama-release.md).

## Flujo de trabajo (y dogfooding)

El repo **se autogestiona con su propio estándar**. Todo cambio de código bajo
las rutas vigiladas (`core/scripts/`, `core/lib/`, `adapters/claude-code/hooks/`)
entra por el método: rama `ft/SPEC-NNN-slug`, con su spec `aprobada`, y el hook
`require-spec` deniega editar fuera de ese carril.

Ese carril no depende solo del harness (ADR-002): además del hook L1 (fail-open),
git **pre-commit** (L2, fail-closed, `tools/githooks/`) y **GitHub Actions** (L3,
fail-closed, `.github/workflows/ci.yml`) guardan las mismas reglas reutilizando la
lógica de `core/` (la decisión require-spec vive una sola vez en
`core/lib/require-spec.mjs`; la comparten L1 y L2). El pre-commit se activa por
clon con `npm run hooks:install`; las válvulas auditables son `git commit
--no-verify` y `SDD_SKIP_GATE=1` (CI no respeta ninguna).

Para validar el runtime real tras un cambio (dogfooding):

```bash
npm run build
claude plugin marketplace add D:\ruta\a\tremen-sdd     # source → ./dist/claude-code
claude plugin install tremen-sdd@tremen-sdd            # o recarga si ya estaba
```

y comprobar que un hook dispara sobre las rutas vigiladas y que un agent lee su
rol por `${CLAUDE_PLUGIN_ROOT}/core/roles/<idioma>/<rol>.md`.

## Añadir un harness

Recetario **as-built**, con **dos casos trabajados**: el primer adaptador no-Claude
(**Kimi Code**, SPEC-003, EPIC-001) y el tercero (**opencode**, EPIC-003). Las
decisiones de empaquetado y resolución para harnesses **sin marketplace ni variable
de plugin-root** están en
[`ADR-003`](adr/ADR-003-empaquetado-y-resolucion-del-nucleo-para-el-adaptador-kimi-code.md)
(Kimi) y [`ADR-007`](adr/ADR-007-encaje-de-opencode-y-su-modelo-de-enforcement.md)
(opencode); aquí se describen las piezas, el trabajo que **no** cabe en el
adaptador, los procedimientos de instalación y un procedimiento ordenado para
quien aborde el **cuarto** harness.

> **Método de citación (requisito de EPIC-003).** Toda afirmación sobre el
> comportamiento de un CLI externo va **anclada**, nunca escrita de memoria:
> **`[1.18.5 · 2026-07-27]`** = ejercido contra el CLI real de opencode **1.18.5**
> el **2026-07-27** (acta [`docs/estudios/opencode-piloto.md`](estudios/opencode-piloto.md),
> evidencia en `docs/_qa/SPEC-014/`); **`[doc 2026-07-23]`** = documentación oficial
> de opencode consultada el **2026-07-23**
> ([`docs/estudios/opencode-capacidades.md`](estudios/opencode-capacidades.md));
> lo de Kimi viene de su doc oficial (jul 2026) vía **ADR-003**. Lo no verificado va
> marcado **[hipótesis]**.
>
> **Fecha de caducidad reconocida**: opencode evoluciona rápido y todo lo que sigue
> describe **1.18.5**. Antes de fiarse de un detalle de CLI, re-verifícalo contra la
> versión instalada; la forma (ADR-007) es lo que se pretende estable, no la
> mecánica.

### Lista cerrada de piezas del adaptador

Un adaptador es `adapters/<harness>/` y **solo** contiene superficie de adaptador
(ningún fichero del método: `lib/`, `scripts/`, `templates/`, `roles/` viven solo
en `core/`). Eso es un invariante de **contenido**, y sigue siendo cierto en los
tres adaptadores — pero **no** es el presupuesto de trabajo: lo que hay que tocar
**fuera** del adaptador está en la segunda lista, más abajo.

| Pieza | Claude Code | Kimi Code | opencode |
|---|---|---|---|
| **agents/** | **cuatro** `.md` (`sdd-arquitecto`, `sdd-documentalista`, `sdd-implementador`, `sdd-verificador`): frontmatter + prosa que referencia el rol. **No hay un agent por rol**: `sdd-orquestador`, `sdd-producto` y `sdd-como-vamos` se montan **solo como skill** y corren en el main-loop | el **YAML del agente raíz** (= orquestador) que declara los seis `sdd-*` en su mapa `subagents:`, un `.yaml` por subagente (`extend: default`, `allowed_tools` explícito), y `agents/prompts/<rol>.md` (bootstrap que referencia el núcleo por ruta interna) | `agents/<rol>.md` — **siete** ficheros; el cuerpo es un **bootstrap** (lee `.sdd.json`→idioma y hace `Read` de `../core/roles/<idioma>/<rol>.md`), no el cuerpo del rol. El orquestador es `mode: primary`; los seis `sdd-*`, `mode: subagent` (ADR-007 §Decisión 1 y 4) |
| **skills/** | **siete** `sdd-*/SKILL.md`, con **dos montajes**: las cuatro con agent homónimo **despachan** vía `Agent(subagent_type: "tremen-sdd:<rol>")` (con el prefijo de plugin); las tres sin agent (`sdd-orquestador`, `sdd-producto`, `sdd-como-vamos`) **son** el rol — su cuerpo es el bootstrap que hace `Read` de `${CLAUDE_PLUGIN_ROOT}/core/roles/…` | `sdd-*/SKILL.md` que **instruyen al agente raíz** a delegar vía `Agent(subagent_type: sdd-<rol>)`, **sin** prefijo de plugin | `skills/<rol>/SKILL.md` — **seis** (uno por subagente) que instruyen al primary a despachar por la tool **`task`**, **sin** prefijo de plugin |
| **hooks / plugin** | entrypoints `.mjs` + `hooks.json`. L1 **deniega**: `hooks/require-spec.mjs` emite `permissionDecision: 'deny'`; ante error interno, `catch { allow() }` → fail-open | entrypoints `.mjs` (shim que normaliza el payload de Kimi e invoca `core/lib/require-spec.mjs`) + fragmento `hooks.toml` (`[[hooks]]`). L1 se asume **fail-open** (avisa): su efecto en runtime no está verificado — ver el espectro más abajo | `plugins/require-spec.mjs` (hook `tool.execute.before`) + `plugins/_comun.mjs` (shim de payload). L1 **deniega de verdad**: el `throw` **aborta la tool** `[1.18.5 · 2026-07-27]`, acta [H2]. **Ojo**: hay que **registrarlo** en el manifiesto — el auto-descubrimiento solo toma `*.ts`/`*.js` |
| **manifiesto** | `.claude-plugin/plugin.json` + entrada en `marketplace.json` | **ninguno**: Kimi no tiene marketplace ni `plugin.json` que transporte agents/skills/hooks | `opencode.json` — **sí hay manifiesto, no hay marketplace**. Registra `plugin` (rutas relativas al propio fichero de config), `permission` global y el bloque `agent` (los 7 con su `mode` y su `permission`) |
| **commands/** | `sdd-init`, `sdd-tablero` (slash-commands) | **ninguno**: Kimi no tiene slash-commands de usuario por fichero; su equivalente es invocar los scripts de `core/` directamente o desde un skill | `commands/{sdd-init,sdd-tablero}.md` — **sí los hay**, comando-por-fichero como en Claude Code. **Asimetría explícita: sí en Claude Code y opencode, no en Kimi** |
| **permisos declarativos** | **por agente, no por ruta**: el frontmatter del agent admite `tools` y `model`, y el adaptador lo usa hoy en `agents/sdd-documentalista.md` (`tools: Read, Grep, Glob, Bash`, `model: haiku`). **No** hay declaración por patrón de ruta; la política de tools del verificador (**ADR-009**) la sostienen la prosa del rol y los hooks L1 | **por rol, no por ruta**: lo más cercano es `allowed_tools` por rol en el `.yaml` del subagente (qué *tools*, no qué *rutas*) — p. ej. `agents/sdd-verificador.yaml` | **pieza propia**: `permission` en `opencode.json`, **por patrón de ruta** (global: `docs/tablero.md` y `dist/**` → `deny`, RN-05) **y por agente** (`edit`, `task`). Capa **estática y complementaria**, nunca la garantía (ADR-002); ver la trampa de precedencia en *Desviaciones* |
| **tests/** | tests del adaptador contra `dist/` | ídem | ídem, contra `dist/opencode/` (`tests/{superficie,skills,enforcement}.test.mjs`) |

### Lo que hay que tocar FUERA de `adapters/<harness>/`

La lista de arriba es cerrada **como lista de piezas del adaptador**. Como
**presupuesto de trabajo** siempre ha sido incompleta: los tres adaptadores
obligaron a tocar también estos puntos de integración del repo. Presupuéstalos.

| Punto de integración | Qué hay que hacer |
|---|---|
| `package.json` | scripts `build:<harness>`, y meterlo en `build:all`, `test:adapter` y `test` |
| `tools/check.mjs` (`PASOS`) | cablear el build del nuevo adaptador y las pasadas por-adaptador de los checks parametrizados |
| `tools/checks/*` | generalizar `referencias`, `manifiestos`, `roles-fuente-unica` y `descripcion-fuente-unica` al nuevo harness (y, si su manifiesto tiene forma propia, escribir su validador) |
| `tools/tests/*` | los tests de esos checks y del build para el nuevo adaptador |

Evidencia de que esto pasó **las tres veces**, no una:

- **Kimi (SPEC-003)** — commit `f497c74`: `package.json`, `tools/check.mjs`,
  `tools/checks/{_yaml,manifiestos,referencias,roles-fuente-unica}.mjs` y **ocho**
  ficheros de `tools/tests/` (3 nuevos + 5 modificados).
- **opencode, roles y comandos (SPEC-010)** — commit `d05a3bb`: `package.json`,
  `tools/check.mjs`,
  `tools/checks/{descripcion-fuente-unica,manifiestos,referencias}.mjs`,
  `tools/tests/opencode.test.mjs`.
- **opencode, enforcement (SPEC-011)** — commit `35e17b5`:
  `tools/checks/manifiestos.mjs`, `tools/tests/{opencode,require-spec-una-logica}.test.mjs`.
- **opencode, piloto (SPEC-014)** — commit `8f6e690`: `tools/checks/manifiestos.mjs`
  y `tools/tests/opencode.test.mjs`, por el lazo ADR-009 (registrado como salvedad
  **F-SPEC-014-1** y **aceptada** por el verificador).

**La promesa que sí sigue intacta es la otra**: *sin tocar el núcleo*. `core/` no
ha ganado ni una dependencia ni una mención de Kimi o de opencode, y está
verificado **tres veces** por `nucleo-aislado`/`nucleo-agnostico` (ledgers SPEC-010
CA-9, SPEC-011 CA-7, SPEC-014 CA-8). Léase **EPIC-001 CE-5** así: *lista cerrada de
piezas **del adaptador**, más esta segunda lista conocida de puntos de
generalización, y **sin tocar el núcleo*** (RN-02).

### La asimetría del orquestador: tres montajes, una prosa

Es la **primera** decisión al abordar un harness, no una nota al pie: el mecanismo
de despacho determina cómo se monta el orquestador y, en cascada, cómo se montan
las skills, los permisos y los gates.

- **Claude Code — *skill***: el orquestador es un `SKILL.md` **sin agent detrás** —
  su cuerpo es el bootstrap del rol y corre en el **main-loop**, que es quien despacha
  a los demás (los cuatro roles con agent, vía `Agent(subagent_type:
  "tremen-sdd:<rol>")`).
- **Kimi Code — *agente raíz***: es el único que puede llamar a la tool `Agent`
  (guard `role != "root"` en el runtime de Kimi); los seis roles cuelgan de su mapa
  `subagents:` (**ADR-003 punto 7**).
- **opencode — *agente `mode: primary`***: despacha por la tool **`task`**, con
  `subagent_depth` = 1, así que un subagente no puede lanzar otro
  (**ADR-007 §Decisión punto 4**). Confirmado en runtime: el subagente **no tiene**
  la tool `task` en su set y el intento de anidar falla con "Model tried to call
  unavailable tool" `[1.18.5 · 2026-07-27]`, acta [H4].

En los tres, la **prosa del rol es la misma y vive una sola vez**, en
`core/roles/<idioma>/sdd-orquestador.md` (**RN-06**, vigilado por
`roles-fuente-unica`). Lo que cambia es el **mecanismo de despacho del harness**,
no el rol.

### Resolución del núcleo

El build (`tools/build-adapter.mjs <harness>`, **reutilizado sin tocar** en los tres
casos) ensambla `dist/<harness>/` autocontenido con el núcleo bajo `core/`. Dentro
del artefacto el núcleo se resuelve siempre por **ruta interna**, pero el *token*
difiere. Hay **tres modos**:

- **Claude Code — variable del harness**: `${CLAUDE_PLUGIN_ROOT}/core/…` (el harness
  la fija).
- **Kimi Code — ruta relativa al fichero**: el `system_prompt_path` del YAML apunta a
  `./prompts/<rol>.md`, y ese bootstrap referencia
  `../../core/roles/<idioma>/<rol>.md`, interno al artefacto. Kimi **no** ofrece
  variable de plugin-root; la ruta base se fija en la **instalación**. Los hooks
  importan el núcleo por ruta ESM interna (`../core/lib/…`), igual que en Claude.
- **opencode — ruta interna relativa al fichero del agente**: **tampoco hay variable
  de plugin-root**. El cuerpo del agente (que vive en `agents/`) instruye un `Read`
  de `../core/roles/<idioma>/<rol>.md`; los comandos invocan
  `../core/scripts/<script>.mjs` por la misma vía, y el plugin importa
  `../core/lib/require-spec.mjs` (ADR-007 §Decisión punto 2).

En los tres, el **token neutro `${SDD_ROOT}`** que usa la prosa del núcleo se
**materializa** en la ruta o variable de cada harness — y el núcleo no sabe cuál
(**ADR-004**): quien resuelve es exclusivamente el bootstrap del adaptador. En
opencode, `${SDD_ROOT}` es la raíz del artefacto, un nivel por encima de
`agents/`.

**Estado de validación de la vía de opencode**: la vía **preferida** de ADR-007
(bootstrap que hace `Read` por ruta interna) **quedó confirmada en runtime** contra
opencode **1.18.5** el **2026-07-27** — el primary y los cuatro subagentes ejercidos
leen su fichero de rol y citan la prosa (`[1.18.5 · 2026-07-27]`, acta [H1] §1). La
**alternativa** documentada en el ADR (registrar los agentes en `opencode.json` con
`prompt: "{file:./core/roles/es/<rol>.md}"`) **no fue necesaria** y queda como vía de
**respaldo**. Matiz operativo registrado: la resolución la hace el LLM, no el
harness, así que con un modelo débil puede despistarse de ruta — es coste de modelo,
no de diseño (acta [H1]).

`tools/checks/referencias.mjs` verifica que ninguna referencia escape del artefacto
en los **tres** modos; `referencias`, `roles-fuente-unica`, `manifiestos` y
`descripcion-fuente-unica` están **generalizados a los tres adaptadores** (el runner
`npm run check` los ejerce para claude-code, kimi-code y opencode).

### Enforcement L1: un espectro, no un binario

No basta preguntar "¿este harness tiene hooks?". Lo que hay que averiguar es **qué
hace su L1 cuando dice que no**, y el as-built da tres respuestas distintas:

| Harness | L1 | Anclaje |
|---|---|---|
| **Claude Code** | **deniega**: el hook emite `permissionDecision: 'deny'` en `PreToolUse`; ante error interno hace `catch { allow() }` → fail-open | `adapters/claude-code/hooks/require-spec.mjs`; ADR-002 §L1 |
| **Kimi Code** | **avisa** (asumido fail-open): el shim emite la misma decisión de deny, pero **que el CLI la honre no está verificado en este repo** — el smoke test de SPEC-003 valida formato, build y resolución **sin cuenta de Kimi**, y la operación end-to-end sigue pendiente (**F-SPEC-003-1**; SPEC-013 está `bloqueada`). **[hipótesis]** hasta que se ejerza | ADR-003 (el hook "degrada fail-open"); ledger SPEC-003 |
| **opencode** | **deniega de verdad**: el `throw` en `tool.execute.before` **aborta** la tool — `write` y `edit` terminan en `status: "error"` con el mensaje del gate y el fichero **intacto** (hash idéntico) | `[1.18.5 · 2026-07-27]`, acta [H2]; `docs/_qa/SPEC-014/ca5-enforcement/` |

**La constante, esté donde esté el harness en el espectro**: la garantía dura es
**L2 (git pre-commit) + L3 (CI)**, independientes del harness (**ADR-002**, RN-03).
"Nada se codea sin spec aprobada" **no depende** de que el harness ejecute nada.
Mover un adaptador por el espectro es legítimo; mover L2/L3 no lo es.

Dos detalles de orden observados en opencode, útiles para cualquier harness con dos
capas de control: el hook del plugin dispara **antes** que la evaluación de
`permission` (un deny/ask estático sobre la misma ruta no llega a verse si el plugin
lanza primero), y el modelo puede **alucinar éxito** tras un deny — la verdad está en
el evento de tool y en el filesystem, no en lo que el agente cuente
(`[1.18.5 · 2026-07-27]`, acta [H2]).

Una pregunta que conviene hacerle al harness en el mismo paso: **¿el hook puede saber
qué rol lo invoca?** De ello depende el otro hook L1, `protege-verdad` (los dueños de
`FOUNDATION.md` y `docs/fundacion/`). En opencode la identidad **no** viene como campo
directo del payload, pero es **resoluble indirectamente** (`sessionID` + el `client`
del contexto del plugin → la sesión conoce su `agent`) `[1.18.5 · 2026-07-27]`, acta
[H3]. **No está codeado**: es el follow-up **F-SPEC-014-2**, destino
**EPIC-003 / EPIC-MEJORA**; mientras tanto, ese hook degrada **fail-open** en opencode
con la garantía en L2/L3, igual que en Kimi.

### Procedimiento de instalación (Kimi, sin marketplace)

Kimi no tiene marketplace ni `plugin install` que sirva para el método (su
`plugin.json` solo transporta tools). Instalar el adaptador es un procedimiento
reproducible sobre el **artefacto autocontenido**:

```bash
npm run build:kimi                 # ensambla dist/kimi-code/ (núcleo dentro)
```

1. **Skills** → colócalas en un directorio que Kimi lee nativamente: copia
   `dist/kimi-code/skills/` a `.agents/skills/` del proyecto (o `~/.kimi/skills`).
2. **Agents** → registra el agente raíz por `kimi --agent-file <ruta absoluta a
   dist/kimi-code/agents/sdd-orquestador.yaml>` (los subagentes se resuelven por su
   mapa `subagents:`, rutas relativas al YAML raíz).
3. **Hooks** → añade el fragmento `dist/kimi-code/hooks/hooks.toml` a la config de
   Kimi (`~/.kimi/config.toml`), sustituyendo `<ARTIFACT_ROOT>` por la ruta
   absoluta a `dist/kimi-code/`.

La garantía "nada se codea sin spec aprobada" **no** depende de que Kimi tenga
hooks: la sostienen git pre-commit (L2) y CI (L3), independientes del harness
(ADR-002). El smoke test de SPEC-003 valida formato + build + resolución interna
**sin cuenta de Kimi**; la operación end-to-end multi-rol contra el CLI real de
Kimi es el follow-up **F-SPEC-003-1**.

### Procedimiento de instalación (opencode, sin marketplace)

Procedimiento **efectivo, ya ejercido** contra el CLI real `[1.18.5 · 2026-07-27]`
(fuente: `docs/_qa/SPEC-014/ca1-descubrimiento/procedimiento-e-hallazgos.md`; acta
§1 [H5]). Describe la instalación **as-built desde el repo**; instalar sin clon ni
build es **EPIC-004** (distribución), no esta guía.

```bash
npm run build:opencode             # ensambla dist/opencode/ (núcleo dentro)
cp -r dist/opencode/. <proyecto>/.opencode/
```

1. **Construir** el artefacto: `npm run build:opencode` → `dist/opencode/`
   autocontenido, con el núcleo bajo `core/`.
2. **Copiar TODO** `dist/opencode/.` a `<proyecto>/.opencode/`, **incluida la
   config**, que queda en `.opencode/opencode.json`. **La razón importa**: las rutas
   de la entrada `plugin` resuelven **relativas al fichero de config que las
   declara**, así que `"./plugins/require-spec.mjs"` solo resuelve si el manifiesto
   viaja junto al resto del artefacto, dentro de `.opencode/`. Ponerlo en la raíz del
   proyecto rompe el plugin.
3. **Overlay del proyecto (opcional y NO normativo)**: `<proyecto>/opencode.json` en
   la raíz, para **decisiones de uso** — modelo (`model`/`small_model`), `ask` por
   ruta, etc. Las configs **fusionan**: la resuelta une el overlay con la instalada
   (verificado en `debug config`; acta §2.3). Nada normativo del método vive aquí.
4. **Arrancar el CLI** en el proyecto. **Sin registro adicional**: agentes, comandos
   y skills se **auto-descubren** desde `.opencode/{agents,commands,skills}`. La
   **única excepción** es el plugin, que ya va registrado en el manifiesto (ver
   *Desviaciones*, entrada 1).
5. **Comprobar** que el descubrimiento fue completo:

   | Comando | Qué debe verse |
   |---|---|
   | `opencode agent list` | **7** agentes `sdd-*`: `sdd-orquestador (primary)` y los seis `(subagent)` |
   | `opencode debug config` | `command` con `sdd-init` y `sdd-tablero`; bloque `agent` con los 7 y sus `permission`; `permission` global fusionada; `plugin` resuelto a `file:///…/.opencode/plugins/require-spec.mjs` |
   | `opencode debug skill` | las **6** skills `sdd-*` desde `.opencode/skills/<rol>/SKILL.md` |

Igual que en Kimi: la garantía "nada se codea sin spec aprobada" **no** depende de
que opencode cargue el plugin. Aquí L1 además deniega de verdad, pero la garantía
sigue siendo git pre-commit (L2) y CI (L3), independientes del harness (**ADR-002**).

### Conducción no interactiva del CLI (pieza del recetario)

Documentar **cómo se conduce el CLI sin interacción** es parte del recetario, no un
extra: sin ella no se puede *evidenciar* ni *verificar* el pipeline de una épica de
harness (fue justo lo que faltó en la 1ª pasada — ver *Desviaciones*, entrada 5).
Cada adaptador debe dejar escrito: cómo se lanza un turno, cómo se continúa una
sesión, cómo se selecciona el rol y cómo se obtiene un transcript auditable.

As-built de opencode `[1.18.5 · 2026-07-27]` (acta §2.4; archiva **F-SPEC-014-4**):

- `opencode run` es el **modo no interactivo**; `--agent`, `--command`,
  `--format json` (eventos por línea: tool/text/step) y `-s/--session` para
  continuar. `opencode export <sesión>` da la sesión completa, incluidas las hijas
  de `task` (vía `metadata.sessionId`).
- **`--agent <subagente>` cae EN SILENCIO** al agente por defecto (`build`): con
  `--agent` solo se selecciona un **primary**. Los subagentes se ejercen vía `task`
  del primary.
- **`run -s` NO conserva el agente de la sesión**: hay que **re-pasar
  `--agent <primary>` en CADA turno** o la continuación corre como `build`. Omitirlo
  fue el origen del finding **V1** de la ronda 1 del piloto (los turnos 2-10, y con
  ellos cuatro delegaciones, corrieron como `build`); la ronda 2 lo corrigió y la
  sonda del verificador lo confirmó.
- Un permiso **`ask` se auto-rechaza** en `run` no interactivo ("The user rejected
  permission…", fichero intacto). Los `ask` son para uso interactivo; en pipelines
  automatizados equivalen a un deny.

### Abordar un harness nuevo: procedimiento

Ocho pasos, en orden. Cada uno lleva **la pregunta que hay que responder contra el
CLI o la doc reales** —nunca de memoria— y **el artefacto del repo que se toca**.

1. **Mecanismo de despacho → cómo se monta el orquestador.**
   *Pregunta*: ¿quién puede lanzar subagentes en este harness, y a través de qué
   (main-loop, agente raíz, agente primary, otra cosa)? ¿Hay tope de anidamiento?
   *Artefacto*: `adapters/<harness>/agents/` (+ `skills/` si el despacho pasa por
   ahí). Es la decisión de partida: condiciona todo lo demás.
2. **Mapeo de las piezas de la tabla.**
   *Pregunta*: para cada pieza (agents, skills, hooks/plugin, manifiesto, commands,
   permisos declarativos, tests), ¿cuál es su forma aquí — y **cuáles no existen**?
   Marcar las ausencias explícitamente vale tanto como mapear las presentes.
   *Artefacto*: `adapters/<harness>/` y una columna nueva en la tabla de piezas.
3. **Resolución del núcleo y materialización de `${SDD_ROOT}`.**
   *Pregunta*: ¿hay variable de plugin-root? Si no, ¿qué ruta interna es fiable, y
   relativa a qué fichero? *Artefacto*: el bootstrap del adaptador; `${SDD_ROOT}` se
   resuelve **solo ahí** (ADR-004), jamás en `core/`.
4. **Enforcement L1 en el espectro deniega / avisa / ausente.**
   *Pregunta*: ¿qué hace de verdad el harness cuando el hook dice "no" — aborta la
   tool o solo informa? ¿En qué orden se evalúa frente a otros controles?
   *Artefacto*: `adapters/<harness>/hooks|plugins/`, reutilizando
   `core/lib/require-spec.mjs` (solo shim de entrada). **L2/L3 no se tocan.**
5. **Descubrimiento y registro de cada pieza, verificado CONTRA EL CLI.**
   *Pregunta*: ¿qué carga el harness solo y qué exige registro explícito — y con qué
   granularidad (por directorio, por extensión de fichero, por entrada de config)?
   *Artefacto*: el manifiesto del adaptador. No lo deduzcas del manifiesto ni de la
   doc: **ejecútalo y mira** (entrada 1 de *Desviaciones*).
6. **Trabajo fuera de `adapters/`.**
   *Pregunta*: ¿qué checks hay que generalizar y qué scripts hay que añadir?
   *Artefacto*: la segunda lista de esta guía — `package.json`, `tools/check.mjs`
   (`PASOS`), `tools/checks/*`, `tools/tests/*`. Presupuéstalo desde el principio.
7. **Conducción no interactiva del CLI.**
   *Pregunta*: ¿cómo se lanza un turno, se continúa una sesión, se fija el rol y se
   obtiene transcript? *Artefacto*: esta guía (subsección de conducción) y el acta de
   la épica. Sin esto no hay evidencia posible del paso 8.
8. **Ejercicio real del pipeline y registro de desviaciones DE VUELTA AQUÍ.**
   *Pregunta*: ¿el ciclo init → épica → spec → implementación → verificación corre
   **desde ese CLI**, con los gates como turnos? ¿Qué se rompió?
   *Artefacto*: acta durable en `docs/estudios/`, evidencia en `docs/_qa/<SPEC>/`, y
   —lo que cierra el bucle— **una entrada nueva en *Desviaciones registradas* por
   cada cosa que esta guía no predijo**.

### Predicción (doc) vs. as-built (CLI): qué cerró el bucle

El estudio de capacidades §6 predijo el contraste de los tres harnesses **sobre
documentación, el 2026-07-23**; el piloto lo ejerció **contra el CLI 1.18.5, el
2026-07-27**. El bucle cerró así (detalle en
[el estudio](estudios/opencode-capacidades.md) §6 y en
[el acta](estudios/opencode-piloto.md) §1-2; aquí no se reproducen):

- **Predicho `[doc 2026-07-23]` y confirmado `[1.18.5 · 2026-07-27]`**: paridad de
  commands por fichero con Claude Code; orquestador como agente primary con jerarquía
  plana (`subagent_depth` 1); ausencia de variable de plugin-root (núcleo por ruta
  interna, como Kimi); L1 que **deniega** de verdad.
- **Predicho pero insuficiente / no previsto**: que el auto-descubrimiento tuviera
  una **excepción por extensión** y no cargara el plugin `.mjs`; la **precedencia de
  permisos** (un `allow` plano por-agente pisa el deny global por-ruta); y toda la
  **conducción no interactiva del CLI**, que el estudio no fijaba y sin la cual no
  hay evidencia del pipeline.

Moraleja para el cuarto harness: la doc sirve para diseñar la **forma**; solo el CLI
decide la **mecánica**. Presupuesta un lazo RED→GREEN por cada pieza que dependa de
cómo el harness *carga* las cosas.

### Desviaciones registradas (2ª pasada, EPIC-003 CE-4)

Lo que la 1ª pasada de esta guía **decía o callaba**, frente a lo que pasó de verdad
al añadir el tercer harness. Cada entrada: *qué decía la guía* · *qué pasó* ·
*evidencia* · *corrección o follow-up con destino*.

**1. El auto-descubrimiento tiene excepciones por extensión de fichero.**
- *Qué callaba la guía*: nada decía sobre verificar el **registro** de cada pieza
  contra el CLI; la instalación se describía como "copiar y arrancar".
- *Qué pasó*: opencode 1.18.5 auto-descubre `.opencode/{agents,commands,skills}` sin
  registro alguno, **pero solo auto-descubre plugins `*.ts`/`*.js`**. El plugin del
  adaptador es `.mjs` y **no cargaba** — el enforcement estaba silenciosamente
  ausente.
- *Evidencia*: lazo RED→GREEN de SPEC-014 CA-1, commit `f899c19`;
  `docs/_qa/SPEC-014/ca1-descubrimiento/procedimiento-e-hallazgos.md` (sondas `.js`
  vs `.mjs`: el marcador del `.js` se escribió, el del `.mjs` no).
- *Corrección aplicada*: el manifiesto registra
  `"plugin": ["./plugins/require-spec.mjs"]` (la vía de registro explícito que
  ADR-007 [H5] ya preveía). Y la guía incorpora la lección como **paso 5** del
  procedimiento: **el descubrimiento se verifica pieza a pieza contra el CLI; no se
  deduce del manifiesto ni de la doc.**

**2. El coste NO cabe en `adapters/<harness>/`.**
- *Qué decía la guía*: "un adaptador es `adapters/<harness>/` y **solo** contiene
  superficie de adaptador" — cierto como invariante de **contenido**, engañoso leído
  como presupuesto de **trabajo**.
- *Qué pasó*: añadir un harness tocó **siempre** también `tools/checks/*`,
  `tools/tests/*`, `tools/check.mjs` (`PASOS`) y `package.json`. En SPEC-014, además,
  `tools/checks/manifiestos.mjs` por el lazo ADR-009.
- *Evidencia*: commits `f497c74` (Kimi), `d05a3bb` y `35e17b5` (opencode), `8f6e690`
  (lazo ADR-009); salvedad **F-SPEC-014-1**, aceptada ⚠️ por el verificador en
  SPEC-014 CA-8 (no se rejuzga aquí).
- *Corrección aplicada*: la guía declara la **segunda lista explícita** de puntos de
  integración fuera de `adapters/` (arriba) y precisa que la promesa intacta de
  EPIC-001 CE-5 es **"sin tocar el núcleo"** (RN-02, verificado tres veces por
  `nucleo-aislado`), no "sin tocar nada más".

**3. La asimetría del orquestador es una decisión de partida, no una nota al pie.**
- *Qué decía la guía*: la enunciaba como una curiosidad **binaria** al final de la
  tabla de piezas (skill en Claude vs. agente raíz en Kimi).
- *Qué pasó*: con tres harnesses hay **tres** montajes distintos, y el montaje es lo
  primero que hay que resolver: arrastra cómo se montan skills, permisos y gates.
- *Evidencia*: ADR-003 punto 7; ADR-007 §Decisión punto 4; acta [H4]
  `[1.18.5 · 2026-07-27]`.
- *Corrección aplicada*: sube a subsección propia (*La asimetría del orquestador*) y
  se convierte en el **paso 1** del procedimiento de *Abordar un harness nuevo*.

**4. Faltaba la pieza "permisos declarativos".**
- *Qué callaba la guía*: la lista cerrada de piezas no contemplaba una capa de
  permisos declarativa; se asumía que el control de escritura era cosa de los hooks.
- *Qué pasó*: opencode tiene `permission` por agente y por patrón de ruta — y **tiene
  trampa doble**. (a) `edit: "deny"` **en seco RETIRA la tool** del agente: el
  verificador del fixture no pudo usar `edit` y escribió su ledger esquivando por
  `bash cat >`. (b) Un `edit: "allow"` **plano por-agente PISA** el deny global por
  ruta: el implementador editó `docs/tablero.md` pese al deny del generado.
- *Evidencia*: acta §2.1 y §2.2; commit `8f6e690` (lazo ADR-009: `edit` granular
  `"*": deny` + allow de `docs/epicas/**/*.ledger.md` y `docs/_qa/**`);
  `docs/_qa/SPEC-014/ca6-overlay/ca6-precedencia.json`.
- *Corrección aplicada / follow-up*: fila nueva en la tabla de piezas, con la
  advertencia de que esta capa es **complementaria y estática** — nunca la garantía
  (**ADR-002**: L1 degrada, no desprotege; la de RN-05 queda en L2/L3). La
  **solución** de la precedencia (b) **no se decide aquí**: es **F-SPEC-014-3**, con
  destino **EPIC-004 — Distribución del artefacto a runtime**, porque se resuelve en
  el documento de instalación que esa épica reescribe.

**5. La guía no pedía documentar cómo se CONDUCE el CLI.**
- *Qué callaba la guía*: describía cómo **instalar** un adaptador, no cómo
  **operarlo** sin interacción. Sin eso, el CE-1 de una épica de harness ("el ciclo
  completo corre desde ese CLI") no se puede evidenciar ni verificar.
- *Qué pasó*: la conducción resultó tener comportamientos que cambian el resultado y
  que **no aparecen en ninguna doc**: `--agent <subagente>` cae en silencio a `build`;
  `run -s` no conserva el agente de la sesión; un `ask` se auto-rechaza en no
  interactivo.
- *Evidencia*: acta §2.4 y fe de erratas de [H4]; finding **V1** de la ronda 1 de la
  verificación de SPEC-014 (diez turnos ejecutados con el agente equivocado por
  omitir `--agent`); sonda `docs/_qa/SPEC-014/verif/verif-sonda-continuacion-respeta-agent.json`.
- *Corrección aplicada*: la guía exige la **conducción no interactiva** como pieza del
  recetario (subsección propia + **paso 7** del procedimiento). Con ello se **archiva
  F-SPEC-014-4**, cuyo destino declarado era esta spec.

**6. El enforcement L1 no es binario.**
- *Qué decía la guía*: lo trataba como "hay hooks / no hay hooks", con Kimi como
  "tiene hooks casi idénticos".
- *Qué pasó*: los tres harnesses caen en puntos distintos de un espectro — Claude Code
  **deniega** (fail-open ante error del hook), Kimi **avisa** (fail-open; su deny en
  runtime sigue **sin verificar**), opencode **deniega de verdad** (`throw` que aborta
  la tool). Y el orden importa: el hook del plugin dispara **antes** que la evaluación
  de `permission`.
- *Evidencia*: `adapters/claude-code/hooks/require-spec.mjs` (`catch { allow() }`);
  ADR-003 y F-SPEC-003-1 / SPEC-013 `bloqueada` (Kimi sin ejercer); acta [H2] y
  `docs/_qa/SPEC-014/ca5-enforcement/` `[1.18.5 · 2026-07-27]`.
- *Corrección aplicada*: subsección *Enforcement L1: un espectro, no un binario*, con
  la constante invariable de que **L2 + L3 son la garantía** (**ADR-002**, RN-03), y
  **paso 4** del procedimiento redactado sobre el espectro.
