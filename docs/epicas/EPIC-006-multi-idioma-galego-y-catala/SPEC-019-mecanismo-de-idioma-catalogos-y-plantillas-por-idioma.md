---
id: SPEC-019
tipo: spec
epica: EPIC-006
estado: en-revision
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-10-26, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-10-27, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-10-27, por: sdd-implementador}
  - {estado: en-revision, fecha: 2026-10-27, por: sdd-implementador}
---
# SPEC-019 — Mecanismo de idioma, catalogos y plantillas por idioma

## Problema

El campo `idioma` de `.sdd.json` existe, pero solo sirve para elegir el fichero de rol,
y `core/roles/es/` es el único directorio que hay. Los mensajes de los scripts del
núcleo y de los hooks son literales en castellano dentro del código, y las plantillas
viven en una ruta sin dimensión de idioma. Ahora mismo no hay dónde poner una
traducción.

Esta spec construye la parte de **mecanismo** de ADR-013:
- resolución del idioma por proyecto, con fallback silencioso a `es` en los hooks (§2);
- catálogos de mensajes del núcleo y de los adaptadores (§2);
- plantillas por idioma (§1);
- que `valida.mjs` y `sdd-init` rechacen un `idioma` no soportado (§2).

Cubre **CE-4** entero. El check de paridad (CE-3) es SPEC-020, que depende de esta.
**No traduce nada**: al terminar, el árbol sigue teniendo un solo idioma.

Reglas citadas:
- **RN-01 y RN-10**: el trabajo toca rutas vigiladas, así que va en una rama `ft/SPEC-019-…`.
- **RN-02**: los adaptadores usan la función del núcleo, y el núcleo no conoce ningún adaptador.
- **RN-06**: el cuerpo de cada rol sigue teniendo fuente única por idioma.
- **RN-08**: esta spec no edita documentos de verdad (ver Dependencias).

## Usuarios / roles afectados

- **Proyectos `es` o sin `idioma`**: no deben notar nada (CE-4).
- **Proyectos con un `idioma` no soportado**: `valida.mjs` falla nombrándolo, y
  `sdd-init` se niega a crearlos.
- **Proyectos futuros gl/ca**: reciben el mecanismo; el contenido llega en specs
  posteriores.
- **sdd-implementador de SPEC-020 y de las specs de contenido**: trabaja sobre el
  formato de catálogo y la disposición de conjuntos que fija esta spec.

## Criterios de aceptación

Convenciones de los tests:
- **"Fixture `zz`"** es un idioma sintético. Se crea en un árbol temporal (copia del
  repo o del núcleo), nunca en el árbol real.
- Sus textos se distinguen de los de `es`; por ejemplo, el texto `es` con el prefijo
  `[zz] `.
- Los tests de adaptador ejercen el artefacto construido (`dist/` o un build temporal),
  como hace hoy la suite.

### Resolución y catálogos (CE-4, ADR-013 §2)

- **CA-1 — Resolución del idioma.** Dado un proyecto temporal, cuando la función de
  resolución del núcleo se invoca con cada uno de estos `.sdd.json`, devuelve:

  | Caso | `.sdd.json` | Devuelve |
  |---|---|---|
  | (a) | no existe el fichero | `es` |
  | (b) | existe, sin campo `idioma` | `es` |
  | (c) | `"idioma": "es"` | `es` |
  | (d) | `"idioma": "zz"`, con `core/roles/zz/` presente en el núcleo de la fixture | `zz` |
  | (e) | `"idioma": "eu"`, sin conjunto | `es` |
  | (f) | JSON corrupto | `es` |

  En ningún caso lanza una excepción ni escribe en stdout o stderr.
- **CA-2 — Catálogo con fallback por clave.** Dados un catálogo `es` y otro `zz`, en el
  que falta la clave `k2`:
  - Pedir `k1` en `zz` devuelve el texto `zz` con sus `{variables}` interpoladas.
  - Pedir `k2` en `zz` devuelve el texto `es`.
  - Pedir una clave que no existe en `es` lanza un error que nombra la clave.

  Ningún catálogo bajo `core/` contiene la secuencia `${`, y `nucleo-agnostico` sigue
  en verde.
