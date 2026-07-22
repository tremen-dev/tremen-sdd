---
id: SPEC-009
tipo: spec
epica: EPIC-003
estado: en-progreso
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-07-23, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-22, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-07-22, por: sdd-implementador}
---
# SPEC-009 — Estudio y mapa de capacidades de opencode

## Problema
<!-- Qué duele y a quién. Cita reglas de negocio (RN-xx) de docs/fundacion/reglas.md. -->

EPIC-003 exige **paridad completa** del adaptador opencode con Claude Code, y su
restricción de método es dura: todo el diseño se basa en **documentación real y
vigente** de opencode, no en conocimiento del modelo (opencode evoluciona rápido).
Antes de construir superficie o enforcement (specs siguientes de la épica) hace falta
un **mapa capacidad→necesidad** durable: qué ofrece opencode (agentes/subagentes,
comandos, skills, plugins/hooks, permisos, config, resolución de rutas) contra lo que
un adaptador necesita (la lista cerrada de piezas de la guía "añadir un harness"), con
cada afirmación **citada con su fuente y fecha** o **marcada como hipótesis** a
verificar contra el CLI. Ese estudio es también la entrada que **confirma ADR-007**
(cómo encaja opencode y si su enforcement en-harness es un gate real o recae en
git+CI).

Sin este estudio, el resto de EPIC-003 se construiría sobre supuestos del modelo,
violando la restricción de método y arriesgando retrabajo. Toca RN-01 (nada se codea
sin spec aprobada: el estudio precede a la construcción), RN-03 (enforcement
independiente del harness: hay que confirmar dónde cae la garantía en opencode) y
CE-4 (medir el coste real contra la guía).

## Usuarios / roles afectados

- **sdd-arquitecto**: autora del mapa y del ADR-007; consumidora al diseñar las specs
  de adaptador y enforcement.
- **Equipo interno de tremen.dev que usará opencode** (usuario final de la épica):
  se beneficia de que el adaptador se diseñe sobre capacidades reales.
- **sdd-implementador / sdd-verificador** de las specs siguientes: parten del mapa y
  de las hipótesis marcadas como lista de verificación contra el CLI.

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA debe ser verificable con un test. -->

- **CA-1 (documento de mapa capacidad→necesidad existe y cubre las piezas)**: Dado el
  trabajo del estudio, **cuando** termina, **entonces** existe un documento
  (`docs/estudios/opencode-capacidades.md` o sección equivalente que ADR-007 enlace)
  con una **tabla capacidad→necesidad** que cubre, una fila por pieza, las **seis
  piezas** de la lista cerrada de un adaptador (agents, commands, skills, plugin/hooks,
  manifiesto/config, tests) más **resolución del núcleo** y **modelo de orquestación**,
  y para cada una: qué mecanismo de opencode la cubre y si hay paridad, degradación o
  hipótesis. Verificable: el documento existe y su tabla contiene esas ocho filas
  identificables.

- **CA-2 (toda afirmación va citada con fuente y fecha, o marcada hipótesis)**: Dado el
  documento, **cuando** se revisa cualquier afirmación sobre agentes/comandos/skills/
  hooks/permisos/config de opencode, **entonces** o bien cita una **fuente** (URL de
  doc oficial/changelog/config real) **con fecha de consulta**, o bien está **marcada
  explícitamente `[HIPÓTESIS]`** con qué la confirmaría contra el CLI. Verificable: no
  hay afirmación de capacidad sin fuente+fecha o sin marca `[HIPÓTESIS]`; las fuentes
  citadas son URLs reales de opencode.

