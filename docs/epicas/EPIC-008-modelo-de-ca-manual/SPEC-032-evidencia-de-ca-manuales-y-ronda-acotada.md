---
id: SPEC-032
tipo: spec
epica: EPIC-008
estado: aprobada
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-11-26, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-11-26, por: Alberto Fojo}
---
# SPEC-032 — Evidencia de CA manuales y ronda acotada

## Problema

SPEC-030 dejó la base mecánica del modelo de **ADR-020**: la marca `[manual]`, la ficha,
las marcas de Estado y la guarda de `hecho`. Falta lo que abarata los manuales, que es
el motivo de la épica (EPIC-008, CE-1 y CE-2):

- **No hay dónde registrar la evidencia de un CA manual** sin tocar el veredicto. Hoy se
  mete en la celda Verif., que es del verificador, y cada fila nueva cuesta una ronda
  completa (entrada 57). La evidencia tampoco dice sobre qué código se produjo
  (entrada 55).
- **Cuando llega la evidencia de un manual pendiente, se repite toda la suite** (unos
  10 minutos) para juzgar una sola fila (entrada 30). ADR-020 §7 permite una ronda
  acotada, pero solo si una frontera mecánica impide colar código por ella.
- **`.sdd.json` no admite la receta ni el registro externo de manuales** (entradas 22 y
  37, ADR-020 §9).

Y la matriz del ledger, que ya decide el `hecho` de una spec del modelo, tiene dos huecos
que dejó abiertos el verificador de SPEC-030:

- **F-SPEC-030-7**: si un CA tiene dos filas en la matriz, `leerMatriz` toma la primera y
  `valida.mjs` no dice nada. Un ledger con `CA-2 ✅` y debajo `CA-2 ⚠️` pasa a `hecho`.
- **F-SPEC-030-2**: la matriz es «la primera tabla cuya cabecera empieza por `CA`». Una
  tabla anterior con esa cabecera se toma por la matriz y engaña a la guarda de `hecho`.
  Esta spec añade justo otra tabla con `CA` delante (la de evidencia), así que el
  localizador tiene que dejar de depender del orden.

Esta spec materializa ADR-020 §7, §8 y §9 (con la guarda del registro externo según
ADR-021, que supersede esa frase de §9), y cierra esos dos follow-ups. Todo sigue
aplicándose solo a las specs del modelo (§11, EPIC-008 CE-7). Es la misma idea que RN-07
y SPEC-030: lo que impide un GREEN por la puerta de atrás lo hacen cumplir los scripts,
no la prosa de un rol.

## Usuarios / roles afectados

- **Quien ejecuta un CA manual** (el humano, el orquestador o un subagente, según
  `ejecuta`): registra la evidencia en una tabla propia del ledger, sin esperar al
  verificador (ADR-020 §8).
- **sdd-verificador**: tras un PARCIAL, comprueba con un script que la ronda acotada es
  admisible y juzga solo los CA en `⏳`. No puede colar ni código nuevo ni cambios de
  Estado fuera de `⏳`.
- **sdd-implementador**: implementa los CA en `ft/SPEC-032-…`, con TDD.
- **Quien mantiene un proyecto con CA manuales** (artica, xana-pensa): declara la receta y
  el registro externo en `.sdd.json`.

## Criterios de aceptación

Convenciones de los tests:
- Directorios temporales, fixtures y repos git temporales; nunca el árbol real (salvo
  CA-10, que lo lee sin escribirlo).
- «El lector» es `core/lib/ca-manual.mjs`, el lector único de SPEC-030. Todo
  reconocimiento nuevo (secciones del ledger, tabla de evidencia) vive ahí; `valida.mjs`,
  `estado.mjs` y el script de la ronda lo importan.
- «Spec del modelo» es la de SPEC-030 (al menos un CA `[manual]` fuera de comentarios y
  bloques de código). Nada de lo que sigue se aplica a las demás (ADR-020 §11).
- Las formas del texto (marca, ficha, marcas de Estado, columnas de la tabla de
  evidencia, frontera de la ronda) son las de ADR-020 §2, §4, §7 y §8. Esta spec no las
  repite.
