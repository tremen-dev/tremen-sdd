---
id: SPEC-011
tipo: spec
epica: EPIC-003
estado: hecho
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-07-23, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-23, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-07-23, por: sdd-implementador}
  - {estado: en-revision, fecha: 2026-07-23, por: sdd-verificador}
  - {estado: hecho, fecha: 2026-07-23, por: sdd-verificador}
---
# SPEC-011 — Enforcement en-harness de opencode: plugin que deniega

## Problema
<!-- Qué duele y a quién. Cita reglas de negocio (RN-xx) de docs/fundacion/reglas.md. -->

SPEC-010 dejó la **superficie** del adaptador opencode operativa (siete agentes,
comandos, skills, `opencode.json` con permisos base) y verificada estáticamente
contra `dist/opencode/`. Pero, **por diseño explícito de SPEC-010**, ese
`opencode.json` **solo registra piezas y permisos base**: el gate dinámico
`require-spec` —"nada se codea sin spec aprobada" (RN-01)— **no existe todavía en
el flujo de opencode**. Hoy, un agente operando desde opencode puede editar código
bajo rutas vigiladas sin estar en una rama `ft/SPEC-NNN` con spec `aprobada`/
`en-progreso`, y nada **en el harness** lo aborta en el momento de la edición.

ADR-007 (§Decisión punto 3, aprobado e inmutable) ya fijó la respuesta: a
diferencia de Kimi (cuyo L1 es fail-open, solo avisa), en opencode `throw` dentro
de `tool.execute.before` **aborta la tool**, así que el enforcement en-harness (L1)
puede ser un **gate real que DENIEGA**. Esta spec **materializa** esa decisión: un
**plugin** de opencode que, en `tool.execute.before`, invoca la lógica compartida
`core/lib/require-spec.mjs` (RN-03; **fuente única, no reimplementada**) y `throw`ea
para denegar de verdad las escrituras fuera del carril; más el `permission` deny
**declarativo** en `opencode.json` como capa complementaria estática; y la
confirmación de que **L2 (git pre-commit) y L3 (CI)** —independientes del harness
(ADR-002)— cubren opencode igual que a los otros harnesses, de modo que la garantía
se sostiene **aunque el plugin no corra**.

