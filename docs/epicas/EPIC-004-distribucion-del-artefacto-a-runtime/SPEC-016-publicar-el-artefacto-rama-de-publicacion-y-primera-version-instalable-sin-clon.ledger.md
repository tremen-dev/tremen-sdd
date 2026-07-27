---
id: SPEC-016
tipo: ledger
epica: EPIC-004
---
# Ledger — SPEC-016 Publicar el artefacto: rama de publicacion y primera version instalable sin clon

## Resumen
<!-- refleja el estado de la spec; la fuente de verdad es el frontmatter de la spec -->
- Fase: implementación entregada → `en-revision`. **La publicación remota NO se ha
  hecho**: la rama `release` y el tag `v0.5.0` existen **solo en local**, a la
  espera del gate humano (§Cómo retomar).
- Rama: `ft/SPEC-016-publicar-rama-release`
- Versión publicada (pendiente de empuje): **0.5.0** · commit de fuente del
  artefacto ensamblado: el `HEAD` de la rama en el momento de re-ejecutar
  `tools/publica.mjs --local`.

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 (versión única estampada) | `tools/build-adapter.mjs` (`procedencia()`, sello de `PROVENANCE.json` y de `version` en el `plugin.json` del artefacto); `tools/checks/version-unica.mjs`; cableado en `tools/check.mjs` (`PASOS`); `package.json` y `adapters/claude-code/.claude-plugin/plugin.json` a 0.5.0 | `tools/tests/provenance.test.mjs` (CA-1a ×2, CA-1b); `tools/tests/version-unica.test.mjs` (6 casos, incl. divergencia, ausencia y `version` en la entrada del marketplace, + cableado en el runner) | | ❌ |
| CA-2 (build determinista, [H4]) | `tools/build-adapter.mjs`: la `fecha` es la del **commit de fuente en UTC**, no la hora de pared; sin git → `commit: null`, `sucio: true` | `tools/tests/provenance.test.mjs` (byte-identidad de dos corridas con PROVENANCE incluido; árbol limpio; árbol **sucio** sobre repo-fixture real; fuera de git); `tools/tests/build.test.mjs` (idempotencia previa, sigue verde) | | ❌ |
| CA-3 (árbol publicable en local) | `tools/publica.mjs` (`ensambla`, `catalogo`, `readme`, `verificaLayout`, CLI `--dry-run --out`) | `tools/tests/publica.test.mjs` (layout exacto, árboles en la raíz, `source: "./claude-code"` sin `version`, PROVENANCE raíz + por harness, README generado, determinismo, fallo si falta el build, `.git` del worktree) + **CLI real**: `claude plugin validate .tmp/dry` → `✔ Validation passed`, **exit 0** | | ❌ |
| CA-4 (contrato de la rama) | `tools/publica.mjs` (`publicaLocal`: worktree aparte, orphan, commit sin válvulas, tag `v<version>`, rechaza árbol sucio y tag repetido) | `tools/tests/publica.test.mjs` (CA-4b: los tres árboles publicados byte-idénticos a `dist/<harness>`) + ejercicio real **en local** (§Evidencia ejercida) | | ❌ |
| CA-5 (L3 no se debilita) | `.github/workflows/ci.yml`: `push: branches-ignore: ['release']`, y **nada más** | `tools/tests/workflow.test.mjs` (4 tests nuevos: `branches-ignore` presente; sin `branches`/`paths`/`tags`; `pull_request` sin filtros; jobs sin `if`/`continue-on-error`) + **run ids reales** (§Evidencia ejercida) | | ❌ |
| CA-6 (L2 y checks intactos) | ningún check modificado; `.sdd.json` intacto; `.claude-plugin/marketplace.json` de la raíz conserva `source: "./dist/claude-code"` | `tools/tests/publica.test.mjs` (ningún fichero publicado cae bajo `rutasVigiladas`; ninguno es artefacto SDD de `docs/`); `npm run check` verde sin tocar `fuente-unica`/`nucleo-aislado`/`manifiestos`; hook L2 ejercido (§Evidencia ejercida) | | ❌ |
| CA-7 (Claude Code instala sin build) | — (no requiere código: es el consumo del ref publicado) | pendiente de la publicación remota; ejercicio **parcial** con el layout publicado desde directorio local (§Evidencia ejercida) | | ❌ |
| CA-8 (opencode consume el mismo ref) | — | pendiente de la publicación remota; ejercido **contra transporte local** (`file://`) con el tag `v0.5.0` (§Evidencia ejercida) | | ❌ |
| CA-9 (¿qué versión tengo?) | `PROVENANCE.json` dentro de cada árbol (llega a la cache instalada) | mitad de filesystem ejercida; la mitad de `gh release list` está pendiente de la publicación remota | | ❌ |
| CA-10 (deuda conceptual escrita) | `docs/arquitectura.md` §"La rama de publicación `release` (as-built)" + §"El paso de build" actualizado; ADR-001 **sin tocar** (`git diff` vacío); RN-05 elevada abajo con redacción propuesta | `git log --oneline -- docs/adr/ADR-001*` sin commits nuevos en la rama; `npm run check` (`valida`) verde | | ❌ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-016/. Informe HTML opcional: _qa/SPEC-016/informe.html -->

