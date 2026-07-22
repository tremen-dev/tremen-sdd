---
id: SPEC-006
tipo: spec
epica: EPIC-002
estado: en-revision
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-07-21, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-22, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-07-22, por: sdd-implementador}
  - {estado: en-revision, fecha: 2026-07-22, por: sdd-implementador}
---
# SPEC-006 — Barrera anti-invasion de gates

## Problema
<!-- Qué duele y a quién. Cita reglas de negocio (RN-xx) de docs/fundacion/reglas.md. -->

EPIC-001 destapo que los roles subagentes **invaden gates humanos**: **sdd-verificador**
transiciono una spec a `hecho` por su cuenta, y **sdd-documentalista** propuso cerrar la
epica. La epica EPIC-002 (CE-1) exige una **barrera ESTRUCTURAL** —no solo prosa— que impida
que un rol ejecute una transicion de gate humano (`aprobada`, `hecho`) o cierre una epica.
Toca **RN-07** (el estado solo lo cambia la maquina de estados `estado.mjs`) y **RN-09**
(ningun rol aprueba su propio trabajo); la decision estructural la fija **ADR-006**.

**Estado real hoy (corrige la premisa de la epica).** La epica dice "`estado.mjs` acepta
cualquier `--por`"; **ya no es cierto**. El commit `18ad848` añadio `FIRMANTES` a
`core/scripts/estado.mjs`:
- `aprobada` ya **exige persona** (rechaza `sdd-*`, vacio y `desconocido`), con tests verdes.
  **Esa mitad de CE-1 ya esta hecha.**
- `hecho` exige **exactamente `sdd-verificador`** y **rechaza a una persona** —lo CONTRARIO
  de lo que pide la epica— y la prosa del verificador (paso 7) le instruye cerrar la spec.
- `estado.mjs` **no lee `data.tipo`**: aplica la misma regla de `hecho` a spec, epica, task
  y adr, asi que **cerrar una epica exigiria hoy `--por sdd-verificador`** (absurdo) y el
  cierre de epica por un rol como el documentalista no tiene un guard coherente.

El gate (Alberto Fojo, 2026-07-22) resolvio el punto abierto: el `hecho` de una **spec/task**
lo cierra `sdd-verificador` —statu quo de `18ad848`, **NO es invasion**— y **no se toca**; el
hueco real es solo el **cierre de epica**. Lo que falta, por tanto: (1) hacer la firma
**dependiente del `tipo`** para que `epica → hecho` la firme una **persona** (rechaza cualquier
`sdd-*`), sin alterar la rama de spec/task; y (2) **reforzar la prosa del documentalista** con
una regla dura EXPLICITA (no cierra ni propone cerrar epicas; solo reporta coherencia), con un
check que verifique que existe. La firma de spec/task→`hecho` y la prosa del verificador quedan
**intactas**.

## Usuarios / roles afectados

- **Mantenedores de tremen-sdd** (humano): ganan que ningun rol pueda cerrar una epica ni
  (segun decida el gate) cerrar una spec; el humano conserva sus gates de forma estructural.
- **sdd-implementador**: hace que `estado.mjs` lea `data.tipo` y aplique la tabla de firma de
  ADR-006 (extendiendo `FIRMANTES` **solo** con la rama `epica`+`hecho` = persona, sin tocar
  la rama de spec/task, `TRANSITIONS` ni el check de aprobacion previa); refuerza la prosa de
  `core/roles/es/sdd-documentalista.md`; añade el check de prosa + tests. **No agrava** la
  regresion conocida de specs migradas.
- **sdd-verificador**: valida que la firma de `epica → hecho` rechaza todo rol y exige persona;
  que la de `spec/task → hecho` **sigue siendo `sdd-verificador`** (statu quo intacto, su test
  verbatim); que las transiciones de proceso siguen admitiendo rol; que la prosa del
  documentalista prohibe explicitamente cerrar/proponer cerrar epicas; y la no-regresion
  (`npm test` verde en ambos adaptadores + CI; specs migradas no agravadas).
