---
id: SPEC-015
tipo: spec
epica: EPIC-003
estado: aprobada
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-07-27, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-27, por: Alberto Fojo}
---
# SPEC-015 — Guía «Añadir un harness», 2ª pasada: opencode y sus desviaciones

## Problema

**CE-4 de EPIC-003 está a medias y es lo único que impide cerrar la épica.**

CE-4 dice: *"todo lo nuevo vive bajo `adapters/opencode/`; el núcleo no gana ni una
dependencia hacia opencode (mismo check de CI de aislamiento sigue en verde). **El
coste real se compara contra la _Guía añadir un harness_ y cualquier desviación se
registra como corrección de esa guía**."*

- **La primera mitad está cumplida** y verificada: `nucleo-aislado` /
  `nucleo-agnostico` en verde y `core/` sin una sola referencia a opencode
  (ledgers SPEC-010 CA-9, SPEC-011 CA-7, SPEC-014 CA-8).
- **La segunda mitad no existe.** `docs/arquitectura.md` §"Añadir un harness"
  tiene **cero** menciones de opencode. Sigue siendo el recetario *as-built*
  derivado de Kimi (SPEC-003, CA-9): su tabla "Lista cerrada de piezas de un
  adaptador" tiene **dos** columnas (Claude Code | Kimi Code), su §"Resolución del
  núcleo" contempla **dos** modos y su §"Procedimiento de instalación" es **solo**
  el de Kimi. Peor: varias secciones vecinas afirman cosas que hoy son falsas
  (el árbol de `adapters/` lista un solo adaptador; los checks se describen
  "generalizados a los dos adaptadores"; la tabla de comandos no conoce
  `build:opencode`).

A quién duele:

- **A quien añada el CUARTO harness** (Gemini CLI, Cursor, Codex… fuera de alcance
  hoy, pero la visión los deja en la puerta): abriría la guía y presupuestaría un
  coste que ya sabemos que es falso — porque la guía omite todo el trabajo que
  *siempre* cae fuera de `adapters/<harness>/`.
- **Al propio método**: EPIC-001 CE-5 prometió que "añadir un harness es una lista
  cerrada de piezas de adaptador, sin tocar el núcleo". El tercer harness
  **confirmó** la parte del núcleo y **desmintió** la parte de "lista cerrada":
  hicieron falta piezas que la lista no tenía, y trabajo fuera de `adapters/`.
  Registrar eso es exactamente lo que CE-4 pide, y no hacerlo deja la promesa
  inflada (RN-10: el repo se autogestiona con su propio estándar; una guía que
  miente sobre su propio coste es deuda de método).
- **A quien opere opencode hoy**: el procedimiento de instalación efectivo vive
  disperso en `docs/_qa/SPEC-014/ca1-descubrimiento/procedimiento-e-hallazgos.md`
  y en el acta del piloto, no en la guía.

Esta spec **no implementa nada del adaptador**: su entregable es *documental*, y su
artefacto objetivo es `docs/arquitectura.md`. Es el análogo directo de SPEC-003
CA-9 (que escribió la guía 1ª pasada con Kimi como caso trabajado), ahora con
opencode como segundo caso y —lo más valioso— con las **desviaciones** de la 1ª
pasada registradas.

Reglas en juego: **RN-04** (ADR-003/ADR-007/ADR-009 son inmutables: la guía los
*cita*, no los redecide), **RN-06** (la prosa de roles no se toca), **RN-02** (el
núcleo no se toca), **RN-10** (dogfooding).

## Usuarios / roles afectados

- **Mantenedores de tremen-sdd (humano)**: destinatarios reales. Ganan un recetario
  que dice la verdad sobre el coste de un harness nuevo y que registra dónde la
  versión anterior falló.
- **Quien añada el cuarto harness** (persona o rol futuro): usuario de diseño de
  esta spec. El criterio de utilidad es *"¿le sirve a alguien que no vivió ni
  Kimi ni opencode?"*, no *"¿cuenta bien lo que hizo opencode?"*.