## Evidencia ejercida por el implementador (2026-07-28)

Todo lo de abajo se **ejecutó**; nada está inferido. Lo que no se pudo ejecutar
está en §Lo que queda pendiente de la publicación remota, marcado como pendiente.

**Verde de partida y verde de llegada.** `npm test`: 310/310 → **339/339**.
`node tools/check.mjs`: exit 0, 17 pasos / 9 checks → **exit 0, 18 pasos / 10
checks**. `node core/scripts/valida.mjs`: OK.

**CA-3 — CLI real de Claude Code (2.1.220)**

```
$ node tools/publica.mjs --dry-run --out .tmp/dry
[publica] árbol de publicación ensamblado y válido en D:\src\tremen-sdd\.tmp\dry
$ ls -a .tmp/dry
.claude-plugin  PROVENANCE.json  README.md  claude-code  kimi-code  opencode
$ claude plugin validate ".tmp/dry"
✔ Validation passed          # exit 0
```

(La primera pasada dio `⚠ Found 1 warning: description: No marketplace
description provided`. Se corrigió añadiendo `description` al
`.claude-plugin/marketplace.json` de la raíz, de donde el catálogo publicado se
deriva; segunda pasada limpia. Hay test que lo fija.)

**CA-4 — publicación LOCAL (rama y tag creados, NADA empujado)**

```
$ node tools/publica.mjs --local
[publica] rama 'release' avanzada en LOCAL: commit 7187cf0… (fuente 61f4b00…), tag v0.5.0.
[publica] NADA se ha empujado. La publicación real la ejecuta una persona: …
$ git merge-base main release ; echo $?
1                              # sin ancestro común → huérfana (CA-4a)
$ git log release --oneline    # exactamente UN commit
$ git tag -l v0.5.0 -n1
v0.5.0   tremen-sdd v0.5.0 (fuente 61f4b00…)
```

Mensaje del commit (CA-4d): cita `version: 0.5.0` y el SHA de 40 de la fuente.

**CA-4b — byte-identidad árbol publicado ↔ `--dry-run` local del mismo commit**:
comparación blob a blob de los **188** ficheros del commit de `release` contra un
`--dry-run` recién ensamblado → `difieren: 0 | faltan: 0 | sobran: 0`.

**CA-4e / CA-6a — publicar NO necesita válvulas.** El commit de publicación se
hizo **sin `--no-verify` y sin `SDD_SKIP_GATE=1`** (`tools/publica.mjs` no los
usa; puede leerse en `publicaLocal`). El pre-commit L2 **sí es alcanzable** desde
el worktree —`core.hooksPath` es absoluto (`D:\src\tremen-sdd\tools\githooks`) y
la config se comparte entre worktrees—, así que no es que "no se ejecute": es que
**se ejecuta y pasa**. Comprobado además de forma explícita sobre un worktree
huérfano de usar y tirar con la publicación entera staged:

```
staged: 188 ficheros
$ node D:/src/tremen-sdd/tools/githooks/pre-commit.mjs   # en el worktree, SDD_SKIP_GATE sin definir
EXIT DEL HOOK=0
```

**CA-5 — comportamiento real de CI (run ids reales).** Estado de partida:
`on: push:` / `pull_request:` **sin filtros**. Estado final: `push:` con
`branches-ignore: ['release']`, `pull_request` intacto.

