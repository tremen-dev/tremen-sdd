---
id: SPEC-033
tipo: spec
epica: EPIC-008
estado: borrador
aprobada-por:
historial:
  - {estado: borrador, fecha: 2026-11-26, por: sdd-arquitecto}
---
# SPEC-033 — Roles del orquestador y del verificador en el modelo de CA manual

## Problema

SPEC-030 y SPEC-032 dejaron el mecanismo del modelo de **ADR-020**: la ficha, las marcas,
la guarda de `hecho`, la tabla de evidencia, el script de la ronda acotada y la guarda del
registro externo (**ADR-021**). Ningún rol lo usa todavía. Hoy:

- **El verificador solo conoce GREEN y RED.** Cuando todo pasa salvo un manual que espera
  al humano, no tiene forma de decirlo sin mover el estado. Es la ronda completa «solo para
  decir que faltan los manuales» (entrada 30, EPIC-008 CE-1). ADR-020 §6 define el PARCIAL,
  pero ni el rol ni el ledger lo recogen.
- **El SHA verificado lo pone quien invoca la ronda.** `ronda-acotada.mjs` lo recibe en
  `--desde` y no lo contrasta con nada que haya escrito el verificador. SPEC-032 lo dejó
  así a propósito: leerlo del veredicto exigía un formato que fija esta spec (SPEC-032,
  Fuera de alcance). Pero así quedan dos problemas:
  - **Un hueco.** El ⏳ del PARCIAL sigue en la matriz después de un commit de código
    posterior. Si alguien pasa ese commit como `--desde`, la frontera ya no ve el cambio
    de código.
  - **Una incoherencia.** ADR-020 §6 manda registrar «el commit verificado», es decir, el
    código que se juzgó. Pero en ese commit el ledger aún no tiene el ⏳: lo escribe el
    verificador después. Pasar ese SHA a `--desde` da hoy «no era un PARCIAL».
- **Nadie reúne los manuales ni confirma las precondiciones** antes de lanzar al
  verificador (CE-1, CE-3). Un permiso del humano no llega al subagente (entrada 21,
  ADR-020 §3), y los roles no dicen quién ejecuta qué (entradas 27, 31 y 56).
- **Ningún rol lee `recetaManuales` ni `registroManuales`** (ADR-020 §9, ADR-021), aunque
  ya están en el esquema de `.sdd.json`.

Y tres follow-ups de SPEC-032, con su texto literal en
`SPEC-032-evidencia-de-ca-manuales-y-ronda-acotada.ledger.md`:

- **F-SPEC-032-5**: el lector toma los títulos de sección de la plantilla de cada idioma
  **por posición** («la matriz es la primera sección con tabla y la evidencia la
  segunda»). Una plantilla gl/ca tiene que mantener ese orden y la cabecera de evidencia
  de 7 columnas.
- **F-SPEC-032-7**: `ronda-acotada.mjs` es un sexto CLI del núcleo. Los tests de barrera
  de SPEC-024/SPEC-025 (`cli-sdd-guard`, golden `barrera-es.json`) enumeran cinco.
- **F-SPEC-032-8**: `ronda-acotada.mjs` no pasa `erroresEvidencia` sobre las filas nuevas.
  Una fila nueva con Fecha o Ejecutó mal formados no impide la ronda.

Esta spec materializa ADR-020 §3, §6 y §8 en la prosa de los roles y cierra esos tres
follow-ups. Las guardas que cierran la puerta trasera al GREEN van en los scripts y no en
la prosa (RN-07). La prosa conecta a los roles con esas guardas y un check comprueba que
diga lo que tiene que decir, como en SPEC-006 y SPEC-028.

## Usuarios / roles afectados

- **sdd-verificador**: emite PARCIAL. Registra en el veredicto el commit verificado y hace
  la ronda acotada con el script. Si le toca ejecutar un CA manual, lee la receta y registra
  su evidencia.
- **sdd-orquestador**: reúne los CA manuales que se pueden ejecutar ya y confirma
  precondiciones y consentimiento en su sesión. Registra la evidencia de lo que ejecutó el
  humano. Ante un PARCIAL, consigue lo pendiente y lanza la ronda acotada.
