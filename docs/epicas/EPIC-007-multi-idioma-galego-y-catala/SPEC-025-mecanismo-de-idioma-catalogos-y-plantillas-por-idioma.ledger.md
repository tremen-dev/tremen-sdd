---
id: SPEC-025
tipo: ledger
epica: EPIC-007
---
# Ledger — SPEC-025 Mecanismo de idioma, catalogos y plantillas por idioma

## Resumen
- Fase: <!-- refleja el estado de la spec; la fuente de verdad es el frontmatter de la spec -->
- Rama: la rama git **conserva su nombre**, `ft/SPEC-019-mecanismo-de-idioma-catalogos-y-plantillas-por-idioma`
  (PR #25), por decisión del humano del 2026-10-27. La spec se llamaba SPEC-019 en
  esa rama y se renumeró a SPEC-025 sin cambiar la rama.
  - Para RN-01, el implementador renombra la rama a
    `ft/SPEC-025-mecanismo-de-idioma-catalogos-y-plantillas-por-idioma` al retomarla:
    `require-spec` deduce la spec del nombre de la rama, y `ft/SPEC-019-…` apunta a la
    SPEC-019 de antigravity en `main`.
- **Procedencia**: el ledger de la ronda anterior (SPEC-019) tiene la mitad del
  implementador, el GREEN del verificador y los follow-ups F-SPEC-019-1 a -11. Está en
  `docs/epicas/EPIC-006-multi-idioma-galego-y-catala/SPEC-019-mecanismo-de-idioma-catalogos-y-plantillas-por-idioma.ledger.md`,
  en el commit `dc66b00`. Esa evidencia **no vale** para esta spec, porque se dio contra
  un `main` sin SPEC-019 a SPEC-024. La matriz arranca de cero.

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | | | | ❌ |
| CA-2 | | | | ❌ |
| CA-3 | | | | ❌ |
| CA-4 | | | | ❌ |
| CA-5 | | | | ❌ |
| CA-6 | | | | ❌ |
| CA-7 | | | | ❌ |
| CA-8 | | | | ❌ |
| CA-9 | | | | ❌ |
| CA-10 | | | | ❌ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-025/. Informe HTML opcional: _qa/SPEC-025/informe.html -->

## Salvedades / follow-ups
<!-- IDs F-SPEC-025-1, F-SPEC-025-2… con destino (spec futura o EPIC-MEJORA). -->
Heredados de la ronda SPEC-019 y renumerados. Los escribió sdd-arquitecto en la
renumeración; el implementador y el verificador los confirman o los cierran.

| Nuevo | Antes | Estado en esta spec |
|---|---|---|
| F-SPEC-025-1 | F-SPEC-019-1 | **Abierto, decisión del gate.** Exención de `fuente-unica` para `adapters/<h>/mensajes/<idioma>/mensajes.json` (commit 4962cf7). Con antigravity hay un catálogo de adaptador más; la exención es por forma, no por harness. |
| F-SPEC-025-2 | F-SPEC-019-2 | Abierto. `kimi-superficie` admite `mensajes/`. Revisar si `tools/tests` de antigravity (`superficie.test.mjs`) tiene una lista cerrada equivalente. |
| F-SPEC-025-3 | F-SPEC-019-3 | Abierto. CA-10 no tiene test permanente de "sin gl/ ni ca/" ni de "sin dependencias": se demuestra con un comando. |
| F-SPEC-025-4 | F-SPEC-019-4 | Abierto. El tablero del repo real se compara a mano contra el código base. |
| F-SPEC-025-5 | F-SPEC-019-5 | Abierto. Las citas de `README.md` y de `dominio.md` son de la spec #3 de EPIC-005. |
| F-SPEC-025-6 | F-SPEC-019-6 | **Absorbido por CA-1**: la raíz es la de `buscarRaizSdd` (ADR-015). Hay que retirar `buscarRaizProyecto` de `core/lib/idioma.mjs`. |
| F-SPEC-025-7 | F-SPEC-019-7 | Abierto, diseño. Si falta una plantilla en el idioma, `scaffold` usa la de `es`. En CI no puede ocurrir (SPEC-026). |
| F-SPEC-025-8 | F-SPEC-019-8 | Abierto, diseño. Normalización del golden: `<PROY>`, `/` y LF. |
| F-SPEC-025-9 | F-SPEC-019-9 | Abierto, diseño. Prefijos `[script]` y errores de programación en código. Ahora además el mensaje de la barrera entra en el catálogo, pero se emite siempre en `es` (ADR-016 §2). |
| F-SPEC-025-10 | F-SPEC-019-10 | **Cambia por decisión de diseño**: un `.sdd.json` ilegible hace fallar `valida.mjs` (CA-6(g)). Ya no sale con código 0. |
| F-SPEC-025-11 | F-SPEC-019-11 | Histórico. Hubo un hueco de bisect en la ronda anterior; no aplica a esta spec. |

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->
- **Estado**: la spec está en `borrador` y espera una nueva aprobación humana. No se
  implementa nada hasta entonces.
- **En la rama ya hay código** de la ronda SPEC-019 (commits 0b80c25..4962cf7).
- **Tras la aprobación**:
  1. renombra la rama (ver Resumen);
  2. integra `origin/main`;
  3. resuelve los conflictos de los cinco CLI del núcleo y de los `sdd-init`;
  4. adapta el código a CA-1(g)(h) (`buscarRaizSdd`), CA-3 (golden contra el `main`
     integrado, más la barrera y los hooks de antigravity), CA-5 (antigravity), CA-6(e)(g),
     CA-7 y CA-8 (antigravity, `AGENTS.md`) y CA-9 (bootstraps);
  5. actualiza las referencias a SPEC-019/ADR-013 en los comentarios de código y tests
     (la lista está en el informe de la renumeración).