- **sdd-implementador**: único escritor del cambio. Trabajo 100 % en `docs/`;
  su fuente son los artefactos ya existentes (acta, ledgers, `_qa/`, ADRs,
  `adapters/opencode/`), **no** conocimiento propio sobre CLIs.
- **sdd-verificador**: verifica por **lectura contra checklist enumerable** (la
  guía es prosa; el precedente es SPEC-003 CA-8/CA-9) y por **comparación
  mecánica** contra el as-built donde el dato sea comprobable (`package.json`,
  `tools/check.mjs`, `tools/checks/`, `adapters/`).
- **Quien opera opencode hoy** (el equipo interno que empujó EPIC-003): obtiene el
  procedimiento de instalación as-built en el sitio donde se busca.
- **EPIC-004 (Distribución)**: consumidora aguas abajo. Esta guía le entrega el
  as-built que ella sustituirá; no se solapan (ver *Fuera de alcance*).

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA verificable por lectura contra checklist enumerable o por comparación mecánica contra el as-built. Rutas relativas a la raíz del repo. -->

- **CA-1 (tabla de piezas a TRES columnas, con la pieza que faltaba)**: Dado
  `docs/arquitectura.md` §"Añadir un harness" → "Lista cerrada de piezas de un
  adaptador", **cuando** se lee tras el cambio, **entonces** la tabla tiene la
  cabecera `Pieza | Claude Code | Kimi Code | opencode` y **una fila por cada
  pieza**, incluyendo las seis actuales (`agents/`, `skills/`, `hooks/`,
  `manifiesto`, `commands/`, `tests/`) **más una fila nueva de `permisos
  declarativos`** (existe en opencode como `permission` por agente y por patrón;
  no existe como pieza en Claude Code ni en Kimi). Cada celda de la columna
  opencode nombra el as-built real y **resoluble**: `agents/*.md` (bootstrap;
  orquestador `mode: primary`, los seis `sdd-*` `mode: subagent`),
  `skills/<rol>/SKILL.md` (despacho por la tool `task`, sin prefijo de plugin),
  `plugins/require-spec.mjs` + `plugins/_comun.mjs` (shim), `opencode.json`
  (manifiesto, **con** `plugin` y `permission`), `commands/{sdd-init,sdd-tablero}.md`
  (**sí** los hay, a diferencia de Kimi) y `tests/` contra `dist/opencode/`.
  **Verificable**: (a) la cabecera tiene 4 columnas; (b) hay ≥7 filas de pieza;
  (c) cada ruta citada en la columna opencode existe bajo `adapters/opencode/`
  (comparación mecánica, `ls`); (d) la fila `commands/` marca explícitamente la
  asimetría "sí en Claude y opencode, no en Kimi"; (e) la fila `hooks/plugin`
  marca que en opencode L1 **deniega** (aborta la tool) y en Kimi es fail-open.

- **CA-2 (asimetría del orquestador enunciada en TRES formas, con su causa)**:
  Dado el párrafo que hoy explica la asimetría del orquestador en dos harnesses,
  **cuando** se lee tras el cambio, **entonces** enuncia los **tres** montajes
  —*skill* en Claude Code (el main-loop despacha), *agente raíz* en Kimi (único que
  llama a `Agent`, guard `role != "root"`), *agente `mode: primary`* en opencode
  (despacha por la tool `task`, `subagent_depth` = 1)—, afirma que la **prosa de
  rol es la misma** (`core/roles/<idioma>/sdd-orquestador.md`, RN-06) y que lo que
  cambia es el **mecanismo de despacho del harness**, y cita **ADR-003 punto 7** y
  **ADR-007 §Decisión punto 4**. **Verificable**: los tres montajes aparecen
  nombrados con su mecanismo; ambas citas de ADR presentes y resolubles.

