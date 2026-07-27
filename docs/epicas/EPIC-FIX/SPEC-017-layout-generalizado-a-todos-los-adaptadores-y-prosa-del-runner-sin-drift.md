---
id: SPEC-017
tipo: spec
epica: EPIC-FIX
estado: hecho
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-07-27, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-27, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-07-27, por: sdd-implementador}
  - {estado: en-revision, fecha: 2026-07-27, por: sdd-implementador}
  - {estado: hecho, fecha: 2026-07-27, por: sdd-verificador}
---
# SPEC-017 — layout generalizado a todos los adaptadores y prosa del runner sin drift

## Problema
<!-- Qué duele y a quién. Cita reglas de negocio (RN-xx) de docs/fundacion/reglas.md. -->

`tools/checks/layout.mjs` es el check que materializa la frontera núcleo/adaptador en el
árbol (ADR-001) y **da verde sobre adaptadores que no mira**.

**Root cause (F-SPEC-015-2).** El check tiene `adapters/claude-code` **cableado**: la
constante `cc` (línea 20), la comprobación de `.claude-plugin/plugin.json` (líneas 32-34) y
el bucle de superficie (líneas 35-37) apuntan solo a ese directorio. Verificado:
`grep -c "kimi-code\|opencode" tools/checks/layout.mjs` → **0**. Consecuencia: si a
`adapters/kimi-code/` o a `adapters/opencode/` les faltara `agents/`, `skills/` o `tests/`,
`layout` seguiría en verde, CI seguiría en verde y nadie se enteraría. **Un check que
miente sobre su propia cobertura es peor que no tenerlo**: genera confianza injustificada
justo donde el método promete garantía dura (RN-03: el enforcement es independiente del
harness — mal puede serlo un check que solo conoce un harness).

**Root cause (F-SPEC-015-1), mismo runner.** `tools/check.mjs` **miente sobre sí mismo en
prosa**: la cabecera (línea 3) dice *"los SEIS checks"* cuando hay **nueve**, y el mensaje
de éxito (línea 45) dice `"build (claude+kimi) + checks (ambos adaptadores)"` sin nombrar
opencode, **aunque su lista `PASOS` sí construye y comprueba los tres** desde SPEC-010. Es
cosmético en efecto pero es **drift** (RN-10) y se **imprime en cada ejecución**, local y en
CI. Ambas cadenas son fijas y por eso pueden envejecer solas.