- **sdd-documentalista** como sujeto de la prosa: su system prompt gana una regla dura que le
  prohibe explicitamente lo que en EPIC-001 se salto (proponer/cerrar la epica).

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA debe ser verificable con un test. -->

- **CA-1 (atribucion rol-vs-persona, generalizada y documentada — ADR-006 punto 2)**: Dado
  `estado.mjs`, **cuando** evalua la firma de un gate humano, **entonces** trata `--por` como
  **rol** si casa `^sdd-` y como **persona** en otro caso, y **rechaza** como no-persona el
  vacio, el ausente y `desconocido`. Verificable con test: para un estado de gate humano,
  `sdd-<cualquiera>` → RECHAZADA; `''`/`undefined`/`desconocido` → RECHAZADA; un nombre de
  persona → ACEPTADA. (Reafirma y no rompe los tests ya verdes de `aprobada`.)

- **CA-2 (cierre de EPICA: persona, nunca un rol — cierra la invasion del documentalista)**:
  Dado un artefacto con `tipo: epica` en `en-revision` con aprobacion humana previa en su
  historial, **cuando** se intenta `epica → hecho`, **entonces** la transicion **falla** si
  `--por` es **cualquier rol** `sdd-*` (incluidos `sdd-documentalista` y `sdd-verificador`)
  con un mensaje que diga que el cierre de epica es gate humano, y **se permite** solo con
  `--por` de **persona**. Verificable con test sobre un fixture `tipo: epica`:
  `hecho --por sdd-documentalista` → lanza; `--por sdd-verificador` → lanza; `--por Alberto`
  → estado `hecho`. Requiere que `estado.mjs` lea `data.tipo`.

- **CA-3 (el gate humano `aprobada` sigue blindado — no-regresion de `18ad848`)**: Dado el
  estado destino `aprobada` para spec, epica y adr, **cuando** se firma con un rol `sdd-*`,
  vacio o `desconocido`, **entonces** **falla** con mensaje de gate humano; con persona,
  **se permite** y se estampa en `aprobada-por`. Verificable: **todos** los tests de
  `aprobada` ya existentes en `core/tests/estado.test.mjs` **siguen verdes**, sin cambios.

- **CA-4 (cierre de SPEC/TASK a `hecho`: `sdd-verificador`, statu quo intacto — OPCION A del
  gate)**: Dado un artefacto `tipo: spec` (o `task`) en `en-revision` con aprobacion humana
  previa, **cuando** se intenta `→ hecho`, **entonces** `--por sdd-verificador` → **permitida**
  y `--por` de persona u otro rol → **falla** (exactamente el comportamiento de `18ad848`).
  Verificable: el test `hecho solo lo firma sdd-verificador` de `core/tests/estado.test.mjs`
  queda **VERBATIM** (misma asercion, sigue verde) y la prosa del verificador (paso 7:
  `estado.mjs <spec> hecho --por sdd-verificador`) **no se toca**. La rama de spec/task en
  `FIRMANTES.hecho` **no cambia**; solo se añade la rama por `tipo` para `epica` (CA-2).

- **CA-5 (las transiciones de PROCESO siguen admitiendo rol — no romper el pipeline)**: Dado
  cualquier estado de proceso (`en-progreso`, `en-revision`, `borrador`, `bloqueada` y los
  rechazos `en-revision → en-progreso`), **cuando** se atribuye a un rol `sdd-*`, **entonces**
  la transicion **se permite** (no son gates). Verificable con test: `bloqueada`/`en-progreso`
  `--por sdd-orquestador` siguen pasando; el rodeo `borrador → bloqueada → en-progreso` sigue
  frenado por el check de aprobacion previa (ese test existente sigue verde).

