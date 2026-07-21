---
id: SPEC-003
tipo: ledger
epica: EPIC-001
---
# Ledger — SPEC-003 Adaptador Kimi Code

## Resumen
- Fase: en-revision
- Rama: `ft/SPEC-003-adaptador-kimi-code`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `adapters/kimi-code/{agents,skills,hooks,tests}/` (lista cerrada, sin método ni commands/) | `tools/tests/kimi-superficie.test.mjs` | `find` confirma solo agents/skills/hooks/tests; sin dirs `commands/scripts/lib/templates`; superficie test verde | ✅ |
| CA-2 | `adapters/kimi-code/agents/*.yaml` + `agents/prompts/*.md` (referencian `core/roles/…` por ruta interna, no embeben) | `tools/tests/roles-fuente-unica.test.mjs`, `tools/tests/referencias.test.mjs`, `adapters/kimi-code/tests/smoke.test.mjs` | `roles-fuente-unica` verde para kimi; prueba adversarial (inyecté `## Misión/Flujo/Reglas duras` en un bootstrap) → check RED como debe | ✅ |
| CA-3 | `package.json` (`build:kimi`/`build:all`); `tools/build-adapter.mjs` **reutilizado SIN tocar** | `tools/tests/build.test.mjs` (idempotencia + autocontenido kimi) | `git diff main -- tools/build-adapter.mjs` vacío; dos builds → sha256 idéntico; `tests/` excluido del dist; `dist/` gitignored | ✅ |
| CA-4 | `tools/checks/referencias.mjs` (pase Kimi: system_prompt_path + refs a core internas, sin plugin-root); `tools/checks/_yaml.mjs` | `tools/tests/referencias.test.mjs` | `referencias` verde para kimi; prueba adversarial (ref `../../../../core` que escapa + `${KIMI_PLUGIN_ROOT}`) → 2 errores como debe | ✅ |
| CA-5 | `adapters/kimi-code/hooks/{_comun,require-spec,protege-verdad}.mjs` + `hooks.toml` (shim que invoca `core/lib/require-spec.mjs`; protege-verdad degrada fail-open) | `adapters/kimi-code/tests/{require-spec,protege-verdad}.test.mjs`, `tools/tests/require-spec-una-logica.test.mjs` | entrypoint importa `core/lib/require-spec.mjs` (`evaluarRequireSpec`), no reimplementa; tests con payload Kimi: invalida→deny, válida→allow, borrador→deny, sin `.sdd.json`→allow; protege-verdad fail-open sin identidad | ✅ |
| CA-6 | `adapters/kimi-code/skills/sdd-*/SKILL.md` (6; instruyen al raíz a delegar, sin prefijo `tremen-sdd:`) | `tools/tests/kimi-skills.test.mjs` | 6 SKILL.md con frontmatter válido; cuerpo instruye `Agent(subagent_type: "sdd-<rol>")` sin prefijo `tremen-sdd:`; test verde | ✅ |
| CA-7 | `adapters/kimi-code/tests/smoke.test.mjs` (YAML cargable + system_prompt_path + ruta a core interna) | idem (14 casos, 7 agentes × 2) | smoke no vacuo: parsea YAML, resuelve bootstrap y rol de núcleo, asertando que existe, es interno y contiene `## Misión`; 14 casos verdes ⇒ ninguna ruta de núcleo escapa (no procede PARAR) | ✅ |
| CA-8 | `docs/arquitectura.md` §"Añadir un harness" → "Procedimiento de instalación (Kimi, sin marketplace)" | verificable por lectura (pasos ejecutables) | leído: build → skills en dir nativo → `kimi --agent-file` → `[[hooks]]` en config; pasos concretos y ejecutables | ✅ |
| CA-9 | `docs/arquitectura.md` §"Añadir un harness" (lista cerrada as-built + resolución + cita ADR-003) | verificable por lectura | leído: tabla de piezas as-built (agents/skills/hooks/tests, sin commands) + resolución interna + cita explícita a ADR-003 | ✅ |
| CA-10 | `package.json` (test cubre ambos adaptadores), `tools/check.mjs` (build+checks kimi) | `npm test` = 187 verde; `core/tests/estado.test.mjs` intacto (10 verde) | `npm test` = 187/187 verde; `npm run check` verde (nucleo-aislado, fuente-unica, referencias/roles-fuente-unica/manifiestos ×2 adaptadores); `git diff main` vacío en `core/` y `estado.test.mjs`; **CI Ubuntu run 29788778476 = success sobre HEAD f497c74** | ✅ |
| CA-11 | `adapters/kimi-code/agents/sdd-orquestador.yaml` (raíz: subagents con los 6, allowed_tools) + 6 subagentes (`extend: default`, allowed_tools por rol) | `tools/tests/manifiestos.test.mjs`, `adapters/kimi-code/tests/smoke.test.mjs` | raíz→`prompts/sdd-orquestador.md` (referencia sdd-orquestador); `subagents:` lista los 6 con `path` resoluble; `allowed_tools` explícito: implementador con Write/Edit, verificador y como-vamos sin Write/Edit; los 6 con `extend: default` | ✅ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

