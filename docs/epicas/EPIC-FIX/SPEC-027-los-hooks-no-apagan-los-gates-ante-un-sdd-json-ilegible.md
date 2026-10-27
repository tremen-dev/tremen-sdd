---
id: SPEC-027
tipo: spec
epica: EPIC-FIX
estado: borrador
aprobada-por:
historial:
  - {estado: borrador, fecha: 2026-10-27, por: sdd-arquitecto}
---
# SPEC-027 — Los hooks no apagan los gates ante un sdd-json ilegible

## Problema

Si `.sdd.json` existe pero no se puede leer (JSON roto, vacío, `null`, un array, un
directorio, o un JSON válido guardado con BOM UTF-8), los gates se apagan sin avisar:
- **L1**: los hooks de los cuatro adaptadores (claude-code, kimi-code, opencode y
  antigravity) leen la configuración con `try { JSON.parse } catch { return null }`. Con
  `null` hacen `allow()`, igual que si el fichero no existiera.
- **L2**: el pre-commit (`tools/githooks/pre-commit.mjs`) usa el mismo patrón. Sigue
  adelante con `rutasVigiladas` vacío, así que nunca aplica require-spec.

Pero para ADR-015 el proyecto está activo porque el fichero existe, y los CLI del núcleo
pasan la barrera. El proyecto queda declarado activo y sin gates.

Es un defecto del método, no una mejora:
- viola RN-01 (nada se codea sin spec aprobada) en el carril que debería guardarlo;
- viola el modo fail-closed de L2 (ADR-002).

ADR-016 (rama `ft/SPEC-025-…`) ya hace fallar `valida.mjs` en este caso. Su mensaje dice
que los hooks lo tratan como ausente, y deja fuera de alcance cambiar los hooks. Esta
spec cierra esa parte siguiendo **ADR-017**.

## Usuarios / roles afectados

- **Quien trabaja en un proyecto tremen-sdd con un `.sdd.json` roto**, en cualquiera de
  los cuatro harness: deja de trabajar sin gates sin saberlo, y recibe un mensaje que le
  dice qué está mal y cómo arreglarlo.
- **sdd-implementador**: implementa los CA con TDD en `ft/SPEC-027-…`.
- **sdd-verificador**: verifica cada CA contra tests y fixtures.

## Criterios de aceptación

Convenciones de los tests:
- Cada caso corre en un directorio temporal, nunca en el árbol real.
- "Ilegible" se prueba al menos con `{ roto`. CA-1 enumera el resto de variantes.
- Los hooks se ejecutan como proceso, con el payload por `stdin` en el formato de su
  harness. El plugin de opencode se prueba llamando a su factory, como en
  `adapters/opencode/tests/enforcement.test.mjs`.

### CA-1 — Lector único con tres estados
- **Given**: la función nueva de `core/lib/` que lee `.sdd.json` de una raíz
  (ADR-017 §1).
- **When**: se llama sobre una raíz temporal en cada caso de esta tabla.
- **Then**:

  | Caso | Contenido en la raíz | Estado devuelto |
  |---|---|---|
  | (a) | no hay `.sdd.json` | `ausente` |
  | (b) | `{}` | `valida` |
  | (c) | `{"idioma":"es","rutasVigiladas":["src/"]}` | `valida`, con esa configuración |
  | (d) | el JSON de (c) precedido de BOM UTF-8 | `valida`, con la misma configuración que (c) |
  | (e) | `{ roto` | `ilegible`, con el mensaje del parser en el motivo |
  | (f) | fichero vacío | `ilegible` |
  | (g) | `null`, `[]`, `42` y `"x"` (un caso cada uno) | `ilegible`, con motivo "no es un objeto JSON" |
  | (h) | `.sdd.json` es un directorio | `ilegible` |

  Además, el módulo solo importa `node:*` (`nucleo-aislado` en verde).

### CA-2 — Fuente única del lector
- **Given**: los ficheros
  `adapters/{claude-code,kimi-code,antigravity}/hooks/_comun.mjs`,
  `adapters/opencode/plugins/_comun.mjs` y `tools/githooks/pre-commit.mjs`.
- **When**: un test de `tools/tests/` inspecciona su código fuente, al estilo de
  `require-spec-una-logica.test.mjs`.
- **Then**:
  1. Cada uno importa la función de CA-1 desde `core/lib/`.
  2. Ninguno contiene un `JSON.parse` aplicado a la lectura de `.sdd.json`.
  3. La copia construida en `dist/<harness>/` resuelve ese import (los tests de
     adaptador corren sobre el build, como hoy).