- **CA-6 (prosa del documentalista: regla dura EXPLICITA — CE-1 mitad prosa, RN-06)**: Dado
  `core/roles/es/sdd-documentalista.md`, **cuando** se lee, **entonces** contiene una **regla
  dura explicita** de que **no ejecuta** transiciones de gate (`aprobada`, cierre de **epica**)
  ni **propone cerrar** una epica; que **solo reporta coherencia** (tablero, validacion, drift);
  y que el cierre de epica es del humano. La prosa del **verificador NO se toca** (bajo Opcion A
  cierra la `hecho` de spec, que es correcto). Verificable con un **check**
  `tools/checks/prosa-gates.mjs` (+ su test en `tools/tests/`) que **FALLA** nombrando el rol si
  `sdd-documentalista.md` no contiene la regla dura esperada, y **PASA** con la prosa reforzada;
  cableado en `tools/check.mjs`. (Es un check de presencia de la regla, no de comportamiento del
  LLM: la garantia de comportamiento es la barrera de `estado.mjs`, CA-1..CA-4.)

- **CA-7 (no-regresion: `npm test` verde en ambos, CI incluido; specs migradas no agravadas)**:
  Dado el conjunto de cambios, **cuando** corre `npm test` (build claude + kimi → checks de
  invariantes de ambos adaptadores → tests del nucleo → `valida`), **entonces** la suite queda
  **verde** con conteo **≥** el previo mas los tests nuevos; `TRANSITIONS` y el check de
  "aprobacion humana previa" de `estado.mjs` **no cambian**, y la **regresion conocida de
  specs migradas no se agrava**. Bajo Opcion A **ningun test previo de `estado.test.mjs`
  cambia** (todos verbatim y verdes, incluido `hecho solo lo firma sdd-verificador`); los
  tests nuevos solo **añaden** la cobertura de `epica → hecho` = persona. Verificable: `npm
  test` y CI verdes; el `git diff` de `estado.mjs` solo **añade** el ramaje por `tipo` para
  `epica`, sin tocar `TRANSITIONS`, `REQUIEREN_APROBACION` ni la rama de spec/task.

## Entidades y reglas afectadas
<!-- Cita RN-xx, ADR-NNN y términos de docs/fundacion/dominio.md. Referencia, no dupliques. -->

- **ADR-006** (Anatomia de un gate): esta spec lo **materializa**. La definicion de gate, la
  atribucion `sdd-*` = rol y la tabla de firma por `(tipo, estado)` vienen de ahi; no se
  redefinen aqui. El gate resolvio la firma de spec/task→`hecho` = `sdd-verificador` (Opcion A).
- **RN-07** (el estado solo cambia por la maquina de estados): la barrera vive en `estado.mjs`,
  la unica via sancionada; el refuerzo de prosa no sustituye a la barrera.
- **RN-09** (ningun rol aprueba su propio trabajo): esta spec la **extiende** de `aprobada` al
  cierre de **epica** (persona, nunca rol). El `hecho` de spec/task se mantiene en
  `sdd-verificador` (juez independiente ≠ autor; no es autocertificacion), por decision del
  gate (Opcion A).
- **RN-06** (fuente unica de la prosa de rol en `core/roles/es/<rol>.md`): el refuerzo de prosa
  (solo `sdd-documentalista.md`) se escribe **ahi** (fuente unica); los adaptadores la
  referencian, no la copian. El check de CA-6 lee el fichero canonico del nucleo.
- **RN-10** (dogfooding): el cambio de `estado.mjs` entra por rama `ft/SPEC-006-slug` porque
  `core/scripts/` es ruta **vigilada**.
- **Criterios de exito de EPIC-002**: **CE-1** (los roles no invaden gates), en sus dos mitades
  (barrera estructural + prosa explicita).
- **Logica reutilizada (no reescrita)**: `TRANSITIONS`, `REQUIEREN_APROBACION`,
  `fueAprobadaPorHumano` y `parseFrontmatter/stringifyFrontmatter` **no cambian**; el trabajo
  es extender `FIRMANTES` para que dependa de `data.tipo` y ajustar sus mensajes.

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

- **Los otros tres items de EPIC-002** (tablero indexa ADRs — CE-2; `calidad`/linter sin ruido
  — CE-3; CI sin warning de Node — CE-4): specs aparte.
- **La regresion conocida de `estado.mjs`** (specs migradas): abierta a proposito; esta spec
  solo garantiza **no agravarla** (CA-7).