**Por qué ahora, y por qué juntos.** Los dos los destapó **SPEC-015** (guía "Añadir un
harness", 2ª pasada), cuyo contrato era **reportar, no arreglar** (diff solo `docs/`), así
que quedaron abiertos a propósito y documentados en su ledger. El gate humano
(Alberto Fojo, 2026-07-27) asignó **F-SPEC-015-2 a EPIC-FIX con spec propia** —descartando
la bolsa de mejoras menores— porque generalizarlo es barato y cerrarlo **ahora** evita que
el **cuarto harness herede el agujero**. F-SPEC-015-1 entra **con él** por el argumento
que se justifica abajo (Criterios, "Decisión de estructura").

**Hallazgo de diseño (esto no es un fix de una línea).** Al comparar `layout` con los
checks que **sí** están generalizados aparecen **tres mecanismos distintos conviviendo**:

| check | cómo se generaliza | ¿cubre un harness nuevo sin tocar código? |
|---|---|---|
| `roles-fuente-unica` | **autodescubrimiento**: itera `adapters/*/agents/` leyendo el FS | **sí** |
| `referencias`, `manifiestos` | **enumeración en el runner**: un paso por adaptador en `PASOS` + rama por harness dentro | no (hay que añadir el paso y la rama) |
| `descripcion-fuente-unica` | **enumeración interna** de las superficies de los tres | no |
| `layout` | **no se generaliza**: `adapters/claude-code` cableado | no (hoy no cubre ni los que hay) |

La convivencia no es un accidente a corregir en bloque: `referencias`/`manifiestos` validan
cosas **específicas del harness** (qué es un manifiesto válido depende del harness), así
que su enumeración está justificada. `layout` valida un invariante **común a cualquier
adaptador** ("existe como superficie completa en el árbol"), luego su mecanismo natural es
el de `roles-fuente-unica`: **autodescubrimiento**. Esa política queda fijada en **ADR-011**
(acompaña a esta spec) para que el harness nº4 no la vuelva a litigar.

**Aviso as-built que condiciona el diseño (verificado, no supuesto).** Los tres adaptadores
**no tienen la misma forma**:

| | `agents/` | `skills/` | `tests/` | `commands/` | `hooks/` | otros |
|---|---|---|---|---|---|---|
| `claude-code` | sí | sí | sí | sí | sí | `.claude-plugin/plugin.json` |
| `kimi-code` | sí | sí | sí | **no** | sí | — |
| `opencode` | sí | sí | sí | sí | **no** | `opencode.json`, `plugins/` |

Por tanto **generalizar el bucle actual tal cual (`agents`, `skills`, `commands`, `hooks` +
`plugin.json` para todos) produciría falsos positivos**: acusaría a kimi-code de no tener
`commands/` y a opencode de no tener `hooks/` ni `plugin.json`, que **no son
incumplimientos** sino diferencias legítimas de harness (opencode usa `plugins/` +
`opencode.json`, ADR-007). El invariante realmente común es **`agents/` + `skills/` +
`tests/`**, y los tres lo cumplen hoy: **generalizado al mínimo común, el check NO destapa
ningún incumplimiento real** (comprobado con `find adapters/<h> -maxdepth 2` para los tres).

## Usuarios / roles afectados

- **CI y quien confía en ella** (todo el repo): hoy `layout` verde no significa "el árbol
  de los adaptadores está bien formado", solo "el de claude-code lo está". Tras esta spec,
  significa lo que dice.
- **Quien añada el harness nº4** (EPIC-001/EPIC-003 futuras): gana cobertura **el día que
  crea el directorio**, sin tocar `layout` ni `PASOS`; y una regla escrita (ADR-011) sobre
  cuándo un check se autodescubre y cuándo se enumera.
- **sdd-implementador**: reescribe `tools/checks/layout.mjs` (autodescubrimiento + tabla
  declarativa de extras por harness), deriva la prosa de `tools/check.mjs` de sus propios
  `PASOS`, añade los tests que hoy fallan, y actualiza `docs/arquitectura.md`. **No toca
  `core/`.**
- **sdd-verificador**: comprueba que los tests nuevos fallaban antes del arreglo (RED
  reproducible), que los **9 checks** siguen pasando, que `npm test` sigue verde, y —lo
  importante— que el check **no se ha ablandado** para conseguir el verde.
- **sdd-arquitecto** (aquí): fija en **ADR-011** la política de generalización de checks;
  no implementa.

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA debe ser verificable con un test. -->

> **Decisión de estructura: UNA spec con dos follow-ups (bloques A y B), no dos specs.**
> No es "van juntos porque son pequeños". El argumento es: **el mismo runner miente sobre
> su propia cobertura de dos maneras** —por omisión de lo que mira (A) y por prosa fija que
> envejece (B)— y **A empeora B si se arregla solo**: al generalizar `layout`, el mensaje
> `"checks (ambos adaptadores)"` pasa de obsoleto a **más** obsoleto, y la cabecera
> seguiría contando seis checks en el mismo fichero que acaba de ganar cobertura. Cerrar A
> dejando B abierto significa **crear drift nuevo en el acto de cerrar drift viejo** (RN-10).
> Además comparten fichero de test (`tools/tests/check.test.mjs` toca ambos), gate y rama.
> Se mantienen como bloques separados con CA propios para que el gate pueda **rechazar B
> sin tumbar A**. Precedente en esta misma épica: SPEC-012 (una spec, dos bloques).

### Bloque A — `layout` generalizado a todos los adaptadores (cierra F-SPEC-015-2)

- **CA-1 (el mínimo común se exige a TODOS los adaptadores, por autodescubrimiento)**: Dado
  un árbol con `adapters/` conteniendo N adaptadores, **cuando** corre `checkLayout(raiz)`,
  **entonces** exige a **cada** subdirectorio de `adapters/` el mínimo común **`agents/`,
  `skills/` y `tests/`**, descubriendo los adaptadores del sistema de ficheros (patrón
  `roles-fuente-unica`), **sin** que ningún nombre de harness concreto sea necesario para
  que la comprobación ocurra. Verificable con tests sobre árboles sintéticos que **hoy
  fallan**: (a) `adapters/kimi-code/` sin `tests/` → hoy `ok:true`, tras el fix `ok:false`;
  (b) `adapters/opencode/` sin `agents/` → hoy `ok:true`, tras el fix `ok:false`;
  (c) un adaptador inventado `adapters/harness-nuevo/` sin `skills/` → `ok:false` **sin que
  ese nombre aparezca en el código del check**.

- **CA-2 (el error nombra al adaptador culpable)**: Dado un adaptador incompleto, **cuando**
  el check falla, **entonces** el error identifica **qué adaptador** y **qué falta** con
  ruta relativa al repo (forma `falta adapters/<harness>/<dir>/`), no un mensaje genérico.
  Verificable: el test de CA-1(a) asserta que algún error casa
  `/falta adapters\/kimi-code\/tests\//`.

- **CA-3 (extras por harness: declarativos, y su ausencia en un harness nuevo NO es
  fallo)**: Dado que los tres adaptadores tienen formas distintas (tabla del Problema),
  **cuando** el check comprueba la superficie **más allá** del mínimo común, **entonces**
  esos extras viven en una **tabla declarativa por harness** dentro del check, y un
  adaptador **no declarado** en la tabla se juzga **solo** por el mínimo común (CA-1) y
  **no falla** por carecer de `commands/`, `hooks/` o `plugin.json`. Verificable con tests:
  (a) árbol sintético con `adapters/harness-nuevo/{agents,skills,tests}` y nada más →
  `ok:true` (no hay falso positivo); (b) `adapters/kimi-code/` **sin** `commands/` →
  `ok:true` (no se le exige lo que no le toca); (c) `adapters/opencode/` **sin** `hooks/` →
  `ok:true`.

- **CA-4 (los extras declarados se exigen de verdad: la cobertura crece, no se cambia de
  sitio)**: Dado que la tabla de CA-3 declara la superficie **as-built** de los tres
  harnesses conocidos —`claude-code`: `.claude-plugin/plugin.json`, `commands/`, `hooks/`;
  `kimi-code`: `hooks/`; `opencode`: `opencode.json`, `commands/`, `plugins/`—, **cuando**
  a un harness **declarado** le falta uno de sus extras, **entonces** el check **falla**
  nombrándolo. Verificable con tests que hoy no existen: (a) `claude-code` sin `commands/`
  → `ok:false` (no se pierde nada de la cobertura actual); (b) `opencode` sin `plugins/` →
  `ok:false`; (c) `kimi-code` sin `hooks/` → `ok:false`. Y: **un harness declarado en la
  tabla que no exista en `adapters/` es un fallo** (borrar `adapters/claude-code/` entero
  debe poner el check en rojo, no en verde por ausencia).

- **CA-5 (la lista de superficie prohibida en la raíz sigue siendo CERRADA y explícita, no
  derivada del FS)**: Dado que el check también prohíbe superficie de adaptador en la raíz
  del repo, **cuando** se generaliza, **entonces** esa lista **sigue siendo una constante
  explícita** —ampliada a la unión as-built: `agents`, `skills`, `commands`, `hooks`,
  `plugins`— y **no** se deriva de `readdir(adapters/*)`. Razón: derivarla haría que un
  adaptador con un directorio llamado `docs`, `core` o `tools` convirtiera en infracción el
  `docs/`, `core/` o `tools/` legítimos de la raíz. Verificable con tests: (a) un
  `plugins/` en la raíz → `ok:false`; (b) un árbol donde un adaptador tiene un
  `adapters/<h>/docs/` **no** hace que el `docs/` de la raíz sea infracción → `ok:true`.

- **CA-6 (el árbol real del repo sigue en verde, y por las razones correctas)**: Dado el
  repo tal cual, **cuando** corre `node tools/checks/layout.mjs`, **entonces** sale
  **exit 0** y su mensaje de éxito **nombra los adaptadores efectivamente verificados**
  (`claude-code, kimi-code, opencode`), como hace `roles-fuente-unica`. Verificable: el
  test existente `checkLayout(REPO_ROOT).ok === true` sigue pasando y un test nuevo asserta
  que el resultado expone la lista de adaptadores recorridos y que contiene los tres.

- **CA-7 (protocolo si la generalización destapa un incumplimiento REAL)**: Dado que
  ampliar la cobertura puede sacar a la luz un hueco preexistente, **cuando** al aplicar
  CA-1/CA-4 el check se ponga rojo sobre el árbol real, **entonces** el implementador
  distingue y actúa así, **sin improvisar**:
  1. **Falso positivo** (diferencia legítima de forma entre harnesses): el modelo del check
     es el equivocado → se refina la tabla de CA-3/CA-4. **Está dentro del alcance.**
  2. **Incumplimiento real** (a un adaptador le falta de verdad `agents/`, `skills/`,
     `tests/` o un extra declarado): **PARA**. No inventa contenido para tapar el hueco y
     **no ablanda el check para conseguir el verde**. Lo registra en el ledger como
     follow-up con id propio y lo escala al gate humano, que decide si se repara aquí o en
     spec aparte.

  Verificable: **hoy este escenario no se da** —comprobado adaptador a adaptador: los tres
  tienen `agents/`, `skills/` y `tests/`, y los extras declarados en CA-4 existen los
  tres—, así que el CA se cumple *por defecto* si el árbol real queda verde (CA-6); si se
  diera, se cumple con la entrada de follow-up en el ledger y **cero** líneas de check
  relajadas. Prohibido explícitamente: eliminar una comprobación existente, o degradar un
  extra declarado a opcional, para pasar a verde.

### Bloque B — la prosa del runner deja de poder envejecer (cierra F-SPEC-015-1)

- **CA-8 (el resumen de éxito se DERIVA de los pasos, no es una cadena fija)**: Dado
  `tools/check.mjs`, **cuando** el runner termina en verde, **entonces** el texto de éxito
  se **calcula** a partir de los pasos ejecutados (adaptadores construidos y checks
  corridos), de modo que sea **estructuralmente imposible** que contradiga a `PASOS`.
  Verificable: existe una función pura exportada (p. ej. `resumen(pasos)`) con test propio
  —`resumen(PASOS)` nombra `claude-code`, `kimi-code` y `opencode`, y sobre un conjunto
  sintético de pasos nombra **esos** y no los reales—; y `ejecuta()` imprime su resultado.
  Hoy falla: el texto es la constante `'build (claude+kimi) + checks (ambos adaptadores)'`.

- **CA-9 (la prosa de cabecera no contradice a `PASOS`)**: Dado el comentario de cabecera de
  `tools/check.mjs`, **cuando** se lee el fichero, **entonces** no afirma un conteo de
  checks ni un conjunto de adaptadores que contradiga la realidad de `PASOS`. Verificable
  con un test que **hoy falla**: el fuente de `check.mjs` no contiene las cadenas
  `SEIS`/`seis` ni `ambos adaptadores`, y —si la cabecera declara un número de checks— ese
  número coincide con el conteo de scripts **distintos** de `tools/checks/` referenciados
  en `PASOS` (hoy **9**). Recomendación de diseño: que la cabecera **no** repita el conteo
  y remita a `PASOS`; la única prosa con números es la derivada de CA-8.

- **CA-10 (el runner no cambia de comportamiento ni gana pasos)**: Dado el arreglo completo,
  **cuando** corre `node tools/check.mjs`, **entonces** ejecuta **los mismos 17 pasos** que
  hoy (3 builds + 13 checks + `valida`) —`layout` sigue siendo **un solo paso**, porque se
  autodescubre y no se invoca una vez por adaptador— y sale **exit 0**. Verificable:
  `PASOS.length` y la lista de nombres son idénticos a los actuales (test), y el runner
  sale 0; los tests existentes de `tools/tests/check.test.mjs` (propagación de exit != 0,
  cada paso invoca un script real) siguen verdes sin modificarse.

### Bloque C — coherencia documental y frontera del cambio

- **CA-11 (`docs/arquitectura.md` deja de describir el agujero que ya no existe)**: Dado que
  §"Tests y checks" —reescrita por SPEC-015— hoy dice la verdad al afirmar que `layout`
  *"no se parametriza por adaptador … pero **hoy solo verifica la superficie de
  `adapters/claude-code/`** (no la de kimi-code ni la de opencode)"*, **cuando** esta spec
  cierra el hueco, **entonces** ese texto se actualiza: `layout` pasa a la lista de checks
  **generalizados a los tres adaptadores**, indicando **cómo** (autodescubrimiento del
  directorio `adapters/`, como `roles-fuente-unica`, frente a la enumeración en `PASOS` de
  `referencias`/`manifiestos`) y que los extras por harness son declarativos. Verificable:
  `grep -n "solo verifica la superficie de \`adapters/claude-code/\`" docs/arquitectura.md`
  → **0 resultados**; el párrafo de generalización nombra `layout` y cita **ADR-011**. Sin
  este CA, arreglar el código dejaría drift nuevo justo en el documento que acaba de dejar
  de mentir.

- **CA-12 (ADR-011 registra la política de generalización de checks)**: Dado que la spec
  elige autodescubrimiento para `layout` y mantiene la enumeración para
  `referencias`/`manifiestos`, **cuando** alguien añada el harness nº4 o un check nuevo,
  **entonces** existe `docs/adr/ADR-011-*.md` que decide **cuándo se autodescubre y cuándo
  se enumera**, con sus consecuencias y las alternativas rechazadas. Verificable: el fichero
  existe con esas piezas y queda en `borrador` hasta el gate humano (RN-09). *Este CA se
  cumple con la entrega de esta misma spec + ADR-011; el implementador no escribe el ADR.*

- **CA-13 (no-regresión: nada de lo que hoy está verde se pone rojo)**: Dado el cambio
  completo, **cuando** corren los gates del repo, **entonces**: `node tools/check.mjs` →
  **exit 0** con sus **9 checks**; `npm test` → **verde**, con conteo **≥ 289** (el actual)
  **más** los tests nuevos de CA-1..CA-10, y **0 fallos**;
  `node core/scripts/valida.mjs --dir docs` → OK. Verificable ejecutando los tres comandos.

- **CA-14 (frontera del diff)**: Dado el alcance acordado, **cuando** se mide el diff,
  **entonces** los ficheros tocados están **contenidos** en: `tools/checks/layout.mjs`,
  `tools/check.mjs`, `tools/tests/layout.test.mjs`, `tools/tests/check.test.mjs`,
  `docs/arquitectura.md`, `docs/adr/ADR-011-*.md`, y esta spec + su ledger. **Cero**
  ficheros bajo `core/`, **cero** bajo `docs/fundacion/`, `FOUNDATION.md` **intacto**, y
  **sin** tocar `README.md` ni `docs/fundacion/contexto.md`. Verificable:
  `git diff --name-only main` ⊆ esa lista.

## Entidades y reglas afectadas
<!-- Cita RN-xx, ADR-NNN y términos de docs/fundacion/dominio.md. Referencia, no dupliques. -->

- **RN-03** (el enforcement es independiente del harness): es la regla que el defecto
  erosiona. Un check de invariantes que solo conoce un harness no puede sostener una
  garantía "independiente del harness"; CA-1 la repara en el plano del árbol.
- **RN-10** (dogfooding / el repo se autogestiona con su propio estándar): sostiene el
  bloque B —la prosa del runner es drift del propio repo— y obliga a que este trabajo entre
  por rama `ft/SPEC-017-slug` con la spec aprobada.
- **RN-02** (la dependencia va solo adaptador → núcleo) y **RN-05** (`dist/` es generado):
  no cambian; `layout` sigue mirando el **árbol comiteado**, nunca `dist/` (eso es de
  `referencias`/`manifiestos`). No se traslada aquí ninguna comprobación de artefacto.
- **ADR-001** (estructura del repo para multi-harness): `layout` es su enforcement; esta
  spec lo hace cubrir lo que ADR-001 promete. **No** se modifica el ADR (RN-04, inmutable).
- **ADR-007** (encaje de opencode): sostiene que la ausencia de `hooks/` y de
  `.claude-plugin/` en opencode es **diseño**, no defecto — base de CA-3/CA-4.
- **ADR-011** (política de generalización de checks): **lo introduce esta spec**; es la
  fuente de la decisión "autodescubrimiento para invariantes comunes, enumeración para
  validaciones específicas del harness". No se reescribe aquí.
- **RN-07 / RN-09** (máquina de estados / nadie aprueba su propio trabajo): spec y ADR-011
  se entregan en `borrador`; los firma el gate humano.
- **Lógica reutilizada, no reescrita**: `walk`/`REPO_ROOT` de `tools/checks/_util.mjs` y el
  patrón de iteración de `tools/checks/roles-fuente-unica.mjs` (`checkTodosAdaptadores`).
  El implementador **imita ese patrón**; no inventa uno nuevo ni mueve el existente.

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

- **Unificar los tres mecanismos de generalización** (`roles-fuente-unica`, `referencias`/
  `manifiestos`, `descripcion-fuente-unica`) bajo un solo patrón. La convivencia queda
  **justificada** por ADR-011, no eliminada: `referencias`/`manifiestos` validan cosas
  específicas del harness y su enumeración es correcta. Refactorizarlos sería un cambio
  grande en la zona más sensible del repo sin defecto detrás.
- **Añadir a `layout` comprobaciones de contenido** (que `agents/` tenga N ficheros, que el
  manifiesto sea válido, que las referencias resuelvan). Eso ya lo hacen `manifiestos`,
  `referencias`, `roles-fuente-unica` y `descripcion-fuente-unica`. `layout` verifica
  **presencia de superficie**, y así se queda.
- **Crear la superficie que a un adaptador le falte.** Si aparece (no aparece hoy), se
  escala — ver CA-7.
- **La deuda documental de `README.md` y de `docs/fundacion/contexto.md`** (ambos
  desactualizados). Es otra clase de trabajo —prosa de producto, con dueño distinto y
  `docs/fundacion/` bajo RN-08— y **aún no tiene destino asignado**. Se deja fuera a
  propósito; ver Notas para el gate, punto 4.
- **Tocar `core/`**, `docs/fundacion/**` o `FOUNDATION.md`: prohibido por CA-14.
- **Añadir pasos nuevos a `PASOS`** o cambiar qué corre CI: CA-10 lo impide explícitamente.

## Notas para el gate humano
<!-- Lo que quien aprueba necesita saber para decidir. -->

> Esta spec sigue en `borrador`; la arquitecta **NO** la aprueba (RN-09). Va acompañada de
> **ADR-011**, también en `borrador`.

1. **Metí F-SPEC-015-1 dentro, y este es el argumento que debes rebatir si no lo compartes**
   (justificado arriba, "Decisión de estructura"): arreglar `layout` **empeora** la mentira
   de `check.mjs` —`"ambos adaptadores"` pasa a ser más falso, y la cabecera contaría seis
   checks en el mismo fichero recién ampliado—, así que cerrarlo solo sería crear drift en
   el acto de cerrar drift. Están en **bloques separados**: si no lo compartes, **rechaza el
   bloque B en el gate y el A sigue en pie** sin re-scaffoldear nada.

2. **El arreglo no es una línea: hay una decisión de forma que has de mirar (CA-3/CA-4).**
   Los tres adaptadores **no tienen la misma superficie** —kimi-code no tiene `commands/`,
   opencode no tiene `hooks/` ni `.claude-plugin/`—, así que generalizar el bucle actual tal
   cual **inventaría incumplimientos**. La spec parte la comprobación en **mínimo común
   autodescubierto** (`agents/`, `skills/`, `tests/` para todos) + **extras declarados por
   harness**. Ese reparto es la decisión de fondo. Alternativa que rechacé y puedes preferir:
   exigir a todos solo el mínimo común y **nada** de extras — más simple, pero perdería la
   cobertura que `layout` ya tiene hoy sobre claude-code.

3. **Verificado: generalizar NO destapa ningún incumplimiento real hoy.** Los tres
   adaptadores tienen `agents/`, `skills/` y `tests/`, y los extras que CA-4 declara existen
   los tres. CA-7 existe como **protocolo por si acaso**, y su regla dura es la que te
   interesa: si sale rojo de verdad, el implementador **para y escala**, no ablanda el check
   ni inventa contenido para tapar el hueco.

4. **Deuda que dejo fuera a propósito y necesita tu decisión aparte**: `README.md` y
   `docs/fundacion/contexto.md` están desactualizados. No la absorbo porque es prosa de otra
   clase, con otro dueño (`docs/fundacion/` es RN-08) y sin destino asignado. Si la quieres
   dentro, dilo en el gate y re-scaffoldeo; el default recomendado es **fuera**.

5. **Zona sensible.** `tools/check.mjs` y `tools/checks/*` son lo que ejerce CI: un fallo
   aquí pone en rojo todo el repo. Por eso CA-10 congela los 17 pasos y CA-13 exige
   `npm test` verde (≥ 289 + los nuevos) y `node tools/check.mjs` exit 0. El orden TDD que
   espero: **primero** los tests de CA-1/CA-4/CA-8/CA-9 en rojo sobre el código actual
   (son reproducibles hoy), **después** el arreglo.

6. **¿ADR o no ADR?** Escribí **ADR-011** porque la elección "autodescubrimiento vs.
   enumeración" **constriñe a todo check y a todo harness futuro**, y hoy los tres
   mecanismos conviven sin que nadie haya escrito por qué. Si te parece exceso de ceremonia
   para el tamaño del fix, dilo: se puede degradar a un párrafo en `docs/arquitectura.md`
   (CA-11) y retirar CA-12.