- **sdd-implementador**: con `registroManuales` declarado, registra los CA manuales
  bloqueantes antes de pedir revisión (ADR-021). Ante una precondición sin cumplir o una
  acción destructiva, devuelve el comando exacto (ADR-020 §3). Ver Preguntas abiertas, 2.
- **Quien mantiene un proyecto con CA manuales** (artica, xana-pensa): sus roles leen la
  receta y el registro que declara en `.sdd.json`.

## Criterios de aceptación

Convenciones de los tests:
- Directorios temporales, fixtures, repos git temporales y la fixture de idioma `zz` de
  SPEC-025. Nunca el árbol real, salvo en CA-10, que lo lee sin escribirlo.
- «El lector» es `core/lib/ca-manual.mjs`, el lector único de SPEC-030 y SPEC-032. Todo
  reconocimiento nuevo del ledger vive ahí (marcas de sección, línea de veredicto). Los
  scripts lo importan.
- «Spec del modelo» y «cerrado» (`estadoCierra`) son los de SPEC-030 y SPEC-032. Nada de
  lo que sigue se aplica a las demás specs (ADR-020 §11).
- «Check de prosa» es el estilo de `tools/checks/prosa-gates.mjs` (SPEC-006 CA-6,
  SPEC-028 CA-2): comprueba que el rol nombra los conceptos de una lista y no un wording
  exacto. Normaliza acentos, mayúsculas, marcas markdown y blancos, y lo cablea
  `npm run check`. Cada concepto tiene un test negativo: se borra la frase del rol en una
  copia temporal y el check sale con código distinto de 0 y nombra el rol y el concepto.
- **H** es el commit verificado: el `HEAD` sobre el que el verificador pasó la suite.
  **P** es el commit que añade al ledger el veredicto PARCIAL que nombra H.

### CA-1 — Las secciones del ledger se reconocen por una marca, no por su posición (F-SPEC-032-5)
- **Given**: la plantilla `core/templates/es/artefactos/SPEC.ledger.md` tras el cambio, y
  un árbol temporal con la fixture de idioma `zz`, cuya plantilla de ledger es una de
  estas variantes:
  - (a) los títulos de `es`, traducidos;
  - (b) como (a), con la sección de evidencia **delante** de la de la matriz;
  - (c) como (a), sin la marca de la sección de evidencia;
  - (d) como (a), con la cabecera de evidencia de 6 columnas;
  - (e) como (a), con la marca de la matriz repetida en dos secciones.
- **When**: se llama a `titulosLedger('zz')` y a `leerLedger(…, 'zz')` sobre un ledger
  escrito con esos títulos, se ejecuta el check de forma de las plantillas del ledger
  (CA-1.4) y, en el árbol real, `npm run check`.
- **Then**:
  1. Cada sección del ledger que leen los scripts lleva en la plantilla, justo debajo del
     título, un comentario HTML con una marca que no se traduce:
     `<!-- sdd-seccion: matriz -->`, `<!-- sdd-seccion: evidencia -->` y
     `<!-- sdd-seccion: veredicto -->`. El lector saca el título de cada sección de su
     marca, no del orden de las secciones ni de cuál trae una tabla.
  2. En (a) y (b) el lector devuelve los títulos traducidos de las tres secciones y lee la
     matriz y la evidencia del ledger `zz`. El orden no importa.
  3. En (c) y (e), `titulosLedger` no adivina. Una spec del modelo con ese idioma da el
     error de ledger sin matriz o sin evidencia que ya existe, y la guarda de `hecho` la
     niega (fail-closed, como en SPEC-032 CA-1).
  4. Un check de forma recorre `core/templates/<idioma>/artefactos/SPEC.ledger.md` de
     **cada** idioma que exista (por autodescubrimiento, ADR-011 §1) y exige tres cosas:
     las tres marcas, cada una en una sola sección; la tabla de la matriz con el número de
     columnas de la de `es`; y la cabecera de evidencia con las 7 columnas de ADR-020 §8.
     En (c), (d) y (e) sale con código distinto de 0 y nombra el idioma, la plantilla y la
     marca o tabla que falla. Su mensaje de éxito nombra los idiomas que ha recorrido
     (ADR-011 §6). En el árbol real pasa (hoy solo hay `es`).
  5. Las dos entradas de spec y ledger de `tools/tests/golden/scaffold-es.json` se
     actualizan como en SPEC-030 y SPEC-032 (F-SPEC-030-1). Solo cambia la del ledger, y
     ninguna aserción de `tools/tests/golden-es.test.mjs` cambia.
  6. Los tests de SPEC-032 CA-1 (`ca-manual-secciones`) pasan sin cambiar sus aserciones.