Es la **tercera** pieza del desglose de EPIC-003 (spec #3, "Enforcement desde
opencode"), después del estudio (SPEC-009) y de la superficie (SPEC-010), y
**antes** del ejercicio del pipeline contra el CLI real (spec #4).

Toca **RN-01** (nada se codea sin spec aprobada), **RN-03** (enforcement
independiente del harness, una sola lógica compartida), **RN-02** (dependencia solo
adaptador→núcleo) y **RN-05** (artefactos generados no se editan a mano); materializa
**CE-3** de EPIC-003 (enforcement real, no degradado) y respeta **CE-4** (coste de
adaptador acotado, núcleo intacto).

## Usuarios / roles afectados

- **Equipo interno de tremen.dev que usará opencode** (usuario final de la épica):
  obtiene la MISMA garantía dura "nada sin spec aprobada" que en Claude Code, con el
  gate abortando la escritura en el propio harness (no solo en el commit).
- **sdd-implementador**: construye el plugin y su shim de entrada CA a CA con TDD,
  reutilizando `core/lib/require-spec.mjs` sin duplicarla; generaliza los checks y
  el build al plugin.
- **sdd-verificador**: verifica el "deny real" invocando el hook del plugin con
  payload simulado (sin CLI), el no-duplicado de lógica, el aislamiento del núcleo y
  que L2/L3 cubren opencode; a nivel de **artefacto construido** (como SPEC-010).
- **sdd-arquitecto / sdd-producto** (dueños del método): el enforcement reutiliza su
  fuente única de la regla require-spec; ninguna capa la reimplementa.

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA debe ser verificable con un test. -->

- **CA-1 (DENY REAL — el plugin aborta una escritura fuera del carril)**: **Dado**
  el plugin de enforcement de opencode instalado en un proyecto con rutas vigiladas
  y **sin** una rama `ft/SPEC-NNN` (o con la spec en `borrador`), **cuando** su hook
  `tool.execute.before` se invoca con un payload que simula una tool de escritura
  (`edit`/`write`/`patch`) sobre un fichero bajo ruta vigilada, **entonces** el hook
  **lanza (`throw`)** —abortando la tool— con el mensaje de `require-spec`; y **cuando**
  se invoca (a) sobre una tool de lectura (`read`) en la misma ruta, (b) sobre una
  ruta **no** vigilada, o (c) estando en una rama `ft/SPEC-NNN` con spec `aprobada`/
  `en-progreso`, **entonces** el hook **NO lanza** (la tool procede). El plugin honra
  la válvula `SDD_SKIP_GATE=1` (no lanza) y el flag `gates.requireSpec:false` de
  `.sdd.json`; ante un **error interno inesperado** degrada **fail-open** (no lanza),
  coherente con el modo de fallo de L1 en los otros harnesses (ADR-002 §L1) porque la
  garantía dura vive en L2/L3.
  *Cómo se testea:* test del adaptador que **importa el plugin construido**
  (`dist/opencode/plugins/…`), obtiene su hook `tool.execute.before` y lo **invoca
  directamente** con payloads simulados en formato opencode contra un repo git
  temporal (patrón del test `require-spec` de Kimi, pero afirmando `throw` en vez de
  `permissionDecision`): un caso que **debe** rechazar (`assert.rejects`/`throws`) y
  los casos que **no** deben rechazar. **Sin CLI de opencode** (la confirmación en
  runtime de que el `throw` aborta la tool de verdad es [H2], spec #4 — ver Notas).

- **CA-2 (LA LÓGICA DEL NÚCLEO NO SE DUPLICA — el plugin la importa)**: **Dado** el
  código del plugin de opencode, **cuando** se inspecciona, **entonces** **importa**
  `evaluarRequireSpec` desde `core/lib/require-spec.mjs` (por ruta interna al
  artefacto) y **no** contiene su propio parseo de rama `ft/SPEC-NNN` ni de estados
  codeables (`RAMA_SPEC_RE` / `ESTADOS_CODEABLES` viven **solo** en el módulo
  compartido); el shim de entrada del plugin se limita a **normalizar** el payload de
  opencode (tool + filePath + cwd) al contrato del módulo, como hace `_comun.mjs` en
  Kimi.
  *Cómo se testea:* el test/`invariante` `require-spec-una-logica`, **generalizado**
  para incluir el plugin de opencode entre los consumidores: afirma que el plugin
  `import`a `evaluarRequireSpec` desde `core/lib/require-spec.mjs` y que **no**
  contiene la regex de rama (misma aserción que ya se aplica a los hooks L1 de Claude
  y Kimi y al pre-commit L2).

- **CA-3 (PERMISSION deny declarativo complementario en `opencode.json`)**: **Dado**
  el `opencode.json` del adaptador construido, **cuando** se inspecciona su bloque
  `permission`, **entonces** declara denegación **estática** para los casos
  **siempre inválidos con independencia del carril** —los roles read-only
  (`sdd-verificador`, `sdd-como-vamos`) mantienen `edit: deny` (heredado de SPEC-010)
  y se cierra la escritura sobre artefactos **generados** expresables genéricamente
  (`docs/tablero.md`, `dist/**`; RN-05)— como **complemento** del plugin, **no** su
  sustituto. La denegación **dependiente del carril** sobre `rutasVigiladas` (que
  exige evaluar "¿spec aprobada + rama correcta?") **la aporta el plugin** (dinámico),
  porque `permission` es estática y no puede evaluarla (ADR-007 §Decisión punto 3);
  la aplicación de un overlay `permission` deny/ask por-proyecto sobre las
  `rutasVigiladas` concretas de `.sdd.json` se **documenta** como paso de instalación
  (ver Notas), no se hornea en el manifiesto genérico del adaptador.
  *Cómo se testea:* el check `tools/checks/manifiestos.mjs` generalizado a opencode
  valida el bloque `permission` (read-only roles con `edit: deny`; denegación de los
  generados expresables) y un test del adaptador afirma esas reglas sobre
  `dist/opencode/opencode.json` (parseado con el loader mínimo del repo, sin
  dependencias — ADR-007 §Decisión punto 5).

- **CA-4 (el build empaqueta el plugin en `dist/opencode/`)**: **Dado** el repo,
  **cuando** se ejecuta el build del adaptador opencode
  (`tools/build-adapter.mjs opencode`, **reutilizado sin tocar**), **entonces** el
  plugin y su shim viajan bajo `dist/opencode/plugins/…` en un árbol **autocontenido**
  (el núcleo sigue bajo `dist/opencode/core/`, de modo que el `import` del plugin a
  `core/lib/require-spec.mjs` resuelve por ruta interna), **determinista e idempotente**
  (dos corridas → árbol idéntico) y **cross-platform** (sin symlinks).
  *Cómo se testea:* test de tools que corre `buildAdapter('opencode')` dos veces y
  compara árboles, afirmando la presencia de `dist/opencode/plugins/…`; la suite
  `test:adapter` construye y corre los tests de opencode contra `dist/`.

- **CA-5 (referencias/manifiestos generalizados verdes — el plugin resuelve el
  núcleo internamente)**: **Dado** el artefacto construido, **cuando** corren los
  checks `referencias` y `manifiestos` sobre `dist/opencode/`, **entonces** pasan en
  verde con el plugin presente: el `import` ESM del plugin hacia `core/lib/require-spec.mjs`
  resuelve **dentro** del artefacto (no escapa; no usa `${CLAUDE_PLUGIN_ROOT}` ni otro
  plugin-root), y `manifiestos-opencode` —cuya aserción de SPEC-010 "no debe registrar
  el plugin" se **actualiza**— acepta ahora el estado con enforcement (valida el
  `permission` y la presencia del plugin empaquetado).
  *Cómo se testea:* `tools/checks/referencias.mjs opencode` y
  `tools/checks/manifiestos.mjs opencode` en verde en el runner agregado
  (`npm run check`); el paso general de `referencias` ya valida que todo `import` ESM
  de un `.mjs` del artefacto resuelve interno, cubriendo el plugin sin código nuevo.

- **CA-6 (L2 y L3 cubren opencode igual que a los otros harnesses)**: **Dado** que
  el pre-commit L2 y el CI L3 (ADR-002/SPEC-002) operan sobre **contenido staged y el
  árbol real** —sin ninguna rama de código que dependa del harness—, **cuando** un
  commit toca rutas vigiladas sin rama `ft/SPEC-NNN` + spec válida (venga la edición
  de opencode o de donde sea), **entonces** el pre-commit lo **bloquea** (fail-closed),
  y **cuando** corre el runner agregado / CI, **entonces** incluye los pasos de
  opencode (`build-opencode`, `referencias-opencode`, `manifiestos-opencode`) en
  verde. La garantía "nada se codea sin spec aprobada" **no depende** de que opencode
  ejecute el plugin (RN-01/RN-03/CE-3).
  *Cómo se testea:* el test del pre-commit L2 ya demuestra el bloqueo por
  contenido staged sin conocer el harness (es harness-agnóstico); esta spec **no**
  necesita reescribirlo, solo **afirmar** (test/aserción) que el runner agregado
  (`tools/check.mjs` `PASOS`) contiene los pasos de opencode y que L2/L3 no tienen
  ninguna rama condicionada a "es opencode". Se documenta que L2/L3 son la red que
  sostiene la garantía si el plugin no corre.

- **CA-7 (AISLAMIENTO — el núcleo no gana dependencia hacia opencode)**: **Dado** el
  diff de esta spec, **cuando** se revisa, **entonces** **no** toca `core/` ni la
  máquina de estados; todo lo nuevo vive bajo `adapters/opencode/plugins/`, la
  actualización de checks en `tools/` y `docs/`; y los checks `nucleo-aislado` y
  `nucleo-agnostico` siguen **verdes**, con el núcleo pasando sus tests con
  `adapters/` y `dist/` ausentes.
  *Cómo se testea:* `tools/checks/nucleo-aislado.mjs` y `nucleo-agnostico.mjs` en
  verde; `npm run test:core` pasa con `adapters/`/`dist/` ausentes; `npm test` verde;
  inspección del diff confirma que `core/` no adquiere referencia a opencode (el
  plugin `import`a `core/`, nunca al revés).

## Entidades y reglas afectadas
<!-- Cita RN-xx, ADR-NNN y términos de docs/fundacion/dominio.md. Referencia, no dupliques. -->

- **ADR-007** (Encaje de opencode y su modelo de enforcement, aprobado, inmutable):
  esta spec **materializa** su §Decisión punto 3 (L1 es un gate real: plugin que
  `throw`ea invocando `require-spec.mjs`; `permission` como capa complementaria
  estática) y su §Consecuencias (enforcement no degradado, más fuerte que Kimi). El
  punto de §Negativas *"si se distribuye el plugin como fichero local en
  `.opencode/plugins/` se evita [la dependencia de Bun]; a decidir en la spec de
  enforcement"* **se decide aquí**: el plugin se entrega como **fichero local** en
  `plugins/` (auto-descubierto, S4 del estudio), **sin** dependencia npm/Bun,
  coherente con el repo cero-deps y el artefacto autocontenido. **No se crea ADR
  nuevo**: es implementar ADR-007, no una decisión nueva.
- **ADR-002** (Enforcement en capas L1/L2/L3, aprobado, inmutable): se **reutiliza**
  intacto. El plugin es **L1** para opencode (con el matiz de ADR-007: L1 aquí
  DENIEGA, no solo avisa); **L2** (pre-commit) y **L3** (CI) son la garantía última
  independiente del harness y ya existen (SPEC-002). El modo de fallo del plugin
  —deny ante violación **determinada**, fail-open ante **error interno** + válvula
  `SDD_SKIP_GATE`— sigue el criterio de ADR-002 (§"Modo de fallo") aplicado a un L1
  que puede denegar.
- **ADR-001 / ADR-003 / ADR-004**: intactos —build que empaqueta el núcleo dentro del
  artefacto (001), resolución por **ruta interna** sin plugin-root (003), token neutro
  `${SDD_ROOT}` que aporta el adaptador (004). El plugin resuelve `core/` por ruta
  interna como el resto de la superficie opencode.
- **Estudio durable** (`docs/estudios/opencode-capacidades.md`, SPEC-009): base de
  toda afirmación sobre opencode —plugins/hooks S4 (`tool.execute.before`, `throw`
  aborta, contexto `project`/`directory`/`worktree`/`$`), permisos S5 (`permission`
  allow/ask/deny, patrones, overrides por agente), config S6. La hipótesis **[H2]**
  (fiabilidad del `throw`-deny sobre `edit`/`write` y suficiencia del payload) queda
  **abierta y a ejercer en la spec #4**, no aquí (§5 del estudio; ADR-007 §Asunciones).
- **`core/lib/require-spec.mjs`** (fuente única de la regla require-spec, RN-01/RN-03):
  `evaluarRequireSpec({rama, cwd})` — el plugin la **invoca**; el shim solo normaliza
  el payload. Es el mismo módulo que consumen los hooks L1 de Claude/Kimi y el
  pre-commit L2.
- **Reglas**: **RN-01** (nada se codea sin spec aprobada; el plugin lo deniega en L1,
  git+CI en L2/L3), **RN-03** (enforcement independiente del harness; una sola lógica
  compartida, no reimplementada), **RN-02** (dependencia solo adaptador→núcleo; checks
  `nucleo-aislado`/`referencias`), **RN-05** (`docs/tablero.md` y `dist/` generados: el
  `permission` deny estático cubre lo expresable genéricamente).

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

- **Ejercer el plugin contra el CLI real de opencode** y **confirmar [H2]** (que el
  `throw` en `tool.execute.before` aborta de forma fiable un `edit`/`write` en el
  runtime real y que el payload trae tool+paths suficientes): es la **spec #4**
  (ejercicio del pipeline). Aquí la verificación es **estática + tests** invocando el
  hook del plugin con payload simulado, como el smoke test de Kimi (SPEC-003) y la
  verificación de SPEC-010. Queda como follow-up **F-SPEC-011-1**.
- **`protege-verdad` por identidad de agente en el plugin** ([H3]): el contexto del
  plugin de opencode no documenta un identificador de agente fiable en
  `tool.execute.before`; ese hook **degrada fail-open** y la protección de documentos
  de verdad por rol la sostienen L2/L3 + la revisión humana del PR (como en Kimi,
  ADR-002 §"Alcance de cada regla por capa"; ADR-007 [H3]). El `permission` deny
  estático **sí** cubre los casos siempre-inválidos (tablero/dist generados). La
  protección por identidad en opencode se reevalúa en el piloto (spec #4).
- **Aplicar el overlay `permission` deny/ask por-proyecto sobre las `rutasVigiladas`
  concretas** en cada instalación: se **documenta** el procedimiento; su ejecución
  contra un proyecto real (y confirmar si opencode fusiona un overlay de proyecto,
  parte de [H5]) es del piloto (spec #4).
- **Reescribir lógica de `core/scripts`, `core/lib` o la máquina de estados**:
  prohibido por la épica; se reutilizan tal cual. Si opencode obligara a tocarlos, es
  un hallazgo a elevar, no alcance.
- **Distribución del artefacto a usuarios finales** (publicar `dist/`, registro
  remoto): sigue [ABIERTO], fuera de EPIC-003. La instalación es por procedimiento
  sobre `dist/opencode/`.

## Notas para el gate humano
<!-- Lo que quien aprueba necesita saber para decidir. -->

> Esta spec queda en `borrador`; la arquitecta **NO la aprueba** (RN-09). **No la
> acompaña ningún ADR nuevo**: **ADR-007** (aprobado) ya fija que L1 en opencode es un
> gate real vía plugin que `throw`ea, y **ADR-002** el modelo en capas; esta spec los
> **implementa**. El gate humano aprueba solo la spec.

1. **El "deny real" se verifica invocando el hook, no contra el CLI (esperado y
   honesto).** CA-1 prueba el `throw` **importando el plugin construido y llamando su
   hook** con payloads simulados en formato opencode. Que ese `throw` **aborte la tool
   de verdad** en el runtime de opencode es la hipótesis **[H2]**, que ADR-007 y el
   estudio dejaron marcada y que se ejerce en la **spec #4** (piloto contra el CLI).
   Aprobar esta spec compromete la **forma** del gate (plugin que reutiliza el núcleo
   y lanza), no una confirmación en vivo de [H2].

2. **Mirar con lupa: el `permission` declarativo NO puede denegar "sobre rutas
   vigiladas" de forma estática sin romper el carril legítimo.** El encargo pedía
   `permission` deny sobre `rutasVigiladas`; la realidad de opencode (S5) es que
   `permission` es **estática**: si se denegara `edit` sobre `core/` a secas, se
   bloquearía también al implementador trabajando **dentro** de su rama `ft/SPEC-NNN`
   legítima. Por eso he dividido la responsabilidad (CA-3): el `permission` deny cubre
   lo **siempre inválido** (roles read-only; artefactos generados `docs/tablero.md`,
   `dist/**`), y la denegación **dependiente del carril** la aporta el **plugin**
   (dinámico, lee `.sdd.json.rutasVigiladas` en tiempo de ejecución). Además, el
   `opencode.json` del **adaptador es genérico** y no puede enumerar las
   `rutasVigiladas` de un proyecto concreto: el deny/ask por-proyecto sobre esas rutas
   se **documenta como overlay de instalación**, no se hornea. Si el gate prefiere una
   postura más agresiva (p. ej. `ask` global sobre `core/**` en el manifiesto genérico,
   asumiendo fricción para el implementador), es una decisión suya; mi recomendación es
   la división anterior.

3. **Decisión de empaquetado tomada en esta spec (ADR-007 la delegó): plugin como
   fichero local, sin Bun/npm.** ADR-007 §Negativas dejó "a decidir en la spec de
   enforcement" si el plugin se distribuye como paquete npm (dependería de Bun) o como
   fichero local en `.opencode/plugins/`. Elijo **fichero local** (auto-descubierto,
   S4), coherente con el repo **cero-deps** y el artefacto autocontenido; el build lo
   copia como al resto de la superficie. No juzgo que merezca ADR propio (es
   consecuencia de ADR-001/003 + cero-deps), pero lo señalo por si el gate discrepa.

4. **Modo de fallo del plugin (deny vs fail-open).** El plugin **deniega** (`throw`)
   ante una violación **determinada** de require-spec, pero degrada **fail-open** ante
   un **error interno** (git ausente, payload inesperado) y honra `SDD_SKIP_GATE=1`,
   igual que L1 en los otros harnesses (ADR-002). Esto es deliberado: la garantía dura
   la sostienen L2/L3; un L1 que se cuelga por un bug de herramienta no debe frenar al
   desarrollador. Es la lectura combinada de ADR-002 (L1 fail-open ante error) y
   ADR-007 (L1 deniega ante violación); si el gate quisiera fail-**closed** también en
   el plugin, sería un cambio de política que ADR-002 hoy no respalda.

5. **Actualización menor pero real de un check de SPEC-010.** `manifiestos-opencode`
   afirmaba hoy "el `opencode.json` NO debe registrar el plugin (spec posterior)".
   Esta spec **es** esa spec posterior: el check se **actualiza** para aceptar/validar
   el estado con enforcement. Es evolución esperada del check, no un fallo de SPEC-010.

6. **Dependencia del piloto (riesgo heredado de EPIC-003).** El valor pleno del gate
   real se realiza cuando un **equipo/proyecto piloto** ejerce el CLI (CE-1/[H2]).
   Esta spec no lo requiere para cerrarse (verificación estática + tests), pero
   conviene que el humano confirme que ese piloto sigue en pie antes de invertir en la
   spec #4.