- **CA-3 (§"Resolución del núcleo": tercer modo, con su estado de validación)**:
  Dado `docs/arquitectura.md` §"Resolución del núcleo", **cuando** se lee tras el
  cambio, **entonces** (a) enumera **tres** modos: `${CLAUDE_PLUGIN_ROOT}/core/…`
  (Claude Code, variable del harness), ruta relativa al fichero (Kimi,
  `system_prompt_path` → bootstrap → `../../core/roles/…`) y **ruta interna
  relativa al fichero del agente** (opencode: el cuerpo del agente instruye un
  `Read` de `../core/roles/<idioma>/<rol>.md`; **no hay variable de plugin-root**);
  (b) dice que el token neutro `${SDD_ROOT}` del núcleo se materializa en cada
  harness como su ruta/variable, sin que el núcleo sepa cuál (ADR-004); (c) anota
  que la vía preferida de ADR-007 (bootstrap-`Read`) **quedó confirmada en runtime**
  contra opencode **1.18.5** el **2026-07-27** ([H1], acta del piloto §1) y que la
  alternativa documentada `prompt: "{file:…}"` **no fue necesaria** y queda como
  respaldo; (d) corrige la frase de generalización de checks: `referencias`,
  `roles-fuente-unica`, `manifiestos` y `descripcion-fuente-unica` están
  generalizados a los **tres** adaptadores. **Verificable**: los tres modos
  aparecen; la afirmación de runtime lleva versión + fecha; la lista de checks
  generalizados coincide con `tools/check.mjs` (`PASOS`).

- **CA-4 (§"Procedimiento de instalación (opencode)" as-built y ejecutable)**:
  Dado que la guía hoy solo documenta el procedimiento de Kimi, **cuando** se lee
  tras el cambio, **entonces** existe una subsección hermana para opencode que
  reproduce el **procedimiento efectivo ya ejercido** (fuente:
  `docs/_qa/SPEC-014/ca1-descubrimiento/procedimiento-e-hallazgos.md`, acta §1
  [H5]) con, como mínimo: (1) `npm run build:opencode`; (2) copiar **todo**
  `dist/opencode/.` a `<proyecto>/.opencode/` **incluida la config**, que queda en
  `.opencode/opencode.json`, **con la razón** (las rutas de `plugin` resuelven
  relativas al fichero de config que las declara); (3) overlay opcional y **no
  normativo** en `<proyecto>/opencode.json` (decisiones de uso: modelo, `ask` por
  ruta), señalando que las configs **fusionan**; (4) arrancar el CLI, **sin
  registro adicional**: agentes, comandos y skills se **auto-descubren**; (5)
  comandos de comprobación reales (`opencode agent list`, `opencode debug config`,
  `opencode debug skill`) con lo que debe verse (7 agentes con su `mode`, 2
  comandos, 6 skills, `plugin` resuelto). Además declara que la garantía "nada se
  codea sin spec aprobada" **no** depende de que opencode cargue el plugin (L2/L3,
  ADR-002), igual que ya hace la subsección de Kimi. **Verificable**: los cinco
  pasos están; cada comando y ruta citados existen o son ejecutables; la razón del
  paso (2) aparece explícita.

