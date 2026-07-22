---
id: SPEC-007
tipo: spec
epica: EPIC-002
estado: en-progreso
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-07-22, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-22, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-07-22, por: sdd-implementador}
  - {estado: en-revision, fecha: 2026-07-22, por: sdd-implementador}
  - {estado: en-progreso, fecha: 2026-07-22, por: sdd-implementador}
---
# SPEC-007 — El tablero indexa los ADRs

## Problema
<!-- Qué duele y a quién. Cita reglas de negocio (RN-xx) de docs/fundacion/reglas.md. -->

`core/scripts/tablero.mjs` genera `docs/tablero.md` a partir de los frontmatters, pero
**solo recorre `docs/epicas/`**: lista épicas y sus specs. Los **ADRs** (`docs/adr/ADR-NNN-*.md`,
cada uno con su `estado` en frontmatter) **no aparecen en el tablero**. Hoy hay **6 ADRs
`aprobada`** (ADR-001..ADR-006) invisibles en `docs/tablero.md`.

La épica **EPIC-002, CE-2** exige que `docs/tablero.md` refleje **TODOS** los artefactos de
nivel superior —épicas, specs y **ADRs**— con su estado. El tablero es la única vista agregada
del método, y hoy miente por omisión: un mantenedor que lo lee no ve las decisiones estructurales
vigentes.

Restricción de proceso: `docs/tablero.md` es **GENERADO** (**RN-05**): solo lo produce
`tablero.mjs` (`/sdd-tablero`) y el hook `protege-verdad` deniega editarlo a mano. Por tanto el
arreglo es **al generador**, no al fichero. `core/scripts/tablero.mjs` está bajo **ruta vigilada**
(`.sdd.json.rutasVigiladas` → `core/scripts/`), así que entra por rama de spec (**RN-01**, **RN-10**).

## Usuarios / roles afectados

- **Mantenedores de tremen-sdd** (humano): ganan un tablero completo; ven las 6 decisiones (ADRs)
  con su estado sin abrir `docs/adr/`.
- **sdd-implementador**: extiende `renderBoard` en `core/scripts/tablero.mjs` para escanear también
  `docs/adr/` y emitir una sección de ADRs; añade el test de la nueva salida. **No toca**
  `core/scripts/estado.mjs` ni la lógica de escaneo de épicas/specs.
- **sdd-documentalista** (`/sdd-tablero`): al regenerar, produce un `docs/tablero.md` que ya incluye
  los ADRs; su flujo no cambia.
- **sdd-verificador**: valida los CA (nueva sección presente y correcta; épicas/specs intactas;
  suite verde; `estado.mjs` sin tocar).

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA debe ser verificable con un test. -->

- **CA-1 (el generador escanea `docs/adr/` y emite una sección de ADRs — CE-2)**: Dado
  `renderBoard(docsDir, fecha)`, **cuando** existe `docsDir/adr/` con ficheros `ADR-NNN-*.md`,
  **entonces** la salida incluye **una sección global propia** encabezada `## ADRs` con una tabla
  de columnas **`ADR | Estado | Título | Último cambio`**, con **una fila por ADR** ordenada por
  id ascendente; cada fila lleva el `id` y el `estado` del frontmatter, el **título** derivado del
  nombre de fichero (quitando el prefijo `ADR-NNN-` y el sufijo `.md`, igual que las specs derivan
  el suyo) y el **último cambio** (`fecha (por)` de la última entrada de `historial`, o `—` si no
  hay). La sección se sitúa **después** de todas las épicas y **antes** de `## Resumen`. Verificable
  con test sobre un fixture con `docs/adr/ADR-001-*.md`: la salida casa `## ADRs`, la cabecera de
  tabla, y la fila con `ADR-001`, su estado y su título.

- **CA-2 (el tablero real muestra ADR-001..ADR-006 `aprobada`)**: Dado el árbol real del repo,
  **cuando** se regenera `docs/tablero.md` (`node core/scripts/tablero.mjs` / `/sdd-tablero`),
  **entonces** el fichero contiene la sección `## ADRs` y **una fila por cada** `ADR-001`..`ADR-006`,
  cada una con estado `aprobada`. Verificable: tras regenerar, `docs/tablero.md` casa
  `ADR-001`..`ADR-006` y en sus filas el estado `aprobada`.

