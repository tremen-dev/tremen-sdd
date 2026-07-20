---
id: SPEC-001
tipo: spec
epica: EPIC-001
estado: en-revision
aprobada-por:
historial:
  - {estado: borrador, fecha: 2026-07-20, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-20, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-07-20, por: Alberto Fojo}
  - {estado: en-revision, fecha: 2026-07-20, por: Alberto Fojo}
---
# SPEC-001 — Refactor a núcleo + adaptadores

## Problema

El método SDD (templates, scripts, máquina de estados, lib, prosa de roles,
tests) vive hoy mezclado en la raíz del repo con el empaque específico de Claude
Code (`.claude-plugin/`, `agents/`, `skills/`, `commands/`, `hooks/`). Mientras
haya un solo harness no duele; en cuanto entre Kimi Code (EPIC-001, CE-2) la
mezcla obliga a elegir entre dos males: duplicar el método por harness (drift —
lo que la épica nace para evitar) o dejar que detalles de un harness se filtren
al método "por comodidad" (fuga de acoplamiento, riesgo declarado en EPIC-001).

Esta spec **reorganiza el repo** en una capa de núcleo agnóstica (`core/`, única
fuente en git) y una capa de adaptadores simétrica (`adapters/<harness>/`, donde
Claude Code pasa a ser `adapters/claude-code/`), e introduce el **paso de build**
que empaqueta el núcleo dentro de cada adaptador instalable (salida `dist/`,
gitignored). Todo ello **sin reescribir la lógica del método** (scripts y máquina
de estados se mueven, no se rehacen; el build es maquinaria nueva mínima),
dejando la suite en verde y sentando las **bases comprobables** de CE-1 (núcleo
aislado) y CE-3 (fuente única de prosa de roles). No construye el adaptador Kimi
ni saca el enforcement a git/CI (specs posteriores de la épica).

Materializa la decisión de ADR-001 (mono-repo, adaptadores simétricos bajo
`adapters/`, núcleo empaquetado en cada adaptador por un paso de build; el
mecanismo de referencia relativa `../../core` quedó REFUTADO por la doc oficial
de Claude Code). No introduce reglas de negocio nuevas; `docs/fundacion/reglas.md`
aún no tiene RN numeradas que citar.

## Usuarios / roles afectados

- **Mantenedores de tremen-sdd** (rol humano): trabajan sobre un árbol con
  frontera núcleo/adaptador explícita y simétrica, y un paso de build para
  instalar/dogfoodear.
- **sdd-implementador**: ejecutará el movimiento y el script de build CA a CA.
- **sdd-verificador**: valida los checks de CI, la suite y la instalabilidad
  real del adaptador **construido**.
- **El propio plugin en runtime** (Claude Code): tras el build, sus agents/hooks
  resuelven el núcleo por ruta interna al plugin root.
- Indirectos: futuros adaptadores (Kimi y siguientes), que reutilizan el mismo
  mecanismo de build.

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA debe ser verificable con un test. -->

- **CA-1 (frontera y layout materializados)**: Dado el repo reorganizado, cuando
  se inspecciona el árbol, entonces (a) el método agnóstico vive bajo `core/`
  (`core/lib/`, `core/scripts/`, `core/templates/`, `core/roles/`,
  `core/tests/`) y no hay ficheros del método fuera de `core/`; (b) el empaque de
  Claude Code vive bajo `adapters/claude-code/`
  (`adapters/claude-code/.claude-plugin/plugin.json`, `.../agents/`, `.../skills/`,
  `.../commands/`, `.../hooks/`, `.../tests/`), sin superficie de adaptador en la
  raíz; (c) el tooling de build vive en `tools/` (nivel de repo); (d) el único
  fichero de empaque en la raíz es `.claude-plugin/marketplace.json` (escaparate
  repo-level). Verificable: un test/script comprueba la presencia de esas rutas y
  la ausencia de método o de superficie de adaptador en la raíz.

- **CA-2 (paridad de contenido: mover, no reescribir)**: Dado cada fichero del
  método movido a `core/` y cada pieza del adaptador movida a
  `adapters/claude-code/`, cuando se compara con su versión previa, entonces su
  contenido es idéntico salvo los ajustes de ruta estrictamente necesarios por el
  movimiento. Verificable: la lógica de `estado.mjs` (TRANSITIONS), `scaffold.mjs`,
  `valida.mjs`, `tablero.mjs`, `informe-qa.mjs`, `frontmatter.mjs` y de los hooks
  no cambia de comportamiento — lo prueban sus tests, que pasan sin modificación
  de asserts.

