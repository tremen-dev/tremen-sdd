---
id: SPEC-003
tipo: spec
epica: EPIC-001
estado: hecho
aprobada-por:
historial:
  - {estado: borrador, fecha: 2026-07-20, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-20, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-07-20, por: sdd-implementador}
  - {estado: en-revision, fecha: 2026-07-20, por: sdd-implementador}
  - {estado: hecho, fecha: 2026-07-21, por: Alberto Fojo}
---
# SPEC-003 — Adaptador Kimi Code

## Problema

EPIC-001 promete que un mismo proyecto SDD se opere de principio a fin tanto desde
Claude Code como desde **Kimi Code** sobre el mismo núcleo (CE-2), y que añadir un
harness de la misma familia sea una **lista cerrada de piezas de adaptador** sin
tocar el núcleo (CE-5). Hoy existe **un solo adaptador** (`adapters/claude-code/`):
el multi-harness es promesa, no hecho (`contexto.md`, [ABIERTO]).

Construir el adaptador Kimi choca con que **Kimi no reproduce el modelo de
distribución de Claude Code** (verificado contra la doc oficial de Kimi CLI, jul
2026; ver ADR-003): su `plugin.json` solo transporta *tools* (no agents/skills/
hooks), **no hay marketplace** ni variable de plugin-root tipo
`${CLAUDE_PLUGIN_ROOT}`. Pero **sí** comparte lo esencial: lee `.claude/skills/` y
`.agents/skills/` nativamente (mismo SKILL.md), tiene **hooks casi idénticos**
(`[[hooks]]`, `PreToolUse`/`PostToolUse`, stdin JSON, `hookSpecificOutput`/
`permissionDecision`), y agentes **YAML con `system_prompt_path` externo** —un
encaje limpio para "referenciar, no copiar" la prosa de roles.

Esta spec **materializa ADR-003**: entrega la **superficie del adaptador Kimi como
lista cerrada**, reutiliza el **build** de ADR-001 para producir un
`dist/kimi-code/` autocontenido con el núcleo dentro, fija la **resolución del
núcleo por ruta interna al artefacto** (sin plugin-root) y el **procedimiento de
instalación** (sin marketplace), y prueba el pipeline con un **smoke test**. No
reescribe la lógica del método (RN-02, EPIC-001): los scripts, la máquina de estados
y la decisión require-spec se **reutilizan**; en Kimi solo se añade un **shim de
entrada** de hooks (riesgo declarado en EPIC-001).

**Recorte de alcance (RESUELTO por el gate; el norte sigue siendo CE-2 completo).**
CE-2 "operar TODOS los roles y etapas (init→épica→spec→implementación→verificación)
contra el CLI real de Kimi como en Claude Code" es demasiado para una spec. Esta spec
entrega **(superficie del adaptador, lista cerrada) + (build/instalación) + (smoke test
de formato/build/resolución interna, sin cuenta de Kimi) + (guía CE-5 as-built dentro
de la spec)**; la **operación end-to-end multi-rol contra el CLI real** queda como
follow-up **F-SPEC-003-1**. El **modelo de orquestación** (orquestador = agente raíz que
declara los `sdd-*` en `subagents:`, resuelto por el spike) queda **cableado** aquí,
demostrando CE-2 *posible*; se *completa* después. Ver notas del gate.

## Usuarios / roles afectados

- **Mantenedores de tremen-sdd** (humano): ganan un segundo adaptador real y el
  recetario "añadir un harness" validado contra un caso, no teorizado.
- **Quien opera un proyecto SDD desde Kimi Code**: obtiene los roles `sdd-*`, el
  scaffolding y (donde el CLI lo permita) el feedback de hooks, sobre el mismo núcleo.
- **sdd-implementador**: crea `adapters/kimi-code/`, el shim de hooks y el
  procedimiento de instalación; generaliza los checks a dos adaptadores.
- **sdd-verificador**: valida el build, la resolución interna, los checks
  generalizados y el smoke test (contra el CLI real de Kimi o el sustituto acordado
  en el gate).
- **El núcleo y el adaptador Claude Code**: NO deben romperse (regresión, CA-10).

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA verificable con un test. Rutas relativas a la raíz del repo. -->

