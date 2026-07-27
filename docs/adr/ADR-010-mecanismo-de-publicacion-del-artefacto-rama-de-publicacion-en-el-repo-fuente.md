---
id: ADR-010
tipo: adr
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-07-27, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-27, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# ADR-010: Mecanismo de publicacion del artefacto: rama de publicacion en el repo fuente

- Deciders: propone sdd-arquitecto; aprueba el humano (Alberto Fojo) en el gate.
  **Iteraciones del gate (2026-07-27)**: (1) fija audiencia **interna**, los **tres
  harnesses** y el canal **GitHub de la organización**; (2) recibe la propuesta
  inicial de esta ADR —un **repo de distribución dedicado**— con sus tres argumentos
  a favor (lectura por repositorio y no por rama, no tocar el CI, no superseder
  ADR-001) y **elige igualmente publicar en una rama del propio repo fuente**,
  reafirmándolo tras exponerle el coste: **no multiplicar repositorios** pesa más
  que ese coste; (3) acepta la consecuencia y **reescribe CE-1** de EPIC-004 (el
  aislamiento de la fuente sale de la épica y pasa a "Más adelante" del roadmap
  como criterio propio). Este ADR registra la vía elegida y **asume explícitamente
  lo que esa elección obliga**: superseder parcialmente ADR-001 §5 y filtrar el
  disparo de CI.
