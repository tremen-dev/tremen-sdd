---
id: ADR-020
tipo: adr
estado: borrador
historial:
  - {estado: borrador, fecha: 2026-11-26, por: sdd-arquitecto}
---
# ADR-020: Modelo de CA manual: ficha por CA, marcas de la matriz y veredicto parcial

- Deciders: propone sdd-arquitecto el 2026-11-26, por encargo de EPIC-008 (aprobada
  ese mismo día por Alberto Fojo). Lo aprueba el humano en el gate de SPEC-030.
- Specs relacionadas:
  - **SPEC-030** (EPIC-008): la ficha, las marcas y el cierre que las respeta (§1, §2,
    §4, §5, §11).
  - Las siguientes specs de EPIC-008 materializan el resto: evidencia y ronda acotada
    (§7, §8, §9), roles (§3, §6) y pasos tras el merge (§10).

  Construye sobre ADR-006 (anatomía de un gate: rol frente a persona), ADR-009 (el
  verificador no escribe fuentes, sí el ledger) y ADR-019 (todo campo nuevo de
  `.sdd.json` entra en su esquema en el mismo cambio). **No supersede** ningún ADR.

## Contexto

Hoy un CA manual es un CA automático con la palabra «manual» delante. Todo lo demás
(quién lo ejecuta, qué necesita del humano, cómo se comprueba, si bloquea el cierre,
cómo se registra su evidencia) se decide sesión a sesión. EPIC-008 recoge 16 entradas
de `docs/mejoras-propuestas.md` (1, 2, 4, 18, 21, 22, 27-31, 37, 54-57) y las
recurrencias de la 68. Los costes que se repiten son estos:

- rondas completas del verificador solo para decir «faltan los manuales» (30) o para
  añadir una fila de evidencia (57);
- agentes que ejecutan CA «del humano» sin que el método diga que pueden (27, 31, 56);
- un permiso del humano que no llega al subagente, porque un mensaje de otro agente no
  es consentimiento (21);
- un «Deploy complete!» que estaba roto (28);
- salvedades aceptadas que quedan en ⚠️ con GREEN, sin saber si cuentan para cerrar
  (4, 54, 56; otra vez en la 68).

La regla «una salvedad nunca es ✅» vive en la plantilla del ledger
(`core/templates/es/artefactos/SPEC.ledger.md`) y en el rol del verificador. La épica la
llama RN-09, que es como se numera en xana-pensa. **En este repo RN-09 es otra regla**
(«ningún rol aprueba su propio trabajo»). Este ADR reformula la regla de la salvedad
(§4) y es coherente con RN-09: aceptar una salvedad pasa a ser un gate humano, que firma
una persona.

Lo que hay hoy y condiciona el diseño:
- el parser de frontmatter es restringido: no tiene mapas anidados;
- `valida.mjs` no lee los ledgers;
- `estado.mjs` ya hace cumplir por estructura quién firma cada gate (`FIRMANTES`), en vez
  de confiar en la prosa del rol.

## Decisión

### 1. Un CA es manual porque lo marca su spec

Un CA es **manual** cuando su id lleva detrás la marca `[manual]`, en cualquiera de las
dos formas que usan las specs:
- `### CA-3 [manual] — Recorrido en dispositivo`
- `- **CA-3** [manual]: Dado …`

«Manual» quiere decir que el verificador no puede reproducir la evidencia ejecutando la
suite. Depende de un dispositivo, de un entorno real, de una cuenta o del juicio de una
persona.

La marca es la **única** fuente: ni la palabra «manual» en el texto ni el prefijo del id
la sustituyen. Los ids `CA-<n>` y `CA-M<n>` valen los dos. En una spec que usa el modelo,
un `CA-M<n>` sin marca es un error, para que no haya dos señales que se contradigan.

### 2. La ficha del CA

Justo debajo de la línea del CA, antes de cualquier otro contenido (el Given/When/Then),
va una serie seguida de líneas `` - `clave`: valor ``, una clave por línea (con
`` [entorno] `` detrás de la clave en `comprobacion`). Puede haber líneas en blanco entre
la línea del CA y la ficha. La ficha termina en la primera línea que no tiene esa forma,
así que las listas que vienen después en el texto del CA no se confunden con ella.

Está en el cuerpo de la spec, junto al texto del CA, y no en el frontmatter (ver
Alternativas). El texto dentro de comentarios HTML y de bloques de código no cuenta, ni
para la marca ni para la ficha: así los ejemplos de las plantillas y de la documentación
no activan el modelo. La lista de claves es **cerrada**: una clave desconocida dentro de
la ficha es un error.

