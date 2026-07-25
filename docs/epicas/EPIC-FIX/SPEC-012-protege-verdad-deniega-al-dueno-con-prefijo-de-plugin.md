---
id: SPEC-012
tipo: spec
epica: EPIC-FIX
estado: en-revision
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-07-25, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-25, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-07-25, por: sdd-implementador}
  - {estado: en-revision, fecha: 2026-07-25, por: sdd-implementador}
---
# SPEC-012 — protege-verdad deniega al dueno con prefijo de plugin

## Problema
<!-- Qué duele y a quién. Cita reglas de negocio (RN-xx) de docs/fundacion/reglas.md. -->

En el plugin **publicado 0.3.0** (lo que corre hoy el proyecto athenia-flow), el gate
`protege-verdad` (RN-08: los documentos de verdad tienen dueño único) **deniega al DUEÑO
legítimo** de un documento de verdad cuando corre como subagente de plugin.

**Root cause.** El hook compara la identidad de rol **cruda** contra
`DUENOS_FUNDACION = ['main','sdd-arquitecto','sdd-producto']`. Pero un subagente de
plugin no llega con el nombre desnudo: llega **prefijado por el harness**, p. ej.
`agent_type === "tremen-sdd:sdd-arquitecto"`, que no casa con la lista → **deny**.
Verificado en el cache publicado
`~/.claude/plugins/cache/tremen-sdd/tremen-sdd/0.3.0/hooks/protege-verdad.mjs`
(línea 18 `const rol = payload.agent_type ?? payload.agent_name ?? 'main';` sin
normalizar; líneas 7 y 23 comparan crudo).

El gate queda **invertido**: no bloquea al intruso (a ese ya lo bloqueaba), sino al
dueño legítimo. Como el estándar manda que `sdd-arquitecto`/`sdd-producto` corran **como
subagentes**, en la práctica los documentos de verdad (`FOUNDATION.md`,
`docs/fundacion/`) solo se pueden tocar desde `main`, y empuja a rodear el gate con
`SDD_SKIP_GATE=1` — que sí es un agujero real (salta TODOS los gates). **Caso real
observado**: el arquitecto tenía redactados 9 términos de lenguaje ubicuo para
`docs/fundacion/dominio.md`, no pudo escribirlos, lo reportó y —correctamente— NO rodeó
el hook; el trabajo quedó sin aplicar. Los tests de 0.3.0 no lo cogieron porque solo
pasaban nombres de rol **sin** prefijo.

**Estado del árbol fuente (define el alcance).** El repo fuente **ya NO está en 0.3.0**:
`package.json` y `adapters/claude-code/.claude-plugin/plugin.json` marcan **0.4.0** (sin
publicar; tags existentes solo `v0.1.0` y `v0.2.0`). **El bug ya está arreglado en la
fuente** por el commit `7323a1f` (parte del refactor multi-harness):
- `adapters/claude-code/hooks/_comun.mjs` exporta `normalizaRol()` (quita el prefijo con
  `lastIndexOf(':')`); `adapters/claude-code/hooks/protege-verdad.mjs:18` lo usa. Sus
  tests (`adapters/claude-code/tests/protege-verdad.test.mjs`, casos **CA-8**) ya cubren
  la forma prefijada: `tremen-sdd:sdd-arquitecto` permite, `tremen-sdd:sdd-implementador`
  deniega, dueño sin prefijo sigue permitido.
- `adapters/kimi-code/hooks/protege-verdad.mjs` ya normaliza con `sinPrefijo(...)`, **pero
  sus tests** (`adapters/kimi-code/tests/protege-verdad.test.mjs`, casos CA-5c) **NO
  incluyen ningún caso con identidad prefijada** `plugin:rol` → hueco de regresión.
- `adapters/opencode/` NO tiene hook `protege-verdad` ni compara identidad de rol (delega
  en git/CI L2/L3, ADR-007 [H3]); verificado por grep: no hay copia del bug ahí.

Por tanto esta spec **NO reintroduce** el fix en 0.4.0 (ya está); su trabajo es (A)
**backportar** la reparación a la línea publicada 0.3.x, y (B) **cerrar el hueco de
cobertura** y la deuda documental en la fuente 0.4.0. La política sobre el prefijo ajeno
la fija **ADR-008** (acompaña a esta spec).

## Usuarios / roles afectados

