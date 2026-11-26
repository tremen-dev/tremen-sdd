---
id: SPEC-030
tipo: spec
epica: EPIC-008
estado: borrador
aprobada-por:
historial:
  - {estado: borrador, fecha: 2026-11-26, por: sdd-arquitecto}
---
# SPEC-030 — Ficha de CA manual: formato, validación y cierre que la respeta

## Problema

Un CA manual no tiene forma propia en el método: es un CA automático con la palabra
«manual» delante. Ningún script sabe qué CA son manuales, quién los ejecuta, cómo se
comprueban ni si bloquean el cierre. El verificador lo deduce por precedente (entrada 54
de `docs/mejoras-propuestas.md`), y una salvedad aceptada queda en ⚠️ con GREEN sin que
nadie sepa si cuenta (entradas 4, 56 y 68).

Esta spec pone la **base mecánica** del modelo de **ADR-020**, la que necesitan las demás
specs de EPIC-008:
- la marca `[manual]` y la ficha de cada CA (ADR-020 §1, §2);
- un único lector que las entiende;
- `valida.mjs` informando de los errores de ficha y de marcas;
- `estado.mjs` negando el `hecho` a una spec con un CA bloqueante sin cerrar (§5);
- las marcas de Estado del ledger y la regla de la salvedad reformulada (§4), en la
  plantilla y en el rol del verificador.

Todo se activa solo con la marca (§11), así que nada de lo que ya existe cambia
(EPIC-008, CE-7). Es la misma idea de RN-07: el estado cambia por la máquina de estados,
y ella hace cumplir las reglas del gate.

## Usuarios / roles afectados

- **sdd-arquitecto**: escribe la marca y la ficha en las specs con CA manuales.
- **sdd-verificador**: lee `bloquea-hecho` y las marcas, en vez de interpretarlas, y no
  puede cerrar una spec con un CA bloqueante abierto.
- **sdd-implementador**: implementa los CA en `ft/SPEC-030-…`, con TDD.
- **Quien mantiene proyectos con CA manuales** (artica, xana-pensa): gana un formato que
  los scripts entienden, sin migrar nada.

## Criterios de aceptación

Convenciones de los tests:
- Directorios temporales y fixtures, nunca el árbol real (salvo CA-5 (c) y CA-7, que leen
  el repo sin escribirlo).
- «El lector» es el único módulo de `core/lib/` que reconoce CA, marca, ficha y marcas de
  Estado (ADR-020, Consecuencias). `valida.mjs` y `estado.mjs` lo importan; el nombre del
  módulo lo elige el implementador.
- «Una spec del modelo» es una spec con al menos un CA marcado `[manual]` fuera de
  comentarios HTML y bloques de código (ADR-020 §11).
- Las formas del texto (marca, ficha, calificadores) son las de ADR-020 §1, §2 y §4. Esta
  spec no las repite.

### CA-1 — El lector reconoce los CA, la marca y la ficha
- **Given**: una spec de fixture con este cuerpo, en el orden indicado:

  ```
  ### CA-1 — Automático sin ficha
  - **Given**: …

  ### CA-2 [manual] — Recorrido en dispositivo

  - `ejecuta`: orquestador
  - `bloquea-hecho`: sí
  - `precondiciones`: app de la tienda desinstalada
  - `precondiciones`: cuenta con el feature activo
  - `consentimiento`: desinstalar la app del móvil de pruebas
  - `manos`: cambio de IAM en producción
  - `comprobacion` [staging]: GET /recurso con cuenta con el feature → 200; sin él → 403
  - `comprobacion` [produccion]: la misma, contra producción
  - `depende-de`: CA-1
  - **Given**: …
    - `ejecuta`: esto ya no es ficha, es texto del CA

  - **CA-3** [manual]: Dado … cuando … entonces …
    - `ejecuta`: humano
    - `bloquea-hecho`: no
    - `cuando`: tras-merge
    - `comprobacion`: la limpieza programada aparece activa en el panel

  - **CA-4**: Dado … cuando … entonces …
    - `bloquea-hecho`: no
    - `depende-de`: CA-2, CA-3

  ### CA-M5 [manual] — Revisión de idioma
  - `ejecuta`: humano
  - `bloquea-hecho`: si
  - `comprobacion`: la persona revisora firma la lista de cadenas

  <!--
  ### CA-6 [manual] — Ejemplo dentro de un comentario
  -->
  ```
  (el bloque de código es solo de esta spec: en el fixture, su contenido es texto normal,
  y la última parte va dentro de un comentario HTML de verdad).
