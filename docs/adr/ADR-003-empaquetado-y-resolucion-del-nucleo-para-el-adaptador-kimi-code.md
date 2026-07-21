---
id: ADR-003
tipo: adr
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-07-20, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-20, por: Alberto Fojo}
---
# ADR-003: Empaquetado y resolucion del nucleo para el adaptador Kimi Code

- Deciders: propone sdd-arquitecto; aprueba el humano (pendiente, gate humano).
- Specs relacionadas: SPEC-003 (Adaptador Kimi Code) lo consume y materializa.
  **Complementa** ADR-001 (build/empaquetado; NO lo supersede) y ADR-002
  (enforcement en capas). Origen: EPIC-001, CE-2 (dos harnesses reales) y CE-5
  (coste de un harness nuevo acotado).

## Contexto

ADR-001 fijó que un **paso de build** (`tools/build-adapter.mjs`) ensambla cada
adaptador en un `dist/<harness>/` **autocontenido** (superficie del adaptador +
`core/` empaquetado dentro), y afirmó que "el MISMO mecanismo sirve a Claude Code
y a todos los adaptadores no-anfitriones (Kimi y siguientes)". Pero ADR-001
describió la **vía de descubrimiento y resolución concreta** en términos de Claude
Code: un `.claude-plugin/marketplace.json`, la instalación `claude plugin install`
que copia el plugin root a cache, y la resolución del núcleo vía la variable
`${CLAUDE_PLUGIN_ROOT}/core/…`. Antes de construir el **primer adaptador
no-Claude** (Kimi Code, CE-2) hay que fijar cómo el adaptador Kimi **obtiene y
referencia el núcleo**, porque el empaquetado/descubrimiento de Kimi difiere.

**Hallazgos verificados contra la documentación oficial de Kimi CLI (Moonshot AI,
jul 2026)** — el CLI está "evolving into Kimi Code", pero los formatos son estos:

- **Agentes**: YAML con campos `version`, `agent.name`, `system_prompt_path`
  (fichero markdown **externo**, ruta **relativa al YAML** — no hay prompt inline),
  `tools` (formato `"module:ClassName"`), `extend`, `subagents` (mapa `path`+
  `description`), `exclude_tools`, `system_prompt_args`. El prompt admite variables
  `${VAR}` (built-in `${KIMI_WORK_DIR}`, `${KIMI_AGENTS_MD}`, …; custom vía
  `system_prompt_args`). **NO existe** una variable de plugin-root tipo
  `${KIMI_PLUGIN_ROOT}`. Carga documentada: `kimi --agent-file <ruta.yaml>`.
  (fuente: moonshotai.github.io/kimi-cli/en/customization/agents.md; env-vars.md)
- **Skills**: SKILL.md de **formato abierto** (mismo que Anthropic: frontmatter
  `name`/`description` + cuerpo). Kimi **lee nativamente** `.claude/skills/`,
  `.agents/skills/`, `.kimi/skills/` (proyecto) y sus equivalentes de usuario
  (`~/.kimi/skills`, …). Prioridad Project > User > Extra > Built-in; skills
  declaradas "cross-tool shared". (fuente: .../customization/skills.md)
- **Hooks (Beta)**: array `[[hooks]]` en la config de Kimi (`~/.kimi/config.toml`),
  campos `event`, `command` (recibe **JSON por stdin**), `matcher` (regex),
  `timeout`. Eventos incluyen `PreToolUse`/`PostToolUse`. Payload común
  `session_id`/`cwd`/`hook_event_name`/`tool_name`/`tool_input`. Salida: exit 0 +
  `{"hookSpecificOutput":{"permissionDecision":"deny",…}}` o exit 2 = block —
  **mismo estilo `hookSpecificOutput`/`permissionDecision` que Claude Code**.
  (fuente: .../customization/hooks.md; .../configuration/config-files.md)