**GREEN — 2026-07-21 (sdd-verificador).** Los 11 CA sostienen evidencia real, no
solo presencia de tests. Gates automáticos verdes: `npm test` = 187/187 y
`npm run check` (build claude+kimi + nucleo-aislado + fuente-unica + referencias/
roles-fuente-unica/manifiestos generalizados a AMBOS adaptadores + valida). El CI
en **Ubuntu** (run 29788778476) salió **success** sobre exactamente este commit
(HEAD f497c74) → cuenta para CA-10 y la garantía cross-platform. Ejercí el flujo,
no solo su existencia:
- **CA-2/CA-4 adversariales**: inyecté cuerpo de rol (`## Misión/Flujo/Reglas
  duras`) en un bootstrap Kimi y una ref `../../../../core` que escapa + token
  `${KIMI_PLUGIN_ROOT}`; `roles-fuente-unica` y `referencias` los cazaron (RED),
  como deben. (Ambas pruebas sobre copias temporales; árbol intacto.)
- **CA-3**: `build-adapter.mjs` sin cambios vs main; dos builds → sha256 idéntico;
  `dist/kimi-code/tests/` no existe (superficie menos tests); `dist/` gitignored.
- **CA-5**: el entrypoint importa e invoca `core/lib/require-spec.mjs`; tests con
  payload estilo Kimi confirman deny/allow/borrador→deny/fail-open.
- **CA-7**: el smoke resuelve el rol de núcleo interno al artefacto y comprueba que
  contiene `## Misión`; ninguna ruta de núcleo escapa → no procede PARAR.
- **CA-10**: `core/` y `core/tests/estado.test.mjs` intactos vs main (sin agravar
  la regresión conocida de specs migradas).

**Tensiones constatadas (NO resueltas por mí — así deben quedar):**
- **CA-11c ↔ ledger [ABIERTO], destino F-SPEC-003-1**: la spec aprobada exige
  `allowed_tools` **read-only** para el verificador (sin Write/Edit) y así está
  implementado (`sdd-verificador.yaml`: Read/Grep/Glob/Bash). Pero el rol
  verificador **escribe el ledger de evidencia** — como en este mismo turno. Con
  esa política, un verificador en el CLI real de Kimi no podría escribir el ledger.
  Es una tensión genuina, no un defecto de implementación: está construido como
  manda la spec y su validación en runtime real queda diferida a F-SPEC-003-1 (sin
  cuenta de Kimi ahora, por decisión de gate). No bloquea GREEN: CA-11c pide la
  *declaración* read-only, presente y verificada.
- **F-SPEC-003-2 [ABIERTO]**: la prosa del núcleo `core/roles/es/*.md` contiene
  ejemplos con `${CLAUDE_PLUGIN_ROOT}` (sabor Claude). En Kimi el bootstrap del
  adaptador suple la resolución por ruta relativa interna, así que funciona; el
  check `referencias`-Kimi **excluye a propósito** el subárbol `core/` (filtro
  `enAdaptador`), gobernado por `roles-fuente-unica`/`nucleo-aislado`. Confirmado
  que el núcleo no se tocó (regla dura: reutilizar, no reescribir). Neutralizar el
  token en el núcleo queda como follow-up. No bloquea.

