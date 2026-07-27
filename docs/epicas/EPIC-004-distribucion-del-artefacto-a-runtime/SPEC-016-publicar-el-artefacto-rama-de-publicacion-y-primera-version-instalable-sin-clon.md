---
id: SPEC-016
tipo: spec
epica: EPIC-004
estado: en-progreso
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-07-27, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-27, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-07-27, por: sdd-implementador}
---
# SPEC-016 — Publicar el artefacto: rama de publicacion y primera version instalable sin clon

## Problema
<!-- Qué duele y a quién. Cita reglas de negocio (RN-xx) de docs/fundacion/reglas.md. -->

EPIC-004 (`docs/epicas/EPIC-004-distribucion-del-artefacto-a-runtime/_epica.md`)
existe porque **no hay forma de instalar tremen-sdd sin clonar este repo y
construir**: `dist/` está gitignored, el `.claude-plugin/marketplace.json` de la
raíz apunta a `./dist/claude-code` y el README §Instalación documenta
`npm install && npm run build && claude plugin marketplace add <ruta local>`. El
equipo interno que empujó EPIC-003 tiene tres adaptadores construibles y ninguno
instalable, y "lo instalado" diverge de "lo mergeado" sin que nadie lo note
(**SPEC-012**: bug reportado contra el plugin 0.3.0 ya arreglado en fuente 0.4.0;
ledger de **SPEC-008**: el hook `calidad.mjs` cacheado seguía ladrando con el fix ya
mergeado).

**ADR-010** —con la vía elegida por el humano en el gate del 2026-07-27— decide la
forma: el artefacto se publica en una **rama de publicación del propio repo
fuente**, `release`, huérfana y 100% generada, con un árbol por harness más el
catálogo de Claude Code, y cada publicación es un commit + tag `v<version>` +
Release con notas. Un solo ref sirve a los tres harnesses (Claude Code por
marketplace nativo apuntando al ref; Kimi y opencode por git plano
`--single-branch` + copia, ADR-003 §6 / ADR-007).

Esa vía **no es gratis, y esta spec es donde se paga la factura**. Publicar un árbol
generado dentro del repo fuente obliga a tres cosas que ADR-010 decide y que aquí
hay que materializar **y demostrar**:

1. **Superseder parcialmente ADR-001 §5** («la copia dentro del adaptador … jamás se
   comitea») acotado a la rama `release`, con la invariante reformulada a "no existe
   ninguna copia **editable** del núcleo" (ADR-010 §7).
2. **Filtrar el disparo de CI** (`branches-ignore: ['release']`), demostrando que la
   garantía sobre `main` y sobre `ft/**` queda **idéntica** (ADR-010 §8). Si la
   única forma de que CI no falle fuese aflojar algo que protege la fuente, se
   **PARA y se eleva**.
3. **Demostrar que los gates no se disparan ni se ensucian**: publicar no puede
   necesitar `--no-verify` ni `SDD_SKIP_GATE=1`, y `fuente-unica` / `nucleo-aislado`
   / `manifiestos` tienen que seguir verdes **sin tocarlos** (ADR-010 §9).

Además, ADR-010 está **razonado sobre documentación citada pero no ejercido**: cinco
hipótesis [H1]…[H5] esperan contacto con GitHub y con los CLIs reales.

Esta spec es el **#1 del desglose** de la épica y su función es **desbloquear al
resto**: convierte ADR-010 en un artefacto realmente publicado y realmente
instalado, y con ello resuelve las hipótesis que las specs #2 (automatizar en CI),
#3 (procedimientos por harness + README) y #4 (trazabilidad en runtime) darían por
buenas sin evidencia. Es deliberadamente una **rebanada vertical fina**: publica a
mano **una** versión y verifica que se instala **sin build y sin pasar por el árbol
de fuentes**, en lugar de construir la automatización sobre un mecanismo no probado.

