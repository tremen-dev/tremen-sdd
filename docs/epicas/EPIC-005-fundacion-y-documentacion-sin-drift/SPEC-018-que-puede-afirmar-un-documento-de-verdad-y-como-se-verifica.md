---
id: SPEC-018
tipo: spec
epica: EPIC-005
estado: aprobada
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-07-28, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-28, por: Alberto Fojo}
---
# SPEC-018 — Que puede afirmar un documento de verdad y como se verifica

## Problema

`core/` tiene diez checks vigilándolo; `FOUNDATION.md`, `docs/fundacion/` y
`README.md` no tienen ninguno. RN-08 dice **quién** escribe un documento de verdad,
pero **nada dice qué puede decir**, y el resultado es el inventario cerrado de
EPIC-005: el glosario que define el vocabulario del método describe un repo que ya no
existe.

El impulso natural es escribir el check primero. Sería el error caro: sin criterio,
un verificador de prosa acaba pidiendo que la prosa se escriba para el parser, y
entonces la fundación se vuelve un formulario. ADR-012 fija por qué y qué se persigue
—la taxonomía V/R/P y los tres mecanismos M1/M2/M3—; **esta spec convierte ese ADR en
una regla citable (CE-4) y en un corpus ejecutable con el que la spec del check pueda
hacer TDD real desde el primer RED**. No implementa el check, no corrige ninguna
discrepancia y no reescribe la fundación más allá de añadir la regla.

Hay además un hallazgo que esta spec debe cerrar antes que nada: **la medición sobre
el árbol contradice la intuición de partida**. De las quince afirmaciones falsas, la
validación de referencias cruzadas —la vía que primero se propone— cazaría **cero**:
las 64 citas del corpus resuelven todas. Lo que sí abunda son 17 marcas de volatilidad
contra 11 cifras. El drift de esta documentación no es estructural: es que los
documentos de verdad se estaban usando como informe de estado. La regla tiene que
atacar eso, no los enlaces rotos.

Reglas citadas: RN-01 (rutas vigiladas y rama), RN-04 (ADR inmutable → los ADRs quedan
fuera), RN-05 (lo generado no se edita a mano → por qué la fundación no se genera),
RN-08 (dueño único de los documentos de verdad), RN-09 (nadie aprueba su propio
trabajo), RN-10 (dogfooding).

## Usuarios / roles afectados

- **sdd-arquitecto y sdd-producto** — dueños de los documentos de verdad (RN-08): son
  los primeros obligados por la regla y los que la citan para rechazar una afirmación.
- **sdd-implementador de la spec #2 de EPIC-005** — consumidor directo: el corpus del
  anexo C es su suite de RED antes de escribir una línea del check.
- **sdd-verificador** — gana un criterio citable para rechazar prosa en un gate, en
  vez de una opinión.
- **Quien llega nuevo al repo** — beneficiario final: la fundación deja de mentirle.

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA debe ser verificable con un test. -->

- **CA-1 (la regla existe y es citable)**: Dado ADR-012 aprobado y el anexo A firmado
  en el gate, cuando se aplica el anexo A a `docs/fundacion/reglas.md`, entonces
  existe una entrada `RN-12` con sus tres clases (verificable / remitida / prohibida
  por volátil) y su cláusula de herramienta externa, `node core/scripts/valida.mjs`
  sale en verde, y `node core/scripts/tablero.mjs` no reporta incoherencia.
  *Test*: aserción sobre `reglas.md` de que existe la cabecera `- **RN-12 —` y de que
  el cuerpo contiene las tres clases nombradas; `npm run check` en verde.

- **CA-2 (una afirmación prohibida se rechaza citando la regla — la medida de CE-4)**:
  Dada una afirmación nueva de clase P propuesta para un documento de verdad (caso
  canónico: *"el adaptador de Cursor está en el roadmap"*), cuando se evalúa contra
  RN-12, entonces se rechaza citando la cláusula P **y** el anexo C registra su
  reformulación aceptable en forma R.
  *Test*: el corpus del anexo C contiene ese caso con `veredicto: rechazado`, la
  cláusula citada y la reformulación; el validador del corpus (CA-4) comprueba que
  ambos campos existen y no están vacíos.