- **CA-5 (§"Desviaciones registradas" — el corazón de CE-4)**: Dado que CE-4 exige
  registrar *cualquier desviación* como corrección de la guía, **cuando** se lee
  tras el cambio, **entonces** existe una subsección dedicada donde **cada entrada**
  tiene los cuatro campos: **qué decía (o callaba) la guía** · **qué pasó de
  verdad** · **evidencia** (ledger / acta / `docs/_qa/` / commit) · **corrección
  aplicada o follow-up con destino**. La subsección cubre **al menos** estas seis
  desviaciones, todas materiales y todas con evidencia ya existente en el repo:
  1. **El auto-descubrimiento tiene excepciones por extensión de fichero.** opencode
     1.18.5 auto-descubre `.opencode/{agents,commands,skills}` sin registro alguno,
     **pero solo auto-descubre plugins `*.ts`/`*.js`**: el plugin del adaptador es
     `.mjs` y **no cargaba**. Arreglo: registrar `"plugin": ["./plugins/require-spec.mjs"]`
     en el manifiesto (lazo RED→GREEN de SPEC-014 CA-1, commit `f899c19`).
     Lección para la guía: **el descubrimiento se verifica pieza a pieza contra el
     CLI; no se deduce del manifiesto ni de la doc.**
  2. **El coste NO cabe en `adapters/<harness>/`.** La guía afirma que "un adaptador
     es `adapters/<harness>/` y **solo** contiene superficie de adaptador" — cierto
     como invariante de *contenido*, engañoso como presupuesto de *trabajo*. Añadir
     un harness tocó **siempre** también: `tools/checks/*` (generalización de
     `referencias`, `manifiestos`, `roles-fuente-unica`, `descripcion-fuente-unica`),
     `tools/tests/*`, `tools/check.mjs` (`PASOS`) y `package.json` (scripts
     `build:*`, `test:adapter`, `test`); y en SPEC-014, además,
     `tools/checks/manifiestos.mjs` por el lazo ADR-009 (**F-SPEC-014-1**, aceptada
     como salvedad ⚠️ en CA-8). Corrección: la guía declara una **segunda lista
     explícita** — *"lo que hay que tocar fuera de `adapters/`"*— junto a la lista
     cerrada de piezas, y precisa que la promesa intacta es **"sin tocar el
     núcleo"** (EPIC-001 CE-1/CE-5, RN-02), no "sin tocar nada más".
  3. **La asimetría del orquestador es una decisión de partida, no una nota al
     pie.** Con tres harnesses hay tres montajes distintos; la guía la enunciaba
     como una curiosidad binaria. Corrección: elevarla a **primera decisión** del
     procedimiento de CA-6 (el mecanismo de despacho del harness determina cómo se
     monta el orquestador y, en cascada, skills, permisos y gates).
  4. **Faltaba la pieza "permisos declarativos".** opencode tiene `permission`
     por agente y por patrón —capa que Claude Code y Kimi no tienen como pieza—, y
     la lista cerrada no la contemplaba. Además **tiene trampa**: `edit: "deny"`
     en seco **retira la tool** del agente (rompió al verificador del fixture →
     lazo ADR-009: `edit` granular, commit `8f6e690`), y un `edit: "allow"` plano
     por-agente **pisa** el deny global por-ruta (**F-SPEC-014-3**, acta §2.2).
     Corrección: fila nueva en la tabla (CA-1) + advertencia de que esta capa es
     **complementaria y estática**, nunca la garantía (ADR-002: L1 degrada, no
     desprotege). La *solución* de F-SPEC-014-3 **no** se escribe aquí: se
     **referencia** con su destino, **EPIC-004** (ver *Fuera de alcance*).
  5. **La guía no pedía documentar cómo se CONDUCE el CLI.** Sin eso, CE-1 de una
     épica de harness no se puede evidenciar ni verificar. En opencode 1.18.5:
     `opencode run` es el modo no interactivo (`--agent`, `--command`,
     `--format json`, `-s/--session`, `opencode export`); `--agent <subagente>`
     **cae en silencio** al agente por defecto (`build`); **`run -s` NO conserva el
     agente de la sesión** —hay que re-pasar `--agent <primary>` en **cada** turno
     (origen del finding V1 de la ronda 1 del piloto)—; y un permiso `ask` en
     `run` no interactivo **se auto-rechaza**. Corrección: la guía exige, como
     pieza del recetario, que cada adaptador documente su **conducción no
     interactiva**; se archiva aquí **F-SPEC-014-4** (destino declarado: esta spec).
  6. **El enforcement L1 no es binario.** La guía lo trataba como "hay hooks / no
     hay hooks". Realidad de los tres: Claude Code deniega (hook L1, fail-open ante
     error), Kimi **avisa** (fail-open, la garantía dura recae en L2/L3), opencode
     **deniega de verdad** (`throw` en `tool.execute.before` aborta la tool;
     confirmado en runtime, [H2]). Y un detalle de orden observado: **el hook del
     plugin dispara ANTES que la evaluación de `permission`**. Corrección: la guía
     describe L1 como un **espectro** (deniega / avisa / ausente) con la constante
     invariable de que L2+L3 son la garantía (ADR-002, RN-03).
  **Verificable**: la subsección existe; hay ≥6 entradas; **cada** entrada tiene
  los 4 campos; cada referencia a evidencia (fichero, commit, finding) resuelve.

