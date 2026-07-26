---
id: SPEC-013
tipo: spec
epica: EPIC-001
estado: bloqueada
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-07-25, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-25, por: Alberto Fojo}
  - {estado: bloqueada, fecha: 2026-07-26, por: Alberto Fojo}
---
# SPEC-013 — Cierre CE-2: verificación end-to-end contra el CLI real de Kimi

## Problema
<!-- Qué duele y a quién. Cita reglas de negocio (RN-xx) de docs/fundacion/reglas.md. -->

EPIC-001 (`docs/epicas/EPIC-001-tremen-sdd-multi-harness/_epica.md`) tiene sus 5
specs en `hecho` y **4 de 5 criterios cumplidos**. Queda abierto **solo CE-2**: "un
mismo proyecto SDD se opera de principio a fin (init → épica → spec → implementación
→ verificación) tanto desde Claude Code como desde **Kimi Code** sobre el mismo
núcleo". El lado Claude está probado por dogfooding; **falta el lado Kimi**.

SPEC-003 (`SPEC-003-adaptador-kimi-code.md`) construyó el adaptador Kimi entero
—superficie, build, resolución interna, smoke test de formato— pero **difirió
explícitamente** la ejecución real como follow-up **F-SPEC-003-1**: "operar TODAS las
etapas y TODOS los roles ejecutando el CLI **real** de Kimi" (SPEC-003, "Fuera de
alcance" y "Notas para el gate", punto 7). Su smoke test valida el artefacto **sin
cuenta de Kimi**; nunca cargó el agente raíz ni delegó en un subagente contra el
runtime.

Además, SPEC-003 validó **cuatro asunciones del spike** leyendo el **código fuente**
de kimi-cli, no ejecutándolo; su ledger (`SPEC-003-...ledger.md`, líneas 53–103) las
deja `[ABIERTO]` y añade una **tensión** sin resolver:
- **(a)** los **gates humanos** funcionan como turnos del agente raíz (invoca →
  recibe informe → PARA y pregunta → siguiente `Agent()`);
- **(b)** **tope de anidamiento = 1 nivel**: un subagente `sdd-*` no puede lanzar
  otro (guard `role != "root"` en la tool `Agent`);
- **(c)** **herencia de tools** por `allowed_tools` por rol (el implementador
  escribe; el verificador no toca fuentes);