- «Cerrado» es lo que ya define el lector para la guarda de `hecho` (`estadoCierra`):
  `✅` con calificadores válidos, o `n-a`.

### CA-1 — La matriz y la evidencia se localizan por su sección (F-SPEC-030-2)
- **Given**: el ledger de una spec del modelo, en estas variantes:

  | Caso | Contenido del ledger |
  |---|---|
  | (a) | el de la plantilla: matriz bajo «Matriz de criterios de aceptación» y la tabla de evidencia (CA-3) bajo «Evidencia de CA manuales», detrás |
  | (b) | como (a), pero con una tabla impostora **antes** de la sección de la matriz (en «Resumen»), con cabecera `\| CA \| … \| Estado \|` y todos los CA en `✅`, mientras la matriz real tiene un CA bloqueante en `❌` |
  | (c) | como (a), con la tabla de evidencia movida **delante** de la sección de la matriz, en su propia sección |
  | (d) | dos tablas con cabecera `CA` dentro de la sección de la matriz |
  | (e) | sin la sección de la matriz (la tabla está, pero bajo otro encabezado) |

- **When**: se llama al lector, a `valida.mjs` (CLI) y a
  `transition(spec, 'hecho', 'sdd-verificador')`.
- **Then**:
  1. La matriz es la tabla de la sección de nivel 2 cuyo título es el de la plantilla del
     ledger; la evidencia, la de la sección «Evidencia de CA manuales». Una sección acaba
     en el siguiente encabezado de nivel 1 o 2. Las tablas fuera de esas secciones no
     cuentan, tengan la cabecera que tengan.
  2. En (a) y (c) el lector devuelve la matriz y la evidencia correctas, con sus filas.
  3. En (b) la guarda niega `hecho` y nombra el CA en `❌`: la tabla impostora no se lee.
  4. En (d) `valida.mjs` da un error de matriz ambigua (nombra el ledger y las dos
     líneas) y la guarda niega `hecho`.
  5. En (e) `valida.mjs` da un error de ledger sin matriz y la guarda niega `hecho`; en
     los dos casos la spec no cambia, byte a byte.
  6. El título de cada sección sale de la plantilla del ledger. Un test comprueba que,
     para cada idioma soportado (hoy `es`), el lector reconoce exactamente los títulos
     que trae `core/templates/<idioma>/artefactos/SPEC.ledger.md`: no hay una segunda
     copia que se pueda desalinear.

### CA-2 — Una fila repetida en la matriz es un error y no cierra (F-SPEC-030-7)
- **Given**: el ledger de una spec del modelo con dos filas del mismo CA en la matriz:
  - (a) `CA-2 ✅` y debajo `CA-2 ⚠️`, con `CA-2` bloqueante;
  - (b) `CA-2 ⚠️` y debajo `CA-2 ✅`;
  - (c) las dos filas en `✅`, idénticas;
  - (d) `**CA-2**` y `CA-2` (el mismo id con y sin negrita).
- **When**: se ejecuta el CLI de `valida.mjs` y se llama a
  `transition(spec, 'hecho', 'sdd-verificador')`.
- **Then**:
  1. En los cuatro casos `valida.mjs` sale con código distinto de 0 y el error nombra el
     ledger, el CA y las líneas de las dos filas.
  2. En los cuatro casos la guarda niega `hecho`, nombra el CA como fila repetida y la
     spec no cambia byte a byte. Una matriz con un id repetido no cierra, aunque las dos
     filas digan lo mismo.
  3. La tabla de evidencia sí admite varias filas del mismo CA (una por entorno y por
     ejecución, ADR-020 §8): una fila repetida allí no es error.

### CA-3 — La plantilla del ledger trae la sección de evidencia
- **Given**: `core/templates/es/artefactos/SPEC.ledger.md` tras el cambio.
- **When**: se ejecuta `scaffold.mjs spec` en un proyecto temporal y un test inspecciona
  la plantilla.