### CA-2 — El veredicto tiene una línea de cabecera que el lector reconoce
- **Given**: el ledger de una spec del modelo con una de estas secciones de veredicto (los
  veredictos se añaden **arriba**: el primero de la sección es el vigente):
  - (a) `` **PARCIAL — 2026-11-27 — sdd-verificador** (`commit 1a2b3c4`) `` y un resumen;
  - (b) como (a), con un GREEN de una ronda acotada encima:
    `` **GREEN — 2026-11-28 — sdd-verificador** (`acotada`, `commit 9f8e7d6`) ``;
  - (c) un PARCIAL sin `` `commit …` ``, o con `` `commit main` ``, o con un SHA de 6 hex;
  - (d) un PARCIAL con la fecha `27/11/2026`, o firmado `Alberto Fojo`;
  - (e) la sección de veredicto vacía;
  - (f) el mismo texto que (c), en el ledger de una spec que **no** es del modelo.
- **When**: se llama a la función del lector que lee el veredicto vigente y se ejecuta el
  CLI de `valida.mjs`.
- **Then**:
  1. La cabecera de un veredicto es una línea que empieza por `**GREEN — `, `**RED — ` o
     `**PARCIAL — `, seguida de la fecha `AAAA-MM-DD`, ` — ` y quien firma, cerrada con
     `**`. Detrás, entre paréntesis, van tokens entre backticks: `` `commit <SHA de 7 a 40
     hex>` `` y, en una ronda acotada, `` `acotada` ``. `GREEN`, `RED`, `PARCIAL`,
     `commit` y `acotada` son identificadores y no se traducen. El resto de la sección es
     prosa libre.
  2. El lector devuelve el veredicto vigente: `{ tipo, fecha, firma, commit, acotada,
     linea }`. En (a) es el PARCIAL con `commit 1a2b3c4`; en (b), el GREEN acotado; en (e),
     ninguno.
  3. En una spec del modelo, `valida.mjs` da error en cada cabecera de PARCIAL sin un
     `` `commit <SHA>` `` válido (c), con fecha mal formada o firmada por quien no es
     `sdd-verificador` (d). El mensaje nombra el ledger, la línea y lo que falta. Sale con
     código distinto de 0.
  4. Las cabeceras GREEN y RED no se exigen con este formato. Un ledger sin cabeceras
     reconocibles no da ningún error nuevo, y (f) tampoco (ADR-020 §11, EPIC-008 CE-7).
  5. El comentario de la sección «Veredicto del verificador» de la plantilla describe el
     formato de 2.1 y dice que los veredictos se añaden arriba.

