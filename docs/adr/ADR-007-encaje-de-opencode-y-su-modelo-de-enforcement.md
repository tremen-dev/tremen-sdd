---
id: ADR-007
tipo: adr
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-07-23, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-22, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# ADR-007: Encaje de opencode y su modelo de enforcement

- Deciders: propone sdd-arquitecto; aprueba el humano (pendiente, gate humano).
- Specs relacionadas: SPEC-009 (Estudio y mapa de capacidades de opencode) lo
  materializa/confirma contra el CLI real; SPEC de adaptador y de enforcement de
  EPIC-003 lo consumen. **Complementa** ADR-001 (build/empaquetado), ADR-002
  (enforcement en capas L1/L2/L3) y ADR-003 (empaquetado/resolución de un harness
  sin marketplace ni plugin-root); **NO** los supersede. Origen: EPIC-003, CE-2
  (paridad de roles/comandos), CE-3 (enforcement no degradado) y CE-4 (coste de
  adaptador acotado).

## Contexto

EPIC-003 añade **opencode** como tercer harness con **paridad completa**. ADR-001
fijó el modelo núcleo + adaptadores y el paso de build; ADR-003 resolvió el caso de
un harness **sin marketplace ni plugin-root** (Kimi): reutilizar el build, resolver
el núcleo por **ruta interna al artefacto** e instalar por procedimiento. Antes de
diseñar el adaptador opencode hay que fijar, contra **documentación real y vigente**
(no conocimiento del modelo), dos cosas: (a) cómo mapean las piezas de un adaptador
al mecanismo de opencode; y (b) —lo crítico para CE-3— **si el enforcement en-harness
de opencode llega a la dureza del de Claude Code (un gate que deniega de verdad) o si
toda la garantía recae en git + CI**.

**Hallazgos verificados contra la documentación oficial de opencode
(opencode.ai/docs, consultada el 2026-07-23).** Fuentes por punto:

- **Agentes** — markdown con frontmatter `description`, `mode` (`primary` |
  `subagent`), `model`, `temperature`, `permission`, `tools`. **El system prompt es
  el CUERPO markdown (inline)**; en agentes-markdown NO se documenta un campo `prompt`
  que apunte a fichero externo. Dos tipos: **primary** (asistente con el que
  interactúas; built-ins Build/Plan; se ciclan con Tab) y **subagent** (lo lanza un
  primary vía la **tool `task`**, o por `@mención`). Directorios **en plural**:
  `.opencode/agents/` (proyecto) y `~/.config/opencode/agents/` (global). Profundidad
  de anidamiento: `subagent_depth`, **default 1** (un primary lanza subagentes; los
  subagentes NO lanzan más). (fuente: opencode.ai/docs/agents/, opencode.ai/docs/config/)
- **Comandos** — **slash-commands por fichero markdown** en `.opencode/commands/`
  (o inline en config). Frontmatter `description`, `agent`, `model`, `subtask`; el
  cuerpo es la plantilla; placeholders `$ARGUMENTS`, `$1..$n`, `` !`cmd` `` (inyecta
  salida de shell), `@fichero` (inyecta contenido). El nombre de fichero = nombre del
  comando; pueden **sobrescribir** built-ins. (fuente: opencode.ai/docs/commands/)
- **Skills** — `SKILL.md` de **formato abierto** (frontmatter `name`/`description` +
  cuerpo), invocadas por una tool nativa `skill`. opencode **lee nativamente**
  `.opencode/skills/<name>/SKILL.md`, **y también** `.claude/skills/…` y
  `.agents/skills/…` (proyecto y usuario). (fuente: opencode.ai/docs/skills/)
- **Plugins / hooks** — módulo **JS/TS** en `.opencode/plugins/` (o paquete npm en
  config; se instalan con Bun al arranque). Hooks disponibles incluyen
  `tool.execute.before`, `tool.execute.after`, `permission.asked`,
  `permission.replied`, y eventos de `session.*`/`message.*`/`command.executed`/
  `file.edited`. El plugin recibe un contexto con `project`, `directory`, `worktree`,
  `client` (SDK) y `$` (shell de Bun). **CRÍTICO: lanzar (`throw`) dentro de
  `tool.execute.before` ABORTA la ejecución de la tool** — el ejemplo oficial deniega
  leer `.env` con `throw new Error("Do not read .env files")`. (fuente:
  opencode.ai/docs/plugins/)