| Qué | Rama / evento | Run id | Resultado |
|---|---|---|---|
| push a `ft/**` con el workflow ya filtrado | `ft/SPEC-016-publicar-rama-release` (`84d7d21`) | **30310308149** | `success` |
| push a `ft/**` (2.º) | `ft/SPEC-016-publicar-rama-release` (`cb81fc5`) | **30310657690** | `success` |

Los dos runs son **posteriores** al commit que introduce `branches-ignore`, así
que demuestran que `ft/**` sigue disparando el run completo y pasa. Las dos
mitades que faltan (push a `release` → 0 runs; push a `main` → run) **no se
pueden observar sin la publicación remota ni sin merge**: quedan pendientes
abajo, sin run id inventado.

**CA-6 — los gates no se ensucian.** `git ls-files dist/` → vacío;
`.claude-plugin/marketplace.json` de la rama de trabajo conserva
`"source": "./dist/claude-code"` y `manifiestos` sigue verde; `fuente-unica` y
`nucleo-aislado` **sin modificar** y verdes; `git diff main... --name-only | grep
'^core/'` → vacío (CA-6e: ningún fichero bajo `core/` tocado).

**CA-7 (parcial, NO vale como CE-1) — el layout publicado instala y reporta 0.5.0.**
No se puede `marketplace add` un ref local: el CLI **rechaza** `file://…#release`
y `git://…#release` con `Invalid marketplace source format. Try: owner/repo,
https://..., or ./path` (probado con un `git daemon` local levantado a propósito).
Así que **[H1] no es ejercitable sin el remoto**. Lo que sí se ejerció, con
`CLAUDE_CONFIG_DIR` aislado y desinstalado después:

```
$ claude plugin marketplace add "D:/src/tremen-sdd/.tmp/verify"   # el árbol publicado, como directorio
✔ Successfully added marketplace: tremen-sdd
$ claude plugin install "tremen-sdd@tremen-sdd"
✔ Successfully installed plugin: tremen-sdd@tremen-sdd (scope: user)
$ claude plugin list
  ❯ tremen-sdd@tremen-sdd   Version: 0.5.0   Status: ✔ enabled
```

Esto de-riesga la mitad de [H1] que no depende del transporte: el **`source`
relativo `./claude-code` resuelve**, el plugin se instala con su `core/` dentro y
la versión que reporta el CLI es la estampada. Queda por ejercer la otra mitad:
que resuelva igual cuando el marketplace viene de una **URL git con `#ref`** sobre
este repo **privado**.

**CA-9 (mitad de filesystem) — `PROVENANCE.json` llega a la cache instalada.**

```
$ cat <config>/plugins/cache/tremen-sdd/tremen-sdd/0.5.0/PROVENANCE.json
{ "version": "0.5.0", "commit": "61f4b00…", "harness": "claude-code",
  "fecha": "2026-07-27T22:26:43.000Z", "sucio": false }
```

Responder "¿qué versión tengo?" es leer ese fichero. La otra mitad —contrastarlo
con `gh release list` para decidir si un arreglo dado está incluido— **necesita el
Release publicado**.

**CA-8 (contra transporte LOCAL, no contra `origin`) — opencode 1.18.5.**

```
$ git -c core.autocrlf=false clone --depth 1 --single-branch --branch v0.5.0 \
    "file://D:/src/tremen-sdd" .tmp/clon2
$ ls -a .tmp/clon2
.claude-plugin  PROVENANCE.json  README.md  claude-code  kimi-code  opencode
# CA-8a: package.json, tools/, adapters/, core/ de raíz, dist/, docs/ → AUSENTES
# CA-8b: los tres árboles del clon, byte-idénticos a dist/<harness> (0 diferencias)
$ cp -r .tmp/clon2/opencode/. <fixture>/.opencode/ && cd <fixture>
$ opencode agent list
sdd-orquestador (primary) · sdd-arquitecto, sdd-como-vamos, sdd-documentalista,
sdd-implementador, sdd-producto, sdd-verificador (subagent)     # 7 agentes
$ opencode debug config | grep -A2 '"plugin"'
"plugin": [ "file:///…/.opencode/plugins/require-spec.mjs" ]
```