- **Plugins (Beta)**: `plugin.json` de Kimi expone **solo tools ejecutables**
  (estilo MCP-local + inyección de credenciales); **NO** agents/skills/commands/
  hooks. Schema y propósito **incompatibles** con el `plugin.json` de Claude Code.
  Instalación `kimi plugin install <fuente>` copia el directorio a
  `~/.kimi/plugins/`; **no hay marketplace**. (fuente: .../customization/plugins.md)
- **Contexto de proyecto**: usa **AGENTS.md** (no CLAUDE.md). (fuente:
  .../customization/agents.md; .../reference/slash-commands.md)

De esto se sigue la pregunta que este ADR fija: **dado que el "plugin" de Kimi no
transporta agents/skills/hooks y no hay ni variable de plugin-root ni marketplace,
¿cómo obtiene y referencia el adaptador Kimi el núcleo agnóstico —sin duplicarlo
en git (RN-02/RN-06) y reutilizando el build de ADR-001— y cómo se instala?**

## Decisión

**El adaptador Kimi reutiliza el paso de build de ADR-001 (artefacto autocontenido
con el núcleo dentro), pero resuelve el núcleo por RUTAS INTERNAS AL ARTEFACTO —no
por una variable de plugin-root, que Kimi no ofrece— y se instala por un
PROCEDIMIENTO documentado sobre directorios que Kimi lee nativamente, no por un
marketplace ni por el sistema de plugins de Kimi.**

1. **Build reutilizado, sistema de plugins de Kimi NO usado.**
   `tools/build-adapter.mjs kimi-code` ensambla `dist/kimi-code/` autocontenido
   (superficie de `adapters/kimi-code/` + `core/` bajo `dist/kimi-code/core/`),
   idéntico en mecánica al de Claude Code. El `plugin.json` **nativo de Kimi NO es
   la vía de distribución** del adaptador (solo lleva tools; no puede transportar
   agents/skills/hooks). El "adaptador Kimi" es un **árbol autocontenido**, no un
   plugin de Kimi.

2. **Resolución del núcleo por ruta interna al artefacto (sin plugin-root).**
   - **Agentes**: cada rol es un YAML en `dist/kimi-code/agents/<rol>.yaml` cuyo
     `system_prompt_path` apunta —por ruta **relativa al YAML**— a un bootstrap del
     adaptador, y ese bootstrap referencia el núcleo por ruta relativa **interna**
     (p. ej. `../core/roles/<idioma>/<rol>.md`), que **no escapa** del artefacto.
     Es el análogo de la resolución interna de ADR-001, pero vía ruta-relativa-al-
     YAML en lugar de `${CLAUDE_PLUGIN_ROOT}`.
   - **Hooks**: entradas `[[hooks]]` en la config de Kimi con
     `command = "node <ruta al hook dentro del artefacto>"`; el hook importa el
     núcleo por ruta ESM interna (como hoy los de Claude). La ruta base al artefacto
     se fija en la **instalación** (procedimiento), no por variable de harness.
   - **Skills**: se colocan en un directorio que Kimi lee nativamente (`.agents/
     skills/` de proyecto o `~/.kimi/skills`) y despachan al agente Kimi del rol.

3. **Mapeo de la prosa única de roles: RN-06/CE-3 intacto.** El
   `system_prompt_path` del agente Kimi apunta a un **bootstrap del adaptador**
   (glue: leer `.sdd.json`→idioma, leer el fichero de rol con Read, contrato de
   subagente), **NUNCA** al cuerpo del rol. El cuerpo del system prompt sigue
   viviendo **solo** en `core/roles/<idioma>/<rol>.md` y se **referencia**. La única
   diferencia con Claude Code es el **token de ruta** (relativa-al-YAML vs
   `${CLAUDE_PLUGIN_ROOT}`) y el **contenedor** (YAML con `system_prompt_path` vs
   `.md` con frontmatter). El check `tools/checks/roles-fuente-unica.mjs` se
   **generaliza** para vigilar también los agentes/bootstraps de Kimi (que no
   embeban `## Misión`/`## Flujo`/`## Reglas duras`).

