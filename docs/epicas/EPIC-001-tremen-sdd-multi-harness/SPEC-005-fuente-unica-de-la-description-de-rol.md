---
id: SPEC-005
tipo: spec
epica: EPIC-001
estado: en-revision
aprobada-por:
historial:
  - {estado: borrador, fecha: 2026-07-21, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-21, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-07-21, por: sdd-implementador}
  - {estado: en-revision, fecha: 2026-07-21, por: sdd-implementador}
---
# SPEC-005 — Fuente unica de la description de rol

## Problema
<!-- Qué duele y a quién. Cita reglas de negocio (RN-xx) de docs/fundacion/reglas.md. -->

EPIC-001 promete (CE-3) que **cada rol tiene UNA fuente de prosa** y los adaptadores la
**consumen, no la copian**. RN-06 lo garantiza para el **cuerpo** del system prompt
(referenciado vía `Read`, fuente física única). Pero la **`description` de disparo** de
cada rol —la prosa "qué hace y cuándo invocarlo", con sus frases-gatillo— **no** tiene esa
garantía: está **autorada y duplicada** en cuatro superficies de adaptador:

1. **Claude agents** — `adapters/claude-code/agents/sdd-*.md`, frontmatter `description:`
   (4: arquitecto, implementador, verificador, documentalista).
2. **Claude skills** — `adapters/claude-code/skills/sdd-*/SKILL.md`, frontmatter
   `description:` (7, incluidos orquestador, producto, como-vamos).
3. **Kimi skills** — `adapters/kimi-code/skills/sdd-*/SKILL.md`, frontmatter `description:`
   (6).
4. **Kimi mapa `subagents:`** — `adapters/kimi-code/agents/sdd-orquestador.yaml`, un
   `description:` por rol (6 blurbs de una línea).