### CA-3 — La ronda toma el commit verificado del veredicto, no de quien la invoca
- **Given**: un repo git temporal con una spec del modelo en `en-revision` (`CA-1`
  automático, bloqueante; `CA-2` manual, bloqueante) y esta historia: H (código y ledger
  del implementador, `CA-2` en `❌`), luego P (solo el ledger: `CA-1` en `✅`, `CA-2` en
  `⏳` y el veredicto PARCIAL vigente con `` `commit H` ``), y después, según el caso:

  | Caso | Después de P | Invocación | Resultado |
  |---|---|---|---|
  | (a) | un commit con una fila de evidencia de `CA-2` con Commit H | sin `--desde` | admisible; lista `CA-2` con su fila |
  | (b) | lo de (a) | `--desde H` | admisible, igual que (a) |
  | (c) | lo de (a) | `--desde P`, o `--desde` con otro SHA | no admisible: `--desde` no es el commit del PARCIAL vigente |
  | (d) | un commit C que cambia `core/lib/x.mjs`, y luego (a) | sin `--desde`, y con `--desde C` | no admisible: nombra `core/lib/x.mjs` |
  | (e) | lo de (a), pero el veredicto vigente es un RED o un GREEN | sin `--desde` | no admisible: el veredicto vigente no es un PARCIAL |
  | (f) | lo de (a), pero el PARCIAL nombra un SHA que no existe o no es antepasado de `HEAD` | sin `--desde` | no admisible: dice por qué |
  | (g) | lo de (a), pero el veredicto PARCIAL aparece por primera vez en un commit que también cambia `core/lib/x.mjs` | sin `--desde` | no admisible: nombra `core/lib/x.mjs` |
  | (h) | lo de (a), y en el ledger de trabajo la cabecera del PARCIAL dice otro SHA | sin `--desde` | no admisible: el veredicto PARCIAL cambió desde P |

- **When**: se ejecuta `node core/scripts/ronda-acotada.mjs <ruta de la spec>
  [--desde <SHA>]`.
- **Then**:
  1. El script lee H del veredicto PARCIAL vigente del ledger (CA-2) en `HEAD`.
     `--desde` pasa a ser opcional. Si se da, tiene que resolver al mismo commit que H; si
     no, la ronda no es admisible.
  2. La frontera de ADR-020 §7 se calcula desde H (`H..HEAD` más lo no commiteado, como en
     SPEC-032 CA-6.2). El ⏳ escrito después de H no permite mover la base a un commit
     posterior: (d) no es admisible con ninguna invocación.
  3. La matriz y la evidencia de referencia de SPEC-032 CA-7 se leen en P. P es el primer
     commit, desde H hacia `HEAD` siguiendo la historia del ledger, cuyo ledger trae ese
     veredicto PARCIAL con `` `commit H` `` como vigente. Si no hay P, la ronda no es
     admisible.
  4. La cabecera del PARCIAL de P sigue igual en el ledger de trabajo (h). La ronda no
     admite reescribir el veredicto que la justifica.
  5. Los motivos de SPEC-032 CA-6 y CA-7 se mantienen. El script sigue sin escribir nada,
     byte a byte, y solo usa subcomandos de git de lectura (`COMANDOS_GIT`).
  6. Los tests de `core/tests/ronda-acotada.test.mjs` de SPEC-032 pasan sin cambiar sus
     aserciones. Si sus fixtures necesitan el veredicto PARCIAL en el ledger (hoy pasan V
     por `--desde` y no lo llevan), el cambio de fixture se justifica en el ledger contra
     este CA, como en SPEC-032 CA-10.2.

### CA-4 — La ronda acotada valida el formato de las filas de evidencia nuevas (F-SPEC-032-8)
- **Given**: el repo de CA-3 (a), y una fila nueva de evidencia de `CA-2` con uno de los
  defectos de SPEC-032 CA-4 (c) a (j): CA no manual, CA inexistente, entorno que no es de
  ese CA, Ejecutó vacío o `desconocido`, Observado vacío, Commit que no es un SHA, Fecha
  que no es `AAAA-MM-DD`. Y un caso con dos filas nuevas defectuosas.
- **When**: se ejecuta el script de CA-3.
- **Then**:
  1. Cada fila nueva con un defecto hace la ronda no admisible. El motivo nombra el ledger,
     la línea, el CA, la columna y lo esperado, con el mismo texto del catálogo que da
     `valida.mjs` (no hay una segunda redacción).
  2. Con dos filas defectuosas aparecen los dos motivos.
  3. El script obtiene esos errores con `erroresEvidencia` del lector, aplicado a las filas
     nuevas. No reconoce por su cuenta columnas ni formatos (lo comprueba el test de
     fuente única de SPEC-032 CA-10.3, que sigue en verde).
  4. Una fila nueva correcta (CA-3 (a)) sigue siendo admisible.

