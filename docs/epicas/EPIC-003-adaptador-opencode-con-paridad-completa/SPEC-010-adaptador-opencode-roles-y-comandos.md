---
id: SPEC-010
tipo: spec
epica: EPIC-003
estado: en-progreso
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-07-22, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-22, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-07-22, por: sdd-implementador}
---
# SPEC-010 — Adaptador opencode: roles y comandos

## Problema
<!-- Qué duele y a quién. Cita reglas de negocio (RN-xx) de docs/fundacion/reglas.md. -->

SPEC-009 dejó el mapa capacidad→necesidad de opencode confirmado contra la doc real
(estudio durable, GREEN) y **ADR-007** aprobado fija el encaje de las piezas, la
resolución del núcleo y el modelo de orquestación. Pero hoy **no existe** superficie
de opencode: no hay agentes de rol, ni comandos, ni manifiesto, ni build para ese
harness. Un equipo interno de tremen.dev que quiere operar SDD desde opencode
(EPIC-003, CE-2) no puede invocar ningún rol ni comando.

Esta spec construye la **superficie del adaptador opencode** —los agentes de rol y los
comandos por fichero— consumiendo la **misma fuente única de prosa** de `core/roles/`
sin copiarla (RN-06), resolviendo el núcleo por **ruta interna** al artefacto sin
plugin-root (RN-02, ADR-003), y sin que el núcleo gane ni una dependencia hacia
opencode (CE-4 de EPIC-003). Es la segunda pieza del desglose de EPIC-003, después del
estudio (SPEC-009) y **antes** del enforcement en-harness (plugin que deniega) y del
ejercicio del pipeline contra el CLI real, que son specs posteriores y separadas.

Toca **RN-06** (prosa de rol referenciada, no copiada), **RN-02** (dependencia solo
adaptador→núcleo), **RN-11** (description de disparo con fuente canónica única) y
materializa **CE-2** (paridad de roles y comandos) y **CE-4** (coste de adaptador
acotado, núcleo intacto) de EPIC-003.

## Usuarios / roles afectados

- **Equipo interno de tremen.dev que usará opencode** (usuario final de la épica):
  obtiene los roles y comandos SDD operativos en su harness, con la misma disciplina.
- **sdd-implementador**: construye la superficie CA a CA con TDD; parte del mapa de
  SPEC-009 y de la vía preferida que fija ADR-007.
- **sdd-verificador**: verifica paridad y aislamiento a nivel de artefacto construido
  (`dist/opencode/`), como se hizo con el smoke test de Kimi (SPEC-003).
- **sdd-arquitecto / sdd-producto** (dueños del método): la superficie referencia su
  prosa canónica; ningún cuerpo de rol se duplica fuera de `core/`.

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA debe ser verificable con un test. -->

- **CA-1 (agentes de rol con el modo correcto — superficie de roles)**: **Dado** el
  adaptador `adapters/opencode/`, **cuando** se inspecciona `agents/`, **entonces**
  existe un `.md` por rol para los **siete** roles del pipeline —los **cinco** de CE-2
  (`sdd-producto`, `sdd-arquitecto`, `sdd-implementador`, `sdd-verificador`,
  `sdd-documentalista`) **más** `sdd-orquestador` y `sdd-como-vamos`— y su frontmatter
  declara el **modo** que fija ADR-007 (§Decisión punto 4): `sdd-orquestador` con
  `mode: primary`; los otros seis con `mode: subagent`.
  *Cómo se testea:* test del adaptador que lista `dist/opencode/agents/*.md`, comprueba
  que están los siete nombres esperados y afirma el `mode` de cada uno leyendo su
  frontmatter (parseado con el loader mínimo del repo, sin dependencias).

- **CA-2 (cada agente referencia la prosa del núcleo, no la copia — RN-06)**: **Dado**
  cualquier agente de `adapters/opencode/agents/`, **cuando** se revisa su cuerpo,
  **entonces** es un **bootstrap** (leer `.sdd.json`→idioma, `Read` del fichero de rol
  del núcleo por ruta interna, contrato de subagente) que **referencia**
  `core/roles/<idioma>/<rol>.md`, y **no** embebe las secciones del cuerpo del rol
  (`## Misión`, `## Flujo`, `## Reglas duras`). Se adopta la **vía preferida de ADR-007
  §Decisión punto 2** (cuerpo-inline que hace `Read` por ruta interna, simétrico con
  Kimi), no la duplicación del prompt.
  *Cómo se testea:* el check `tools/checks/roles-fuente-unica.mjs`, **generalizado al
  tercer adaptador**, corre sobre opencode y falla si algún agente embebe cuerpo de rol;
  pasa en verde para los siete agentes.

