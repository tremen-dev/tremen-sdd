---
id: SPEC-025
tipo: spec
epica: EPIC-007
estado: en-revision
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-10-27, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-10-27, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-10-27, por: sdd-implementador}
  - {estado: en-revision, fecha: 2026-10-27, por: sdd-implementador}
---
# SPEC-025 — Mecanismo de idioma, catalogos y plantillas por idioma

> **Procedencia (renumeración, 2026-10-27).** Esta spec se aprobó primero como
> **SPEC-019** en la rama `ft/SPEC-019-mecanismo-de-idioma-catalogos-y-plantillas-por-idioma`,
> que no llegó a mergearse.
>
> - Su historial era: `borrador` (2026-10-26, sdd-arquitecto) → `aprobada` (2026-10-27,
>   Alberto Fojo) → `en-progreso` → `en-revision` → `hecho` (2026-10-27, sdd-verificador).
>   El veredicto GREEN está en el commit `23bbd87` y el último estado en `dc66b00`.
> - Mientras tanto, `main` ocupó SPEC-019 a SPEC-024, añadió el adaptador antigravity
>   (EPIC-006, ADR-013) y la barrera de activación de SPEC-024 (ADR-015).
> - Este texto cambia frente a aquel: cuarto adaptador, raíz unificada, `.sdd.json`
>   ilegible y prosa de los bootstraps. Además, el GREEN se dio contra un `main` que ya no
>   existe. Por eso no hereda ni la aprobación ni el `hecho`.
> - Es un artefacto nuevo, creado con `scaffold.mjs` en `borrador`. No se reescribió
>   ningún historial: el de SPEC-019 sigue en git.
> - El código de aquella ronda se queda en la rama y se reutiliza. Ver el ledger.

## Problema

El campo `idioma` de `.sdd.json` existe, pero solo sirve para elegir el fichero de rol,
y `core/roles/es/` es el único directorio que hay. Los mensajes de los scripts del
núcleo y de los hooks son literales en castellano dentro del código, y las plantillas
viven en una ruta sin dimensión de idioma. Ahora mismo no hay dónde poner una
traducción.

Esta spec construye la parte de **mecanismo** de ADR-016:
- resolución del idioma por proyecto, con fallback silencioso a `es` en los hooks. Usa
  la raíz de proyecto de ADR-015, `buscarRaizSdd`, sin duplicarla (§2);
- catálogos de mensajes del núcleo y de los adaptadores (§2);
- plantillas por idioma (§1);
- que `valida.mjs` y `sdd-init` rechacen un `idioma` no soportado, y que `valida.mjs`
  rechace también un `.sdd.json` ilegible (§2);
- que los bootstraps de los cuatro adaptadores usen `es` cuando el idioma declarado no
  tiene roles (§2).

Cubre **CE-4** entero. El check de paridad (CE-3) es SPEC-026, que depende de esta.
**No traduce nada**: al terminar, el árbol sigue teniendo un solo idioma.

Reglas citadas:
- **RN-01 y RN-10**: el trabajo toca rutas vigiladas, así que va en una rama `ft/SPEC-025-…`.
- **RN-02**: los adaptadores usan la función del núcleo, y el núcleo no conoce ningún adaptador.
- **RN-03**: el pre-commit sigue sin depender del harness.
- **RN-06**: el cuerpo de cada rol sigue teniendo fuente única por idioma.
- **RN-08**: esta spec no edita documentos de verdad (ver Dependencias).

## Usuarios / roles afectados

- **Proyectos `es` o sin `idioma`**: no deben notar nada (CE-4).
- **Proyectos con un `idioma` no soportado o un `.sdd.json` ilegible**: `valida.mjs`
  falla y lo nombra; `sdd-init` se niega a crear un proyecto con un idioma no soportado.
- **Proyectos futuros gl/ca**: reciben el mecanismo; el contenido llega en specs
  posteriores.
