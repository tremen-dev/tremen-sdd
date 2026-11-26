---
id: EPIC-010
tipo: epica
estado: borrador
historial:
  - {estado: borrador, fecha: 2026-11-23, por: sdd-producto}
---
# EPIC-010 — Dueños y artefactos sin drift

## Objetivo
Que **cada fichero y cada acción del método tenga un dueño escrito** y que los
artefactos cerrados no digan cosas falsas. Hoy el orquestador, cuyo rol dice
«no edites documentos», acaba haciendo commit de documentos, editando
`CLAUDE.md`, renumerando y escribiendo traspasos, porque nadie más tiene ese
encargo. Y las specs, los ADR y los ledgers en `hecho` siguen diciendo
«pendiente», «borrador» o «CA-M1 por hacer».

**Por qué**: en `docs/mejoras-propuestas.md` (tremen-sdd 0.5.0) aparecen dos
familias:
- **Dueños**:
  - quién hace commit de qué (6);
  - quién mantiene `CLAUDE.md` y `AGENTS.md`, y los cambios que pide el humano
    fuera de los CA (33, dos veces);
  - el traspaso entre sesiones y el mandato autónomo que hoy vive solo en la
    conversación (5, 17);
  - el merge delegado (59);
  - si se retoma un subagente (7, dos veces);
  - los trailers de commit (45, 60; la 60 se repitió en 9 lanzamientos el
    2026-11-24, entrada 68);
  - commits con rutas explícitas (32). La 68 muestra que `git add <rutas>` no
    basta: `git commit` se llevó un borrado que otro rol había dejado en el
    índice. La regla tiene que ser `git commit -- <rutas>` (o `--only`);
  - las firmas prestadas al enmendar una spec en curso (61): cuatro
    transiciones y una firma de otro rol para dejarla donde estaba.
- **Drift de los artefactos**:
  - «Cómo retomar» queda viejo después del GREEN, 3 veces (25, 39, 58);
  - texto de gate pendiente en specs y ADR aprobados (34);
  - ADR sustituidos o enmendados que siguen afirmando lo contrario (42, 53),
    también cuando lo que enmienda es una spec (64);
  - aprobaciones cuyo texto cambia después (23);
  - hallazgos fuera de alcance sin destino (35), y decisiones nuevas cuya spec
    natural ya está en `hecho` y acaban en una spec de otro tema (63);
  - bloqueos sin motivo visible (3), y specs que pasan a `en-revision` con un
    CA en `skip` o una decisión pendiente del dueño (67).

Comparten la causa: el método define estados, pero no los dueños ni el
contenido que debe cambiar con cada transición.

**Por qué en "Después"**: cuesta menos que EPIC-008 y casi todo es prosa, pero
el impacto por incidente es menor. Va detrás de EPIC-008 porque varias reglas
de dueño (quién ejecuta un CA manual, quién registra la evidencia) las fija
ella.

## Criterios de éxito
- **CE-1 — Matriz de dueños.** Un único sitio dice, para cada tipo de fichero y
  de acción, qué rol lo hace. Los tipos son: commit de documentos, tablero,
  `CLAUDE.md`/`AGENTS.md`, traspaso, mandato, merge delegado, cambios pedidos
  fuera de los CA y retomar subagentes. Los roles no se contradicen con esa
  matriz, y un check lo vigila.
- **CE-2 — El orquestador deja de editar documentos que no son suyos.** En una
  sesión real de varias specs, todos los commits de documentos los hace su
  dueño según la matriz. Se demuestra con el log.
- **CE-3 — Traspaso y mandato sobreviven a la sesión.** El orquestador tiene un
  fichero o sección de traspaso propio, con un bloque de mandato: fecha,
  alcance y reglas de parada. Lo consulta antes de cada acción hacia fuera
  (push, PR, merge delegado).
- **CE-4 — Un artefacto en `hecho` o `aprobada` no lleva texto de estado
  anterior.** `valida.mjs` avisa en estos casos:
  - campos de plantilla vacíos;
  - «Cómo retomar» que no cuadra con la matriz;
  - palabras de gate pendiente («pendiente», «borrador», «hay que aprobar») en
    artefactos ya aprobados o cerrados.