El harness lee ese campo **LITERAL** para decidir el disparo; a diferencia del cuerpo, **no
puede** referenciar un fichero. Resultado: **el drift ya ocurre**. Para `sdd-arquitecto`,
el Claude skill/agent llevan la forma larga completa; el **Kimi skill está parafraseado y
más corto** (cae "(stack, datos, fronteras)" y la frase-gatillo "record this decision as an
ADR"); y el **Kimi subagents-map** es un tercer texto de una línea. **Tres redacciones**
del mismo disparo conviviendo, y **ningún check lo caza**: `manifiestos` valida que el mapa
`subagents:` **tenga** description, no que **coincida**; `roles-fuente-unica` vigila el
**cuerpo**, no la description.

Es el follow-up **F-SPEC-001-1**: CE-3 aplicado a la description, no solo al cuerpo. Toca
**RN-06** (fuente única de prosa de rol; aquí de otra naturaleza, ver Notas) y su decisión
la fija **ADR-005**.

## Usuarios / roles afectados

- **Mantenedores de tremen-sdd** (humano): ganan una fuente canónica de la description por
  rol y un check que impide que las cuatro superficies diverjan; dejan de arrastrar el
  drift Claude↔Kimi ya presente.
- **sdd-implementador**: crea el manifiesto canónico del núcleo
  (`core/roles/es/_descripciones.json`), **alinea** las descriptions ya autoradas de ambos
  adaptadores a su forma canónica, añade el check `descripcion-fuente-unica` + su test y lo
  cablea en `tools/check.mjs`. No reescribe lógica de scripts ni toca el build (RN-02,
  ADR-001/004).
- **sdd-verificador**: valida que exista canónica por rol, que el check **caza** cualquier
  divergencia (fixture contaminado → RED) y **pasa** con el árbol alineado (GREEN), que
  ambos adaptadores (agents+skills Claude, subagents+skills Kimi) quedan cubiertos, y la
  no-regresión (`npm test` verde en ambos + CI; `estado.mjs` no agravado).
- **Los dos adaptadores (Claude Code y Kimi Code)**: sus descriptions pasan a estar
  ancladas a la canónica del núcleo; deben seguir disparando cada rol tras el cambio.

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA debe ser verificable con un test. -->

- **CA-1 (fuente canónica por rol en el núcleo — CE-3)**: Dado el núcleo, **cuando** se
  buscan las descriptions de disparo, **entonces** existe un **manifiesto canónico**
  `core/roles/es/_descripciones.json` que declara, para **cada uno de los 6 roles**
  (`sdd-producto`, `sdd-arquitecto`, `sdd-implementador`, `sdd-verificador`,
  `sdd-documentalista`, `sdd-como-vamos`), al menos una forma **`larga`** (superficie de
  disparo agent/skill) y una forma **`corta`** (blurb de una frase para el mapa
  `subagents:`); el **cuerpo** del rol (`core/roles/es/<rol>.md`) permanece **intacto**
  (RN-06). Verificable: el fichero existe y parsea; contiene `larga` y `corta` no vacías
  para los 6 roles; el `git diff` no toca `core/roles/es/<rol>.md`.

- **CA-2 (toda description de adaptador coincide con su forma canónica — cierre del drift)**:
  Dado el mapeo superficie→forma —Claude agents `description:`→`larga`; Claude skills
  `description:`→`larga`; Kimi skills `description:`→`larga`; Kimi mapa `subagents:`
  `description:`→`corta`—, **cuando** se compara cada description autorada con su forma
  canónica (normalizando el plegado YAML: `>` colapsa saltos a espacios, se comparan
  espacios normalizados), **entonces** **todas coinciden**. En particular, las tres
  redacciones divergentes de `sdd-arquitecto` (Kimi skill parafraseado, Kimi subagents-map
  one-liner) quedan alineadas. Verificable: tras el cambio, para cada rol y superficie la
  description normalizada es **igual** a la forma canónica mapeada; conteo de divergencias
  = **0** (hoy ≥ 3 solo en `sdd-arquitecto`).

- **CA-3 (un check de invariante caza la divergencia en CI — cierre de la clase)**: Dado un
  check nuevo `tools/checks/descripcion-fuente-unica.mjs`, **cuando** corre sobre el árbol,
  **entonces** (a) **PASA** con el árbol alineado; (b) **FALLA**, nombrando rol + superficie
  + forma esperada, si **cualquier** description de adaptador diverge de su canónica o falta
  (fixture sintético con una description alterada); (c) cubre las **cuatro** superficies de
  **ambos** adaptadores (Claude agents+skills, Kimi skills + mapa `subagents:`); (d) está
  **cableado** en el runner `tools/check.mjs` (→ pre-commit L2 y CI L3) y tiene su test en
  `tools/tests/`; (e) arranca vía `core/lib/entrypoint.mjs` (CLI cross-platform, lección
  SPEC-002). Verificable: test del check con fixture alineado (pasa) y contaminado (falla y
  el mensaje nombra rol+superficie); el paso aparece en `PASOS` de `tools/check.mjs`.

- **CA-4 (cobertura completa de superficies y roles — ambos adaptadores)**: Dado el conjunto
  real de superficies, **cuando** el check enumera lo que valida, **entonces** cubre: los
  **agents** Claude con `description:` (arquitecto, implementador, verificador,
  documentalista), los **7 skills** Claude, los **6 skills** Kimi y los **6** `description:`
  del mapa `subagents:` del raíz Kimi; ninguna superficie con `description:` de disparo
  queda fuera del check. Verificable: el test enumera las superficies esperadas y falla si
  el check omite alguna (p. ej. si se añade un skill sin canónica, el check lo reporta como
  no cubierto).

- **CA-5 (el núcleo sigue agnóstico y verbatim — CE-1, ADR-001/004)**: Dado el manifiesto
  nuevo bajo `core/`, **cuando** corre `nucleo-agnostico`, **entonces** **PASA** (las
  descriptions no contienen ningún token de harness `${...}`; solo prosa y frases-gatillo);
  y **cuando** corre el build, **entonces** `core/` (incluido `_descripciones.json`) viaja
  **verbatim** a `dist/<harness>/core/` y `tools/build-adapter.mjs` **no** inyecta ni
  transforma descriptions. Verificable: `node tools/checks/nucleo-agnostico.mjs` verde con
  el manifiesto presente; el `git diff` no toca `tools/build-adapter.mjs`;
  `dist/<harness>/core/roles/es/_descripciones.json` es byte-idéntico al de `core/`.

- **CA-7 (RN-11 existe y el check la hace cumplir — regla de negocio)**: Dado
  `docs/fundacion/reglas.md`, **cuando** se busca la regla que gobierna la fuente única de
  la description, **entonces** existe **RN-11** —"la `description` de disparo de cada rol
  tiene una fuente canónica única en `core/roles/es/_descripciones.json` (larga+corta); las
  copias de la superficie de cada adaptador (agents/skills de Claude; skills y mapa
  `subagents:` de Kimi) deben COINCIDIR con la canónica"—, y su línea "Verificable" **cita**
  `tools/checks/descripcion-fuente-unica.mjs` como el mecanismo que la hace cumplir. El check
  de CA-3 es precisamente el enforcement de RN-11. Verificable: `reglas.md` contiene una RN
  numerada `RN-11` con ese contenido y esa cita; el check nombrado en RN-11 es el mismo que
  cablea `tools/check.mjs`.

- **CA-6 (no regresión: `npm test` verde en ambos, CI incluido; `estado.mjs` no agravado)**:
  Dado el conjunto de cambios, **cuando** se ejecuta `npm test` (build claude + kimi → los
  checks de invariantes de **ambos** adaptadores → `valida`), **entonces** la suite queda
  **verde** con conteo **≥** el previo más el/los test(s) del check nuevo; pasan
  `nucleo-aislado`, `nucleo-agnostico`, `roles-fuente-unica`, `referencias` (claude y kimi),
  `manifiestos` (claude y kimi) y el nuevo `descripcion-fuente-unica`; `core/scripts/estado.mjs`
  queda **intacto** y la regresión conocida de specs migradas **no se agrava**. Verificable:
  `npm test` verde en local y CI; el `git diff` no toca `core/scripts/estado.mjs`; el runner
  `tools/check.mjs` incluye el paso nuevo.

## Entidades y reglas afectadas
<!-- Cita RN-xx, ADR-NNN y términos de docs/fundacion/dominio.md. Referencia, no dupliques. -->

- **ADR-005** (Fuente única de la description de rol: canónica en core + check, sin
  generación en build): esta spec lo **materializa**. La canónica en el núcleo, el mapeo
  superficie→forma (`larga`/`corta`), el "build verbatim sin generación" y el check nuevo
  vienen de ahí; no se redefinen aquí. **La decisión binaria generar-vs-check la resolvió el
  gate (2026-07-21): autorar + check**, con la canónica en `core/roles/es/_descripciones.json`
  (JSON aparte). Esta spec ya refleja esa decisión.
- **ADR-001** (build/empaquetado) y **ADR-004** (núcleo agnóstico, resolución vía bootstrap):
  **intactos**. El build sigue copiando el núcleo **verbatim**; no se añade generación ni
  transformación de superficie (RN-04).
- **Reglas**: **RN-11** (la regla que esta spec **materializa**: fuente canónica única de la
  description de rol; el check `descripcion-fuente-unica` la hace cumplir; decidida en el gate
  y ya escrita en `reglas.md` por sdd-arquitecto, dueño del documento). **RN-06** (fuente única
  de la prosa de rol —RN-11 la extiende a la description, de naturaleza "canónica + verificada"
  porque el campo se lee literal y no puede referenciarse), **RN-02** (no se reescribe lógica
  del núcleo ni se resuelve hacia fuera de `core/`), **RN-04** (ningún ADR aprobado se
  modifica), **RN-10** (dogfooding: toca el propio estándar).
- **Criterios de éxito de EPIC-001**: **CE-3** (una sola fuente de prosa de rol; ahora
  también la description) y **CE-1** (núcleo agnóstico: el manifiesto no nombra harness).
- **Lógica reutilizada (no reescrita)**: `core/scripts/*`, `core/lib/*` y
  `tools/build-adapter.mjs` no cambian; el trabajo es un manifiesto de datos, alinear texto
  ya autorado, y un check + test.

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

- **Generar las descriptions (codegen en autoría o inyección en build)**: descartado por
  ADR-005 y **confirmado por el gate (2026-07-21): autorar + check**. El build no genera ni
  transforma descriptions.
- **Reescribir lógica** de scripts, máquina de estados o build: prohibido (RN-02,
  ADR-001/004). Solo manifiesto + alineación de texto + check.
- **Tocar el cuerpo de los roles** (`core/roles/es/<rol>.md`): no se toca; RN-06 intacto.
- **Multi-idioma**: sigue solo `es`; el manifiesto es `core/roles/es/_descripciones.json`.
- **Unificar el wording de los `commands/` de Claude** (`sdd-init`, `sdd-tablero`): sus
  `description:` no son disparos de rol; fuera de alcance.
- **La regresión conocida de `estado.mjs`**: abierta a propósito; esta spec solo garantiza
  **no agravarla**.

## Notas para el gate humano
<!-- Lo que quien aprueba necesita saber para decidir. -->

> Esta spec sigue en `borrador`; la arquitecta NO la aprueba (RN-09). Va acompañada de
> **ADR-005** (también en `borrador`). No hay decisión de **producto** pendiente: es
> higiene técnica de fuente única. **Las tres decisiones de diseño ya se resolvieron en el
> gate (2026-07-21)** y están incorporadas; se documentan aquí como historia, no como
> preguntas abiertas.

1. **Mecanismo — RESUELTO: autorar + check.** El harness lee la `description` **literal**: no
   puede referenciar un fichero como sí hace el cuerpo, así que fuente física única solo se
   lograría **generando** las copias. El gate eligió **canónica + copias autoradas
   verificadas por check** (no generar): no toca el build (ADR-001/004 fijaron build
   tonto/verbatim; ADR-004 rechazó transformar en build), a cambio de que un cambio de wording
   toque el manifiesto **y** las copias (el check obliga a no olvidar). Alternativa descartada:
   generar desde la canónica (un solo sitio de edición, pero hace la superficie del adaptador
   generada o el build transformador, invirtiendo una decisión reciente).

2. **Ubicación de la canónica — RESUELTO: JSON aparte** `core/roles/es/_descripciones.json`
   (larga+corta), machine-readable y separado de la prosa. Descartada la alternativa de
   frontmatter en `core/roles/es/<rol>.md` (mezcla metadatos con el contrato de prosa).

3. **El drift ya es real, no hipotético.** `sdd-arquitecto` tiene hoy **tres** redacciones
   del mismo disparo (Claude larga; Kimi skill parafraseado más corto; Kimi subagents-map
   one-liner). El check nace **en RED** hasta que el implementador las alinee — ese es el
   objetivo.

4. **RN-11 — RESUELTO EN EL GATE (2026-07-21): añadida.** La garantía de la description es de
   **otra naturaleza** que RN-06 (canónica + verificada, no física única). El gate confirmó
   codificarla como **RN-11** en `reglas.md`, ya escrita por sdd-arquitecto (dueño del
   documento, RN-08). El check `descripcion-fuente-unica` (CA-3) es su enforcement; CA-7 exige
   su existencia y la cita.

5. **Rutas vigiladas (dogfooding, RN-10).** El cambio toca: `core/roles/es/_descripciones.json`
   (**no vigilado**), las descriptions en `adapters/claude-code/agents|skills/` y
   `adapters/kimi-code/agents|skills/` (**no vigilado**; los hooks del adaptador **no** se
   tocan) y un check en `tools/` (**no vigilado**). Ninguna ruta vigilada
   (`core/scripts/`, `core/lib/`, `adapters/claude-code/hooks/`) se toca; `estado.mjs`
   intacto.