- **When**: se llama al lector sobre ese texto.
- **Then**: devuelve exactamente cinco CA, en este orden:
  1. `CA-1`: no manual, `bloquea-hecho` sí (por defecto), sin dependencias.
  2. `CA-2`: manual; `ejecuta` orquestador; `bloquea-hecho` sí; dos precondiciones, un
     consentimiento y una de manos, en el orden del texto; dos comprobaciones con
     entornos `staging` y `produccion`; `cuando` es `codigo` (por defecto); depende de
     `CA-1`. La línea `ejecuta` que va después del Given **no** forma parte de la ficha.
  3. `CA-3`: manual, forma de viñeta; `ejecuta` humano; `bloquea-hecho` no; `cuando`
     `tras-merge`; una comprobación sin entorno.
  4. `CA-4`: no manual; `bloquea-hecho` no; depende de `CA-2` y `CA-3`.
  5. `CA-M5`: manual; `bloquea-hecho` sí (escrito `si`).

  El CA-6 del comentario no aparece. Un texto equivalente dentro de un bloque de código
  con tres comillas invertidas tampoco aparece, tampoco cuando el bloque va sangrado
  dentro de una lista, como el de esta misma spec (se prueba aparte). Por eso esta spec,
  SPEC-030, no es una spec del modelo.

### CA-2 — `valida.mjs` informa de los errores de ficha
- **Given**: el CLI de `valida.mjs` sobre un proyecto temporal con una spec del modelo
  por caso:

  | Caso | Contenido del CA | Error esperado |
  |---|---|---|
  | (a) | manual sin `ejecuta` | falta `ejecuta` |
  | (b) | manual sin `bloquea-hecho` | falta `bloquea-hecho` |
  | (c) | manual sin `comprobacion` | falta `comprobacion` |
  | (d) | clave desconocida en la ficha (`ejecutor`) | clave desconocida |
  | (e) | `ejecuta: agente`; `bloquea-hecho: quizá`; `cuando: luego` (tres variantes) | valor fuera de la lista, con los valores admitidos |
  | (f) | `ejecuta` o `comprobacion` en un CA sin marca | clave que solo admite un CA manual |
  | (g) | `ejecuta` dos veces | clave repetida |
  | (h) | `consentimiento` con `ejecuta: verificador` y con `ejecuta: implementador` | el consentimiento lo ejecuta `humano` u `orquestador` |
  | (i) | `cuando: tras-merge` con `bloquea-hecho: sí` | `tras-merge` exige `bloquea-hecho: no` |
  | (j) | dos `comprobacion` sin entorno; dos con el mismo entorno; una con texto vacío | comprobación ambigua, repetida o vacía |
  | (k) | `depende-de` a un CA inexistente; a sí mismo; ciclo `CA-1 → CA-2 → CA-1` | dependencia rota, con los ids |
  | (l) | `CA-M7` sin marca, en una spec del modelo | `CA-M` sin `[manual]` |

  Cada variante se prueba por separado. Además, una spec del modelo con dos errores en dos
  CA distintos.
- **When**: se ejecuta.
- **Then**:
  1. Todos los casos salen con código distinto de 0.
  2. Cada error nombra el fichero, el id del CA y la clave, y dice lo que se esperaba.
  3. En la spec con dos errores aparecen los dos: no se para en el primero.
  4. La fixture de CA-1, como spec completa, da `valida` sin errores.

### CA-3 — `valida.mjs` comprueba las marcas de Estado del ledger
- **Given**: una spec del modelo válida y su ledger, con estas celdas en la columna Estado
  de la matriz:

  | Caso | Celda | Resultado |
  |---|---|---|
  | (a) | `✅`, `⚠️`, `🚧`, `❌`, `n-a`; `⏳` en un CA manual | sin error |
  | (b) | `✅ [desviación]`; `✅ [salvedad: Alberto Fojo, 2026-11-26]`; `✅ [confirmado: Alberto Fojo, 2026-11-26]`; `✅ [desviación] [confirmado: Alberto Fojo, 2026-11-26]` | sin error |
  | (c) | `⏳` en un CA no manual | error |
  | (d) | `✅ [aprobado]` (calificador desconocido) | error |
  | (e) | `⚠️ [desviación]` (calificador en un estado que no es ✅) | error |
  | (f) | `✅ [desviación] [desviación]` | error: calificador repetido |
  | (g) | `✅ [salvedad: sdd-verificador, 2026-11-26]`, `✅ [salvedad: , 2026-11-26]` y `✅ [confirmado: desconocido, 2026-11-26]` | error: no es una persona |
  | (h) | `✅ [salvedad: Alberto Fojo, 26/11/2026]` y `✅ [salvedad: Alberto Fojo]` | error: fecha ausente o no es AAAA-MM-DD |
  | (i) | `✅ ver nota` (texto suelto tras la marca) | error |

  Cada variante se prueba por separado.
