---
id: SPEC-014
tipo: spec
epica: EPIC-003
estado: en-revision
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-07-27, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-26, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-07-26, por: sdd-implementador}
  - {estado: en-revision, fecha: 2026-07-27, por: sdd-implementador}
---
# SPEC-014 — Cierre CE-1: pipeline SDD completo contra el CLI real de opencode

## Problema
<!-- Qué duele y a quién. Cita reglas de negocio (RN-xx) de docs/fundacion/reglas.md. -->

EPIC-003 (`docs/epicas/EPIC-003-adaptador-opencode-con-paridad-completa/_epica.md`)
tiene sus tres primeras specs en `hecho`: SPEC-009 (estudio de capacidades),
SPEC-010 (superficie: 7 agentes, 2 comandos, 6 skills, `opencode.json`) y SPEC-011
(enforcement L1: plugin que deniega en `tool.execute.before`). Las tres se
verificaron **estáticamente por diseño** —artefacto construido `dist/opencode/`,
payloads simulados— y ninguna ha ejecutado el CLI real de opencode. Queda abierto
**CE-1** de la épica: *"un mismo proyecto SDD se opera de principio a fin desde
opencode —init → épica → spec → implementación → verificación— … Se mide ejerciendo
el flujo real contra el CLI de opencode, no solo en teoría."*

Esta spec es el **#4 del desglose** de la épica ("Ejercicio del pipeline real") y el
**destino explícito** de los residuales que las specs anteriores difirieron aquí:

- **F-SPEC-010-1**: ejercer en runtime la resolución del prompt de rol por ruta
  interna (**[H1]** de ADR-007) y el despacho orquestador-primary → 6 subagentes con
  `subagent_depth=1` y gates como turnos (**[H4]**).
- **F-SPEC-011-1**: confirmar en runtime que el `throw` del plugin en
  `tool.execute.before` **aborta de verdad** un `edit`/`write` en el CLI real y que
  el payload trae tool+paths suficientes (**[H2]**).
- **F-SPEC-011-2**: **aplicar** el overlay `permission` deny/ask por-proyecto sobre
  las `rutasVigiladas` de `.sdd.json` (SPEC-011 lo dejó documentado como paso de
  instalación) y confirmar la fusión de overlay, incluido el matiz de precedencia
  global vs por-agente (**parte de [H5]**).
