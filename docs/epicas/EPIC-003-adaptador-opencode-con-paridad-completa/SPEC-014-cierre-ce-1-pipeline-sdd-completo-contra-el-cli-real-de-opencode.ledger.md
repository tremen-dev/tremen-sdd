---
id: SPEC-014
tipo: ledger
epica: EPIC-003
---
# Ledger — SPEC-014 Cierre CE-1: pipeline SDD completo contra el CLI real de opencode

## Resumen
- Fase: en-revision (piloto ejecutado; pendiente verificación adversarial)
- Rama: `ft/SPEC-014-cierre-ce-1-pipeline-completo-contra-el-cli-real-de-opencode`
- Entorno del piloto: opencode **1.18.5** (chocolatey, Windows), provider OpenCode
  Zen, modelo `opencode/deepseek-v4-flash-free` (no normativo), **2026-07-27**.
  Fixture desechable `fixture-suma` con git propio, fuera del repo (scratchpad de
  la sesión; no se comitea). Evidencia canónica en `docs/_qa/SPEC-014/`; acta
  durable en `docs/estudios/opencode-piloto.md`.

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 (instalación/descubrimiento — [H5]) | Procedimiento efectivo ejercido y documentado (`docs/_qa/SPEC-014/ca1-descubrimiento/procedimiento-e-hallazgos.md`): `dist/opencode/.` → `.opencode/` del fixture, config incluida. **Lazo RED→GREEN**: el CLI 1.18.5 no auto-descubre plugins `.mjs` (solo `*.ts`/`*.js`) → `adapters/opencode/opencode.json` registra `"plugin": ["./plugins/require-spec.mjs"]` (commit `f899c19`) | `adapters/opencode/tests/enforcement.test.mjs` — "SPEC-014 CA-1: el manifiesto registra el plugin .mjs en `plugin`"; evidencia CLI: `ca1-descubrimiento/{agent-list.txt,debug-config-resumen.json,skills-sdd.json}` (7 agentes con su mode, 2 comandos, 6 skills, plugin resuelto) | | ❌ |
| CA-2 (prompt de rol en runtime — [H1]) | Sin código: ejercido contra el CLI. Bootstrap-`Read` inline resuelve la prosa desde `core/roles/es/<rol>.md` en el primary y en los 4 subagentes ejercidos; alternativa `{file:...}` no necesaria (queda de respaldo). RN-06 intacta | Transcripts: `ca2-prompt-rol/transcript-primary-orquestador.json` (read del rol + cita textual de la misión); `ca3-pipeline/ca3-hija-sdd-{arquitecto,producto,implementador,verificador}.json` (read del rol de cada subagente); `transcript-mencion-arquitecto.json` (se niega a implementar, conforme a prosa) | | ❌ |
| CA-3 (pipeline end-to-end — CE-1) | Ciclo completo desde el CLI: `/sdd-init` → épica+spec (scaffold.mjs real) → gates firmados por el operador (`estado.mjs … aprobada --por 'Operador Fixture'`) → implementación TDD en `ft/SPEC-001-funcion-suma-basica` → verificador de opencode escribe el ledger (GREEN) y cierra `hecho` → `/sdd-tablero`. **Lazo RED→GREEN (ADR-009)**: `edit: deny` en seco retira la tool → `sdd-verificador` con edit granular (`*`: deny + allow ledger/`_qa`) en `adapters/opencode/opencode.json`; check `tools/checks/manifiestos.mjs` exige la nueva forma (commit `8f6e690`) | `adapters/opencode/tests/enforcement.test.mjs` — "SPEC-014 CA-3: el verificador construido lleva edit granular ADR-009"; `tools/tests/opencode.test.mjs` — 3 casos "SPEC-014 CA-3" (deny en seco falla; allow fuera de ledger/_qa falla; como-vamos sigue read-only); evidencia CLI: `ca3-pipeline/` (transcripts de turnos, export de sesión padre e hijas, `estado-final-fixture.txt` con árbol, estados `aprobada`/`hecho` y suite 8/8 exit 0) | | ❌ |
| CA-4 (gates como turnos + anidamiento — [H4]) | Sin código: ejercido contra el CLI. Patrón invoca→informe→PARA→(input)→siguiente `task` en los gates de épica/spec e informes de implementación/verificación, en una única sesión primary | Evidencia: `ca3-pipeline/ca3-parent-export.json` (4 `task` con paradas de gate entre ellos); `ca4-gates-turnos/ca4-anidamiento.json` + `ca4-hija-arquitecto-anidamiento.json` (subagente SIN tool `task`: anidamiento impedido; jerarquía plana) | | ❌ |
| CA-5 (deny real en runtime — [H2], medición CE-3) | Sin código nuevo (plugin de SPEC-011 tal cual, ya cargando por CA-1). Deny: en `main`, `write` y `edit` bajo `src/` ABORTADOS por el `throw` con mensaje require-spec y ficheros intactos (hash idéntico). Allow: en carril legítimo el implementador escribió `src/suma.mjs`/`src/suma.test.mjs` (así se hizo CA-3). Payload real suficiente | Evidencia: `ca5-enforcement/{ca5-deny-write.json,ca5-deny-edit.json,veredicto-deny.md}`; lado allow en `ca3-pipeline/ca3-hija-sdd-implementador.json` (write/edit completed en rama ft con spec aprobada); bonus: deny también con spec en `hecho` (estado no codeable, `ca3-pipeline/ca3-pipe-t8-sonda-verif2.json`) | | ❌ |
| CA-6 (overlay permission por-proyecto — resto de [H5]) | Overlay aplicado al `opencode.json` raíz del fixture (`src/**: ask`, `docs/fundacion/**: ask`); fusión confirmada en `debug config` (unión con los deny de generados del artefacto); `ask` disparado y auto-rechazado en run no interactivo (fichero intacto); precedencia sondeada: el `edit: allow` plano por-agente PISA el deny global por-ruta (el implementador editó `docs/tablero.md`) → finding F-SPEC-014-3, garantía RN-05 en L2/L3 | Evidencia: `ca6-overlay/{ca6-ask-fundacion.json,ca6-precedencia.json,ca6-hashes-antes.txt}`; resultado de precedencia anotado en el acta §2.2 con impacto en doc de instalación | | ❌ |
| CA-7 (acta durable [H1]…[H5]) | `docs/estudios/opencode-piloto.md`: veredicto por hipótesis (confirmada/matizada) con evidencia referenciada a `docs/_qa/SPEC-014/` y CA, versión exacta (1.18.5) y fecha (2026-07-27); hallazgos operativos (vía oficial de CA-2, procedimiento de CA-1, precedencia de CA-6, sonda [H3]); §3 declara que nada contradice ADR-007 (no editado, RN-04) | Inspección del acta: cubre las 5 hipótesis + referencia al estudio §5 de SPEC-009 sin reescribirlo; sonda [H3] en `ca7-sonda-h3-payload.log` | | ❌ |
| CA-8 (diff acotado; núcleo intacto) | Diff de la rama: `docs/` (spec, ledger, acta, `_qa/SPEC-014/`) + `adapters/opencode/` (2 lazos con rebuild) + `tools/checks/manifiestos.mjs` y `tools/tests/opencode.test.mjs` (consecuencia mínima del lazo ADR-009 — ver salvedad F-SPEC-014-1); `core/`, `tools/build-adapter.mjs` y máquina de estados INTACTOS; fixture fuera del repo, sin comitear | `git diff --stat main` (sin `core/` ni `build-adapter.mjs`); `npm test` 289/289; `node tools/check.mjs` OK (incluye `nucleo-aislado`/`nucleo-agnostico`); tests de los ajustes de adaptador incluidos en los lazos | | ❌ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-014/. Informe HTML opcional: _qa/SPEC-014/informe.html -->