- **CA-3 (comandos por fichero, paridad con Claude Code)**: **Dado** el adaptador,
  **cuando** se inspecciona `commands/`, **entonces** existen `sdd-init.md` y
  `sdd-tablero.md` como slash-commands por fichero (nombre de fichero = nombre del
  comando, S2 del estudio), cuyo cuerpo invoca los scripts del núcleo
  (`core/scripts/tablero.mjs`, plantillas de `core/templates/…`) por **ruta interna** al
  artefacto —no por `${CLAUDE_PLUGIN_ROOT}`— materializando el token neutro `${SDD_ROOT}`
  (ADR-004) como esa ruta interna.
  *Cómo se testea:* test del adaptador que verifica la presencia de
  `dist/opencode/commands/{sdd-init,sdd-tablero}.md` y que su cuerpo referencia el
  script/plantilla del núcleo por ruta interna; el check `referencias` (ver CA-5)
  confirma que ninguna ruta escapa del artefacto.

- **CA-4 (superficie de disparo: skills y descriptions canónicas — RN-11)**: **Dado**
  el adaptador, **cuando** se inspecciona la superficie de disparo (skills `SKILL.md`
  por rol que despachan al subagente vía la tool `task`, sin prefijo de plugin, ADR-007
  §Decisión punto 1), **entonces** la `description` de disparo de cada rol —en agentes y
  skills— **coincide** (tras normalizar) con la forma canónica de
  `core/roles/es/_descripciones.json`, y ninguna se autora divergente.
  *Cómo se testea:* el check `tools/checks/descripcion-fuente-unica.mjs`, generalizado a
  opencode, corre y falla nombrando rol+superficie si alguna description diverge o falta;
  pasa en verde.

- **CA-5 (resolución del núcleo por ruta interna, sin plugin-root — RN-02/ADR-003)**:
  **Dado** el artefacto construido, **cuando** el check `referencias` lo analiza,
  **entonces** ninguna referencia (agentes, comandos, skills, manifiesto) escapa del
  artefacto ni usa `${CLAUDE_PLUGIN_ROOT}` u otro token de otro harness: el núcleo se
  resuelve por ruta interna a `dist/opencode/core/…`, fijada en la instalación (como
  Kimi, ADR-003).
  *Cómo se testea:* el check `tools/checks/referencias.mjs`, **generalizado al tercer
  adaptador**, corre sobre `dist/opencode/` y pasa; un test del adaptador comprueba que
  el bootstrap de un agente y el cuerpo de un comando apuntan a una ruta interna
  existente bajo `core/`.

- **CA-6 (manifiesto `opencode.json` que registra las piezas)**: **Dado** el adaptador,
  **cuando** se inspecciona su manifiesto, **entonces** existe `opencode.json` que
  registra los siete agentes (con su `mode` y sus permisos de herramientas por agente,
  equivalente al `allowed_tools` de Kimi) y declara —estáticamente— qué subagentes puede
  lanzar el orquestador (`permission.task`); su forma es válida y el check `manifiestos`,
  generalizado a opencode, lo acepta. **No** incluye el registro del plugin de
  enforcement (spec posterior).
  *Cómo se testea:* el check `tools/checks/manifiestos.mjs`, generalizado, valida
  `opencode.json` (parseado con el loader mínimo del repo, sin dependencias en núcleo:
  ADR-007 §Decisión punto 5) y falla si falta un agente, un modo o un permiso esperado.

- **CA-7 (build empaqueta `dist/opencode/` autocontenido)**: **Dado** el repo, **cuando**
  se ejecuta el build del adaptador opencode (`tools/build-adapter.mjs opencode`,
  reutilizado sin tocar, y su script npm), **entonces** produce `dist/opencode/`
  autocontenido con el núcleo bajo `dist/opencode/core/`, **determinista e idempotente**
  (dos corridas → árbol idéntico) y **cross-platform** (sin symlinks), y los tests del
  adaptador corren **contra `dist/opencode/`**.
  *Cómo se testea:* test de tools que corre `buildAdapter('opencode')` dos veces y
  compara árboles; la suite `test:adapter` construye y corre los tests de opencode contra
  `dist/`.

