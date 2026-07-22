---
id: SPEC-009
tipo: ledger
epica: EPIC-003
---
# Ledger — SPEC-009 Estudio y mapa de capacidades de opencode

## Resumen
- Fase: en-progreso (implementación completa; pendiente de verificación)
- Rama: `ft/SPEC-009-estudio-capacidades-opencode`
- Entregable: `docs/estudios/opencode-capacidades.md` (mapa capacidad→necesidad,
  citado contra opencode.ai/docs consultado 2026-07-23) + confirmación de ADR-007.
- Naturaleza: spec de estudio + documentación. No se añade código ni tests nuevos
  (CA-6 lo prohíbe); el "test" de cada CA es la inspección del documento y que la
  suite existente sigue verde sin cambio de conteo.

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `docs/estudios/opencode-capacidades.md` §2 (tabla de 8 filas: agents, commands, skills, plugin/hooks, manifiesto/config, tests, resolución del núcleo, orquestación) | Inspección: la tabla contiene las 8 filas identificables (§8 traza CA→§) | Verificado: §2 tiene 8 filas numeradas (1 agents … 8 orquestación); cada una con columna "Mecanismo", "Fuente" (S1–S6) y "Paridad/degradación/hipótesis". Las 6 piezas de la lista cerrada de `arquitectura.md` §"Lista cerrada de piezas" + resolución del núcleo + orquestación, presentes | ✅ |
| CA-2 | `docs/estudios/opencode-capacidades.md` §1 (fuentes S1–S6) + §3 (detalle citado por pieza, todas con fuente+fecha 2026-07-23) | Inspección: no hay afirmación de capacidad sin fuente+fecha o sin marca `[HIPÓTESIS]` (§5); URLs opencode.ai reales confirmadas por WebFetch 2026-07-23 | Verificado con rigor adversarial (WebFetch 2026-07-23 sobre S1 agents, S2 commands, S4 plugins, S6 config): las URLs son reales y **sostienen** lo afirmado — cuerpo markdown = system prompt; `prompt:{file:...}` relativa al config; commands por fichero (filename=comando); `throw` aborta la tool (ejemplo `.env` literal); ausencia de plugin-root (solo OPENCODE_CONFIG/CONFIG_DIR/TUI_CONFIG); `subagent_depth` default 1; substituciones `{env:}`/`{file:}`. Sin afirmación de capacidad sin fuente+fecha o marca `[HIPÓTESIS]` | ✅ |
| CA-3 | `docs/estudios/opencode-capacidades.md` §4 (L1 = gate real que deniega; remite a ADR-007; `throw` en `tool.execute.before` citado S4/2026-07-23) | Inspección: contiene la resolución + referencia a ADR-007; ADR-007 §Decisión punto 3 coincide | Verificado: §4 resuelve L1 = gate real que **deniega** (plugin `throw`ea en `tool.execute.before` sobre `require-spec.mjs`), remite a ADR-007 §Decisión puntos 3 y 5, y coincide con ADR-007 (§Decisión punto 3). Afirmación central citada S4/2026-07-23 y **confirmada contra la doc real** (ejemplo oficial `.env`). Matiz honesto: la prosa no formaliza el aborto → queda como `[H2]`, correcto | ✅ |
| CA-4 | `docs/estudios/opencode-capacidades.md` §5 ([H1]…[H5] alineadas con ADR-007; cada una con qué asume / por qué la doc no basta / cómo se confirma contra el CLI) | Inspección: 5 hipótesis, tres campos cada una; cubre resolución de prompt por ruta interna, `throw`-deny, identidad para protege-verdad, despacho primary→subagentes con subagent_depth=1, y descubrimiento/instalación sin marketplace | Verificado: §5 lista [H1]…[H5], cada una con los 3 campos (qué asume / por qué la doc no basta / cómo se confirma contra el CLI). Cubre los 5 puntos exigidos por el CA y alinea con [H1]…[H5] de ADR-007 §Asunciones | ✅ |
| CA-5 | `docs/estudios/opencode-capacidades.md` §6 (tabla 3 harnesses + 4 asimetrías; cita `docs/arquitectura.md` §"Añadir un harness" y ADR-003) | Inspección: compara Claude/Kimi/opencode en las piezas que difieren (orquestador skill/raíz/primary; commands por fichero SÍ/SÍ/NO; L1 deniega en opencode; sin plugin-root) | Verificado: §6 tabla contrasta los 3 harnesses en las piezas que difieren y enumera 4 asimetrías explícitas (orquestador skill/raíz/primary; commands por fichero SÍ/SÍ/NO; L1 deniega en opencode; sin plugin-root). Citas comprobadas contra el repo: `arquitectura.md` §"Añadir un harness"/"Lista cerrada" (líneas 120-146) y ADR-003 (existe, punto 7 = asimetría del orquestador) | ✅ |
| CA-6 | Diff solo bajo `docs/` (roadmap, ADR-007, épica, spec, ledger, estudio); no toca `core/`/`tools/`/`adapters/` ni la máquina de estados | `npm test` → **222 pass / 0 fail** (verde, sin cambio de conteo); `git add -A -n` confirma que ningún path está fuera de `docs/` | Verificado por el gate: `git diff --name-only main...HEAD` → todo bajo `docs/` (6 ficheros; nada en `core/`/`tools/`/`adapters/`). `npm test` re-ejecutado por mí → **222 pass / 0 fail** (verde, sin cambio de conteo) | ✅ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