Toca **RN-01/RN-10** (el trabajo entra por su rama `ft/SPEC-016-…`), **RN-02** (nada
bajo `core/`), **RN-04** (ADR-001 no se edita: el supersede vive en ADR-010; y
ADR-010 tampoco se edita — un hallazgo que lo contradiga se escala a ADR nuevo),
**RN-05** (lo generado no se edita a mano — y su coletilla verificable queda
imprecisa: ver CA-10) y **RN-07/RN-09** (estados por `estado.mjs`, nadie firma su
propio trabajo).

## Usuarios / roles afectados

- **Equipos internos de tremen.dev (consumidores)**: son el destinatario. Al
  terminar tienen una vía de instalación real que no exige construir ni tocar el
  árbol de fuentes.
- **sdd-implementador**: el script de publicación en `tools/`, el estampado de
  versión en el build, el check de versión única y **el único cambio en
  `.github/workflows/ci.yml`**. Nada bajo `core/`. Si algo le empuja a `core/`, PARA
  y eleva.
- **sdd-verificador**: ejerce la publicación y la instalación, recoge evidencia
  (salidas de CLI, hashes, run ids de CI) y emite GREEN/RED. No escribe fuentes
  (ADR-009); su superficie es el ledger y `docs/_qa/SPEC-016/`. **Ojo**: varios CA
  se verifican observando CI y GitHub, no solo el filesystem.
- **Alberto Fojo (humano)**: confirma nombre de rama y versión en el gate; y decide
  sobre la protección de rama de `release` y sobre el ajuste de RN-05 (CA-10), que
  son suyos, no del implementador.
- **La persona que ejerce CE-1**: el gate decidió **arrancar en modo parcial** (el
  autor en entorno limpio demostrado, etiquetado). Las reglas de qué evidencia vale
  están en §Notas y son parte del contrato de esta spec.
- **sdd-producto**: consume la evidencia como avance medido de CE-1, CE-2 y CE-3
  (el cierre de la épica es gate humano, fuera de esta spec).

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA debe ser verificable con un test. -->

- **CA-1 (una sola fuente de versión, estampada en el artefacto)**: Dado el repo en
  un commit limpio con `package.json.version = X`, cuando se ejecuta
  `npm run build:all`, entonces (a) cada árbol `dist/<harness>/` contiene un
  `PROVENANCE.json` con `{version: X, commit: <SHA de 40 del HEAD>, harness,
  fecha: <ISO UTC>, sucio: false}`; (b) el `plugin.json` del artefacto de
  claude-code declara `version: X`; y (c) existe un check del repo, ejercido por
  `npm run check`, que **falla** si alguna versión declarada en el árbol fuente
  diverge de `package.json.version`. Verificable con test en `tools/tests/`.

- **CA-2 (el build sigue siendo determinista — [H4] de ADR-010)**: Dado un commit
  limpio, cuando se ejecuta `npm run build:all` dos veces seguidas, entonces los dos
  árboles son **byte-idénticos** (hash por fichero, incluido `PROVENANCE.json`). Y
  dado un árbol de trabajo **sucio**, cuando se construye, entonces el build no
  falla y `PROVENANCE.json` marca `sucio: true`. Verificable con test.

- **CA-3 (el árbol publicable se ensambla y valida en local, sin publicar nada)**:
  Dado `dist/` construido, cuando se ejecuta el script de publicación en modo seco
  (`node tools/publica.mjs --dry-run --out <dir>`), entonces `<dir>` contiene
  **exactamente** el layout de ADR-010 §2 —`.claude-plugin/marketplace.json` con un
  plugin cuyo `source` es `"./claude-code"` y **sin** campo `version` en la entrada;
  `claude-code/`, `kimi-code/` y `opencode/` en la **raíz** (no bajo `dist/`);
  `PROVENANCE.json`; y un `README.md` generado que declara que el ref es generado y
  no se edita a mano— y `claude plugin validate <dir>` termina con exit 0.
  Verificable con test + salida del CLI.