- **sdd-implementador de SPEC-026 y de las specs de contenido**: trabaja sobre el
  formato de catálogo y la disposición de conjuntos que fija esta spec.

## Criterios de aceptación

Convenciones de los tests:
- **"Fixture `zz`"** es un idioma sintético. Se crea en un árbol temporal (copia del
  repo o del núcleo), nunca en el árbol real.
- Sus textos se distinguen de los de `es`; por ejemplo, el texto `es` con el prefijo
  `[zz] `.
- Los tests de adaptador ejercen el artefacto construido (`dist/` o un build temporal),
  como hace hoy la suite.
- Todo fixture que invoque un CLI del núcleo lleva `.sdd.json` en su raíz (ADR-015,
  Negativas), salvo los casos que prueban precisamente su ausencia.
- "Los cuatro adaptadores" son los que existen bajo `adapters/` al aprobarse esta spec:
  claude-code, kimi-code, opencode y antigravity.

### Resolución y catálogos (CE-4, ADR-016 §2)

- **CA-1 — Resolución del idioma sobre la raíz de ADR-015.** Dado un proyecto temporal,
  cuando la función de resolución del núcleo se invoca desde una ruta objetivo, devuelve:

  | Caso | Situación | Devuelve |
  |---|---|---|
  | (a) | no hay `.sdd.json` (raíz nula; solo la API programática llega aquí) | `es` |
  | (b) | `.sdd.json` sin campo `idioma` | `es` |
  | (c) | `"idioma": "es"` | `es` |
  | (d) | `"idioma": "zz"`, con `core/roles/zz/` presente en el núcleo de la fixture | `zz` |
  | (e) | `"idioma": "eu"`, sin conjunto | `es` |
  | (f) | JSON corrupto | `es` |
  | (g) | la ruta objetivo es un subdirectorio y `.sdd.json` (`zz`) está en un ancestro dentro del mismo repo | `zz` |
  | (h) | hay un `.git` sin `.sdd.json` entre la ruta objetivo y un `.sdd.json` (`zz`) más arriba | `es`: la búsqueda corta en `.git`, igual que `buscarRaizSdd` |

  En ningún caso lanza una excepción ni escribe en stdout o stderr. El caso (h) es el
  que distingue una búsqueda propia de la de ADR-015. Además, la raíz que usa la
  resolución es, en todos los casos, la que devuelve `buscarRaizSdd` de
  `core/lib/entrypoint.mjs` para la misma ruta: el test compara las dos.
- **CA-2 — Catálogo con fallback por clave.** Dados un catálogo `es` y otro `zz`, en el
  que falta la clave `k2`:
  - Pedir `k1` en `zz` devuelve el texto `zz` con sus `{variables}` interpoladas.
  - Pedir `k2` en `zz` devuelve el texto `es`.
  - Pedir una clave que no existe en `es` lanza un error que nombra la clave.

  Ningún catálogo bajo `core/` contiene la secuencia `${`, y `nucleo-agnostico` sigue
  en verde.
- **CA-3 — Extracción literal de `es` (golden).** El golden contiene **todos** los textos
  que emite el **código base**, uno por cada rama de error o de éxito. El código base es
  `origin/main` en el punto de integración de esta rama, y su hash queda en el ledger.
  Los emisores son:
  - los scripts `estado.mjs`, `valida.mjs`, `scaffold.mjs`, `tablero.mjs` e
    `informe-qa.mjs`, incluido el mensaje de la barrera `exigirProyectoSdd` que emiten
    sus CLI sin `.sdd.json`;
  - `core/lib/require-spec.mjs`;
  - los hooks de Claude Code `require-spec`, `protege-verdad` y `calidad`;
  - los hooks de Kimi Code `require-spec` y `protege-verdad`;
  - los hooks de antigravity `require-spec`, `protege-verdad` y `calidad`;
  - el plugin de opencode.

  El golden es fiel al código base: el verificador lo ejecuta en un worktree de ese
  commit y pasa. Con el código refactorizado, se ejecuta el golden en un proyecto `es`,
  en otro sin `idioma` y, para la barrera, en otro sin `.sdd.json`:
  - Cada texto es **byte a byte** igual al capturado.
  - `git diff` de los tests que ya existían en el código base no elimina ni cambia
    ninguna aserción sobre el texto de un mensaje. Eso incluye los de SPEC-024.