- **CA-1 (superficie del adaptador Kimi como lista cerrada — CE-5)**: Dado el repo,
  **cuando** se inspecciona `adapters/kimi-code/`, **entonces** contiene exactamente
  las piezas de adaptador —`agents/` (el **YAML del agente raíz** = orquestador + un
  YAML por cada subagente `sdd-*`), `skills/sdd-*/SKILL.md`, `hooks/` (entrypoints + el
  fragmento de config `[[hooks]]` de Kimi), `tests/`— y **ningún fichero del método**
  (scripts, lib, templates, prosa de roles: todo eso vive solo en `core/`). **No** hay
  `commands/` (Kimi no tiene slash-commands de usuario por fichero; ver CA-8 y fuera de
  alcance). Verificable: un check/test comprueba la presencia de esas rutas y la
  ausencia de método bajo `adapters/kimi-code/`; el conjunto de piezas es la lista
  cerrada que la guía (CA-9) enumera.

- **CA-2 (agentes YAML de Kimi que REFERENCIAN el núcleo — RN-06/CE-3)**: Dado cada
  YAML de `adapters/kimi-code/agents/` (el **raíz** y cada **subagente `sdd-*`**),
  **cuando** se inspecciona, **entonces** (a) es **YAML válido** con `version`,
  `agent.name` y `system_prompt_path`; (b) su `system_prompt_path` **referencia** la
  prosa del rol en `core/roles/<idioma>/<rol>.md` por ruta interna al artefacto —el
  raíz → `sdd-orquestador.md`, cada subagente → su `<rol>.md`— directamente o vía un
  bootstrap fino del adaptador que **no embebe** `## Misión`/`## Flujo`/`## Reglas
  duras`; (c) cada subagente hace `extend: default`. Verificable:
  `tools/checks/roles-fuente-unica.mjs` **generalizado** falla si un agente/bootstrap
  de Kimi embebe el cuerpo del rol y pasa cuando solo lo referencia; los YAML parsean;
  cada ruta referenciada resuelve a un fichero existente en `dist/kimi-code/`.

- **CA-3 (build reutilizado → `dist/kimi-code/` autocontenido, sin tocar el build)**:
  Dado `tools/build-adapter.mjs`, **cuando** se ejecuta para `kimi-code`, **entonces**
  ensambla `dist/kimi-code/` con la superficie de `adapters/kimi-code/` (menos
  `tests/`) + el núcleo bajo `dist/kimi-code/core/`, de forma **determinista/
  idempotente** (dos corridas → árbol idéntico), **sin modificar** `build-adapter.mjs`
  (ya es genérico por harness). Verificable: un script npm (p. ej.
  `npm run build -- kimi-code` o `build:kimi`) produce el árbol; dos ejecuciones dan
  salida idéntica; `dist/` sigue **gitignored** y no hay copia de núcleo comiteada
  fuera de `core/` (`fuente-unica` verde).

- **CA-4 (resolución del núcleo por ruta INTERNA, sin plugin-root ni `../` que
  escape)**: Dado `dist/kimi-code/` construido, **cuando** se resuelven las
  referencias del adaptador al núcleo, **entonces** TODAS apuntan a rutas **internas
  al artefacto** (el `system_prompt_path` relativo al YAML y su bootstrap resuelven a
  `…/core/roles/…`; los imports ESM de los hooks resuelven a `…/core/…` interno) y
  **NINGUNA** usa una variable de plugin-root inexistente ni un `../` que **escape**
  del artefacto. Verificable: `tools/checks/referencias.mjs` **generalizado** a
  `kimi-code` confirma que cada ruta declarada resuelve a un fichero existente en
  `dist/kimi-code/` y que ninguna escapa el árbol del adaptador.

- **CA-5 (hooks de Kimi sobre la lógica compartida: shim, no copia — RN-01/RN-03)**:
  Dado el fragmento `[[hooks]]` de Kimi y los entrypoints de
  `adapters/kimi-code/hooks/`, **cuando** se ejerce `require-spec` con un payload en
  el **formato de Kimi** (stdin JSON con `cwd`/`tool_name`/`tool_input`), **entonces**
  (a) el entrypoint **normaliza** el payload (shim en el adaptador) e **invoca**
  `core/lib/require-spec.mjs` sin reimplementar la decisión; (b) **deniega** (deny /
  exit 2) ante ruta vigilada sin rama `ft/SPEC-NNN`+spec, y **permite** en el caso
  válido; (c) `protege-verdad` **degrada fail-open** donde Kimi no aporte identidad de
  agente. Verificable: tests del adaptador Kimi (contra `dist/kimi-code/`) con
  payloads de Kimi simulados —(a) invalida→deny, (b) válida→allow, (c) sin identidad→
  allow—; y un check/test de que el entrypoint **importa** el módulo de `core` y **no**
  contiene parseo de rama/estado propio.