- **CA-4 (la rama `release` cumple su contrato)**: Dada la publicación hecha, cuando
  se inspecciona el repo remoto, entonces (a) existe la rama `release` y es
  **huérfana** —`git merge-base main release` no devuelve nada—; (b) su árbol es
  **byte-idéntico** al `--dry-run` local del mismo commit de fuente; (c) existe el
  tag `v0.5.0` apuntando a ese commit y un GitHub Release sobre él con notas de qué
  cambió; (d) el mensaje de commit cita `version` y el SHA de fuente; y (e) el
  commit se hizo **sin `git commit --no-verify` y sin `SDD_SKIP_GATE=1`** —los gates
  no se saltan porque no se disparan (ADR-010 §9)—, evidenciado por el historial de
  comandos del ejercicio. Evidencia: `git ls-remote`, `git merge-base`,
  `gh release view v0.5.0`, hashes.

- **CA-5 (L3 no se debilita para la fuente)**: Dado el único cambio permitido en
  `.github/workflows/ci.yml` —añadir `branches-ignore: ['release']` bajo `push`, sin
  tocar `pull_request` ni los jobs—, cuando se empuja, entonces (a) el push a
  `release` **no** dispara ningún run; (b) un push a `main` y un push a una rama
  `ft/**` **sí** disparan el run completo y pasan (run ids anotados); (c) el
  workflow no gana `branches`, ni `paths`, ni `tags`, ni exclusiones de jobs o
  pasos; y (d) un PR cuyo head sea `release` contra `main` dispara `pull_request` y
  **falla** —o, si se prefiere no abrir el PR, se evidencia que `pull_request` sigue
  sin filtros y que `npm run check` falla sobre ese árbol—. Si para evitar el fallo
  de CI hiciera falta cualquier otra concesión, se **PARA y se eleva**: es frontera,
  no criterio negociable.

- **CA-6 (L2 y los checks no se disparan ni se ensucian)**: Dado el ciclo completo,
  cuando se mide, entonces (a) el commit de publicación pasa el pre-commit **sin
  válvulas** (CA-4e); (b) en `main`, con la rama `release` ya existente,
  `npm run check` y `npm test` siguen en **verde sin haber modificado ningún check**
  —en particular `fuente-unica` y `nucleo-aislado`—; (c) `git ls-files dist/` en
  `main` devuelve **vacío**; (d) el `.claude-plugin/marketplace.json` de la raíz de
  `main` sigue con `source: "./dist/claude-code"` y `manifiestos` sigue verde; y (e)
  el diff de la rama de trabajo **no toca ningún fichero bajo `core/`**.

- **CA-7 (Claude Code instala sin build y sin pasar por el árbol de fuentes —
  CE-1/CE-2)**: Dado un entorno que cumple las reglas de evidencia de §Notas, cuando
  se ejecuta `claude plugin marketplace add
  https://github.com/tremen-dev/tremen-sdd.git#release` (o `#v0.5.0`) y
  `claude plugin install tremen-sdd@<marketplace>`, entonces (a) `claude plugin list`
  muestra el plugin instalado con `version: 0.5.0`; (b) `/sdd-init` estampa la
  estructura SDD en un proyecto vacío; y (c) un agente `sdd-*` resuelve su rol
  leyendo `${CLAUDE_PLUGIN_ROOT}/core/roles/es/<rol>.md` (transcript). Se anotan la
  versión del CLI de Claude Code y la fecha. **Se mide y se anota además** qué
  descarga el harness al añadir el marketplace (tamaño/tiempo, [H3] de ADR-010): no
  es criterio de paso, es dato para la doc de instalación y para CE-4.

