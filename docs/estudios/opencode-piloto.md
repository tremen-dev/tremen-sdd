# Acta del piloto: pipeline SDD completo contra el CLI real de opencode

> Artefacto durable de **SPEC-014** (EPIC-003, cierre de CE-1) y cierre documental
> de **F-SPEC-009-2**. Hermana del estudio
> [opencode-capacidades.md](./opencode-capacidades.md), cuyo §5 enumera las
> hipótesis [H1]…[H5] con su "cómo se confirma contra el CLI": este acta las
> ejecuta y las resuelve **con evidencia real**. **ADR-007 no se edita** (RN-04);
> ningún veredicto contradice su *forma* (ver §3).

- **CLI**: opencode **1.18.5** (`opencode --version`), instalado vía chocolatey en
  `C:\ProgramData\chocolatey\bin\opencode.exe` (Windows 11).
- **Fecha de ejercicio**: **2026-07-27**.
- **Provider/modelo** (precondición no-normativa, decisión de uso): OpenCode Zen,
  `opencode/deepseek-v4-flash-free` (también como `small_model`).
- **Montaje**: proyecto-fixture trivial y desechable (`fixture-suma`), con repo git
  propio, FUERA del árbol de tremen-sdd; adaptador instalado desde `dist/opencode/`.
  El fixture no se comitea; la evidencia vive en `docs/_qa/SPEC-014/`.
- **Conducción**: `opencode run` (modo no interactivo) con `--agent`, `--command`,
  `-s <sesión>` para continuar turnos y `--format json` como transcript;
  `opencode export <sesión>` para las sesiones hijas de `task`. El operador de los
  gates del fixture es quien conduce las sesiones (legítimo: lo validado es el
  *mecanismo* de pausa/turno).

## 1. Veredicto por hipótesis

### [H1] Resolución del prompt de rol por ruta interna — **CONFIRMADA**

- **Veredicto**: la vía **preferida** de ADR-007 (§Decisión punto 2) — cuerpo del
  agente como bootstrap que hace `Read` de `core/roles/es/<rol>.md` por ruta
  interna al artefacto — **funciona en runtime**, para el primary y para los
  cuatro subagentes ejercidos. La alternativa `prompt: "{file:...}"` **no fue
  necesaria**; queda como vía de respaldo documentada.
- **Evidencia** (`ca2-prompt-rol/`, `ca3-pipeline/ca3-hija-*.json`): el transcript
  del primary muestra `read .sdd.json` → `read .opencode/core/roles/es/sdd-orquestador.md`
  y el agente cita textual la prosa del rol; las sesiones hijas de
  sdd-arquitecto/producto/implementador/verificador muestran cada una el `read`
  de su fichero de rol y comportamiento conforme (el arquitecto scaffoldea y se
  niega a implementar). RN-06 intacta: la prosa vive solo en `core/`.
- **Matiz operativo**: la resolución la hace el LLM (no el harness); con un modelo
  débil a veces busca el fichero fuera del proyecto (glob al directorio padre →
  `external_directory` ask → rechazado en no-interactivo) y necesita una
  indicación del operador. No invalida la vía; es coste de modelo, no de diseño.

### [H2] `throw` en `tool.execute.before` aborta de verdad — **CONFIRMADA**

- **Veredicto**: el `throw` del plugin **aborta la tool** en el CLI real, para
  `write` y `edit`; el payload real basta para decidir require-spec.