El transporte fue `file://` al **repo local**, no `https://github.com/…`. La forma
del procedimiento (git plano, `--depth 1 --single-branch --branch v0.5.0`, copia)
es exactamente la que ADR-010 §6 fija; lo que falta es que el origen sea el remoto.

## Lo que queda pendiente de la publicación remota

Nada de esto se ha simulado ni dado por bueno. Falta ejecutar, **por el humano**:

```
git push origin release
git push origin v0.5.0
gh release create v0.5.0 --title "tremen-sdd v0.5.0" --notes-file <notas.md>
```

Con eso quedan por observar:

- **CA-4a/c** contra el remoto: `git ls-remote --heads origin release`,
  `git ls-remote --tags origin v0.5.0`, `gh release view v0.5.0`.
- **CA-5a**: que el push a `release` **no** dispare ningún run →
  `gh run list --branch release` debe devolver **vacío** (y `gh run list --limit 5`
  no debe mostrar ningún run con ese head SHA).
- **CA-5b (mitad de `main`)**: tras mezclar el PR, `gh run list --branch main`
  debe mostrar un run `push` en verde. No se puede anticipar desde esta rama.
- **CA-5d**: el PR desde `release` contra `main` dispara `pull_request` y falla.
  Alternativa admitida por el propio CA: evidenciar que `pull_request` sigue sin
  filtros (hecho, con test) y que `npm run check` falla sobre el árbol de
  `release` (no hay `package.json` en ese árbol: el comando ni siquiera arranca).
- **CA-7 completo** ([H1] real): `claude plugin marketplace add
  https://github.com/tremen-dev/tremen-sdd.git#v0.5.0` + `plugin install`, en un
  **entorno limpio verificable** (contenedor/VM/usuario de SO nuevo, sin clon de
  trabajo), con el etiquetado **"entorno limpio simulado — CE-1 parcial"** que
  exige §Notas-4 de la spec. Medir y anotar qué descarga el harness ([H3]).
- **CA-8 completo**: el mismo clon, pero desde
  `https://github.com/tremen-dev/tremen-sdd.git`.
- **CA-9 completo**: contrastar el `PROVENANCE.json` instalado con
  `gh release list`, reproduciendo el escenario de SPEC-012.

## Salvedades / follow-ups

- **F-SPEC-016-1 — Hallazgo elevado al humano (CA-10c): RN-05 deja de ser literal.**
  `docs/fundacion/reglas.md` enuncia hoy RN-05 con la coletilla verificable
  «`dist/` está gitignored y **ningún fichero suyo se comitea**
  (`tools/checks/fuente-unica.mjs`)». Tras ADR-010 §7 eso ya no es literalmente
  cierto: en la rama `release` sí viven ficheros generados por el build. El
  *espíritu* (generado, no se edita a mano) queda intacto. **No se ha editado
  `docs/fundacion/`**: no es de esta spec. **Redacción propuesta**, cambiando solo
  la frase verificable:

  > Verificable: el hook `protege-verdad` deniega escribir `docs/tablero.md`;
  > `dist/` está gitignored **en las ramas de fuente** y ningún fichero suyo se
  > comitea en ellas (`tools/checks/fuente-unica.mjs`). La **única** copia
  > comiteada del artefacto vive en la rama de publicación `release`, que es 100%
  > generada, no se edita a mano y nunca se mezcla con ramas de fuente
  > (ADR-010 §1 y §7).

  Destino: gate humano + `sdd-producto`/`sdd-arquitecto`. Sin esto, la regla
  escrita y el repo no dicen lo mismo.

- **F-SPEC-016-2 — `core.autocrlf` rompe la byte-identidad en el checkout (Windows).**
  Ejercido: los **blobs** comiteados en `release` son byte-idénticos a `dist/`
  (188/188), pero un `git clone` con la configuración estándar de Git para Windows
  (`core.autocrlf=true`) reescribe los finales de línea **al checkout** y los 188
  ficheros dejan de coincidir. **No rompe nada funcional** (nada de lo publicado
  depende del final de línea; no hay scripts de shell en los árboles). Mitigación
  aplicada: el `README.md` generado documenta
  `git -c core.autocrlf=false clone …` para reproducir la comparación.
  **Arreglo de fondo propuesto, NO aplicado**: un `.gitattributes` generado con
  `* -text` en la raíz de la rama publicada, que haría el árbol byte-exacto en
  cualquier plataforma sin depender del cliente. No se aplica aquí porque
  **añadiría una séptima entrada al layout que ADR-010 §2 fija** y que CA-3 testea
  como "exactamente" ese; RN-04 dice que un hallazgo que contradiga el ADR se
  escala, no se parchea. Destino: gate/ADR nuevo, o la spec de automatización.