- **CA-3 (no rompe lo existente: épicas y specs igual que antes — RN-05)**: Dado el mismo `docsDir`,
  **cuando** se genera el tablero, **entonces** el bloque de épicas y specs (encabezados `## EPIC-…`,
  tablas `Spec | Estado | Último cambio`, orden por directorio) es **idéntico** al actual, y el
  aviso `NO EDITAR A MANO` y el orden general (épicas → ADRs → `## Resumen`) se mantienen. Verificable:
  los **cuatro tests existentes** de `core/tests/tablero.test.mjs` (aviso de generado; agrupa specs
  por épica; resumen por estado; épica bucket sin slug) quedan **verbatim y verdes**. Corolario de
  no-regresión: cuando `docsDir/adr/` **no existe o está vacío**, la sección `## ADRs` **se omite**
  y la salida es idéntica a la actual (por eso esos cuatro tests, cuyos fixtures no tienen `adr/`,
  no cambian).

- **CA-4 (test del generador que cubre la nueva salida de ADRs)**: Dado `core/tests/tablero.test.mjs`,
  **cuando** corre la suite, **entonces** existe **al menos un test nuevo** que construye un `docsDir`
  temporal con `docs/adr/ADR-001-*.md` (y algún otro ADR) y asevera: (a) la salida contiene `## ADRs`;
  (b) contiene la fila del ADR con su `id`, `estado` y `título`; (c) —opcional pero recomendado— que
  un `docsDir` **sin** `adr/` **no** produce la sección `## ADRs` (blinda el corolario de CA-3).
  Verificable: el test nuevo existe y pasa.

- **CA-5 (suite completa y CI verde)**: Dado el conjunto de cambios, **cuando** corre `npm test`
  (build de ambos adaptadores → checks de invariantes → tests del núcleo → `valida`), **entonces**
  la suite queda **verde** con conteo de tests **≥** el previo **más** los tests nuevos, y **CI**
  (el workflow) queda verde sobre la rama. Verificable: salida de `npm test` y run de CI verdes.

- **CA-6 (`estado.mjs` intacto y regresión de specs migradas no agravada)**: Dado el `git diff` de
  la rama, **cuando** se inspecciona, **entonces** `core/scripts/estado.mjs` **no aparece modificado**
  (0 líneas de diff) y la **regresión conocida de specs migradas** (deuda abierta a propósito) **no
  se agrava**: no se añade ni cambia comportamiento que la empeore. Verificable: `git diff --stat`
  no lista `core/scripts/estado.mjs`; los tests de `core/tests/estado.test.mjs` siguen **verbatim y
  verdes**. (SPEC-007 toca **otro** script, `tablero.mjs`; esta CA es la salvaguarda explícita.)

## Entidades y reglas afectadas
<!-- Cita RN-xx, ADR-NNN y términos de docs/fundacion/dominio.md. Referencia, no dupliques. -->

- **RN-05** (el tablero es GENERADO, no se edita a mano): esta spec **la respeta y la refuerza**;
  el cambio es al **generador** `tablero.mjs`, único escritor autorizado de `docs/tablero.md`.
- **RN-01 / RN-10** (nada sin spec bajo ruta vigilada; dogfooding): `core/scripts/` es **vigilada**,
  así que el cambio entra por rama `ft/SPEC-007-slug`.
- **RN-02** (dependencia solo adaptador → núcleo): `tablero.mjs` está en `core/`; el escaneo de
  `docs/adr/` se hace con `node:fs`/`node:path` (ya importados) y rutas **relativas al `docsDir`
  recibido**; **no** se introduce ninguna ruta que escape de `core/` ni dependencia de adaptador.