- **CA-3 (las quince discrepancias quedan clasificadas, incluidas las que no se cazan)**:
  Dado el inventario cerrado de EPIC-005, cuando se aplica la taxonomía, entonces cada
  afirmación del inventario tiene **exactamente una** clase y **exactamente un**
  mecanismo (M1, M2, M3 o `ninguno`), y las que salen `ninguno` quedan enumeradas como
  residual de revisión humana.
  *Test*: el validador del corpus falla si alguna entrada carece de clase, tiene dos, o
  declara un mecanismo fuera del set cerrado; y el recuento de entradas del corpus
  coincide con el recuento reconciliado en el gate (ver *Notas*, tensión 1).

- **CA-4 (corpus ejecutable, no tabla en prosa)**: Dado que la spec #2 debe hacer TDD,
  cuando se entrega el corpus, entonces existe bajo `tools/tests/fixtures/afirmaciones/`
  un conjunto de **documentos-ejemplo mínimos** y un `casos.json` con el esquema
  declarado en el anexo C, y un test propio (`node --test`) que valida el corpus contra
  ese esquema.
  *Test*: `node --test tools/tests/` pasa; el test falla si se añade un caso sin
  `mecanismo`, sin `veredicto` o sin `mensaje_esperado`.

- **CA-5 (cobertura del corpus: hay RED para cada mecanismo y subclase)**: Dado el
  corpus, cuando se cuentan sus casos, entonces existe **al menos un caso VERDE y uno
  ROJO** para cada uno de: M1-referencia-artefacto, M1-ruta-anclada, M1-ruta-fragmento
  (que debe salir VERDE: no se persigue), M1-plantilla (VERDE), M2-cifra-marcada,
  M2-cifra-sin-marcar (ROJO), M2-enumeración-miembro-que-falta, M2-enumeración-no-miembro
  (el caso *Gemini CLI*), M2-inventario-desconocido (ROJO), M3-marca-volátil,
  M3-exención-explícita (VERDE), y número dentro de un identificador `RN-08` (VERDE: no
  es cifra).
  *Test*: el validador del corpus comprueba la cobertura de esa lista cerrada y falla
  nombrando la casilla vacía.

- **CA-6 (gramática del marcador, cerrada y sin ambigüedad)**: Dado el anexo B, cuando
  la spec #2 implemente el parser, entonces no necesita decidir nada de sintaxis: la
  forma exacta del marcador de cifra, la del marcador de enumeración (con su cierre),
  la de la exención de volatilidad y el ámbito que cada uno abarca están especificados
  con al menos un ejemplo válido y uno inválido cada uno.
  *Test*: cada forma del anexo B aparece como caso en el corpus (uno válido, uno
  inválido); el validador falla si alguna forma no tiene ambos.

- **CA-7 (registro de inventarios con su resolutor)**: Dado el anexo D, cuando se
  consulta, entonces cada inventario declara nombre canónico, resolutor (el artefacto
  del árbol desde el que se calcula) y su cardinalidad **medida y fechada**; y ningún
  resolutor exige conocer un harness concreto salvo los que ADR-011 §2 ya justifica.
  *Test*: para cada inventario del anexo D existe un caso M2 en el corpus; un script de
  un solo uso reproduce la cardinalidad declarada contra el árbol en la fecha de cierre
  y el resultado se pega en el ledger.

- **CA-8 (el coste de autoría queda acotado y medido)**: Dado el corpus documental de
  hoy (`FOUNDATION.md`, `docs/fundacion/`, `README.md`), cuando se enumeran los sitios
  que RN-12 obligará a marcar, entonces la lista está escrita con fichero y enunciado, y
  su tamaño es **≤ 15** (medición del 2026-07-28: **11**). Si al ejercerlo salen más de
  15, se **para** y se escala al gate en vez de marcar en masa.
  *Test*: el recuento reproducible con el escáner de cifras del corpus, pegado en el
  ledger, ≤ 15.

- **CA-9 (elevación, no aplicación unilateral — patrón SPEC-016)**: Dado que
  `docs/fundacion/` es frontera con dueño único (RN-08) y esta spec la toca, cuando se
  implementa, entonces **ninguna escritura sobre `docs/fundacion/` o `FOUNDATION.md`
  ocurre antes de que el gate humano firme el anexo A**, y el ledger registra esa firma
  con fecha y persona antes del commit que modifica `reglas.md`.
  *Test*: `git log --follow docs/fundacion/reglas.md` en la rama muestra que el commit
  que añade RN-12 es posterior a la entrada de firma del ledger; RN-09 se cumple (el
  `por` de la firma es una persona).