- **CA-3 (suite completa en verde)**: Dado el repo reorganizado y el adaptador
  construido, cuando se ejecuta la suite completa, entonces todos los tests pasan:
  los del núcleo directos sobre `core/tests/`, y los del adaptador contra el
  adaptador construido en `dist/claude-code/`. Verificable: `node --test` sobre
  el/los glob(s) actualizados sale con código 0, sin tests omitidos por rutas
  rotas.

- **CA-4 (núcleo aislado — base de CE-1, dependencia)**: Dado un check de CI que
  analiza imports y referencias de ruta (no grep de cadenas) de todo fichero bajo
  `core/`, cuando algún fichero del núcleo importa o resuelve una ruta que escapa
  de `core/` (hacia `adapters/`, `tools/`, `dist/`, la raíz, o cualquier cosa que
  no sea `node:*` u otro fichero de `core/`), entonces el check falla; en el árbol
  reorganizado el check pasa. Verificable: existe el script del check; un fixture
  de núcleo "contaminado" lo hace fallar y el árbol real lo hace pasar.

- **CA-5 (núcleo aislado — base de CE-1, tests sin adaptador ni build)**: Dado el
  árbol con `adapters/` y `dist/` ausentes (borrados o no copiados), cuando se
  ejecutan solo los tests del núcleo (`core/tests/`), entonces todos pasan sin
  error de módulo no encontrado. Verificable: los tests del núcleo no referencian
  ninguna ruta de adaptador ni el output de build; `node --test core/tests/*.test.mjs`
  en esa condición sale con código 0. (Implica reubicar los 3 tests de hook
  —require-spec, protege-verdad, calidad— fuera de `core/tests/`, a
  `adapters/claude-code/tests/`, porque ejercen los hooks del adaptador.)

- **CA-6 (fuente única de prosa de roles — base de CE-3)**: Dado el árbol
  reorganizado, cuando se inspecciona cualquier `adapters/claude-code/agents/*.md`,
  entonces NO contiene el cuerpo del system prompt del rol (sin `## Misión`,
  `## Flujo`, `## Reglas duras`), sino una referencia al rol como única fuente.
  Verificable: un check falla si un agent embebe secciones de prosa del rol y pasa
  cuando solo lo referencia. `core/roles/<idioma>/` es la única ruta con el cuerpo
  de los roles. (Reencuadre confirmado por el gate: la duplicación real de la
  `description` de disparo agent↔skill se difiere a la spec 2, follow-up
  F-SPEC-001-1.)

- **CA-7 (referencias adaptador→núcleo resueltas DENTRO del plugin root)**: Dado
  el adaptador construido en `dist/claude-code/` (con el núcleo bajo
  `dist/claude-code/core/`), cuando se resuelven en runtime las referencias del
  adaptador al núcleo, entonces todas apuntan a rutas internas al plugin root y
  NINGUNA escapa de él: la prosa de arranque de los agents referencia el núcleo
  como `${CLAUDE_PLUGIN_ROOT}/core/roles/<idioma>/<rol>.md` y
  `${CLAUDE_PLUGIN_ROOT}/core/scripts/…` (sin `../`); los imports ESM de los
  hooks hacia el núcleo resuelven a una ruta interna (`./core/…` o `../core/…`
  que permanece bajo el plugin root); `plugin.json` (`agents`) y `hooks.json`
  (`${CLAUDE_PLUGIN_ROOT}/…`) resuelven a ficheros existentes del artefacto.
  Verificable: un check confirma que no queda ninguna referencia con la forma
  refutada `${CLAUDE_PLUGIN_ROOT}/../../…` ni ningún `../` que escape el plugin
  root, y que cada ruta declarada resuelve a un fichero existente en
  `dist/claude-code/`.

