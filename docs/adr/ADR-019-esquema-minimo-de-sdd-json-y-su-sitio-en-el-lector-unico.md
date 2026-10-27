---
id: ADR-019
tipo: adr
estado: borrador
historial:
  - {estado: borrador, fecha: 2026-10-27, por: sdd-arquitecto}
---
# ADR-019: Esquema minimo de sdd-json y su sitio en el lector unico

- Deciders: propone sdd-arquitecto; aprueba Alberto Fojo (pendiente, gate humano de
  SPEC-029). El 2026-10-27, en el gate de SPEC-027, Alberto Fojo pidió una spec propia
  para el esquema.
- Specs relacionadas: **SPEC-029** (EPIC-FIX) lo materializa. Construye sobre:
  - **ADR-017**, aprobado: el lector único con tres estados. ADR-017 matiza ADR-002 y no
    lo supersede, por decisión del humano del 2026-10-27;
  - **ADR-016** §2: `idioma` no soportado.

  **No supersede** ningún ADR (RN-04). Amplía lo que ADR-017 cuenta como `ilegible`,
  sin cambiar lo que ADR-017 decide.

## Contexto

ADR-017 cierra los gates cuando `.sdd.json` no se puede leer o no es un objeto JSON.
Pero un objeto JSON con campos mal tipados pasa como `valida`, y entonces:
- **`rutasVigiladas` no es un array** (por ejemplo `"src/"`), o tiene elementos que no
  son strings: require-spec lanza dentro de su `try` al hacer `.map` o `.replaceAll`, y
  el `catch` deja pasar. Es fail-open, el caso conocido. En el pre-commit, el mismo error
  sale como "Error inesperado en el gate", que bloquea pero no dice qué está mal.
- **`linter` es un valor desconocido** (`"biome"`) o no es un string: `calidad` no
  encuentra comando y no lintea, sin avisar. También es fail-open.
- **`gates` no es un objeto, o un interruptor no es booleano** (`"requireSpec":
  "false"`): el gate sigue activo, porque solo `=== false` lo apaga. No abre un agujero,
  pero hace lo contrario de lo que el fichero declara y no lo dice.
- **`idioma` no es un string** (`42`): el resolutor de ADR-016 da `es` sin avisar.
  ADR-016 solo trata el caso de un string no soportado.

Los campos que el método lee hoy son exactamente esos cuatro: `idioma`,
`rutasVigiladas`, `linter` y `gates.{requireSpec, protegeVerdad, calidad}`. Lo confirma
una búsqueda de usos de `cfg.` en hooks, plugins, pre-commit y núcleo.

## Decisión

### 1. El esquema mínimo

Un campo ausente toma su valor por defecto, como hoy. Un campo presente debe tener este
tipo, y `null` cuenta como tipo equivocado:

| Campo | Tipo exigido |
|---|---|
| `idioma` | string. Que el idioma esté soportado no es del esquema: lo decide ADR-016 |
| `rutasVigiladas` | array de strings no vacíos. El array vacío vale: no se vigila nada |
| `linter` | uno de `auto`, `none`, `ruff`, `eslint`, `dart`, los valores que entiende `calidad` |
| `gates` | objeto |
| `gates.requireSpec`, `gates.protegeVerdad`, `gates.calidad` | booleano |

Las claves desconocidas, en la raíz o dentro de `gates`, **se aceptan**. Así un proyecto
puede llevar campos de una versión más nueva del plugin, o anotaciones propias, sin
quedarse bloqueado.

### 2. Un esquema inválido es `ilegible`, no un cuarto estado

El lector de ADR-017 sigue devolviendo tres estados. Un objeto que no cumple §1 devuelve
`ilegible`, y su motivo enumera **todos** los campos que fallan, cada uno con lo que
esperaba y lo que encontró.

Motivo: para todos los consumidores (hooks, pre-commit, `valida.mjs`) la consecuencia es
idéntica. La configuración declarada no se puede aplicar tal como está escrita, así que
se cierra. Un cuarto estado obligaría a cada consumidor a tratarlo y reabriría la
posibilidad de que alguno lo trate como `valida`. ADR-017 no se reescribe: este ADR
amplía qué entra en `ilegible`, y el comportamiento por capa de ADR-017 §2 se aplica sin
cambios.

La salida es uniforme. Un `linter` mal escrito deniega las escrituras igual que un
`rutasVigiladas` roto. Es un solo predicado, el mensaje dice el campo exacto, se arregla
en una línea y la escritura del propio `.sdd.json` sigue permitida (ADR-017 §2).

### 3. El esquema vive en el lector, como dato

El esquema se declara una sola vez, como dato, en el mismo módulo de `core/lib/` que el
lector de ADR-017. No se duplica en ningún consumidor. `valida.mjs` usa ese lector para
su comprobación de `.sdd.json`, así que CI ve los mismos errores que los hooks.

### 4. Encaje con ADR-016 para `idioma`

- `idioma` que no es string: es error de esquema, el fichero es `ilegible` y los gates se
  cierran.
- `idioma` string no soportado: el esquema es válido. Se aplica ADR-016 tal cual: hooks
  y scripts en `es`, sin avisar, y `valida.mjs` falla.
- Cuando hay errores de esquema, `valida.mjs` los informa todos, y también el `idioma`
  no soportado si lo hay.

## Consecuencias
### Positivas
- Ningún campo mal tipado de los que lee el método termina en fail-open, ni en un error
  genérico sin nombre.
- Una sola definición del esquema, que se puede leer y probar.
- Los cinco consumidores de ADR-017 se benefician sin cambiar su código.

### Negativas / follow-ups
- **Campo nuevo**: si una spec futura añade un campo a `.sdd.json`, debe añadirlo al
  esquema en el mismo cambio. Si no, nadie comprobará su tipo. SPEC-029 CA-5 lo vigila
  con un test que compara los campos leídos por los consumidores con los del esquema.
- **Más estricto con el linter**: un `linter` que hoy se ignora en silencio (`"biome"`)
  pasa a bloquear. Es intencionado: hoy da una falsa sensación de que se lintea.
- **Proyectos ya existentes**: un `.sdd.json` mal tipado que hoy "funciona" se cierra al
  actualizar el plugin. Lo dice el CHANGELOG (CE-FIX-2).

## Alternativas consideradas
- **Un cuarto estado `invalida`**. Rechazada: el comportamiento sería el mismo que el de
  `ilegible`, y cada consumidor tendría una rama más donde equivocarse (§2).
- **Degradar por campo**: con un `linter` malo solo se apaga calidad; con un `gates`
  malo, se usan los valores por defecto. Rechazada: vuelve a meter fail-open selectivo,
  multiplica los casos y los tests, y deja trabajar con una configuración que no dice lo
  que el fichero pretende.
- **Rechazar las claves desconocidas.** Rechazada: bloquearía proyectos con un plugin
  más viejo que su `.sdd.json`, y anotaciones inocuas.
- **JSON Schema con una librería de validación.** Rechazada: el repo no tiene
  dependencias, y cuatro campos no la justifican.
- **Validar solo `rutasVigiladas`, el caso conocido.** Rechazada: `linter` tiene el
  mismo fail-open, e `idioma` y `gates` la misma clase de silencio.

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