- **CA-6 (skills de Kimi que INSTRUYEN al raíz a delegar)**: Dado
  `adapters/kimi-code/skills/sdd-*/SKILL.md`, **cuando** se inspeccionan, **entonces**
  (a) son **SKILL.md válidos** (frontmatter `name`/`description` + cuerpo) colocables
  en `.agents/skills/`, que Kimi lee nativamente; (b) su cuerpo **instruye al agente
  raíz** a delegar en el subagente del rol vía `Agent(subagent_type: sdd-<rol>)` —el
  spike confirma que los skills **no lanzan** subagentes, solo inyectan contexto y es
  el raíz quien invoca `Agent`—, **sin** la sintaxis de dispatch de Claude Code (sin el
  prefijo `tremen-sdd:`). Verificable: frontmatter válido; el cuerpo instruye la
  delegación al raíz y no contiene la invocación de Claude.

- **CA-7 (smoke test del pipeline en Kimi = formato + build + resolución interna —
  recorte de CE-2, decisión de gate)**: Dado el adaptador Kimi construido, **cuando**
  se verifica el artefacto `dist/kimi-code/` **sin cuenta de Kimi** (decisión de gate:
  no se prueba contra el CLI real ahora), **entonces** (a) el YAML del raíz y de cada
  subagente es **cargable** (parseo válido, `system_prompt_path` resoluble); (b) la
  ruta al fichero de rol del núcleo (`…/core/roles/<idioma>/<rol>.md`) **existe y
  resuelve interna** al artefacto, demostrando que el núcleo viaja y se resuelve por
  ruta interna; y (c) la garantía "nada se codea sin spec aprobada" se sostiene vía
  **git pre-commit + CI** (L2/L3), independiente del harness (no requiere Kimi).
  Verificable: test/script sobre `dist/kimi-code/` (parseo YAML + existencia/resolución
  de las rutas de rol + hooks); L2/L3 ya cubiertos por SPEC-002. **Si (b) falla**
  (una ruta de núcleo no resuelve interna), **PARAR y devolver al gate**. La
  **ejecución contra el CLI real de Kimi** (cargar el raíz, delegar en un subagente,
  ping-pong de gates) queda como **follow-up F-SPEC-003-1**.

- **CA-8 (procedimiento de instalación/descubrimiento documentado — sin
  marketplace)**: Dado que Kimi no tiene marketplace ni plugin-root, **cuando** se
  completa el trabajo, **entonces** existe un **procedimiento reproducible
  documentado**: build → colocar los skills en un dir que Kimi lee nativamente
  (`.agents/skills/` de proyecto o `~/.kimi/skills`) → registrar los agents por
  `--agent-file`/dir → añadir el fragmento `[[hooks]]` a la config de Kimi apuntando
  al artefacto. Verificable: el documento existe y sus pasos son ejecutables; seguidos,
  el adaptador queda operativo (ligado a CA-7).