- **F-SPEC-016-3 — [H1] no es ejercitable sin el remoto.** `claude plugin
  marketplace add` acepta `owner/repo`, `https://…` y rutas locales, y **rechaza**
  `file://` y `git://` (probado, incluido un `git daemon` local). Consecuencia
  operativa para quien verifique: no hay atajo local; [H1] se resuelve empujando.
  Si fallara, el *fallback* documentado sigue siendo `source: git-subdir`
  (ADR-010 [H1]), que no cambia la forma del ADR.

- **F-SPEC-016-4 — La protección de rama sobre `release` no está disponible.**
  Confirmado antes de empezar en `docs/operacion/proteger-la-rama-release.md`
  (org `tremen-dev` en plan free + repo privado → 403 en rulesets y en branch
  protection). **No se ha intentado activarla** y nada de lo implementado depende
  de ella: el mecanismo se apoya en que publica un script desde un worktree
  aparte, sin force-push, y en que `PROVENANCE.json` hace el árbol contrastable.
  Estamos en la "opción C" de ese runbook. Destino: decisión del dueño del repo.

- **F-SPEC-016-5 — El README §Instalación sigue documentando la vía obsoleta.**
  Consecuencia asumida y señalada por la propia spec (§Fuera de alcance): hasta la
  spec de procedimientos por harness, `README.md` y `docs/fundacion/contexto.md`
  siguen diciendo "clona y construye". No se toca aquí. Destino: spec #3 de
  EPIC-004.

- **F-SPEC-016-6 — Test de SPEC-017 reinterpretado, no roto.** `SPEC-017 CA-9`
  clavaba «PASOS referencia exactamente **9** scripts» y CA-10 «**17** pasos».
  Añadir un check décimo lo habría puesto en rojo por envejecimiento (justo lo que
  RN-10 combate), así que el primero pasa a **derivarse** del contenido de
  `tools/checks/` (más fuerte: detecta también un check sin cablear) y el segundo
  mantiene el pin explícito del **orden** con la longitud derivada de la lista. La
  garantía de SPEC-017 (layout como un solo paso, orden estable) queda intacta.

## Cómo retomar (handoff)

**Estado real**: implementación completa y en verde. `npm test` 339/339,
`node tools/check.mjs` exit 0 (18 pasos, 10 checks), `node core/scripts/valida.mjs`
OK. Rama `ft/SPEC-016-publicar-rama-release` empujada a `origin`; **la rama
`release` y el tag `v0.5.0` existen solo en LOCAL**.

**Lo primero que hay que mirar**: la rama `release` local está checkouteada en el
worktree `.tmp/worktree-release` (gitignored). Si estorba:
`git worktree remove --force .tmp/worktree-release` — la rama y el tag sobreviven.

**Si hay que re-generar la publicación** (p. ej. porque entran más commits en la
rama de spec antes de publicar), el ciclo es idempotente y seguro:

```
git worktree remove --force .tmp/worktree-release
git branch -D release && git tag -d v0.5.0
npm run build:all && node tools/publica.mjs --local
```

`publicaLocal` **se niega** a publicar con el árbol de trabajo sucio o con el tag
ya existente, y `ensambla` **se niega** si `dist/` es de otro commit que el `HEAD`.

**Publicar de verdad** (gate humano, irreversible): los tres comandos de §Lo que
queda pendiente. Después, cerrar la evidencia de CA-4a/c, CA-5a, CA-7, CA-8 y
CA-9 con las órdenes listadas ahí.

**Lo que NO hay que hacer**: editar un fichero de la rama `release` a mano;
force-pushearla; re-publicar el tag `v0.5.0` (si algo sale mal, se corrige con
`0.5.1`); ni "arreglar" RN-05 desde aquí (F-SPEC-016-1 es un hallazgo elevado, no
una tarea).