- **Usuarios del plugin publicado 0.3.0** (p. ej. athenia-flow): hoy su arquitecto/PO no
  puede editar los documentos de los que es dueño; ganan el fix vía **0.3.1** con una
  nota de actualización que explica que el síntoma "el hook me deniega" es un **bug**, no
  una regla.
- **sdd-implementador**: reaplica a mano la normalización en el `hooks/protege-verdad.mjs`
  del **layout antiguo** (backport, bloque A), añade tests de regresión en ambas líneas,
  hace el bump de versión y redacta CHANGELOG + nota de actualización. En la fuente
  (bloque B) añade el test que falta en kimi-code y crea el CHANGELOG del repo. **No
  cambia el comportamiento del gate** más allá de la normalización ya acordada.
- **sdd-verificador**: valida que el dueño prefijado permite y el no-dueño prefijado
  deniega en **ambas** líneas; que la retrocompatibilidad (sin prefijo, `main`,
  `undefined`) se mantiene; y que la no-regresión (`npm test` verde) se sostiene.
- **sdd-arquitecto** (aquí): fija la política del prefijo ajeno en **ADR-008**; no
  implementa.

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA debe ser verificable con un test. -->

> **Decisión de estructura (una spec, dos bloques).** Es **UNA** EPIC-FIX/spec con dos
> bloques de CA (**A: backport 0.3.1** · **B: fuente 0.4.0**), no dos specs. Razón: un
> único **root cause** (identidad de rol sin normalizar en `protege-verdad`) y una única
> reparación conceptual (normalizar el prefijo); las dos líneas de release son dos
> destinos del **mismo** fix. Partirlo en dos specs duplicaría problema, roles y ADR de
> referencia, y rompería la trazabilidad de que ambos bloques cierran el mismo defecto.
> Los bloques son independientes en ejecución (ramas/commits distintos) pero se aprueban
> y verifican como una unidad.

### Bloque A — Backport 0.3.1 (línea 0.3.x, LAYOUT ANTIGUO)

> El backport se ramifica desde el commit que fue 0.3.0 = **`3cb30db`**
> ("fix(roles): delegacion real a subagentes"). En ese commit el layout es el **antiguo
> de un solo adaptador**: los ficheros son la RAÍZ `hooks/protege-verdad.mjs` y
> `tests/protege-verdad.test.mjs` (NO existe `adapters/` ni `core/`). Verificado con
> `git ls-tree 3cb30db`. El fix de `7323a1f` **NO se cherry-pickea limpio** (está en el
> layout nuevo `adapters/`), así que el backport **reaplica a mano** la lógica de
> normalización sobre el hook de layout antiguo.

- **CA-A1 (normalización de identidad en el hook de layout antiguo)**: Dado el
  `hooks/protege-verdad.mjs` del layout antiguo (desde `3cb30db`), **cuando** el hook
  determina el rol para comparar contra `DUENOS_FUNDACION`, **entonces** normaliza la
  identidad quitando el prefijo de plugin (semántica `lastIndexOf(':')`, ADR-008), de
  modo que `"tremen-sdd:sdd-arquitecto"` → `"sdd-arquitecto"`, y `"sdd-arquitecto"`,
  `"main"` y `undefined` quedan **inalterados** (no-op). Verificable con test de unidad
  sobre la función/expresión de normalización: las cuatro entradas producen la salida
  esperada.

- **CA-A2 (dueño prefijado PERMITE — el fix del síntoma)**: Dado un proyecto con
  `protegeVerdad` activo, **cuando** `tremen-sdd:sdd-arquitecto` escribe `FOUNDATION.md`
  y **cuando** `tremen-sdd:sdd-producto` escribe `docs/fundacion/vision.md`, **entonces**
  el hook **permite** (stdout vacío / sin `deny`). Verificable con test estilo CA-8 en
  `tests/protege-verdad.test.mjs` (layout antiguo), reusando el patrón `corre(dir,
  filePath, agentType)` del test existente.

- **CA-A3 (no-dueño prefijado DENIEGA — el gate sigue cerrado para intrusos)**: Dado el
  mismo proyecto, **cuando** `tremen-sdd:sdd-implementador` escribe bajo
  `docs/fundacion/*` o `FOUNDATION.md`, **entonces** el hook **deniega** con el mensaje
  de documento de verdad. Verificable con test estilo CA-8.