4. **Los skills son superficie de adaptador, NO núcleo.** Aunque Kimi lee el mismo
   SKILL.md y el formato es "cross-tool", el **cuerpo del dispatcher es
   harness-específico**: la forma de invocar al subagente difiere (Claude:
   `Agent(subagent_type: "tremen-sdd:sdd-arquitecto")` con prefijo de plugin; Kimi:
   la tool `Agent` sobre su propio registro de subagentes, sin ese prefijo). Por eso
   los skills se mantienen bajo `adapters/<harness>/skills/`, **no se promueven a
   `core/`**. Lo verdaderamente compartible (la `description` de disparo) es un
   follow-up de deduplicación, no motivo para mover el skill al núcleo.

5. **Enforcement en Kimi: L1 best-effort, garantía por L2/L3 (ADR-002 intacto).**
   Los hooks de Kimi (L1) se mapean **1:1 donde el payload lo permita** (es casi
   idéntico), con un **shim de entrada en el adaptador** (riesgo declarado en
   EPIC-001) que normaliza el payload de Kimi al contrato del núcleo; la **lógica no
   se duplica** (require-spec vive en `core/lib/require-spec.mjs` y se comparte).
   Donde Kimi no ofrezca un campo (p. ej. identidad de agente para `protege-verdad`),
   ese hook **degrada fail-open** y la garantía dura la sostienen **git pre-commit +
   CI** (L2/L3), ya independientes del harness. **"Nada se codea sin spec aprobada"
   NO depende de que Kimi tenga hooks** (RN-03/CE-4).

6. **Instalación/descubrimiento de Kimi = procedimiento documentado, no
   marketplace.** Sin marketplace ni plugin-root, "instalar el adaptador Kimi" es un
   **procedimiento reproducible** (build → colocar skills en el dir nativo
   (`.agents/skills/` del repo, genérico cross-harness que Kimi lee nativamente) →
   registrar el agente raíz por `--agent-file`/dir → añadir los `[[hooks]]` a la
   config de Kimi apuntando al artefacto). Este ADR fija que es un procedimiento
   sobre el **artefacto autocontenido**, no una publicación en un marketplace ni un
   `kimi plugin install`. **Kimi no ofrece slash-commands de usuario por fichero**
   (como los `commands/*.md` de Claude Code): los "commands" (`/sdd-init`,
   `/sdd-tablero`) **no** son pieza del adaptador Kimi; su equivalente es invocar los
   scripts de `core/` directamente o desde un skill.

7. **Modelo de orquestación de Kimi: el orquestador es el AGENTE RAÍZ (resuelto por
   el spike).** El spike sobre el código fuente de kimi-cli (`soul/agent.py`:
   `agent_spec.subagents.items()` → `labor_market.add_builtin_type(...)`; la tool
   `Agent(subagent_type, description, prompt)` con el guard **`if runtime.role !=
   "root": ToolError("Subagents cannot launch other subagents")`**) fija que **solo el
   agente raíz despacha subagentes; la jerarquía es plana (1 nivel, sin
   anidamiento)**. Por tanto:
   - El **agente raíz** del adaptador Kimi (cargado por `--agent-file` / agente por
     defecto del proyecto) tiene `system_prompt_path` = la prosa de **sdd-orquestador**
     (`core/roles/<idioma>/sdd-orquestador.md`, referenciada). El orquestador **ES el
     raíz**, no un subagente —porque solo el raíz puede llamar a `Agent`.
   - El raíz declara **todos** los `sdd-*` en su mapa `subagents:` (arquitecto,
     implementador, verificador, producto, documentalista, como-vamos), cada uno
     `{ path: ./agents/<rol>.yaml, description: … }`. Cada `<rol>.yaml` hace
     `extend: default` y su `system_prompt_path` **referencia**
     `core/roles/<idioma>/<rol>.md` (RN-06 intacto, fuente única; contexto aislado
     persistido por Kimi en `session/subagents/<id>/`).
   - Los **skills** (SKILL.md que Kimi lee de `.agents/skills/`) **no lanzan
     subagentes** (el spike confirma que los skills solo inyectan nombre/desc/paths en
     el system prompt); su cuerpo **instruye al raíz** a delegar vía
     `Agent(subagent_type: sdd-<rol>)`.
   - **Herencia de herramientas por subagente** (`ToolPolicy`): se declara
     `allowed_tools` **explícito** por rol (escritura para el implementador; read-only
     para verificador y como-vamos), no herencia implícita.
   - **Asimetría legítima entre adaptadores** (documentada, no accidental): en Claude
     Code el orquestador es un **skill** y el main-loop del harness despacha; en Kimi
     el orquestador es el **agente raíz**. Es la misma prosa de rol
     (`sdd-orquestador`), montada distinto porque el mecanismo de despacho difiere.
     Los gates humanos se modelan como **turnos del raíz** (invoca subagente → recibe
     informe → PARA y pregunta al humano → siguiente `Agent()`), coherente con "solo
     el raíz despacha".