### CA-3 — require-spec deniega con `.sdd.json` ilegible, en los cuatro adaptadores
- **Given**: un proyecto temporal con `.sdd.json` ilegible, en la rama `main` y sin
  ninguna spec. Se repite para el hook `require-spec` de claude-code, kimi-code y
  antigravity, y para el plugin de opencode.
- **When**: el gate recibe una escritura sobre:
  - (a) `src/app.js`, ruta vigilada en la plantilla por defecto;
  - (b) `README.md`, no vigilada en ninguna configuración;
  - (c) el propio `.sdd.json` de la raíz, en ruta relativa y en ruta absoluta;
  - (d) `src/app.js`, con `SDD_SKIP_GATE=1`;
  - (e) `src/app.js`, en un directorio que no es un repo git.
- **Then**:
  1. (a), (b) y (e) se deniegan con el formato de cada harness:
     - `permissionDecision: deny` en claude-code y kimi-code;
     - `{"decision":"deny"}` en antigravity;
     - `SddGateError` lanzado en opencode.
  2. (c) y (d) se permiten.
  3. **Regresión**: sin `.sdd.json`, (a) y (b) se permiten en silencio, como hoy
     (ADR-015). Con un `.sdd.json` válido, el comportamiento es el de hoy; lo cubren los
     tests existentes de cada adaptador.

### CA-4 — Mensaje accionable, único en todas las capas
- **Given**: las denegaciones de CA-3, el bloqueo de CA-6, el feedback de CA-5 y el error
  de `valida.mjs` de CA-7.
- **When**: se lee el texto que emite cada uno.
- **Then**: todos contienen el mismo bloque de texto, que:
  1. nombra la ruta absoluta del `.sdd.json`;
  2. incluye el motivo de CA-1 (el error del parser o "no es un objeto JSON");
  3. dice que los gates no se pueden evaluar mientras el fichero sea ilegible;
  4. indica cómo arreglarlo: corregir el JSON con `core/templates/sdd.json` como
     referencia, o ejecutar `/sdd-init` en modo migración;
  5. menciona la válvula `SDD_SKIP_GATE=1`.

  El texto sale de una sola definición en el núcleo. Si el catálogo de mensajes de
  SPEC-025 ya está en `main`, es una clave de ese catálogo. Ningún hook lo redacta por
  su cuenta.

### CA-5 — protege-verdad y calidad con `.sdd.json` ilegible
- **Given**: un proyecto temporal con `.sdd.json` ilegible.
- **When**:
  - (a) protege-verdad (claude-code, kimi-code, antigravity) recibe una escritura sobre
    `docs/tablero.md`, y otra sobre `FOUNDATION.md` con identidad de rol
    `sdd-implementador`;
  - (b) calidad de claude-code y de antigravity recibe el `PostToolUse` de una edición
    de `.sdd.json` que lo deja ilegible.
- **Then**:
  1. En (a), las dos escrituras se deniegan con los mensajes que protege-verdad usa hoy.
     El interruptor `gates.protegeVerdad` no cuenta, porque no se puede leer. En
     kimi-code, si falta la identidad de rol, se mantiene la degradación de hoy
     (ADR-003, punto 5).
  2. En (b):
     - claude-code sale con código 2 y el texto de CA-4 en `stderr`;
     - antigravity escribe el texto de CA-4 en `stderr`, devuelve `{}` y sale con 0, como
       ya hace con los artefactos inconsistentes.

### CA-6 — El pre-commit L2 bloquea con `.sdd.json` ilegible
- **Given**: un repo git temporal con el pre-commit instalado (como en
  `tools/tests/pre-commit.test.mjs`) y cualquier fichero en el área de staging.
- **When**: se ejecuta el pre-commit con `.sdd.json`:
  - (a) ilegible;
  - (b) ilegible, con `SDD_SKIP_GATE=1`;
  - (c) válido;
  - (d) ausente.
- **Then**:
  1. (a) sale con código distinto de 0 y el texto de CA-4.
  2. (b) sale con 0.
  3. (c) y (d) se comportan como hoy (regresión sobre los tests existentes).

### CA-7 — `valida.mjs` deja de decir que los hooks tratan el fichero como ausente
- **Given**: el CLI de `valida.mjs` con el caso (g) de SPEC-025 CA-6 (`.sdd.json`
  ilegible), ya presente en `main` cuando se implementa esta spec (ver orden abajo).