- **CA-A4 (retrocompatibilidad — nombres sin prefijo intactos)**: Dado el mismo
  proyecto, **cuando** la identidad es un dueño **sin** prefijo (`sdd-arquitecto`,
  `sdd-producto`, `main`, `undefined`), **entonces** el comportamiento previo se
  mantiene (dueño permite; y los tests preexistentes del layout antiguo —tablero
  denegado, no-dueño denegado, fail-open sin `.sdd.json`, bypass de ruta relativa—
  **siguen verdes** sin cambios). Verificable: los tests previos de
  `tests/protege-verdad.test.mjs` quedan verbatim y verdes; se **añaden** los de CA-A2/A3.

- **CA-A5 (bump de versión 0.3.0 → 0.3.1)**: Dado el layout antiguo, **cuando** se
  publica el backport, **entonces** `package.json` y `.claude-plugin/plugin.json` marcan
  **`0.3.1`**. Verificable: ambos ficheros contienen `"version": "0.3.1"`.
  (Nota de contexto verificada: en `3cb30db` el `.claude-plugin/marketplace.json` **no
  lleva campo `version`**; si en la rama de backport lo llevara, se bumpea también — el
  implementador lo comprueba en el HEAD de la rama antes de cerrar el CA.)

- **CA-A6 (CHANGELOG: QUÉ se rompía y DESDE CUÁNDO)**: Dado el backport, **cuando** se
  documenta la entrada de release, **entonces** existe una entrada de CHANGELOG para
  `0.3.1` que dice explícitamente que **desde 0.3.0** el dueño legítimo de los documentos
  de verdad (arquitecto/PO) quedaba **denegado** al correr como subagente de plugin por
  comparar el `agent_type` prefijado sin normalizar, y que 0.3.1 lo corrige — **no** un
  genérico "fix hook". Verificable: la entrada nombra `0.3.0` como origen y describe el
  síntoma (dueño denegado) y la causa (prefijo sin normalizar).

- **CA-A7 (nota de actualización para quien tenga 0.3.0)**: Dado un usuario en 0.3.0,
  **cuando** lee las notas de 0.3.1, **entonces** encuentra una nota **explícita** de que
  en 0.3.0 el arquitecto/PO queda **incapaz de editar los documentos de los que es
  dueño**, que el síntoma "el hook me deniega" se lee como regla pero es **bug**, y que
  la vía correcta es **actualizar** (no `SDD_SKIP_GATE=1`). Verificable: la nota existe y
  desaconseja explícitamente el rodeo con `SDD_SKIP_GATE`.

- **CA-A8 (listo para publicar — el publish es gate humano, no lo ejecuta la spec)**:
  Dado el backport completo (CA-A1..A7 verdes), **cuando** la verificación pasa,
  **entonces** la rama queda **lista para tag `0.3.1` + publish**, que es el **paso
  terminal humano**. Verificable: los tests del layout antiguo pasan en la rama de
  backport y el ledger declara "listo para publicar"; **la spec NO ejecuta** el tag ni el
  publish (queda como CA de estado "listo", no de acción).

### Bloque B — Fuente 0.4.0 (LAYOUT ACTUAL `adapters/` + `core/`)

> En la fuente el fix del hook **ya está** (`7323a1f`): claude-code normaliza y tiene sus
> tests CA-8; kimi-code normaliza pero le **falta** cobertura de la forma prefijada;
> opencode no compara identidad (ADR-007 [H3]). Este bloque cierra el hueco de cobertura
> y la deuda documental. **No** re-toca el hook de claude-code ni el de kimi-code (ya
> normalizan); solo añade tests y docs.

- **CA-B1 (ADR-008 registra la política del prefijo ajeno)**: Dado que la normalización
  `lastIndexOf(':')` acepta **cualquier** prefijo, **cuando** se busca la justificación
  de por qué un `foo:sdd-arquitecto` pasaría, **entonces** existe **ADR-008** en
  `docs/adr/` que decide "aceptar cualquier prefijo", **nombra la consecuencia**
  (`foo:sdd-arquitecto` sería tratado como dueño) y **por qué se acepta** (el gate protege
  verdad LOCAL, no es frontera de seguridad —esa es git/CI L2/L3, ADR-002—; escenario
  remotísimo; simplicidad). Verificable: `docs/adr/ADR-008-*.md` existe con esas tres
  piezas; **queda `borrador`** hasta el gate humano (RN-09); el arquitecto NO lo aprueba.
  (Este CA se cumple con la entrega de esta misma spec + ADR-008; el implementador no
  escribe el ADR.)