- Specs relacionadas: **SPEC-016** (EPIC-004, spec #1) lo materializa y lo ejerce
  contra GitHub y los CLIs reales. **Supersede parcialmente ADR-001 §5** (ver
  §Decisión punto 7: alcance exacto de lo superseded y de lo que sigue vigente);
  **complementa** ADR-002 (enforcement en capas), ADR-003 §6 (instalación sin
  marketplace, Kimi) y ADR-007 (encaje de opencode), sin superseder ninguno de los
  tres. Origen: EPIC-004, CE-1 (instalar y operar sin build ni árbol de fuentes),
  CE-2 (los tres harnesses sin bifurcar el método), CE-3 (versión identificable) y
  CE-5 (publicar es un paso del proceso).

## Contexto

Hoy no existe forma de instalar tremen-sdd sin clonar y construir: `dist/` está
gitignored (ADR-001 §5), el `.claude-plugin/marketplace.json` de la raíz apunta a
`./dist/claude-code` (ruta local del clon) y el README §Instalación documenta
`npm install && npm run build && claude plugin marketplace add <ruta local>`. La
consecuencia no es teórica: **SPEC-012** fue un bug reportado contra el plugin
instalado (0.3.0) que ya estaba arreglado en fuente (0.4.0), y el ledger de
**SPEC-008** anota que el hook `calidad.mjs` cacheado seguía ladrando con el fix ya
mergeado. "Lo instalado" y "lo mergeado" divergen en silencio.

El artefacto a publicar ya existe y es estable: `tools/build-adapter.mjs <harness>`
ensambla un árbol **autocontenido y determinista** en `dist/<harness>/` (superficie
del adaptador + `core/` dentro) para los tres harnesses (`npm run build:all`). Lo
que falta es **dónde vive ese árbol una vez construido y cómo llega a una máquina
que no tiene el repo**.

La restricción dura es **CE-2**: un mismo mecanismo tiene que servir a un harness
**con** marketplace nativo (Claude Code) y a dos **sin** él (Kimi y opencode se
instalan por procedimiento sobre el artefacto autocontenido, ADR-003 §6 y ADR-007
§Decisión-1), **sin bifurcar el método**.

### Hallazgos verificados contra documentación vigente

**Claude Code — plugins y marketplaces** (code.claude.com/docs/en/plugin-marketplaces,
/discover-plugins y /plugins, **consultadas el 2026-07-27**):

- **Un marketplace puede vivir en una rama o un tag.** «**Marketplace source**:
  where to fetch the `marketplace.json` catalog itself. Set when users run
  `/plugin marketplace add` or in `extraKnownMarketplaces` settings. **Supports
  `ref` (branch/tag)** but not `sha`». Y la sintaxis: «To add a specific branch or
  tag, append `#` followed by the ref» (ej.
  `/plugin marketplace add https://gitlab.com/company/plugins.git#v1.0.0`). Formas
  aceptadas de `add`: «**GitHub repositories**: `owner/repo` format»; «**Git
  URLs**: any git repository URL»; «**Local paths**»; «**Remote URLs**: direct URLs
  to hosted `marketplace.json` files». El ref apuntado debe contener
  `.claude-plugin/marketplace.json`.
- **El `source` relativo de un plugin resuelve dentro de ese mismo ref**: «Paths
  resolve relative to the marketplace root, which is the directory containing
  `.claude-plugin/`» y «Relative paths resolve against a local copy of the
  marketplace, so they work when users add your marketplace from a git source or a
  local directory» (no funcionan si el marketplace se añadió como URL directa al
  `marketplace.json`).
- **Repos privados**: soportados. «Claude Code supports installing plugins from
  private repositories. For manual installation and updates, Claude Code uses your
  existing git credential helpers … GitHub `owner/repo` shorthand sources clone
  over SSH by default; set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` to clone them over
  HTTPS». Matiz operativo: «the background refresh disables git credential helpers
  for its `git pull` … so private-marketplace auto-updates may fail
  intermittently», mitigable con `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE=1`
  y `gh auth setup-git`. Y aviso relevante para un repo que crece: el fallback de
  re-clonado «can time out on large repositories».
- **Versión**: se resuelve por «1. `version` in the plugin's `plugin.json`; 2.
  `version` in the plugin's marketplace entry; 3. The git commit SHA of the
  plugin's source»; si se declara, **hay que subirla en cada release** («pushing
  new commits without changing that string does nothing for existing users»); y
  «Avoid setting `version` in both `plugin.json` and the marketplace entry».
- **Artefactos zip por URL**: `--plugin-url` acepta «a plugin that is already
  packaged as a `.zip` archive and hosted at a URL, such as a CI build artifact»,
  pero «Claude Code fetches the archive at startup and **loads it for that session
  only**». No es una instalación.
- **CI**: «**The default workflow token can only access the workflow's own
  repository**, so a private marketplace in another repository needs a personal
  access token or app token».

**GitHub Actions — filtrado del evento `push`** (docs.github.com, *Workflow syntax*
y *Events that trigger workflows*, **consultadas el 2026-07-27**):

- Sin filtros, `on: push` «Runs your workflow when you push a commit **or tag**».
- «You cannot use both the `branches` and `branches-ignore` filters for the same
  event in a workflow».
- **«If you define only `tags`/`tags-ignore` or only `branches`/`branches-ignore`,
  the workflow won't run for events affecting the undefined Git ref»**. Es decir:
  declarar solo `branches-ignore` deja fuera **todos** los pushes de tag, sin
  necesidad de un `tags-ignore`.

**GitHub — granularidad de acceso** (docs.github.com, *Repository roles for an
organization*, **consultada el 2026-07-27**): los roles se asignan **por
repositorio** («customize access to each repository in your organization by
assigning granular roles»); *Read* permite «Pull from assigned repositories». **No
aparece ningún mecanismo de lectura por rama.** Consecuencia asumida por el gate:
quien reciba acceso para instalar verá también `core/`; por eso CE-1 fue reescrito.

**Kimi Code** (ADR-003 §Contexto, doc oficial de Kimi CLI, jul 2026) y **opencode**
(ADR-007 §Contexto, opencode.ai/docs 2026-07-23; y
`docs/estudios/opencode-piloto.md`, **ejercido contra opencode 1.18.5 el
2026-07-27**): ninguno tiene marketplace; instalar es **copiar el árbol
autocontenido** al destino nativo (opencode: `<proyecto>/.opencode/`, con el plugin
`.mjs` registrado explícitamente en el manifiesto).

**Comportamiento de los gates del propio repo** (leído en el código, 2026-07-27, no
de memoria):

- `tools/checks/fuente-unica.mjs` opera sobre `git ls-files` **del checkout
  actual**: solo ve los ficheros trackeados de la rama en la que corre.
- `tools/githooks/pre-commit.mjs` (L2) dispara require-spec **solo** si algún
  fichero staged empieza por una de las `rutasVigiladas` de `.sdd.json`
  (`core/scripts/`, `core/lib/`, `adapters/claude-code/hooks/`), y la capa de
  coherencia **solo** mira ficheros bajo `docs/` con nombre de artefacto SDD. Si no
  hay `.sdd.json` (`cfg = null`), `rutasVigiladas` queda vacío.
- `adapters/claude-code/hooks/protege-verdad.mjs` compara la ruta **relativa exacta**
  (`rel === 'FOUNDATION.md'`, `rel.startsWith('docs/fundacion/')`,
  `rel === 'docs/tablero.md'`) y es fail-open sin `.sdd.json`.

De todo esto se sigue la pregunta que este ADR fija: **qué se publica exactamente,
en qué ref, cómo se versiona, y qué hay que tocar en el repo para que publicar un
árbol generado dentro de él no rompa ni afloje nada.**

## Decisión

**El artefacto se publica en una RAMA DE PUBLICACIÓN del propio repo fuente,
llamada `release`: rama huérfana (sin historia compartida con `main`), cuyo
contenido es 100% generado —un árbol por harness en la raíz más el catálogo de
Claude Code— y que avanza con un commit por publicación, con tag `v<version>` y
GitHub Release con notas. Ese ÚNICO ref publicado sirve a los tres harnesses:
Claude Code lo consume como marketplace git nativo apuntando al ref; Kimi y
opencode obtienen ese mismo ref por git plano y copian su árbol al destino que ya
fijan ADR-003 y ADR-007. `dist/` sigue gitignored en las ramas de fuente y `core/`
sigue siendo la única copia EDITABLE del método.**

1. **Nombre y contrato de la rama.** Se llama **`release`**, no `dist`: en todo
   checkout de desarrollo existe un directorio `dist/` (salida de build), y `git
   checkout dist` sería un ref ambiguo con un path existente. Contrato de la rama,
   invariante y verificable:
   - **Huérfana**: no comparte ningún commit con `main` (`git merge-base main
     release` no devuelve nada). Nace con `git checkout --orphan`.
   - **Solo avanza hacia delante**: un commit por publicación, encadenados. No se
     fuerza el push ni se reescribe historia: el diff entre dos publicaciones **es**
     el "qué cambió" del artefacto (CE-3).
   - **100% generada**: ningún fichero se edita a mano. Es la extensión natural de
     RN-05 (`dist/` es generado y no se edita a mano) al ref publicado.
   - **Nunca se mezcla**: no se mergea a `main` ni desde `main`. Un PR que lo
     intentara sigue disparando el CI (§8) y falla, que es el comportamiento
     deseado.
   - **Se publica desde un worktree o clon aparte** (`git worktree add`), nunca
     conmutando el checkout de desarrollo.

2. **Qué contiene el ref publicado** (raíz de la rama `release`, todo generado):

   ```
   .claude-plugin/marketplace.json   # catálogo; plugins[].source = "./claude-code"
   claude-code/                      # = dist/claude-code/ (autocontenido, core/ dentro)
   kimi-code/                        # = dist/kimi-code/
   opencode/                         # = dist/opencode/
   PROVENANCE.json                   # version, commit SHA de la fuente, fecha UTC, checksums
   README.md                         # generado: qué es esto, cómo se instala, que no se edita a mano
   ```

   Los árboles cuelgan de la **raíz** de la rama, no de `dist/`: así el
   `.gitignore` de la fuente no interfiere y no hay que tocarlo. El `source` del
   plugin es la **ruta relativa** `./claude-code`, que la doc declara válida cuando
   el marketplace se añade desde una fuente git; catálogo y artefacto viajan en el
   **mismo ref**, que es lo que hace que **una sola publicación** cubra los tres
   harnesses.

3. **Cómo se publica.** Procedimiento acotado y documentado, ejecutable por
   cualquiera con push al repo (CE-5): `npm run build:all` en la fuente → ensamblar
   el árbol de publicación en un worktree de `release` → commit único cuyo mensaje
   cita `version` y el SHA de fuente → tag `v<version>` → push de rama y tag →
   GitHub Release sobre el tag con las notas de qué cambió. **El commit se hace sin
   `git commit --no-verify` y sin `SDD_SKIP_GATE=1`**: si publicar necesitara una
   válvula de escape, el mecanismo estaría mal (§9). SPEC-016 lo materializa como
   script en `tools/` —nunca en `core/`— y lo ejerce a mano; **automatizarlo en CI
   es la spec siguiente**.

4. **Versionado: una sola fuente de versión.** `package.json.version` del repo
   fuente es la **única** fuente (sigue `private: true`: no se publica en npm). El
   build la **estampa** en el artefacto: `version` de cada
   `.claude-plugin/plugin.json` y `PROVENANCE.json`. El tag es `v<version>`. Reglas
   que impone la doc de Claude Code y que aquí se aceptan: (a) **subir la versión en
   cada publicación** —si no, los usuarios existentes no reciben nada—; (b) **no**
   declarar `version` también en la entrada del marketplace. Un tag publicado es
   **inmutable**: no se re-publica; un error se corrige con la siguiente versión.

5. **Trazabilidad (CE-3).** `PROVENANCE.json` viaja **dentro de cada árbol
   publicado** —y por tanto llega a la cache del harness instalado— con al menos
   `version`, `commit` (SHA de 40 de la fuente), `fecha` UTC y `harness`. Responder
   "¿qué versión tengo y contiene el arreglo X?" es leer ese fichero en el runtime
   instalado y contrastarlo con los tags/releases publicados. (Nombre en inglés por
   la convención de `CLAUDE.md`: "código e identificadores en inglés".)

6. **Consumo por harness (un ref, tres consumidores, sin bifurcar el método).**
   - **Claude Code**:
     `claude plugin marketplace add https://github.com/tremen-dev/tremen-sdd.git#release`
     (o `#v<version>` para fijar una versión) + `claude plugin install
     tremen-sdd@<marketplace>`. Se documenta la **forma URL completa con `#ref`**,
     que es la documentada; que el atajo `owner/repo#ref` funcione es [H2], no se
     asume. **Añadir el marketplace sin `#ref` apunta al ref por defecto (`main`),
     cuyo `marketplace.json` referencia `./dist/claude-code` —que no existe en un
     clon— y falla**: el ref es obligatorio en la doc de instalación (§9, riesgo
     conocido).
   - **Kimi Code y opencode**: obtener **el mismo ref** por git plano
     (`git clone --depth 1 --single-branch --branch v<version>`) y copiar su árbol
     al destino que ya fijan ADR-003 §6 (Kimi) y ADR-007 §Decisión-1 más el
     procedimiento efectivo del piloto (opencode: `<proyecto>/.opencode/`).
     `--single-branch` es lo que hace que el procedimiento **no pase por el árbol de
     fuentes**, en el sentido de la CE-1 reescrita: lo que se descarga es la rama
     publicada, no `main`.

   El *mecanismo de instalación* difiere por harness —CE-2 lo permite y ADR-003/007
   ya lo fijaron—, pero **el objeto publicado es uno solo**: mismo commit, mismo
   tag, misma versión.

7. **Supersede PARCIAL de ADR-001 §5 (acotado y explícito).** ADR-001 §5 dice: «`dist/`
   está **gitignored**; `core/` sigue siendo la única copia de núcleo versionada. La
   copia dentro del adaptador es artefacto de build, **jamás se comitea**. Nada de
   duplicar el núcleo en el árbol de git; nada de symlinks».
   - **Queda superseded**, y solo eso: la cláusula «jamás se comitea» / «nada de
     duplicar el núcleo en el árbol de git», y **únicamente** para la rama `release`.
   - **Sigue vigente, sin cambios**: todo el resto de ADR-001 (§1–§4, §6 y, del §5,
     el build determinista, la salida a `dist/` y las referencias internas al plugin
     root); `dist/` **sigue gitignored en las ramas de fuente**; **nada de
     symlinks**; y la regla de dependencia adaptador→núcleo.
   - **La invariante se reformula, no se abandona**: deja de ser *"no existe ninguna
     copia del núcleo comiteada"* y pasa a ser **"no existe ninguna copia EDITABLE
     del núcleo: `core/` es la única fuente; cualquier otra copia en git es
     artefacto generado, en una rama que no se edita a mano y que nunca se mezcla
     con ramas de fuente"**. Verificable exactamente igual que antes:
     `tools/checks/fuente-unica.mjs` corre en las ramas de fuente sobre
     `git ls-files` del checkout, no ve la rama `release`, y sigue prohibiendo
     ficheros trackeados bajo `dist/` y copias de núcleo fuera de `core/` — **sin
     modificar el check**.
   - ADR-001 **no se edita** (RN-04): el supersede vive aquí.
   - **Roce con RN-05 que este ADR no puede resolver por sí solo**: `docs/fundacion/reglas.md`
     enuncia RN-05 con la coletilla verificable «`dist/` está gitignored y **ningún
     fichero suyo se comitea**». El *espíritu* (generado, no se edita a mano) se
     mantiene íntegro; la *coletilla* deja de ser literal en la rama `release`. La
     precisión de RN-05 es de `docs/fundacion/`, propiedad de sdd-producto y
     sdd-arquitecto vía gate, y **se eleva como hallazgo** en SPEC-016: no se toca
     desde aquí.

8. **Filtro de CI, y por qué L2/L3 no se debilitan para la fuente.** `on: push` sin
   filtros dispara «when you push a commit **or tag**», así que hoy el workflow
   correría sobre la rama `release` y fallaría (`npm test`/`npm run check` no pueden
   pasar sobre un árbol que solo contiene artefacto: no hay `package.json`, ni
   `tools/`, ni `core/`). El cambio es **uno y mínimo**:

   ```yaml
   on:
     push:
       branches-ignore: ['release']
     pull_request:
   ```

   - No se puede combinar `branches` con `branches-ignore` para el mismo evento; se
     usa **solo** `branches-ignore`, así que **todas** las demás ramas siguen
     disparando CI exactamente igual.
   - Al declarar solo `branches-ignore`, «the workflow won't run for events
     affecting the undefined Git ref»: los **pushes de tag dejan de disparar CI**.
     Eso **no pierde cobertura de fuente**: todo commit de fuente llega a CI por el
     push de su rama y por su PR; un tag apunta a un commit ya validado. Y evita que
     el tag de publicación dispare un run condenado a fallar.
   - **`pull_request` no se toca**: un PR contra `main` —incluido uno que intentara
     mezclar `release`— sigue corriendo la suite completa y fallaría, que es
     justamente la protección que se quiere.
   - **Resultado**: la garantía sobre `main` y sobre `ft/**` queda **idéntica**. Lo
     único que deja de ejecutarse es CI sobre un ref que no contiene fuente. Si en
     la implementación apareciera que la única forma de que CI no falle es aflojar
     algo que protege la fuente, **se PARA y se eleva** (SPEC-016 lo dice como
     frontera).
   - **Complemento recomendado, no sustituto**: una regla de protección/ruleset que
     restrinja quién empuja a `release`, para que nadie meta fuente ahí. Es
     configuración de repo, no código; se propone en el gate.

9. **Los gates del repo no se disparan ni se ensucian con la publicación** (leído en
   el código, a verificar en runtime en SPEC-016):
   - **L2 (pre-commit)**: los ficheros staged de una publicación son
     `claude-code/…`, `kimi-code/…`, `opencode/…`; **ninguno empieza** por
     `core/scripts/`, `core/lib/` ni `adapters/claude-code/hooks/`, así que la capa
     require-spec no se activa; y ninguno está bajo `docs/` con nombre de artefacto
     SDD, así que la capa de coherencia tampoco. Además el worktree de `release` no
     tiene `.sdd.json`. **Publicar no necesita `--no-verify` ni `SDD_SKIP_GATE=1`**,
     y que no los necesite es un CA de SPEC-016.
   - **L1 (`protege-verdad`)**: compara rutas relativas exactas
     (`FOUNDATION.md`, `docs/fundacion/`, `docs/tablero.md`). El
     `core/templates/FOUNDATION.md` que viaja dentro del artefacto queda en
     `claude-code/core/templates/FOUNDATION.md`: **no coincide**. Además el hook es
     fail-open sin `.sdd.json`. Y de todas formas la publicación la escribe un
     script (`fs`), no las tools `Edit`/`Write` que el hook intercepta.
   - **`fuente-unica` y `nucleo-aislado`**: corren en ramas de fuente sobre el
     checkout; `git ls-files` no ve otra rama. Siguen verdes **sin tocarlos**.
   - **El `marketplace.json` de la raíz de `main`** sigue apuntando a
     `./dist/claude-code` como marketplace de **dogfooding**, y
     `tools/checks/manifiestos.mjs` sigue verde sin cambios. Convive con el
     `marketplace.json` de la rama `release`: son dos objetos distintos en dos refs
     distintos. El riesgo de confusión (añadir el marketplace sin `#ref`) se ataca
     documentando el ref siempre (§6) y queda anotado como *hazard* conocido.

**Hipótesis marcadas [H] — a verificar contra los sistemas reales en SPEC-016**
(ninguna altera la *forma* fijada aquí; todas con fallback):

- **[H1]** `claude plugin marketplace add <url>#release` sobre este repo **privado**
  resuelve el `source` relativo `./claude-code` e instala el plugin con su `core/`
  interno. La doc lo respalda punto por punto (marketplace source soporta `ref`;
  rutas relativas resuelven desde fuente git; repos privados soportados), pero no
  está ejercido. *Fallback*: `source: git-subdir` con `url`+`path`+`ref`
  (documentado, clonado sparse).
- **[H2]** El atajo `owner/repo#ref` funciona igual que la URL completa con `#ref`.
  **No documentado**: la doc muestra `#ref` sobre URLs de git. Se documenta la URL
  completa; el atajo solo se ofrecerá si se confirma.
- **[H3]** Qué descarga realmente Claude Code al añadir un marketplace pinchado a un
  ref de un repo con más ramas (¿clon completo, o solo el ref?). Importa para el
  tamaño/tiempo —la doc avisa de que el re-clonado de marketplaces privados «can
  time out on large repositories»— y para redactar honestamente el procedimiento.
  No condiciona la forma.
- **[H4]** El build sigue siendo **byte-idéntico** entre dos corridas del mismo
  commit limpio tras estampar `version`/`commit` (ADR-001 lo declara determinista,
  pero nunca se ha comparado entre máquinas ni entre sistemas operativos: el repo se
  dogfoodea en Windows y CI corre en ubuntu). Con árbol sucio diferirá: se acepta y
  se marca en `PROVENANCE.json`.
- **[H5]** *(reemplaza a la [H5] de la versión anterior de este ADR, que asumía dos
  repos)*: al publicar desde el **mismo** repo, el token por defecto de Actions
  basta —la doc de Claude Code afirma que «can only access the workflow's own
  repository», que aquí es el caso favorable— con `permissions: contents: write`
  para empujar rama y tag, **sin secretos adicionales**. Queda por confirmar que
  ninguna regla de protección de rama del repo bloquee ese push. Es de la spec de
  automatización, no de SPEC-016.

## Consecuencias
### Positivas
- **CE-2 sin bifurcar el método**: una sola publicación (commit + tag) que los tres
  harnesses consumen; el marketplace nativo de Claude Code se usa tal cual y los dos
  sin marketplace obtienen exactamente el mismo objeto por git plano.
- **Un solo repositorio**: sin segundo repo que crear, permisionar y mantener
  sincronizado; sin token cross-repo; sin acción de organización bloqueante. Es
  exactamente lo que el gate priorizó.
- **Trazabilidad de primera** (CE-3): la versión, el tag, el Release y el commit de
  fuente viven en **la misma** historia y el mismo `gh`; el diff entre dos
  publicaciones es el "qué cambió" del artefacto, y `PROVENANCE.json` da el "qué
  tengo".
- **Actualizar es el mismo procedimiento** (CE-4): Claude Code,
  `/plugin marketplace update` + update del plugin; Kimi y opencode, re-obtener el
  ref y volver a copiar. Nada toca el estado SDD del proyecto del consumidor.
- **Los checks del repo no se tocan**: `fuente-unica`, `nucleo-aislado`,
  `manifiestos`, `layout` siguen igual y siguen verdes, porque operan sobre el
  checkout de las ramas de fuente.
- **Publicar desde CI será barato**: mismo repo, token por defecto [H5].

### Negativas / follow-ups
- **Hay que superseder parcialmente un ADR inmutable** (ADR-001 §5) y **reformular
  una invariante fundacional**. Está acotado y escrito (§7), pero es deuda
  conceptual real: a partir de aquí, "una sola copia del núcleo en git" ya no es
  cierto en su forma literal y hay que explicarlo cada vez.
- **RN-05 queda con una coletilla imprecisa** en `docs/fundacion/reglas.md` que este
  ADR no puede corregir (no es su dueño). Se eleva como hallazgo en SPEC-016; hasta
  que se ajuste, la regla escrita y el repo no dicen exactamente lo mismo.
- **CI pierde el disparo por tag** y el disparo sobre `release`. Argumentado en §8
  como pérdida nula para la fuente, pero es una excepción en un fichero de
  enforcement (ADR-002) y cualquier ampliación futura de esos filtros debe pasar por
  gate, no por conveniencia.
- **El repo fuente crece con historia de artefacto**: cada publicación añade los tres
  árboles completos. Con la doc avisando de timeouts en el re-clonado de
  marketplaces privados «on large repositories», es una magnitud a vigilar; mitiga
  que los árboles son pequeños y que la rama es huérfana (no arrastra la historia de
  `main`). Si algún día molesta, la salida es el repo dedicado que este ADR
  descartó, con este análisis ya hecho.
- **Footgun del ref por defecto**: `marketplace add` sin `#ref` apunta a `main`,
  cuyo `marketplace.json` referencia `./dist/claude-code`, inexistente en un clon →
  error confuso. Mitigación mínima: el ref es obligatorio en toda la doc de
  instalación. Alternativa a evaluar más adelante (no ahora, para no cambiar dos
  cosas a la vez): mover el dogfooding a `claude --plugin-dir dist/claude-code` y
  retirar el `marketplace.json` de la raíz de `main`.
- **El aislamiento de la fuente se pierde**: quien recibe acceso para instalar lee
  `core/`. El gate lo aceptó y producto reescribió CE-1; queda como criterio propio
  en "Más adelante" del roadmap, exigible el día que haya audiencia externa.
- **Auto-update de marketplaces privados intermitente** por diseño de Claude Code
  (el refresco en background desactiva los credential helpers). Mitigación
  documentada: `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE=1`,
  `gh auth setup-git` o remoto SSH. **Debe entrar en el doc de instalación**, o el
  consumidor creerá que está al día cuando no lo está — el fallo de SPEC-012 con
  otra cara.
- **Disciplina de versión obligatoria**: al declarar `version` en `plugin.json`, si
  no se sube en cada publicación los usuarios existentes **no reciben nada** y no se
  enteran. Candidato a check en la spec de automatización.
- **Kimi sigue sin ejercerse**: su consumo es idéntico en forma al de opencode (git
  plano + copia), pero la instalación de Kimi nunca se ha ejercido contra su CLI
  (F-SPEC-003-1 / SPEC-013, bloqueadas por cuenta externa). CE-2 quedará parcial;
  riesgo heredado, no creado aquí.

## Alternativas consideradas
<!-- Cada una con el motivo de rechazo. -->
- **Repositorio de distribución dedicado (`tremen-dev/tremen-sdd-dist`).** Era la
  propuesta original de este ADR y es técnicamente la más limpia: permite lectura
  del artefacto **sin** lectura de la fuente (los roles de GitHub son por
  repositorio), no obliga a filtrar el CI y no supersede nada de ADR-001.
  **RECHAZADA por decisión del gate humano (2026-07-27), informada y reafirmada tras
  exponerle esos tres costes**: el criterio del humano es **no multiplicar
  repositorios**. Sus contras reales —un segundo repo que permisionar y mantener
  sincronizado, y un PAT o token de GitHub App para que CI empuje a otro repo,
  porque «the default workflow token can only access the workflow's own
  repository»— pesaron más que sus ventajas. El análisis queda registrado aquí, y el
  aislamiento de la fuente sobrevive como criterio propio en el roadmap: si algún
  día hay audiencia externa, esta es la vía a retomar.
- **GitHub Release del repo fuente con el artefacto adjunto (tar.gz/zip).**
  RECHAZADA: **no sirve a Claude Code**, justo el harness con mecanismo nativo. Los
  `source` de un plugin son ruta relativa, `github`, `url` (git), `git-subdir` o
  `npm` — ninguno consume un *asset* de release; y `--plugin-url`, que sí acepta un
  `.zip` en una URL, «loads it for that session only»: no instala. Obligaría a
  bifurcar el método, que es lo que CE-2 prohíbe. Los Releases **sí** se usan, como
  **notas de versión** sobre el tag (CE-3), no como transporte.
- **Comitear `dist/` en `main`.** RECHAZADA sin matices: hace fallar
  `tools/checks/fuente-unica.mjs` (que prohíbe ficheros trackeados bajo `dist/`),
  mete artefacto generado en cada diff, permite que fuente y artefacto diverjan
  **dentro del mismo commit** y obligaría a tocar el `.gitignore` y el check. La
  rama huérfana obtiene el mismo resultado sin nada de eso.
- **Publicar el artefacto bajo `dist/` dentro de la rama `release`** (en vez de en
  la raíz). RECHAZADA: chocaría con el `.gitignore` heredado y obligaría a
  excepciones (`!dist/`), y además metería un nivel inútil en el `source` del
  marketplace. Los árboles cuelgan de la raíz del ref publicado.
- **Llamar `dist` a la rama.** RECHAZADA por ambigüedad operativa: existe un
  directorio `dist/` en todo checkout de desarrollo y git no puede desambiguar
  `dist` como ref o como path sin `--`. `release` no colisiona con ninguna ruta del
  repo.
- **Publicar como paquete npm (registro público o GitHub Packages).** RECHAZADA:
  contradice el canal decidido en el gate; `package.json` es `private: true`; el
  `source: npm` solo resolvería Claude Code y dejaría a Kimi y opencode necesitando
  npm y un registro autenticado para algo que es "copiar un árbol". Reintroduciría
  el ciclo de publicación núcleo↔adaptadores que ADR-001 ya rechazó por prematuro.
- **Marketplace en `main` cuyo `source` sea `git-subdir` a la rama `release`.**
  RECHAZADA como forma principal: parte el objeto publicado en dos pines
  independientes (el catálogo por `ref`, el plugin por `ref`/`sha`), multiplicando
  las combinaciones "instalado ≠ publicado" que la épica existe para eliminar.
  Catálogo y artefacto viajan en el **mismo ref**. (`git-subdir` queda como
  *fallback* de [H1].)
- **Un instalador propio (`install.sh` / `sdd install`) que descargue y coloque el
  árbol por harness.** RECHAZADA: EPIC-004 §Fuera lo prohíbe explícitamente («si el
  harness ya da un mecanismo, se usa; no se construye tooling nuevo de instalación
  por encima»). El "procedimiento por harness" es documentación ejercida, no
  software.
- **Publicar solo el artefacto de Claude Code y dejar Kimi y opencode para después.**
  RECHAZADA: CE-2 exige los tres, y el equipo interno que empujó EPIC-003 es el de
  opencode. El coste marginal de publicar los tres árboles en el mismo commit es
  cero.

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