- **CA-8 (opencode consume EL MISMO ref, sin bifurcar el método — CE-2)**: Dado el
  tag `v0.5.0`, cuando se obtiene por git plano
  (`git clone --depth 1 --single-branch --branch v0.5.0`, sin npm ni build) y se
  copia `opencode/.` a `<fixture>/.opencode/` siguiendo el procedimiento efectivo
  del piloto (`docs/estudios/opencode-piloto.md` §1 [H5]), entonces (a) el clon
  obtenido **no contiene** `package.json`, `tools/`, `adapters/` ni un `core/` de
  raíz —solo el árbol publicado—; (b) el árbol copiado es byte-idéntico a
  `dist/opencode/` construido localmente en el mismo commit de fuente; y (c)
  `opencode agent list` muestra los 7 agentes con sus modos y `opencode debug config`
  resuelve el plugin a un `file://…/require-spec.mjs`. Se anota la versión de
  opencode. *(No se re-verifica el pipeline end-to-end: eso lo cerró SPEC-014; aquí
  se verifica que el transporte publicado entrega lo mismo que el build local.)*

- **CA-9 (responder "¿qué versión tengo?" — semilla de CE-3)**: Dado el plugin
  instalado en CA-7, cuando se lee `PROVENANCE.json` desde el directorio del plugin
  instalado y se contrasta con `gh release list`, entonces se determina en menos de
  un minuto (a) qué versión está instalada y (b) si una versión posterior anuncia un
  cambio dado. Se ejerce **reproduciendo el escenario de SPEC-012**: dado un arreglo
  que entró en la versión publicada, decidir si la instalada lo incluye **sin leer
  el código fuente ni el historial de git**.

- **CA-10 (la deuda conceptual queda escrita, no enterrada)**: Dado que ADR-010
  supersede parcialmente ADR-001 §5 y reformula la invariante, cuando se termina la
  spec, entonces (a) `docs/arquitectura.md` describe el as-built —la rama `release`,
  su contrato, el filtro de CI y qué parte de ADR-001 §5 sigue vigente— sin duplicar
  el ADR, solo referenciándolo; (b) **ADR-001 no se ha editado** (diff vacío,
  RN-04); y (c) el ledger registra como **hallazgo elevado al humano** que la
  coletilla verificable de **RN-05** en `docs/fundacion/reglas.md` («`dist/` está
  gitignored y ningún fichero suyo se comitea») deja de ser literal, con la
  redacción propuesta — **sin editar `docs/fundacion/`**, que no es de esta spec.

> **Nota de secuencia**: CA-1, CA-2, CA-3 y las partes locales de CA-6 pueden ir en
> verde antes de publicar nada. CA-4, CA-5, CA-7, CA-8 y CA-9 exigen el push real y
> el CLI real. Si algo bloquea la publicación, la spec puede quedarse a mitad con
> evidencia parcial explícita, no con CA "aprobados de palabra".

## Entidades y reglas afectadas
<!-- Cita RN-xx, ADR-NNN y términos de docs/fundacion/dominio.md. Referencia, no dupliques. -->

- **ADR-010** (esta spec lo materializa): contrato de la rama (§1), layout publicado
  (§2), procedimiento (§3), versionado de fuente única (§4), `PROVENANCE.json` (§5),
  consumo por harness (§6), **supersede parcial de ADR-001 §5** (§7), **filtro de
  CI** (§8), **inocuidad frente a los gates** (§9) e hipótesis [H1]…[H5].
  **RN-04**: ADR-010 no se edita; un hallazgo que lo contradiga se escala a ADR
  nuevo (precedente: `docs/estudios/opencode-piloto.md` §3).
- **ADR-001**: **no se edita** (inmutable). Su §5 queda superseded **solo** en la
  cláusula "jamás se comitea", y **solo** para la rama `release`; el resto —build
  determinista, `dist/` gitignored en ramas de fuente, `core/` única fuente
  editable, nada de symlinks, regla de dependencia— sigue vigente y lo verifica
  CA-6.
- **ADR-002** (L1/L2/L3): el filtro de CI es la **única** concesión, y CA-5 existe
  para demostrar que no degrada la garantía sobre la fuente. `pull_request` intacto.
