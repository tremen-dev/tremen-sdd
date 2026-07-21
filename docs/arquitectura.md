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
| `npm run build:kimi` / `build:all` | ensambla `dist/kimi-code/` / ambos adaptadores |
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
(estructura del repo), `nucleo-aislado` (regla de dependencia), `nucleo-agnostico`
(ningún token de harness bajo `core/`; solo `${SDD_*}` permitido), `referencias`
(ninguna ruta escapa el artefacto; nada de `${CLAUDE_PLUGIN_ROOT}/../../` ni, en
Kimi, `../` que escape), `roles-fuente-unica` (ningún agent/bootstrap embebe el
cuerpo del rol; solo lo referencia), `manifiestos` (Claude: plugin.json /
marketplace.json; Kimi: agentes YAML + mapa `subagents` + `allowed_tools` por rol),
`fuente-unica` (sin copia de núcleo comiteada fuera de `core/`). Los checks
`referencias`, `roles-fuente-unica` y `manifiestos` están **generalizados a los dos
adaptadores** (claude-code y kimi-code); `nucleo-aislado` y `layout` son
independientes del harness. El YAML de los agentes Kimi se parsea con un loader
mínimo propio (`tools/checks/_yaml.mjs`), porque el núcleo no admite dependencias.

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

Recetario **as-built**, derivado de lo que de verdad hizo falta para el primer
adaptador no-Claude (**Kimi Code**, SPEC-003). La decisión de empaquetado y
resolución para un harness **sin marketplace ni variable de plugin-root** está en
[`ADR-003`](adr/ADR-003-empaquetado-y-resolucion-del-nucleo-para-el-adaptador-kimi-code.md);
aquí se describe la lista cerrada de piezas y el procedimiento de instalación.

### Lista cerrada de piezas de un adaptador

Un adaptador es `adapters/<harness>/` y **solo** contiene superficie de adaptador
(ningún fichero del método: `lib/`, `scripts/`, `templates/`, `roles/` viven solo
en `core/`). Las piezas, según el mecanismo del harness:

| Pieza | Claude Code | Kimi Code |
|---|---|---|
| **agents/** | un `.md` por rol con frontmatter + prosa que referencia el rol | el **YAML del agente raíz** (= orquestador) que declara los seis `sdd-*` en su mapa `subagents:`, un `.yaml` por subagente (`extend: default`, `allowed_tools` explícito), y `agents/prompts/<rol>.md` (bootstrap que referencia el núcleo por ruta interna) |
| **skills/** | `sdd-*/SKILL.md` que despachan con el prefijo de plugin `tremen-sdd:` | `sdd-*/SKILL.md` que **instruyen al agente raíz** a delegar vía `Agent(subagent_type: sdd-<rol>)`, **sin** prefijo de plugin |
| **hooks/** | entrypoints `.mjs` + `hooks.json` | entrypoints `.mjs` (shim que normaliza el payload de Kimi e invoca `core/lib/require-spec.mjs`) + fragmento `hooks.toml` (`[[hooks]]`) |
| **manifiesto** | `.claude-plugin/plugin.json` + entrada en `marketplace.json` | **ninguno**: Kimi no tiene marketplace ni `plugin.json` que transporte agents/skills/hooks |
| **commands/** | `sdd-init`, `sdd-tablero` (slash-commands) | **ninguno**: Kimi no tiene slash-commands de usuario por fichero; su equivalente es invocar los scripts de `core/` directamente o desde un skill |
| **tests/** | tests del adaptador contra `dist/` | ídem |

La **asimetría del orquestador** es deliberada (ADR-003, punto 7): en Claude Code
el orquestador es un **skill** y el main-loop despacha; en Kimi es el **agente
raíz** (único que puede llamar a `Agent`; guard `role != "root"`). Misma prosa de
rol (`sdd-orquestador`), montada distinto porque el mecanismo de despacho difiere.

### Resolución del núcleo

El build (`tools/build-adapter.mjs <harness>`, **reutilizado sin tocar**) ensambla
`dist/<harness>/` autocontenido con el núcleo bajo `core/`. Dentro del artefacto el
núcleo se resuelve por **ruta interna**, pero el *token* difiere:

- **Claude Code**: `${CLAUDE_PLUGIN_ROOT}/core/…` (el harness fija la variable).
- **Kimi Code**: **ruta relativa al fichero** — el `system_prompt_path` del YAML
  apunta a `./prompts/<rol>.md`, y ese bootstrap referencia `../../core/roles/<idioma>/<rol>.md`,
  interno al artefacto. Kimi **no** ofrece variable de plugin-root; la ruta base se
  fija en la **instalación**. Los hooks importan el núcleo por ruta ESM interna
  (`../core/lib/…`), igual que en Claude.

`tools/checks/referencias.mjs` verifica que ninguna referencia escape del artefacto
en **ambos** modos; `roles-fuente-unica` y `manifiestos` están **generalizados** a
los dos adaptadores (el runner `npm run check` los corre para claude-code y
kimi-code).

### Procedimiento de instalación (Kimi, sin marketplace)

Kimi no tiene marketplace ni `plugin install` que sirva para el método (su
`plugin.json` solo transporta tools). Instalar el adaptador es un procedimiento
reproducible sobre el **artefacto autocontenido**:

```bash
npm run build:kimi                 # ensambla dist/kimi-code/ (núcleo dentro)
```

1. **Skills** → colócalas en un directorio que Kimi lee nativamente: copia
   `dist/kimi-code/skills/` a `.agents/skills/` del proyecto (o `~/.kimi/skills`).
2. **Agents** → registra el agente raíz por `kimi --agent-file <ruta absoluta a
   dist/kimi-code/agents/sdd-orquestador.yaml>` (los subagentes se resuelven por su
   mapa `subagents:`, rutas relativas al YAML raíz).
3. **Hooks** → añade el fragmento `dist/kimi-code/hooks/hooks.toml` a la config de
   Kimi (`~/.kimi/config.toml`), sustituyendo `<ARTIFACT_ROOT>` por la ruta
   absoluta a `dist/kimi-code/`.

La garantía "nada se codea sin spec aprobada" **no** depende de que Kimi tenga
hooks: la sostienen git pre-commit (L2) y CI (L3), independientes del harness
(ADR-002). El smoke test de SPEC-003 valida formato + build + resolución interna
**sin cuenta de Kimi**; la operación end-to-end multi-rol contra el CLI real de
Kimi es el follow-up **F-SPEC-003-1**.