- **CA-9 (guía "añadir un harness" as-built — CE-5)**: Dado el trabajo del adaptador
  Kimi, **cuando** termina, **entonces** `docs/arquitectura.md` (sección "Añadir un
  harness") —o un documento dedicado que ella enlace— enumera la **lista cerrada de
  piezas** de adaptador (CA-1) y el **procedimiento** (CA-8), **derivada de lo que de
  verdad hizo falta para Kimi** (no teoría), y referencia ADR-003. Verificable: el
  documento lista esas piezas y pasos y cita ADR-003. **Decisión de la arquitecta
  (confirmar en el gate)**: la guía se escribe **dentro de esta spec**, no como spec
  aparte —arquitectura.md ya prometía escribirla "con el primer adaptador no-Claude",
  y re-derivarla luego desperdiciaría el conocimiento (nota 3).

- **CA-10 (no romper Claude Code ni el núcleo — regresión/dogfooding)**: Dado el
  conjunto de cambios, **cuando** se ejecuta `npm test` (build + núcleo + tools +
  adaptadores), **entonces** la suite queda **verde**: el núcleo sigue aislado
  (`nucleo-aislado`), el adaptador Claude Code sigue construyendo e instalando, y los
  checks **generalizados** (`roles-fuente-unica`, `referencias`, `manifiestos`) pasan
  para **ambos** adaptadores. Verificable: `npm test` verde con conteo **≥** el previo
  más los tests nuevos; los tests de `core/tests/estado.test.mjs` intactos (no agravar
  la regresión conocida de specs migradas).

- **CA-11 (modelo de orquestación de Kimi: el raíz despacha; los `sdd-*` en el mapa
  `subagents:`)**: Dado el adaptador Kimi, **cuando** se inspecciona el YAML del agente
  **raíz**, **entonces** (a) su `system_prompt_path` **referencia** la prosa de
  **sdd-orquestador** (`core/roles/<idioma>/sdd-orquestador.md`); (b) su mapa
  `subagents:` declara **los seis** roles `sdd-*` (arquitecto, implementador,
  verificador, producto, documentalista, como-vamos), cada uno
  `{ path: ./agents/<rol>.yaml, description: … }`, y cada `path` resuelve a un YAML
  existente (CA-2); (c) cada subagente declara `allowed_tools` **explícito** acorde a
  su rol (escritura para el implementador; **read-only** para verificador y
  como-vamos). Verificable: parseo YAML del raíz; el mapa `subagents:` lista los seis y
  cada `path` existe en `dist/kimi-code/`; los `allowed_tools` por rol están declarados
  (no herencia implícita). **Asunción documentada** (spike; [ABIERTO] hasta el CLI
  real): solo el raíz despacha (`Agent` con guard `role != "root"`), jerarquía plana de
  1 nivel, y los gates humanos se modelan como turnos del raíz (F-SPEC-003-1).

## Entidades y reglas afectadas
<!-- Cita RN-xx, ADR-NNN y términos de docs/fundacion/dominio.md. Referencia, no dupliques. -->

- **ADR-003** (Empaquetado y resolución del núcleo para el adaptador Kimi Code):
  esta spec lo materializa. La reutilización del build, la resolución por ruta interna
  (sin plugin-root), el mapeo de la prosa de roles vía bootstrap, los skills como
  superficie de adaptador y el shim de hooks vienen de ahí; no se redefinen aquí.
- **ADR-001** (build/empaquetado) y **ADR-002** (enforcement en capas L1/L2/L3):
  se **reutilizan** intactos. El build es genérico por harness; L2/L3 ya son
  independientes del harness (garantizan RN-01 sin depender de hooks de Kimi).
- **Reglas**: **RN-02** (dependencia solo adaptador→núcleo; el adaptador Kimi
  referencia, no contamina `core/`), **RN-06** (fuente única de prosa de roles; los
  agents Kimi la referencian vía bootstrap), **RN-01/RN-03** (nada sin spec, garantía
  independiente del harness; en Kimi la sostienen git+CI), **RN-05** (`dist/`
  generado, gitignored), **RN-10** (dogfooding).
- **Lógica reutilizada (no reescrita)**: `core/lib/require-spec.mjs`,
  `core/scripts/*` (estado/scaffold/valida/tablero/informe-qa),
  `core/roles/es/*.md`, `tools/build-adapter.mjs`, y los checks
  `roles-fuente-unica`/`referencias`/`manifiestos`/`fuente-unica`/`nucleo-aislado`
  (generalizados a dos adaptadores, no reimplementados).
- **Formatos de Kimi (fuente: doc oficial, citada en ADR-003)**: agentes YAML
  (`system_prompt_path`), skills `.agents/skills`/`.claude/skills`, hooks `[[hooks]]`
  en config, sin marketplace ni plugin-root.

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

- **CE-2 completo end-to-end multi-rol contra el CLI real de Kimi**: operar TODAS las
  etapas (init→épica→spec→implementación→verificación) y TODOS los roles ejecutando el
  CLI real (cargar el raíz, delegar en subagentes, ping-pong de gates humanos). Esta
  spec entrega superficie + build/instalación + **smoke test de formato/build/rutas
  sin cuenta de Kimi** (CA-7); la ejecución real es **follow-up F-SPEC-003-1**
  (decisión de gate). El norte es CE-2.
- **Slash-commands de Kimi** (`/sdd-init`, `/sdd-tablero`): Kimi **no** ofrece
  slash-commands de usuario por fichero; **decisión de gate: fuera**. Su equivalente es
  invocar los scripts de `core/` directamente o desde un skill; ese equivalente se
  documenta en la guía (CA-8/CA-9). Los commands **no** son pieza del adaptador Kimi.
- **Trigger-eval / tuning de disparo** de los skills para Kimi.
- **Distribución a usuarios finales** (sin marketplace, el artefacto se instala por
  procedimiento local): sigue [ABIERTO] en `contexto.md`, fuera de EPIC-001.
- **Reescribir lógica** de scripts, máquina de estados o hooks: prohibido por
  EPIC-001. Solo se añade el **shim de entrada** de hooks en el adaptador.
- **Elegir/optimizar plan o modelo de Kimi**: decisión de uso, no de la herramienta
  (EPIC-001).
- **Multi-idioma de roles**: sigue solo `es`.

## Notas para el gate humano
<!-- Lo que quien aprueba necesita saber para decidir. -->

> Esta spec sigue en `borrador`; la arquitecta NO la aprueba (RN-09). Va acompañada de
> **ADR-003** (también en `borrador`). Las seis preguntas iniciales están **RESUELTAS
> por el gate (Alberto Fojo, 2026-07-21)** y por el **spike** sobre kimi-cli; se recogen
> aquí para que quien apruebe vea el estado real.

1. **Smoke test (CA-7) — RESUELTO: formato + build + resolución interna, SIN cuenta de
   Kimi.** No se prueba contra el CLI real en esta spec; la ejecución real (cargar el
   raíz, delegar, ping-pong de gates) es **follow-up F-SPEC-003-1**.

2. **Slug del harness — RESUELTO: `kimi-code`.** `adapters/kimi-code/`,
   `dist/kimi-code/`.

3. **Alcance — RESUELTO: recorte aceptado.** Superficie (lista cerrada) + build/
   instalación + smoke test + **guía CE-5 as-built DENTRO de SPEC-003** (CA-9), no como
   spec 5 aparte. CE-2 completo multi-rol contra el CLI real = follow-up (F-SPEC-003-1).

4. **Incógnita crítica (dispatch skill→subagente) — RESUELTA por el spike (código
   fuente kimi-cli).** Modelo obligado: el **orquestador es el agente raíz** (único que
   puede llamar a `Agent`; guard `role != "root"`, jerarquía plana de 1 nivel); declara
   los seis `sdd-*` en su mapa `subagents:` (cada uno `extend: default` +
   `system_prompt_path`→`core/roles/es/<rol>.md`, RN-06 intacto); los **skills instruyen
   al raíz** a delegar vía `Agent(subagent_type: sdd-<rol>)`. Materializado en CA-2,
   CA-6 y CA-11, y en ADR-003 (punto 7). **Asimetría legítima**: en Claude Code el
   orquestador es un skill; en Kimi es el raíz — misma prosa, montaje distinto.

5. **Commands en Kimi — RESUELTO: fuera.** No se entregan `/sdd-init`·`/sdd-tablero`
   como slash-commands (Kimi no tiene ese mecanismo por fichero); se sustituyen por
   invocación de los scripts de `core/` vía skill/script, documentada en la guía.

6. **Skills para el dogfooding — RESUELTO: `.agents/skills/` del repo** (genérico
   cross-harness que Kimi lee nativamente). Fija el procedimiento de instalación (CA-8)
   y permite auto-dogfooding desde Kimi (RN-10).

7. **Asunciones duras del spike (requieren el CLI real) — [ABIERTO], no bloqueantes.**
   Documentadas y diferidas a F-SPEC-003-1, coherentes con no probar contra el CLI
   ahora: (a) **ping-pong con gates humanos** como turnos del raíz (invoca → recibe
   informe → PARA y pregunta → siguiente `Agent()`); (b) **tope de anidamiento = 1
   nivel** (confirmado en código, a re-verificar en runtime); (c) **herencia de
   tools/modelo** por subagente vía `allowed_tools` explícito (escritura para el
   implementador; read-only para verificador y como-vamos) — reflejado en CA-11.

8. **ADR-001 permanece intacto.** ADR-003 **complementa** ADR-001, no lo modifica: el
   build se reutiliza; lo que cambia es la vía de resolución/instalación para un
   harness sin plugin-root ni marketplace. No se toca ningún ADR aprobado (RN-04).
