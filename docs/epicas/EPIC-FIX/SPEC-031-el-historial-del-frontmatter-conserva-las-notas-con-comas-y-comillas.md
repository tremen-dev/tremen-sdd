---
id: SPEC-031
tipo: spec
epica: EPIC-FIX
estado: aprobada
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-11-26, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-11-26, por: Alberto Fojo}
---
# SPEC-031 — El historial del frontmatter conserva las notas con comas y comillas

## Problema

`estado.mjs` reescribe el frontmatter entero en cada transición (RN-07). Al hacerlo
corrompe las entradas del `historial` cuyos valores llevan comas: lo observó artica el
2026-10-18 (entrada 11 de `docs/mejoras-propuestas.md`). Una entrada como esta:

```
- {estado: en-progreso, fecha: 2026-10-18, por: sdd-verificador, nota: "refinación tras CA-1; CA-10, CA-11 y CA-12 nuevos"}
```

se cortó en la primera coma de dentro de las comillas y quedó una comilla sin cerrar. El
verificador tuvo que arreglar la línea a mano antes del commit. La causa está en
`core/lib/frontmatter.mjs`:
- `parseValue` parte el objeto inline con `split(',')` sin tener en cuenta las comillas;
- `inline` escribe los valores tal cual, así que un valor con `,`, `:`, `{` o `}` tampoco
  sobreviviría a la vuelta aunque el parseo fuera correcto.

El defecto sigue vivo en la fuente. Es un fix (defecto observado en uso real), no una
mejora: rompe el historial, que es append-only y la fuente de verdad del estado (RN-07).

## Usuarios / roles afectados

- **Quien escribe una `nota` en el historial**, a mano o desde un rol: deja de perderla en
  la siguiente transición.
- **sdd-verificador y sdd-implementador**: las transiciones que ejecutan con `estado.mjs`
  dejan de romper líneas del historial que ya existían.
- **sdd-implementador**: implementa los CA en `ft/SPEC-031-…`, con TDD.

## Criterios de aceptación

Convenciones de los tests:
- «Parsear» es `parseFrontmatter` y «serializar» es `stringifyFrontmatter`, de
  `core/lib/frontmatter.mjs`. Sus firmas no cambian.
- «Objeto inline» es un elemento de lista de la forma `{clave: valor, …}`, como las
  entradas del `historial`.
- Directorios temporales y fixtures, salvo en CA-4, que lee el repo sin escribirlo.

### CA-1 — El parseo respeta las comillas dentro de un objeto inline
- **Given**: un frontmatter con un `historial` cuyas entradas tienen una `nota` así:

  | Caso | `nota` tal como está en el fichero | Valor parseado de `nota` |
  |---|---|---|
  | (a) | `"CA-10, CA-11 y CA-12"` | `CA-10, CA-11 y CA-12` |
  | (b) | `"ver CA-1: refutada"` | `ver CA-1: refutada` |
  | (c) | `"llaves {dentro} y fin }"` | `llaves {dentro} y fin }` |
  | (d) | `"dijo \"vale\", y siguió"` | `dijo "vale", y siguió` |
  | (e) | `"barra \\ invertida"` | `barra \ invertida` |
  | (f) | `'simples, con ''apóstrofo'' dentro'` | `simples, con 'apóstrofo' dentro` |
  | (g) | `sin comillas ni nada raro` | `sin comillas ni nada raro` |

- **When**: se parsea.
- **Then**:
  1. Cada entrada es un objeto con exactamente las claves `estado`, `fecha`, `por` y `nota`.
  2. `estado`, `fecha` y `por` tienen su valor, sin cambios respecto a hoy.
  3. `nota` tiene el valor de la última columna: sin las comillas exteriores y con las
     secuencias de escape resueltas (`\"` y `\\` entre comillas dobles; `''` entre
     simples).
  4. Las entradas sin comillas que ya funcionan hoy (por ejemplo
     `{estado: aprobada, fecha: 2026-11-26, por: Alberto Fojo}`) parsean igual que hoy.

### CA-2 — Serializar entrecomilla solo lo que lo necesita
- **Given**: objetos de historial con `nota` igual a cada valor parseado de CA-1, y la
  entrada `{estado: aprobada, fecha: 2026-11-26, por: Alberto Fojo}`.
- **When**: se serializan.
- **Then**:
  1. Un valor que contiene `,`, `:`, `{`, `}`, `"`, o que empieza por `'`, o que empieza o
     termina con espacio, se escribe entre comillas dobles, escapando `\` y `"`.
  2. Cualquier otro valor se escribe tal cual, como hoy. La entrada de Alberto Fojo sale
     byte a byte igual.
  3. Ida y vuelta: parsear lo serializado devuelve los mismos objetos, para los casos
     (a)–(g) de CA-1.
  4. Doble ida y vuelta: serializar, parsear y volver a serializar da el mismo texto que
     la primera serialización.

