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
| CA-B1 | n/a (ADR ya escrito por arquitecto): `docs/adr/ADR-008-politica-del-prefijo-de-plugin-en-la-identidad-de-rol-de-protege-verdad.md` — registra "aceptar cualquier prefijo" (`lastIndexOf(':')`), nombra la consecuencia `foo:sdd-arquitecto` y el porqué (gate protege verdad LOCAL, no frontera de seguridad; ADR-002/ADR-007) | n/a (no lleva test de código) | Leído `docs/adr/ADR-008-*.md`: decide "aceptar CUALQUIER prefijo" (`lastIndexOf(':')`), nombra la consecuencia (`foo:sdd-arquitecto` tratado como dueño) y el porqué (gate protege verdad LOCAL, no frontera de seguridad; L2/L3 en ADR-002; ADR-007 [H3]). Las tres piezas presentes | ✅ |
| CA-B2 | n/a (no re-toca hook; kimi ya normaliza con `sinPrefijo` en `adapters/kimi-code/hooks/protege-verdad.mjs:11,26`) | `adapters/kimi-code/tests/protege-verdad.test.mjs` — 3 casos nuevos: `CA-B2: ...dueño prefijado (tremen-sdd:sdd-arquitecto) permite`, `CA-B2: docs/fundacion/* con dueño prefijado (tremen-sdd:sdd-producto) permite`, `CA-B2: ...no-dueño prefijado (tremen-sdd:sdd-implementador) deniega`. Corren contra `dist/kimi-code/hooks/protege-verdad.mjs`. Pasan (regresión, no fix) | Corridos los 3 casos: `node --test adapters/kimi-code/tests/protege-verdad.test.mjs` → 8 pass / 0 fail. Verificados por nombre: dueño `tremen-sdd:sdd-arquitecto`→permite (out `''`), `tremen-sdd:sdd-producto` sobre `docs/fundacion/*`→permite, no-dueño `tremen-sdd:sdd-implementador`→deny | ✅ |
| CA-B3 | n/a (auditoría) | Barrido: `ls adapters/*/hooks/protege-verdad.mjs` → solo `claude-code` (cubierto por CA-8, no se toca) y `kimi-code` (gana CA-B2). `opencode` no tiene `hooks/` ni compara identidad (`grep agent_type/agent_name adapters/opencode/` → sin coincidencias; única mención de `protegeVerdad` es config de gate en `adapters/opencode/tests/enforcement.test.mjs`, no comparación de rol; ADR-007 [H3]). Ningún otro adaptador con hook que compare identidad y carezca del caso prefijado | `ls adapters/*/hooks/protege-verdad.mjs` → solo `claude-code` (CA-8, no se toca) y `kimi-code` (CA-B2). `grep -rn agent_type\|agent_name adapters/opencode/` → sin comparación de identidad (solo `subagent_type` en docs/skills/tests, no hay hook `protege-verdad`). Sin otro adaptador vulnerable | ✅ |
| CA-B4 | `CHANGELOG.md` (raíz, nuevo; antes no existía ningún `CHANGELOG*`) — formato Keep-a-Changelog; entrada 0.4.0 (sin publicar) que registra el cierre del hueco de cobertura kimi y referencia el fix de fondo `7323a1f` (normalización) y el backport 0.3.1 | n/a (doc) | `CHANGELOG.md` existe en raíz; entrada `[Sin publicar] — 0.4.0` registra el cierre del hueco de cobertura kimi, referencia el fix de fondo `7323a1f` (normalización) y el backport `0.3.1`. Keep-a-Changelog | ✅ |
| CA-B5 | Sin cambios de código de producción (solo tests+docs) | `npm test` → **284 pass / 0 fail** (baseline previo 281 + 3 nuevos CA-B2). `git diff -- adapters/claude-code/hooks/protege-verdad.mjs adapters/kimi-code/hooks/protege-verdad.mjs` = **VACÍO** | `npm test` → **284 pass / 0 fail** (baseline 281 + 3 CA-B2), output real capturado. `git diff -- adapters/claude-code/hooks/protege-verdad.mjs adapters/kimi-code/hooks/protege-verdad.mjs` = **VACÍO** confirmado | ✅ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