- **CA-8 (PARIDAD — superficie completa presente y resolviendo su prosa)**: **Dado** el
  artefacto construido, **cuando** un test de paridad enumera la superficie, **entonces**
  están presentes los **siete agentes de rol** (5 de CE-2 + orquestador + como-vamos) y
  los **dos comandos** (`/sdd-init`, `/sdd-tablero`), y **cada uno resuelve su fuente
  única**: cada agente referencia su `core/roles/es/<rol>.md` y cada comando su script de
  `core/scripts/`, todo por ruta interna existente en el artefacto.
  *Cómo se testea:* test de paridad del adaptador que, sobre `dist/opencode/`, para cada
  rol y comando confirma (a) que el fichero de superficie existe, (b) que la ruta interna
  que referencia existe bajo `dist/opencode/core/`, y (c) que el cuerpo referenciado es el
  del núcleo, no una copia.

- **CA-9 (AISLAMIENTO — el núcleo no gana dependencia hacia opencode)**: **Dado** el diff
  de esta spec, **cuando** se revisa, **entonces** no toca `core/` (salvo, si acaso, datos
  ya canónicos que no introduzcan acoplamiento) ni la máquina de estados; todo lo nuevo
  vive bajo `adapters/opencode/`, la generalización de checks en `tools/`, el script de
  build en `package.json` y `docs/`; y los checks `nucleo-aislado` y `nucleo-agnostico`
  siguen **verdes**, con el núcleo pasando sus tests con `adapters/` y `dist/` ausentes.
  *Cómo se testea:* `tools/checks/nucleo-aislado.mjs` y `nucleo-agnostico.mjs` en verde;
  `npm run test:core` pasa con `adapters/`/`dist/` ausentes; `npm test` verde; inspección
  del diff confirma que `core/` no adquiere referencia a opencode.

## Entidades y reglas afectadas
<!-- Cita RN-xx, ADR-NNN y términos de docs/fundacion/dominio.md. Referencia, no dupliques. -->

- **ADR-007** (Encaje de opencode y su modelo de enforcement, aprobado, inmutable):
  esta spec **consume** su §Decisión —mapeo de piezas (punto 1), resolución del núcleo por
  ruta interna con la **vía preferida** cuerpo-inline+`Read` (punto 2), orquestador
  `mode: primary` y los seis `sdd-*` `mode: subagent` (punto 4), y núcleo intacto /
  loader mínimo para `opencode.json` (punto 5). El estudio de SPEC-009 §7 **de-riesga**
  [H1] (la forma `{file:...}` queda documentada como alternativa). **No se crea ADR
  nuevo**: adoptar la vía preferida es implementar ADR-007, no una decisión nueva.
- **ADR-001 / ADR-002 / ADR-003 / ADR-004**: se **reutilizan** intactos —build que
  empaqueta el núcleo dentro del artefacto (001), enforcement en capas (002, cuyo L1 en
  opencode es spec posterior), resolución por ruta interna sin marketplace ni plugin-root
  (003), y el token neutro `${SDD_ROOT}` que aporta el adaptador (004). Se citan, no se
  redefinen.
- **Guía "añadir un harness"** (`docs/arquitectura.md`, §"Añadir un harness"): fuente de
  la lista cerrada de piezas; su **2ª pasada as-built** con opencode y la medición fina
  de CE-4 son la spec #5 de EPIC-003, no ésta.
- **Estudio durable** (`docs/estudios/opencode-capacidades.md`, SPEC-009): base de toda
  afirmación sobre opencode (agentes S1, comandos S2, skills S3, config/resolución S6);
  no se reinvestiga lo ya confirmado allí (consulta 2026-07-23).
- **Reglas**: **RN-06** (prosa de rol referenciada, única fuente en `core/roles/`),
  **RN-02** (dependencia solo adaptador→núcleo; check `nucleo-aislado`), **RN-11**
  (description de disparo con canónica única en `_descripciones.json`; check
  `descripcion-fuente-unica`), **RN-05** (`dist/` es generado, no se comitea),
  **RN-01/RN-03** (el enforcement duro no depende de este harness; su plugin es spec
  aparte).

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

- **El plugin de enforcement en-harness que DENIEGA** (`tool.execute.before` que `throw`ea
  invocando `require-spec.mjs`, y las reglas `permission` deny de `opencode.json`): es la
  **spec siguiente** de EPIC-003 (enforcement), separada y posterior. Aquí `opencode.json`
  solo registra piezas y permisos base por agente, **no** el gate require-spec dinámico.