### CA-5 — `ronda-acotada.mjs` entra en las barreras como sexto CLI del núcleo (F-SPEC-032-7)
- **Given**: un proyecto temporal sin `.sdd.json`, otro con `.sdd.json`, y el árbol `zz`
  de SPEC-025.
- **When**: se ejecutan `core/tests/cli-sdd-guard.test.mjs`,
  `tools/tests/golden-es.test.mjs` y `tools/tests/idioma-emisores.test.mjs`.
- **Then**:
  1. Sin `.sdd.json`, `ronda-acotada.mjs <spec>` sale con código distinto de 0, menciona
     `.sdd.json` en stderr y no crea ningún fichero, como los otros cinco (SPEC-024 CA-6).
  2. Con `.sdd.json`, su salida no es el mensaje de la barrera.
  3. `tools/tests/golden/_casos.mjs` (`ejecutaBarrera`) incluye el caso
     `barrera.ronda-acotada`, y `barrera-es.json` se recaptura con `captura.mjs` desde el
     commit base anotado en el ledger. Solo se añade esa entrada: las cinco que ya había no
     cambian. El caso `zz` (CA-5(i) de SPEC-025) la emite en `es`, idéntica al golden.
  4. Un test lista los `core/scripts/*.mjs` ejecutables (por autodescubrimiento, ADR-011
     §1) y falla si alguno no está cubierto por la barrera de `cli-sdd-guard` y por
     `ejecutaBarrera`. Se comprueba con un control: un séptimo script de prueba en el
     árbol temporal hace fallar el test y lo nombra.
  5. Los títulos y mensajes de esos tests que dicen «cinco» pasan a no depender del número.

### CA-6 — La prosa del verificador: PARCIAL y ronda acotada
- **Given**: `core/roles/es/sdd-verificador.md` tras el cambio.
- **When**: se ejecuta el check de prosa del verificador (nuevo, en
  `tools/checks/prosa-gates.mjs`) y sus tests negativos.
- **Then**: el rol nombra cada uno de estos conceptos, y el check falla si falta alguno:
  1. **Tres veredictos.** GREEN, RED y PARCIAL (ADR-020 §6). PARCIAL: una pasada completa
     sin ningún hallazgo en la que todo cumple la guarda de `hecho` salvo que algún CA
     manual bloqueante sigue en `⏳`. Con un solo hallazgo es RED.
  2. **El PARCIAL no cambia el estado.** No ejecutas `estado.mjs` y la spec sigue en
     `en-revision`.
  3. **El commit verificado va en la cabecera.** En el PARCIAL escribes la cabecera de
     CA-2 con `` `commit <SHA de HEAD verificado>` ``, arriba de la sección. Pones en `⏳`
     los CA manuales pendientes y devuelves al orquestador la lista de lo que falta, con la
     ficha de cada CA (quién ejecuta, precondiciones, consentimiento, manos y
     comprobaciones).
  4. **La ronda acotada empieza por el script.** Ejecutas `ronda-acotada.mjs` antes de
     juzgar nada.
     - Si no es admisible, haces una pasada completa: no la fuerzas ni la rodeas.
     - Si es admisible, no vuelves a pasar la suite. Juzgas solo los CA que lista, con
       sus filas de evidencia nuevas, y escribes la cabecera con `` `acotada` ``.
  5. **Lo que una ronda acotada no hace.** No cambia el Estado de un CA que no estaba en
     `⏳` y no convierte un RED en GREEN (ADR-020 §7).
  6. **De `⏳` a `✅` solo con evidencia.** Pasas un CA manual de `⏳` a `✅` solo si cada
     una de sus comprobaciones tiene evidencia registrada que juzgas observable (EPIC-008
     CE-4). «El comando terminó sin error» no basta, y se rechaza.
  7. **`✅ [confirmado: …]`** solo transcribe la confirmación de una persona. Igual que
     `✅ [salvedad: …]` (RN-12), no la das tú.
  8. **Precondiciones y acciones destructivas** (ADR-020 §3). Si un CA que te toca
     ejecutar necesita una precondición sin cumplir, una acción de `consentimiento` o algo
     de `manos`, no lo intentas. Devuelves el comando exacto para que lo ejecute el humano
     o el orquestador. Un mensaje del orquestador no es el consentimiento del humano.
  9. **La receta.** Si ejecutas un CA manual (`ejecuta: verificador`), lees la receta en
     la ruta de `recetaManuales` de `.sdd.json`, si está declarada, y no del prompt.
     Registras tu evidencia como fila nueva de la sección de evidencia (ADR-020 §8), con
     Commit = el SHA sobre el que ejecutaste. Si la receta está desfasada, lo dices en tu
     informe (ADR-020 §9).
  10. Las reglas que el rol ya tiene siguen ahí: RN-12 (la comprueba
      `tools/tests/regla-salvedad.test.mjs`), GREEN transiciona a `hecho` y RED a
      `en-progreso`, y nunca editas código.