**Relación con ADR-001 (COMPLEMENTA, no supersede).** El build reutilizable y "el
mismo mecanismo build→dist autocontenido sirve a todo harness" **se mantienen**: Kimi
reutiliza el build sin tocarlo. Lo que ADR-001 describió con marketplace +
`${CLAUDE_PLUGIN_ROOT}` era la vía **de Claude Code**, no una afirmación de que todo
harness use marketplace/plugin-root. ADR-003 fija la vía de resolución/instalación
para un harness **sin** ninguno de los dos. No hay contradicción; ADR-001 permanece
aprobado e **inmutable** (RN-04).

**Incógnita crítica RESUELTA por el spike (código fuente kimi-cli).** "Cómo se
despacha un subagente custom por nombre" queda cerrada por el punto 7: registro en el
mapa `subagents:` del agente raíz, invocación por la tool `Agent`, solo el raíz
despacha, sin anidamiento. La asimetría de orquestación (raíz vs skill) es la
consecuencia de forma; ya no es incógnita.

**Asunciones que este ADR deja como [ABIERTO]** (requieren el CLI real; coherente con
la decisión de gate de NO probar contra Kimi ahora → validación en el follow-up
F-SPEC-003-1, **no** bloquean esta decisión): (a) el **ping-pong con gates humanos**
se modela como turnos del raíz (invoca → recibe informe → PARA → siguiente `Agent()`);
(b) el **tope de anidamiento = 1 nivel** (confirmado en código, a re-verificar en
runtime real); (c) la **herencia de tools/modelo** por subagente vía `allowed_tools`
explícito. Menores/no bloqueantes: si Kimi **auto-descubre** agentes de proyecto o solo
por `--agent-file`; si **prohíbe `../`** fuera del root de instalación; si existe una
**variable de ruta** utilizable. Ninguna altera la **forma** fijada aquí.

## Consecuencias
### Positivas
- **Fuente única del núcleo intacta (RN-02/RN-06)**: Kimi **referencia** el núcleo,
  no lo copia en git; la copia viaja en el artefacto de build, como en Claude Code.
- **Build reutilizado sin cambios de mecanismo (CE-5)**: "añadir Kimi" no toca el
  núcleo ni reescribe el build; confirma que la simetría de ADR-001 aguanta el
  primer harness real distinto.
- **Enforcement garantizado sin depender de Kimi (RN-03/CE-4)**: L2/L3 cubren;
  los hooks de Kimi son *feedback* extra, no la garantía.
- **Shim fino**: el payload de hooks de Kimi es casi idéntico al de Claude, así que
  la adaptación de entrada es mínima y la lógica se comparte.

### Negativas / follow-ups
- **Sin marketplace ni plugin-root ⇒ instalación manual documentada**: más pasos
  que `claude plugin install`, y las rutas al artefacto se fijan en la instalación
  (no por variable). Coste operativo asumido y documentado por SPEC-003.
- **Resolución por ruta-relativa-al-YAML es más frágil que una variable de
  plugin-root**: mover el artefacto rompe las rutas si no se reinstala. Mitiga:
  build determinista + procedimiento de instalación reproducible.
