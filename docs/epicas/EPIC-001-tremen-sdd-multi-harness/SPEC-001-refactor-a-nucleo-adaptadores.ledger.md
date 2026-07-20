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
| CA-1 | Árbol reorganizado: método→`core/{lib,scripts,templates,roles,tests}`, adaptador→`adapters/claude-code/{.claude-plugin,agents,skills,commands,hooks,tests}`, build en `tools/`, solo `.claude-plugin/marketplace.json` en la raíz; check `tools/checks/layout.mjs` | `tools/tests/layout.test.mjs` (árbol real pasa; fixtures con método/adaptador/plugin.json en raíz fallan) | | |
| CA-2 | Movimiento por `git mv` (renames, sin reescritura de lógica). Ajustes de ruta mínimos: hooks `../scripts`→`../core/scripts`, `../lib`→`../core/lib` (`adapters/claude-code/hooks/{calidad,require-spec}.mjs`); prosa `${CLAUDE_PLUGIN_ROOT}/{roles,scripts,templates}`→`/core/...` en agents/roles/skills/commands. `estado.mjs`/TRANSITIONS y `scaffold.mjs` (PLUGIN_ROOT) intactos | `core/tests/*.test.mjs` (38, asserts SIN tocar) + `adapters/claude-code/tests/*.test.mjs` (19; solo cambia la const `HOOK`, no los asserts) | | |
| CA-3 | `package.json` scripts build+test; artefacto en `dist/claude-code/` | `npm test` = 84/84 verde (core 38 + tools 27 + adapter 19), sin skips por rutas rotas | | |
| CA-4 | `tools/checks/nucleo-aislado.mjs` (análisis de import specifiers, no grep) | `tools/tests/nucleo-aislado.test.mjs` (`core/` real pasa; fixtures con import que escapa y con dependencia externa fallan) | | |
| CA-5 | Tests del núcleo con imports relativos internos a `core/` (no referencian adapter ni dist) | `core/tests/*.test.mjs` corren con solo `core/` presente (probado en copia temporal sin `adapters/` ni `dist/`): 38/38. Script `test:core` | | |
| CA-6 | Agents referencian `core/roles/` (sin `## Misión`/`## Flujo`/`## Reglas duras`); check `tools/checks/roles-fuente-unica.mjs` | `tools/tests/roles-fuente-unica.test.mjs` (agents reales pasan; fixtures que embeben prosa o no referencian el rol fallan) | | |
| CA-7 | Refs `${CLAUDE_PLUGIN_ROOT}/core/...` (sin `../`) y hooks import `../core/...` (interno al plugin root); check `tools/checks/referencias.mjs` | `tools/tests/referencias.test.mjs` (artefacto construido pasa; fixtures con forma refutada `../../`, ruta inexistente e import ESM que escapa fallan) | | |
| CA-8 | (a) `marketplace.json` source `./dist/claude-code`; check `tools/checks/manifiestos.mjs`. (b) build entrega el núcleo bajo `dist/claude-code/core/` (resolución interna de rol demostrada) | (a) `tools/tests/manifiestos.test.mjs`; (b) test de resolución de rol por ruta interna en el artefacto. **Instalación real end-to-end: pendiente sdd-verificador** | | |
| CA-9 | `tools/build-adapter.mjs` (determinista/idempotente); `dist/` en `.gitignore`; check `tools/checks/fuente-unica.mjs` | `tools/tests/build.test.mjs` (idempotencia: dos builds → árbol idéntico por sha256) + `tools/tests/fuente-unica.test.mjs` (repo real sin copia de núcleo; fixtures con dist trackeado / core anidado / réplica fallan) | | |
| CA-10 | `.sdd.json.rutasVigiladas` = `core/scripts/`, `core/lib/`, `adapters/claude-code/hooks/`; procedimiento de dogfooding documentado (ver handoff) | **Ejecución real (reinstalar/recargar + ejercer hook y lectura de rol): pendiente sdd-verificador** | | |
| CA-11 | `package.json`: `build`, `test:core`, `test:tools`, `test:adapter`, `test` (build + ambas capas) | `npm run build` produce `dist/claude-code/`; `npm test` ejecuta 84 tests (≥ 57 previos) | | |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-001/. Informe HTML opcional: _qa/SPEC-001/informe.html -->
No aplica (refactor estructural sin UI).

## Salvedades / follow-ups
- **F-SPEC-001-1** (ya previsto en la spec): deduplicación del bloque `description` de trigger compartido entre cada `agents/*.md` y su `skills/*/SKILL.md`. Destino: spec 2 "Fuente única de roles → agents". Esta spec fija la fuente única del *cuerpo* del rol (CA-6), no la `description`.
- **F-SPEC-001-2** (fricción de dogfooding observada, pre-existente): con `.sdd.json.linter: "auto"` el hook `calidad` autodetecta un `eslint` global (v10) y ejecuta `npx eslint` sobre cada `.mjs` editado; sin `eslint.config.*` en el repo devuelve exit 2 (feedback no bloqueante) de forma ruidosa. No lo causa el refactor. Destino sugerido: EPIC-MEJORA (que `auto` exija config presente, o fijar `linter` explícito). No tocado aquí por estar fuera del alcance de SPEC-001.

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