| Clave | En un CA manual | En un CA automático | Valores |
|---|---|---|---|
| `ejecuta` | obligatoria | no se admite | `humano`, `orquestador`, `implementador`, `verificador` |
| `bloquea-hecho` | obligatoria | opcional; si falta, vale `sí` | `sí` (o `si`), `no` |
| `comprobacion` | obligatoria, al menos una | no se admite | qué se observa y qué valor se espera. Una por entorno, con la etiqueta: `` `comprobacion` [staging]: … `` |
| `precondiciones` | opcional, se repite | no se admite | estado del mundo que tiene que estar listo antes de ejecutar («app de la tienda desinstalada») |
| `consentimiento` | opcional, se repite | no se admite | acción que el agente ejecuta tras un «sí» del humano («escribir en producción») |
| `manos` | opcional, se repite | no se admite | lo que solo el humano puede hacer: sus secretos, un panel sin acceso, IAM en producción |
| `cuando` | opcional; si falta, vale `codigo` | no se admite | `codigo` (sobre el código de la spec, en la rama o en main) o `tras-merge` |
| `depende-de` | opcional | opcional | ids de CA de la misma spec, separados por comas |

Reglas de coherencia:
- `ejecuta` dice **quién produce la evidencia**. Quien juzga es siempre el verificador
  (§4, §6).
- Con `consentimiento`, `ejecuta` es `humano` u `orquestador`, nunca un subagente (§3).
- `cuando: tras-merge` exige `bloquea-hecho: no`. El GREEN y el `hecho` ocurren en la
  rama, antes del merge, así que un paso posterior al merge no puede bloquearlos. Lo
  recoge la sección de pasos tras el merge (§10).
- `comprobacion` es **observable**: el estado del sistema leído después del paso, por un
  canal distinto del comando que lo produjo (una petición, una consulta, una captura, un
  valor leído), con el valor esperado. «El comando terminó sin error» o «Deploy
  complete!» no es una comprobación. Si el paso se repite en varios entornos, hay una
  comprobación por entorno: lo que salió bien en uno no prueba el otro. Como mucho una
  `comprobacion` va sin etiqueta, y las etiquetas no se repiten.
- `depende-de` apunta a CA que existen, no se apunta a sí mismo y no forma ciclos.
- La spec nombra **papeles**, no personas («cuenta con el feature», «cuenta sin él»).
  Qué cuenta o qué dispositivo hace cada papel lo dice la receta del proyecto (§9).

### 3. El consentimiento no viaja en un mensaje

Un consentimiento solo vale en la sesión donde el humano lo dio, porque solo ahí lo ve el
sistema de permisos del harness. Un subagente no lo recibe, y el método no intenta
pasárselo. En consecuencia:
- las acciones de `consentimiento` las ejecuta el humano o el orquestador en su propia
  sesión, tras el «sí»;
- el orquestador confirma `precondiciones` y `consentimiento` **antes** de lanzar al
  verificador, y lo deja en la evidencia (§8);
- si un subagente (verificador o implementador) se encuentra una acción destructiva o una
  precondición sin cumplir, no la intenta. Devuelve el comando exacto para que lo ejecute
  el humano o el orquestador.

### 4. Marcas de la columna Estado

Los estados base siguen siendo `✅`, `⚠️`, `🚧`, `❌` y `n-a`. Se añade uno:
- `⏳`: CA manual pendiente. No se ha ejecutado, o se ejecutó y su evidencia no está
  registrada. Solo vale en CA manuales.

`✅` admite calificadores entre corchetes detrás. La lista es cerrada, cada calificador
aparece como mucho una vez y se pueden combinar:

| Marca | Significa | Quién la pone |
|---|---|---|
| `✅` | cumple el texto del CA. En un CA manual: se cumplió cada `comprobacion` y su evidencia está registrada | verificador |
| `✅ [salvedad: <persona>, <AAAA-MM-DD>]` | el resultado no cumple todo el texto, y una persona aceptó la diferencia ese día. El detalle va en «Salvedades / follow-ups» | verificador, transcribiendo la aceptación del humano |
| `✅ [desviación]` | la comprobación se cumplió tal como está escrita, pero el medio fue otro (otra cuenta en el mismo papel, otro dispositivo). El detalle va en la fila de evidencia | verificador |
| `✅ [confirmado: <persona>, <AAAA-MM-DD>]` | lo ejecutó un agente y la persona confirmó el resultado viéndolo | verificador, transcribiendo la confirmación |

`<persona>` cumple el predicado de persona de `estado.mjs` (ADR-006): no está vacía, no es
`desconocido` y no es un rol `sdd-*`.

**La regla de la salvedad se reformula así: una salvedad que no ha aceptado una persona
nunca es ✅.** `⚠️` queda solo para la salvedad sin aceptar. Si la comprobación no se
cumplió tal como está escrita, no es una desviación: es una salvedad o un `❌`. El
verificador no puede aceptar una salvedad por su cuenta.

