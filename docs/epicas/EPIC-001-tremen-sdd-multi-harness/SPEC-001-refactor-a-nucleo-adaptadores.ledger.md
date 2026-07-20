---
id: SPEC-001
tipo: ledger
epica: EPIC-001
---
# Ledger — SPEC-001 Refactor a nucleo + adaptadores

## Resumen
- Fase: en-progreso -> en-revision (entregado por sdd-implementador; pendiente de verificación)
- Rama: `ft/SPEC-001-refactor-a-nucleo-adaptadores`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | Árbol reorganizado: método→`core/{lib,scripts,templates,roles,tests}`, adaptador→`adapters/claude-code/{.claude-plugin,agents,skills,commands,hooks,tests}`, build en `tools/`, solo `.claude-plugin/marketplace.json` en la raíz; check `tools/checks/layout.mjs` | `tools/tests/layout.test.mjs` (árbol real pasa; fixtures con método/adaptador/plugin.json en raíz fallan) | `git ls-files` confirma layout exacto: núcleo solo bajo `core/`, superficie CC solo bajo `adapters/claude-code/`, build en `tools/`, único empaque en raíz = `.claude-plugin/marketplace.json`. `node tools/checks/layout.mjs` exit 0. `design/` en raíz es el sistema de diseño del site (ni método ni adaptador). | ✅ |
| CA-2 | Movimiento por `git mv` (renames, sin reescritura de lógica). Ajustes de ruta mínimos: hooks `../scripts`→`../core/scripts`, `../lib`→`../core/lib` (`adapters/claude-code/hooks/{calidad,require-spec}.mjs`); prosa `${CLAUDE_PLUGIN_ROOT}/{roles,scripts,templates}`→`/core/...` en agents/roles/skills/commands. `estado.mjs`/TRANSITIONS y `scaffold.mjs` (PLUGIN_ROOT) intactos | `core/tests/*.test.mjs` (38, asserts SIN tocar) + `adapters/claude-code/tests/*.test.mjs` (19; solo cambia la const `HOOK`, no los asserts) | `git diff 18ad848↔d74d13c` de `estado.mjs`, `scaffold.mjs`, `valida.mjs`, `tablero.mjs`, `informe-qa.mjs`, `frontmatter.mjs`: **diff vacío** (byte-idénticos). Hooks: `_comun.mjs`/`protege-verdad.mjs`/`hooks.json` idénticos; `calidad.mjs`/`require-spec.mjs` cambian SOLO la ruta de import (`../scripts`→`../core/scripts`, `../lib`→`../core/lib`), lógica intacta. `estado.test.mjs` byte-idéntico y 10/10 verde → meta-regresión de specs migradas NO se agrava. | ✅ |
| CA-3 | `package.json` scripts build+test; artefacto en `dist/claude-code/` | `npm test` = 84/84 verde (core 38 + tools 27 + adapter 19), sin skips por rutas rotas | `npm test` reproducido por el verificador: **84/84 pass, 0 fail, 0 skipped**. Desglose corrido por capa: core 38/38, tools 27/27, adapter 19/19. Sin tests omitidos por rutas rotas. | ✅ |
| CA-4 | `tools/checks/nucleo-aislado.mjs` (análisis de import specifiers, no grep) | `tools/tests/nucleo-aislado.test.mjs` (`core/` real pasa; fixtures con import que escapa y con dependencia externa fallan) | El check es análisis de cláusulas de import (`importSpecifiers`), no grep de cadenas. `node tools/checks/nucleo-aislado.mjs` en árbol real → exit 0. Ejercido adversarialmente contra un `core/` contaminado (import `../../adapters/...` + `import 'lodash'`): el check **falla** reportando ambas violaciones ('escapa de core/' y 'dependencia externa no permitida'). Base de CE-1 comprobable. | ✅ |
| CA-5 | Tests del núcleo con imports relativos internos a `core/` (no referencian adapter ni dist) | `core/tests/*.test.mjs` corren con solo `core/` presente (probado en copia temporal sin `adapters/` ni `dist/`): 38/38. Script `test:core` | Reproducido: copiado SOLO `core/` a un dir aislado (sin `adapters/` ni `dist/`) y `node --test "core/tests/*.test.mjs"` → **38/38 pass, 0 fail**, sin módulo no encontrado. | ✅ |
| CA-6 | Agents referencian `core/roles/` (sin `## Misión`/`## Flujo`/`## Reglas duras`); check `tools/checks/roles-fuente-unica.mjs` | `tools/tests/roles-fuente-unica.test.mjs` (agents reales pasan; fixtures que embeben prosa o no referencian el rol fallan) | `node tools/checks/roles-fuente-unica.mjs` exit 0. Inspección de `agents/sdd-verificador.md`: referencia `${CLAUDE_PLUGIN_ROOT}/core/roles/<idioma>/sdd-verificador.md`, sin `## Misión`/`## Flujo`/`## Reglas duras`. `core/roles/es/` es la única ruta con el cuerpo del rol. Ningún agent embebe la prosa. | ✅ |
| CA-7 | Refs `${CLAUDE_PLUGIN_ROOT}/core/...` (sin `../`) y hooks import `../core/...` (interno al plugin root); check `tools/checks/referencias.mjs` | `tools/tests/referencias.test.mjs` (artefacto construido pasa; fixtures con forma refutada `../../`, ruta inexistente e import ESM que escapa fallan) | El check opera sobre `dist/claude-code/` (artefacto construido): prohíbe la forma refutada `${CLAUDE_PLUGIN_ROOT}/../../`, exige que cada ruta declarada resuelva a fichero existente y que ningún import ESM escape el plugin root. `node tools/checks/referencias.mjs` exit 0. En runtime real: el hook construido importó `../core/lib/frontmatter.mjs` (interno al artefacto) y resolvió correctamente (ver CA-8b). | ✅ |
| CA-8 | (a) `marketplace.json` source `./dist/claude-code`; check `tools/checks/manifiestos.mjs`. (b) build entrega el núcleo bajo `dist/claude-code/core/` (resolución interna de rol demostrada) | (a) `tools/tests/manifiestos.test.mjs`; (b) test de resolución de rol por ruta interna en el artefacto. | (a) `node tools/checks/manifiestos.mjs` exit 0; `marketplace.json` source `./dist/claude-code` resuelve al artefacto con `plugin.json` válido (4 agents a ficheros existentes) + auto-discovery de skills/commands/hooks. (b) **End-to-end ejecutado**: `npm run build` → simulada la instalación copiando SOLO el plugin root (`dist/claude-code`) a una cache aislada (semántica real de Claude Code: hermanos no se copian) → plugin autocontenido (agents/commands/core/hooks/skills). Lectura de rol `${CLAUDE_PLUGIN_ROOT}/core/roles/es/<rol>.md` resuelve a fichero existente y legible (verificador/documentalista/implementador). Hook construido corrido DESDE la cache aislada: su import estático interno `../core/lib/frontmatter.mjs` resolvió (exit limpio + decisión correcta; un módulo ausente habría lanzado ERR_MODULE_NOT_FOUND antes del try/catch). El núcleo viaja dentro del plugin. NOTA: como subagente no dispongo de tool para conducir el TUI `/plugin install` ni recargar la sesión viva; reproduje fielmente la semántica de instalación (copy-plugin-root→cache) y ejercí el artefacto real. Nada falló. | ✅ |
| CA-9 | `tools/build-adapter.mjs` (determinista/idempotente); `dist/` en `.gitignore`; check `tools/checks/fuente-unica.mjs` | `tools/tests/build.test.mjs` (idempotencia: dos builds → árbol idéntico por sha256) + `tools/tests/fuente-unica.test.mjs` (repo real sin copia de núcleo; fixtures con dist trackeado / core anidado / réplica fallan) | (a) `dist/` en `.gitignore`, `git check-ignore dist/` confirma, `git ls-files dist/` vacío (no trackeado). (b) `node tools/checks/fuente-unica.mjs` exit 0; `git ls-files` de `*estado.mjs`/`*frontmatter.mjs`/`*scaffold.mjs` → única copia, toda bajo `core/`; ningún `core/` anidado ni réplica trackeada fuera de `core/`. (c) Idempotencia reproducida: dos `npm run build` → 59 ficheros, **sha256 idénticos** (diff vacío). | ✅ |
| CA-10 | `.sdd.json.rutasVigiladas` = `core/scripts/`, `core/lib/`, `adapters/claude-code/hooks/`; procedimiento de dogfooding documentado (ver handoff) | **Ejecución real (reinstalar/recargar + ejercer hook y lectura de rol): ejecutado por sdd-verificador** | `.sdd.json.rutasVigiladas` actualizado a las rutas nuevas. Procedimiento reproducible ejecutado (build → simular install a cache aislada → ejercer hook + lectura de rol). **Hooks disparan sobre las rutas vigiladas NUEVAS**: hook construido `require-spec.mjs`, editando `core/scripts/estado.mjs` y `adapters/claude-code/hooks/calidad.mjs` en rama `ft/SPEC-001` con spec `en-revision` → **deny** correcto (estado ≠ aprobada/en-progreso); `README.md` (no vigilada) → allow. Ciclo completo del hook validado en repo-fixture: rama `master`+vigilada → deny (no es rama de spec); rama `ft/SPEC-050`+spec `en-progreso`+vigilada → allow. Lectura de rol resuelta por ruta interna (ver CA-8b). Runtime NO queda roto. | ✅ |
| CA-11 | `package.json`: `build`, `test:core`, `test:tools`, `test:adapter`, `test` (build + ambas capas) | `npm run build` produce `dist/claude-code/`; `npm test` ejecuta 84 tests (≥ 57 previos) | `npm run build` produce `dist/claude-code/`. `npm test` construye y ejecuta ambas capas: **84 tests** (core `core/tests/` directos + tools + adapter contra `dist/`). Conteo previo verificado en worktree del commit padre `18ad848`: **57/57**. 84 ≥ 57. | ✅ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