- **CA-3 — Extracción literal de `es` (golden).** Antes de refactorizar, el
  implementador captura en tests golden **todos** los textos que se emiten hoy, uno por
  cada rama de error o de éxito. Los emisores son:
  - los scripts `estado.mjs`, `valida.mjs`, `scaffold.mjs`, `tablero.mjs` e `informe-qa.mjs`;
  - `core/lib/require-spec.mjs`;
  - los hooks de Claude Code `require-spec`, `protege-verdad` y `calidad`;
  - los hooks de Kimi Code `require-spec` y `protege-verdad`;
  - el plugin de opencode.

  Los commits muestran el golden **antes** que el refactor. Con el código ya
  refactorizado, se ejecutan los golden en un proyecto `es` y en otro sin `idioma`:
  - Cada texto es **byte a byte** igual al capturado.
  - `git diff` sobre los tests que ya existían no elimina ni cambia ninguna aserción
    sobre el texto de un mensaje.
- **CA-4 — Artefactos generados idénticos en `es`.** Dado este repo:
  - `renderBoard('docs', <fecha fija>)` da la misma salida antes y después del cambio.
  - `scaffold.mjs` crea una épica, una spec (con su ledger), una task y un ADR en un
    proyecto `es` temporal. Los ficheros son byte a byte iguales a los de la versión
    anterior, con los mismos argumentos y la misma fecha.
  - `informe-qa` sigue emitiendo `<html lang="es">`.
- **CA-5 — El idioma llega a cada emisor.** Dado un árbol temporal con la fixture `zz`
  (conjuntos en las tres raíces del núcleo, en `adapters/claude-code/mensajes/` y en
  `adapters/kimi-code/mensajes/`) y un proyecto con `"idioma": "zz"`, cada una de estas
  salidas sale en su versión `zz`:
  - (a) una transición ilegal de `estado.mjs` y una firma inválida;
  - (b) un error de `valida.mjs`;
  - (c) el `motivo` de denegación de `require-spec`, a través del hook de Claude Code,
    del de Kimi Code y del plugin de opencode;
  - (d) las dos denegaciones de `protege-verdad`, en Claude Code y en Kimi Code;
  - (e) el prefijo de `calidad`;
  - (f) la cabecera, las etiquetas y las cabeceras de tabla del tablero generado;
  - (g) el `lang` del informe QA;
  - (h) los artefactos de `scaffold.mjs`, que salen de `core/templates/zz/artefactos/`.

  En ningún caso cambian los identificadores de ADR-013 §4: el tablero `zz` sigue
  diciendo `aprobada` y `SPEC-NNN`.

### Idioma no soportado (ADR-013 §2)

- **CA-6 — `valida.mjs` falla ante un `idioma` no soportado.** Dado un proyecto temporal
  con artefactos válidos, cuando se ejecuta `valida.mjs` sobre su `docs/`, el resultado
  depende del `.sdd.json`:

  | Caso | `.sdd.json` | Resultado |
  |---|---|---|
  | (a) | `"idioma": "eu"` | sale con código distinto de 0 |
  | (b) | `"idioma": 5` (no es una cadena) | sale con código distinto de 0 |
  | (c) | `"idioma": "es"` | código 0, salida idéntica a la de hoy |
  | (d) | sin campo `idioma` | código 0, salida idéntica a la de hoy |
  | (e) | no existe el fichero | código 0, salida idéntica a la de hoy |
  | (f) | `"idioma": "zz"`, con la fixture `zz` | código 0 |

  En (a) y (b), el error nombra el valor declarado y la lista de idiomas soportados
  (derivada de `core/roles/`). Si además hay errores de artefactos, se informan todos
  en la misma ejecución.

  `validateFile`, que usan el hook `calidad` y el pre-commit, no cambia: los hooks
  siguen en silencio ante el idioma.
- **CA-7 — `sdd-init` no acepta ni genera un `idioma` no soportado.** Dados los comandos
  `sdd-init` de Claude Code y de opencode, un test sobre su prosa comprueba que:
  - (a) ofrecen como idiomas los subdirectorios de `core/roles/`, y no una lista fija;
  - (b) se niegan a escribir un `.sdd.json` con un idioma fuera de esa lista, y vuelven
    a preguntar;
  - (c) en modo migración, si el `.sdd.json` existente declara un idioma no soportado,
    lo señalan y piden elegir uno soportado antes de copiar plantillas.

  Además, el `idioma` de `core/templates/sdd.json` es un idioma soportado.