- **Evidencia** (`ca5-enforcement/`): en `main` (sin carril), `write src/suma.mjs`
  y `edit src/.gitkeep` terminan `status: "error"` con el mensaje del gate ("La
  rama 'main' no es una rama de spec (ft/SPEC-NNN-slug)…") y el filesystem
  intacto (hash sha1 idéntico; el fichero nuevo no existe). En carril legítimo
  (`ft/SPEC-001…` + spec aprobada/en-progreso) las mismas tools **proceden**
  (así se implementó el caso trivial). Bonus: con la spec en `hecho` (estado
  terminal, no codeable) el plugin también deniega — mensaje "SPEC-001 está en
  estado 'hecho'…".
- **Payload real** (`ca7-sonda-h3-payload.log`): `input = {tool, sessionID,
  callID}`; `output.args = {filePath, oldString, newString…}` — coincide con lo
  que asume el shim `_comun.mjs`.
- **Observación** (no falla del gate): el modelo free a veces **alucina éxito**
  tras el deny ("Creado src/suma.mjs" con la tool abortada). La verdad está en
  el evento de tool y el filesystem; L1 sostiene aunque el modelo misreporte.
- **Orden de evaluación observado**: el hook del plugin dispara **antes** que la
  evaluación de `permission` (un deny/ask estático sobre la misma ruta no llega
  a verse si el plugin lanza primero).

### [H3] Identidad de agente para `protege-verdad` — **MATIZADA** (sonda de conocimiento; el hook NO se codea aquí)

- **Veredicto**: el payload de `tool.execute.before` **no trae un campo directo
  de identidad de agente**, pero **sí `sessionID`**, y el contexto del plugin
  incluye el **`client` (SDK)** — la sesión conoce su `agent` (los exports lo
  muestran: `info.agent: "sdd-verificador"`, etc.), así que la identidad es
  **resoluble indirectamente** (sessionID → sesión → agent).
- **Evidencia**: `ca7-sonda-h3-payload.log` (keys del factory-ctx:
  `client, project, worktree, directory, experimental_workspace, serverUrl, $`;
  keys de input/output) + exports de sesiones hijas con `info.agent`.
- **Consecuencia**: `protege-verdad` por identidad de agente es **viable** como
  spec futura (follow-up F-SPEC-014-2, destino EPIC-003/EPIC-MEJORA); mientras
  no exista, se mantiene la degradación fail-open documentada con garantía en
  L2/L3 (como Kimi).

### [H4] Orquestador-primary, 6 subagentes, gates como turnos, tope de anidamiento — **CONFIRMADA**

- **Veredicto**: el primary despacha los subagentes vía `task` y modela los gates
  como turnos (invoca → recibe informe → **PARA** y devuelve el control → solo
  tras la respuesta del operador emite el siguiente `task`); un subagente **no
  puede** lanzar otro.
- **Evidencia** (`ca3-pipeline/ca3-parent-export.json`, `ca4-gates-turnos/`):
  una única sesión primary con 4+ `task` (arquitecto, producto, implementador,
  verificador) y paradas de gate explícitas entre ellos (aprobación de
  épica/spec pedida al operador y firmada solo tras su input; presentación del
  informe GREEN). Anidamiento provocado: el subagente sdd-arquitecto **no tiene
  la tool `task`** en su set (`permission.task: deny` + `subagent_depth` default
  1) — "Model tried to call unavailable tool" es el modo de fallo observable.
  Jerarquía plana confirmada.
- **Matiz**: en `opencode run` no interactivo el "turno" es la terminación del
  proceso `run`; el operador contesta con `-s <sesión>`. Mismo mecanismo, otra
  superficie.

### [H5] Instalación/descubrimiento sin marketplace — **MATIZADA** (auto-descubrimiento sí, con UNA excepción: plugins `.mjs`)

- **Veredicto**: opencode **auto-descubre** `.opencode/{agents,commands,skills}`
  del proyecto sin registro alguno (la incógnita literal de [H5] queda
  respondida: **no exige config explícita** para esas piezas). **Excepción**: el
  auto-descubrimiento de plugins solo toma `*.ts`/`*.js`; el plugin del
  adaptador es `.mjs` y **no cargaba** → lazo RED→GREEN: el manifiesto registra
  ahora `"plugin": ["./plugins/require-spec.mjs"]` (la vía de registro explícito
  que ADR-007 [H5] ya preveía) y el `.mjs` carga.
- **Evidencia** (`ca1-descubrimiento/`): `agent list` (7 agentes, modos
  correctos), `debug config` (2 comandos, bloque agent, plugin resuelto a
  file:///…/require-spec.mjs), `debug skill` (6 skills), sondas `.js`/`.mjs`
  (marcador del `.js` escrito, el del `.mjs` no; registrado explícitamente, sí).
- **Procedimiento efectivo** (input de la spec #5): copiar `dist/opencode/.` a
  `<proyecto>/.opencode/` **incluida la config**, que queda en
  `.opencode/opencode.json` (opencode la carga como config de proyecto y las
  rutas de `plugin` resuelven relativas a ella). Overlay del proyecto en
  `<proyecto>/opencode.json` (raíz). Detalle completo en
  `docs/_qa/SPEC-014/ca1-descubrimiento/procedimiento-e-hallazgos.md`.

## 2. Hallazgos operativos adicionales (para la spec #5 y la doc de instalación)

1. **`edit: "deny"` en seco RETIRA la tool del agente.** El verificador del
   fixture no pudo usar `edit` ("Model tried to call unavailable tool 'edit'") y
   escribió su ledger esquivando por `bash cat >`. Lazo ADR-009 aplicado al
   adaptador: `permission.edit` granular del verificador (`"*": deny` + allow de
   `docs/epicas/**/*.ledger.md` y `docs/_qa/**`), confirmado en runtime: tool
   disponible, ledger editado con `edit`, fuentes vetadas. `sdd-como-vamos`
   sigue read-only en seco (ADR-009 §5).
2. **Precedencia de permisos (resto de [H5]/S5): el allow plano por-agente PISA
   el deny global por-ruta.** Sonda: sdd-implementador (`edit: "allow"`) editó
   `docs/tablero.md` pese al deny global del generado. Consecuencia: la
   protección estática de generados NO sostiene frente a agentes escritores; la
   garantía real de RN-05 queda en L2/L3 (pre-commit/CI, harness-agnósticos) —
   coherente con ADR-002 ("L1 degrada, no desprotege"). Follow-up
   F-SPEC-014-3: replicar el deny de generados en la permission por-agente de
   los escritores (o documentarlo en la instalación).
3. **Overlay por-proyecto fusiona** (CA-6): la config resuelta une el overlay de
   la raíz (`src/**: ask`, `docs/fundacion/**: ask`) con la instalada
   (`docs/tablero.md`/`dist/**`: deny), y el `ask` dispara: en `opencode run` no
   interactivo un `ask` se **auto-rechaza** ("The user rejected permission…"),
   fichero intacto.
4. **Conducción no interactiva**: `opencode run` con `--agent` acepta un agente
   **primary**; con un subagente cae en silencio al agente por defecto (`build`)
   — hallazgo de runtime; los subagentes se ejercen vía `task` del primary (o
   `@mención`, que en la práctica despachó por la tool `skill`). `--command`
   ejecuta los slash-commands. `--format json` emite eventos por línea
   (tool/text/step) y `opencode export` da la sesión completa (incl. hijas de
   `task` vía `metadata.sessionId`).
5. **Coste/fricción del modelo free** (DeepSeek v4 flash free): varios turnos
   colgados sin salida (reintentados tras matar el proceso; en uno el trabajo
   previo al cuelgue —la firma de la épica— sí se había persistido), una
   respuesta vacía de subagente (reintentada), alucinaciones de éxito tras un
   deny y despistes de ruta (salir del proyecto → `external_directory` ask).
   Ninguno invalida el mecanismo; todos son coste de operación con modelo débil.
6. **Ruido conocido**: el banner ASCII del CLI sale por **stderr** (PowerShell lo
   pinta como error; inocuo). El agente interno `title` usa `small_model`; sin
   método de pago en el workspace Zen falla con `AI_APICallError: No payment
   method` — mitigado fijando `small_model` al modelo free en el overlay.

## 3. Relación con ADR-007 (RN-04: no se edita)

**Ningún veredicto contradice la *forma* fijada por ADR-007.** [H1], [H2] y [H4]
confirman sus tres puntos nucleares (bootstrap-`Read`; plugin que `throw`ea y
deniega; primary/subagents con gates como turnos). [H5] se resuelve por la vía
de registro explícito que el propio ADR preveía. [H3] queda matizada dentro de
la degradación que el ADR ya contemplaba ("si no, fail-open con garantía en
L2/L3"). No procede ADR nuevo; los ajustes fueron de **adaptador** (manifiesto y
permission), no de forma.

## 4. Cierre de CE-1 / CE-3 (medición, para el gate de la épica)

- **CE-1**: el ciclo completo **init → épica → spec → implementación →
  verificación** se operó desde el CLI real de opencode, sin pasar por Claude
  Code ni Kimi: `/sdd-init` inicializó; el primary delegó en producto,
  arquitecto, implementador y verificador; la spec del fixture quedó `aprobada`
  por el operador en el gate (firmada vía `estado.mjs`); `src/suma.mjs` +
  `src/suma.test.mjs` en verde (8/8, exit 0); el **verificador de opencode
  escribió el ledger del fixture** (GREEN) y transicionó la spec a `hecho`;
  tablero regenerado con `/sdd-tablero`. Estado final en
  `docs/_qa/SPEC-014/ca3-pipeline/estado-final-fixture.txt`.
- **CE-3 (medición en vivo)**: intento real de codear sin spec **bloqueado** por
  el plugin (write y edit abortados, ficheros intactos) y el mismo camino
  **permitido** en carril legítimo. L1 deniega de verdad; L2/L3 siguen detrás.