- **ADR-003 §6** (Kimi) y **ADR-007 §Decisión-1** + `docs/estudios/opencode-piloto.md`
  (opencode): **no cambian**; solo cambia de dónde sale el árbol (del ref publicado,
  no de un build local).
- **ADR-009**: el verificador no escribe fuentes; sí el ledger y `docs/_qa/`.
- **RN-01 / RN-10** (rama `ft/SPEC-016-…` con spec aprobada), **RN-02** (nada bajo
  `core/`), **RN-05** (lo generado no se edita a mano; su coletilla verificable →
  CA-10c), **RN-07/RN-09** (estados y firmas).

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

- **Automatizar la publicación desde CI** (CE-5 pleno) y confirmar [H5]: es la spec
  siguiente. Aquí se publica **a mano**, con el procedimiento escrito para que otra
  persona pueda repetirlo.
- **Protección de rama / ruleset sobre `release`**: recomendada por ADR-010 §8, pero
  es configuración de organización y la decide el humano; se propone en el gate, no
  se implementa aquí.
- **Ajustar la redacción de RN-05 en `docs/fundacion/reglas.md`**: se **eleva** como
  hallazgo (CA-10c). Editar `docs/fundacion/` no es de esta spec.
- **Instalación y actualización de Kimi Code**: bloqueada por dependencia externa
  (F-SPEC-003-1 / SPEC-013). CE-2 quedará parcial; aquí solo se publica su árbol.
- **Reescritura del README §Instalación y del doc por harness**, incluido
  **F-SPEC-014-3**: pertenece a la spec de procedimientos por harness. Consecuencia
  asumida y señalada al gate: hasta entonces el README documentará una vía
  **obsoleta** (ver §Notas).
- **Retirar el `marketplace.json` de la raíz de `main` y mover el dogfooding a
  `--plugin-dir`**: alternativa que ADR-010 deja anotada para el *footgun* del ref
  por defecto. No ahora: no se cambian dos cosas a la vez.
- **Ciclo completo de actualización (CE-4)**: necesita **dos** versiones publicadas;
  aquí solo se publica la primera.
- **Cerrar el `[ABIERTO]` de `docs/fundacion/contexto.md`** y las referencias de
  ADR-003 §213, ADR-007 §187, SPEC-010 §197 y SPEC-011 §236: se cierran cuando la
  épica cumpla.
- **Todo lo que la épica declara fuera**: distribución pública o a terceros,
  instalador propio, telemetría, multi-idioma, **F-SPEC-014-2** y migrar
  instalaciones existentes. Y **cambiar el método, los roles o la máquina de
  estados**: si publicar obligara a tocar `core/`, se **PARA** y se eleva.

## Notas para el gate humano
<!-- Lo que quien aprueba necesita saber para decidir. -->

**1. Qué cambió respecto a la versión anterior de esta spec.** Se reescribió entera
tras tu decisión de publicar en una **rama del repo fuente** en vez de un repo
dedicado. Lo nuevo, que antes no existía como alcance: el **supersede parcial de
ADR-001 §5** (CA-10), el **filtro de CI con prueba de no-degradación** (CA-5), la
**demostración de que los gates no se disparan** (CA-6) y el **contrato de la rama**
(CA-4). Desaparece la precondición de crear un repo en la organización: ya no hay
acción bloqueante tuya antes de empezar.

**2. Lo que esta vía te cuesta, para que lo firmes con los ojos abiertos.** (a) Una
invariante fundacional se reformula: "una sola copia del núcleo en git" pasa a ser
"una sola copia **editable**". (b) `.github/workflows/ci.yml` gana una excepción; el
argumento de que no debilita nada está en ADR-010 §8 y se **demuestra** en CA-5, no
se afirma. (c) **RN-05 se queda con una coletilla imprecisa** que yo no puedo
corregir (es `docs/fundacion/`, y su cambio es tuyo y de producto): CA-10c la eleva
con redacción propuesta. (d) El repo fuente crecerá con historia de artefacto en cada
publicación.

