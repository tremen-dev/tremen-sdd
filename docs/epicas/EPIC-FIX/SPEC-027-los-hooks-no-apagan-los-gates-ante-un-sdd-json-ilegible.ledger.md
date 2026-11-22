---
id: SPEC-027
tipo: ledger
epica: EPIC-FIX
---
# Ledger — SPEC-027 Los hooks no apagan los gates ante un sdd-json ilegible

## Resumen
- Fase: hecho <!-- refleja el estado de la spec; la fuente de verdad es el frontmatter de la spec -->
- Rama: `ft/SPEC-027-los-hooks-no-apagan-los-gates-ante-un-sdd-json-ilegible`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `core/lib/sdd-json.mjs` (`leerSddJson`, `esSddJsonDe`) | `core/tests/sdd-json.test.mjs` (casos a–h + "solo importa node:*"); `tools/tests/nucleo-aislado.test.mjs` | Revisado `core/tests/sdd-json.test.mjs` (a–h, las cuatro variantes de (g)); import solo `node:*` comprobado leyendo el módulo; `npm test` 558/558 | ✅ |
| CA-2 | `adapters/{claude-code,kimi-code,antigravity}/hooks/_comun.mjs`, `adapters/opencode/plugins/_comun.mjs`, `tools/githooks/pre-commit.mjs` | `tools/tests/sdd-json-fuente-unica.test.mjs` (CA-2.1 import, CA-2.2 sin JSON.parse ni literal `.sdd.json`, CA-2.3 import resuelto en `dist/<harness>/`) | `tools/tests/sdd-json-fuente-unica.test.mjs` en verde (import, sin `JSON.parse` ni literal `.sdd.json`, import resuelto en `dist/<harness>/`); el diff `34e0c11..HEAD` no deja otros lectores | ✅ |
| CA-3 | `adapters/{claude-code,kimi-code,antigravity}/hooks/require-spec.mjs`, `adapters/opencode/plugins/require-spec.mjs` | `tools/tests/sdd-json-ilegible-hooks.test.mjs` (CA-3(a)–(e) y CA-3.3 por adaptador; variantes vacío/null/[]/42/directorio; BOM) | Tests en verde en los 4 adaptadores. Flujo real sobre `dist/` en tmp con `{ roto`: en claude/kimi, `src/app.js`, `src\app.js`, `src/.sdd.json` deny; `.sdd.json`, `./.sdd.json`, `src/../.sdd.json` y absoluto con `\` allow. En antigravity, `README.md` da `{"decision":"deny"}` | ✅ |
| CA-4 | `core/mensajes/es/mensajes.json` (clave `sdd-json.ilegible`), `core/lib/sdd-json-mensaje.mjs` (`mensajeSddJsonIlegible`) | `core/tests/sdd-json-mensaje.test.mjs` (puntos 1–5 y clave del catálogo); inclusión del mismo texto en `tools/tests/sdd-json-ilegible-hooks.test.mjs`, `tools/tests/pre-commit-sdd-json.test.mjs` y `core/tests/valida-idioma.test.mjs` | Una sola clave, `sdd-json.ilegible` (grep: ninguna otra redacción). El texto cubre los 5 puntos (test + lectura). Mismo texto observado en flujo real en require-spec de claude/kimi/antigravity, en calidad de claude, en el pre-commit y en `valida.mjs` | ✅ |
| CA-5 | `adapters/{claude-code,kimi-code,antigravity}/hooks/protege-verdad.mjs`, `adapters/{claude-code,antigravity}/hooks/calidad.mjs` | `tools/tests/sdd-json-ilegible-hooks.test.mjs` (CA-5(a) claude/kimi/antigravity, degradación Kimi sin identidad, interruptor ignorado; CA-5(b) claude exit 2 y antigravity `{}`+exit 0) | (a) claude/kimi: tablero y FOUNDATION deny con los mensajes de hoy; interruptor ignorado; Kimi sin identidad mantiene la degradación. Antigravity: protege-verdad solo deniega el tablero; FOUNDATION.md la deniega require-spec con el texto de CA-4 (F-SPEC-027-2). (b) claude: exit 2 + stderr, también en flujo real; antigravity: `{}`/exit 0 + stderr en test | ⚠️ |
| CA-6 | `tools/githooks/pre-commit.mjs` | `tools/tests/pre-commit-sdd-json.test.mjs` (a, a con null/[]/vacío, b, c con y sin BOM, d); regresión en `tools/tests/pre-commit.test.mjs` | `tools/tests/pre-commit-sdd-json.test.mjs` en verde. Flujo real en repo tmp con `{ roto`: exit 1 + texto de CA-4; con `SDD_SKIP_GATE=1`, exit 0. `pre-commit.test.mjs` sin cambios | ✅ |
| CA-7 | `core/scripts/valida.mjs` (`errorIdioma`), `core/lib/idioma.mjs` (`leerIdiomaDeclarado` delega en el lector único) | `core/tests/valida-idioma.test.mjs` (CA-6(g) / SPEC-027 CA-7 con el texto de CA-4; null/[]/vacío; BOM válido) y `core/tests/sdd-json-mensaje.test.mjs` (el catálogo ya no dice "tratan como ausente") | `core/tests/valida-idioma.test.mjs` en verde. Flujo real: `valida.mjs` con `null` da exit 1 y el texto de CA-4, sin "tratan como ausente"; con BOM válido, exit 0 | ✅ |
| CA-8 | — (todo el árbol) | `npm test` 558/558 en verde; `npm run check` OK. Única aserción existente cambiada: CA-6(g) de `core/tests/valida-idioma.test.mjs` (dos tests), por CA-7 | `npm test` 558/558 pass, 0 fail; `npm run check` OK. `git diff --stat 34e0c11..HEAD` sin cambios en `adapters/*/tests` ni en `tools/tests/pre-commit.test.mjs`; solo cambia `valida-idioma.test.mjs`, que CA-7 exige | ✅ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->
**GREEN**, 2026-11-23, sdd-verificador. CA-1…CA-4 y CA-6…CA-8 en ✅; CA-5 en ⚠️. En la rama, `npm test` da 558/558 y `npm run check` está en verde. He probado el flujo real sobre `dist/` y `core/` en directorios temporales: con `.sdd.json` ilegible (`{ roto`, `null`) y con BOM, los hooks, calidad, el pre-commit y `valida.mjs` se comportan como piden los CA.
- ⚠️ **CA-5(a) en antigravity** (F-SPEC-027-2): CA-5(a) incluye antigravity, pero su protege-verdad no tiene hoy ninguna regla para `FOUNDATION.md` ni recibe identidad de rol. No hay, por tanto, un "mensaje de hoy" que emitir. La escritura se deniega igualmente en ese harness, pero la deniega require-spec con el texto de CA-4. Acepto la lectura de ADR-017 §2 ("aplica sus reglas"): añadir esa regla sería trabajo nuevo. **Salvedad pendiente de aceptación humana.**
- F-SPEC-027-1 (validación de esquema) sigue sin destino. Lo decide el humano.

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-027/. Informe HTML opcional: _qa/SPEC-027/informe.html -->

## Salvedades / follow-ups
<!-- IDs F-SPEC-027-1, F-SPEC-027-2… con destino (spec futura o EPIC-MEJORA). -->
- **F-SPEC-027-1** — Validación de esquema de `.sdd.json` (p. ej. `rutasVigiladas` que no es array): sigue acabando en fail-open dentro de require-spec. Fuera de alcance (ADR-017). Destino **sin fijar**: pregunta abierta del gate (nota 6 de la spec): ¿spec propia en EPIC-FIX o EPIC-MEJORA?
- **F-SPEC-027-2** — **Pregunta para el humano (interpretación de CA-5(a))**: el `protege-verdad` de antigravity solo tiene hoy la regla del tablero (no recibe identidad de rol ni protege `FOUNDATION.md`). Se ha implementado "aplica sus reglas de hoy como si el gate estuviera activo": el tablero se deniega con el mensaje de hoy; `FOUNDATION.md` no lo deniega protege-verdad, pero la escritura no pasa porque require-spec la deniega con el texto de CA-4 (test `CA-5(a) [antigravity]: FOUNDATION.md …`). Si CA-5(a) pedía añadir a antigravity la regla de dueño de `FOUNDATION.md`, eso es trabajo nuevo (spec aparte).
- **F-SPEC-027-3** — Consecuencia de la fuente única en L3: `valida.mjs` usa ahora el mismo lector (vía `leerIdiomaDeclarado`), así que un `.sdd.json` con BOM pasa a ser válido (antes: ilegible) y uno con `null`/`[]`/escalar pasa a ser ilegible (antes: pasaba). Es lo que pide ADR-017 ("las cuatro capas tratan igual el mismo fichero"); se anota porque cambia la salida de `valida.mjs` en esos casos.
- **F-SPEC-027-4** — La clave `valida.sdd-json-ilegible` se sustituye por `sdd-json.ilegible` (la usan todas las capas, no solo valida). Si SPEC-026 introduce paridad entre idiomas, cualquier catálogo no-`es` necesitará esta clave. Hoy solo existe `es`.
- **F-SPEC-027-5** — Detalle de comportamiento no fijado por la spec: el `calidad` de claude-code y antigravity informa del `.sdd.json` ilegible tras **cualquier** Edit/Write (no solo tras editar el propio `.sdd.json`), siguiendo ADR-017 §2 ("tras editar, informa de que `.sdd.json` sigue ilegible"). El pre-commit bloquea con `.sdd.json` ilegible antes de mirar el staging.

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->
- **Hecho (sdd-implementador)**: CA-1…CA-8 implementados con test, en la rama `ft/SPEC-027-los-hooks-no-apagan-los-gates-ante-un-sdd-json-ilegible` (base `34e0c11`). Spec en `en-revision`. Sin push ni PR.
- **Piezas**: lector `core/lib/sdd-json.mjs` (solo `node:*`) + mensaje `core/lib/sdd-json-mensaje.mjs` (clave `sdd-json.ilegible`). Los `_comun.mjs` de los cuatro adaptadores reexportan `esSddJsonDe` y `mensajeSddJsonIlegible`; su `readConfig(cwd)` devuelve ahora la lectura completa (`{ estado, ruta, config?, motivo? }`), no la config ni `null`.
- **Verificación**: `npm test` (hace `build:all`; los tests de hooks corren sobre `dist/`) y `npm run check`. Tests nuevos: `core/tests/sdd-json*.test.mjs`, `tools/tests/sdd-json-*.test.mjs`, `tools/tests/pre-commit-sdd-json.test.mjs`.
- **Falta**: verificación (sdd-verificador) y respuesta humana a F-SPEC-027-1 (destino) y F-SPEC-027-2 (interpretación de CA-5(a) en antigravity).
