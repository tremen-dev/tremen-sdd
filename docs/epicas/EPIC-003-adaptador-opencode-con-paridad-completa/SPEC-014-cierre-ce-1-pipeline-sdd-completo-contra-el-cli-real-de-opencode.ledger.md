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
| CA-1 (instalación/descubrimiento — [H5]) | Procedimiento efectivo ejercido y documentado (`docs/_qa/SPEC-014/ca1-descubrimiento/procedimiento-e-hallazgos.md`): `dist/opencode/.` → `.opencode/` del fixture, config incluida. **Lazo RED→GREEN**: el CLI 1.18.5 no auto-descubre plugins `.mjs` (solo `*.ts`/`*.js`) → `adapters/opencode/opencode.json` registra `"plugin": ["./plugins/require-spec.mjs"]` (commit `f899c19`) | `adapters/opencode/tests/enforcement.test.mjs` — "SPEC-014 CA-1: el manifiesto registra el plugin .mjs en `plugin`"; evidencia CLI: `ca1-descubrimiento/{agent-list.txt,debug-config-resumen.json,skills-sdd.json}` (7 agentes con su mode, 2 comandos, 6 skills, plugin resuelto) | Reproducido: `npm test` 289/289, `node tools/check.mjs` OK. Evidencia auditada (agent-list 7 agentes con mode; debug-config con 2 comandos y plugin resuelto a `file:///…/require-spec.mjs`; 6 skills) y fixture vivo reinspeccionado: `.opencode/opencode.json` instalado lleva `"plugin": ["./plugins/require-spec.mjs"]` | ✅ |
| CA-2 (prompt de rol en runtime — [H1]) | Sin código: ejercido contra el CLI. Bootstrap-`Read` inline resuelve la prosa desde `core/roles/es/<rol>.md` en el primary y en los 4 subagentes ejercidos; alternativa `{file:...}` no necesaria (queda de respaldo). RN-06 intacta | Transcripts: `ca2-prompt-rol/transcript-primary-orquestador.json` (read del rol + cita textual de la misión); `ca3-pipeline/ca3-hija-sdd-{arquitecto,producto,implementador,verificador}.json` (read del rol de cada subagente); `transcript-mencion-arquitecto.json` (se niega a implementar, conforme a prosa) | Auditado: el transcript del primary muestra `read` de `core/roles/es/sdd-orquestador.md` y cita textual de la misión; las 4 hijas (`info.agent` = sdd-arquitecto/producto/implementador/verificador) contienen cada una 4-5 lecturas de su fichero de rol. RN-06 intacta en runtime | ✅ |
| CA-3 (pipeline end-to-end — CE-1) | Ciclo completo desde el CLI en dos rondas. Ronda 1 (SPEC-001, suma): `/sdd-init` → épica+spec (scaffold.mjs real) → gates firmados por el operador (`estado.mjs … aprobada --por 'Operador Fixture'`) → implementación TDD en `ft/SPEC-001-funcion-suma-basica` → verificador de opencode escribe el ledger (GREEN) y cierra `hecho` → `/sdd-tablero`; **pero los turnos 2-10 corrieron como `build` (V1: continuaciones `-s` sin `--agent`)**. **Ronda 2 (SPEC-002, resta; corrección de V1)**: mismas 4 delegaciones `task` + gate de aprobación + implementación (4/4 tests) + verificación GREEN con ledger, con `--agent sdd-orquestador` en TODOS los turnos. **Lazo RED→GREEN (ADR-009)**: `edit: deny` en seco retira la tool → `sdd-verificador` con edit granular (`*`: deny + allow ledger/`_qa`) en `adapters/opencode/opencode.json`; check `tools/checks/manifiestos.mjs` exige la nueva forma (commit `8f6e690`) | `adapters/opencode/tests/enforcement.test.mjs` — "SPEC-014 CA-3: el verificador construido lleva edit granular ADR-009"; `tools/tests/opencode.test.mjs` — 3 casos "SPEC-014 CA-3"; evidencia CLI ronda 1: `ca3-pipeline/` (transcripts, export padre e hijas, `estado-final-fixture.txt`, suite 8/8 exit 0); **ronda 2: `ca3-pipeline/ca3-ronda2-parent-export.json` (46/46 mensajes `agent: sdd-orquestador`, 4 `task` despachadas por el primary) + `ca3-ronda2-t{1,2,3}.json`** | Artefactos reales verificados (estado final del fixture coincide en vivo: rama ft, spec `hecho`, 8/8) y lazo ADR-009 confirmado en t7/t8 (edit del ledger OK, fuentes vetadas). PERO el export padre muestra que SOLO el turno 1 corrió como `sdd-orquestador`: los turnos 2-10 —incluidas las 4 delegaciones `task`— corrieron como agente `build` (el operador omitió `--agent` en las continuaciones `-s`). "El orquestador-primary delega" NO está evidenciado → finding V1 | 🚧 |
| CA-4 (gates como turnos + anidamiento — [H4]) | Sin código: ejercido contra el CLI. Patrón invoca→informe→PARA→(input del operador)→firma→siguiente `task`, exhibido POR EL PRIMARY en la ronda 2 (SPEC-002 `borrador` → PARA en gate → aprobación → `estado.mjs` → task implementador → PARA con informe → task verificador → PARA con informe GREEN), con `--agent sdd-orquestador` en cada turno. Hallazgo de conducción (acta §2.4): `run -s` NO conserva el agente; sin `--agent` el turno cae a `build` (así falló la ronda 1 — V1) | Evidencia ronda 2: `ca3-pipeline/ca3-ronda2-parent-export.json` (sesión y 46/46 mensajes `agent: sdd-orquestador`; las 4 `task` salen de mensajes del primary; gate entre `task`s) + sonda del verificador `verif/verif-sonda-continuacion-respeta-agent.json`; anidamiento: `ca4-gates-turnos/ca4-anidamiento.json` + `ca4-hija-arquitecto-anidamiento.json` (subagente SIN tool `task`: impedido; jerarquía plana) | Mitad anidamiento ✅ (la hija sdd-arquitecto no tiene la tool `task` en su set — evidencia del lado del subagente, válida). Mitad "el PRIMARY cede el turno" 🚧: el patrón invoca→informe→PARA existe en el transcript, pero quien lo exhibió en los turnos 2-10 fue el agente `build` (con `task` allow-all y `edit` allow), no `sdd-orquestador` con su perfil de permisos → finding V1 | 🚧 |
| CA-5 (deny real en runtime — [H2], medición CE-3) | Sin código nuevo (plugin de SPEC-011 tal cual, ya cargando por CA-1). Deny: en `main`, `write` y `edit` bajo `src/` ABORTADOS por el `throw` con mensaje require-spec y ficheros intactos (hash idéntico). Allow: en carril legítimo el implementador escribió `src/suma.mjs`/`src/suma.test.mjs` (así se hizo CA-3). Payload real suficiente | Evidencia: `ca5-enforcement/{ca5-deny-write.json,ca5-deny-edit.json,veredicto-deny.md}`; lado allow en `ca3-pipeline/ca3-hija-sdd-implementador.json` (write/edit completed en rama ft con spec aprobada); bonus: deny también con spec en `hecho` (estado no codeable, `ca3-pipeline/ca3-pipe-t8-sonda-verif2.json`) | Auditado en los eventos de tool reales: `write src/suma.mjs` y `edit src/.gitkeep` con `status:"error"` y el mensaje require-spec; fichero denegado intacto (hash) y `suma.mjs` inexistente tras el intento; lado allow real en la hija implementador (rama ft + spec aprobada). La alucinación de éxito del modelo tras el deny está registrada — la verdad es el evento + filesystem | ✅ |
| CA-6 (overlay permission por-proyecto — resto de [H5]) | Overlay aplicado al `opencode.json` raíz del fixture (`src/**: ask`, `docs/fundacion/**: ask`); fusión confirmada en `debug config` (unión con los deny de generados del artefacto); `ask` disparado y auto-rechazado en run no interactivo (fichero intacto); precedencia sondeada: el `edit: allow` plano por-agente PISA el deny global por-ruta (el implementador editó `docs/tablero.md`) → finding F-SPEC-014-3, garantía RN-05 en L2/L3 | Evidencia: `ca6-overlay/{ca6-ask-fundacion.json,ca6-precedencia.json,ca6-hashes-antes.txt}`; resultado de precedencia anotado en el acta §2.2 con impacto en doc de instalación | Re-verificado en vivo sobre el fixture: overlay presente en `opencode.json` raíz (`src/**: ask`, `docs/fundacion/**: ask`); `vision.md` intacto (sha1 `f3d7d91b…` = hash-antes); transcript del `ask` auto-rechazado y de la precedencia (implementador editó `docs/tablero.md` pese al deny global). La condición de FALLA (no fusionar) no se da; F-SPEC-014-3 es follow-up legítimo, no degrada el CA | ✅ |
| CA-7 (acta durable [H1]…[H5]) | `docs/estudios/opencode-piloto.md`: veredicto por hipótesis (confirmada/matizada) con evidencia referenciada a `docs/_qa/SPEC-014/` y CA, versión exacta (1.18.5) y fecha (2026-07-27); hallazgos operativos (vía oficial de CA-2, procedimiento de CA-1, precedencia de CA-6, sonda [H3]); §3 declara que nada contradice ADR-007 (no editado, RN-04) | Inspección del acta: cubre las 5 hipótesis + referencia al estudio §5 de SPEC-009 sin reescribirlo; sonda [H3] en `ca7-sonda-h3-payload.jsonl` (renombrado de `.log` por V2: la regla `*.log` de `.gitignore` lo excluía) | El acta existe y cubre [H1]…[H5] con versión y fecha, pero: (a) la evidencia de [H4] afirma "una única sesión primary con 4+ `task`" y el propio export la desmiente (turnos 2-10 como `build`) → el veredicto CONFIRMADA de [H4] no se sostiene tal cual → finding V1; (b) `ca7-sonda-h3-payload.log`, citado como evidencia de [H2]/[H3], está excluido por `.gitignore` (`*.log`) y NO viaja con la rama → finding V2 | 🚧 |
| CA-8 (diff acotado; núcleo intacto) | Diff de la rama: `docs/` (spec, ledger, acta, `_qa/SPEC-014/`) + `adapters/opencode/` (2 lazos con rebuild) + `tools/checks/manifiestos.mjs` y `tools/tests/opencode.test.mjs` (consecuencia mínima del lazo ADR-009 — ver salvedad F-SPEC-014-1); `core/`, `tools/build-adapter.mjs` y máquina de estados INTACTOS; fixture fuera del repo, sin comitear | `git diff --stat main` (sin `core/` ni `build-adapter.mjs`); `npm test` 289/289; `node tools/check.mjs` OK (incluye `nucleo-aislado`/`nucleo-agnostico`); tests de los ajustes de adaptador incluidos en los lazos | Reproducido: `git diff --stat main` acotado a `docs/` + `adapters/opencode/` + los 2 ficheros de `tools/` del lazo ADR-009; `core/`, `tools/build-adapter.mjs` y máquina de estados intactos; fixture fuera del repo. F-SPEC-014-1 JUZGADA ACEPTABLE: el check codificaba la forma pre-ADR-009 y habría puesto CI en rojo — tocarlo es la consecuencia mínima del lazo que la propia spec manda, y va cubierto por 4 tests nuevos | ⚠️ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

