---
id: SPEC-012
tipo: ledger
epica: EPIC-FIX
---
# Ledger — SPEC-012 protege-verdad deniega al dueno con prefijo de plugin

## Resumen
- Fase: en-progreso → en-revision (implementación Bloque B completa; pendiente verificación)
- Rama: `ft/SPEC-012-protege-verdad-prefijo-plugin`
- Alcance de esta entrega: **solo Bloque B (fuente 0.4.0, layout `adapters/`+`core/`)**.
  El Bloque A (backport 0.3.1) lo implementa otro rol en rama de mantenimiento aparte;
  su evidencia (filas CA-A1..A8) no se rellena aquí.

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-B1 | n/a (ADR ya escrito por arquitecto): `docs/adr/ADR-008-politica-del-prefijo-de-plugin-en-la-identidad-de-rol-de-protege-verdad.md` — registra "aceptar cualquier prefijo" (`lastIndexOf(':')`), nombra la consecuencia `foo:sdd-arquitecto` y el porqué (gate protege verdad LOCAL, no frontera de seguridad; ADR-002/ADR-007) | n/a (no lleva test de código) | | |
| CA-B2 | n/a (no re-toca hook; kimi ya normaliza con `sinPrefijo` en `adapters/kimi-code/hooks/protege-verdad.mjs:11,26`) | `adapters/kimi-code/tests/protege-verdad.test.mjs` — 3 casos nuevos: `CA-B2: ...dueño prefijado (tremen-sdd:sdd-arquitecto) permite`, `CA-B2: docs/fundacion/* con dueño prefijado (tremen-sdd:sdd-producto) permite`, `CA-B2: ...no-dueño prefijado (tremen-sdd:sdd-implementador) deniega`. Corren contra `dist/kimi-code/hooks/protege-verdad.mjs`. Pasan (regresión, no fix) | | |
| CA-B3 | n/a (auditoría) | Barrido: `ls adapters/*/hooks/protege-verdad.mjs` → solo `claude-code` (cubierto por CA-8, no se toca) y `kimi-code` (gana CA-B2). `opencode` no tiene `hooks/` ni compara identidad (`grep agent_type/agent_name adapters/opencode/` → sin coincidencias; única mención de `protegeVerdad` es config de gate en `adapters/opencode/tests/enforcement.test.mjs`, no comparación de rol; ADR-007 [H3]). Ningún otro adaptador con hook que compare identidad y carezca del caso prefijado | | |
| CA-B4 | `CHANGELOG.md` (raíz, nuevo; antes no existía ningún `CHANGELOG*`) — formato Keep-a-Changelog; entrada 0.4.0 (sin publicar) que registra el cierre del hueco de cobertura kimi y referencia el fix de fondo `7323a1f` (normalización) y el backport 0.3.1 | n/a (doc) | | |
| CA-B5 | Sin cambios de código de producción (solo tests+docs) | `npm test` → **284 pass / 0 fail** (baseline previo 281 + 3 nuevos CA-B2). `git diff -- adapters/claude-code/hooks/protege-verdad.mjs adapters/kimi-code/hooks/protege-verdad.mjs` = **VACÍO** | | |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-012/. Informe HTML opcional: _qa/SPEC-012/informe.html -->

## Salvedades / follow-ups
<!-- IDs F-SPEC-012-1, F-SPEC-012-2… con destino (spec futura o EPIC-MEJORA). -->

- **F-SPEC-012-1 (observación de tooling, fuera de alcance de esta spec)**: durante la
  edición, el hook `PostToolUse` de calidad del plugin (cache) intentó `eslint` y falló
  con "ESLint couldn't find an eslint.config.(js|mjs|cjs)" tras auto-instalar `eslint@10`
  (el repo no lleva `eslint.config.*` y `.sdd.json.linter` = `"auto"`). No afecta a los CA
  (la edición se aplicó; `npm test` verde). Es ruido de entorno / deuda de config del
  linter, no un defecto de esta spec. Destino sugerido: EPIC-MEJORA (config de lint del repo).

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->

**Bloque B (fuente 0.4.0) — implementación COMPLETA, en rama `ft/SPEC-012-protege-verdad-prefijo-plugin`.**

Hecho:
- CA-B2: 3 tests de regresión (identidad prefijada) añadidos a
  `adapters/kimi-code/tests/protege-verdad.test.mjs`. Pasan contra el código actual (kimi
  ya normaliza; son cobertura ausente, no fix).
- CA-B3: auditoría de paridad declarada arriba (claude-code cubierto, kimi ganado, opencode n/a).
- CA-B4: `CHANGELOG.md` creado en raíz.
- CA-B1: constatado que ADR-008 existe y registra la política.
- CA-B5: `npm test` 284 pass / 0 fail; diff de hooks `protege-verdad.mjs` (claude-code y
  kimi-code) VACÍO.

Sin tocar (por diseño del gate): ningún `adapters/*/hooks/protege-verdad.mjs`.

Para el verificador (Bloque B): correr `npm test` (build 3 adaptadores → invariantes →
tests) esperando ≥284 verde; confirmar `git diff` vacío de los dos hooks; ejercer los 3
casos CA-B2. La mitad del Bloque A (backport 0.3.1) se verifica aparte contra el layout
antiguo (ver nota 6 de la spec), no con esta suite.