### 5. `bloquea-hecho` y el cierre

Para el GREEN y para `hecho`, cada CA con `bloquea-hecho: sí` (el valor por defecto) tiene
que estar en `✅`, con o sin calificadores, o en `n-a`. Un CA con `bloquea-hecho: no` puede
cerrar en `⏳` o en `⚠️`; queda visible como pendiente (§10).

`estado.mjs` hace cumplir esta regla al pasar una spec a `hecho` cuando la spec tiene al
menos un CA `[manual]`. Lee la ficha de la spec y la matriz del ledger, igual que hoy
`FIRMANTES` hace cumplir quién firma: la prosa del rol no detiene a un agente, la máquina
de estados sí.

### 6. Tres veredictos: GREEN, RED y PARCIAL

- **RED**: hay algún hallazgo. Transiciona a `en-progreso`, como hoy.
- **GREEN**: cumple §5. Transiciona a `hecho`, como hoy.
- **PARCIAL** (nuevo): una pasada completa (suite, lint, todos los CA evaluables) sin
  ningún hallazgo. Todo cumple §5 salvo que algún CA manual bloqueante sigue en `⏳`:
  ningún CA no manual impide el cierre.
  - **No cambia el estado**: la spec sigue en `en-revision`.
  - Registra el **commit verificado** (SHA) en «Veredicto del verificador».
  - Con un solo hallazgo ya no es PARCIAL, es RED.

No se crea ningún estado nuevo en la máquina de estados: `en-revision` ya dice «en manos
del verificador».

### 7. Ronda acotada después de un PARCIAL

Cuando llega la evidencia de los manuales pendientes, el verificador hace una **ronda
acotada**: juzga solo los CA en `⏳` con su evidencia y no vuelve a pasar la suite.

Solo vale si, desde el commit verificado del PARCIAL, el diff toca nada más que:
- el ledger de la spec;
- `_qa/SPEC-NNN/`;
- el registro externo de manuales, si el proyecto lo declara (§9).

Cualquier otro fichero, la propia spec incluida, obliga a una pasada completa. La
frontera es mecánica: se calcula con `git diff --name-only <commit verificado>..HEAD`.

Lo que una ronda acotada **no puede** hacer:
- cambiar el Estado de un CA que no estaba en `⏳`;
- convertir un RED en GREEN;
- aceptar evidencia producida sobre otro código. El commit de la evidencia (§8) es el
  commit verificado, o uno al que solo separan de él cambios dentro de la frontera.

### 8. Registrar evidencia no es cambiar el veredicto

El ledger tiene una sección nueva, **«Evidencia de CA manuales»**. Es una tabla en la que
solo se añaden filas, una por CA y entorno:

`| CA | Entorno | Ejecutó | Observado | Commit | Fecha | Notas |`

- **Ejecutó**: quién produjo la evidencia (persona o rol).
- **Observado**: el resultado de la `comprobacion`, no la salida del comando.
- **Commit**: el SHA del código sobre el que se ejecutó el paso (entrada 55).
- **Notas**: desviación, consentimiento confirmado y por quién, precondiciones.

La escribe quien ejecutó. Si ejecutó el humano, la escribe el orquestador con lo que el
humano aportó. Añadir filas no necesita al verificador ni toca las columnas Verif. y
Estado ni el veredicto, que siguen siendo solo del verificador (ADR-009). El paso de `⏳` a
`✅` lo da siempre el verificador, en una pasada completa o en una ronda acotada (§7).
Ningún script lo da por él.

### 9. Configuración opcional en `.sdd.json`

Dos claves opcionales. Las dos son strings no vacíos y entran en el esquema de ADR-019 en
la misma spec que las introduce:
- `recetaManuales`: ruta a un documento del proyecto con la receta para ejecutar CA
  manuales (dispositivos, firma, cuentas por papel, cómo instalar una rama). Los roles la
  leen ahí, no del brief (entrada 22).
- `registroManuales`: ruta a un registro externo de pruebas manuales (entrada 37). Si
  está declarada, `estado.mjs … en-revision` falla cuando la spec tiene un CA manual
  bloqueante en `⏳` y su id no aparece en ese fichero.

### 10. Pasos humanos tras el merge

Los CA con `cuando: tras-merge`, y los que cierran en `⏳` con `bloquea-hecho: no`, se
listan en una sección estándar del ledger, **«Pendiente del humano tras el merge»**. Cada
paso es una casilla con sus dependencias (`depende-de`) y su comprobación.
`sdd-como-vamos` los agrega en una lista ordenada, y el tablero distingue «hecho» de
«hecho con pasos humanos abiertos». Su evidencia, cuando llega, entra por §8 aunque la
spec ya esté en `hecho`.

### 11. Compatibilidad: el modelo se activa con la marca