**RED** — 2026-07-27 — sdd-verificador (Claude Code), sobre opencode 1.18.5 real.

Lo sólido: CA-1, CA-2, CA-5 y CA-6 quedan verificados con evidencia real (parte
re-ejercida en vivo sobre el fixture); CA-8 con la salvedad F-SPEC-014-1, que
JUZGO ACEPTABLE (consecuencia mínima del lazo ADR-009 que la propia spec manda;
núcleo/build/máquina de estados intactos; cubierta por tests). Los dos lazos
RED→GREEN del implementador (plugin `.mjs`, edit granular del verificador) están
bien hechos y confirmados en runtime (t7/t8).

Lo que devuelve la spec (findings accionables):

- **V1 (CA-3, CA-4, CA-7 — bloqueante)**: el export padre
  (`ca3-pipeline/ca3-parent-export.json`) muestra que SOLO el turno 1 corrió
  como `sdd-orquestador`; los turnos 2-10 —incluidas las CUATRO delegaciones
  `task` (arquitecto, producto, implementador, verificador) y todas las paradas
  de gate— corrieron como el agente por defecto **`build`** (con `task`
  allow-all y `edit` allow), porque el operador omitió `--agent` en las
  continuaciones `run -s`. "El orquestador-primary delega ... y cede el turno"
  (CA-3/CA-4) NO está evidenciado, y la evidencia de [H4] del acta ("una única
  sesión primary con 4+ `task`") queda desmentida por su propio export.
  Verifiqué EN VIVO que no es límite del CLI y que el arreglo es barato:
  (a) `run -s <ses> --agent sdd-orquestador` SÍ respeta el agente en la
  continuación (`verif/verif-sonda-continuacion-respeta-agent.json`: PROBE-UNO
  y PROBE-DOS, ambos mensajes `agent: sdd-orquestador`); (b) el primary real
  despacha `task`→subagente bajo su allowlist, recibe el informe y PARA
  (`verif/verif-sonda-primary-despacha-task.json`). **Acción**: re-ejercer las
  delegaciones y al menos un gate con `--agent sdd-orquestador` en CADA turno,
  re-archivar el export padre (mensajes despachantes con
  `agent: sdd-orquestador`) y corregir acta §1[H4]/§Conducción y las filas
  CA-3/CA-4 del ledger. Durante el re-ejercicio reproduje además un cuelgue
  sin salida (acta §2.5): documentar el reintento no invalida nada.
- **V2 (CA-7 / convención de evidencia — bloqueante barato)**:
  `docs/_qa/SPEC-014/ca7-sonda-h3-payload.log`, citado como evidencia de
  [H2]/[H3] por acta y ledger, está excluido por `.gitignore` (regla `*.log`):
  existe solo en este working tree y NO viaja con la rama. **Acción**:
  renombrar a `.txt`/`.jsonl`, comitear y actualizar las referencias.
- **Observación al gate (no exige código)**: ADR-009, citado por spec, checks
  y tests de esta rama, no existe EN esta rama — vive en
  `ft/SPEC-013-cierre-ce-2-kimi-real` sin mergear. Dependencia de orden de
  merge que el gate debe conocer. Menor: `00-entorno.txt` dice 2026-07-26 y el
  acta 2026-07-27.

Con V1 y V2 resueltos, el resto del expediente ya está verificado: no hace
falta repetir CA-1/CA-2/CA-5/CA-6.

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-014/. Informe HTML opcional: _qa/SPEC-014/informe.html -->

| CA | Evidencia |
|---|---|
| CA-1 | `ca1-descubrimiento/{agent-list.txt,debug-config-resumen.json,skills-sdd.json,procedimiento-e-hallazgos.md}` + fixture vivo |
| CA-2 | `ca2-prompt-rol/transcript-primary-orquestador.json` + lecturas de rol en las 4 hijas de `ca3-pipeline/` |
| CA-3 | `ca3-pipeline/` (export padre e hijas, estado final) — INCOMPLETA por V1 |
| CA-4 | `ca4-gates-turnos/` (anidamiento ✅) + export padre (turnos, por `build` → V1) |
| CA-5 | `ca5-enforcement/` (deny write/edit con hash intacto) + allow en hija implementador |
| CA-6 | `ca6-overlay/` + re-verificación en vivo (overlay, hash `f3d7d91b…` intacto) |
| CA-7 | `docs/estudios/opencode-piloto.md` + `ca7-sonda-h3-payload.log` (no comiteado → V2) |
| Verif. | `verif/verif-sonda-continuacion-respeta-agent.json`, `verif/verif-sonda-primary-despacha-task.json` |

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
  se conducen vía `task` del primary. **Las continuaciones `run -s` TAMPOCO
  conservan el agente de la sesión: hay que re-pasar `--agent <primary>` en
  CADA turno o el turno corre como `build`** (origen del finding V1 de la
  ronda 1; corregido en la ronda 2 y sondado por el verificador). Y en `run` no
  interactivo un permiso `ask` se auto-rechaza. Comportamientos del CLI 1.18.5
  real (manda el CLI, finding de doc).

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->

- **Ronda 2 (respuesta al RED del verificador, 2026-07-27)**: V1 y V2
  resueltos. V1: re-ejercidas las 4 delegaciones y el gate en una sesión nueva
  del fixture (SPEC-002, resta) con `--agent sdd-orquestador` en TODOS los
  turnos — export `ca3-pipeline/ca3-ronda2-parent-export.json`: 46/46 mensajes
  del primary, 4 `task` despachadas por él, gate con PARA+firma; acta corregida
  ([H4] con fe de erratas de la ronda 1, §2.4 conducción, §4 CE-1) y filas
  CA-3/CA-4 de esta matriz actualizadas. V2: sonda [H3] renombrada a
  `ca7-sonda-h3-payload.jsonl` (ya no la excluye `.gitignore`) con referencias
  actualizadas en acta y ledger. `00-entorno.txt` aclara el desfase de fecha
  UTC/local (observación menor del verificador). La ronda 2 corrió sin cuelgues
  del CLI (§2.5 del acta sigue vigente para el caso general).
- **Hecho antes (ronda 1)**: piloto CA-1…CA-7 ejecutado contra opencode 1.18.5
  real (2026-07-27, DeepSeek v4 flash free de OpenCode Zen). Dos lazos
  RED→GREEN sobre el adaptador, ambos con test y rebuild: registro del plugin
  `.mjs` en el manifiesto (`f899c19`) y edit granular ADR-009 del verificador
  (`8f6e690`). Acta durable en `docs/estudios/opencode-piloto.md`; evidencia en
  `docs/_qa/SPEC-014/`. `npm test` 289/289; `node tools/check.mjs` OK.
- **Veredictos provisionales** (los del implementador; el acta detalla):
  [H1] confirmada · [H2] confirmada · [H3] matizada (identidad resoluble vía
  sessionID+client; hook no codeado, fuera de alcance) · [H4] confirmada (con
  la evidencia de la ronda 2; la ronda 1 queda como fe de erratas) ·
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