- **Cambiar `TRANSITIONS` o el modelo de estados**: no se toca el grafo ni el check de
  aprobacion previa; solo la politica de **firma**.
- **Vigilar el comportamiento del LLM en runtime** (que un agente "de verdad" no lo intente):
  imposible de forzar en prosa; por eso la garantia es estructural (`estado.mjs`). El check de
  CA-6 solo verifica que la **regla escrita** existe.
- **Un censo de personas autorizadas**: descartado por ADR-006; la atribucion se distingue por
  el patron `sdd-*`, no por lista blanca.

## Notas para el gate humano
<!-- Lo que quien aprueba necesita saber para decidir. -->

> Esta spec sigue en `borrador`; la arquitecta **NO** la aprueba (RN-09). Va acompañada de
> **ADR-006** (tambien en `borrador`). **No hay decisiones de gate abiertas**: la unica
> (¿quien cierra la `hecho` de una spec?) la **resolvio el gate (Alberto Fojo, 2026-07-22):
> OPCION A** — la cierra `sdd-verificador`. Los CA reflejan ya esa resolucion.

1. **RESUELTO POR EL GATE — spec/task → `hecho` = `sdd-verificador` (Opcion A).** El statu quo
   de `18ad848` es **correcto y NO es invasion**: el verificador es el juez independiente
   (≠ autor), asi que su cierre tras GREEN no es autocertificacion (RN-09 goberno siempre
   `aprobada`, no el `hecho` de spec). En consecuencia esta spec **NO revierte** `18ad848`:
   la rama de spec/task en `FIRMANTES.hecho` **no cambia**, el test `hecho solo lo firma
   sdd-verificador` queda **VERBATIM** y la **prosa del verificador (paso 7) no se toca**.

2. **El arreglo real es `epica → hecho` = persona (CA-2).** Como `estado.mjs` **no lee
   `data.tipo`**, la regla unica de `hecho` obliga hoy a firmar el cierre de una **epica** con
   `sdd-verificador` —absurdo: una epica no la verifica el verificador—. CA-2 hace que la firma
   dependa del `tipo`: `epica`+`hecho` = **persona** (rechaza cualquier `sdd-*`, incluidos
   documentalista y verificador). Esto **cierra estructuralmente** la invasion del documentalista
   (proponer/cerrar la epica) que motivo CE-1.

3. **La premisa original de la epica estaba desactualizada.** "`estado.mjs` acepta cualquier
   `--por`" ya NO era cierto: la barrera de `aprobada` (persona-only) existe y esta verde desde
   `18ad848`. El alcance real de SPEC-006 es **estrecho**: la rama `epica`+`hecho` (CA-2) y el
   refuerzo de prosa del documentalista (CA-6). La CE-1 de la epica ya se actualizo en linea con
   esto.

4. **Historial pasado grandfathered (fuera de alcance).** Las entradas `hecho` firmadas por una
   persona en SPEC-001..005 (previas a esta politica) **no se reescriben**: el historial es
   append-only (RN-07). La politica rige de aqui en adelante.

5. **Rutas vigiladas (dogfooding, RN-10).** Se toca: `core/scripts/estado.mjs` (**VIGILADA**
   → rama `ft/SPEC-006-*`), **solo** `core/roles/es/sdd-documentalista.md` (**no vigilado**:
   prosa de nucleo, fuente unica RN-06; la del verificador NO se toca) y un check + test en
   `tools/` (**no vigilado**). El cambio de `estado.mjs` respeta la regresion conocida (CA-7):
   solo **añade** la rama por `tipo` para `epica`, sin tocar `TRANSITIONS`, `REQUIEREN_APROBACION`
   ni la rama de spec/task.

6. **El mensaje de rechazo no debe invitar al rodeo** (ADR-006 punto 5, ya vigente en el codigo):
   un `hecho`/`aprobada` rechazado nombra el motivo ("gate humano; usa el nombre de la persona")
   sin listar el estado de gate como "permitido", para que un agente no lo lea como invitacion.
