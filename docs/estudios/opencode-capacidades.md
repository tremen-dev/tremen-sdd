# Estudio: mapa de capacidades de opencode → necesidades del adaptador

> Artefacto durable de **SPEC-009** (EPIC-003). Materializa y confirma
> **[ADR-007](../adr/ADR-007-encaje-de-opencode-y-su-modelo-de-enforcement.md)**
> contra la documentación **real y vigente** de opencode. Toda afirmación de
> capacidad va **citada con fuente + fecha de consulta** o marcada `[HIPÓTESIS]`
> con cómo se confirmaría contra el CLI (RN de método de EPIC-003).
>
> **La decisión de encaje y enforcement la fija ADR-007 (inmutable, RN-04).**
> Este documento es su respaldo documental y la lista accionable de hipótesis;
> no redecide nada. Donde la doc real matiza lo que ADR-007 asumió, se anota en
> "§7 Hallazgos frente a ADR-007" (sin editar el ADR).

- Autor: sdd-implementador · SPEC-009 · rama `ft/SPEC-009-estudio-capacidades-opencode`
- **Fecha de consulta de todas las fuentes opencode.ai/docs: 2026-07-23** (salvo
  que una fila indique otra).

## 1. Fuentes primarias (opencode.ai/docs, consultadas 2026-07-23)

| # | Fuente | Qué fija |
|---|---|---|
| S1 | <https://opencode.ai/docs/agents/> | Agentes: frontmatter, modos primary/subagent, prompt inline vs `{file:...}`, directorios, invocación por `task`/`@mención`. |
| S2 | <https://opencode.ai/docs/commands/> | Slash-commands por fichero markdown, frontmatter, placeholders, override de built-ins. |
| S3 | <https://opencode.ai/docs/skills/> | `SKILL.md`, tool nativa `skill`, directorios que opencode lee (incl. `.claude/` y `.agents/`). |
| S4 | <https://opencode.ai/docs/plugins/> | Plugins JS/TS, hooks (`tool.execute.before/after`, `permission.*`, `session.*`…), contexto del plugin, ejemplo `.env` con `throw`. |
| S5 | <https://opencode.ai/docs/permissions/> | Clave `permission`, `allow`/`ask`/`deny`, patrones, tipos cubiertos, overrides por agente, `task` = tipo de subagente. |
| S6 | <https://opencode.ai/docs/config/> | `opencode.json(c)`, substituciones `{env:...}`/`{file:...}`, ausencia de plugin-root, `subagent_depth` default 1. |

## 2. Mapa capacidad → necesidad (tabla principal — CA-1)

Cubre, una fila por pieza, las **seis piezas** de la lista cerrada de un adaptador
(guía "Añadir un harness", `docs/arquitectura.md`) **más** la **resolución del
núcleo** y el **modelo de orquestación** (8 filas). "Paridad" = cubre lo mismo que
Claude Code; "degradación" = cubre menos; "hipótesis" = por confirmar contra CLI.