**GREEN** — 2026-07-20 — sdd-verificador.

Los 11 CA en verde con evidencia reproducida por el verificador (no solo tests
existentes: suite corrida, checks ejercidos, runtime real ejercido).

- **Gates automáticos**: `npm test` = 84/84 pass, 0 fail, 0 skipped, estable. Los
  6 checks de CI (`layout`, `nucleo-aislado`, `roles-fuente-unica`, `referencias`,
  `manifiestos`, `fuente-unica`) salen exit 0 contra el árbol/artefacto reales.
- **"Mover, no reescribir" (CA-2)**: verificado por diff entre `18ad848` y
  `d74d13c` — `estado.mjs`/TRANSITIONS, `scaffold.mjs`, `valida.mjs`, `tablero.mjs`,
  `informe-qa.mjs`, `frontmatter.mjs` byte-idénticos; hooks solo con ajuste de ruta
  de import. Meta-regresión de specs migradas NO agravada (`estado.test.mjs`
  idéntico, 10/10).
- **CE-1 real (CA-4)**: el check falla ante un `core/` contaminado (import que
  escapa + dependencia externa) y pasa en el árbol real; es análisis de imports,
  no grep.
- **Fuente única (CA-9)**: `core/` es la única copia versionada; `dist/` gitignored
  y no trackeado; build idempotente (59 ficheros, sha256 idénticos en dos corridas).