**GREEN — 2026-07-23 (sdd-verificador).** Los seis CA cumplen. `npm test` verde
(222 pass / 0 fail, sin cambio de conteo); diff exclusivamente bajo `docs/`.
Comprobación **adversarial de las fuentes** (WebFetch 2026-07-23 sobre las URLs
opencode.ai/docs de agents, commands, plugins, config): todas son reales y
sostienen las afirmaciones centrales del estudio —`throw` en `tool.execute.before`
aborta la tool (ejemplo `.env` literal), commands por fichero, `subagent_depth`
default 1, ausencia de plugin-root, `prompt:{file:...}` relativa al config. El
documento es honesto: marca como `[H2]` que la prosa no formaliza el aborto. Sin
findings. Spec → `hecho` (gate de spec, no de épica; el cierre de EPIC-003 es gate
humano). F-SPEC-009-1 (matiz favorable frente a ADR-007) y las hipótesis [H1]…[H5]
quedan como follow-ups accionables para las specs posteriores de EPIC-003.

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-009/. Informe HTML opcional: _qa/SPEC-009/informe.html -->

## Salvedades / follow-ups
<!-- IDs F-SPEC-009-1, F-SPEC-009-2… con destino (spec futura o EPIC-MEJORA). -->
- **F-SPEC-009-1 — Hallazgo favorable frente a ADR-007 (para el orquestador, no se
  edita el ADR — RN-04).** La doc real de opencode (opencode.ai/docs/agents, 2026-07-23)
  **sí** documenta `prompt: "{file:./ruta}"` (relativa al config) en la forma JSON
  config del agente. ADR-007 lo había marcado "no confirmado". Esto **de-riesga la
  vía alternativa de [H1]** (registrar agentes en `opencode.json` con `{file:...}`) y
  **no contradice** la forma del ADR. Destino: tenerlo presente en la spec de
  adaptador/enforcement de EPIC-003 al decidir la vía de resolución del prompt.
  Detalle en `docs/estudios/opencode-capacidades.md` §7.
- **F-SPEC-009-2 — Hipótesis [H1]…[H5] quedan abiertas y accionables** para el
  ejercicio del CLI real de opencode (piloto). Destino: spec(s) posteriores de
  EPIC-003 (adaptador / enforcement / ejercicio de pipeline). No son defecto: la spec
  las deja marcadas por diseño (§Fuera de alcance de la spec).

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->
- **Hecho:** documento durable `docs/estudios/opencode-capacidades.md` con el mapa
  capacidad→necesidad (8 filas), citas fuente+fecha (opencode.ai/docs, WebFetch
  2026-07-23), resolución de enforcement trazada a ADR-007, lista [H1]…[H5]
  accionable, y contraste 3 harnesses. Spec en `en-progreso`; ledger (mitad del
  implementador) relleno.
- **Verificado por mí (no es el gate):** `npm test` → 222 pass / 0 fail (verde, sin
  cambio de conteo); `git add -A -n` confirma que el diff solo toca `docs/` (CA-6).
- **Falta (verificador, vía orquestador):** verificar CA-1…CA-6 contra el documento,
  rellenar columnas Verif./Estado y el veredicto, y transicionar la spec. NO lo hace
  el implementador.
- **Para el gate humano (escalar):** F-SPEC-009-1 (matiz favorable frente a ADR-007;
  el ADR no se edita por RN-04).
- **Dónde seguir:** el entregable está en `docs/estudios/`; el contraste vive en su
  §6; las hipótesis para el piloto en su §5.