### Plantillas por idioma (ADR-013 §1)

- **CA-8 — Plantillas en `core/templates/es/`.** Dado el árbol tras el cambio:
  - `core/templates/es/` contiene exactamente los ficheros que antes colgaban de
    `core/templates/`, salvo `sdd.json`, con el mismo contenido. `git diff -M` los
    muestra como renombrados al 100 %.
  - `core/templates/sdd.json` sigue donde está.
  - Ningún fichero bajo `core/`, `adapters/` ni `tools/` cita las rutas antiguas, y
    `referencias` y `layout` siguen en verde.
  - Los `sdd-init` de Claude Code y de opencode copian desde
    `core/templates/<idioma>/`.

### No regresión

- **CA-9 — Sin regresión ni contenido.** Dado el árbol tras el cambio:
  - `npm test` y `npm run check` pasan.
  - `package.json` no gana dependencias.
  - No existe ningún directorio `gl/` ni `ca/` bajo `core/` ni `adapters/`.

## Entidades y reglas afectadas

- **ADR-013**: esta spec implementa §1 y §2. §3–§5 son de SPEC-020, y §0 y §6 de otras
  specs.
- **ADR-004**: `${…}` sigue reservado a `${SDD_*}` bajo `core/`. La interpolación de
  los catálogos usa `{…}`.
- **ADR-011**: las raíces del núcleo se enumeran y las de adaptador se autodescubren.
- Términos de `docs/fundacion/dominio.md`: núcleo, adaptador, harness, rol, hook,
  tablero, frontmatter, máquina de estados. Los términos nuevos se proponen en el
  anexo B de SPEC-020.

## Dependencias y coordinación

- **SPEC-020 depende de esta spec**: el check de paridad se escribe sobre el formato de
  catálogo y la disposición de conjuntos que esta spec deja hechos.
- **Spec #3 de EPIC-005**: le corresponde la edición textual del Alcance de
  `FOUNDATION.md` y de `vision.md` (ADR-013 §0). También le corresponden las dos citas
  de rutas de plantilla que cambian con CA-8: la fila `tarea` de
  `docs/fundacion/dominio.md` (`core/templates/artefactos/TASK.md`) y
  `README.md` §plantillas. Esta spec **no las toca**.
  - Mientras tanto, esas dos citas apuntan a la ruta antigua.
  - Si el check M1 de EPIC-005 (su spec #2) entra antes que la spec #3, la cita de
    `dominio.md` le dará un rojo legítimo. El orden de merge tiene que tenerlo en cuenta.
- **`tools/check.mjs`**: esta spec no añade pasos. El roce con la spec #2 de EPIC-005
  lo tiene SPEC-020.

## Fuera de alcance

- El check de paridad, los sellos, `prosa-gates` por idioma y los gatillos: son SPEC-020.
- Cualquier contenido gl o ca.
- Editar `FOUNDATION.md`, `vision.md`, `dominio.md` o `README.md`.
- Traducir los bootstraps, la `corta`, la prosa de `sdd-init` y los mensajes de
  `tools/` (ADR-013 §2–§3).
- Señalar el idioma no soportado en los hooks: siguen en silencio, por decisión
  del gate.
- `sdd-init` en Kimi Code: no tiene ese comando.
- Migrar el idioma de un proyecto existente, mezclar idiomas, y otros idiomas.

## Notas para el gate humano

1. **Partida en dos por decisión del gate** (2026-10-27): esta spec cubre el mecanismo
   (CE-4) y SPEC-020 la paridad (CE-3).
2. **CA-6: fallo, no aviso.**
   - El fallback a `es` es silencioso en todos los demás sitios, así que `valida.mjs` es
     el único punto donde el error se ve.
   - Un aviso con código 0 lo ignoran los agentes y la automatización, que se guían por
     el código de salida.
   - Un `idioma` no soportado nunca es legítimo: `sdd-init` no lo genera. Solo aparece
     editando `.sdd.json` a mano, y el arreglo es una línea. El fallo no puede dar un
     falso positivo en un proyecto bien creado.
   - El fallo se limita al CLI de `valida.mjs`. No toca `validateFile`, así que no
     bloquea commits ni hace hablar a los hooks.
3. **CA-7 se verifica sobre prosa**: `sdd-init` lo ejecuta un LLM. La evidencia de
   comportamiento real llega con el pipeline en gl (CE-1).