- **Permisos** — clave `permission` en `opencode.json`, valores `allow` | `ask` |
  `deny`, con `*` como catch-all y **patrones** (p. ej. `bash: { "git *": "allow",
  "rm *": "deny" }`). Cubre `read`, `edit` (edit/write/patch), `bash`, `task`
  (qué subagentes se pueden lanzar), `skill`, `external_directory`, etc. **Overrides
  por agente**. (fuente: opencode.ai/docs/permissions/)
- **Config / resolución de rutas** — config `opencode.json`/`opencode.jsonc` (proyecto)
  y `~/.config/opencode/`. Substituciones: `{env:VAR}` y **`{file:ruta}`** (relativa
  al fichero de config o absoluta con `/`·`~`). **NO existe una variable de
  plugin-root** tipo `${OPENCODE_PLUGIN_ROOT}`. `{file:…}` está documentado para
  valores de config (p. ej. `instructions`), **no confirmado** para el campo `prompt`
  de un agente. (fuente: opencode.ai/docs/config/)

De esto se sigue la pregunta que este ADR fija: **¿cómo encajan las cinco piezas del
adaptador en opencode, y —para CE-3— es el enforcement en-harness de opencode un gate
real o solo feedback?**

## Decisión

**opencode se adapta reutilizando el build de ADR-001 (artefacto autocontenido con el
núcleo dentro) y resolviendo el núcleo por RUTA INTERNA al artefacto (como Kimi,
ADR-003), pero —a diferencia de Kimi— su enforcement en-harness SÍ alcanza la dureza
de un gate real: un PLUGIN de opencode que, en `tool.execute.before`, invoca la lógica
compartida `core/lib/require-spec.mjs` y `throw`ea para DENEGAR escrituras fuera del
carril `ft/SPEC-NNN`. Aun así, la GARANTÍA última sigue siendo git pre-commit (L2) +
CI (L3), independientes del harness (ADR-002 intacto).**