- **(d)** **tensión CA-11c**: `adapters/kimi-code/agents/sdd-verificador.yaml`
  declara `allowed_tools` **read-only** (Read/Grep/Glob/Bash, sin Write/Edit), pero
  el rol verificador **escribe el ledger de evidencia** — en Kimi real eso podría
  impedírselo. La política de resolución está fijada en **ADR-009** ("no escribe
  FUENTES, sí el ledger").

Esta spec **materializa F-SPEC-003-1 y cierra CE-2**: ejecuta el pipeline completo de
un proyecto **trivial y desechable** desde el **CLI real de Kimi autenticado**,
re-verifica (a)(b)(c)(d) contra el runtime con criterio observable PASA/FALLA, y
comprueba que los **hooks L1 de Kimi deniegan de verdad** con el payload real. No
reescribe la lógica del método (RN-02, EPIC-001): reutiliza el adaptador y el núcleo
tal como los dejó SPEC-003; el único cambio de código admisible es ajustar
`sdd-verificador.yaml` **si (d) sale RED**, conforme a ADR-009 (lazo RED/GREEN).

## Usuarios / roles afectados

- **Mantenedores de tremen-sdd** (humano): obtienen la prueba real de que CE-2
  cumple —Kimi opera el método de punta a punta— y con ella el milestone de cerrar
  EPIC-001. El cierre de la épica a `hecho` es **gate humano** (no lo toca esta spec).
- **sdd-verificador (de Claude Code)**: es quien **ejecuta** la validación (ver
  "Notas para el gate": montaje ya decidido por el humano). Usa **Bash** para invocar
  el **kimi-cli autenticado como SISTEMA BAJO PRUEBA** y recoge el transcript como
  evidencia (el análogo CLI de las capturas Playwright que usa para UI).
- **sdd-implementador**: **solo entra si (d) sale RED** — ajusta
  `adapters/kimi-code/agents/sdd-verificador.yaml` (+ rebuild) según ADR-009, y
  devuelve a re-verificación.
- **El núcleo y los adaptadores existentes**: NO deben romperse; salvo el ajuste
  condicional de (d), no se toca código (RN-02/RN-10).

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA debe ser verificable con un test. -->

> **Convención de evidencia (toda la spec).** La validación la ejecuta el
> `sdd-verificador` de Claude Code en el **Mac de pruebas** (kimi-cli + cuenta Kimi
> autenticada + Claude autenticado), que invoca el **kimi-cli real vía Bash** como
> sistema bajo prueba. La **evidencia canónica de cada CA es el transcript real del
> kimi-cli** (stdout/stderr de la sesión), los **exit codes** y los **artefactos que
> el pipeline-fixture genera** (ficheros de épica/spec/ledger, código y test del caso
> trivial). Todo se archiva bajo `docs/_qa/SPEC-013/`. Un "transcript simulado" o
> "payload simulado" **no** es evidencia suficiente en esta spec (esa era la frontera
> de SPEC-003).

- **CA-1 (instalación reproducible ejecutada de verdad + flags reales del CLI —
  CA-8 de SPEC-003 ejercido contra el runtime)**: **Dado** el artefacto
  `dist/kimi-code/` construido con `npm run build:kimi` (núcleo dentro; `dist/`
  gitignored es normal) y el entorno del Mac de pruebas, **cuando** se sigue el
  **procedimiento de instalación** de `docs/arquitectura.md` §"Procedimiento de
  instalación (Kimi)": (1) build; (2) copiar `dist/kimi-code/skills/` a
  `.agents/skills/` del proyecto-fixture (o `~/.kimi/skills`); (3) cargar el raíz con
  `kimi --agent-file <ruta ABS a dist/kimi-code/agents/sdd-orquestador.yaml>`;
  (4) pegar `dist/kimi-code/hooks/hooks.toml` en `~/.kimi/config.toml` sustituyendo
  `<ARTIFACT_ROOT>` por la ruta ABS a `dist/kimi-code/`, **entonces** el raíz **carga**
  (el orquestador arranca y sus 6 `sdd-*` se resuelven por el mapa `subagents:`) y cada
  paso completa sin error. **Antes de (3)** se verifica el flag contra `kimi --help`
  del runtime **real**: si el CLI difiere de la doc, **manda el CLI** y se anota el
  flag efectivo. **Evidencia**: transcript de los 4 pasos con exit codes; salida de
  `kimi --help` mostrando el flag de carga de agente real; captura de que el raíz
  arranca y lista/resuelve los subagentes. **FALLA** si un paso no completa o el raíz
  no carga; que el flag documentado no exista NO es FALLA sino corrección de doc
  (finding menor con el flag real).

- **CA-2 (pipeline end-to-end trivial completo desde Kimi real — EL cierre de CE-2)**:
  **Dado** el raíz cargado (CA-1) sobre un **proyecto-fixture trivial y desechable**
  (p. ej. "una función que suma"), **cuando** se opera el ciclo completo
  **init → épica → spec → implementación → verificación** desde el kimi-cli, con el
  **raíz delegando** en los subagentes (`Agent(subagent_type: sdd-<rol>)`) que
  instruyen los skills, **entonces** el pipeline **produce los artefactos esperados**:
  proyecto inicializado (`.sdd.json`, estructura `docs/`), una épica y una spec
  `aprobada`, el código de la función suma **con su test en verde**, y el **ledger**
  del verificador con veredicto. **Evidencia**: transcript real de la sesión kimi-cli
  mostrando las delegaciones raíz→subagente en cada etapa; el árbol de artefactos que
  el fixture generó (listado + contenido de épica/spec/ledger/código/test); exit code
  0 de la suite de tests del fixture. **FALLA** si alguna etapa no puede ejecutarse
  desde Kimi o si el raíz no logra delegar en el subagente que le toca. Cierra el hueco
  de CE-2 (`_epica.md`) que SPEC-003 dejó como F-SPEC-003-1.

- **CA-3 (asunción (a): gates humanos como turnos del raíz — re-verificada en
  runtime)**: **Dado** el pipeline de CA-2, **cuando** llega un punto de gate
  (típicamente: aprobación de la spec, y el cierre GREEN/RED de la verificación),
  **entonces** el mecanismo se comporta como **turno del raíz**: el raíz invoca al
  subagente, **recibe su informe**, **PARA y devuelve el control** (pide decisión) y
  **solo tras la respuesta** emite el siguiente `Agent()` — no encadena el pipeline
  saltándose el gate. En este montaje el `sdd-verificador` de Claude actúa como
  **operador de prueba** dando esos gates del fixture desechable y **OBSERVANDO** que
  la pausa/reanudación ocurre. **Evidencia**: transcript donde se ve el patrón
  invoca→informe→PARA→(input)→siguiente `Agent()` en al menos un gate; y que sin la
  respuesta del operador el raíz **no** avanza. **PASA** si el raíz cede el turno en
  el gate; **FALLA** si atraviesa el gate sin pausa. (El único gate humano irreducible
  del proyecto real —cierre de EPIC-001— queda fuera; ver "Fuera de alcance".)

- **CA-4 (asunción (b): anidamiento tope = 1 nivel — re-verificada en runtime)**:
  **Dado** un subagente `sdd-*` en ejecución dentro del pipeline, **cuando** ese
  subagente intenta lanzar **otro** subagente (invocar la tool `Agent` desde un rol
  con `role != "root"`), **entonces** el runtime lo **rechaza** (guard documentado en
  ADR-003 punto 7 / `soul/agent.py`: "Subagents cannot launch other subagents"), de
  modo que la jerarquía queda **plana (1 nivel)**. **Evidencia**: transcript del
  intento y del **error/denegación** del runtime (mensaje o exit no-cero de esa
  tool-call), provocado deliberadamente en la sesión de prueba. **PASA** si el guard
  dispara; **FALLA** si un subagente consigue anidar otro (rompería el modelo de
  ADR-003 → finding al gate, posible follow-up de diseño).

- **CA-5 (asunción (c): herencia de tools por `allowed_tools` — re-verificada en
  runtime)**: **Dado** los `allowed_tools` explícitos por rol de los YAML de Kimi,
  **cuando** se ejercen en runtime, **entonces** (i) el **implementador** puede
  **escribir fuentes** (crea/edita el código del fixture: su `Write`/`Edit` procede) y
  (ii) el **verificador** **no puede escribir fuentes** (un intento suyo de editar
  código/ruta vigilada es **denegado** por su `allowed_tools`). **Evidencia**:
  transcript mostrando el `Write` exitoso del implementador **y** la denegación del
  intento de escritura de fuente por el verificador. **PASA** si ambos lados se
  comportan según su política; **FALLA** si el implementador no puede escribir o el
  verificador sí puede tocar fuentes. (La escritura del **ledger** por el verificador
  es CA-6, no fuente.)

- **CA-6 (tensión (d) CA-11c: el verificador de Kimi escribe su LEDGER — con lazo
  RED→implementador→re-verificación; política en ADR-009)**: **Dado**
  `adapters/kimi-code/agents/sdd-verificador.yaml` con `allowed_tools` read-only tal
  como lo dejó SPEC-003, **cuando** el subagente `sdd-verificador` de Kimi intenta
  **escribir su ledger de evidencia** (`<spec>.ledger.md` del fixture) en runtime,
  **entonces** debe **lograrlo** (ADR-009: "no escribe fuentes, SÍ el ledger").
  - **Si lo logra** (p. ej. porque escribe el ledger vía `Bash`, permitido por su
    `allowed_tools`) → **PASA**; se anota **por qué** el read-only nominal no lo
    bloqueó (mecanismo real observado).
  - **Si NO puede escribir el ledger** → **FALLA** → **finding con destino
    `sdd-implementador`**: ajustar `sdd-verificador.yaml` para permitir la escritura
    **acotada al ledger** conforme a **ADR-009** (Write/Edit limitado a
    `*.ledger.md`/`_qa/`, o el mecanismo que el runtime de Kimi soporte), `npm run
    build:kimi`, y **re-verificar** este CA (RED→GREEN). El cambio pasa por el ciclo
    normal (rama `ft/SPEC-013-...`, RN-01/RN-10).
  **Evidencia**: transcript del intento de escritura del ledger por el verificador de
  Kimi (éxito o denegación con su exit code); si hubo lazo, el diff del YAML ajustado
  + rebuild + transcript de la re-verificación en verde. Este CA **cierra en runtime**
  la tensión que SPEC-003 dejó `[ABIERTO]`.

- **CA-7 (hooks L1 de Kimi deniegan de verdad contra el payload REAL de Kimi)**:
  **Dado** el fragmento `hooks.toml` instalado (CA-1, paso 4) y los entrypoints de
  `adapters/kimi-code/hooks/`, **cuando** se ejercen **con el payload real que emite
  Kimi** (no un payload simulado como en los tests de SPEC-003), **entonces**
  (i) **`require-spec`** **deniega** (deny / exit 2) un intento de editar una ruta
  vigilada **sin** rama `ft/SPEC-NNN` + spec, y **permite** el caso válido; y
  (ii) **`protege-verdad`** **deniega** escribir un documento de verdad / el tablero
  (RN-05/RN-08) donde Kimi aporte identidad, o **degrada fail-open** donde no la aporte
  (comportamiento declarado). **Evidencia**: transcript de la invocación real del hook
  por Kimi con su payload, mostrando el `permissionDecision: "deny"` / exit 2 en el
  caso denegado y el allow en el válido; se distingue explícitamente de los tests de
  payload simulado de SPEC-003. **PASA** si la denegación ocurre con el payload real;
  **FALLA** si el hook no dispara o no deniega contra el payload real de Kimi (posible
  shim de entrada a ajustar → finding al implementador).

## Entidades y reglas afectadas
<!-- Cita RN-xx, ADR-NNN y términos de docs/fundacion/dominio.md. Referencia, no dupliques. -->

- **CE-2** de EPIC-001 (`_epica.md`): el criterio que esta spec **cierra**. El cierre
  de la épica a `hecho` es milestone humano, **no** lo toca esta spec.
- **SPEC-003** y su **ledger**: origen del follow-up **F-SPEC-003-1** (que esta spec
  materializa) y de las cuatro asunciones `[ABIERTO]` + la tensión CA-11c. La
  superficie del adaptador, el build y la resolución interna se **reutilizan** tal
  cual; esta spec **no** los rehace.
- **ADR-003** (empaquetado/resolución y **modelo de orquestación** de Kimi): fija que
  el orquestador **ES el agente raíz** (único que llama a `Agent`), declara los 6
  `sdd-*` en `subagents:`, y deja `[ABIERTO]` precisamente (a)(b)(c) para re-verificar
  en runtime. Esta spec las cierra; **no** modifica el ADR.
- **ADR-009** (política de tools del verificador: "no escribe fuentes, sí el ledger"):
  **origen de CA-6**. Si (d) sale RED, el ajuste de `sdd-verificador.yaml` se hace
  **según ADR-009**. Complementa ADR-003 (punto 7.c) y ADR-006, no los supersede.
- **ADR-006** (anatomía de un gate): sustenta que el verificador **escribe su ledger**
  y cierra `hecho` como trabajo legítimo (no invasión); coherente con CA-3 (gates como
  turnos del raíz) y CA-6.
- **Reglas**: **RN-01/RN-03** (nada sin spec; garantía por git+CI independiente del
  harness — la ejercen los hooks reales de CA-7 y, como garantía dura, L2/L3);
  **RN-06** (fuente única de prosa de roles: el raíz y los subagentes de Kimi la
  **referencian**, intacta); **RN-08/RN-05** (documentos de verdad y tablero
  protegidos — CA-7); **RN-09** (nadie aprueba su propio trabajo — esta spec queda en
  `borrador`; el cierre de épica es del humano); **RN-10** (dogfooding: el ajuste
  condicional de (d) entra por rama `ft/SPEC-013-...`).
- **Lógica reutilizada (no reescrita)**: `adapters/kimi-code/*` (agents YAML, skills,
  hooks shim), `core/lib/require-spec.mjs`, `core/roles/es/*.md`,
  `tools/build-adapter.mjs`, y el procedimiento de instalación de
  `docs/arquitectura.md`. El único código tocable es `sdd-verificador.yaml` **si** (d)
  lo exige (CA-6).

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

- **F-SPEC-003-2** (neutralizar `${CLAUDE_PLUGIN_ROOT}` en la prosa del núcleo
  `core/roles/es/*.md`): en Kimi funciona vía el bootstrap del adaptador (ruta
  relativa interna); neutralizar el token en el núcleo es un **follow-up aparte**
  (ledger de SPEC-003). Fuera de esta spec.
- **Elegir/optimizar el modelo o el plan de Kimi**: es **decisión de uso**, no de la
  herramienta (EPIC-001, "Fuera"). La autenticación del entorno (login de kimi-cli,
  modelo/plan) es **paso humano una vez**, precondición del montaje, no un CA.
- **Distribución a usuarios finales del adaptador Kimi** (sin marketplace): sigue
  `[ABIERTO]` en `contexto.md`, **fuera de EPIC-001** (su propia épica).
- **Cierre de EPIC-001 a `hecho`**: milestone **humano**; esta spec aporta la
  evidencia de CE-2 pero **no** transiciona la épica. El único gate humano irreducible
  del ejercicio es ese cierre; los gates del proyecto-fixture **desechable** los da el
  propio verificador como **operador de prueba** (observando (a), CA-3).
- **Ampliar la superficie del adaptador Kimi** (nuevos roles/skills/hooks) o
  **reescribir lógica** de scripts/máquina de estados/hooks: prohibido por EPIC-001.
  El único cambio admisible es el ajuste condicional de `sdd-verificador.yaml` (CA-6).
- **Trigger-eval / tuning de disparo** de los skills de Kimi.

## Notas para el gate humano
<!-- Lo que quien aprueba necesita saber para decidir. -->

> Esta spec queda en `borrador`; la arquitecta **NO la aprueba** (RN-09). Va
> acompañada del ADR-009 (también en `borrador`). Cierra el **único** criterio abierto
> de EPIC-001 (CE-2); tras su `hecho`, el cierre de la épica es decisión del humano.

1. **Montaje de validación — YA DECIDIDO por el humano (especificado, no reabierto).**
   La ejecuta el **`sdd-verificador` de Claude Code** corriendo en el **Mac** con
   kimi-cli + cuenta Kimi autenticada + Claude autenticado. Ese verificador (juez
   independiente) usa **Bash** para invocar el **kimi-cli autenticado como SISTEMA
   BAJO PRUEBA**. Es deliberado: evita que el verificador **de Kimi** se certifique a
   sí mismo y esquiva la circularidad de CA-11c. La **autenticación** del entorno es
   paso humano una vez.

2. **El verificador de Claude da los gates del fixture como *operador de prueba*.**
   Legítimo porque el proyecto-fixture es **desechable**; lo que se valida es que el
   **mecanismo** de pausa/aprobación se comporta como (a) (CA-3). El único gate humano
   irreducible es el cierre final de EPIC-001, fuera de esta spec.

3. **Lazo condicional de (d) (CA-6).** Si el verificador de Kimi no puede escribir su
   ledger en runtime, la spec **no falla en seco**: entra `sdd-implementador` a ajustar
   `sdd-verificador.yaml` según **ADR-009**, rebuild, y re-verificación (RED→GREEN).
   El ciclo está contemplado; el cambio entra por rama `ft/SPEC-013-...` (RN-01/RN-10).

4. **Riesgo — flags reales de kimi-cli.** El procedimiento asume `--agent-file` y
   `hooks.toml` en `~/.kimi/config.toml` (de `docs/arquitectura.md` y ADR-003, basados
   en la doc oficial de Kimi CLI). CA-1 **verifica el flag contra `kimi --help` del
   runtime real**: si difiere, **manda el CLI** y se registra el flag efectivo (finding
   de doc, no falla la spec). Basar la validación en el runtime real —no en la doc— es
   el punto de F-SPEC-003-1.

5. **Pregunta abierta para el gate — forma del fixture.** ¿El proyecto-fixture
   trivial ("una función que suma") debe ser un **repo nuevo desechable** o un
   **subdirectorio** dentro de un área de pruebas? La spec lo deja como "proyecto
   desechable" y recomienda **repo/carpeta nueva y aislada** (para no confundir el
   dogfooding de tremen-sdd con el fixture, ni disparar los hooks del propio repo sobre
   el fixture). Decisión operativa que el gate puede fijar; no cambia los CA.

6. **No se toca el núcleo ni ADRs aprobados** (RN-02/RN-04). La superficie del
   adaptador Kimi y el build se **reutilizan** intactos; el único código tocable es
   `sdd-verificador.yaml` bajo el lazo de CA-6.

7. **Evidencia = transcript real del kimi-cli** (análogo CLI de las capturas Playwright
   para UI) + exit codes + artefactos del pipeline-fixture, archivados en
   `docs/_qa/SPEC-013/`. Un transcript/payload **simulado** no cuenta: esa era
   justamente la frontera que SPEC-003 dejó pendiente.