- **Then**:
  1. El ledger tiene una sección «Evidencia de CA manuales» detrás de la matriz, con la
     tabla de ADR-020 §8 (cabecera `CA | Entorno | Ejecutó | Observado | Commit | Fecha |
     Notas` y la línea separadora, sin filas).
  2. Un comentario HTML en la sección dice, citando ADR-020 §8: solo se añaden filas; la
     escribe quien ejecutó (el orquestador si ejecutó el humano); Observado es el
     resultado de la `comprobacion`, no la salida del comando; Commit es el SHA del
     código sobre el que se ejecutó; añadir filas no toca Verif., Estado ni el veredicto,
     y el paso de `⏳` a `✅` lo da siempre el verificador.
  3. El lector reconoce la tabla del ledger recién creado como la tabla de evidencia,
     vacía, y la matriz como la matriz (CA-1).
  4. La spec y el ledger recién creados pasan `valida.mjs`.
  5. Las dos entradas de spec y ledger de `tools/tests/golden/scaffold-es.json` se
     actualizan como en SPEC-030 (F-SPEC-030-1): solo cambian las que salen de la
     plantilla tocada y ninguna aserción de `tools/tests/golden-es.test.mjs` cambia.

### CA-4 — `valida.mjs` comprueba las filas de evidencia
- **Given**: una spec del modelo con un CA manual `CA-2` con dos comprobaciones
  (`[staging]` y `[produccion]`), un CA manual `CA-3` con una comprobación sin etiqueta y
  un CA automático `CA-1`; y su ledger con una fila de evidencia por caso:

  | Caso | Fila | Resultado |
  |---|---|---|
  | (a) | `CA-2 \| staging \| Alberto Fojo \| 403 sin el feature \| 1a2b3c4 \| 2026-11-26 \|` | sin error |
  | (b) | `CA-3 \| \| sdd-orquestador \| … \| <SHA de 40> \| 2026-11-26 \| …`, y la misma con `-` en Entorno | sin error |
  | (c) | fila de `CA-1` (CA no manual) | error: evidencia de un CA que no es manual |
  | (d) | fila de `CA-9` (no existe en la spec) | error: CA inexistente |
  | (e) | `CA-2` con Entorno `preprod` (no es una etiqueta de sus comprobaciones), y `CA-2` con Entorno vacío | error: entorno que no es de ese CA, con los admitidos |
  | (f) | `CA-3` con Entorno `staging` (su comprobación no tiene etiqueta) | error: entorno que no es de ese CA |
  | (g) | Ejecutó vacío o `desconocido` | error: falta quién ejecutó |
  | (h) | Observado vacío | error: falta lo observado |
  | (i) | Commit vacío, `main`, `HEAD` o `1a2b3c` (6 hex) | error: Commit no es un SHA (7 a 40 hex) |
  | (j) | Fecha `26/11/2026` o vacía | error: fecha no es AAAA-MM-DD |
  | (k) | la tabla con una columna de menos o con las columnas en otro orden | error: cabecera de evidencia |

  Cada variante se prueba por separado.
- **When**: se ejecuta el CLI de `valida.mjs`.
- **Then**:
  1. Los casos con error salen con código distinto de 0. El mensaje nombra el ledger, la
     línea, el CA y la columna, y dice lo que se esperaba.
  2. Los casos sin error salen con código 0.
  3. Con dos filas erróneas aparecen los dos errores: no se para en el primero.
  4. Ejecutó acepta una persona (predicado de ADR-006) o un rol; lo único que rechaza es
     la celda vacía o `desconocido`.
  5. Un ledger de una spec que no es del modelo, con filas de evidencia mal formadas, no
     da ningún error nuevo (ADR-020 §11).

### CA-5 — Un CA manual en ✅ exige su evidencia
- **Given**: la spec de CA-4, en `en-revision`, aprobada por una persona, con `CA-2` y
  `CA-3` bloqueantes, y su ledger con todos los CA en `✅`, en estas variantes:
  - (a) evidencia de `CA-2` en `staging` y en `produccion`, y de `CA-3`;
  - (b) falta la de `CA-2` en `produccion`;
  - (c) no hay ninguna fila de `CA-3` (la sección de evidencia existe);
  - (d) el ledger no tiene sección de evidencia;
  - (e) como (b), pero `CA-2` está en `n-a`;
  - (f) como (b), pero `CA-2` tiene `bloquea-hecho: no`.