**GREEN — 2026-07-25 — sdd-verificador.** La spec (una unidad, dos bloques) cumple
todos los CA de ambos bloques verificados sobre ARTEFACTOS. Bloque B en la rama
`ft/SPEC-012-protege-verdad-prefijo-plugin` (layout `adapters/`+`core/`); Bloque A en la
rama `fix/0.3.1-protege-verdad-prefijo` (worktree `.claude/worktrees/agent-af98e1d989393f9ac`,
layout antiguo). Sin regresiones; el comportamiento del gate no cambia más allá de la
normalización acordada (ADR-008).

### Evidencia Bloque A — backport 0.3.1 (layout antiguo, worktree, rama `fix/0.3.1-protege-verdad-prefijo`)

Suite del layout antiguo: `node --test tests/*.test.mjs` → **54 pass / 0 fail** (output real).

| CA | Verif. (comando + resultado real) | Estado |
|---|---|---|
| CA-A1 | `git diff 3cb30db..fix/0.3.1-protege-verdad-prefijo -- hooks/protege-verdad.mjs`: añade `const sinPrefijo = (r) => (r == null ? r : r.slice(r.lastIndexOf(':') + 1));` y lo aplica al rol. Semántica `lastIndexOf(':')` plugin-agnóstica; no-op para nombre desnudo, `main` y `undefined` (guarda `r == null`) | ✅ |
| CA-A2 | Test nuevo "permite documento de verdad al dueño con prefijo": `tremen-sdd:sdd-arquitecto`→FOUNDATION.md `''`; `tremen-sdd:sdd-producto`→`docs/fundacion/vision.md` `''`. Pasa (dentro de los 54). Prueba adversarial: en `3cb30db` el hook comparaba `agent_type` crudo → el dueño prefijado caía en deny, así que este test fallaría sin la normalización | ✅ |
| CA-A3 | Test nuevo "deniega… no dueño (con prefijo)": `tremen-sdd:sdd-implementador` y `tremen-sdd:sdd-verificador` sobre FOUNDATION.md / `docs/fundacion/*` → `/deny/`. Pasa | ✅ |
| CA-A4 | Diff de tests puramente ADITIVO (desde línea 59, sin borrados/ediciones): preexistentes verbatim. Test no-op sin prefijo (`sdd-arquitecto` permite, `sdd-implementador` deny) + plugin-agnóstico (`otro-plugin:*`). Suite previa (tablero denegado, no-dueño, fail-open, bypass ruta relativa) verde | ✅ |
| CA-A5 | `package.json` y `.claude-plugin/plugin.json` → `"version": "0.3.1"`. `marketplace.json` sin campo `version` (sabido, no defecto) | ✅ |
| CA-A6 | `CHANGELOG.md` de la rama: entrada `[0.3.1]` nombra **0.3.0** como origen ("Desde 0.3.0"), síntoma (dueño denegado, con el mensaje real del hook) y causa (`agent_type` prefijado sin normalizar). No genérico | ✅ |
| CA-A7 | Sección "Nota de actualización": declara que en 0.3.0 arquitecto/PO no pueden editar sus documentos, que el síntoma "el hook me deniega" es **BUG no regla**, que la vía es **ACTUALIZAR** y **desaconseja explícitamente** `SDD_SKIP_GATE=1` (bypass total) | ✅ |
| CA-A8 | `git tag --points-at` y `tag -l "*0.3.1*"` → sin tags; `git branch -r --contains` → sin remoto. Rama lista para publicar; tag/publish NO ejecutados (gate humano) | ✅ |

### Evidencia Bloque B — fuente 0.4.0 (rama `ft/SPEC-012-protege-verdad-prefijo-plugin`)

`npm test` → **284 pass / 0 fail** (baseline 281 + 3 CA-B2). Ver filas CA-B1..B5 de la
matriz arriba. Diff de los hooks `protege-verdad.mjs` (claude-code y kimi-code) VACÍO:
el bloque no toca comportamiento, solo añade cobertura y docs.

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