- **Ejercer el CLI real de opencode** (evidencia de CE-1) y **verificar en runtime** las
  hipótesis [H1] (resolución del prompt en vivo), [H2] (`throw`-deny), [H4] (despacho
  orquestador-primary→subagentes con `subagent_depth=1` y gates como turnos): es la spec
  del **ejercicio del pipeline** (#4). Esta spec entrega y verifica la superficie a nivel
  de **artefacto construido** (como el smoke test de Kimi, SPEC-003), no contra el CLI.
- **2ª pasada de la guía "añadir un harness"** y medición fina del coste CE-4 as-built:
  spec #5.
- **Reescribir lógica de `core/scripts`, `core/lib` o la máquina de estados**: prohibido
  por la épica; se reutilizan tal cual. Si opencode obligara a tocarlos, es un hallazgo a
  elevar, no alcance.
- **Distribución del artefacto a usuarios finales** (registro remoto, publicar `dist/`):
  sigue [ABIERTO], fuera de EPIC-003. La instalación es por procedimiento sobre
  `dist/opencode/`.
- **Elegir modelo/plan de facturación de opencode**: decisión de uso del equipo.

## Notas para el gate humano
<!-- Lo que quien aprueba necesita saber para decidir. -->

> Esta spec queda en `borrador`; la arquitecta **NO la aprueba** (RN-09). No la acompaña
> ningún ADR nuevo: **ADR-007** (ya aprobado) cubre todas las decisiones de encaje; esta
> spec las implementa. El gate humano aprueba solo la spec.

1. **Reconciliación "cinco roles" vs superficie de siete agentes (mirar con lupa).**
   CE-2 y el desglose de la épica nombran **cinco** roles (producto, arquitecto,
   implementador, verificador, documentalista). Para dar **paridad real** y que el
   pipeline sea operable, la superficie necesita además **`sdd-orquestador`** —que
   ADR-007 §Decisión punto 4 fija como agente **`mode: primary`**, el único que despacha—
   y **`sdd-como-vamos`** (informe read-only), igual que el adaptador Kimi tiene los siete
   agentes. Por eso CA-1/CA-8 exigen **siete** agentes. Si el gate prefiere acotar esta
   spec a los cinco y diferir orquestador+como-vamos, es una decisión suya; mi
   recomendación es entregarlos juntos porque sin el orquestador-primary no hay despacho.

2. **Verificación estática, no contra el CLI (esperado y honesto).** Esta spec se verifica
   a nivel de **artefacto construido** (`dist/opencode/`): presencia, modos, resolución de
   ruta interna y fuente única, replicando el patrón del smoke test de Kimi (SPEC-003, que
   se validó **sin cuenta de Kimi**). La confirmación en **runtime** de que opencode carga
   el prompt por ruta interna ([H1]) y despacha el pipeline ([H4]) es el **ejercicio del
   pipeline** (spec #4). Queda como follow-up **F-SPEC-010-1**: ejercer el adaptador
   instalado contra el CLI real de opencode.

3. **La superficie de disparo (skills) se incluye para paridad — descopable.** Incluyo las
   skills `SKILL.md` por rol (disparo hacia el subagente, sin prefijo de plugin) porque
   CE-2 pide roles "disponibles y operativos" y RN-11 (`descripcion-fuente-unica`) las
   verifica. Si el gate considera que el `@mención`/`task` del orquestador basta como
   invocación y prefiere diferir las skills, CA-4 es la que las cubre y puede recortarse
   sin tocar el resto.

4. **`opencode.json` aquí NO enforcea.** El manifiesto de esta spec registra piezas y
   permisos base (qué herramientas y qué subagentes por agente). El **gate require-spec**
   dinámico (plugin que deniega + reglas `permission` deny) es deliberadamente la **spec de
   enforcement siguiente**. Aprobar ésta no compromete aún cómo se deniega en-harness.

5. **Dependencia del piloto (riesgo heredado de EPIC-003).** El valor pleno de esta
   superficie se realiza cuando un **equipo/proyecto piloto** la ejerce (CE-1). Esta spec
   no lo requiere para cerrarse (se verifica estáticamente), pero conviene que el humano
   confirme que ese piloto sigue en pie antes de invertir en las specs #3–#5.