- **When**: se ejecuta el CLI de `valida.mjs` y se llama a
  `transition(spec, 'hecho', 'sdd-verificador')`.
- **Then**:
  1. En (a) y (e) `valida.mjs` da OK y la spec pasa a `hecho`.
  2. En (b), (c) y (d) `valida.mjs` da un error por cada CA y entorno sin evidencia, y la
     guarda niega `hecho` nombrando cada uno; la spec no cambia byte a byte. Es la
     definición de `✅` de un CA manual de ADR-020 §4: «se cumplió cada comprobación y su
     evidencia está registrada».
  3. En (f) `valida.mjs` da el mismo error que en (b) (la celda dice `✅` sin evidencia),
     pero la guarda **no** niega `hecho` por ese CA: no bloquea (ADR-020 §5).
  4. Un CA manual en `⏳`, `⚠️`, `🚧` o `❌` no exige evidencia.

### CA-6 — El script de la ronda acotada calcula la frontera
- **Given**: un repo git temporal con una spec del modelo en `en-revision`, su ledger, un
  commit `V` (el commit verificado de un PARCIAL) y, después de `V`, una de estas
  situaciones:

  | Caso | Cambios desde `V` | Resultado |
  |---|---|---|
  | (a) | un commit que añade filas de evidencia al ledger y un PNG en `docs/_qa/SPEC-NNN/` | admisible |
  | (b) | (a) más una línea añadida al fichero de `registroManuales`, declarado en `.sdd.json` | admisible |
  | (c) | (a) más un cambio en `core/lib/x.mjs` | no admisible: nombra `core/lib/x.mjs` |
  | (d) | un cambio en la propia spec | no admisible: nombra la spec |
  | (e) | un fichero en `docs/_qa/SPEC-OTRA/` | no admisible |
  | (f) | (b) sin `registroManuales` declarado | no admisible: nombra el registro |
  | (g) | (a) más un cambio sin commitear en un fichero seguido fuera de la frontera | no admisible: nombra el fichero |
  | (h) | `V` no existe, o no es antepasado de `HEAD` | no admisible: dice por qué |

- **When**: se ejecuta `node core/scripts/ronda-acotada.mjs <ruta de la spec> --desde
  <V>`.
- **Then**:
  1. En los casos admisibles sale con código 0. En los no admisibles, con código
     distinto de 0, y lista **todos** los motivos, con cada fichero fuera de la frontera.
  2. La frontera es la de ADR-020 §7: el ledger de la spec, `_qa/SPEC-NNN/` bajo el
     directorio de docs, y el fichero de `registroManuales` si está declarado. Los
     ficheros cambiados son los de `git diff --name-only <V>..HEAD` más los ficheros
     seguidos con cambios sin commitear (caso (g)); los ficheros sin seguimiento no
     cuentan.
  3. Con `.sdd.json` ilegible la ronda no es admisible (ADR-017: un `.sdd.json` ilegible
     cierra, no abre).
  4. El script no escribe nada: el árbol y la spec quedan igual, byte a byte. No cambia
     ningún estado ni ninguna celda; solo dice si la ronda cabe y qué juzgar.
  5. Con una spec que no es del modelo, o que no está en `en-revision`, no es admisible y
     lo dice.

### CA-7 — La ronda acotada no cambia lo que no estaba pendiente
- **Given**: el repo de CA-6 (a), con la matriz en `V` así: `CA-1` (automático,
  bloqueante) en `✅`, `CA-2` (manual, bloqueante) en `⏳`, `CA-3` (manual, `bloquea-hecho:
  no`) en `⏳`; y, en el ledger de trabajo, una de estas situaciones:

  | Caso | Situación | Resultado |
  |---|---|---|
  | (a) | `CA-2` pasa a `✅` y `CA-3` sigue en `⏳`; filas de evidencia nuevas de `CA-2` con Commit `V` | admisible; lista `CA-2` y `CA-3` como los CA a juzgar, con sus filas nuevas |
  | (b) | `CA-1` cambia de `✅` a `✅ [desviación]`, o cambia su celda Verif. | no admisible: la fila de `CA-1` no estaba en `⏳` |
  | (c) | en `V`, `CA-1` estaba en `⚠️` (no era un PARCIAL) | no admisible: en `V` había un CA bloqueante abierto que no es un manual en `⏳` |
  | (d) | en `V`, ningún CA estaba en `⏳` | no admisible: no hay nada pendiente |
  | (e) | se borra o se cambia una fila de evidencia que ya estaba en `V` | no admisible: la tabla de evidencia solo admite filas nuevas al final |
  | (f) | una fila nueva con Commit `W`, posterior a `V`, cuyo diff con `V` solo toca el ledger | admisible |
  | (g) | una fila nueva con Commit `W` cuyo diff con `V` toca `core/lib/x.mjs` | no admisible: evidencia producida sobre otro código |
  | (h) | una fila nueva con un Commit que no existe en el repo | no admisible |
  | (i) | se borra la fila de `CA-1` de la matriz, o se añade una fila de un CA nuevo | no admisible |