- **EPIC-002, CE-2** (el tablero es completo): esta spec lo **materializa**.
- **Lógica reutilizada (no reescrita)**: `parseFrontmatter` (vía `leer`), el helper `esEntrypoint`
  de `core/lib/entrypoint.mjs` (el bloque CLI ya lo usa — lección SPEC-002, no se añade entrypoint
  nuevo) y el patrón de derivar título desde el nombre de fichero (idéntico al de specs) **se
  reutilizan**; el trabajo es **añadir** el recorrido de `docs/adr/` y su tabla dentro de `renderBoard`.
- **Sin ADR**: no hay decisión estructural que constriña trabajo futuro; es una mejora **acotada**
  del generador. La decisión de formato (sección `## ADRs` global, columnas `ADR | Estado | Título |
  Último cambio`, título desde el nombre de fichero) la fija esta spec, no requiere ADR inmutable
  (ver Notas para el gate).

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

- **Tocar `core/scripts/estado.mjs`** o la **regresión conocida de specs migradas**: fuera; SPEC-007
  solo la **no agrava** (CA-6).
- **Vincular cada ADR con su(s) spec(s) relacionada(s)** en el tablero: hoy esa relación vive en
  **prosa** dentro del ADR (línea "Specs relacionadas: …"), sin campo estructurado en el frontmatter;
  extraerla de forma fiable es trabajo aparte. La columna `Título` basta para CE-2. (Si se quisiera,
  sería una mejora futura previo campo estructurado.)
- **Contar los ADRs en `## Resumen`**: el recuento actual es **por estado de specs**; SPEC-007 **no**
  lo altera (para no cambiar la semántica del resumen ni los tests existentes). Los ADRs se ven en su
  **propia** sección. (Decisión menor; ver Notas para el gate.)
- **Los otros items de EPIC-002** (CE-1 ya en SPEC-006; CE-3 linter sin ruido; CE-4 CI sin warning):
  specs aparte.
- **Rediseñar el tablero** (orden, estilos, columnas de las secciones existentes): se mantiene el
  estilo actual; solo se **añade** la sección de ADRs.

## Notas para el gate humano
<!-- Lo que quien aprueba necesita saber para decidir. -->

> Esta spec sigue en `borrador`; la arquitecta **NO** la aprueba (RN-09). **No la acompaña ningún
> ADR**: es una mejora acotada del generador, sin decisión estructural que constriña trabajo futuro.

1. **Decisión de formato (propuesta de la arquitecta, revísala).** Los ADRs no cuelgan de una épica
   como las specs, así que van en una **sección global propia `## ADRs`** situada **entre** las
   épicas y el `## Resumen`, con tabla `ADR | Estado | Título | Último cambio` (mismas columnas y
   estilo que la tabla de specs). El **título** se deriva del **nombre de fichero** (quitando
   `ADR-NNN-` y `.md`), igual que las specs, por consistencia y robustez. Alternativa considerada y
   descartada por ahora: leer el **H1** del ADR (`# ADR-NNN: Título`) para un título más pulido —más
   frágil y menos consistente con las specs. Si el gate prefiere el H1, es un ajuste menor.

2. **Dos decisiones menores, veto del gate bienvenido pero no bloqueantes:**
   - **ADRs NO se cuentan en `## Resumen`** (que hoy resume specs por estado). Mantenerlos fuera
     preserva la semántica del resumen y deja los tests existentes verbatim. Si se prefiere un
     resumen "total", es un cambio pequeño en un CA.
   - **Sin columna "spec relacionada"**: esa relación solo existe en prosa del ADR (sin campo de
     frontmatter). Se deja fuera (ver Fuera de alcance).

3. **No hay decisiones de gate abiertas que bloqueen la implementación.** Las tres anteriores son
   propuestas cerradas por la arquitecta; el humano puede vetarlas en el gate. La épica NO se
   invalida: CE-2 se cumple con cualquiera de las variantes.

4. **Dogfooding / código vigilado (RN-05, RN-10).** Se toca `core/scripts/tablero.mjs` (**VIGILADO**
   → rama `ft/SPEC-007-*`) y `core/tests/tablero.test.mjs` (test, no vigilado). `docs/tablero.md` es
   **GENERADO**: no se edita a mano; se regenera con `/sdd-tablero`. **`core/scripts/estado.mjs` no
   se toca** (CA-6).