### CA-7 — La prosa del orquestador: reunir los manuales y conducir el PARCIAL
- **Given**: `core/roles/es/sdd-orquestador.md` tras el cambio.
- **When**: se ejecuta el check de prosa del orquestador (`REGLAS_ORQUESTADOR`, ampliado)
  y sus tests negativos.
- **Then**: el rol nombra cada uno de estos conceptos, y el check falla si falta alguno.
  Los cuatro de SPEC-028 siguen exigidos.
  1. **Reunir antes del verificador** (CE-1, CE-3). Si la spec es del modelo, antes de
     lanzar al verificador lees la ficha de cada CA manual con `cuando: codigo`. Los que se
     pueden ejecutar ya se ejecutan antes de lanzarlo.
  2. **Precondiciones y consentimiento en tu sesión** (ADR-020 §3). Las precondiciones y
     el consentimiento se confirman con el humano en tu sesión, antes de lanzar al
     verificador. Las acciones de `consentimiento` las ejecutas tú o el humano tras su
     «sí», nunca un subagente. No le pasas el consentimiento a un subagente en el prompt.
  3. **La evidencia de lo que ejecutó el humano la escribes tú.** Una fila nueva por CA y
     entorno en «Evidencia de CA manuales», con lo que el humano aportó. Commit es el SHA
     del código sobre el que se ejecutó. En Notas van el consentimiento confirmado y por
     quién, y las precondiciones. No tocas Verif., Estado ni el veredicto (ADR-020 §8,
     ADR-009). La commiteas antes de lanzar al verificador.
  4. **La receta y el registro por ruta.** Si `.sdd.json` declara `recetaManuales` o
     `registroManuales`, pasas la ruta en el encargo, no su contenido.
  5. **Ante un PARCIAL**:
     - no transicionas la spec y no lo cuentas como iteración en rojo (el máximo de 3 es
       para RED);
     - consigues la evidencia que falta según la ficha de cada CA en `⏳`, la registras
       (punto 3) y la commiteas;
     - lanzas al verificador para una ronda acotada, con el id de la spec, la rama y el
       commit base. No le pasas el SHA: lo lee del veredicto.
  6. **Si la ronda no es admisible**, el verificador hace una pasada completa. No la
     rodeas (por ejemplo, pasando otro `--desde`).
  7. **CA manual que espera tras el merge.** Un CA manual con `cuando: tras-merge` o
     `bloquea-hecho: no` no impide el GREEN ni el PR. Lo dices en el PR como pendiente del
     humano (su sección estándar es de la spec de pasos tras el merge, ADR-020 §10).