- **When**: se ejecuta el script de CA-6.
- **Then**:
  1. Las filas de la matriz de los CA que en `V` no estaban en `⏳` son idénticas en `V` y
     en el ledger de trabajo (todas sus celdas). Solo cambian filas que estaban en `⏳`
     (ADR-020 §7: la ronda no cambia el Estado de un CA que no estaba en `⏳`).
  2. En `V` la matriz tenía la forma de un PARCIAL (ADR-020 §6): todo CA bloqueante
     cerrado salvo los manuales en `⏳`, y al menos un CA en `⏳`. Si no, la ronda no
     convierte nada en GREEN: no es admisible (caso (c)).
  3. Las filas de evidencia que había en `V` siguen en el ledger, iguales y en el mismo
     orden, delante de las nuevas.
  4. Cada fila nueva lleva un Commit que existe y cuyo `git diff --name-only` con `V`
     solo toca ficheros de la frontera de CA-6 (ADR-020 §7).
  5. Cada motivo nombra el CA o la fila y lo que cambió.

### CA-8 — `.sdd.json` admite `recetaManuales` y `registroManuales`
- **Given**: `.sdd.json` de proyectos temporales con:
  - (a) `"recetaManuales": "docs/manuales/receta.md"` y `"registroManuales":
    "docs/manuales/registro.md"`;
  - (b) cada una de las dos claves con `""`, `3`, `null`, `[]` o `true`.
- **When**: se lee con `leerSddJson` y se ejecuta el CLI de `valida.mjs`.
- **Then**:
  1. (a) es `valida` y `valida.mjs` da OK.
  2. Cada variante de (b) es `ilegible`, y el error nombra la clave y dice «un string no
     vacío».
  3. Las dos claves entran en `ESQUEMA_SDD_JSON` en este mismo cambio (ADR-019), y
     `tools/tests/sdd-json-esquema-cobertura.test.mjs` las ve.
  4. Ni `valida.mjs` ni `estado.mjs` comprueban que `recetaManuales` exista en disco
     (la leen los roles; ver Fuera de alcance).

### CA-9 — Con `registroManuales`, `en-revision` exige en el registro cada CA manual bloqueante sin cerrar
- **Given**: una spec del modelo en `en-progreso`, aprobada por una persona, con `CA-2`
  manual bloqueante y `CA-3` manual con `bloquea-hecho: no`, y su ledger, en estas
  variantes:

  | Caso | `.sdd.json` | Matriz | Registro | Resultado de `transition(spec, 'en-revision', 'sdd-implementador')` |
  |---|---|---|---|---|
  | (a) | sin `registroManuales` | `CA-2` en `⏳` | — | pasa |
  | (b) | con `registroManuales` | `CA-2` en `⏳` | una línea con `SPEC-NNN` y `CA-2` | pasa |
  | (c) | con `registroManuales` | `CA-2` en `⏳` | sin esa línea (o con `CA-2` de otra spec, o con `CA-20` de esta) | se niega |
  | (d) | con `registroManuales` | `CA-2` en `⏳` | el fichero no existe | se niega |
  | (e) | con `registroManuales` | `CA-2` en `❌` (el de la plantilla); `CA-3` en `⏳` | vacío | se niega: nombra `CA-2`, no `CA-3` |
  | (f) | con `registroManuales` | `CA-2` en `⚠️`, en `🚧`, o con la celda Estado vacía | vacío | se niega |
  | (g) | con `registroManuales` | sin fila de `CA-2` en la matriz | vacío | se niega |
  | (h) | con `registroManuales` | `CA-2` en `❌` | una línea con `SPEC-NNN` y `CA-2` | pasa |
  | (i) | con `registroManuales` | `CA-2` cerrado (`✅` con calificadores válidos, o `n-a`); `CA-3` en `❌` | vacío | pasa |
  | (j) | con `registroManuales` | spec que no es del modelo | vacío | pasa |

  Cada variante de (c) y (f) se prueba por separado.