- **CA-4 — Artefactos generados idénticos en `es`.** Dado este repo:
  - `renderBoard('docs', <fecha fija>)` da la misma salida antes y después del cambio.
  - `scaffold.mjs` crea una épica, una spec (con su ledger), una task y un ADR en un
    proyecto `es` temporal con `.sdd.json`. Los ficheros son byte a byte iguales a los
    del código base, con los mismos argumentos y la misma fecha.
  - `informe-qa` sigue emitiendo `<html lang="es">`.
- **CA-5 — El idioma llega a cada emisor.** El árbol temporal tiene la fixture `zz`:
  conjuntos en las tres raíces del núcleo y en el catálogo de cada adaptador que tiene
  mensajes propios (`adapters/{claude-code,kimi-code,antigravity}/mensajes/`). Los cuatro
  adaptadores están construidos. Con un proyecto con `"idioma": "zz"`, cada una de estas
  salidas sale en su versión `zz`:
  - (a) una transición ilegal de `estado.mjs` y una firma inválida;
  - (b) un error de `valida.mjs`;
  - (c) el `motivo` de denegación de `require-spec`, a través del hook de Claude Code,
    del de Kimi Code, del de antigravity y del plugin de opencode;
  - (d) las denegaciones de `protege-verdad`: dos en Claude Code (tablero y documento
    de verdad), dos en Kimi Code y una en antigravity (tablero);
  - (e) el prefijo de `calidad` en Claude Code y en antigravity;
  - (f) la cabecera, las etiquetas y las cabeceras de tabla del tablero generado;
  - (g) el `lang` del informe QA;
  - (h) los artefactos de `scaffold.mjs`, que salen de `core/templates/zz/artefactos/`.

  Además:
  - (i) en el mismo árbol, el CLI de cualquiera de los cinco scripts lanzado sobre un
    directorio sin `.sdd.json` emite el mensaje de la barrera en `es`, idéntico al
    golden.

  En ningún caso cambian los identificadores de ADR-016 §4: el tablero `zz` sigue
  diciendo `aprobada` y `SPEC-NNN`.

### Idioma no soportado (ADR-016 §2)

- **CA-6 — `valida.mjs` falla ante un `idioma` no soportado o un `.sdd.json`
  ilegible.** Dado un proyecto temporal
  con artefactos válidos, cuando se ejecuta `valida.mjs` sobre su `docs/`, el resultado
  depende del `.sdd.json`:

  | Caso | `.sdd.json` | Resultado |
  |---|---|---|
  | (a) | `"idioma": "eu"` | sale con código distinto de 0 |
  | (b) | `"idioma": 5` (no es una cadena) | sale con código distinto de 0 |
  | (c) | `"idioma": "es"` | código 0, salida idéntica a la del código base |
  | (d) | sin campo `idioma` | código 0, salida idéntica a la del código base |
  | (e) | no existe el fichero | barrera de ADR-015: código 1 y el mismo mensaje que el código base, sin ningún error de idioma |
  | (f) | `"idioma": "zz"`, con la fixture `zz` | código 0 |
  | (g) | JSON corrupto | sale con código distinto de 0 |

  En (a) y (b), el error nombra el valor declarado y la lista de idiomas soportados
  (derivada de `core/roles/`). En (g), el error nombra el fichero `.sdd.json` y dice que
  los hooks lo tratan como ausente, es decir, con los gates apagados.

  El orden es: barrera, después `.sdd.json`, después artefactos. Si además hay errores
  de artefactos, se informan todos en la misma ejecución.

  `validateFile`, que usan el hook `calidad` y el pre-commit, no cambia: los hooks
  siguen en silencio ante el idioma.