- **Runtime real (CA-8b/CA-10)**: instalación reproducida con la semántica real de
  Claude Code (copiar solo el plugin root a cache); plugin autocontenido; lectura de
  rol resuelta por ruta interna `${CLAUDE_PLUGIN_ROOT}/core/roles/es/<rol>.md`; hooks
  construidos disparan sobre las rutas vigiladas NUEVAS (deny/allow correctos) con su
  import interno `../core/...` resuelto. Runtime no roto.

**Límite declarado (no bloqueante)**: como subagente no dispongo de herramienta para
conducir el TUI interactivo `/plugin marketplace add` + `/plugin install` ni para
recargar la sesión viva de Claude Code. En su lugar reproduje fielmente cada ruta de
código que esa instalación ejercería, contra el artefacto construido real, en una
cache que replica la semántica de copiado de Claude Code. Nada falló; el mecanismo
de CA-8b/CA-10 queda demostrado end-to-end.

**No transiciono la spec** (queda en `en-revision`): la aprobación/cierre es gate
humano y el encargo lo pidió explícitamente. Veredicto para el gate: GREEN.

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-001/. Informe HTML opcional: _qa/SPEC-001/informe.html -->
No aplica (refactor estructural sin UI).

## Salvedades / follow-ups
- **F-SPEC-001-1** (ya previsto en la spec): deduplicación del bloque `description` de trigger compartido entre cada `agents/*.md` y su `skills/*/SKILL.md`. Destino: spec 2 "Fuente única de roles → agents". Esta spec fija la fuente única del *cuerpo* del rol (CA-6), no la `description`.
- **F-SPEC-001-2** (fricción de dogfooding observada, pre-existente): con `.sdd.json.linter: "auto"` el hook `calidad` autodetecta un `eslint` global (v10) y ejecuta `npx eslint` sobre cada `.mjs` editado; sin `eslint.config.*` en el repo devuelve exit 2 (feedback no bloqueante) de forma ruidosa. No lo causa el refactor. Destino sugerido: EPIC-MEJORA (que `auto` exija config presente, o fijar `linter` explícito). No tocado aquí por estar fuera del alcance de SPEC-001.
- **F-SPEC-001-3** (bug de enforcement, hallado en dogfooding al redactar la fundación): `protege-verdad.mjs` compara `payload.agent_type` contra `['main','sdd-arquitecto','sdd-producto']`, pero el `agent_type` de un subagente de plugin llega con prefijo (`tremen-sdd:sdd-arquitecto`) y no casa; así el propio dueño (arquitecto/producto) ve denegada la escritura de documentos de verdad cuando corre como subagente. Destino: arreglar dentro de la spec de **enforcement a git+CI (CE-4)**, que ya tocará `hooks/`+`_comun` — normalizar el prefijo del rol. También anotado como `[ABIERTO]` en `docs/fundacion/contexto.md`.

