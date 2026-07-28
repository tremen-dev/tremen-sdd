---
id: ADR-012
tipo: adr
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-07-28, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-28, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# ADR-012: Verificabilidad mecanica de la prosa taxonomia de afirmaciones y mecanismos de comprobacion

- Deciders: propone sdd-arquitecto; aprueba el humano (pendiente, gate humano de SPEC-018).
- Specs relacionadas: **SPEC-018** (EPIC-005) lo origina y lo consume: escribe la regla
  de CE-4 y deja el terreno preparado para el check. La spec #2 del desglose de EPIC-005
  (aún no escrita) lo implementa. **Complementa** ADR-011 (mecanismo de generalización
  de un check: este ADR aplica su misma lógica —el mecanismo lo decide la naturaleza de
  lo verificado— al dominio de la prosa) y ADR-005 (fuente canónica única de la
  `description`: aquí se explica por qué ese mecanismo **no** se puede extender a la
  prosa libre). **NO supersede** a ninguno (RN-04).

## Contexto

`core/` tiene **diez** checks de invariantes vigilándolo. `FOUNDATION.md`,
`docs/fundacion/` y `README.md` no tienen ninguno. La consecuencia, documentada en el
inventario cerrado de EPIC-005, son quince afirmaciones falsas conviviendo en los
documentos que definen el método — incluido el glosario (`docs/fundacion/dominio.md`)
que fija su vocabulario. El drift no se detecta cuando se produce sino meses después y
por casualidad.

Ese "diez" merece detenerse un segundo, porque es la mejor prueba disponible de la
tesis de este ADR: **EPIC-005 dice "nueve checks" tres veces, y ADR-011 —aprobado
anteayer— también.** Eran nueve hasta que SPEC-016 añadió `version-unica`. La cifra
envejeció en menos de una semana, dentro de los mismísimos documentos que denuncian
cifras envejecidas, y la escribió el mismo rol que firma este ADR. Una cifra sin
mecanismo que la sostenga no dura: no es una cuestión de cuidado.

La tentación fácil sería decretar "un check que valide la documentación". Es
exactamente el error que este ADR existe para evitar. **Un documento no es verdadero
ni falso: contiene afirmaciones, y solo algunas son decidibles leyendo el repo.** Un
verificador que no distinga las clases acaba pidiéndole a la prosa que se escriba para
el parser, y entonces o la gente deja de escribirla o la escribe para pasar el check.
Ambos desenlaces son peores que el drift.

### Qué dice el árbol de hoy (medición, no intuición)

Medido sobre `FOUNDATION.md`, `docs/fundacion/` y `README.md` el 2026-07-28:

| Magnitud | Valor |
|---|---|
| Frases de prosa | ~204 |
| Frases con algún token de aspecto mecánico | 122 (60%) |
| Tokens de ruta entre backticks | 139: **87 anclados** (empiezan por `core/`, `adapters/`, `tools/`, `docs/`, `site/`… o son un fichero de la raíz) y **52 fragmentos** (`lib/`, `estado.mjs`, `agents/`: relativos al enunciado, no resolubles solos) |
| Rutas ancladas que resuelven contra el árbol | 74; 11 son plantilla (`SPEC-NNN`, `<idioma>`); **2 falsas alarmas** de un resolutor ingenuo (`templates/rol-dominio.md` del `README.md` es relativo a `core/templates/`) |
| Citas cruzadas `RN-NN` / `ADR-NNN` / `SPEC-NNN` / `EPIC-NNN` | **64, ninguna colgada** |
| Cifras "cardinal (≥ dos) + sustantivo de inventario" | **11** en total (`7 roles`, `dos adaptadores`, `tres hooks`, `seis checks`…) |
| Marcas léxicas de volatilidad (`aún no`, `hoy`, `por ahora`, `migrará`, `en el roadmap`, `pendiente`, `sin resolver`) | **17** |