- **CA-B2 (test de regresión que falta en kimi-code: forma prefijada)**: Dado
  `adapters/kimi-code/tests/protege-verdad.test.mjs`, **cuando** se ejerce la identidad
  prefijada, **entonces** hay casos que verifican paridad con claude-code (CA-8):
  `tremen-sdd:sdd-arquitecto` sobre un documento de verdad → **permite**; y
  `tremen-sdd:sdd-implementador` → **deniega**. Verificable: los dos casos nuevos existen
  y pasan contra `dist/kimi-code/hooks/protege-verdad.mjs` (respetando que kimi degrada
  fail-open **solo** cuando NO hay identidad; con identidad prefijada dueña, permite; con
  identidad prefijada no-dueña, deniega).

- **CA-B3 (barrido de paridad en el resto de adaptadores)**: Dado el conjunto de
  adaptadores, **cuando** se audita la cobertura de la forma prefijada en `protege-verdad`,
  **entonces** queda declarado el estado por adaptador: **claude-code** ya la cubre (CA-8,
  no se toca); **kimi-code** la gana (CA-B2); **opencode** no aplica (no tiene hook
  `protege-verdad` ni compara identidad de rol — ADR-007 [H3]; verificado por ausencia de
  fichero). Verificable: no existe ningún otro adaptador con hook `protege-verdad` que
  compare identidad y carezca del caso prefijado (comprobable listando
  `adapters/*/hooks/protege-verdad.mjs` y su test).

- **CA-B4 (CHANGELOG del repo fuente: se crea)**: Dado que el repo fuente **hoy NO tiene
  fichero de changelog** (verificado: no existe `CHANGELOG*`), **cuando** se documenta
  este trabajo, **entonces** se crea `CHANGELOG.md` en la raíz del repo con una entrada
  para la línea 0.4.0 (en desarrollo, sin publicar) que registra el cierre de este hueco
  de cobertura, y —para no perder la trazabilidad— referencia el fix de fondo (`7323a1f`,
  normalización) y el backport 0.3.1. Verificable: `CHANGELOG.md` existe con esa entrada.
  (Si el gate prefiere otra ubicación/formato, es decisión de gate — ver notas.)

- **CA-B5 (no-regresión de la suite fuente)**: Dado el conjunto de cambios del bloque B,
  **cuando** corre `npm test` (build de los tres adaptadores → checks de invariantes →
  tests de núcleo y de adaptadores), **entonces** la suite queda **verde** con conteo
  **≥** el previo más los tests nuevos (CA-B2), sin tocar `protege-verdad.mjs` de
  claude-code ni de kimi-code (que ya normalizan). Verificable: `npm test` verde; el `git
  diff` de los hooks `protege-verdad.mjs` de la fuente está **vacío**.

## Entidades y reglas afectadas
<!-- Cita RN-xx, ADR-NNN y términos de docs/fundacion/dominio.md. Referencia, no dupliques. -->

- **RN-08** (los documentos de verdad tienen dueño único): esta spec **repara su
  aplicación**. El hook `protege-verdad` es su enforcement L1; el defecto lo invertía
  contra el propio dueño. No cambia la regla ni la lista de dueños; corrige la
  **comparación** de identidad.
- **ADR-008** (Política del prefijo de plugin): esta spec lo **materializa** y lo cita
  como fuente de la semántica `lastIndexOf(':')`. La decisión "aceptar cualquier prefijo"
  y su consecuencia (`foo:sdd-arquitecto` pasaría) viven ahí; no se redefinen aquí.
- **ADR-002** (enforcement en capas L1/L2/L3): la garantía dura NO depende de este hook;
  vive en git pre-commit (L2) + CI (L3). Sustenta por qué la política de ADR-008 es
  aceptable (el hook no es la frontera de seguridad).
- **ADR-007** [H3] (opencode): documenta que opencode degrada fail-open en identidad de
  agente y por eso no tiene `protege-verdad` que comparar; sostiene CA-B3.
- **RN-03** (enforcement independiente del harness): refuerza que el fix del hook es
  higiene de proceso; la red de seguridad es git/CI.
- **RN-07 / RN-09** (máquina de estados / nadie aprueba su propio trabajo): la spec se
  entrega en `borrador`; ni la spec ni ADR-008 los aprueba la arquitecta.