Todo lo nuevo (validaciones de la ficha, marcas, la guarda de `hecho`) se aplica solo a
las specs con al menos un CA `[manual]` y a sus ledgers. Un artefacto sin la marca se
valida y transiciona igual que hoy, aunque su texto diga «manual». No se migra ningún
ledger cerrado (EPIC-008, CE-7).

### 12. Dependencias entre CA

`depende-de` vale en cualquier CA. Un CA cuyas dependencias, directas o transitivas, no
incluyen ningún CA manual pendiente se puede implementar y verificar sin esperar a los
manuales. Esto declara la dependencia y nada más: planificar olas en paralelo es de
EPIC-009.

## Consecuencias
### Positivas
- Un CA manual dice quién lo ejecuta, qué necesita del humano, cómo se comprueba y si
  bloquea, en campos que leen los scripts y no en prosa que se interpreta por precedente.
- La puerta trasera al GREEN queda cerrada en dos sitios mecánicos: la guarda de `hecho`
  (§5) y la frontera de la ronda acotada (§7). La prosa no es lo único que la cierra.
- Los manuales pendientes dejan de costar una pasada completa del verificador (§6, §7), y
  registrar evidencia deja de costar un verificador (§8).
- El problema del consentimiento (21) se resuelve sin rodear el sistema de permisos del
  harness: la acción se ejecuta donde está el permiso (§3).
- Ninguna spec pequeña paga el coste: sin `[manual]` no cambia nada (§11).

### Negativas / follow-ups
- **El formato vive en el cuerpo de la spec**, que hasta ahora era prosa libre. Hace
  falta un parser del cuerpo, que es nuevo en el núcleo. Debe haber uno solo, y lo usan
  `valida.mjs` y `estado.mjs` (SPEC-030).
- **La aceptación de una salvedad la transcribe un agente.** El nombre tiene que ser de
  una persona, pero nada impide que un agente se la invente. Es el mismo nivel de
  confianza que `estado.mjs … aprobada --por <humano>`, que también ejecuta el
  orquestador. Si se quiere más, tiene que ser un mecanismo de firma, fuera de esta
  épica.
- **Sesgo de muestra**: 13 de las 16 entradas vienen de xana-pensa. Conviene contrastar la
  ficha con un CA manual real de artica (CA-1 con Meta) antes de cerrar la épica.
- **Paridad gl/ca**: hoy solo existe `es`. Si SPEC-026 entra antes que el resto de
  EPIC-008, cada cambio de plantilla o rol se triplica.
- **RN nueva**: la regla reformulada de §4 podría subir a `docs/fundacion/reglas.md` como
  RN-12, para que no viva solo en una plantilla y un rol. Lo decide el humano.
- **Quién mantiene la receta (§9)**: queda abierto. La matriz de dueños de EPIC-010 lo
  fija. Mientras tanto, quien la encuentra desfasada lo dice en su informe.

## Alternativas consideradas
- **La ficha en el frontmatter** (un mapa por CA). Rechazada: el parser de frontmatter no
  tiene mapas anidados (es YAML restringido a propósito), y la ficha quedaría lejos del
  texto que describe.
- **Un prefijo de id como única señal** (`CA-M1`). Rechazada como fuente: un CA que pasa
  de manual a automático cambiaría de id y rompería las referencias. Se admite como id,
  pero lo que cuenta es la marca (§1).
- **Un estado nuevo de spec** (`verificada-parcial`). Rechazada: el PARCIAL no debe mover
  nada, y un estado nuevo cambia `TRANSITIONS`, el tablero y todas las guardas que lo
  leen. `en-revision` ya cubre ese tiempo.
- **Dejar ⚠️ con aceptación implícita** (lo de hoy). Rechazada: es la ambigüedad que se
  repitió en las entradas 4, 54, 56 y 68.
- **Un script que pase `⏳` a `✅` al registrar la evidencia.** Rechazada: es justo la
  puerta trasera al GREEN que señala el riesgo de la épica. El juicio sigue siendo del
  verificador; lo que se abarata es la ronda (§7), no el juicio.
- **Reverificación completa siempre.** Rechazada por el coste observado (30, 57). La
  frontera de §7 conserva la garantía: si cambia el código, vuelve la pasada completa.
- **Pasar el consentimiento del humano al subagente en el prompt.** Rechazada: el harness
  no acepta un mensaje de otro agente como consentimiento, y tiene razón. Rodearlo
  debilitaría una garantía de seguridad que el método no controla.
- **`bloquea-hecho` obligatorio en todos los CA** (entrada 54 al pie de la letra).
  Rechazada: las specs pequeñas pagarían el coste de las grandes. El valor por defecto
  `sí` es el seguro, y en los manuales la clave es obligatoria.

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