- **F-SPEC-009-2**: las hipótesis **[H1]…[H5]** del estudio
  (`docs/estudios/opencode-capacidades.md` §5, cada una con su "cómo se confirma
  contra el CLI") quedaron abiertas y accionables **para este piloto**.

El precedente directo es SPEC-013 (EPIC-001, piloto contra el CLI real de Kimi):
misma naturaleza —la evidencia canónica es el **transcript real del CLI**, no un
payload simulado—, misma frontera (lo simulado ya se agotó en las specs previas).
A diferencia de Kimi (bloqueada por cuenta/plan externo), aquí **no hay dependencia
externa**: opencode está instalado en la máquina de trabajo (v1.18.5, vía
chocolatey, verificado 2026-07-27); solo falta un provider/modelo configurado, que
la épica declara decisión de uso del equipo (precondición, ver Notas).

Toca **RN-01/RN-03** (el gate require-spec ejercido de verdad desde el harness),
**RN-06** (la prosa del rol se resuelve por referencia en runtime, no copiada),
**RN-02/RN-10** (nada de esto toca el núcleo; el trabajo entra por su rama) y
**RN-04** (ningún hallazgo edita ADR-007: se registra y, si contradice, se escala a
ADR nuevo). Materializa **CE-1** y aporta la medición en vivo que enuncia **CE-3**
("un intento real de codear sin spec que queda bloqueado").

## Usuarios / roles afectados

- **Mantenedores de tremen-sdd / equipo interno de tremen.dev** (humano): obtienen
  la prueba real de que opencode opera el método de punta a punta (CE-1) y la
  resolución con evidencia de las cinco hipótesis [H1]…[H5] que hoy sostienen el
  diseño del adaptador solo documentalmente.
- **sdd-verificador (de Claude Code)**: **ejecuta** la validación (montaje análogo a
  SPEC-013, ver Notas punto 1): invoca el **CLI real de opencode como sistema bajo
  prueba** desde esta máquina, recoge transcripts/exit codes/artefactos como
  evidencia y rellena el ledger.
- **sdd-implementador**: **solo entra si un CA sale RED por defecto del adaptador**
  (bootstrap, shim del plugin, `opencode.json`): ajusta lo mínimo bajo
  `adapters/opencode/`, rebuild, y devuelve a re-verificación (lazo RED→GREEN,
  RN-01/RN-10 por esta misma rama). Si el defecto exigiera tocar `core/`, se PARA y
  se eleva como hallazgo (la épica lo prohíbe como alcance).
- **sdd-producto**: consume el resultado como evidencia de CE-1/CE-3 para el cierre
  de la épica (el cierre en sí es gate humano, fuera de esta spec).
- **sdd-arquitecto (spec #5)**: consume el acta del piloto para la segunda pasada de
  la guía "añadir un harness" (CE-4).

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA debe ser verificable con un test. -->

> **Convención de evidencia (toda la spec).** La evidencia canónica de cada CA es el
> **transcript real de la sesión de opencode** (stdout/stderr o export de sesión),
> los **exit codes** y los **artefactos que el proyecto-fixture genera** (ficheros de
> épica/spec/ledger, código y test del caso trivial), archivados bajo
> `docs/_qa/SPEC-014/`, junto con la **versión exacta del CLI** (`opencode --version`)
> y la fecha. Un transcript o payload **simulado no es evidencia suficiente**: esa
> era exactamente la frontera de SPEC-010/SPEC-011. Antes de cada paso que dependa
> de un flag o modo del CLI, se contrasta contra `opencode --help` del runtime real:
> si el CLI difiere de la doc/estudio, **manda el CLI** y se anota el
> comportamiento efectivo (finding de doc, no falla del CA).

- **CA-1 (instalación y descubrimiento sin marketplace ejercidos — [H5], parte de
  F-SPEC-009-2)**: **Dado** el artefacto `dist/opencode/` construido con
  `npm run build:opencode` (autocontenido, núcleo dentro) y un **proyecto-fixture
  trivial y desechable** con su **propio repo git** fuera del árbol de tremen-sdd,
  **cuando** se sigue el procedimiento de instalación documentado (SPEC-010/011:
  colocar agents/commands/skills/plugins bajo `.opencode/` del fixture y el
  `opencode.json` del artefacto como config del proyecto) y se arranca el CLI real,
  **entonces** opencode **descubre las piezas**: los comandos `/sdd-init` y
  `/sdd-tablero` aparecen disponibles, los 7 agentes existen (orquestador como
  `primary`, los seis `sdd-*` como `subagent`) y el **plugin de enforcement carga**
  sin error. Queda respondido si opencode **auto-descubre** `.opencode/` del
  proyecto o exige registro explícito en config (la incógnita literal de [H5]).
  **Evidencia**: transcript del arranque, listado de comandos/agentes visto desde el
  CLI, y el procedimiento efectivo paso a paso (input de la spec #5). **FALLA** si
  alguna pieza no es descubierta por ninguna de las vías documentadas.

- **CA-2 (resolución del prompt de rol en runtime — [H1], F-SPEC-010-1)**: **Dado**
  el fixture con el adaptador instalado (CA-1), **cuando** se lanza un agente
  `sdd-*` (p. ej. `sdd-arquitecto`), **entonces** su bootstrap **carga la prosa real
  del rol** desde `core/roles/es/<rol>.md` del artefacto por ruta interna: el
  transcript muestra la lectura del fichero de rol y el agente **se comporta según
  esa prosa** (p. ej. el arquitecto scaffoldea specs y se niega a implementar), sin
  que el cuerpo del rol esté copiado en el agente (RN-06 intacta en runtime). Si la
  vía del bootstrap-`Read` inline **falla**, se ejercita la **alternativa fijada por
  ADR-007 §Decisión punto 2** (registrar el agente en `opencode.json` con
  `prompt: "{file:./core/roles/es/<rol>.md}"`) y se registra cuál vía queda como
  oficial (finding con destino: doc de instalación / spec #5). **PASA** si al menos
  una de las dos vías de ADR-007 resuelve la prosa manteniendo la fuente única;
  **FALLA** si ninguna lo hace (contradiría ADR-007 → escalar a ADR nuevo, RN-04).

- **CA-3 (pipeline end-to-end completo desde opencode — EL cierre de CE-1)**:
  **Dado** el fixture con el adaptador operativo (CA-1/CA-2) y un caso trivial
  (p. ej. "una función que suma"), **cuando** se opera el ciclo completo
  **init → épica → spec → implementación → verificación** desde el CLI real de
  opencode —`/sdd-init` inicializa; el **orquestador-primary delega** en
  `sdd-producto`, `sdd-arquitecto`, `sdd-implementador` y `sdd-verificador` vía la
  tool `task`—, **entonces** el pipeline **produce los artefactos esperados**:
  proyecto inicializado (`.sdd.json`, estructura `docs/`), una épica y una spec
  `aprobada` (aprobadas por el operador del fixture en el gate), el código del caso
  trivial **con su test en verde**, el tablero regenerado con `/sdd-tablero`, y el
  **ledger del fixture con veredicto escrito por el verificador de opencode**.
  Sobre ese último punto: el `opencode.json` declara `edit: deny` para
  `sdd-verificador`; conforme a **ADR-009** ("no escribe fuentes, SÍ el ledger"),
  si ese deny le impide escribir el ledger en runtime, **no es falla en seco** sino
  lazo → `sdd-implementador` ajusta el permiso del agente **acotado al ledger/_qa**
  según ADR-009, rebuild y re-verificación (mismo tratamiento que SPEC-013 CA-6 dio
  a Kimi). **Evidencia**: transcript de la sesión mostrando las delegaciones
  primary→subagente en cada etapa; árbol y contenido de los artefactos del fixture;
  exit code 0 de su suite de tests. **FALLA** si alguna etapa no puede ejecutarse
  desde opencode o el primary no logra delegar en el rol que toca. Sin caminos que
  pasen por Claude Code ni Kimi: todo el ciclo del fixture se conduce desde opencode.

- **CA-4 (despacho y gates como turnos + tope de anidamiento — [H4],
  F-SPEC-010-1)**: **Dado** el pipeline de CA-3, **cuando** llega un punto de gate
  (aprobación de épica/spec; cierre GREEN/RED), **entonces** el orquestador-primary
  se comporta como **turno**: invoca al subagente vía `task`, **recibe su informe**,
  **PARA y devuelve el control al operador**, y solo tras la respuesta emite el
  siguiente `task` — no encadena el pipeline saltándose el gate. Y **cuando** un
  subagente `sdd-*` intenta (provocado deliberadamente) lanzar **otro** subagente,
  **entonces** el runtime lo **impide** (`subagent_depth` default 1, S6 del estudio;
  además `permission.task: deny` de los subagentes en `opencode.json`), quedando la
  jerarquía plana. **Evidencia**: transcript con el patrón
  invoca→informe→PARA→(input)→siguiente `task` en al menos un gate, y transcript del
  intento de anidamiento rechazado. **PASA** si el primary cede el turno y el guard
  dispara; **FALLA** si atraviesa un gate sin pausa o un subagente logra anidar otro
  (finding de diseño al gate → posible ADR).

- **CA-5 (el plugin deniega DE VERDAD en runtime — [H2], F-SPEC-011-1; medición de
  CE-3)**: **Dado** el fixture con el plugin cargado, `rutasVigiladas` configuradas
  en su `.sdd.json` y **sin** rama `ft/SPEC-NNN` (o con la spec del fixture en
  `borrador`), **cuando** se pide al agente editar un fichero bajo ruta vigilada,
  **entonces** la tool `edit` **queda abortada por el `throw` del hook**: el fichero
  **no cambia** (hash/contenido idéntico antes/después) y el transcript muestra el
  **mensaje de `require-spec`**; se repite con una tool `write` con el mismo
  resultado; y **cuando** el fixture está en su carril legítimo (rama `ft/SPEC-NNN`
  + spec `aprobada`/`en-progreso`), **entonces** la misma edición **procede** (así
  se ejerce de hecho la implementación de CA-3). Queda confirmado con payload
  **real** que `input.tool`/`output.args.filePath` traen lo suficiente para decidir.
  **Evidencia**: transcript de ambos intentos (denegado y permitido) + verificación
  de fichero intacto en el denegado. **FALLA** si la tool no se aborta, si el
  fichero cambia pese al `throw`, o si el payload real no basta para decidir
  (→ finding al shim `_comun.mjs` del plugin, lazo implementador; si el mecanismo
  mismo de aborto no existe en runtime, contradice ADR-007 §Decisión punto 3 →
  escalar a ADR nuevo, RN-04, y CE-3 se re-evalúa en el gate de la épica).

- **CA-6 (overlay `permission` por-proyecto aplicado y fusionado — F-SPEC-011-2,
  resto de [H5])**: **Dado** el procedimiento de overlay que SPEC-011 documentó
  (deny/ask por-proyecto sobre las `rutasVigiladas` concretas de `.sdd.json`, que el
  manifiesto genérico del adaptador no puede enumerar), **cuando** se aplica sobre
  el `opencode.json`/config del proyecto-fixture y se ejercita, **entonces**
  (i) opencode **fusiona** el overlay de proyecto con la config instalada (las
  reglas del overlay disparan: `ask`/`deny` observable sobre una ruta vigilada), y
  (ii) queda **sondeada y documentada la precedencia** global vs por-agente (S5:
  "agent rules take precedence"): en concreto, si el `edit: allow` implícito de un
  agente escritor pisa o no el deny global de generados (`docs/tablero.md`,
  `dist/**`) — el matiz que el ledger de SPEC-011 dejó dentro de [H5]. **Evidencia**:
  el overlay aplicado (diff de config del fixture), transcript del disparo, y el
  resultado de precedencia anotado en el acta (CA-7) con impacto en la doc de
  instalación si difiere de lo asumido. **FALLA** si opencode no fusiona el overlay
  de proyecto (dejaría la capa declarativa por-proyecto sin vía → finding a la doc
  de instalación y al gate).

- **CA-7 (acta durable del piloto: [H1]…[H5] resueltas con evidencia — cierre de
  F-SPEC-009-2)**: **Dado** el piloto ejecutado (CA-1…CA-6), **cuando** se registra
  el resultado, **entonces** existe `docs/estudios/opencode-piloto.md` (acta durable,
  hermana del estudio de SPEC-009) que recoge, **por cada hipótesis [H1]…[H5]**:
  veredicto (**confirmada / refutada / matizada**), la evidencia que lo sustenta
  (referencia a `docs/_qa/SPEC-014/` y al CA correspondiente), la **versión exacta
  del CLI** y la fecha de ejercicio; más los hallazgos operativos (vía oficial de
  resolución de prompt de CA-2, procedimiento de instalación efectivo de CA-1,
  precedencia de CA-6, resultado de la sonda [H3] — ver Fuera de alcance) como
  input de la spec #5. **ADR-007 no se edita** (RN-04): si algún veredicto
  contradice la *forma* que fija, el acta lo marca "contradice ADR-007" y el
  informe al gate propone el ADR que lo supersede. *Cómo se testea:* inspección del
  acta — existe, cubre las 5 hipótesis con veredicto+evidencia+versión+fecha, y el
  estudio de SPEC-009 §5 queda referenciado desde ella (sin reescribirlo).

- **CA-8 (alcance del diff acotado; el núcleo intacto)**: **Dado** el trabajo de
  esta spec, **cuando** se revisa el diff de la rama, **entonces** se limita a
  `docs/` (esta spec, su ledger, el acta, `docs/_qa/SPEC-014/`) y, **solo si un
  lazo RED→GREEN lo exigió** (CA-2/CA-3/CA-5/CA-6), a ajustes mínimos bajo
  `adapters/opencode/` con su rebuild; `core/`, `tools/build-adapter.mjs` y la
  máquina de estados quedan **intactos**; el proyecto-fixture vive **fuera** del
  repo y no se comitea. *Cómo se testea:* `git diff --stat main` acotado a lo
  anterior; `npm test` y `node tools/check.mjs` (incluidos `nucleo-aislado`/
  `nucleo-agnostico`) en verde; si hubo ajuste de adaptador, sus tests actualizados
  lo cubren.

## Entidades y reglas afectadas
<!-- Cita RN-xx, ADR-NNN y términos de docs/fundacion/dominio.md. Referencia, no dupliques. -->

- **CE-1 de EPIC-003** (`_epica.md`): el criterio que esta spec cierra con evidencia
  real; aporta además la medición en vivo que enuncia **CE-3** (intento real
  bloqueado, CA-5). El cierre de la épica a `hecho` es milestone humano, fuera de
  esta spec.
- **ADR-007** (encaje de opencode y su enforcement; aprobado, **inmutable**): fija
  la forma que este piloto ejerce (bootstrap-`Read` o `{file:...}` — CA-2; plugin
  que `throw`ea — CA-5; primary/subagents con gates como turnos — CA-4) y enumera
  las hipótesis [H1]…[H5] que aquí se resuelven. **No se edita** (RN-04): un
  hallazgo que contradiga su forma se escala como propuesta de ADR nuevo.
- **ADR-002** (enforcement en capas): L1 es lo que se ejerce en CA-5; la garantía
  dura sigue en L2/L3 (ya verificadas harness-agnósticas en SPEC-011 CA-6), por lo
  que un fallo de L1 en runtime degrada, no desprotege.
- **ADR-009** (política de tools del verificador: "no escribe fuentes, SÍ el
  ledger"): rige el lazo del ledger del fixture en CA-3, replicando para opencode
  la tensión que SPEC-013 CA-6 trató en Kimi.
- **SPEC-009 / estudio durable** (`docs/estudios/opencode-capacidades.md`): §5 es la
  lista accionable [H1]…[H5] con su "cómo se confirma contra el CLI" — este piloto
  la ejecuta tal cual; el acta (CA-7) es su cierre documental (F-SPEC-009-2).
- **SPEC-010 y su ledger** (F-SPEC-010-1 → CA-2/CA-4) y **SPEC-011 y su ledger**
  (F-SPEC-011-1 → CA-5; F-SPEC-011-2 → CA-6): la superficie y el plugin se
  **reutilizan tal cual** desde `dist/opencode/`; esta spec no los rehace.
- **Reglas**: **RN-01/RN-03** (nada sin spec; el gate ejercido desde el harness y la
  red git+CI intactas), **RN-02** (el fixture y el piloto no meten nada de opencode
  en `core/`), **RN-04** (ADRs inmutables), **RN-05/RN-08** (documentos de verdad:
  la sonda [H3] queda fuera de alcance como mecanismo, ver abajo), **RN-06** (fuente
  única de la prosa, ejercida en runtime en CA-2), **RN-09** (esta spec queda en
  `borrador`), **RN-10** (el lazo condicional entra por la rama `ft/SPEC-014-...`).

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

- **Resolver `protege-verdad` por identidad de agente en opencode ([H3]) como
  mecanismo**: implementar ese hook NO entra aquí. Lo que sí hace el piloto es la
  **sonda de conocimiento** ya descrita en el estudio §5: volcar el payload real de
  `tool.execute.before` desde distintos agentes y **registrar en el acta (CA-7)** si
  existe identidad de agente utilizable. Si existe → follow-up con destino a una
  spec futura de EPIC-003 o EPIC-MEJORA; si no → queda confirmada la degradación
  fail-open documentada (garantía en L2/L3, como Kimi). En ningún caso se codea el
  hook en esta spec.
- **Elegir/configurar provider, modelo o plan de opencode**: decisión de uso del
  equipo (épica, "Fuera"). Tener un provider configurado es **precondición del
  montaje** (paso humano una vez, no-normativo, ver Notas punto 2), no un CA.
- **El piloto con el equipo/proyecto interno real de tremen.dev**: esta spec ejerce
  CE-1 sobre un fixture desechable; que el equipo que pidió la épica lo adopte es
  el riesgo "necesidad interna sin fecha firme" de la épica y se gestiona en su
  cierre (gate humano), no aquí.
- **Cierre de EPIC-003 a `hecho`** y actualización de la guía "añadir un harness"
  (**spec #5**, que consumirá el acta y el coste real observado).
- **Ampliar la superficie del adaptador** (nuevos roles/comandos/hooks) o
  **reescribir lógica** de `core/scripts`, `core/lib` o la máquina de estados:
  prohibido por la épica; si el piloto lo exigiera, es hallazgo a elevar, no alcance.
- **Distribución del artefacto a usuarios finales**: sigue [ABIERTO], fuera de
  EPIC-003; la instalación del piloto es por procedimiento sobre `dist/opencode/`.
- **Regresión de specs migradas en `estado.mjs`** (deuda conocida): el fixture nace
  virgen con el propio estándar, no la toca.

## Notas para el gate humano
<!-- Lo que quien aprueba necesita saber para decidir. -->

> Esta spec queda en `borrador`; la arquitecta **NO la aprueba** (RN-09). **No la
> acompaña ningún ADR nuevo**: ejerce lo que ADR-007/ADR-002/ADR-009 (aprobados) ya
> fijan; si el runtime refutara alguna de sus formas, el resultado sería la
> **propuesta** de un ADR que supersede, nunca la edición del aprobado (RN-04).

1. **Montaje de validación — propuesto, análogo al que el humano ya decidió para
   SPEC-013 (Kimi), a confirmar en el gate.** La ejecuta el **sdd-verificador de
   Claude Code** en **esta máquina Windows** (opencode 1.18.5 vía chocolatey,
   verificado 2026-07-27), invocando el **CLI real de opencode como sistema bajo
   prueba** y actuando como **operador de los gates del fixture** (legítimo porque
   el fixture es desechable; lo que se valida es el *mecanismo* de pausa/turno,
   CA-4). Evita que el verificador de opencode se certifique a sí mismo. Diferencia
   con SPEC-013: aquí no hay dependencia de cuenta externa que pueda bloquear.

2. **Precondición no-normativa: provider/modelo configurado.** La épica declara esa
   elección "decisión de uso del equipo". La spec la asume como **paso humano
   previo** (una vez, en esta máquina); ningún CA depende de *qué* provider sea.
   Si el gate prefiere fijar uno concreto para reproducibilidad del acta, es
   decisión operativa suya y no cambia los CA.

3. **Cómo se conduce el CLI: manda el runtime, no la doc.** El estudio (S1–S6,
   2026-07-23) documenta piezas y config, pero no fija la mecánica exacta de
   conducir una sesión (modo no interactivo si existe, export de transcript,
   flags). La convención de evidencia obliga a contrastar cada paso contra
   `opencode --help`/`--version` reales y a registrar el comportamiento efectivo
   como finding de doc — el mismo criterio que SPEC-013 aplicó a los flags de Kimi.
   opencode evoluciona rápido: el acta clava versión y fecha precisamente por eso.

4. **Lazos condicionales previstos (no fallas en seco).** (a) CA-2: si el
   bootstrap-`Read` inline no resuelve, se pasa a la alternativa `{file:...}` que
   ADR-007 ya deja fijada; (b) CA-3: si el `edit: deny` del verificador de opencode
   le impide escribir el ledger del fixture, se ajusta acotado según ADR-009;
   (c) CA-5/CA-6: si el payload real no basta o el overlay no fusiona, entra el
   implementador sobre `adapters/opencode/` (shim/doc de instalación) y se
   re-verifica. Todos entran por esta misma rama (RN-01/RN-10). **Solo** contradiría
   la spec un fallo estructural (p. ej. el `throw` no aborta en absoluto): eso
   refutaría ADR-007 §3 y volvería al gate con propuesta de ADR nuevo y CE-3
   re-evaluado.

5. **Mirar con lupa: CA-5 es la medición de CE-3, no su re-implementación.** El
   enforcement ya está construido y verificado estáticamente (SPEC-011, `hecho`).
   Aquí NO se re-abre: se ejerce una vez en vivo (denegado sin carril, permitido en
   carril). Si el gate considera que CE-3 ya quedó suficientemente medido en
   SPEC-011, puede pedir rebajar CA-5 a "solo denegación"; mi recomendación es
   mantener ambos lados (deny + allow legítimo) porque el allow legítimo es además
   el camino por el que CA-3 implementa el caso trivial.

6. **El fixture es desechable y vive fuera del repo** (con su propio git, necesario
   porque `require-spec` evalúa la rama). No se comitea; lo durable es el acta
   (`docs/estudios/opencode-piloto.md`) y la evidencia (`docs/_qa/SPEC-014/`).
   Recomendación operativa: carpeta nueva y aislada, para no confundir el
   dogfooding de tremen-sdd con el fixture ni disparar los hooks del propio repo
   (misma recomendación que el gate de SPEC-013 aceptó).

7. **Riesgo señalado: deriva de versión del CLI.** El estudio se citó a 2026-07-23;
   el piloto correrá 1.18.5 (o la versión vigente al ejecutarse). Si un
   comportamiento documentado cambió, la convención de evidencia lo captura (manda
   el CLI) y el acta lo registra como hallazgo para la spec #5; no invalida ADR-007
   salvo que toque su *forma* (punto 4).

8. **Colisión de ID detectada al scaffoldear (aviso de proceso, no de esta spec).**
   `scaffold.mjs` propuso `SPEC-013` porque la SPEC-013 de EPIC-001 vive en la rama
   `ft/SPEC-013-cierre-ce-2-kimi-real` aún no mergeada a `main` (`nextId` solo ve el
   árbol local). Se corrigió a mano a SPEC-014 (el siguiente libre según el estado
   real del proyecto). Queda señalado como posible finding de EPIC-MEJORA:
   `nextId` es ciego a specs que existen solo en ramas sin mergear.
