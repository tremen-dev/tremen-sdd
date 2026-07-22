---
id: SPEC-006
tipo: ledger
epica: EPIC-002
---
# Ledger — SPEC-006 Barrera anti-invasion de gates

## Resumen
- Fase: en-revision (implementación completa; pendiente de verificación)
- Rama: `ft/SPEC-006-barrera-anti-invasion-de-gates`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `core/scripts/estado.mjs` (`esPersona`: `^sdd-`=rol, vacío/`desconocido`=no-persona) | `core/tests/estado.test.mjs`: `aprobada rechaza la firma de un rol sdd-*…`, `aprobada rechaza la firma ausente…`, `aprobada acepta firma humana…` (verbatim, verdes) | | 🚧 |
| CA-2 | `core/scripts/estado.mjs` (`FIRMANTES.hecho` lee `data.tipo`: `epica`→`esPersona`; `MOTIVO_FIRMA.hecho(tipo)`) | `core/tests/estado.test.mjs`: `epica -> hecho: cualquier rol sdd-* la RECHAZA…`, `epica -> hecho: la firma de una persona la PERMITE`, `la firma de hecho discrimina por tipo…` | | 🚧 |
| CA-3 | `core/scripts/estado.mjs` (`FIRMANTES.aprobada` sin cambio de comportamiento) | `core/tests/estado.test.mjs`: los 3 tests de `aprobada` previos, **verbatim y verdes** | | 🚧 |
| CA-4 | `core/scripts/estado.mjs` (rama spec/task de `hecho` = `sdd-verificador`, sin cambios; prosa del verificador intacta) | `core/tests/estado.test.mjs`: `hecho solo lo firma sdd-verificador` **VERBATIM**, verde | | 🚧 |
| CA-5 | `core/scripts/estado.mjs` (`TRANSITIONS`/`REQUIEREN_APROBACION` intactos; proceso sin `FIRMANTES`) | `core/tests/estado.test.mjs`: `bloqueada es alcanzable…`, `el rodeo borrador -> bloqueada -> en-progreso…`, `tras la aprobación humana…` (verbatim, verdes) | | 🚧 |
| CA-6 | `core/roles/es/sdd-documentalista.md` (regla dura: no cierra/propone cerrar épicas; paso 3 pasa de "propone" a "reporta"); `tools/checks/prosa-gates.mjs`; cableado en `tools/check.mjs` | `tools/tests/prosa-gates.test.mjs` (4 casos: fichero real PASA, prosa sin regla FALLA, falta 1 regla FALLA, tolera acentos/markdown); `tools/tests/check.test.mjs`: `SPEC-006 CA-6: prosa-gates está cableado…` | | 🚧 |
| CA-7 | Sin cambios en `TRANSITIONS`/`REQUIEREN_APROBACION`; `git diff` de `estado.mjs` solo añade la rama por tipo | `npm test` 212/212 verde; `npm run check` verde (build claude+kimi + checks ambos adaptadores + valida) | | 🚧 |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-006/. Informe HTML opcional: _qa/SPEC-006/informe.html -->

## Salvedades / follow-ups
<!-- IDs F-SPEC-006-1, F-SPEC-006-2… con destino (spec futura o EPIC-MEJORA). -->

- **F-SPEC-006-1 (ruido del linter en el hook de calidad).** Durante la implementación el
  hook `PostToolUse` de `sdd-calidad` falló en cada edición con "ESLint couldn't find an
  eslint.config.(js|mjs|cjs) file" (ESLint v9+ ya no lee `.eslintrc.*`). Es ruido, no un
  fallo de esta spec: ya está aparcado como **EPIC-002 CE-3** (`calidad`/linter sin ruido),
  fuera de alcance aquí. No bloqueó las ediciones ni la suite (`npm test`/`npm run check`
  verdes). Destino: spec de CE-3.
- **Nota de firma del cierre de épica.** `TRANSITIONS` permite `en-revision -> hecho` para
  cualquier tipo, incluido `adr`. Un `adr` que llegara a `hecho` caería en la rama no-épica
  (exigiría `sdd-verificador`); en la práctica un ADR no llega a `hecho` (RN-04: es `aprobada`
  inmutable o `bloqueada`/superseded), así que no se añade guard por tipo `adr` (fuera de
  alcance, ADR-006 tabla: `adr`+`hecho` = n/a).

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->

Implementación **completa** contra los 7 CA; spec en `en-progreso`, la transiciono a
`en-revision` al cerrar. Falta SOLO la verificación (sdd-verificador rellena Verif./Estado
y el veredicto).

**Qué se tocó:**
- `core/scripts/estado.mjs`: extraído `esPersona`; `FIRMANTES.hecho(por, tipo)` lee `data.tipo`
  (`epica`→persona; `spec`/`task`→`sdd-verificador`, sin cambio); `MOTIVO_FIRMA` pasa a
  funciones de `tipo`; `transition` pasa `data.tipo`. **NO** se tocó `TRANSITIONS`,
  `REQUIEREN_APROBACION`, `fueAprobadaPorHumano` ni la rama spec/task (18ad848 preservado).
- `core/tests/estado.test.mjs`: **añadidos** fixture `epicaTmp` + 3 tests (CA-2). Todos los
  tests previos quedan **verbatim** (incluido `hecho solo lo firma sdd-verificador`).
- `core/roles/es/sdd-documentalista.md`: regla dura nueva + paso 3 "propone"→"reporta". La
  prosa del **verificador NO se tocó**.
- `tools/checks/prosa-gates.mjs` (+ `tools/tests/prosa-gates.test.mjs`): check de presencia
  de la regla, arranca vía `entrypoint.mjs`. Cableado en `tools/check.mjs` (+ test en
  `tools/tests/check.test.mjs`).

**Cómo re-verificar:** `npm test` (212/212 verde) y `npm run check` (verde, incluye
`prosa-gates`). Para reproducir la barrera de CA-2 a mano: sobre un fixture `tipo: epica` en
`en-revision` con aprobación humana previa, `estado.mjs … hecho --por sdd-verificador` lanza
`/gate humano/`, y `--por <persona>` deja `hecho`.

**Regresión de specs migradas (CA-7):** NO se agravó — no se tocó el parseo ni el grafo de
estados; solo se añadió la rama por `tipo` en la firma de `hecho`.