- **CA-7 — `sdd-init` no acepta ni genera un `idioma` no soportado.** Dados los comandos
  `sdd-init` de Claude Code, opencode y antigravity, un test sobre su prosa comprueba
  que:
  - (a) ofrecen como idiomas los subdirectorios de `core/roles/`, y no una lista fija;
  - (b) se niegan a escribir un `.sdd.json` con un idioma fuera de esa lista, y vuelven
    a preguntar;
  - (c) en modo migración, si el `.sdd.json` existente declara un idioma no soportado,
    lo señalan y piden elegir uno soportado antes de copiar plantillas;
  - (d) siguen cumpliendo lo que exige SPEC-024: en migración estampan `.sdd.json`
    antes de llamar a los scripts. Ahora estampan ese `.sdd.json` ya con un idioma
    soportado.

  Además, el `idioma` de `core/templates/sdd.json` es un idioma soportado.

### Plantillas por idioma (ADR-016 §1)

- **CA-8 — Plantillas en `core/templates/es/`.** Dado el árbol tras el cambio:
  - `core/templates/es/` contiene exactamente los ficheros que colgaban de
    `core/templates/` en el código base, salvo `sdd.json`, con el mismo contenido.
    Eso incluye `AGENTS.md`. `git diff -M` los muestra como renombrados al 100 %.
  - `core/templates/sdd.json` sigue donde está.
  - Ningún fichero bajo `core/`, `adapters/` ni `tools/` cita las rutas antiguas, y
    `referencias` y `layout` siguen en verde.
  - Los `sdd-init` de Claude Code, opencode y antigravity copian desde
    `core/templates/<idioma>/`. Antigravity lo hace con la ruta relativa
    `../core/templates/<idioma>/` que ya usa.

### Bootstraps (ADR-016 §2)

- **CA-9 — Los bootstraps usan `es` si el idioma declarado no tiene roles.** Se toman
  las skills (`adapters/*/skills/sdd-*/SKILL.md`) y los agents (`adapters/*/agents/**/*.md`)
  de los cuatro adaptadores, descubiertos igual que en `checkPrecondicionSdd`. Un test
  sobre su prosa comprueba que cada uno indica que, si no existe
  `core/roles/<idioma>/`, se usa `es`. Además:
  - `prosa-gates` (`checkPrecondicionSdd`) sigue en verde: ninguna superficie contiene el
    antipatrón de fallback y todas conservan la parada sin `.sdd.json`;
  - el `description:` del frontmatter no cambia, y `descripcion-fuente-unica` sigue en
    verde.

### No regresión

- **CA-10 — Sin regresión ni contenido.** Dado el árbol tras el cambio:
  - `npm test` y `npm run check` pasan, incluidos los tests de SPEC-024 sin modificar
    sus aserciones.
  - `package.json` no gana dependencias.
  - No existe ningún directorio `gl/` ni `ca/` bajo `core/` ni `adapters/`.

## Entidades y reglas afectadas

- **ADR-016**: esta spec implementa §1 y §2. §3–§5 son de SPEC-026, y §0 y §6 de otras
  specs.
- **ADR-015** (y SPEC-024): de ahí salen la raíz del proyecto (`buscarRaizSdd`) y la
  barrera fail-closed de los CLI. Esta spec las usa, no las cambia.
- **ADR-013** (encaje de antigravity): el formato de sus hooks (`{decision, reason}`; su
  `calidad` va por stderr y sale con 0) no cambia, solo el origen del texto.
- **ADR-004**: `${…}` sigue reservado a `${SDD_*}` bajo `core/`. La interpolación de
  los catálogos usa `{…}`.
- **ADR-011**: las raíces del núcleo se enumeran y las de adaptador se autodescubren.
- Términos de `docs/fundacion/dominio.md`: núcleo, adaptador, harness, rol, hook,
  tablero, frontmatter, máquina de estados. Los términos nuevos se proponen en el
  anexo B de SPEC-026.