**3. Decisiones concretas que te pido en este gate**:
- **Nombre de rama `release`** (no `dist`: colisiona con el directorio `dist/` de
  todo checkout y hace ambiguo `git checkout dist`). Si prefieres otro, es un cambio
  de una línea.
- **Versión `0.5.0`**, como acordaste. Un tag publicado no se re-publica.
- **¿Quieres una regla de protección sobre `release`** (restringir quién empuja)?
  Recomendada por ADR-010 §8; es configuración tuya, no código.

**4. Qué evidencia vale para CE-1 y cuál no.** El eje **ya no es la credencial** —con
la rama en el repo fuente, quien accede lo ve todo—, sino el **procedimiento**: qué
pasos ejecuta el operador y por dónde pasan. Tres niveles, y el ledger debe decir en
cuál está:

- **CE-1 pleno (lo que se busca)**: una persona **distinta del autor del repo**, en
  su máquina, ejecuta un procedimiento que (i) **no ejecuta `npm install` ni
  `npm run build` en ningún punto**; (ii) **no lee ni copia nada del árbol de
  fuentes** —para Claude Code, solo `marketplace add <url>#<ref>` + `plugin install`;
  para opencode/Kimi, solo `git clone --depth 1 --single-branch --branch v<X>` de la
  **rama publicada**—; y (iii) no tiene un clon de trabajo de tremen-sdd en la
  máquina. Evidencia positiva exigida: listado del filesystem, historial de comandos
  y comprobación de que el checkout obtenido no contiene `package.json`, `tools/`,
  `adapters/` ni un `core/` de raíz (CA-8a).
- **CE-1 parcial (modo de arranque, decidido en este gate)**: el autor opera un
  **entorno limpio verificable** —contenedor, VM o usuario de SO nuevo— que cumple
  (i), (ii) y (iii) con la misma evidencia positiva. Se etiqueta en el ledger
  **"entorno limpio simulado — CE-1 parcial"** y **la épica no puede declarar CE-1
  cumplido solo con eso**.
- **No vale nunca**: instalar desde `dist/` o desde una ruta del clon de desarrollo;
  `marketplace add` con ruta local; copiar árboles desde el checkout de trabajo;
  ejecutar el build en cualquier punto; o describir el procedimiento sin ejecutarlo.

**Matiz explícito, para que el verificador no lo interprete a su aire**: el clon
interno que hace **el harness** al añadir el marketplace no cuenta como paso del
procedimiento del operador (CE-1 habla de *su procedimiento*), pero **se mide y se
anota** (CA-7): es dato honesto para la doc y para CE-4.

**5. Riesgos operativos que ya conocemos y hay que documentar** (no se resuelven
aquí, se registran): (a) el auto-update de marketplaces **privados** en Claude Code
es intermitente por diseño —el refresco en background desactiva los credential
helpers, doc oficial consultada el 2026-07-27—, mitigable con
`CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE=1`, `gh auth setup-git` o remoto
SSH; (b) **añadir el marketplace sin `#ref`** apunta a `main`, cuyo
`marketplace.json` referencia `./dist/claude-code` —inexistente en un clon— y falla
con un error confuso: el ref es obligatorio en toda la doc de instalación.

**6. Lo que puede salir RED y qué significaría.** [H1] (marketplace pinchado a un ref
con `source` relativo, repo privado) es la hipótesis de más peso: si falla, el
*fallback* documentado es `git-subdir`, que no cambia la forma de ADR-010 y se
resuelve dentro de esta spec. **El punto donde hay que PARAR y elevar** es CA-5: si
resultara que CI solo puede quedar verde aflojando algo que protege `main` o
`ft/**`, el mecanismo elegido tiene un coste mayor del previsto y la decisión vuelve
a tu mesa, no se parchea.