- **RN-10** (dogfooding): en la **fuente**, `adapters/kimi-code/` y `adapters/claude-code/`
  están bajo el radar de rutas vigiladas del propio repo; el bloque B entra por rama
  `ft/SPEC-012-slug`. El **backport 0.3.1** vive en una rama de mantenimiento sobre el
  layout antiguo (`3cb30db`), donde `.sdd.json.rutasVigiladas` puede diferir; el
  implementador respeta el proceso de esa línea.
- **Lógica reutilizada (no reescrita)**: en la fuente, `normalizaRol()`
  (`adapters/claude-code/hooks/_comun.mjs`) y `sinPrefijo()`
  (`adapters/kimi-code/hooks/protege-verdad.mjs`) **ya existen y no se tocan**; el bloque
  A reaplica la **misma** semántica a mano por estar en layout distinto (sin `_comun`
  compartido con `normalizaRol`).

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

- **Cambiar el comportamiento del gate más allá de la normalización.** No se toca la lista
  de dueños, ni el fail-open de Kimi, ni las reglas del tablero, ni `SDD_SKIP_GATE` como
  mecanismo (se **desaconseja** en la nota, no se elimina en esta spec).
- **Restringir la normalización a un prefijo `tremen-sdd:` concreto.** Rechazado por
  ADR-008 (alternativa considerada); no se implementa.
- **Ejecutar el tag `0.3.1` y el publish** (bloque A): paso terminal **humano**; la spec
  deja la rama "lista para publicar" (CA-A8).
- **Re-tocar el hook `protege-verdad.mjs` de claude-code o kimi-code en la fuente**: ya
  normalizan (`7323a1f`); el bloque B solo añade tests y docs.
- **Añadir `protege-verdad` a opencode**: fuera; opencode delega en L2/L3 por diseño
  (ADR-007). No es un defecto que reparar aquí.
- **La regresión conocida de specs migradas** (`estado.mjs`): defecto aparte, no lo toca
  esta spec.

## Notas para el gate humano
<!-- Lo que quien aprueba necesita saber para decidir. -->

> Esta spec sigue en `borrador`; la arquitecta **NO** la aprueba (RN-09). Va acompañada de
> **ADR-008** (también en `borrador`). **Las dos decisiones de fondo ya las tomaste tú** y
> aquí quedan especificadas, no reabiertas.

1. **Dos decisiones humanas ya tomadas, aquí especificadas (no reabiertas):**
   (a) **Vía de release = backport 0.3.1 mínimo** desde `3cb30db` (layout antiguo,
   reaplicando la normalización a mano porque `7323a1f` no cherry-pickea limpio); 0.4.0
   sigue su curso por separado (bloque B). (b) **Política del prefijo ajeno = aceptar
   cualquier prefijo** (`lastIndexOf(':')`); su argumento queda **por escrito** en
   ADR-008 (nombra la consecuencia `foo:sdd-arquitecto` pasaría, y por qué se acepta),
   como exigiste ("decídelo y déjalo escrito, no solo en el commit").

2. **Una spec con dos bloques, no dos specs** (justificado arriba en Criterios): un solo
   root cause y una sola reparación conceptual; dos destinos de release. Si en el gate
   prefieres partirlo en dos specs (una de mantenimiento 0.3.x, otra de fuente 0.4.0), es
   una decisión válida — dilo y la arquitecta re-scaffolda; el default recomendado es UNA.

3. **El fix ya está en la fuente; lo urgente es el backport.** Lo que hoy sangra es el
   **publicado 0.3.0** (athenia-flow). El bloque B es cierre de deuda (cobertura kimi +
   CHANGELOG), no reparación.

4. **Decisión de gate abierta (menor): ubicación/formato del CHANGELOG del repo fuente**
   (CA-B4). Hoy no existe fichero de changelog; el default propuesto es crear
   `CHANGELOG.md` en la raíz con formato Keep-a-Changelog. Si prefieres otra ubicación
   (p. ej. por adaptador) o atarlo al release de 0.4.0, decídelo en el gate.

5. **`SDD_SKIP_GATE=1` NO se elimina en esta spec**, solo se **desaconseja** en la nota de
   actualización (CA-A7). Endurecer o retirar ese escape es, si se quiere, un fix aparte
   en EPIC-FIX; dilo si lo quieres dentro.

6. **Verificación del backport (aviso de proceso).** El bloque A vive sobre el layout
   antiguo (`3cb30db`), donde no hay `adapters/`/`core/` ni la suite `npm test` de la
   fuente. El verificador debe correr los tests del layout antiguo (`tests/*.test.mjs` de
   esa rama) contra el hook backporteado, no la suite de 0.4.0.