- **When**: se llama a `transition` y, en (c) y (e), también al CLI de `estado.mjs`.
- **Then**:
  1. En los casos que se niegan lanza un error y el CLI sale con código distinto de 0; el
     mensaje nombra cada CA que falta y la ruta del registro. La spec no cambia byte a
     byte.
  2. Un CA «aparece» en el registro cuando una misma línea contiene el id de la spec y el
     id del CA como palabras completas (`CA-2` no casa con `CA-20`). Es la forma que
     fija ADR-021 (ver Decisiones del gate, 1).
  3. La guarda mira cada CA manual bloqueante **sin cerrar**: cualquier Estado que no
     cierre según el lector (`estadoCierra`), incluida la falta de fila o de celda. Los CA
     con `bloquea-hecho: no` no se miran, estén como estén: (e) nombra solo `CA-2` e (i)
     pasa. Es la regla de ADR-021, que supersede la frase «en `⏳`» de ADR-020 §9 (ver
     Decisiones del gate, 3).
  4. Un registro declarado que no existe niega `en-revision` (caso (d)), por el lado
     seguro, como un `.sdd.json` ilegible en ADR-017 (ADR-021; Decisiones del gate, 2).
  5. La comprobación de firmantes y de aprobación humana sigue igual y va antes.

### CA-10 — Un solo lector y sin regresión
- **Given**: el árbol tras el cambio.
- **When**: se ejecutan `npm test`, `npm run check` y `node core/scripts/valida.mjs`.
- **Then**:
  1. Los tres pasan en verde.
  2. Los tests que ya existían (incluidos los `ca-manual-*` de SPEC-030) pasan sin
     cambiar sus aserciones. Si una fixture de SPEC-030 depende del localizador antiguo
     (la primera tabla con `CA`), el cambio de la fixture se justifica en el ledger
     contra CA-1.
  3. Un test de código fuente comprueba que ni `valida.mjs`, ni `estado.mjs`, ni el
     script de la ronda reconocen por su cuenta secciones del ledger, cabeceras de tabla
     ni marcas de Estado: lo hace el lector.
  4. Ningún ledger ni spec del repo se modifica (CE-7). En el árbol real, ninguna spec
     cerrada pasa a dar error.

## Entidades y reglas afectadas

- **ADR-020**: §7 (ronda acotada y su frontera), §8 (evidencia), §9 (`.sdd.json`), sobre
  la base de §2, §4, §5 y §11 que materializó SPEC-030. Esta spec lo aplica; no lo
  repite.
- **ADR-021**: la guarda del registro externo (`registroManuales`) de CA-9: qué CA mira
  (manual bloqueante sin cerrar), qué id debe aparecer y qué pasa si el registro no
  existe. Supersede parcialmente ADR-020 §9, solo en esa frase.
- **ADR-009**: Verif. y Estado siguen siendo solo del verificador; la tabla de evidencia
  la escribe quien ejecutó.
- **ADR-006**: el predicado de persona, para la columna Ejecutó (CA-4).
- **ADR-017** y **ADR-019**: un `.sdd.json` ilegible cierra; todo campo nuevo entra en su
  esquema en el mismo cambio.
- **RN-07**: las guardas viven en `estado.mjs`, la única vía de transición.
- **RN-12**: no cambia; la evidencia no acepta salvedades.
- **SPEC-030**: el lector único (`core/lib/ca-manual.mjs`) y sus follow-ups F-SPEC-030-2
  y F-SPEC-030-7, que esta spec cierra.
- Términos de `docs/fundacion/dominio.md`: spec, CA, ledger, máquina de estados, gate,
  veredicto.

