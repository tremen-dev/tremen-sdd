---
id: SPEC-010
tipo: ledger
epica: EPIC-003
---
# Ledger — SPEC-010 Adaptador opencode: roles y comandos

## Resumen
- Fase: en-progreso (implementación completa; pendiente de verificación)
- Rama: `ft/SPEC-010-adaptador-opencode-roles-y-comandos`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 (7 agentes con su mode) | `adapters/opencode/agents/{sdd-orquestador,sdd-producto,sdd-arquitecto,sdd-implementador,sdd-verificador,sdd-documentalista,sdd-como-vamos}.md` (orquestador `mode: primary`, los seis `mode: subagent`) | `adapters/opencode/tests/superficie.test.mjs` — "CA-1: hay un .md por rol para los SIETE roles"; "CA-1: el orquestador es mode primary y los seis sdd-* son mode subagent" | | 🚧 |
| CA-2 (agente referencia prosa, no la copia — RN-06) | Bootstrap en cada `agents/*.md` (referencia `../core/roles/<idioma>/<rol>.md`, sin `## Misión/Flujo/Reglas duras`); check `tools/checks/roles-fuente-unica.mjs` (ya itera todos los adaptadores) | `tools/tests/opencode.test.mjs` — "CA-2: roles-fuente-unica vigila los TRES adaptadores y opencode pasa"; "CA-2: un agente opencode que embebe el cuerpo del rol hace fallar" | | 🚧 |
| CA-3 (comandos por fichero, paridad) | `adapters/opencode/commands/{sdd-init,sdd-tablero}.md` (cuerpo invoca `../core/scripts/{tablero,valida}.mjs` y plantillas de `../core/templates/`) | `adapters/opencode/tests/superficie.test.mjs` — "CA-3: el comando /sdd-init …"; "… /sdd-tablero …" (script de núcleo por ruta interna existente, sin `${CLAUDE_PLUGIN_ROOT}`) | | 🚧 |
| CA-4 (skills + descriptions canónicas — RN-11) | `adapters/opencode/skills/<rol>/SKILL.md` (6 subagentes, despacho vía tool `task`, sin prefijo de plugin); `description` canónica larga en agentes+skills; check `tools/checks/descripcion-fuente-unica.mjs` generalizado a opencode | `adapters/opencode/tests/skills.test.mjs` (despacho `task`, sin prefijo); `tools/tests/opencode.test.mjs` — "CA-4: … enumera las superficies opencode (agent y skill)"; "CA-4: una description opencode divergente hace fallar" | | 🚧 |
| CA-5 (núcleo por ruta interna, sin plugin-root) | Refs internas `../core/...` en agentes/comandos; `opencode.json` sin token de harness; check `tools/checks/referencias.mjs` generalizado (`esOpencode`, `referenciasOpencode`) | `tools/tests/opencode.test.mjs` — "CA-5: … resuelve refs a core internas y sin plugin-root"; "… con ../ que escapa … falla"; "… token de plugin-root … falla"; `superficie.test.mjs` — "CA-5: ninguna pieza usa ${CLAUDE_PLUGIN_ROOT}" | | 🚧 |
| CA-6 (manifiesto `opencode.json`) | `adapters/opencode/opencode.json` (bloque `agent` con los 7, `mode`, permisos por agente, `permission.task` del orquestador; sin plugin de enforcement); check `tools/checks/manifiestos.mjs` → `checkManifiestosOpencode` (JSON.parse, loader mínimo) | `tools/tests/opencode.test.mjs` — "CA-6: los manifiestos … válidos" + negativos (mode!=primary, subagente ausente, read-only con edit allow, sin permission.task, plugin de enforcement) | | 🚧 |
| CA-7 (build `dist/opencode/` autocontenido) | `tools/build-adapter.mjs` reutilizado **sin tocar**; `package.json` (`build:opencode`, en `build:all`/`test:adapter`/`test`) | `tools/tests/opencode.test.mjs` — "CA-7: el build de opencode es idempotente"; "CA-7: … autocontenido con el núcleo dentro y sin tests" | | 🚧 |
| CA-8 (PARIDAD — superficie presente y resolviendo su prosa) | 7 agentes + 2 comandos, cada uno referenciando su fuente única por ruta interna existente en `dist/opencode/core/` | `adapters/opencode/tests/superficie.test.mjs` — "CA-8: el agente <rol> referencia su rol de núcleo por ruta interna existente" (×7); CA-3 comandos (×2) | | 🚧 |
| CA-9 (AISLAMIENTO — núcleo sin dependencia a opencode) | Diff acotado a `adapters/opencode/`, `tools/` (checks+tests), `package.json`, `docs/`; `core/` intacto (0 refs a opencode) | `tools/tests/opencode.test.mjs` — "CA-9: build/referencias/manifiestos de opencode cableados en PASOS"; `nucleo-aislado`/`nucleo-agnostico` verdes; `npm run test:core` verde (59/59) | | 🚧 |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-010/. Informe HTML opcional: _qa/SPEC-010/informe.html -->
No aplica: verificación estática de artefacto construido (sin UI), como el smoke test de Kimi (SPEC-003). La evidencia es la suite `node --test` sobre `dist/opencode/`.