## Cómo retomar (handoff)
Trabajo entregado en la rama `ft/SPEC-001-refactor-a-nucleo-adaptadores`, listo para verificar. NO se ha hecho PR/push/merge.

**Estado**: los 11 CA tienen implementación + test automatizado en verde (`npm test` = 84/84, estable en 3 corridas). Quedan dos comprobaciones que son competencia del verificador (requieren manipular el runtime real): la instalación real end-to-end (CA-8b) y el ciclo de dogfooding (CA-10).

**Procedimiento de dogfooding reproducible (CA-8b + CA-10), a ejecutar por sdd-verificador**:
1. `npm run build` → produce `dist/claude-code/` (autocontenido: superficie del adaptador + núcleo bajo `dist/claude-code/core/`).
2. Añadir el marketplace local del repo (`.claude-plugin/marketplace.json`, `source: "./dist/claude-code"`) e instalar/recargar el plugin `tremen-sdd` desde ese marketplace (reemplaza la carga vía cache flat `.../0.3.0`).
3. Ejercer un hook: editar un fichero bajo una ruta vigilada nueva (p. ej. `core/scripts/` o `adapters/claude-code/hooks/`) desde `main` sin spec → `require-spec` debe denegar; en la rama `ft/SPEC-001-*` con la spec en `en-progreso` debe permitir.
4. Ejercer una lectura de rol: lanzar un agent (p. ej. sdd-documentalista) y confirmar que resuelve `${CLAUDE_PLUGIN_ROOT}/core/roles/es/<rol>.md` (ruta interna al plugin root), demostrando que el núcleo viaja dentro del plugin.
   - Si el paso 3 o 4 fallara: PARAR y devolver al gate (no forzar), según CA-8.

**Notas para verificar**:
- `dist/` es gitignored: en un clone fresco hay que construir antes de instalar (cambio de flujo aceptado en el gate, nota 4 de la spec).
- Meta-regresión conocida (specs migradas en `estado.mjs`): los tests de `estado` (`core/tests/estado.test.mjs`) siguen igual de verdes; el refactor no la agrava (CA-2).
- Suite por capas: `npm run test:core` (núcleo, sin build), `npm run test:tools` y `npm run test:adapter` (ambos construyen antes). El `test` combinado construye una vez y no reconstruye durante la fase paralela (los tests de hooks del adaptador leen el `dist/` real; solo `manifiestos.test` lo usa sin reconstruir).