1. **Mapeo de piezas del adaptador (lista cerrada, ADR-001/guía "añadir un harness").**

   | Pieza | opencode |
   |---|---|
   | **agents/** | un `.md` por rol en `.opencode/agents/` (plural). El **cuerpo** es un **bootstrap del adaptador** (leer `.sdd.json`→idioma, `Read` del fichero de rol del núcleo, contrato de subagente), **NO** el cuerpo del rol. `mode: subagent` para los seis `sdd-*`; el **orquestador es un agente `mode: primary`** cuyo cuerpo referencia la prosa de `sdd-orquestador`. |
   | **commands/** | `.opencode/commands/*.md` — **SÍ existen** slash-commands por fichero: `/sdd-init`, `/sdd-tablero` se entregan como en Claude Code (paridad, a diferencia de Kimi). |
   | **skills/** | `SKILL.md` que despachan al subagente del rol vía la tool `task`; formato abierto, sin prefijo de plugin. |
   | **plugin (hooks)/** | módulo JS/TS en `.opencode/plugins/` con `tool.execute.before`/`after` que invoca `core/lib/require-spec.mjs` (shim de entrada que normaliza el payload de opencode; lógica **no** duplicada). |
   | **manifiesto** | `opencode.json` del artefacto que registra agents/commands/plugin y fija `permission`. No hay marketplace (como Kimi). |
   | **tests/** | tests del adaptador contra `dist/opencode/`. |

2. **Resolución del núcleo por ruta interna al artefacto (sin plugin-root).** opencode
   **no** ofrece variable de plugin-root; como en Kimi (ADR-003) se resuelve por ruta
   **interna** al artefacto autocontenido, fijada en la **instalación**. El token neutro
   `${SDD_ROOT}` del núcleo (RN-06) se materializa aquí como esa ruta interna, no como
   `${CLAUDE_PLUGIN_ROOT}`. **Vía preferida a validar (SPEC-009):** el bootstrap del
   agente instruye al agente a `Read` el fichero de rol por ruta interna al artefacto
   (análogo al agent-`.md` de Claude Code, que ya es un bootstrap que hace `Read`).
   **Alternativa** si el cuerpo-inline no admite ruta relativa fiable: registrar los
   agentes **inline en `opencode.json`** con `prompt: "{file:./core/roles/es/<rol>.md}"`
   (relativo al config). Ambas mantienen la **fuente única** (`roles-fuente-unica`): el
   cuerpo del rol vive solo en `core/roles/`.

3. **Enforcement en opencode: L1 es un GATE REAL (no solo feedback).** El diferencial
   frente a Kimi: en opencode `throw` en `tool.execute.before` **aborta** la tool. Por
   tanto el plugin del adaptador **deniega de verdad** una escritura bajo rutas
   vigiladas sin rama `ft/SPEC-NNN` + spec aprobada, reutilizando `require-spec.mjs`
   (RN-03; lógica compartida, solo shim de entrada). Complementariamente, `permission`
   en `opencode.json` da denegación **declarativa** por patrón (p. ej. cerrar `edit`
   sobre `core/` salvo carril), pero es **estática**: no evalúa "¿hay spec aprobada +
   rama correcta?", así que **el plugin es quien aporta la lógica dinámica**. **La
   garantía dura sigue en L2/L3** (git pre-commit + CI): "nada se codea sin spec
   aprobada" **no depende** de que opencode ejecute el plugin (RN-01/RN-03/CE-3). CE-3
   queda **satisfecho, y no degradado** — de hecho más fuerte que en Kimi (L1 deniega,
   no solo avisa).

4. **Modelo de orquestación: orquestador = agente PRIMARY; los seis `sdd-*` =
   SUBAGENTS.** `subagent_depth` default 1 replica el guard de Kimi ("solo el nivel
   raíz despacha"). El orquestador (primary) delega vía la tool `task`; los gates
   humanos se modelan como turnos del primary (invoca subagente → recibe informe → PARA
   y pregunta → siguiente `task`). **Asimetría legítima documentada**: orquestador es
   *skill* en Claude Code, *agente raíz* en Kimi, *agente primary* en opencode — misma
   prosa (`sdd-orquestador`), montaje distinto según el mecanismo de despacho. La tool
   `task` admite además `permission` por subagente (control fino de quién despacha a
   quién).

5. **Núcleo intacto (RN-02/CE-4).** Nada de opencode entra en `core/`: build
   reutilizado sin tocar, `nucleo-aislado`/`nucleo-agnostico` siguen en verde, y los
   checks `referencias`/`roles-fuente-unica`/`manifiestos`/`descripcion-fuente-unica` se
   **generalizan** a un tercer adaptador (como ya se generalizaron a dos). El
   `opencode.json` se parsea con el loader mínimo del repo (sin dependencias en núcleo).

**Relación con ADR-001/002/003 (COMPLEMENTA, no supersede).** Reutiliza el build
(ADR-001), el enforcement en capas (ADR-002) y la resolución por ruta interna sin
plugin-root (ADR-003). La novedad que fija este ADR es específica de opencode: **L1
puede ser un gate real** (plugin que deniega), el orquestador es un **agente primary**,
y **sí hay slash-commands por fichero** (paridad de comandos con Claude Code). ADR-001,
002 y 003 permanecen aprobados e **inmutables** (RN-04).

**Asunciones marcadas [HIPÓTESIS] — a verificar contra el CLI real en SPEC-009**
(coherentes con la restricción de método de EPIC-003; ninguna altera la *forma* fijada
aquí):
- **[H1]** El cuerpo-inline de un agente-markdown puede instruir un `Read` por **ruta
  interna** fiable al artefacto (o, si no, se usa la vía `opencode.json` +
  `{file:...}` del punto 2). Impacto: solo la mecánica de resolución, no la fuente única.
- **[H2]** `throw` en `tool.execute.before` **aborta de forma fiable** el `edit`/`write`
  (no solo lo salta) y el plugin ve `tool_input`/paths suficientes para decidir
  require-spec. El ejemplo oficial `.env` lo respalda; falta ejercerlo con el flujo real.
- **[H3]** El plugin puede leer identidad de agente/sesión suficiente para
  `protege-verdad` (owners de FOUNDATION/roles). Si no, ese hook **degrada fail-open** y
  la garantía la sostienen L2/L3 (como en Kimi).
- **[H4]** El orquestador-primary puede despachar los seis subagentes con
  `subagent_depth=1` y modelar los gates humanos como turnos; a re-verificar en runtime.
- **[H5]** El procedimiento de instalación (sin marketplace) coloca agents/commands/
  skills en `.opencode/*` y registra el plugin en `opencode.json` con rutas al
  artefacto; queda por fijar si opencode auto-descubre `.opencode/` del proyecto o exige
  config explícita.

## Consecuencias
### Positivas
- **Paridad de comandos real (CE-2)**: opencode tiene slash-commands por fichero, así
  que `/sdd-init` y `/sdd-tablero` se entregan como en Claude Code (Kimi no podía).
- **Enforcement en-harness no degradado, más fuerte que Kimi (CE-3)**: L1 **deniega**
  de verdad (plugin `throw`), sin renunciar a L2/L3 como garantía.
- **Coste de adaptador acotado (CE-4)**: build y checks reutilizados; núcleo intacto;
  tercer caso que valida la simetría de ADR-001 y la guía "añadir un harness".
- **Fuente única de roles intacta (RN-06)**: el cuerpo del rol sigue solo en `core/`;
  el agente opencode lo **referencia** (bootstrap), no lo copia.

### Negativas / follow-ups
- **Sin marketplace ni plugin-root ⇒ instalación por procedimiento** y rutas fijadas en
  la instalación (como Kimi): más frágil que una variable; mitiga build determinista +
  procedimiento reproducible.
- **Dependencia de Bun para plugins npm**: si se distribuye el plugin como fichero local
  en `.opencode/plugins/` se evita; a decidir en la spec de enforcement.
- **[H1]/[H2] abiertas**: la vía exacta de resolución del prompt y la fiabilidad del
  `throw`-deny se confirman contra el CLI en SPEC-009 antes de comprometer el diseño del
  adaptador y del enforcement.
- **Distribución a usuarios finales sigue [ABIERTO]** (ya lo estaba): fuera de EPIC-003.

## Alternativas consideradas
<!-- Cada una con el motivo de rechazo. -->
- **Confiar el enforcement solo a la config `permission` de opencode (declarativa).**
  RECHAZADA como mecanismo principal: `permission` es **estática** (patrones allow/ask/
  deny), no puede evaluar "¿hay spec aprobada + rama `ft/SPEC-NNN`?". Sirve como capa
  complementaria, no como el gate require-spec. La lógica dinámica la aporta el plugin.
- **Renunciar al gate en-harness y dejar todo a git + CI (como el mínimo de Kimi).**
  RECHAZADA como postura por defecto: opencode **sí** permite denegar en `tool.execute.
  before`; desaprovecharlo degradaría CE-3 sin motivo. git/CI siguen siendo la garantía,
  pero L1 aquí es un gate real, no solo feedback.
- **Embeber el cuerpo del rol en el markdown del agente opencode (prompt inline).**
  RECHAZADA: duplicaría la prosa de roles fuera de `core/`, violando RN-06 y el check
  `roles-fuente-unica`. El cuerpo del agente es **bootstrap** que referencia el núcleo,
  como en Claude Code y Kimi.
- **Distribuir el adaptador como paquete npm publicado.** RECHAZADA para esta épica: la
  distribución a usuarios finales está [ABIERTO] y fuera de EPIC-003; el adaptador se
  instala por procedimiento sobre el artefacto autocontenido de `dist/opencode/`. (npm
  local en `.opencode/plugins/` sí es opción de empaquetado del plugin, a decidir en la
  spec de enforcement.)
- **Orquestador como subagente (simetría total con… nada).** RECHAZADA: con
  `subagent_depth=1` un subagente no lanza otros subagentes; el orquestador debe ser
  **primary** para despachar el pipeline. Asimetría con Claude Code (skill) y Kimi (raíz)
  legítima y documentada.

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