- **CA-8 (el adaptador construido es descubrible, instalable y funcional)**: Dado
  el adaptador ya construido y el marketplace de la raíz con
  `source: "./dist/claude-code"`, cuando se instala desde el marketplace local y
  se ejerce, entonces (a) `.claude-plugin/marketplace.json` es válido y su
  `source` resuelve a `dist/claude-code/`, que contiene un `.claude-plugin/plugin.json`
  válido con `agents` y auto-discovery de `skills/`, `commands/`, `hooks/`
  resolviendo a ficheros existentes; y (b) **la instalación real funciona
  end-to-end mínimo**: el plugin carga sin error y un agent logra leer su fichero
  de rol en `${CLAUDE_PLUGIN_ROOT}/core/roles/<idioma>/<rol>.md` (ruta interna),
  demostrando que el núcleo viaja dentro del plugin. Verificable: (a) check de
  manifiestos; (b) instalación desde el marketplace local del artefacto construido
  + lectura de un rol resuelta. Si (b) fallara, PARAR y devolver al gate (no
  forzar la solución).

- **CA-9 (build determinista + salida gitignored + fuente única protegida)**:
  Dado `tools/build-adapter.mjs`, cuando se ejecuta para un harness, entonces
  ensambla de forma **determinista** (idempotente: dos ejecuciones producen la
  misma salida) el adaptador + el núcleo bajo `dist/<harness>/`, siendo `dist/`
  **gitignored**. Verificable: (a) `dist/` está en `.gitignore` y no hay ficheros
  de `dist/` trackeados; (b) un check confirma que **no existe ninguna copia del
  núcleo comiteada fuera de `core/`** (protege CE-1/CE-3: `core/` es la única
  fuente versionada); (c) ejecutar el build dos veces da un árbol de salida
  idéntico.

- **CA-10 (dogfooding: runtime real validado tras el refactor)**: Dado que hoy el
  plugin se carga desde la cache flat (`.../0.3.0`) y que tras el refactor el
  instalable es el adaptador construido, cuando se completa el trabajo, entonces
  el propio repo se autogestiona con el adaptador **construido e instalado** (o un
  modo dev del build documentado): se reinstala/recarga el adaptador desde
  `dist/claude-code/` y se comprueba que el runtime real funciona (los hooks
  disparan sobre las rutas vigiladas nuevas y un agent lee su rol). Verificable:
  procedimiento reproducible (build → instalar/recargar → ejercer un hook y una
  lectura de rol) documentado y ejecutado por el verificador; el runtime no queda
  roto. Incluye actualizar `.sdd.json.rutasVigiladas` a las rutas nuevas
  (`core/scripts/`, `core/lib/`, `adapters/claude-code/hooks/`).

- **CA-11 (`package.json` cubre build y ambas capas de test)**: Dado el árbol
  reorganizado, cuando se leen los scripts de `package.json`, entonces existe un
  script de `build` (invoca `tools/build-adapter.mjs`) y el/los script(s) de test
  ejecutan tanto los tests del núcleo (`core/tests/`, directos) como los del
  adaptador (`adapters/claude-code/tests/`, contra `dist/`). Verificable: `npm run
  build` produce `dist/claude-code/`; `npm test` (o `test:core` + `test`) descubre
  y ejecuta todos los tests existentes (nº ejecutados ≥ el de antes del refactor).

## Entidades y reglas afectadas
<!-- Cita RN-xx, ADR-NNN y términos de docs/fundacion/dominio.md. Referencia, no dupliques. -->

- **ADR-001** (Estructura del repo para multi-harness): esta spec lo materializa.
  La regla de dependencia adaptador→núcleo, la simetría bajo `adapters/`, el paso
  de build que empaqueta el núcleo dentro del plugin, y las restricciones duras de
  empaquetado de Claude Code (solo se copia el plugin root; `${CLAUDE_PLUGIN_ROOT}`
  = cache del plugin; nada de `../` que escape) vienen de ahí; no se redefinen
  aquí.
- **Núcleo / adaptador / build artifact**: términos de la frontera introducida por
  ADR-001. Cuando se estabilicen, fijarlos en `docs/fundacion/dominio.md` (no lo
  hace esta spec).
- **Máquina de estados** (`core/scripts/estado.mjs`, `TRANSITIONS`): se mueve, no
  se rehace (alcance de EPIC-001).