### CA-8 — La prosa del implementador: registro externo y comando exacto
- **Given**: `core/roles/es/sdd-implementador.md` tras el cambio.
- **When**: se ejecuta el check de prosa del implementador (nuevo) y sus tests negativos.
- **Then**: el rol nombra cada uno de estos conceptos, y el check falla si falta alguno:
  1. **Registro antes de la revisión.** Con `registroManuales` declarado, antes de pasar a
     `en-revision` registras en ese fichero cada CA manual bloqueante sin cerrar: una
     línea con el id de la spec y el del CA (ADR-021 §1 y §2). Si `estado.mjs` se niega por
     el registro, no lo rodeas: lo dices en tu informe.
  2. **Comando exacto** (ADR-020 §3). Ante una precondición sin cumplir o una acción
     destructiva, no la intentas. Devuelves el comando exacto.
  3. **Tu evidencia, como fila nueva.** Si un CA manual dice `ejecuta: implementador`, lees
     la receta en la ruta de `recetaManuales` y registras tu evidencia como fila nueva de
     la sección de evidencia. No tocas Verif. ni Estado.

### CA-9 — Las reglas de prosa son de los roles de `es` y el check las encuentra
- **Given**: el árbol tras el cambio.
- **When**: se ejecuta `npm run check`.
- **Then**:
  1. Los checks de prosa de CA-6, CA-7 y CA-8 forman parte de `npm run check` y su
     mensaje de éxito nombra los roles que han mirado (ADR-011 §6).
  2. Miran `core/roles/es/`. No se crean roles en `gl` ni en `ca`. Cuando existan, su
     paridad es de SPEC-026 (EPIC-007), no de esta spec.
  3. `tools/checks/roles-fuente-unica.mjs` y `descripcion-fuente-unica.mjs` siguen en
     verde: los adaptadores reciben la prosa nueva por el build, sin copias a mano.

### CA-10 — Sin regresión
- **Given**: el árbol tras el cambio.
- **When**: se ejecutan `npm test`, `npm run check` y `node core/scripts/valida.mjs`.
- **Then**:
  1. Los tres pasan en verde.
  2. Los tests que ya existían pasan sin cambiar sus aserciones. Los cambios de fixture
     que pidan CA-1, CA-3 o CA-5 se justifican en el ledger, uno a uno, contra el CA que
     los pide.
  3. Ningún ledger ni spec cerrada del repo se modifica. En el árbol real ninguna spec
     cerrada pasa a dar error (CE-7). Ningún veredicto GREEN o RED antiguo tiene que
     seguir el formato de CA-2.

## Entidades y reglas afectadas

- **ADR-020**: §3 (consentimiento y comando exacto), §6 (PARCIAL y commit verificado), §7
  (ronda acotada), §8 (quién escribe la evidencia) y §9 (receta). Esta spec los aplica a
  los roles; no los repite.
- **ADR-021**: la guarda del registro, que el implementador tiene que respetar (CA-8.1).
- **ADR-009**: Verif., Estado y veredicto siguen siendo solo del verificador.
- **ADR-011**: autodescubrimiento en el check de plantillas (CA-1.4) y en el de CLI
  (CA-5.4); los checks nombran lo que han mirado.
- **ADR-015** y **SPEC-024**: barrera de los CLI sin `.sdd.json` (CA-5).
- **ADR-016**, **SPEC-025** y **SPEC-026**: idiomas, fixture `zz` y paridad. Las marcas de
  sección (CA-1) son identificadores que no se traducen.
- **RN-07**: las guardas viven en scripts; la prosa conecta. **RN-09** y **RN-12**: no
  cambian.
- **SPEC-030** y **SPEC-032**: el lector único, el script de la ronda y los follow-ups
  F-SPEC-032-5, -7 y -8, que esta spec cierra.
- Términos de `docs/fundacion/dominio.md`: spec, CA, ledger, veredicto, gate, máquina de
  estados.

## Fuera de alcance

Aparcado a propósito, no por descuido:
- **Pasos tras el merge** (ADR-020 §10): la sección «Pendiente del humano tras el merge»,
  `sdd-como-vamos` y el tablero. Es la cuarta spec del desglose de EPIC-008. CA-7.7 solo
  dice que el orquestador lo menciona en el PR.
- **El contraste con un CA manual real de artica** (CA-1 con Meta) y la medida de CE-1 con
  una spec real. Los decidió el humano para el final de la épica (ADR-020, Consecuencias).