- **When**: se ejecuta sobre ese proyecto temporal.
- **Then**:
  1. Sigue saliendo con código distinto de 0, como fija ADR-016 §2.
  2. Su error contiene el texto de CA-4.
  3. Su error no afirma que los hooks traten el fichero como ausente ni que los gates
     estén apagados.

### CA-8 — Sin regresión
- **Given**: el árbol tras el cambio.
- **When**: se ejecutan `npm test` y `npm run check`.
- **Then**: los dos pasan en verde, con los tests existentes de los hooks de los cuatro
  adaptadores y del pre-commit sin modificar sus aserciones.

## Entidades y reglas afectadas

- **RN-01**: un `.sdd.json` ilegible deja de abrir un hueco en el carril de la spec.
- **RN-02**: el lector vive en `core/lib/` y los adaptadores lo importan.
- **RN-03**: la garantía se sostiene en L2 y L3 sin harness (CA-6, CA-7).
- **RN-04**: ADR-017 es nuevo. No supersede ADR-002, ADR-015 ni ADR-016.
- **RN-09**: la spec y ADR-017 quedan en `borrador` hasta el gate humano.
- **RN-10**: `core/lib/` y `adapters/claude-code/hooks/` son rutas vigiladas, así que el
  trabajo va en `ft/SPEC-027-…`.
- **ADR-002** (capas y modo de fallo), **ADR-015** (activación por existencia de
  `.sdd.json`), **ADR-016** §2 (resolución del idioma y fallo de `valida.mjs`),
  **ADR-017** (esta decisión), **ADR-003** punto 5 (degradación de identidad en Kimi),
  **ADR-007** y **ADR-013** (forma de denegar en opencode y en antigravity).
- Términos de `docs/fundacion/dominio.md`: hook, gate, adaptador, harness, núcleo.

## Fuera de alcance

- **Validar el esquema de `.sdd.json`**, por ejemplo un `rutasVigiladas` que no es array
  o un `gates` que no es objeto. Hoy hacen fallar a require-spec por dentro, y eso acaba
  en fail-open. Queda como follow-up de ADR-017 (nota 6 abajo).
- **Cambiar la localización de la raíz** que usan los hooks (cwd o worktree) para
  alinearla con `buscarRaizSdd`. Es de ADR-016.
- **El caso `.sdd.json` ausente**: sigue siendo "proyecto sin tremen-sdd" (ADR-015).
- **El idioma de los mensajes**: entra por el catálogo de SPEC-025 y SPEC-026. Esta spec
  no traduce.

## Notas para el gate humano

1. **Orden respecto a SPEC-025**: esta spec se implementa **después de que SPEC-025 esté
   mergeada en `main`**, y su rama se crea desde `origin/main` con SPEC-025 dentro.
   Motivos:
   - CA-7 corrige el texto de un error que crea SPEC-025 CA-6(g);
   - CA-4 mete el mensaje en el catálogo que crea SPEC-025;
   - SPEC-025 CA-3 extrae los textos de los mismos hooks a un golden. Implementar a la
     vez daría conflictos en los mismos ficheros.

   Con SPEC-026 no hay dependencia funcional. Si SPEC-026 entra antes y su check de
   paridad exige la clave nueva en todos los idiomas presentes, se añade según su regla.
2. **Decisión a mirar con lupa: require-spec deniega todas las escrituras, no solo las
   de rutas vigiladas** (ADR-017 §2). Con la configuración ilegible no se sabe cuáles
   son las vigiladas. La única excepción es el propio `.sdd.json`, para poder
   arreglarlo. Es más estricto que hoy en un proyecto sano. Es intencionado y se sale en
   una línea.
3. **El pre-commit entra en alcance aunque la petición hablaba de hooks L1.** Tiene el
   mismo patrón y en L2 el agujero es peor, porque L2 es la capa de garantía. Dejarlo
   fuera sería cerrar L1 y dejar abierta la garantía.
4. **El BOM UTF-8 se acepta como válido** (CA-1 d). Hoy apaga los gates y es un caso
   real en Windows, donde se trabaja este repo. Si prefieres que cuente como ilegible,
   CA-1(d) cambia a `ilegible` y CA-4 añade el BOM como motivo.
5. **No supersede ADR-002**: ADR-017 lo argumenta como un estado determinado, no como un
   fallo de la herramienta. Si lo lees como una excepción a "L1 fail-open ante cualquier
   fallo" que merece supersesión formal, dilo y lo reescribo.
6. **Follow-up sin destino fijado**: la validación de esquema de `.sdd.json` (fuera de
   alcance). ¿Spec propia en EPIC-FIX, o la llevas a EPIC-MEJORA?