### CA-3 — Una transición no estropea las entradas anteriores
- **Given**: una spec de fixture en `aprobada`, aprobada por una persona, cuyo `historial`
  tiene una entrada con la `nota` de cada caso (a)–(e) de CA-1, escrita en la forma que
  produce la serialización de CA-2.
- **When**: se ejecuta el CLI de `estado.mjs <spec> en-progreso --por sdd-implementador`.
- **Then**:
  1. Sale con código 0 y añade la entrada de `en-progreso` al final del historial.
  2. Todas las líneas del frontmatter que había antes siguen igual, byte a byte.
  3. `valida.mjs` sobre el proyecto temporal sale con código 0.

### CA-4 — Los artefactos del repo no cambian al reescribirse
- **Given**: todos los ficheros `.md` bajo `docs/` con seguimiento en git y con frontmatter
  (épicas, specs, ADR, ledgers, tareas).
- **When**: un test parsea y serializa cada uno, en memoria, sin escribir nada.
- **Then**:
  1. Para cada fichero con saltos de línea LF, el texto serializado es idéntico, byte a
     byte, al del fichero.
  2. Para cada fichero con saltos CRLF, el texto es idéntico tras normalizar los saltos
     de línea a LF. Los CRLF son la entrada 10, fuera de esta spec.
  3. El test lista, si falla, qué ficheros y qué líneas cambian.

### CA-5 — Sin regresión
- **Given**: el árbol tras el cambio.
- **When**: se ejecutan `npm test`, `npm run check` y `node core/scripts/valida.mjs`.
- **Then**:
  1. Los tres pasan en verde.
  2. Los tests que ya existían de `frontmatter`, `estado`, `valida` y `tablero` pasan sin
     cambiar sus aserciones.
  3. `CHANGELOG.md` tiene una entrada que dice qué se rompía (notas del historial con
     comas o dos puntos), desde cuándo y que no hace falta hacer nada para actualizar.
     Las líneas ya rotas por el defecto no se reparan solas (CE-FIX-2).

## Entidades y reglas afectadas

- **RN-07**: el historial lo escribe `estado.mjs` y es append-only. Este fix hace que
  esa garantía también se cumpla para las entradas que ya existían.
- `core/lib/frontmatter.mjs`, el YAML restringido del núcleo. Lo usan `estado.mjs`,
  `valida.mjs`, `tablero.mjs`, `informe-qa.mjs` y `core/lib/require-spec.mjs`. Ninguno
  cambia.
- Términos de `docs/fundacion/dominio.md`: frontmatter, máquina de estados.

## Fuera de alcance

Aparcado a propósito, no por descuido:
- **Valores escalares de primer nivel** (`clave: "valor"`): siguen como hoy. Solo cambian
  los valores dentro de un objeto inline, donde vive el defecto.
- **Una opción `--nota` en `estado.mjs`**: hoy las notas se escriben a mano. Añadirla es
  una mejora, no este fix.
- **Que `valida.mjs` avise de comillas desparejadas** en el frontmatter (lo proponía la
  entrada 11). Detectaría líneas ya rotas, pero no hace falta para que el defecto deje de
  ocurrir. Si el humano lo quiere, es un CA más en esta spec o un follow-up.
- **Reparar historiales ya corrompidos** en otros proyectos.
- **Saltos de línea CRLF** (entrada 10): `stringifyFrontmatter` escribe LF, como hoy.
- **Las plantillas con `{{ID}}`**: el parser lee `{{ID}}` como un objeto inline. No pasa
  nada porque `scaffold.mjs` sustituye los marcadores antes de parsear, y esta spec no lo
  cambia.

## Notas para el gate humano

- **Es mínima a propósito**: un tokenizador que respete comillas dentro de `{…}`, y
  comillas al serializar solo cuando hacen falta. Ningún consumidor cambia de código.
- **Qué puede cambiar en un fichero existente**: nada en este repo (CA-4 lo comprueba
  sobre todos los artefactos de `docs/`; hoy ninguno lleva `nota`). En otro proyecto, una
  `nota` entrecomillada sin caracteres especiales (`nota: "simple"`) se reescribiría sin
  comillas en la siguiente transición. El valor es el mismo; cambia el texto.
- **Independiente de EPIC-008**: SPEC-030 también toca `estado.mjs`, pero en otro sitio
  (la guarda de `hecho`). El orden de merge da igual.