- **Roles en `gl` y `ca`**: no existen. Su paridad es de SPEC-026.
- **La `description` de disparo de los roles** (`_descripciones.json`): sigue diciendo
  «GREEN/RED» para el verificador. Cambiarla toca la fuente única de ADR-005 y no aporta
  a la mecánica.
- **`informe-qa.mjs`**: no pinta el PARCIAL de forma especial.
- **F-SPEC-032-9, -10 y -11** (separador de palabra en el registro, submódulos,
  `assume-unchanged`): siguen en EPIC-MEJORA.
- **F-SPEC-032-6** (CHANGELOG): documentalista / EPIC-MANT.
- Hacer cumplir el PARCIAL desde `estado.mjs`. El PARCIAL no transiciona, así que no hay
  transición que guardar. La guarda de `hecho` (SPEC-030/032) ya impide cerrar con un
  manual bloqueante en `⏳`.

## Notas para el gate humano

Decisiones que tomé y que conviene mirar con lupa:

1. **El SHA del PARCIAL lo lee el script del veredicto (CA-2, CA-3).** Hoy lo pasa quien
   invoca (`--desde`), y eso deja un hueco: el ⏳ sigue en la matriz después de un commit
   de código posterior, y si se pasa ese commit, la frontera no ve el cambio. Además
   ADR-020 §6 habla del commit verificado (H), cuyo ledger aún no tiene el ⏳. La spec
   separa H (base de la frontera) y P (base de la matriz y la evidencia). `--desde` queda
   como comprobación opcional. Las fixtures de SPEC-032 probablemente necesiten el
   veredicto en el ledger (CA-3.6).
2. **Marcas de sección en la plantilla (CA-1)** en vez de posición. La sección del
   veredicto no tiene tabla y no se puede localizar por posición sin repetir el problema
   de F-SPEC-032-5. La alternativa era mantener la posición y añadir solo un test de
   paridad; la descarté por eso.
3. **Formato de la cabecera del veredicto (CA-2.1)**: solo se exige al PARCIAL. GREEN y
   RED pueden seguir el formato, y el token `` `acotada` `` es lo que permitirá contar
   rondas completas para CE-1, pero no se valida en ellos para no romper ledgers antiguos.
4. **F-SPEC-032-8 se cierra en el script, no en la prosa (CA-4).** El follow-up dejaba las
   dos opciones; elegí la mecánica (RN-07).
5. **Un PARCIAL no cuenta como iteración en rojo** (CA-7.5).
6. **El implementador entra en esta spec (CA-8).** El desglose de la épica dice
   «orquestador y verificador», pero su Alcance incluye el implementador, y ADR-021 le
   pide registrar antes de `en-revision`. Ver Preguntas abiertas, 2.

### Preguntas abiertas

1. **¿Basta la spec para la decisión 1, o merece un ADR?** Leer H del veredicto y la
   matriz en P es mi lectura de ADR-020 §6 y §7, y corrige la forma en que SPEC-032
   aplicó §7 (V dado por quien invoca, ledger leído en V). Si el humano lo ve como un
   cambio de la decisión y no como su aplicación, el arquitecto escribe un ADR que
   precise «commit verificado» en §7, como ADR-021 hizo con §9, antes de aprobar esta
   spec.
2. **¿Entra el implementador (CA-8) o va aparte?** Si va aparte, CA-8 sale de aquí y
   ADR-021 se queda sin rol que lo cumpla hasta esa spec.
3. **F-SPEC-032-5 tenía destino SPEC-026.** El humano lo trae aquí, y CA-1 lo resuelve
   cambiando el mecanismo (marcas). SPEC-026 está aprobada y sin empezar. Si se implementa
   antes, su invariante de comentarios y encabezados tiene que respetar las marcas
   `sdd-seccion`. ¿Se avisa en su ledger, o lo coordina el orquestador al despachar?
4. **La plantilla de la ficha** (CE-3) y la sección «Pendiente del humano tras el merge»
   no se tocan aquí. Si el humano quiere que esta spec sea la última de roles, puede
   pedir que CA-7.7 diga más. Lo dejé al mínimo para no invadir la cuarta spec.