- **When**: se ejecuta el CLI de `valida.mjs`.
- **Then**:
  1. Los casos con error salen con código distinto de 0, y el mensaje nombra el ledger, el
     id del CA y la celda.
  2. Los casos sin error salen con código 0.
  3. «Persona» es el mismo predicado que usa `estado.mjs` para firmar `aprobada`
     (ADR-006). Lo verifica un test de código fuente: no hay una segunda definición.
  4. Si la spec del modelo no tiene ledger, `valida.mjs` no da error por eso (la guarda
     de CA-4 sí).

### CA-4 — `estado.mjs` no da `hecho` con un CA bloqueante abierto
- **Given**: una spec del modelo en `en-revision`, aprobada por una persona en su
  historial, y su ledger, en estas combinaciones:

  | Caso | Situación | Resultado de `transition(spec, 'hecho', 'sdd-verificador')` |
  |---|---|---|
  | (a) | todos los CA bloqueantes en `✅` (con o sin calificadores) o `n-a`; un CA manual con `bloquea-hecho: no` en `⏳` y uno automático con `bloquea-hecho: no` en `⚠️` | pasa a `hecho` |
  | (b) | un CA manual bloqueante en `⏳` | se niega |
  | (c) | un CA automático sin ficha (bloquea por defecto) en `⚠️` | se niega |
  | (d) | un CA bloqueante en `🚧` y otro en `❌` | se niega y nombra los dos |
  | (e) | un CA bloqueante en `✅ [salvedad: sdd-verificador, 2026-11-26]` | se niega |
  | (f) | un CA bloqueante de la spec que no tiene fila en la matriz | se niega |
  | (g) | la spec no tiene ledger | se niega |

- **When**: se llama a `transition` y, en (b), también al CLI de `estado.mjs`.
- **Then**:
  1. En (a) la spec queda en `hecho`, con su entrada en el historial, como hoy.
  2. En (b)–(g) lanza un error y el CLI sale con código distinto de 0. El mensaje nombra
     cada CA que bloquea y su Estado (o que falta la fila, o el ledger).
  3. En (b)–(g) el fichero de la spec no cambia: mismo contenido byte a byte.
  4. La comprobación de firmantes y de aprobación humana sigue igual y va antes: una spec
     del modelo con `--por sdd-implementador` se niega por la firma, como hoy.
  5. La guarda solo mira `hecho` de specs. `en-progreso`, `en-revision`, `bloqueada` y el
     `hecho` de una épica no cambian.

### CA-5 — Sin la marca, nada cambia
- **Given**:
  - (a) una spec sin ningún CA `[manual]`, cuyo texto dice «CA manual», «(propietario)»
    y usa un id `CA-M1`, con un ledger que tiene un CA en `⚠️` y otro en `🚧`, en
    `en-revision`;
  - (b) la misma spec con una lista `` - `rutasVigiladas`: … `` justo debajo de un CA;
  - (c) el árbol real del repo.
- **When**:
  1. se ejecuta `valida.mjs` sobre (a), (b) y (c);
  2. se llama a `transition(spec, 'hecho', 'sdd-verificador')` sobre (a).
- **Then**:
  1. `valida.mjs` no da ningún error nuevo en (a) ni en (b), y en (c) sale «OK» como antes
     del cambio.
  2. (a) pasa a `hecho`, como hoy: la guarda de CA-4 no se aplica.
  3. Ningún ledger ni spec del repo se modifica (CE-7: no se migra nada).

### CA-6 — RN-12, la plantilla y el rol del verificador dicen la misma regla
- **Given**: `docs/fundacion/reglas.md` (RN-12),
  `core/templates/es/artefactos/SPEC.md`,
  `core/templates/es/artefactos/SPEC.ledger.md` y `core/roles/es/sdd-verificador.md`
  tras el cambio. RN-12 ya está escrita: la escribió sdd-arquitecto, su dueño (RN-08),
  junto con esta spec. El implementador no la edita.