## Salvedades / follow-ups
<!-- IDs F-SPEC-014-1, F-SPEC-014-2… con destino (spec futura o EPIC-MEJORA). -->

- **F-SPEC-014-1 (frontera de CA-8, a juicio del verificador/gate)**: el lazo
  ADR-009 de CA-3 exigió tocar, además de `adapters/opencode/`,
  `tools/checks/manifiestos.mjs` y `tools/tests/opencode.test.mjs`: el check
  codificaba la forma pre-ADR-009 ("verificador edit deny en seco") y habría
  puesto CI en rojo con el manifiesto corregido. Es la consecuencia mínima del
  lazo que la propia spec manda; `core/`, `tools/build-adapter.mjs` y la máquina
  de estados quedan intactos. Si el gate lo considera fuera de alcance, la
  alternativa es revertir check+manifiesto y dejar al verificador de opencode
  sin tool de edición (contra ADR-009).
- **F-SPEC-014-2 (destino: spec futura de EPIC-003 o EPIC-MEJORA)**: [H3]
  matizada — hay identidad de agente RESOLUBLE (payload trae `sessionID`; el
  contexto del plugin trae `client` SDK; la sesión conoce su `agent`), luego un
  `protege-verdad` por identidad es viable en opencode. No se codea aquí
  (fuera de alcance explícito); mientras tanto, fail-open documentado con
  garantía en L2/L3.