**Follow-up F-SPEC-003-1** (ejecución end-to-end multi-rol contra el CLI real de
Kimi) sigue diferido por decisión de gate; con él se re-verifican las asunciones
[ABIERTO] del spike (anidamiento = 1 nivel, herencia de tools, gates como turnos
del raíz) y la tensión CA-11c.

**Estado de la spec**: la dejo en `en-revision`. El cierre a `hecho` es GATE
HUMANO; NO lo transiciono.

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-003/. Informe HTML opcional: _qa/SPEC-003/informe.html -->
n-a: SPEC-003 no tiene superficie UI; la evidencia es tests/checks (tabla superior).

## Salvedades / follow-ups
- **F-SPEC-003-1** (ya definido en la spec; destino: spec futura): operación
  end-to-end multi-rol contra el **CLI real de Kimi** (cargar el raíz, delegar en
  subagentes, ping-pong de gates humanos). Esta spec entrega superficie + build/
  instalación + smoke test SIN cuenta de Kimi; la ejecución real queda diferida.
  Con ella se re-verifican las asunciones [ABIERTO] del spike (anidamiento = 1
  nivel, herencia de tools por `allowed_tools`, gates como turnos del raíz).
- **F-SPEC-003-2** (nuevo; destino: EPIC-001 dedup / spec futura): la prosa del
  núcleo `core/roles/es/*.md` incluye ejemplos con `${CLAUDE_PLUGIN_ROOT}` (sabor
  Claude). En Kimi el **bootstrap** del adaptador suple la resolución (ruta
  relativa interna), así que funciona; pero convendría neutralizar/parametrizar ese
  token en el núcleo para que la prosa sea 100% harness-agnóstica. No bloquea; NO se
  tocó `core/` en esta spec (regla dura: reutilizar, no reescribir). Por eso el
  check `referencias` Kimi excluye el subárbol `core/` (prosa del núcleo, gobernada
  por `roles-fuente-unica`/`nucleo-aislado`), y valida solo las refs del adaptador.
- **Tensión CA-11c ↔ ledger** (a re-verificar en runtime, F-SPEC-003-1): CA-11c
  exige `allowed_tools` **read-only** para el verificador (sin Write/Edit); en la
  práctica el verificador escribe el ledger de evidencia. Se implementó como manda
  la spec aprobada (read-only, Bash para correr tests); si el runtime real lo
  requiere, el follow-up ajustará la política a "sin escritura de FUENTES pero con
  escritura del ledger".
- **Entorno (dogfooding, ajeno a SPEC-003)**: el hook `calidad` del propio repo
  corre `eslint` y no hay `eslint.config.js` → exit 2 ruidoso en cada escritura
  `.mjs`. NO bloquea la escritura ni los tests (`node --test`), pero conviene una
  config de eslint o `"linter": "none"` en `.sdd.json`. Fuera del alcance de esta spec.

## Cómo retomar (handoff)
- **Estado**: superficie del adaptador Kimi completa y verde. `npm test` = 187
  (baseline 132 + 55 nuevos), `npm run check` verde para AMBOS adaptadores.
  `core/` y `tools/build-adapter.mjs` **sin tocar** (git status limpio en ellos).
- **Qué construí**: `adapters/kimi-code/` (7 agentes YAML: raíz orquestador + 6
  subagentes, 7 bootstraps en `agents/prompts/`, 6 skills, hooks shim + `hooks.toml`,
  tests); parser YAML mínimo `tools/checks/_yaml.mjs`; generalización de
  `referencias`/`roles-fuente-unica`/`manifiestos` a dos adaptadores; `check.mjs` y
  `package.json` cablean el build+checks+tests de kimi; guía CA-9/CA-8 en
  `docs/arquitectura.md`.
- **Para el verificador**: `npm test` y `npm run check` cubren todo. El smoke test
  (`adapters/kimi-code/tests/smoke.test.mjs`) es el corazón de CA-7: si una ruta de
  núcleo no resolviera interna, se pone rojo (procede PARAR y devolver al gate). No
  hay ejecución contra el CLI real de Kimi (diferida a F-SPEC-003-1, por decisión de
  gate). Verificar CA-8/CA-9 por lectura de `docs/arquitectura.md`.
- **Pendiente**: nada dentro del alcance de SPEC-003; los follow-ups arriba.