| # | Pieza / necesidad del adaptador | Mecanismo de opencode que la cubre | Fuente | Paridad / degradación / hipótesis |
|---|---|---|---|---|
| 1 | **agents/** — un rol por fichero, cuerpo = *bootstrap* que referencia la prosa del núcleo (no la copia) | Un `.md` por rol en `.opencode/agents/` (**plural**). Frontmatter: `description`, `mode` (`primary`\|`subagent`), `model`, `temperature`, `permission`, `prompt`, `tools`(deprecado)… El **cuerpo markdown bajo el frontmatter ES el system prompt** | S1 | **Paridad**. Cuerpo = bootstrap que hace `Read` de `core/roles/es/<rol>.md` por ruta interna. La *mecánica exacta* de resolución de esa ruta interna es **[H1]** |
| 2 | **commands/** — slash-commands por fichero (`/sdd-init`, `/sdd-tablero`) | Markdown en `.opencode/commands/` (**plural**); el **nombre de fichero = nombre del comando**; frontmatter `description`/`agent`/`model`/`subtask`; placeholders `$ARGUMENTS`, `$1..$n`, `` !`cmd` ``, `@fichero`; **pueden sobrescribir built-ins** | S2 | **Paridad con Claude Code** (Kimi no tiene slash-commands por fichero) |
| 3 | **skills/** — `SKILL.md` que despacha al subagente del rol | `SKILL.md` (frontmatter `name`/`description` + cuerpo), invocada por la **tool nativa `skill`**. opencode lee `.opencode/skills/<n>/SKILL.md`, **y también** `.claude/skills/…` y `.agents/skills/…` (proyecto y global) | S3 | **Paridad**, sin prefijo de plugin. La skill despacha al subagente vía la tool `task` |
| 4 | **plugin (hooks)/** — enforcement en-harness (L1) sobre rutas vigiladas | Módulo **JS/TS** en `.opencode/plugins/` (o npm en config). Hooks: `tool.execute.before`/`after`, `permission.asked`/`replied`, `session.*`, `message.*`, `command.executed`, `file.edited`… Contexto: `project`, `directory`, `worktree`, `client` (SDK), `$` (shell Bun). **`throw` en `tool.execute.before` aborta la tool** (ejemplo oficial `.env`) | S4 | **Paridad, y más fuerte que Kimi**: L1 **deniega** (no solo avisa). Fiabilidad del `throw`-deny y payload suficiente = **[H2]** |
| 5 | **manifiesto / config** — registro de piezas + permisos declarativos | `opencode.json`/`.jsonc` (proyecto) y `~/.config/opencode/`. Registra agents/commands/plugin; clave `permission` (`allow`/`ask`/`deny`, patrones, overrides por agente). Substituciones `{env:VAR}`, `{file:ruta}`. **Sin marketplace** | S5, S6 | **Paridad funcional** con `plugin.json`+`marketplace.json` de Claude, pero **sin marketplace** (como Kimi): instalación por procedimiento = **[H5]** |
| 6 | **tests/** — tests del adaptador contra el artefacto construido | No es capacidad de opencode: los aporta el repo (build → `dist/opencode/`, tests contra `dist/`), como en Claude/Kimi | `docs/arquitectura.md` §"El paso de build" | **Paridad** (mecánica de repo, agnóstica de harness) |
| 7 | **Resolución del núcleo** — el rol vive solo en `core/`; el adaptador lo referencia por ruta interna al artefacto | **Sin variable de plugin-root** (`OPENCODE_PLUGIN_ROOT` **no existe**; sí `OPENCODE_CONFIG_DIR`/`OPENCODE_CONFIG`). Vía preferida: el cuerpo del agente `Read`ea por ruta interna. Alternativa **documentada**: `prompt: "{file:./ruta}"` (relativa al fichero de config) | S6, S1 | **Paridad de resultado (fuente única intacta), montaje como Kimi** (ruta interna fijada en instalación). Cuál de las dos vías = **[H1]** |
| 8 | **Modelo de orquestación** — orquestador despacha el pipeline de 6 subagentes con gates humanos | Orquestador = agente **`mode: primary`**; los seis `sdd-*` = **`mode: subagent`**. El primary delega por la **tool `task`** (o `@mención`). `subagent_depth` **default 1**: un primary lanza subagentes, los subagentes **no** lanzan más | S1, S6 | **Paridad de comportamiento** (replica el guard "solo raíz despacha" de Kimi). Despacho de los 6 + gates como turnos = **[H4]** |

> Las 8 filas identificables: (1) agents, (2) commands, (3) skills, (4) plugin/hooks,
> (5) manifiesto/config, (6) tests, (7) resolución del núcleo, (8) orquestación.

## 3. Detalle citado por pieza (CA-2)

Toda afirmación abajo lleva su fuente (S1–S6, consulta 2026-07-23) o marca
`[HIPÓTESIS]`.

### 3.1 Agentes (S1)
- Frontmatter soportado: `description`, `mode`, `model`, `temperature`,
  `permission`, `prompt`, `tools` (deprecado), y opciones adicionales. (S1)
- Dos modos: **primary** (asistente de interacción directa; se ciclan con Tab) y
  **subagent** (invocado por un primary o por `@mención`). (S1)
- Para un **agente markdown** (`.opencode/agents/<rol>.md`) el **system prompt es
  el cuerpo bajo el frontmatter**: *"The text after the closing `---` is the system
  prompt."* (S1)
- Directorios **en plural**: `.opencode/agents/` (proyecto) y
  `~/.config/opencode/agents/` (global). (S1)
- Invocación primary→subagent: automática por descripción, por la **tool `task`**
  (controlada por `permission.task`), o manual por **`@mención`**. (S1)
- Campo `prompt` como fichero externo: la doc muestra, en la forma **JSON config**,
  `"prompt": "{file:./prompts/build.txt}"` y aclara *"This path is relative to where
  the config file is located."* (S1) — ver §7, matiz frente a ADR-007.

### 3.2 Comandos (S2)
- *"Create markdown files in the `commands/` directory to define custom commands."* (S2)
- *"The markdown file name becomes the command name. For example, `test.md` lets you
  run: `/test`."* (S2)
- Frontmatter: `description`, `agent`, `model`, `subtask` (fuerza invocación de
  subagente). (S2)
- Placeholders: `$ARGUMENTS`, `$1..$n`, `` !`cmd` `` (salida de shell), `@fichero`
  (contenido). (S2)
- *"Custom commands can override built-in commands."* (S2)

### 3.3 Skills (S3)
- `SKILL.md` con frontmatter `name`/`description` + cuerpo; invocadas por la **tool
  nativa `skill`**. (S3)
- opencode busca en: `.opencode/skills/<n>/SKILL.md`, `~/.config/opencode/skills/…`,
  **`.claude/skills/…`**, `~/.claude/skills/…`, **`.agents/skills/…`**,
  `~/.agents/skills/…`. (S3)

### 3.4 Plugins / hooks (S4)
- Plugins en **JavaScript o TypeScript**, en `.opencode/plugins/` (proyecto) o
  `~/.config/opencode/plugins/` (global). (S4)
- Categorías de hooks: command, file, installation, LSP, message, permission,
  server, session, todo, shell, **tool**, TUI. Incluye `tool.execute.before` y
  `tool.execute.after`. (S4)
- Contexto del plugin: `project`, `directory`, `worktree`, `client` (SDK de
  opencode), `$` (shell de Bun). (S4)
- **`throw` deniega**: el ejemplo oficial "Prevent opencode from reading `.env`
  files" hace, dentro del hook de tool,
  `if (input.tool === "read" && output.args.filePath.includes(".env")) { throw new
  Error("Do not read .env files") }`. (S4) La doc **no formaliza** el mecanismo de
  aborto en prosa; el comportamiento se infiere del ejemplo oficial → por eso es
  **[H2]**.

### 3.5 Permisos (S5)
- Clave `permission` en `opencode.json`; valores `allow`/`ask`/`deny`. (S5)
- Patrones con `*` (catch-all) y `?`; la regla más específica gana:
  `"bash": {"git *": "allow", "rm *": "deny"}`. (S5)
- Tipos cubiertos: `read`, `edit` (incluye write/patch), `glob`, `grep`, `bash`,
  `task`, `skill`, `lsp`, `question`, `webfetch`, `websearch`,
  `external_directory`, `doom_loop`. (S5)
- `task` = *"launching subagents (matches the subagent type)"* → controla **qué
  subagentes** puede lanzar cada agente. (S5)
- **Overrides por agente**: *"Agent permissions are merged with the global config,
  and agent rules take precedence."* (S5)

### 3.6 Config / resolución de rutas (S6)
- `opencode.json` / `opencode.jsonc`; global en `~/.config/opencode/opencode.json`. (S6)
- Substituciones: `{env:VARIABLE_NAME}` y `{file:path}` (relativa al directorio de
  config o absoluta con `/`·`~`). (S6)
- **No hay variable de plugin-root**: no existe `OPENCODE_PLUGIN_ROOT`; sí
  `OPENCODE_CONFIG_DIR` y `OPENCODE_CONFIG`. (S6)
- `{file:...}` documentado para `instructions` (`"instructions": ["./custom-instructions.md"]`). (S6)
- **`subagent_depth` default 1**: *"The default is 1, which allows primary agents to
  launch subagents but prevents those subagents from launching additional
  subagents."* (S6)

## 4. Resolución de enforcement (CA-3) — trazada a ADR-007

**Decisión (la fija ADR-007, §Decisión punto 3; aquí se confirma su base
documental):** el enforcement en-harness de opencode alcanza la **dureza de un gate
real**: un **plugin** que en `tool.execute.before` invoca la lógica compartida
`core/lib/require-spec.mjs` y **`throw`ea para DENEGAR** escrituras fuera del carril
`ft/SPEC-NNN` + spec aprobada. **No es best-effort como Kimi**: L1 deniega, no solo
avisa (CE-3 **no degradado, más fuerte que Kimi**).

- **Afirmación central citada (fuente + fecha):** *"`throw` en `tool.execute.before`
  aborta la tool"* se apoya en el ejemplo oficial `.env`
  (`throw new Error("Do not read .env files")`) — **S4**,
  <https://opencode.ai/docs/plugins/>, consultado **2026-07-23**.
- **Matiz honesto:** la doc **no formaliza en prosa** el mecanismo de aborto; el
  comportamiento se **infiere del ejemplo oficial**. Por eso la fiabilidad del
  `throw`-deny sobre `edit`/`write` (no solo `read`) y la suficiencia del payload
  quedan como **[H2]**, a ejercer contra el CLI.
- **Garantía última independiente del harness (ADR-002 intacto):** aunque opencode
  no ejecutara el plugin, "nada se codea sin spec aprobada" lo sostienen **git
  pre-commit (L2) + CI (L3)** sobre la misma `require-spec.mjs`. La `permission`
  declarativa de `opencode.json` es capa **complementaria** (estática: no evalúa
  "¿spec aprobada + rama correcta?"), no el gate require-spec.

**Registro de la decisión:** este documento **remite a
[ADR-007](../adr/ADR-007-encaje-de-opencode-y-su-modelo-de-enforcement.md)** (§Decisión,
puntos 3 y 5) como el ADR inmutable que fija el modelo de enforcement; la resolución
de aquí **coincide** con la de ADR-007.

## 5. Hipótesis a verificar contra el CLI real (CA-4)

Lista enumerada, **alineada con [H1]…[H5] de ADR-007** (§Asunciones marcadas). Cada
hipótesis: **qué asume**, **por qué la doc no basta**, **cómo se confirma contra el
CLI** (comando/flujo concreto). Son accionables para el **piloto real** de opencode
(specs posteriores de EPIC-003), no se ejecutan en esta spec.

- **[H1] Resolución del prompt de rol por ruta interna.**
  - *Asume:* el cuerpo-inline de un agente markdown puede instruir un `Read` por
    **ruta interna** fiable al artefacto autocontenido; o, en su defecto, se registra
    el agente en `opencode.json` con `prompt: "{file:./core/roles/es/<rol>.md}"`
    (relativa al config). Ambas mantienen la fuente única (el cuerpo del rol vive
    solo en `core/`).
  - *Por qué la doc no basta:* S1 confirma que el cuerpo markdown es el prompt y que
    `{file:...}` funciona en `prompt` **en la forma JSON config**; **no** documenta
    si un `Read` inline resuelve fiablemente una ruta relativa interna desde el
    directorio de trabajo, ni si `{file:...}` en `prompt` de un **agente markdown**
    (no JSON) se comporta igual.
  - *Cómo se confirma:* instalar `dist/opencode/` en un proyecto piloto; lanzar el
    agente `sdd-arquitecto` y comprobar en la transcripción que cargó
    `core/roles/es/sdd-arquitecto.md` (comparar contra el `.md` fuente). Si la vía
    inline falla, repetir registrando el agente en `opencode.json` con
    `prompt: "{file:...}"` y confirmar que carga la prosa.

- **[H2] Fiabilidad del `throw`-deny en `tool.execute.before`.**
  - *Asume:* `throw` en `tool.execute.before` **aborta de verdad** un `edit`/`write`
    (no solo un `read`, no solo lo salta) y el hook ve `tool_input`/paths suficientes
    para decidir require-spec.
  - *Por qué la doc no basta:* S4 solo muestra el ejemplo `.env` sobre `read`; el
    mecanismo de aborto no está formalizado en prosa.
  - *Cómo se confirma:* con el plugin del adaptador instalado y **sin** rama
    `ft/SPEC-NNN`, pedir al agente que edite un fichero bajo ruta vigiada
    (`core/scripts/…`); confirmar que la tool `edit` **queda abortada** (el fichero
    no cambia) y que el mensaje de `require-spec` aparece. Repetir con un `write`.

- **[H3] Identidad de agente para `protege-verdad`.**
  - *Asume:* el plugin puede leer identidad de agente/sesión suficiente para saber si
    el actor es owner de FOUNDATION/roles (hook `protege-verdad`).
  - *Por qué la doc no basta:* el contexto del plugin (S4: `project`, `directory`,
    `worktree`, `client`, `$`) no documenta explícitamente un identificador de agente
    en el payload de `tool.execute.before`.
  - *Cómo se confirma:* en el plugin, volcar el payload de `tool.execute.before`
    (via `client`/args) al editar FOUNDATION.md desde distintos agentes; comprobar si
    hay un campo de identidad de agente. Si no lo hay, `protege-verdad` **degrada
    fail-open** y la garantía la sostienen L2/L3 (como en Kimi).

- **[H4] Despacho orquestador-primary → 6 subagentes con `subagent_depth=1` y gates
  humanos como turnos.**
  - *Asume:* el orquestador (`mode: primary`) despacha los seis `sdd-*`
    (`mode: subagent`) por la tool `task` con `subagent_depth=1`, y los gates humanos
    se modelan como turnos del primary (invoca → recibe informe → PARA y pregunta →
    siguiente `task`).
  - *Por qué la doc no basta:* S1/S6 confirman el modelo primary/subagent y el default
    1, pero no que el flujo de 6 roles + gates se comporte end-to-end en runtime.
  - *Cómo se confirma:* correr en el piloto un pipeline mínimo (producto → arquitecto)
    desde el orquestador-primary; confirmar que lanza subagentes, que un subagente
    **no** puede lanzar otro (guard `subagent_depth=1`), y que el primary puede PARAR
    para el gate humano entre `task`s.

- **[H5] Descubrimiento / instalación sin marketplace.**
  - *Asume:* el procedimiento coloca agents/commands/skills en `.opencode/*` y
    registra el plugin en `opencode.json` con rutas al artefacto, y opencode los
    **descubre** (queda por fijar si auto-descubre `.opencode/` del proyecto o exige
    config explícita).
  - *Por qué la doc no basta:* S5/S6 documentan el formato de config y `permission`,
    pero no un `plugin install`/marketplace (no existe) ni el auto-descubrimiento
    exacto de `.opencode/` del proyecto para todas las piezas.
  - *Cómo se confirma:* tras copiar `dist/opencode/` a `.opencode/` del proyecto
    piloto (o config global), arrancar el CLI y comprobar que aparecen los comandos
    `/sdd-*`, que los agentes son invocables y que el plugin carga (log de arranque).

## 6. Contraste con la guía "Añadir un harness" y los adaptadores existentes (CA-5)

Contra `docs/arquitectura.md` §"Añadir un harness" (lista cerrada de piezas) y
**[ADR-003](../adr/ADR-003-empaquetado-y-resolucion-del-nucleo-para-el-adaptador-kimi-code.md)**
(empaquetado/resolución sin marketplace ni plugin-root). Se marcan las **asimetrías**.

| Pieza | Claude Code | Kimi Code | **opencode** | Asimetría |
|---|---|---|---|---|
| **agents/** | un `.md` por rol (frontmatter + prosa que referencia el rol) | YAML del agente raíz + `.yaml` por subagente + `agents/prompts/<rol>.md` | un `.md` por rol en `.opencode/agents/`; cuerpo = bootstrap; `mode: subagent` para los seis; orquestador `mode: primary` | opencode ≈ Claude en forma (un `.md`/rol), pero **orquestador primary** (no skill) |
| **commands/** | `/sdd-init`, `/sdd-tablero` (slash por fichero) | **ninguno** (sin slash-commands por fichero) | `.opencode/commands/*.md` — **SÍ** por fichero | **commands por fichero SÍ en opencode y Claude, NO en Kimi** |
| **skills/** | `SKILL.md` con prefijo de plugin `tremen-sdd:` | `SKILL.md` que instruyen al agente raíz (sin prefijo) | `SKILL.md` que despachan por la tool `task` (sin prefijo) | opencode ≈ Kimi (sin prefijo de plugin) |
| **hooks / plugin** | entrypoints `.mjs` + `hooks.json` | entrypoints `.mjs` (shim) + fragmento `hooks.toml`; L1 **fail-open** (solo avisa si el harness no deniega) | plugin JS/TS + `tool.execute.before` que **`throw`ea para DENEGAR** | **enforcement L1 deniega en opencode** (gate real); Kimi L1 no deniega |
| **manifiesto** | `.claude-plugin/plugin.json` + `marketplace.json` | **ninguno** (sin marketplace) | `opencode.json` (registra piezas + `permission`); **sin marketplace** | opencode ≈ Kimi (sin marketplace), pero **sí** tiene manifiesto de config |
| **Resolución núcleo** | `${CLAUDE_PLUGIN_ROOT}/core/…` (variable del harness) | ruta **relativa al fichero** interna al artefacto (sin plugin-root) | ruta **interna** al artefacto (sin plugin-root); `${SDD_ROOT}` neutro se materializa como esa ruta | opencode ≈ Kimi (**sin plugin-root**), ≠ Claude (que tiene variable) |
| **Orquestador** | **skill** (el main-loop despacha) | **agente raíz** (único que llama a `Agent`; guard `role != "root"`) | **agente `mode: primary`** (despacha por tool `task`; `subagent_depth=1`) | **tres montajes distintos** (skill vs raíz vs primary), **misma prosa** `sdd-orquestador` |
| **tests/** | contra `dist/` | contra `dist/` | contra `dist/opencode/` | sin asimetría (mecánica de repo) |

**Asimetrías clave (explícitas):**
1. **Orquestador**: *skill* en Claude Code, *agente raíz* en Kimi, *agente primary*
   en opencode — misma prosa (`sdd-orquestador`), montaje distinto según el mecanismo
   de despacho (ADR-003 punto 7; ADR-007 §Decisión punto 4).
2. **Commands por fichero**: **SÍ** en opencode y Claude Code; **NO** en Kimi
   (`docs/arquitectura.md`, tabla de piezas).
3. **Enforcement L1**: **deniega** en opencode (`throw` en `tool.execute.before`);
   en Kimi L1 es fail-open (la garantía dura recae en L2/L3). En ambos, git+CI son la
   red independiente del harness (ADR-002).
4. **Sin plugin-root**: opencode y Kimi resuelven el núcleo por **ruta interna**
   (ADR-003); Claude Code usa la variable `${CLAUDE_PLUGIN_ROOT}`.

## 7. Hallazgos frente a ADR-007 (para escalar; **no se edita el ADR** — RN-04)

La doc real **confirma** el grueso de ADR-007. Dos matices, **ambos favorables o
neutros** (ninguno contradice la *forma* fijada por el ADR):

1. **Campo `prompt` con `{file:...}` en agentes — matiz que de-riesga [H1].**
   ADR-007 (§Contexto, viñeta *Config*) marcó `{file:...}` como *"no confirmado para
   el campo `prompt` de un agente"*, y (§Contexto, viñeta *Agentes*) dijo que *"en
   agentes-markdown NO se documenta un campo `prompt` que apunte a fichero externo"*.
   La doc real (S1, 2026-07-23) **sí muestra** `"prompt": "{file:./prompts/build.txt}"`
   con *"This path is relative to where the config file is located."* — en la **forma
   JSON config** del agente. **Lectura:** la "Alternativa" de ADR-007 (§Decisión punto
   2: registrar agentes en `opencode.json` con `prompt: "{file:...}"`) queda
   **documentada y de-riesgada**; para un **agente markdown** sigue siendo cierto que
   el cuerpo es el prompt. No contradice el ADR: lo **precisa**. [H1] se mantiene como
   verificación de cuál de las dos vías se adopta.

2. **Mecanismo de aborto del `throw` no formalizado en prosa — refuerza por qué [H2]
   existe.** ADR-007 afirma como CRÍTICO que `throw` en `tool.execute.before` aborta
   la tool. La doc lo **respalda con el ejemplo oficial `.env`** (S4) pero **no lo
   formaliza en prosa**. Coherente con que ADR-007 ya lo dejara marcado `[H2]`. Sin
   contradicción; la spec del enforcement debe ejercerlo antes de comprometer el
   diseño.

**No se detectó ninguna capacidad que la doc real contradiga** respecto a lo que
ADR-007 asumió. Los directorios en plural (`.opencode/agents/`, `/commands/`,
`/plugins/`, `/skills/`), `subagent_depth` default 1, la ausencia de plugin-root,
los slash-commands por fichero y el modelo primary/subagent quedan **confirmados**.

## 8. Trazabilidad

- **CA-1** → §2 (tabla de 8 filas).
- **CA-2** → §1 (fuentes) + §3 (detalle citado por pieza); afirmaciones sin cita van
  marcadas `[HIPÓTESIS]` en §5.
- **CA-3** → §4 (resolución de enforcement + remisión a ADR-007, afirmación central
  citada S4/2026-07-23).
- **CA-4** → §5 ([H1]…[H5], cada una con qué asume / por qué / cómo se confirma).
- **CA-5** → §6 (contraste 3 harnesses, cita ADR-003 y `arquitectura.md`).
- **CA-6** → solo `docs/`; sin tocar `core/`/`tools/`/`adapters/`; `npm test` verde.