- **F-SPEC-014-3 (destino: spec #5 / doc de instalación, y posible EPIC-MEJORA)**:
  precedencia real de permisos: un `edit: "allow"` PLANO por-agente pisa el deny
  global por-ruta de los generados (`docs/tablero.md` editado por el
  implementador en la sonda). La protección estática de generados debe
  replicarse en la permission por-agente de los escritores (o asumirse en
  L2/L3, que ya la garantizan). Anotado en el acta §2.2.
- **F-SPEC-014-4 (destino: spec #5, doc de conducción)**: `opencode run --agent
  <subagente>` cae EN SILENCIO al agente por defecto (`build`); los subagentes
  se conducen vía `task` del primary. Y en `run` no interactivo un permiso `ask`
  se auto-rechaza. Ambos comportamientos son del CLI 1.18.5 real (manda el CLI,
  finding de doc).

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->

- **Hecho**: piloto CA-1…CA-7 ejecutado contra opencode 1.18.5 real (2026-07-27,
  DeepSeek v4 flash free de OpenCode Zen). Dos lazos RED→GREEN sobre el
  adaptador, ambos con test y rebuild: registro del plugin `.mjs` en el
  manifiesto (`f899c19`) y edit granular ADR-009 del verificador (`8f6e690`).
  Acta durable en `docs/estudios/opencode-piloto.md`; evidencia en
  `docs/_qa/SPEC-014/`. `npm test` 289/289; `node tools/check.mjs` OK.
- **Veredictos provisionales** (los del implementador; el acta detalla):
  [H1] confirmada · [H2] confirmada · [H3] matizada (identidad resoluble vía
  sessionID+client; hook no codeado, fuera de alcance) · [H4] confirmada ·
  [H5] matizada (auto-descubrimiento sí, salvo plugins `.mjs` → registro
  explícito en el manifiesto).
- **Para el verificador**: reproducir lo automatizable (`npm test`,
  `node tools/check.mjs`, `git diff --stat main`), auditar la evidencia de
  `docs/_qa/SPEC-014/` contra los CA, y juzgar F-SPEC-014-1 (frontera CA-8).
  El fixture vive en el scratchpad de la sesión
  (`…/scratchpad/fixture-spec014`, desechable, con las sesiones de opencode
  exportables por id); si ya no existe, la evidencia archivada es la canónica.
  Ojo operativo: turnos del CLI con el modelo free pueden colgarse sin salida —
  matar `opencode.exe` y reintentar (registrado en el acta §2.5).
- **NO hecho a propósito**: hook protege-verdad de opencode ([H3], fuera de
  alcance), cierre de EPIC-003 (gate humano), spec #5 (guía), push/PR (no son
  del implementador).
