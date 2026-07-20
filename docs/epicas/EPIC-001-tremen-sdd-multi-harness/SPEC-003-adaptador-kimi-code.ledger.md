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
| CA-1 | `adapters/kimi-code/{agents,skills,hooks,tests}/` (lista cerrada, sin método ni commands/) | `tools/tests/kimi-superficie.test.mjs` | | ❌ |
| CA-2 | `adapters/kimi-code/agents/*.yaml` + `agents/prompts/*.md` (referencian `core/roles/…` por ruta interna, no embeben) | `tools/tests/roles-fuente-unica.test.mjs`, `tools/tests/referencias.test.mjs`, `adapters/kimi-code/tests/smoke.test.mjs` | | ❌ |
| CA-3 | `package.json` (`build:kimi`/`build:all`); `tools/build-adapter.mjs` **reutilizado SIN tocar** | `tools/tests/build.test.mjs` (idempotencia + autocontenido kimi) | | ❌ |
| CA-4 | `tools/checks/referencias.mjs` (pase Kimi: system_prompt_path + refs a core internas, sin plugin-root); `tools/checks/_yaml.mjs` | `tools/tests/referencias.test.mjs` | | ❌ |
| CA-5 | `adapters/kimi-code/hooks/{_comun,require-spec,protege-verdad}.mjs` + `hooks.toml` (shim que invoca `core/lib/require-spec.mjs`; protege-verdad degrada fail-open) | `adapters/kimi-code/tests/{require-spec,protege-verdad}.test.mjs`, `tools/tests/require-spec-una-logica.test.mjs` | | ❌ |
| CA-6 | `adapters/kimi-code/skills/sdd-*/SKILL.md` (6; instruyen al raíz a delegar, sin prefijo `tremen-sdd:`) | `tools/tests/kimi-skills.test.mjs` | | ❌ |
| CA-7 | `adapters/kimi-code/tests/smoke.test.mjs` (YAML cargable + system_prompt_path + ruta a core interna) | idem (14 casos, 7 agentes × 2) | | ❌ |
| CA-8 | `docs/arquitectura.md` §"Añadir un harness" → "Procedimiento de instalación (Kimi, sin marketplace)" | verificable por lectura (pasos ejecutables) | | ❌ |
| CA-9 | `docs/arquitectura.md` §"Añadir un harness" (lista cerrada as-built + resolución + cita ADR-003) | verificable por lectura | | ❌ |
| CA-10 | `package.json` (test cubre ambos adaptadores), `tools/check.mjs` (build+checks kimi) | `npm test` = 187 verde; `core/tests/estado.test.mjs` intacto (10 verde) | | ❌ |
| CA-11 | `adapters/kimi-code/agents/sdd-orquestador.yaml` (raíz: subagents con los 6, allowed_tools) + 6 subagentes (`extend: default`, allowed_tools por rol) | `tools/tests/manifiestos.test.mjs`, `adapters/kimi-code/tests/smoke.test.mjs` | | ❌ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

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