- **Distribución a usuarios finales sigue [ABIERTO]** (ya lo estaba en
  `contexto.md`): sin marketplace, más agudo aún en Kimi. Fuera de EPIC-001.
- **Las incógnitas de agent-discovery/dispatch** pueden obligar a un wiring
  concreto (p. ej. un agente "raíz" que declare los `sdd-*` en su mapa
  `subagents:`); se resuelve en SPEC-003 contra el CLI y puede generar follow-up.

## Alternativas consideradas
<!-- Cada una con el motivo de rechazo. -->
- **Distribuir el adaptador como plugin nativo de Kimi (`plugin.json`).**
  RECHAZADA: el `plugin.json` de Kimi **solo** transporta tools ejecutables (estilo
  MCP-local + inyección de credenciales), no agents/skills/commands/hooks; schema y
  propósito incompatibles con lo que el adaptador debe distribuir. No sirve para el
  método. (fuente: kimi-cli/customization/plugins.md)
- **Depender de una variable de plugin-root de Kimi (`${KIMI_PLUGIN_ROOT}`).**
  RECHAZADA: **no está documentada** en env-vars ni en plugins; solo una fuente
  agregada la insinuó. Construir sobre una variable no confirmada es inventar. La
  ruta-relativa-al-YAML **sí** está documentada y basta.
- **Promover los skills a `core/` para compartirlos entre harnesses** (Kimi lee el
  mismo SKILL.md). RECHAZADA: el **formato** es compartido pero el **cuerpo** del
  dispatcher es harness-específico (invocación/nombre del subagente difieren);
  compartir el fichero metería lógica condicional por harness en el núcleo, violando
  RN-02. Lo compartible (la `description`) es un follow-up de dedup, no mueve el
  skill al núcleo.
- **Apuntar `system_prompt_path` directamente a `core/roles/<idioma>/<rol>.md`.**
  RECHAZADA: el fichero de rol es el **contrato** del rol, no el **bootstrap** de
  subagente (leer `.sdd.json`→idioma, contrato "no hablas con el humano",
  construcción de rutas). Apuntar directo perdería ese glue y ataría el idioma de
  forma estática. El bootstrap del adaptador lo aporta **y sigue referenciando** el
  cuerpo (RN-06 intacto).
- **Renunciar a hooks en Kimi y confiar solo en git/CI.** RECHAZADA como postura por
  defecto: Kimi **sí** tiene hooks casi idénticos; desaprovecharlos degrada el
  feedback rápido (L1) sin motivo. Se mapean donde el payload lo permita; git/CI
  siguen siendo la **garantía**, no el feedback.
- **Reescribir la lógica de los hooks para Kimi.** RECHAZADA: EPIC-001 prohíbe
  reescribir la lógica; la decisión require-spec vive en `core/lib/require-spec.mjs`
  y se comparte. Solo se añade un **shim de entrada** en el adaptador.
- **Orquestador de Kimi como un subagente más (simetría total con Claude Code).**
  RECHAZADA por el spike: la tool `Agent` tiene el guard `if runtime.role != "root"`;
  un subagente **no puede lanzar** otros subagentes. Si el orquestador fuera subagente,
  no podría despachar al resto del pipeline. El orquestador **debe** ser el agente
  raíz. La asimetría con Claude Code (orquestador=skill) es legítima y documentada.
- **Distribuir los "commands" como slash-commands de Kimi.** RECHAZADA: Kimi no ofrece
  un mecanismo de slash-commands de usuario por fichero equivalente a `commands/*.md`;
  `/sdd-init` y `/sdd-tablero` se sustituyen por invocación de los scripts de `core/`
  (directa o vía skill).

<!-- Fuente del spike: código fuente de kimi-cli (github.com/MoonshotAI/kimi-cli):
soul/agent.py (registro de subagents vía labor_market.add_builtin_type), la tool Agent
y su guard de rol raíz. Complementa la doc oficial citada en Contexto. -->


<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