- **CA-10 (esta spec no arregla nada de lo que denuncia)**: Dado el inventario cerrado,
  cuando se cierra esta spec, entonces **las quince afirmaciones falsas siguen ahí sin
  tocar** (son trabajo de las specs #3 y #4) y el diff de la rama no modifica
  `docs/adr/`, specs, ledgers, épicas, `core/roles/` ni `site/`.
  *Test*: `git diff main --name-only` no contiene ninguno de esos directorios, y
  contiene `docs/fundacion/reglas.md` únicamente para añadir RN-12.

## Entidades y reglas afectadas

- **ADR-012** (esta spec lo origina y lo consume) — taxonomía V/R/P, mecanismos
  M1/M2/M3, ámbito de documentos gobernados y regla de cobertura obligatoria vs opt-in.
- **ADR-011** — coherencia obligada: los documentos gobernados se **autodescubren**
  bajo `docs/fundacion/` (§1), `README.md` entra como **extra declarado** (§3), el
  registro de inventarios es **enumeración justificada** (§2), la lista de clases y de
  léxico es **cerrada** y nunca derivada del árbol (§4), no se ablanda nada para pasar a
  verde (§5) y el check dirá a quién ha mirado (§6). *Ojo*: hoy solo 2 de 9 checks
  cumplen §6 (F-SPEC-017-3); el check de la spec #2 nace cumpliéndolo, no lo hereda.
- **RN-12 (nueva, anexo A)** — la regla de CE-4. Nueva y no refuerzo de RN-08: RN-08
  gobierna quién escribe, RN-12 qué puede decirse.
- **RN-04** — los ADRs son inmutables y por eso quedan fuera del ámbito; escrito en
  RN-12 para que nadie los "corrija" luego creyendo que se olvidaron.
- **RN-05** — por qué la fundación **no** se genera: un documento generado no se edita
  a mano, y prohibir escribir la constitución no es una opción.
- **Dominio**: *documento de verdad*, *fuente única*, *rutas vigiladas* (`dominio.md`).
  Términos nuevos que RN-12 introduce y que la spec #3 deberá añadir al glosario:
  **afirmación verificable**, **afirmación remitida**, **afirmación prohibida**,
  **marcador de inventario**. Se **elevan**, no se escriben aquí.
- **Restricción heredada de EPIC-003** — toda afirmación sobre una herramienta externa
  se ancla con versión y fecha o se marca como hipótesis. RN-12 la absorbe como su
  cláusula de clase R; deja de ser costumbre y pasa a ser regla citable.

## Fuera de alcance

- **Implementar el check** (`tools/checks/…`, cableado en `tools/check.mjs` y en CI):
  es la spec #2 de EPIC-005. Aquí solo se entrega su corpus de RED.
- **Corregir cualquiera de las quince discrepancias**: specs #3 y #4.
- **Reescribir `dominio.md` con los términos nuevos**: se elevan (ver *Notas*), los
  escribe la spec #3 con el resto del glosario y en un solo pase.
- **`docs/adr/`, specs, ledgers y épicas cerradas**: registro histórico, RN-04.
- **`core/roles/`** (es el método, no su documentación), **`docs/roadmap.md`** (es donde
  la clase P vive legítimamente) y **`site/`** (otro ciclo).
- **Verificar afirmaciones de juicio, intención o pedagogía**: no son falsificables y
  RN-12 las deja explícitamente fuera.
- **Aplicar marcadores a la fundación**: CA-8 los **enumera**; ponerlos es spec #3.

---

## Anexo A — RN-12 propuesta (texto para el gate; NO se aplica sin firma)

> Se añade al final de `docs/fundacion/reglas.md`, con el formato de las demás RN.

- **RN-12 — Un documento de verdad solo afirma lo verificable o lo remitido.** Toda
  afirmación de `FOUNDATION.md`, `docs/fundacion/` y `README.md` pertenece a una de tres
  clases (ADR-012):
  **(a) verificable** — referencia a un artefacto (`RN-NN`, `ADR-NNN`, `SPEC-NNN`,
  `EPIC-NNN`) o ruta anclada desde la raíz del repo; cifra o enumeración de un inventario
  **con su marcador**; o cita literal de un dato de fuente canónica única;
  **(b) remitida a su fuente** — enuncia la forma y **apunta** al artefacto que es
  autoridad, sin reproducir su contenido (el estado de una spec vive en su frontmatter, no
  narrado aquí). Toda afirmación sobre una herramienta externa es de esta clase: se ancla
  con **versión y fecha** o se marca explícitamente como **hipótesis**;
  **(c) prohibida por volátil** — estado de progreso ("aún no", "pendiente", "en curso"),
  futuros ("migrará a", "está en el roadmap"), presentes sin datar ("hoy instalar
  exige…", "por ahora…") y cifras sin marcador. **No se escribe**: vive en la épica,
  spec, ADR, ledger o roadmap que la posee, y desde aquí se toma en forma (b).
  Las afirmaciones de juicio, intención o motivación quedan **fuera** de esta regla y no
  se verifican. Los ADRs, las specs, los ledgers y las épicas quedan fuera del ámbito por
  ser registro histórico inmutable (RN-04).
  Verificable: el check de coherencia docs↔repo de EPIC-005 (CE-2) resuelve las
  referencias, compara cada cifra y enumeración marcada contra su inventario real y falla
  ante una marca de volatilidad sin exención explícita, nombrando fichero, enunciado y
  clase.

*Follow-up asociado*: cuando la spec #2 cree el check, RN-12 se actualiza para nombrar
su ruta (las RN no son inmutables; los ADR sí, RN-04). Se deja sin nombrar ahora a
propósito, para que la regla no cite un fichero inexistente el día que se escribe — que
sería, literalmente, la primera infracción de sí misma.

## Anexo B — Gramática del marcador (cerrada; la spec #2 no decide sintaxis)

Todos los marcadores son **comentarios HTML**: invisibles al renderizar, visibles en el
diff, inertes para cualquier lector de Markdown.

| Forma | Sintaxis | Ámbito que abarca |
|---|---|---|
| Cifra | `<!-- sdd:cifra <inventario> -->` | El **enunciado** que lo contiene o le sigue inmediatamente (frase hasta `.`, o celda de tabla, o ítem de lista) |
| Enumeración | `<!-- sdd:inventario <nombre> -->` … `<!-- /sdd:inventario -->` | El tramo **entre** ambos marcadores |
| Exención de volatilidad | `<!-- sdd:volatil-ok <motivo> -->` | El enunciado que lo contiene o le sigue inmediatamente |

Reglas de la gramática:

1. `<inventario>` debe ser un nombre del registro (anexo D). Un nombre desconocido es
   **ROJO**, nunca verde silencioso.
2. El marcador **nunca lleva el valor esperado** (ADR-012 §2). `<!-- sdd:cifra
   adaptadores=3 -->` es **inválido**: sería una segunda declaración capaz de divergir
   de la prosa en silencio.
3. La cifra se lee de la prosa en **palabra o dígito** (`tres` = `3`). La comparación es
   contra la cardinalidad que devuelve el resolutor.
4. Un número que forma parte de un identificador (`RN-08`, `ADR-011`, `SPEC-017`) **no
   es una cifra**: se excluye antes de escanear.
5. `sdd:volatil-ok` exige `<motivo>` no vacío. Sin motivo es **ROJO**. No existe exención
   global ni por fichero.
6. Un marcador de enumeración sin su cierre es **ROJO**.

Ejemplos (válido / inválido) de cada forma, y los ejemplos negativos de los puntos 2, 4,
5 y 6, van al corpus de CA-4 como casos con su `veredicto` y su `mensaje_esperado`.

**Esquema de `casos.json`** (una entrada por caso):

```
{ "id": "M2-cifra-sin-marcar",
  "mecanismo": "M1|M2|M3|ninguno",
  "clase": "V1|V2|V3|R|P",
  "documento": "<ruta relativa al fixture>",
  "veredicto": "verde|rojo",
  "mensaje_esperado": "<fragmento literal que el error debe contener>",
  "reformulacion": "<solo para casos de clase P: la forma R aceptable>",
  "nota": "<por qué este caso existe>" }
```

## Anexo C — El inventario cerrado, clasificado

Clase y mecanismo de cada afirmación falsa del inventario de EPIC-005. La columna
**Caza** dice si algún mecanismo la detecta; `ninguno` es un residual **declarado**, no
un olvido.

| # | Dónde | Afirmación | Clase | Caza |
|---|---|---|---|---|
| 1 | `README.md` | "Hoy existe el adaptador de **Claude Code**" (hay tres) | V2 enumeración | M2 (marcada) |
| 2 | `README.md` | La distribución "aún no está resuelta: es trabajo de `EPIC-001`" | P | M3 |
| 3 | `README.md` | "los **seis** checks" / "**6** checks" (hay **diez**, no nueve — ver *Notas*, tensión 3) | V2 cifra | M2 (obligatorio) |
| 4 | `README.md` | §Instalación: "hoy la instalación pasa por un build local" | P (enunciado) + procedimiento | M3 caza la frase; **el procedimiento no** → CE-3, spec #4 |
| 5 | `docs/fundacion/contexto.md` | "existen **dos adaptadores**" | V2 cifra | M2 (obligatorio) |
| 6 | `docs/fundacion/contexto.md` | "El destino … es git pre-commit + CI, **aún no implementado**" | P | M3 |
| 7 | `docs/fundacion/dominio.md` | fila `hook`: "que **Claude Code** dispara" (los tres harnesses tienen los suyos) | V2 enumeración | M2 **solo si se marca** (opt-in) |
| 8 | `docs/fundacion/dominio.md` | fila `hook`: "el enforcement duro **migrará** a git+CI" | P | M3 |
| 9 | `docs/fundacion/dominio.md` | fila `adaptador`: "Existen `adapters/claude-code/` y `adapters/kimi-code/`" | V2 enumeración | M2 (marcada) |
| 10 | `docs/fundacion/dominio.md` | fila `harness`: Kimi y opencode "**en el roadmap**" | P | M3 |
| 11 | `docs/fundacion/dominio.md` | fila `harness`: "…**Gemini CLI**…" (no existe en ningún roadmap vigente) | V2 no-miembro | M2 (marcada) — es el caso que justifica la mitad "ningún no-miembro" |
| 12 | `docs/fundacion/dominio.md` | fila `paso de build`: "**Obligatorio** para instalar/dogfoodear" | Procedimiento falso | **ninguno** → revisión humana |
| 13 | `docs/fundacion/dominio.md` | fila `rutas vigiladas`: cita **RN-08** donde corresponde **RN-01** | V1 existente pero equivocada | **ninguno** → revisión humana |

**Detectado al medir, NO presente en el inventario cerrado** (ver *Notas*, tensión 2):

| # | Dónde | Afirmación | Clase | Caza |
|---|---|---|---|---|
| 14 | `FOUNDATION.md` §Alcance | "el adaptador de Claude Code" (singular, hay tres) | V2 enumeración | M2 (marcada) |
| 15 | `FOUNDATION.md` §Alcance | "construir ya los adaptadores de Gemini CLI / **opencode** / Cursor / Codex (…) **no se construyen aún**" — opencode está construido (EPIC-003) | P + no-miembro | M3 |
| 16 | `FOUNDATION.md` §Alcance | "**hoy** instalar exige build local" | P | M3 |
| 17 | `docs/fundacion/vision.md` | "(**Por ahora**) no resuelve la distribución para usuarios finales" | P | M3 |

Recuento por mecanismo sobre las 13 entradas del inventario: **M2 → 6**, **M3 → 5**,
**ninguno → 2**. Sobre las 17 con los hallazgos nuevos: **M2 → 7**, **M3 → 8**,
**ninguno → 2**. **M1 caza cero**, que es el hallazgo que reordena el diseño.

## Anexo D — Registro de inventarios (medido el 2026-07-28)

| Nombre canónico | Resolutor | Cardinalidad hoy |
|---|---|---|
| `adaptadores` | directorios bajo `adapters/` (autodescubrimiento, ADR-011 §1) | 3 |
| `checks` | pasos de `PASOS` en `tools/check.mjs` cuyo script está bajo `tools/checks/`, deduplicados (ya lo deriva `resumen()`) | **10** |
| `roles` | ficheros `core/roles/es/*.md` (excluye `_descripciones.json`) | 7 |
| `reglas` | cabeceras `- **RN-NN —` de `docs/fundacion/reglas.md` | 11 (12 con RN-12) |
| `hooks-<adaptador>` | ficheros `.mjs` bajo `adapters/<adaptador>/hooks/` | por adaptador |
| `harnesses` | alias de `adaptadores` — un adaptador es un harness soportado (`dominio.md`) | 3 |

`checks` y `hooks-<adaptador>` son los que ADR-011 §2 justifica como enumeración: "qué
cuenta como check" no existe sin conocer la estructura del repo. Los demás son
autodescubrimiento puro. **Ningún resolutor deriva prohibiciones del árbol** (ADR-011 §4).

## Notas para el gate humano

1. **El inventario dice "quince" y su lista enumera trece.** La épica habla de quince
   discrepancias; contando las afirmaciones de sus once viñetas salen trece. Es
   exactamente una cifra sin marcador dentro de un documento que denuncia cifras sin
   marcador. **Decide el gate**: se reconcilia el número en la épica (que está fuera del
   ámbito de RN-12 y se puede tocar) o se acepta trece como el recuento real y CA-3 se
   cierra contra trece. No lo he decidido yo.

2. **`FOUNDATION.md` y `vision.md` tienen drift que el inventario cerrado no lista** —
   cuatro afirmaciones más (entradas 14–17 del anexo C), todas de clase P o V2. CE-1
   nombra `FOUNDATION.md` explícitamente, así que **o el inventario de la spec #3 se
   amplía a estas cuatro, o CE-1 no se puede cumplir**. La épica ya previó el caso
   ("corregir un sitio destapa incoherencias en otros") y pidió decidir por adelantado
   si se expande o se reporta: **lo reporto, y recomiendo expandir** — son cuatro
   entradas, ya localizadas, y dejarlas fuera convierte CE-1 en falso.

3. **La épica dice "nueve checks" y hay diez.** Verificando el anexo D contra `PASOS`
   salen **10** checks distintos: `version-unica` entró con SPEC-016 y nadie actualizó
   la cifra. EPIC-005 la repite tres veces y ADR-011 —aprobado anteayer— también. O sea:
   **la cifra envejeció en menos de una semana dentro del documento que denuncia cifras
   envejecidas, y la escribió el mismo rol que firma esta spec.** Consecuencias para el
   gate: (a) es la mejor evidencia disponible de que el problema no es falta de cuidado
   y de que M2 obligatorio está bien calibrado; (b) el `9` de ADR-011 **no se toca**
   (RN-04, y estaba bien el día que se escribió); (c) el `9` de la épica sí conviene
   reconciliarlo, junto con la tensión 1; (d) `README.md` no pasa de 6 a 9 en la spec
   #4, pasa a 10 — y con marcador, o no habremos aprendido nada.

4. **Ninguna de las tres vías caza la cita equivocada pero existente** (entrada 13:
   RN-08 donde va RN-01). Lo digo claro porque es tentador creer que "validar
   referencias cruzadas" cubre ese caso, y no lo hace: comprueba existencia, no
   pertinencia. Esa discrepancia solo la cierra un par de ojos, en la spec #3.

5. **El coste de autoría es 11 marcadores** (CA-8). Si te parece mucho, la palanca no es
   ablandar el check (ADR-011 §5 lo prohíbe) sino **reformular a clase R** el enunciado
   que exige el marcador: "los tres adaptadores" → "los adaptadores de `adapters/`". Esa
   salida es legítima y RN-12 la contempla; conviene que quede dicho en el gate.

6. **Riesgo real de la clase P: puede sonar a censura.** RN-12 no prohíbe hablar del
   estado del proyecto; prohíbe hacerlo **en un documento de verdad**. `docs/roadmap.md`,
   las épicas y los ledgers siguen siendo el sitio, y `contexto.md` —que es "documento
   vivo" por su propio encabezado— es el que más va a sufrir la regla. Si crees que
   `contexto.md` debe quedar **fuera** del ámbito por ser deliberadamente narrativo,
   este es el momento de decirlo: cambia el diseño, no lo rompe.

7. **Marcadores y prosa para el parser.** El compromiso está en ADR-012 y lo repito aquí
   para que se pueda rechazar: el mecanismo solo mira tokens (identificadores, rutas
   ancladas, cardinales, léxico cerrado). Si en la spec #2 aparece la tentación de
   comparar frases, es una desviación del ADR y toca pararla.

8. **Orden recomendado para el resto de EPIC-005**: #2 (check) → #3 (fundación y
   glosario, con las cuatro entradas nuevas y los términos elevados) → #4 (README). El
   riesgo nº1 de la épica dice que invertir #2 y #3 la hace fallar aunque cierre en
   verde; esta spec lo hereda.