## Fuera de alcance

Aparcado a propósito, no por descuido. Va a las siguientes specs de EPIC-008:
- **El veredicto PARCIAL** (ADR-020 §6) y su sitio en «Veredicto del verificador», con el
  SHA del commit verificado. Aquí el script de la ronda recibe ese SHA como argumento
  (`--desde`); leerlo del veredicto exige un formato que fija la spec de roles.
- **La prosa de los roles**: cuándo lanza el verificador la ronda acotada, quién escribe
  la evidencia cuando ejecutó el humano, precondiciones y consentimiento, y leer
  `recetaManuales` (ADR-020 §3, §6, §8, §9). Esta spec deja el mecanismo; la spec de
  roles lo conecta.
- **«Pendiente del humano tras el merge»**, `sdd-como-vamos` y el tablero (§10).

Fuera de la épica, o de este ADR:
- Comprobar que `recetaManuales` existe o que su contenido es correcto.
- Juzgar si «Observado» es de verdad el resultado de la comprobación y no la salida del
  comando: es juicio del verificador (EPIC-008 CE-4), no se mecaniza.
- Los ficheros sin seguimiento en la frontera de la ronda (CA-6.2).
- Migrar ledgers existentes; la paridad gl/ca (SPEC-026).

## Decisiones del gate

Decisiones que ADR-020 no cierra del todo. El humano las revisó en el gate de la spec
(2026-11-26) y quedan cerradas así; no hay preguntas abiertas.

1. **Forma de la entrada del registro externo (CA-9.2).** ADR-020 §9 dice «su id no
   aparece en ese fichero» sin decir qué id. Decidido: un CA aparece cuando una misma
   línea contiene el id de la spec y el del CA, como palabras completas. Descartados:
   solo el id del CA (choca entre specs) y un formato fijo de línea.
2. **Registro declarado pero inexistente (CA-9 (d)).** Decidido: `estado.mjs` niega
   `en-revision`, por el lado seguro, como un `.sdd.json` ilegible en ADR-017.
3. **Qué CA mira la guarda del registro (CA-9.3).** ADR-020 §9 dice «un CA manual
   bloqueante en `⏳`». Leído al pie de la letra, la guarda casi nunca actuaría en la
   primera entrada a `en-revision`: el Estado lo escribe el verificador y la plantilla
   deja los manuales en `❌`. Decidido por el humano: se lee como «CA manual bloqueante
   sin cerrar», es decir, cualquier Estado que no cierre según el lector (`estadoCierra`:
   `✅` con calificadores válidos, o `n-a`), incluida la falta de fila o de celda. La regla
   vive ahora en ADR-021, que supersede esa frase de ADR-020 §9; también recoge las
   decisiones 1 y 2.
4. **Un CA manual en ✅ exige su evidencia (CA-5), también en la guarda de `hecho`.** Sale
   de la definición de `✅` de ADR-020 §4 aunque §5 solo diga «✅ con o sin
   calificadores». Aceptado tal cual.
5. **La frontera de la ronda también mira lo no commiteado (CA-6 (g)).** ADR-020 §7 la
   define con `git diff --name-only <V>..HEAD`; esta spec añade los ficheros seguidos con
   cambios sin commitear (sin eso, un cambio de código sin commitear pasaría por la
   ronda). Los ficheros sin seguimiento no cuentan, para no tropezar con ruido local.
   Aceptado tal cual.
6. **La ronda congela la fila entera (CA-7.1)** de cada CA que no estaba en `⏳`, no solo
   su Estado (ADR-020 §7 habla del Estado). Más estricto. Aceptado tal cual.
7. **El localizador por sección (CA-1).** La matriz se lee por el título de su sección,
   no por ser la primera tabla con `CA`, y un ledger de una spec del modelo sin esa
   sección da error. Hoy ninguna spec del repo es del modelo, así que no rompe nada; la
   plantilla de cada idioma (gl/ca) tendrá que mantener los títulos. Aceptado tal cual.
8. **La spec no se parte.** La ronda acotada (CA-6 y CA-7) se queda aquí aunque ningún
   rol invoque el script hasta la spec que introduce el PARCIAL.