## Salvedades / follow-ups
<!-- IDs F-SPEC-010-1, F-SPEC-010-2… con destino (spec futura o EPIC-MEJORA). -->
- **F-SPEC-010-1** (destino: spec #4 de EPIC-003, ejercicio del pipeline contra el CLI real): la resolución en **runtime** del prompt de rol por ruta interna ([H1] de ADR-007) y el despacho orquestador-primary → 6 subagentes con `subagent_depth=1` y gates como turnos ([H4]) NO se ejercen aquí. Esta spec verifica la superficie a nivel de **artefacto construido** (presencia, modos, resolución de ruta interna, fuente única), replicando el patrón de SPEC-003. Confirmado contra doc oficial (opencode.ai/docs, 2026-07-23) que la vía es viable; falta ejercerla con el CLI instalado.
- **F-SPEC-010-2** (destino: spec de enforcement de EPIC-003): `opencode.json` de esta spec registra piezas y permisos base (mode, `permission.edit`/`task` por agente) pero **NO** el gate require-spec dinámico (plugin `tool.execute.before` que `throw`ea) ni reglas `permission` deny sobre rutas vigiladas. Es deliberadamente la spec siguiente.

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->
Implementación completa de CA-1…CA-9. `npm test` verde (258/258), `node tools/check.mjs` verde (incluye `build-opencode`, `referencias-opencode`, `manifiestos-opencode`, `roles-fuente-unica` y `descripcion-fuente-unica` sobre los 3 adaptadores). `core/` intacto y sin referencia a opencode; `nucleo-aislado`/`nucleo-agnostico` verdes; `test:core` 59/59.

Superficie en `adapters/opencode/`: 7 agentes (`agents/*.md`, bootstrap que hace `Read` de `../core/roles/<idioma>/<rol>.md`), 2 comandos (`commands/*.md`), 6 skills (`skills/<rol>/SKILL.md`, despacho vía tool `task`), manifiesto `opencode.json`, y tests bajo `tests/`. Checks generalizados: `referencias.mjs` (`esOpencode`/`referenciasOpencode` + `referenciasInternas` compartido con Kimi), `manifiestos.mjs` (`checkManifiestosOpencode`), `descripcion-fuente-unica.mjs` (agentes+skills opencode), `roles-fuente-unica.mjs` (ya genérico). Cableado en `package.json` y `tools/check.mjs`.

Formatos de opencode confirmados contra doc oficial (opencode.ai/docs, 2026-07-23): agentes markdown en `.opencode/agents/` con frontmatter `description`/`mode` (primary|subagent) y cuerpo = system prompt, **auto-descubiertos** (no requieren registro); bloque `agent` en `opencode.json` con `mode`/`permission`; `permission.task` mapea subagente→allow/ask/deny (`"*"` catch-all); `edit` cubre write+patch; comandos markdown en `.opencode/commands/` con nombre de fichero = nombre del comando. Ningún hallazgo contradice ADR-007 (inmutable): la doc lo confirma y de-riesga [H1] (`{file:...}` documentado como alternativa). Pendiente para el verificador: nada bloqueante; opcionalmente re-correr `npm test` y `node tools/check.mjs`.