## Dependencias y coordinación

- **SPEC-026 depende de esta spec**: el check de paridad se escribe sobre el formato de
  catálogo y la disposición de conjuntos que esta spec deja hechos.
- **Integración con `main`**: la rama tiene que integrar `origin/main` (SPEC-019 a
  SPEC-024) **antes** de seguir implementando. Lo hace el implementador después de la
  nueva aprobación. Los ficheros en conflicto previstos son:
  - los cinco CLI del núcleo, por la barrera;
  - los `sdd-init`, por la guarda de SPEC-024;
  - `docs/tablero.md`, que se regenera.

  El golden de CA-3 se valida contra el `main` integrado, no contra `0b80c25`.
- **Spec #3 de EPIC-005**: le corresponde la edición textual del Alcance de
  `FOUNDATION.md` y de `vision.md` (ADR-016 §0). También le corresponden las dos citas
  de rutas de plantilla que cambian con CA-8: la fila `tarea` de
  `docs/fundacion/dominio.md` (`core/templates/artefactos/TASK.md`) y
  `README.md` §plantillas. Esta spec **no las toca**.
  - Mientras tanto, esas dos citas apuntan a la ruta antigua.
  - Si el check M1 de EPIC-005 (su spec #2) entra antes que la spec #3, la cita de
    `dominio.md` le dará un rojo legítimo. El orden de merge tiene que tenerlo en cuenta.
- **`tools/check.mjs`**: esta spec no añade pasos. El roce con la spec #2 de EPIC-005
  lo tiene SPEC-026.

## Fuera de alcance

- El check de paridad, los sellos, `prosa-gates` por idioma y los gatillos: son SPEC-026.
- Cualquier contenido gl o ca.
- Editar `FOUNDATION.md`, `vision.md`, `dominio.md` o `README.md`.
- Traducir los bootstraps, la `corta`, la prosa de `sdd-init` y los mensajes de
  `tools/` (ADR-016 §2–§3).
- Señalar el idioma no soportado en los hooks: siguen en silencio, por decisión
  del gate.
- `sdd-init` en Kimi Code: no tiene ese comando.
- Cambiar el fail-open de los hooks ante un `.sdd.json` ilegible (ADR-002): esta spec
  solo hace que `valida.mjs` lo señale.
- Migrar el idioma de un proyecto existente, mezclar idiomas, y otros idiomas.

## Notas para el gate humano

1. **Partida en dos por decisión del gate** (2026-10-27): esta spec cubre el mecanismo
   (CE-4) y SPEC-026 la paridad (CE-3).
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
   - El caso (g), `.sdd.json` ilegible, es nuevo en esta ronda. Antes salía con 0
     (F-SPEC-019-10). Cambia porque, con ADR-015, un fichero que existe significa
     "activo", pero los hooks lo tratan como ausente y apagan todos los gates. Ver
     ADR-016 §2.
3. **CA-7 y CA-9 se verifican sobre prosa**: `sdd-init` y los bootstraps los ejecuta un
   LLM. La evidencia de comportamiento real llega con el pipeline en gl (CE-1).
4. **Qué cambia frente a la SPEC-019 que se aprobó**:
   - antigravity en CA-3, CA-5, CA-7 y CA-8;
   - la raíz de ADR-015 en CA-1, con los casos (g) y (h);
   - la barrera en CA-3, CA-5(i) y CA-6(e);
   - el `.sdd.json` ilegible en CA-6(g);
   - CA-9 nuevo (bootstraps);
   - la no regresión pasa a CA-10.

   CA-1 a CA-8 conservan su número, así que los tests ya escritos siguen apuntando al
   CA correcto.
5. **Estado**: esta spec está en `borrador` aunque su predecesora llegó a `hecho`. Ver la
   nota de Procedencia: no se ha falseado ningún historial.