- **CA-6 (§"Abordar un harness nuevo": procedimiento ordenado y generalizado)**:
  Dado el criterio de utilidad *"que sirva al cuarto harness"*, **cuando** se lee la
  guía tras el cambio, **entonces** contiene un **procedimiento ordenado** y
  **agnóstico del harness concreto** (no un relato de opencode) con, como mínimo,
  estos pasos, cada uno con la **pregunta a responder contra el CLI/doc real** y el
  **artefacto del repo que se toca**: (1) mecanismo de despacho → cómo se monta el
  orquestador; (2) mapeo de las piezas de la tabla (CA-1), marcando cuáles no
  existen en ese harness; (3) resolución del núcleo (¿hay variable de plugin-root?
  ¿ruta interna?) y materialización de `${SDD_ROOT}`; (4) enforcement L1 en el
  espectro deniega/avisa/ausente, sin mover L2/L3; (5) descubrimiento y registro
  de cada pieza, **verificado contra el CLI**; (6) trabajo fuera de `adapters/`
  (la segunda lista de CA-5.2); (7) conducción no interactiva del CLI para poder
  evidenciar el pipeline (CA-5.5); (8) ejercicio real del pipeline y registro de
  desviaciones **de vuelta en esta guía**. **Verificable**: los 8 pasos están
  numerados y ordenados; ninguno está redactado como narración de opencode
  (prueba de lectura: sustituir "opencode" por "<harness>" no deja el paso sin
  sentido); cada paso nombra su pregunta y su artefacto.

- **CA-7 (contraste predicción vs. as-built, SIN duplicar el estudio)**: Dado que
  SPEC-009 §6 (`docs/estudios/opencode-capacidades.md`) ya predijo el contraste de
  los tres harnesses **sobre doc, el 2026-07-23**, y el piloto lo ejerció **sobre
  el CLI 1.18.5, el 2026-07-27**, **cuando** se lee la guía tras el cambio,
  **entonces** hay un pasaje breve (≤ 1 párrafo + lista) que **cierra el bucle**:
  dice qué predijo el estudio que **se confirmó** (paridad de commands, orquestador
  primary, sin plugin-root, L1 que deniega) y **qué no bastó** (el auto-descubrimiento
  del plugin `.mjs`, la trampa de precedencia de permisos, la conducción del CLI),
  **remitiendo** al estudio y al acta en vez de reescribirlos. **Verificable**: el
  pasaje existe, distingue *predicho/confirmado* de *no previsto*, y **no** copia la
  tabla del estudio §6 (no hay tabla duplicada de 7 filas en `arquitectura.md`).