Tres lecturas gobiernan la decisión:

1. **La superficie decidible es de tokens, no de frases.** Cerca de dos tercios de la
   prosa de la fundación es juicio, intención, pedagogía o procedimiento: no es
   falsificable leyendo el árbol, y perseguirla es el modo de fallo caro.
2. **La validación de referencias cruzadas cazaría hoy cero de las quince
   discrepancias**: las 64 citas resuelven. Es seguro barato y hay que tenerlo, pero
   **no es la entrega**. Peor: la discrepancia real de este tipo —`dominio.md` cita
   RN-08 donde corresponde RN-01— es una cita **existente y equivocada**, que ninguna
   comprobación de existencia detecta.
3. **El drift vive sobre todo en la volatilidad, no en la estructura.** Hay 17 marcas
   de "estado del mundo" contra 11 cifras, y diez de las quince discrepancias del
   inventario son afirmaciones de progreso incrustadas en un documento de verdad ("aún
   no implementado", "en el roadmap", "migrará a", "hoy instalar exige"). La causa raíz
   no es solo que no haya check: es que la fundación se estaba usando como informe de
   estado. Contra eso el remedio primario es **prohibir la clase**, no verificarla.

### Por qué los precedentes de prosa que ya existen no se extienden tal cual

- **`descripcion-fuente-unica.mjs` (ADR-005 / RN-11)** compara la `description` de cada
  superficie con su forma canónica en `core/roles/es/_descripciones.json`. Funciona
  porque esa prosa **es un dato copiado**: existe una forma canónica de la que la
  superficie es copia literal. La prosa de `FOUNDATION.md` no es copia de nada: no hay
  texto canónico con el que compararla, y fabricarlo equivale a generar la fundación.
  Lo que sí se hereda es su **arquitectura**: canónica única + copias verificadas +
  error que nombra superficie y forma esperada. Ese patrón se aplica aquí a los valores
  (cifras e inventarios), no a las frases.
- **`prosa-gates.mjs`** verifica que tres conceptos aparezcan en un fichero, por regex
  normalizado. Es correcto para tres reglas duras en un fichero conocido; generalizarlo
  a la fundación es literalmente escribir prosa para el parser.
- **`version-unica.mjs`** es el precedente mecánicamente más cercano: calcula el valor
  esperado desde la fuente única, enumera dónde se declara, y falla nombrando cada
  declaración divergente. Ese es el molde.

## Decisión

**Lo que se verifica de un documento de verdad son sus afirmaciones, clasificadas; y el
mecanismo lo determina la clase de afirmación, no la comodidad de quien escribe el
check** (la misma lógica de ADR-011, aplicada a la prosa).

### 1. Taxonomía: toda afirmación de un documento de verdad es V, R o P

- **V — verificable.** Su verdad se decide leyendo el árbol del repo, sin juicio. Tres
  subclases, cada una con su mecanismo:
  - **V1 — referencia**: un identificador de artefacto (`RN-NN`, `ADR-NNN`, `SPEC-NNN`,
    `EPIC-NNN`) o una **ruta anclada** (desde la raíz del repo) citada entre backticks.
  - **V2 — inventario**: una **cifra** o una **enumeración** de un conjunto que el repo
    materializa (adaptadores, checks, roles, hooks de un adaptador, RN…).
  - **V3 — cita literal**: prosa que copia un dato con fuente canónica única (la
    versión, la `description` de un rol).
- **R — remitida a su fuente.** Cierta, pero cuyo detalle vive en otro artefacto que ya
  es autoridad. El documento de verdad enuncia la **forma** y **apunta**; no reproduce
  el contenido. Ejemplo: el estado de una spec no se narra en `contexto.md`, se remite a
  su frontmatter y al tablero. Se le exige solo que el puntero resuelva (por dentro es
  V1). **Toda afirmación sobre una herramienta externa es R por obligación**: se ancla
  con versión y fecha, o se marca explícitamente como hipótesis (restricción heredada de
  EPIC-003; este ADR la consolida, no la reinventa).
- **P — prohibida por volátil.** Su verdad caduca sin que ningún cambio del repo pueda
  señalarlo: estado de progreso ("aún no implementado", "en curso", "pendiente"),
  futuros ("migrará a", "está en el roadmap"), presentes sin datar ("hoy instalar
  exige…", "por ahora no resuelve…") y cifras sin marcar. **No se escriben en un
  documento de verdad**: pertenecen al artefacto que las posee (épica, spec, ADR,
  ledger, roadmap) y desde el documento de verdad se toman en forma R.

Fuera de la taxonomía, y **nunca verificadas**: las afirmaciones de juicio, intención,
motivación o pedagogía. Que `vision.md` diga por qué duele el problema no es
falsificable, ni debe serlo.

### 2. Tres mecanismos, y ninguno compara prosa contra prosa

- **M1 — resolución de referencias (V1).** Cada `RN-NN`/`ADR-NNN`/`SPEC-NNN`/`EPIC-NNN`
  citado debe existir como artefacto real; cada ruta **anclada** debe existir en el
  árbol. Se aplica **solo a rutas ancladas**: los 52 fragmentos medidos (`lib/`,
  `agents/`) se ignoran por diseño — perseguirlos obligaría a reescribir la prosa en
  rutas completas, que es justo el fallo que este ADR evita. Las plantillas (`SPEC-NNN`,
  `<idioma>`, `${…}`) se ignoran igual que ya hace `referencias.mjs`. **M1 comprueba
  existencia, no pertinencia**: una cita equivocada pero existente no la caza.
- **M2 — inventario declarado (V2).** Un **registro cerrado** asocia el nombre canónico
  de cada inventario a un **resolutor** que lo calcula desde el árbol (`adaptadores` →
  `readdir(adapters/)`; `checks` → los pasos de `PASOS` en `tools/check.mjs`; `roles` →
  `core/roles/es/`; `reglas` → las cabeceras de `docs/fundacion/reglas.md`…). En la
  prosa, un **marcador** —comentario HTML, invisible al renderizar— nombra qué
  inventario afirma el enunciado que lo acompaña. El check compara **el árbol contra la
  prosa**:
  - **cifra**: la cifra escrita (en palabra o en dígito) debe igualar la cardinalidad
    real;
  - **enumeración**: el tramo marcado debe mencionar **todos** los miembros reales y
    **ningún** no-miembro.
  El marcador **nombra el inventario y nunca lleva el valor**: si lo llevara habría dos
  declaraciones capaces de divergir en silencio, que es el fallo que `version-unica.mjs`
  existe para eliminar (ADR-010 §4).
- **M3 — léxico de volatilidad (P).** Una **lista cerrada y corta** de marcas de
  volatilidad. Encontrar una en un documento de verdad es fallo: el mensaje pide
  reformular a R o mover la afirmación a su artefacto. Existe **exención explícita e
  individual** por marcador, auditable en el diff; no hay exención global.

### 3. Cobertura: obligatoria donde el fallo sería silencioso, opt-in donde no es detectable

Aplica la asimetría de modos de fallo de ADR-011: el falso negativo silencioso es el que
erosiona la confianza.

- **Las cifras son de marcado OBLIGATORIO.** Un cardinal (≥ dos, en palabra o dígito)
  junto a un sustantivo del **léxico cerrado de inventarios** exige marcador; si no lo
  lleva, el check **falla pidiendo marcarla o reformularla**. Un cardinal es detectable,
  así que dejarlo pasar sería elegir el falso negativo silencioso. Los números que forman
  parte de un identificador (`RN-08`, `ADR-011`) no son cifras: se excluyen antes de
  mirar.
- **Las enumeraciones son OPT-IN.** No hay forma determinista de detectar que una frase
  enumera un conjunto sin marcarla. Se acepta el hueco y se declara (ver Consecuencias).
- **Ningún check se ablanda para pasar a verde** (ADR-011 §5): si al marcar aparece un
  rojo real, se para y se escala al gate.

### 4. Ámbito: qué documentos gobierna, y qué queda explícitamente fuera

- **Autodescubrimiento** (ADR-011 §1) de `docs/fundacion/` más `FOUNDATION.md`: un
  documento de fundación nuevo queda cubierto el día que se crea, sin tocar el check.
- **Extras declarados** (ADR-011 §3): `README.md` entra por tabla explícita. No es un
  documento de verdad —es la puerta de entrada—, pero se gobierna igual porque es lo
  primero que se lee y ya acumula cuatro de las quince discrepancias.
- **Fuera, por naturaleza y no por descuido**: `docs/adr/`, specs, ledgers y épicas
  cerradas, que son **registro histórico** fechado e inmutable (RN-04) — que ADR-002 diga
  "los seis checks" es historia, no drift. También fuera `core/roles/` (es el método, no
  su documentación), `docs/roadmap.md` (es el sitio donde la clase P vive legítimamente)
  y `site/` (superficie de producto, otro ciclo).
- **El check declara a quién ha mirado** (ADR-011 §6): su mensaje de éxito nombra los
  documentos recorridos y cuántas afirmaciones de cada clase resolvió. Un verde anónimo
  no distingue "los miré todos" de "no miré ninguno".

### 5. La taxonomía se escribe como regla de negocio nueva

CE-4 pide que el criterio quede escrito y sea citable para rechazar una afirmación. Se
materializa como **RN nueva** (RN-12, redactada en SPEC-018), no como refuerzo de una
existente: RN-08 gobierna **quién escribe** un documento de verdad; esto gobierna **qué
puede decir**. Son invariantes distintos, y fundirlos dejaría a uno de los dos sin poder
ser citado.

## Consecuencias
### Positivas
- El riesgo central de la épica —"un check tan ambicioso que obligue a escribir prosa
  para el parser"— queda acotado por construcción: el mecanismo solo mira tokens
  (identificadores, rutas ancladas, cardinales, léxico cerrado), nunca frases enteras, y
  los dos tercios de prosa que son juicio quedan intactos y sin obligaciones.
- El coste de autoría está **medido**: 11 marcadores de cifra en todo el corpus actual. Y
  es autorregulador — si un documento de verdad empieza a exigir muchos marcadores, la
  señal correcta es que está haciendo de informe de estado.
- La clase P convierte diez de las quince discrepancias en **prosa que no debió
  escribirse**, no en prosa que hay que vigilar. Sale más barato de sostener que
  cualquier verificación.
- Un documento de fundación nuevo nace cubierto (autodescubrimiento), y los ADRs quedan
  protegidos de "correcciones" futuras por ámbito escrito, no por costumbre.

### Negativas / follow-ups
- **Las enumeraciones sin marcar salen verdes.** Es el falso negativo residual y se
  acepta a conciencia: no son detectables sin heurística no determinista. Mitiga: la
  cifra sí es obligatoria, y casi toda enumeración larga acaba llevando cifra.
- **El léxico de M3 es cerrado**: una afirmación volátil redactada con otras palabras
  pasa. Ampliarlo es barato; hacerlo exhaustivo, imposible. Se asume.
- **La cita existente pero equivocada no la caza nadie** (`dominio.md` → RN-08 donde va
  RN-01). Ninguno de los tres mecanismos decide pertinencia semántica. Queda como
  residual explícito de revisión humana, y esa discrepancia solo se cierra así.
- **M3 puede pedir reformular prosa legítima.** Para eso está la exención por marcador;
  si las exenciones proliferan, el léxico está mal calibrado y hay que revisarlo, no
  desactivar el check.
- **Los marcadores son sintaxis que hay que conocer.** Se documentan en la RN y en
  `docs/arquitectura.md`; un marcador con nombre de inventario inexistente es fallo
  ruidoso, no verde silencioso.
- **El registro de inventarios es enumeración** (ADR-011 §2, y aquí justificada): "qué es
  el conjunto de los checks" no existe sin conocer la estructura del repo. Un inventario
  nuevo exige declararlo; el fallo residual es de **menos** cobertura, nunca de falso
  positivo.
- Este ADR **no** corrige ninguna de las quince discrepancias ni toca `docs/fundacion/`:
  eso es trabajo de las specs #3 y #4 de EPIC-005.

## Alternativas consideradas
<!-- Cada una con el motivo de rechazo. -->

- **Solo validación de referencias cruzadas** (lo más barato, y lo primero que se
  propone). Rechazada por insuficiente, con número: 64 citas cruzadas en el corpus y
  **cero colgadas**; cazaría **0 de las 15** discrepancias. Se conserva como M1 —es
  seguro barato y protege el futuro— pero no puede ser la entrega de CE-2.
- **Generar la fundación (o secciones de ella) desde el repo, y comparar.** Rechazada: un
  documento de verdad generado deja de ser un lugar donde se piensa y pasa a ser un
  informe; RN-05 obligaría además a prohibir editarlo a mano, o sea a prohibir escribir
  la constitución. Y no es viable: dos tercios de su prosa no se derivan de ningún dato.
- **Extender el patrón de `descripcion-fuente-unica.mjs`: forma canónica de cada párrafo
  y comparación por igualdad.** Rechazada: ese mecanismo funciona porque la `description`
  **es un dato copiado**; convertir la prosa libre en copia de una canónica es la
  alternativa anterior con otro nombre. Se hereda su arquitectura (canónica única, copias
  verificadas, error que nombra superficie y forma esperada), no su comparación.
- **Generalizar `prosa-gates.mjs`: exigir por regex que ciertos conceptos aparezcan.**
  Rechazada: es la definición de escribir prosa para el parser. Su modo de fallo al
  reformular una frase legítima es un rojo falso que se "arregla" acomodando el texto al
  check — el incentivo exactamente invertido. Sigue siendo válido para lo que hace hoy
  (tres reglas duras en un fichero concreto), y ahí se queda.
- **Detectar afirmaciones de inventario sin marcadores, por heurística sobre la frase.**
  Rechazada: no determinista y con falsos positivos incontrolables. Un check de CI debe
  ser decidible; el marcador es el precio mínimo de la decidibilidad, y cuesta 11 sitios.
- **Marcador que lleva el valor esperado (`<!-- sdd:cifra adaptadores=3 -->`).**
  Rechazada: crea una segunda declaración que puede divergir de la prosa en silencio. Es
  el mismo defecto que ADR-010 §4 eliminó para la versión. El marcador nombra; el árbol
  calcula; la prosa se compara.
- **Marcado opt-in también para las cifras.** Rechazada por la asimetría de ADR-011: una
  cifra no marcada es detectable, así que ignorarla es elegir el falso negativo
  silencioso, que es el modo de fallo que ya costó F-SPEC-015-2.
- **Gobernar también `docs/adr/` y las specs cerradas.** Rechazada: son registro
  histórico e inmutable (RN-04). Vigilarlas obligaría a reescribir la historia para pasar
  un check, que es peor que el drift que evitaría. EPIC-005 ya las excluye.
- **Un check por documento** (uno para `README.md`, otro para `dominio.md`…). Rechazada
  por ADR-011 §1: el invariante es común a cualquier documento de verdad, así que el
  autodescubrimiento es el mecanismo; N checks multiplicarían el mismo código con N
  oportunidades de que uno se quede atrás.
- **Dejarlo en revisión humana reforzada en el gate.** Rechazada: es el statu quo, es lo
  que produjo las quince discrepancias, y CE-2 exige explícitamente verificación
  automática, no revisión humana.

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
