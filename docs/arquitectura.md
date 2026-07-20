# Arquitectura del repo tremen-sdd

Guía de orientación para quien trabaja **en** tremen-sdd (no para quien lo usa
en su proyecto — eso está en el `README.md` y en `site/`). La *decisión* que
justifica esta estructura vive en
[`docs/adr/ADR-001`](adr/ADR-001-estructura-del-repo-para-multi-harness.md);
aquí se describe el **as-built** y el flujo de trabajo.

## El modelo: núcleo + adaptadores

El método SDD no sabe nada de ningún harness de agentes; el empaque de cada
harness sí. Esa frontera es la estructura del repo:

```
core/                      # NÚCLEO agnóstico — única copia versionada del método
  lib/                     #   frontmatter, utilidades
  scripts/                 #   estado.mjs (máquina de estados), scaffold, tablero, valida, informe-qa
  templates/               #   plantillas de artefactos y de /sdd-init
  roles/es/                #   prosa = system prompt de cada rol (fuente única)
  tests/                   #   tests del núcleo (corren directos)
adapters/                  # ADAPTADORES por harness (simétricos, ninguno en la raíz)
  claude-code/             #   .claude-plugin/, agents/, skills/, commands/, hooks/, tests/
tools/                     # utillaje a nivel de repo (ni núcleo ni adaptador)
  build-adapter.mjs        #   ensamblador del artefacto instalable
  checks/                  #   checks de invariantes (los ejerce CI y los tests)
  tests/                   #   tests de tools y de los checks
dist/                      # SALIDA de build — gitignored, nunca se comitea
.claude-plugin/            # marketplace.json en la raíz (escaparate repo-level)
docs/  site/               # documentación y web
```

### La regla de dependencia (invariante duro)
El acoplamiento va **siempre adaptador → núcleo, nunca al revés**. Ningún fichero
bajo `core/` importa, referencia ni resuelve una ruta que escape de `core/`
(solo `node:*` y otros ficheros de `core/`). Lo guarda
`tools/checks/nucleo-aislado.mjs` (análisis de imports, no grep de cadenas): un
núcleo contaminado hace fallar el check. Es la materialización de **CE-1** de
EPIC-001.

## El paso de build

Claude Code (y los harnesses de su familia) **copian solo el directorio del
plugin a su cache** al instalar; los directorios hermanos no viajan, y está
prohibido referenciar ficheros con `../` fuera del plugin root. Por eso el
núcleo no puede quedar "al lado" del adaptador: hay que **empaquetarlo dentro**.

`tools/build-adapter.mjs <harness>` ensambla un plugin **autocontenido** en
`dist/<harness>/`:
- copia la superficie de `adapters/<harness>/` (menos su carpeta `tests/`, que es
  de desarrollo),
- copia el núcleo completo bajo `dist/<harness>/core/`.

Así, dentro del artefacto, el núcleo se resuelve como **ruta interna** al plugin
root (`${CLAUDE_PLUGIN_ROOT}/core/…`), sin ningún `../` que escape. El build es
**determinista/idempotente** (dos corridas → árbol idéntico) y **cross-platform**
(no usa symlinks). `dist/` está en `.gitignore`: `core/` sigue siendo la única
copia versionada del método — nunca se comitea una copia del núcleo fuera de
`core/` (lo guarda `tools/checks/fuente-unica.mjs`).

## Tests y checks

| Comando | Qué corre |
|---|---|
| `npm run build` | ensambla `dist/claude-code/` |
| `npm run test:core` | tests del núcleo, directos sobre `core/tests/` |
| `npm run test:tools` | build + tests de `tools/` (build y checks) |
| `npm run test:adapter` | build + tests del adaptador contra `dist/` |
| `npm test` | build + las tres capas de una vez |
| `npm run check` | runner agregado: build → los 6 checks → `valida` (lo que corre CI) |
| `npm run hooks:install` | activa el pre-commit L2 (`git config core.hooksPath tools/githooks`) |

Los tests del adaptador corren **contra el artefacto construido** (`dist/`),
porque es ahí donde el núcleo vive por ruta interna. Los del núcleo corren
directos y deben pasar **con `adapters/` y `dist/` ausentes** (aislamiento, CE-1).

Checks de invariantes en `tools/checks/` (cada uno con su test): `layout`
(estructura del repo), `nucleo-aislado` (regla de dependencia), `referencias`
(ninguna ruta escapa el plugin root; nada de `${CLAUDE_PLUGIN_ROOT}/../../`),
`roles-fuente-unica` (ningún agent embebe el cuerpo del rol; solo lo referencia),
`manifiestos` (plugin.json / marketplace.json válidos y con rutas existentes),
`fuente-unica` (sin copia de núcleo comiteada fuera de `core/`).

## Flujo de trabajo (y dogfooding)

El repo **se autogestiona con su propio estándar**. Todo cambio de código bajo
las rutas vigiladas (`core/scripts/`, `core/lib/`, `adapters/claude-code/hooks/`)
entra por el método: rama `ft/SPEC-NNN-slug`, con su spec `aprobada`, y el hook
`require-spec` deniega editar fuera de ese carril.

Ese carril no depende solo del harness (ADR-002): además del hook L1 (fail-open),
git **pre-commit** (L2, fail-closed, `tools/githooks/`) y **GitHub Actions** (L3,
fail-closed, `.github/workflows/ci.yml`) guardan las mismas reglas reutilizando la
lógica de `core/` (la decisión require-spec vive una sola vez en
`core/lib/require-spec.mjs`; la comparten L1 y L2). El pre-commit se activa por
clon con `npm run hooks:install`; las válvulas auditables son `git commit
--no-verify` y `SDD_SKIP_GATE=1` (CI no respeta ninguna).

Para validar el runtime real tras un cambio (dogfooding):

```bash
npm run build
claude plugin marketplace add D:\ruta\a\tremen-sdd     # source → ./dist/claude-code
claude plugin install tremen-sdd@tremen-sdd            # o recarga si ya estaba
```

y comprobar que un hook dispara sobre las rutas vigiladas y que un agent lee su
rol por `${CLAUDE_PLUGIN_ROOT}/core/roles/<idioma>/<rol>.md`.

## Añadir un harness

Un harness nuevo (p. ej. Kimi Code) es `adapters/<harness>/` con su superficie
(agents, hooks, manifiesto) + una entrada en el marketplace; reutiliza el mismo
`build-adapter.mjs` y el mismo núcleo. El **recetario paso a paso** ("cómo añadir
un harness", CE-5 / spec 5 de EPIC-001) se escribirá **con** el primer adaptador
no-Claude, documentando lo que de verdad haga falta en lugar de teorizarlo.