- **CA-8 (método de citación: nada por conocimiento del modelo)**: Dado el
  requisito de método de EPIC-003 (*"toda afirmación sobre un CLI externo va citada
  con fuente y fecha, o marcada como hipótesis"*), **cuando** se audita el texto
  añadido, **entonces** **toda** afirmación sobre el comportamiento de un CLI
  externo lleva **ancla**: o bien versión + fecha del ejercicio (opencode
  **1.18.5**, **2026-07-27**), o bien fuente documental con fecha de consulta
  (opencode.ai/docs, **2026-07-23**; doc oficial de Kimi CLI, jul 2026, vía
  ADR-003), o bien referencia a evidencia del repo (`docs/_qa/`, acta, ledger); y
  lo no verificado va **marcado explícitamente como hipótesis**. Además, el texto
  advierte que **opencode evoluciona rápido** y que lo escrito describe 1.18.5.
  **Verificable**: recorrido del diff; **cero** afirmaciones de comportamiento de
  CLI sin ancla; la versión 1.18.5 aparece asociada a las afirmaciones de runtime.

- **CA-9 (coherencia as-built del resto de `arquitectura.md`)**: Dado que el
  documento tiene secciones vecinas hoy desactualizadas por el tercer adaptador,
  **cuando** se lee tras el cambio, **entonces** coinciden con el as-built:
  (a) el árbol de §"El modelo" lista los **tres** adaptadores bajo `adapters/`;
  (b) la tabla de §"Tests y checks" incluye `build:opencode` y sus comandos
  coinciden con `package.json`; (c) el número y la lista de checks de
  `tools/checks/` coinciden con el directorio real y con `tools/check.mjs`
  (`PASOS`), y la frase "generalizados a los dos adaptadores" pasa a **tres**;
  (d) el §"Flujo de trabajo" sigue nombrando correctamente las rutas vigiladas de
  `.sdd.json`. **Verificable por comparación mecánica**: `ls adapters/`,
  `ls tools/checks/`, `node -e` sobre `package.json.scripts`, `tools/check.mjs`
  `PASOS` — cada dato del documento tiene su contrapartida idéntica.

- **CA-10 (fronteras respetadas y diff acotado)**: Dado el conjunto de cambios,
  **cuando** se inspecciona el diff y se corren los gates, **entonces** (a) el diff
  toca **solo** `docs/` (spec, ledger y `docs/arquitectura.md`); `core/`, `tools/`,
  `adapters/` y `package.json` **intactos**; (b) la guía **no** resuelve
  F-SPEC-014-3 ni F-SPEC-014-2 (los referencia con su destino: EPIC-004 y
  EPIC-003/EPIC-MEJORA respectivamente); (c) la guía **no** describe publicación ni
  distribución del artefacto, y donde el tema asome **remite a EPIC-004**;
  (d) `npm test` y `node tools/check.mjs` siguen verdes (incluye
  `node core/scripts/valida.mjs`, que valida los artefactos de `docs/`).
  **Verificable**: `git diff --stat main`, búsqueda de los identificadores de
  follow-up en el texto, y las dos órdenes de gate.

## Entidades y reglas afectadas
<!-- Cita RN-xx, ADR-NNN y términos de docs/fundacion/dominio.md. Referencia, no dupliques. -->

- **Artefacto objetivo (único)**: `docs/arquitectura.md`, §"Añadir un harness" y las
  secciones vecinas que el tercer adaptador dejó desactualizadas (CA-9).
- **Fuentes primarias del contenido (se citan, no se reescriben)**:
  - `docs/estudios/opencode-piloto.md` — acta del piloto contra opencode **1.18.5**,
    **2026-07-27** (SPEC-014): veredictos [H1]…[H5], hallazgos operativos §2,
    cierre CE-1/CE-3 §4.
  - `docs/estudios/opencode-capacidades.md` — estudio sobre doc oficial,
    consultada **2026-07-23** (SPEC-009); **§6** es el contraste de los tres
    harnesses que CA-7 cierra sin duplicar.
  - `docs/_qa/SPEC-014/ca1-descubrimiento/procedimiento-e-hallazgos.md` —
    procedimiento de instalación efectivo (input de CA-4).
  - Ledgers `SPEC-010`, `SPEC-011`, `SPEC-014` (`*.ledger.md` de EPIC-003) — coste
    real, salvedades y follow-ups F-SPEC-014-1…4.
  - `adapters/opencode/` — el as-built que la tabla de CA-1 debe reflejar.
- **ADRs citados (RN-04: inmutables, esta spec NO los edita)**: **ADR-001**
  (estructura multi-harness y build), **ADR-002** (enforcement en capas L1/L2/L3),
  **ADR-003** (empaquetado y resolución sin marketplace ni plugin-root; punto 7 =
  asimetría del orquestador), **ADR-004** (la resolución del núcleo la aporta el
  adaptador; `${SDD_ROOT}` neutro), **ADR-007** (encaje de opencode; §Decisión
  puntos 1-5), **ADR-009** (política de tools del verificador, materializada en el
  `permission.edit` granular del manifiesto de opencode).
- **Reglas de negocio**: **RN-02** (dependencia solo adaptador→núcleo; nada de esta
  spec toca `core/`), **RN-03** (enforcement independiente del harness: la guía debe
  repetir que L2/L3 son la garantía), **RN-04** (ADR inmutable), **RN-05**
  (`docs/tablero.md` y `dist/` son generados), **RN-06** (fuente única de la prosa
  de roles), **RN-10** (dogfooding).
- **Criterios de épica que cierra**: **EPIC-003 CE-4**, segunda mitad ("el coste
  real se compara contra la guía y cualquier desviación se registra como corrección
  de esa guía"). Toca además, por contraste honesto, **EPIC-001 CE-5** ("lista
  cerrada de piezas, sin tocar el núcleo"): se confirma la parte del núcleo y se
  **matiza** la de "lista cerrada" (CA-5.2).
- **Follow-ups que esta spec ARCHIVA**: **F-SPEC-014-4** (conducción del CLI; su
  destino declarado era esta spec) → CA-5.5.
- **Follow-ups que esta spec SOLO REFERENCIA**: **F-SPEC-014-3** (precedencia de
  permisos → **EPIC-004**), **F-SPEC-014-2** (`protege-verdad` por identidad de
  agente → enforcement, no guía), **F-SPEC-014-1** (frontera de CA-8, ya aceptada
  como salvedad) — este último se convierte en **doctrina documentada** vía CA-5.2,
  sin reabrir su juicio.

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

- **Cualquier cambio de código**: `core/`, `tools/`, `adapters/`, `package.json`,
  checks, tests. Entregable **solo documental** (CA-10a). Si al escribir se
  descubre que un dato del as-built está mal en el *código*, se **reporta**, no se
  arregla.
- **F-SPEC-014-3 (precedencia de permisos en opencode: un `edit: "allow"` plano
  por-agente pisa el deny global por-ruta)**: asignado a **EPIC-004 — Distribución
  del artefacto a runtime**, porque su destino declarado era el doc de instalación
  y ese doc se reescribe allí. Aquí solo se **menciona** como trampa conocida con
  su destino (CA-5.4). **No se replican los deny por-agente ni se toca
  `adapters/opencode/opencode.json`.**
- **F-SPEC-014-2 (`protege-verdad` por identidad de agente en opencode)**: es
  enforcement, no guía. Fuera.
- **Procedimiento de distribución y publicación del artefacto** (instalar sin clon
  ni build, versionado, actualización): es **EPIC-004** entera. Esta guía describe
  cómo se **construye** un adaptador y cómo se instala **hoy, as-built desde el
  repo**; donde el tema asome, remite (CA-10c).
- **Adaptadores nuevos** (Gemini CLI, Cursor, Codex): siguen fuera; la guía se
  escribe *para* el cuarto harness, no *construye* ninguno.
- **Reescribir el estudio SPEC-009 o el acta SPEC-014**: son artefactos durables y
  fechados de sus specs. Se citan (CA-7); no se refunden en la guía.
- **Editar ADRs** (RN-04). Si el as-built contradijera un ADR, el camino es un ADR
  nuevo que lo supersede — y no se ha detectado tal contradicción: el acta §3 y el
  estudio §7 declaran que **nada contradice la forma de ADR-007**.
- **Reforzar la prosa de roles** (`core/roles/`), p. ej. la observación del
  verificador de SPEC-014 sobre el arquitecto de opencode colocando una spec en
  layout no canónico en el fixture: tocaría el núcleo (RN-02/RN-06) y es un asunto
  de prosa de rol, no de guía de harness. Se eleva en las notas del gate.
- **Multi-idioma** de la guía: `docs/` sigue en español, solo `es`.
- **Traducir o versionar la guía como página de `site/`**: fuera.

## Notas para el gate humano
<!-- Lo que quien aprueba necesita saber para decidir. -->

> Esta spec queda en **`borrador`**: la arquitecta **no** aprueba su propio trabajo
> (RN-09). Aprobarla cierra el camino a CE-4 de EPIC-003 y, con él, a la épica.

1. **La decisión de fondo: ¿la guía admite que el coste NO cabe en `adapters/`?**
   (CA-5.2). Es la desviación más incómoda y la más útil. La lista cerrada de
   piezas es correcta como invariante de **contenido** (`adapters/<harness>/` solo
   tiene superficie), pero como **presupuesto de trabajo** siempre ha sido falsa:
   los tres adaptadores tocaron `tools/checks/`, `tools/tests/`, `tools/check.mjs`
   y `package.json`. **Recomendación de la arquitecta: declararlo.** La promesa de
   EPIC-001 que sigue intacta —y es la que importa— es *"sin tocar el núcleo"*
   (verificada tres veces por `nucleo-aislado`); *"lista cerrada de piezas"* pasa a
   significar "lista cerrada **de piezas del adaptador**, más una segunda lista
   conocida de puntos de generalización". Si el gate prefiere mantener el enunciado
   original, decirlo ahora: cambia CA-5.2 y el paso 6 de CA-6.

2. **F-SPEC-014-1 se convierte en doctrina, no se reabre.** El verificador de
   SPEC-014 aceptó como salvedad ⚠️ que el lazo ADR-009 obligara a tocar
   `tools/checks/manifiestos.mjs` y `tools/tests/opencode.test.mjs`. Esta spec
   **no** rejuzga esa decisión: la usa como caso de la desviación 2. Si el gate
   quisiera revisitarla, es otra conversación.

3. **F-SPEC-014-4 muere aquí; F-SPEC-014-3 no.** El primero (conducción del CLI:
   `run -s` no conserva el agente, `--agent <subagente>` cae en silencio, `ask` se
   auto-rechaza en no interactivo) tenía como destino declarado esta spec y se
   archiva en CA-5.5. El segundo (precedencia de permisos) va a **EPIC-004** por
   decisión del gate de hoy: aquí solo se **referencia**. Confirmar que la frontera
   es la esperada.

4. **La guía se escribe DENTRO de `arquitectura.md`, no como documento aparte.**
   Mismo criterio que SPEC-003 CA-9 (que la puso ahí). El riesgo es que
   `arquitectura.md` engorde; la alternativa —`docs/guias/anadir-un-harness.md`
   enlazado— fragmenta y obliga a mantener dos as-built. **Recomendación: dentro.**
   Si el gate prefiere extraerla a documento propio, es un cambio de forma barato
   pero hay que decidirlo **antes** de implementar.

5. **Lo que esta spec NO va a arreglar aunque lo destape.** Al comparar el
   documento con el as-built (CA-9) puede aflorar deuda de código (p. ej. un check
   que no está generalizado a los tres adaptadores donde el texto asumía que sí).
   El contrato es **reportar, no arreglar** (CA-10a): saldría como follow-up.
   Aviso para que el gate no espere código.

6. **Residual sin destino que el gate debería colocar**: la observación del
   verificador de SPEC-014 de que el `sdd-arquitecto` de opencode, en el fixture,
   colocó una spec en `docs/specs/` en vez de `docs/epicas/EPIC-…/`. Puede ser
   coste de modelo free (el propio verificador lo atribuye a eso) o una debilidad
   real de la prosa del rol, que es **núcleo** (`core/roles/es/sdd-arquitecto.md`)
   y afectaría a los **tres** harnesses. Está **fuera** de esta spec por RN-02/RN-06
   y por alcance. Si el gate lo cree material, merece su propia spec en EPIC-MEJORA.

7. **Verificación de prosa: cómo se juzga.** No hay test automático para un
   recetario. El precedente exacto es SPEC-003 CA-8/CA-9 ("el documento lista esas
   piezas y pasos y cita ADR-003"). Aquí se sube el listón: cada CA trae su
   **checklist enumerable** y, donde el dato es comprobable, **comparación mecánica
   contra el as-built** (`ls adapters/`, `ls tools/checks/`, `package.json`,
   `tools/check.mjs`). El verificador debe poder decir "faltan 2 de 6 entradas de
   desviación", no "me parece flojo".

8. **Fecha de caducidad reconocida.** Todo lo de opencode describe **1.18.5**
   (ejercido 2026-07-27). opencode evoluciona rápido: la guía lo dice explícitamente
   (CA-8) para que un lector futuro sepa qué re-verificar antes de fiarse. Esto es
   deuda **aceptada**, no evitada.