- **CE-5 — Sustituir o enmendar un ADR deja rastro en los dos lados.** Un ADR
  que sustituye o enmienda parte de otro lo declara en el frontmatter, y
  `valida.mjs` exige la nota recíproca en el afectado. El tablero lo muestra.
  Una spec también puede enmendar un detalle de un ADR, nunca la decisión: el
  campo admite specs, y el rol del arquitecto dice cuándo basta con eso (64).
- **CE-6 — Lo que queda fuera de una spec tiene destino.** Los hallazgos fuera
  de alcance y los motivos de bloqueo tienen campo o sección estándar, y
  `sdd-como-vamos` los lista mientras no tengan spec. Una decisión cuya spec
  natural ya está en `hecho` va por una regla escrita (la siguiente spec sin
  empezar del mismo ámbito o, si no la hay, una spec de remate), y la spec que
  la recibe declara de qué hallazgo viene (63). Una spec no pasa a
  `en-revision` con tests en `skip` que citan un CA ni con una decisión del
  dueño sin resolver: se queda en `en-progreso` con su motivo de bloqueo (67).
- **CE-7 — Lo aprobado es lo que se aprobó.** Si el humano aprueba con
  respuestas que cambian la spec, el texto final se rehace antes de registrar
  `aprobada`, y queda en la nota. Si el cuerpo cambia después de aprobado, el
  cambio se detecta. Enmendar una spec en curso es una sola transición
  registrada, con quién la aprobó, que devuelve la spec a su estado anterior,
  sin pasos intermedios ni firmas prestadas (61).

## Alcance
- Dentro (las entradas de `docs/mejoras-propuestas.md` que cubre):
  - 6, 32 y 33: dueños de commit y de `CLAUDE.md`.
  - 5, 17 y 59: traspaso, mandato y merge delegado.
  - 7: retomar subagentes.
  - 45 y 60: trailers.
  - 25, 58 y 34: drift de spec, ledger y ADR.
  - 42, 53 y 64: sustitución y enmienda de ADR, también desde una spec.
  - 23 y 61: aprobación con respuestas y enmienda de una spec en curso.
  - 35 y 63: hallazgos fuera de alcance y decisiones sin spec natural abierta.
  - 3 y 67: motivo de bloqueo y entrega con un CA pendiente del dueño.
  - Las recurrencias de la 68 que caen aquí (32 y 60).
- Fuera (aparcado a propósito, no por descuido):
  - **Quién ejecuta un CA manual y quién registra su evidencia**: es de
    EPIC-008.
  - **Integración con `main` tras el GREEN**: es de EPIC-009.
  - **Escalera de implementación mínima** (12, ponytail): aparcada hasta hacer
    el experimento que propone la propia entrada.
  - **Crear en `.env` las claves de `.env.example`** (9): es preferencia de un
    proyecto, no del método.
  - **Peso o `firmeza` de las decisiones de la spec** (65) y **sitio para el
    dictamen de un rol de dominio** (66): aparcados en el roadmap, un solo caso
    cada uno.

## Specs
<!-- El estado por spec vive en el frontmatter de cada spec; el tablero agregado se regenera con /sdd-tablero (docs/tablero.md). No mantengas listas de specs a mano aquí. -->
Desglose orientativo (lo decide sdd-arquitecto):
1. Matriz de dueños, con su ADR, y ajuste de los roles (CE-1, CE-2).
2. Traspaso y mandato del orquestador (CE-3).
3. Avisos de drift en `valida.mjs` (CE-4, CE-6).
4. Sustitución y enmienda de ADR, también desde una spec (CE-5).
5. Aprobación sobre el texto final y enmienda en curso en una sola transición
   (CE-7). Probablemente toque `estado.mjs` y las firmas de `FIRMANTES`.

## Riesgos
- **Retomar al verificador** (7): la entrada original pide prohibirlo, pero la
  39 lo hizo y fue bien. Es una decisión que tiene que tomar el humano en el
  gate, no darla por hecha.
- **Falsos positivos en `valida.mjs`.** Una palabra como «pendiente» puede
  aparecer con razón en un artefacto cerrado. Hipótesis a validar: avisar, no
  fallar.
- **El mandato es outward-facing.** Un mandato escrito mal amplía lo que un
  agente puede hacer sin el humano delante. Tiene que tener fecha de caducidad y
  alcance cerrado.
