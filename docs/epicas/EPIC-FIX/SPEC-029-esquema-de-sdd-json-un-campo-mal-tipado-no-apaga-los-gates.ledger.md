---
id: SPEC-029
tipo: ledger
epica: EPIC-FIX
---
# Ledger — SPEC-029 Esquema de sdd-json: un campo mal tipado no apaga los gates

## Resumen
- Fase: en-revision <!-- refleja el estado de la spec; la fuente de verdad es el frontmatter de la spec -->
- Rama: `ft/SPEC-029-esquema-de-sdd-json-un-campo-mal-tipado-no-apaga-los-gates`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `core/lib/sdd-json.mjs` (`ESQUEMA_SDD_JSON`, `LINTERS`, `erroresDeEsquema`; ilegible por esquema lleva `errores` y `leido`, nunca `config`) | `core/tests/sdd-json-esquema.test.mjs` — CA-1(a)…(k), una variante por test, 5 linters válidos, interruptores de `gates` a null | | ❌ |
| CA-2 | `core/lib/sdd-json.mjs` (`motivoDeEsquema`: todos los campos, `` `campo`: se esperaba X, se encontró Y ``, separados por `; `) | `core/tests/sdd-json-esquema.test.mjs` — CA-2 (tres campos, esperado y encontrado, orden) y "lo encontrado se muestra como JSON" | | ❌ |
| CA-3 | Sin cambio en hooks/plugin/pre-commit: todos leen con `leerSddJson`, que ya devuelve `ilegible` (ADR-019 §2) | `tools/tests/sdd-json-esquema-hooks.test.mjs` — (a) y (b) × 4 adaptadores de `dist/` (deny src/app.js con texto CA-4 + campo; allow `.sdd.json` relativo y absoluto) y pre-commit (exit≠0, texto CA-4, sin "Error inesperado"). Rojo comprobado con el lector de `e277c34` copiado en `dist/`: fallaban los 8 deny | | ❌ |
| CA-4 | `core/scripts/valida.mjs` (`erroresSddJson` sustituye a `errorIdioma`; importa `leerSddJson`) | `core/tests/valida-esquema.test.mjs` — CA-4(a)…(d) y CA-4.6 (fuente); `core/tests/valida-idioma.test.mjs` CA-6(b) cambia de aserción (ver salvedades) | | ❌ |
| CA-5 | `core/lib/sdd-json.mjs` (el esquema es el dato contra el que se compara) | `tools/tests/sdd-json-esquema-cobertura.test.mjs` — detector (no vacío, ignora literales y comentarios), CA-5.1 por fichero consumidor, CA-5.2 plantilla y `.sdd.json` del repo | | ❌ |
| CA-6 | `CHANGELOG.md` ([Sin publicar] — 0.5.1, "Cambiado") | `npm test` (640/640) y `npm run check` en verde; tests de SPEC-027 sin diff contra `e277c34`; `tools/tests/changelog-sdd-json-esquema.test.mjs` — CA-6.3 | | ❌ |
| CA-7 | `adapters/{claude-code,opencode,antigravity}/commands/sdd-init.md` (Paso 2, punto 0) | `tools/tests/sdd-init-esquema.test.mjs` — CA-7.1/7.2/7.3 y "no repite la tabla de tipos" por adaptador; siguen en verde `sdd-init-idioma`, `prosa-gates`, `referencias`, `manifiestos` | | ❌ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-029/. Informe HTML opcional: _qa/SPEC-029/informe.html -->

## Salvedades / follow-ups
<!-- IDs F-SPEC-029-1, F-SPEC-029-2… con destino (spec futura o EPIC-MEJORA). -->
- **F-SPEC-029-1 — `valida.mjs` pierde los errores de `.sdd.json` si `--dir` no existe.**
  Con `docs/` ausente (variantes `specs/` o `project_management/` en migración), el CLI
  sale con `[valida] ENOENT…` y no imprime los errores de esquema. No lo cambié (no está
  en los CA): en CA-7 la prosa de `sdd-init` manda ejecutar `valida.mjs --dir <directorio
  de la variante detectada>`, que existe por definición en modo migración. **Pregunta al
  humano**: ¿basta así, o el CLI debe informar de `.sdd.json` aunque falte el directorio
  de artefactos? Destino propuesto: EPIC-MEJORA.
- **Decisión de implementación (no cubierta por la spec)**: un `ilegible` por esquema
  añade al resultado del lector dos campos opcionales, `errores` (lista
  `{campo, esperado, encontrado}`) y `leido` (el objeto tal cual, solo para diagnóstico),
  y nunca `config`. `valida.mjs` usa `leido.idioma` para informar además de un `idioma`
  string no soportado (CA-4(d), ADR-019 §4). La forma de ADR-017 (`estado, ruta,
  config?, motivo?`) no cambia.
- **Test de SPEC-025 modificado**: `core/tests/valida-idioma.test.mjs` CA-6(b) (`idioma: 5`)
  esperaba "no soportado: 5"; SPEC-029 CA-4(c) exige ahora el error de esquema y no el
  de no soportado. Cambia solo esa aserción, con comentario. Los tests de SPEC-027 no
  cambian (CA-6.2).
- **Prosa de `sdd-init`**: se quita "o no es una cadena" del punto 0 del Paso 2 (es un
  tipo de ADR-019 §1, que ya no se repite en prosa); ese caso lo cubre la comprobación
  de esquema con `valida.mjs`.
- **Mensaje**: el texto de `sdd-json.ilegible` ("existe pero no se puede leer: {motivo}")
  se reutiliza sin clave nueva, como pide CA-3.4; con un esquema inválido el motivo es la
  lista de campos. Si se quiere una redacción específica para esquema, iría con SPEC-026.
- **CA-5**: el detector cuenta `cfg.`, `config.` y `leido.` (las tres formas en que el
  código nombra el objeto leído), fuera de literales y comentarios. Los ficheros de
  `core/` analizados son los que importan `sdd-json.mjs` (hoy `idioma.mjs` y `valida.mjs`).

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->
- Implementación completa de CA-1…CA-7 en la rama, spec en `en-revision`. Falta la
  verificación (sdd-verificador): columnas Verif./Estado y veredicto.
- Base: `e277c34` (merge PR #28). Sin push ni PR.
- Comprobar: `npm test` (640 tests en verde) y `npm run check` (verde). Tests nuevos:
  `core/tests/sdd-json-esquema.test.mjs`, `core/tests/valida-esquema.test.mjs`,
  `tools/tests/sdd-json-esquema-hooks.test.mjs`,
  `tools/tests/sdd-json-esquema-cobertura.test.mjs`, `tools/tests/sdd-init-esquema.test.mjs`,
  `tools/tests/changelog-sdd-json-esquema.test.mjs`.
- Pendiente del humano: F-SPEC-029-1.