- **When**: un test los inspecciona y ejecuta `scaffold.mjs spec` en un proyecto temporal.
- **Then**:
  1. La plantilla de spec explica, dentro de un comentario HTML, la marca y la ficha con
     un ejemplo de CA manual, y remite a ADR-020. El test extrae el ejemplo y el lector
     lo acepta sin errores como spec del modelo.
  2. La spec recién creada por `scaffold.mjs` **no** es una spec del modelo: el ejemplo
     del comentario no la activa. `valida.mjs` la da por buena.
  3. La leyenda de la plantilla del ledger lista `⏳` y los tres calificadores de ✅, y
     dice la regla reformulada de ADR-020 §4 citando RN-12: «una salvedad no aceptada
     por una persona nunca es ✅».
  4. El rol del verificador dice esa misma regla, también citando RN-12, y su
     definición de GREEN es la de ADR-020 §5: cada CA que bloquea `hecho` en ✅, con o
     sin calificadores, o en `n-a`.
  5. `docs/fundacion/reglas.md` contiene RN-12 con esa frase, y RN-09 no cambia.
  6. Ni la plantilla del ledger ni el rol conservan la frase antigua («una salvedad se
     marca ⚠️, nunca ✅» / «Salvedad = ⚠️, nunca ✅») ni «⚠️ justificada y aceptada»
     como forma de GREEN.
  7. Los puntos 3 a 6 los comprueba un test que compara tras normalizar acentos,
     mayúsculas y marcas de markdown, como `prosa-gates`. Si alguno de los tres textos
     pierde la frase, el test falla y nombra el fichero.

### CA-7 — Sin regresión
- **Given**: el árbol tras el cambio.
- **When**: se ejecutan `npm test` y `npm run check`, y `node core/scripts/valida.mjs`.
- **Then**:
  1. Los tres pasan en verde.
  2. Los tests que ya existían de `estado`, `valida`, `scaffold` y `frontmatter` pasan
     sin cambiar sus aserciones.
  3. `valida.mjs` y `estado.mjs` usan el lector: un test de código fuente comprueba que
     ninguno de los dos tiene su propio reconocimiento de la marca `[manual]` ni de las
     marcas de Estado.

## Entidades y reglas afectadas

- **ADR-020**: el modelo (§1, §2, §4, §5, §11 en esta spec). Esta spec lo aplica; no lo
  repite.
- **ADR-006**: el predicado de persona, reutilizado para `salvedad` y `confirmado`.
- **ADR-009**: Verif. y Estado siguen siendo solo del verificador. Esta spec no toca
  quién escribe qué columna.
- **RN-07**: la guarda de `hecho` vive en `estado.mjs`, la única vía de transición.
- **RN-12** (nueva, ADR-020 §4): una salvedad no aceptada por una persona nunca es ✅.
  Es coherente con **RN-09**: aceptar una salvedad lo firma una persona.
- **RN-06**: la prosa del verificador se cambia solo en `core/roles/es/`.
- Términos de `docs/fundacion/dominio.md`: spec, CA, ledger, máquina de estados, gate.

## Fuera de alcance

Aparcado a propósito, no por descuido. Va a las siguientes specs de EPIC-008:
- La sección «Evidencia de CA manuales» del ledger, el registro de evidencia sin
  verificador y la ronda acotada con su frontera de diff (ADR-020 §7, §8).
- `registroManuales` y `recetaManuales` en `.sdd.json` (§9).
- El veredicto PARCIAL en el rol del verificador, y los roles del orquestador, del
  implementador y del arquitecto: precondiciones, consentimiento, quién ejecuta (§3, §6).
- «Pendiente del humano tras el merge», `sdd-como-vamos` y el tablero (§10).

Fuera de la épica:
- Validar la ficha en specs sin ningún CA `[manual]` (un `depende-de` en una spec solo
  automática se lee pero no se valida). ADR-020 §11 lo deja así a propósito.
- Migrar ledgers o specs existentes al formato nuevo.
- La paridad gl/ca (SPEC-026): hoy solo hay `es`.
- El bug del historial con comas (SPEC-031, EPIC-FIX): independiente, aunque los dos
  tocan `estado.mjs`.

## Notas para el gate humano

- **Se aprueba junto con ADR-020**, que es quien decide el modelo. Esta spec solo
  materializa la parte mecánica. Lo que más conviene revisar en el ADR:
  - §3: el consentimiento no se pasa a un subagente; lo ejecuta el orquestador en su
    sesión;
  - §4: la regla de la salvedad reformulada y sus tres calificadores;
  - §7: la frontera de la ronda acotada, que es lo que impide un GREEN por la puerta de
    atrás.
- **La guarda de `hecho` es estructural** (CA-4): con esta spec, un verificador ya no
  puede cerrar una spec del modelo con un CA bloqueante en ⚠️, aunque lo justifique. Para
  eso está `✅ [salvedad: <persona>, <fecha>]`, que exige el nombre de quien la aceptó.
- **El cuerpo de la spec pasa a tener una parte que leen los scripts**: la línea del CA y
  su ficha. Fuera de ellas, el texto sigue siendo libre (CA-1: la ficha termina en la
  primera línea que no tiene su forma).
- **Orden respecto a SPEC-026**: esta spec cambia una plantilla y un rol. Si SPEC-026 va
  detrás de EPIC-008, como está previsto, el cambio no se triplica.