- Rutas vigiladas por `.sdd.json` (`scripts/`, `lib/`, `hooks/`): esta spec las
  mueve/renombra; se actualizan en CA-10.

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

- **Adaptador Kimi Code** y cualquier otro harness: esta spec deja la frontera, el
  mecanismo de build y la vía de descubribilidad listos, no crea adaptadores
  nuevos.
- **Sacar el enforcement a git pre-commit + CI** (CE-4): spec "Enforcement en git
  + CI". Aquí los hooks solo se reubican como piezas del adaptador; su lógica y su
  cableado a Claude Code no se rehacen.
- **Deduplicación profunda del bloque `description` de trigger** compartido entre
  cada `agents/*.md` y su `skills/*/SKILL.md`: esta spec establece y guarda la
  fuente única del *cuerpo* del rol (CA-6) pero NO unifica la `description`. Es la
  spec "Fuente única de roles → agents" (spec 2). Follow-up F-SPEC-001-1.
- **Distribución del artefacto construido vía registro/git** (publicar `dist/`
  para instalación remota sin build local): fuera; el dogfooding usa build +
  marketplace local.
- **Reescritura de la lógica** de scripts, máquina de estados o hooks: prohibido
  por el alcance de EPIC-001. El build es maquinaria nueva mínima, no reescritura.
- **Multi-idioma de roles**: sigue solo `es`.

## Notas para el gate humano
<!-- Lo que quien aprueba necesita saber para decidir. -->

1. **Mecanismo acatado y verificado contra la doc**: simetría total (todo bajo
   `adapters/<harness>/`) + paso de build que empaqueta el núcleo dentro del
   plugin. La vía previa de referencia relativa `../../core` quedó REFUTADA por la
   doc oficial (solo se copia el plugin root; `${CLAUDE_PLUGIN_ROOT}` = cache del
   plugin; prohibido `../` fuera del root). El symlink dereferenciado se descartó
   por la fricción de symlinks en Windows/git (dogfooding). No queda ninguna
   restricción dura sin resolver.

2. **Layout elegido (lo fijo como arquitecto, confirmar)**:
   - Fuente en git: `core/` (única copia del método) + `adapters/<harness>/`.
   - Tooling: `tools/build-adapter.mjs` (nivel de repo).
   - Salida instalable: `dist/<harness>/` (gitignored), con el núcleo bajo
     `dist/<harness>/core/`.
   - Marketplace: `.claude-plugin/marketplace.json` en la raíz con
     `source: "./dist/claude-code"`.

3. **Matiz honesto sobre `../` (a validar)**: la doc prohíbe `../` que ESCAPE el
   plugin/marketplace root. Los imports ESM de los hooks hacia el núcleo empaquetado
   pueden necesitar un `../core/…` que permanece DENTRO del plugin root (no escapa);
   eso es distinto del `../../core` refutado. Si el humano quiere CERO `../` incluso
   internos, es un follow-up menor (aplanar la ubicación de los hooks en el artefacto
   o que el build reescriba el import); no es un bloqueante. CA-7 exige explícitamente
   que ninguna referencia escape el plugin root.

4. **`dist/` gitignored ⇒ instalar exige build previo**: en un clone fresco no hay
   instalable hasta construir. Para dogfooding: build → añadir marketplace local →
   instalar/recargar (CA-10). Es un cambio de flujo respecto a hoy (cache flat
   `.../0.3.0`); el gate debe aceptarlo conscientemente.

5. **Riesgo de dogfooding**: la spec mueve las rutas vigiladas (`scripts/`, `lib/`,
   `hooks/`) y TODA la superficie del plugin, y cambia el flujo de carga. Trabajo en
   rama `ft/SPEC-001-…`; CA-8 y CA-10 acotan que el runtime real quede validado, no
   roto. Actualizar `.sdd.json.rutasVigiladas` es parte del trabajo (CA-10).

6. **Meta-regresión conocida**: existe el defecto abierto de specs migradas en
   `estado.mjs`; el verificador debe confirmar que el refactor no lo agrava (los
   tests de `estado` siguen igual de verdes, CA-2).

7. **CA-4/CA-5 son la base de CE-1, no CE-1 completo**: CE-1 se cierra cuando el
   check corre en CI (spec de enforcement). Aquí se entrega el check y sus tests; su
   integración en el pipeline es posterior.