- **CA-3 (decisión de enforcement resuelta y trazada al ADR)**: Dado el estudio,
  **cuando** termina, **entonces** el documento **resuelve** si el enforcement
  en-harness de opencode alcanza la dureza de un gate real (deniega) o recae en git+CI,
  y **remite a ADR-007** como registro de esa decisión; la afirmación central ("`throw`
  en `tool.execute.before` aborta la tool") está citada con fuente+fecha. Verificable:
  el documento contiene la resolución y referencia ADR-007; ADR-007 existe y su decisión
  de enforcement coincide con la del estudio.

- **CA-4 (lista de hipótesis a verificar contra el CLI, accionable)**: Dado el estudio,
  **cuando** termina, **entonces** existe una **lista enumerada de hipótesis**
  ([H1]…[Hn], alineada con las de ADR-007) donde cada una dice **qué asume**, **por qué
  no se pudo confirmar solo con docs**, y **cómo se confirmará contra el CLI real** (el
  comando/flujo concreto). Verificable: la lista existe, cada hipótesis tiene los tres
  campos, y cubre al menos: resolución del prompt de rol por ruta interna, fiabilidad
  del `throw`-deny en `tool.execute.before`, identidad de agente para `protege-verdad`,
  despacho orquestador-primary→subagentes con `subagent_depth=1`, y descubrimiento/
  instalación sin marketplace.

- **CA-5 (mapa contrastado contra la guía "añadir un harness" y los adaptadores
  existentes)**: Dado el estudio, **cuando** termina, **entonces** el documento
  **contrasta** cada pieza opencode contra cómo la resuelven Claude Code y Kimi (según
  `docs/arquitectura.md` §"Añadir un harness" y ADR-003), señalando explícitamente las
  **asimetrías** (p. ej. orquestador primary vs raíz vs skill; commands por fichero SÍ
  en opencode y Claude, NO en Kimi; enforcement L1 deniega en opencode). Verificable: la
  tabla/columnas comparan los tres harnesses en las piezas donde difieren y citan
  ADR-003 y arquitectura.md.

- **CA-6 (no toca núcleo ni código de producto — es estudio + ADR)**: Dado el alcance,
  **cuando** se revisa el diff de esta spec, **entonces** solo añade documentación
  (`docs/…`) y el ADR-007; **no** modifica `core/`, `tools/`, `adapters/` ni la máquina
  de estados, y `npm test` sigue **verde** sin cambios de conteo por esta spec.
  Verificable: el diff toca solo `docs/`; el check `nucleo-aislado` y la suite siguen
  intactos.

## Entidades y reglas afectadas
<!-- Cita RN-xx, ADR-NNN y términos de docs/fundacion/dominio.md. Referencia, no dupliques. -->

- **ADR-007** (Encaje de opencode y su modelo de enforcement): esta spec lo
  **materializa y confirma**; el mapa capacidad→necesidad es su respaldo documental y
  las hipótesis [H1]…[H5] de ADR-007 son las mismas que CA-4 enumera.
- **ADR-001 / ADR-002 / ADR-003**: se **reutilizan** intactos (build, enforcement en
  capas, resolución por ruta interna sin plugin-root); el estudio los cita, no los
  redefine.
- **Guía "añadir un harness"** (`docs/arquitectura.md`): fuente de la **lista cerrada de
  piezas** contra la que se mapea opencode (CA-1, CA-5); su 2ª pasada as-built es
  trabajo de specs posteriores de EPIC-003, no de ésta.
- **Reglas**: **RN-01** (el estudio precede a construir), **RN-03** (dónde cae la
  garantía en opencode), **RN-04** (ADR inmutable), **RN-06** (fuente única de prosa de
  roles: el estudio confirma que opencode la **referencia**, no la copia), **CE-4** de
  EPIC-003 (coste medido contra la guía).
- **Fuentes primarias del estudio (doc oficial opencode, consultadas 2026-07-23)**:
  opencode.ai/docs/agents/, /commands/, /skills/, /plugins/, /permissions/, /config/.

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

- **Construir el adaptador opencode** (agents/commands/skills/plugin, build, checks
  generalizados): es la(s) spec(s) siguiente(s) de EPIC-003. Esta spec solo estudia y
  decide.
- **Ejercer el pipeline real contra el CLI de opencode** (evidencia de CE-1): spec
  posterior. Aquí las hipótesis se **enumeran** para ese ejercicio, no se ejecutan.
- **Confirmar las hipótesis [H1]…[Hn] contra el CLI real**: sale del papel; algunas
  requieren instalación/cuenta y son trabajo de la spec de adaptador/enforcement o del
  ejercicio de pipeline. Esta spec las deja **marcadas y accionables**.
- **2ª pasada de la guía "añadir un harness"** y medición fina del coste CE-4 as-built:
  se hace cuando el adaptador exista, no con el estudio.
- **Elegir modelo/plan de facturación de opencode**: decisión de uso del equipo
  (EPIC-003, fuera).
- **Reescribir lógica de scripts/lib/máquina de estados**: prohibido por la épica.

## Notas para el gate humano
<!-- Lo que quien aprueba necesita saber para decidir. -->

> Esta spec sigue en `borrador`; la arquitecta **NO la aprueba** (RN-09). Va acompañada
> de **ADR-007** (también en `borrador`), que ya recoge la decisión de encaje/
> enforcement basada en la documentación real consultada el 2026-07-23. El gate humano
> aprueba spec y ADR juntos.

1. **La restricción de método ya se honró en el ADR.** ADR-007 cita fuentes oficiales
   de opencode con fecha (2026-07-23) y marca cinco hipótesis [H1]…[H5]. Esta spec
   convierte ese trabajo en un **artefacto durable** (mapa capacidad→necesidad) y en una
   **lista accionable** de hipótesis para las specs siguientes.

2. **Hallazgo que conviene mirar con lupa (afecta a CE-3):** a diferencia de Kimi, el
   enforcement en-harness de opencode **puede denegar de verdad** (un plugin que
   `throw`ea en `tool.execute.before` aborta la tool; fuente: opencode.ai/docs/plugins/,
   2026-07-23). Eso hace CE-3 **más fuerte** que en Kimi, sin renunciar a git+CI como
   garantía. Si el humano prefiere, por prudencia, tratar L1 como *best-effort* hasta
   confirmarlo contra el CLI ([H2]), es una decisión de gate — el diseño no depende de
   ella porque L2/L3 sostienen la garantía igual.

3. **Segundo hallazgo de paridad:** opencode **sí** tiene slash-commands por fichero
   (`.opencode/commands/*.md`), así que `/sdd-init` y `/sdd-tablero` se entregan como en
   Claude Code —paridad que Kimi no alcanzaba. (fuente: opencode.ai/docs/commands/,
   2026-07-23.)

4. **Ubicación del documento (decisión menor a confirmar):** propongo
   `docs/estudios/opencode-capacidades.md` enlazado desde ADR-007, en lugar de dentro de
   la spec, para que el mapa sea consultable sin abrir la spec. Si el gate prefiere
   dentro de `docs/arquitectura.md` o dentro de la propia spec, es trivial reubicarlo.

5. **Pregunta abierta que el humano debe resolver (no la decide la arquitecta):**
   ¿hay un **proyecto/equipo piloto concreto y con fecha** que ejerza opencode? EPIC-003
   marca como riesgo "necesidad interna sin fecha firme": sin un usuario real que corra
   el CLI, CE-1 (pipeline real) y las hipótesis [H2]/[H4] se quedan sin quien las valide.
   Conviene confirmarlo antes de comprometer las specs de ejercicio del pipeline.
