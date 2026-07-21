---
id: SPEC-005
tipo: ledger
epica: EPIC-001
---
# Ledger — SPEC-005 Fuente unica de la description de rol

## Resumen
- Fase: en-revision (implementación completa; pendiente de verificación)
- Rama: `ft/SPEC-005-fuente-unica-de-la-description-de-rol`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 (canónica por rol) | `core/roles/es/_descripciones.json` (7 roles: 6 con `larga`+`corta`, `sdd-orquestador` solo `larga`). `git diff` no toca `core/roles/es/<rol>.md`. | `tools/tests/descripcion-fuente-unica.test.mjs` → "CA-1: … declara larga+corta no vacías para los 6 roles" | | |
| CA-2 (toda description coincide) | Alineadas 4 copias divergentes de Kimi skills a la `larga` canónica: `adapters/kimi-code/skills/{sdd-arquitecto,sdd-verificador,sdd-documentalista,sdd-producto}/SKILL.md` | `tools/tests/descripcion-fuente-unica.test.mjs` → "CA-2: el check pasa contra el árbol real del repo (conteo de divergencias = 0)" | | |
| CA-3 (check caza divergencia en CI) | `tools/checks/descripcion-fuente-unica.mjs` (arranca vía `core/lib/entrypoint.mjs`); cableado en `tools/check.mjs` `PASOS` (paso `descripcion-fuente-unica`, → pre-commit L2 y CI L3) | Casos "CA-3a" (árbol alineado pasa), "CA-3b" (divergente falla nombrando rol+superficie+forma), "CA-3b: superficie sin canónica no cubierta", "CA-3d: cableado en PASOS" | | |
| CA-4 (cobertura de superficies y roles) | `enumeraSuperficies()` descubre del FS: 4 agents Claude + 7 skills Claude + 6 skills Kimi + 6 `subagents:` Kimi = 23 superficies; un skill sin canónica se reporta no-cubierto | Casos "CA-4: enumera las cuatro superficies" y "CA-4: skill sin canónica reportado no cubierto" | | |
| CA-5 (núcleo agnóstico + build verbatim) | Canónica es `.json` (no la escanea `nucleo-agnostico`, que solo mira `.md` bajo `core/`); sin `${...}`. `tools/build-adapter.mjs` INTACTO; `dist/<h>/core/roles/es/_descripciones.json` byte-idéntico a `core/` | Manual: `node tools/checks/nucleo-agnostico.mjs` verde; `diff` core↔dist idéntico (claude+kimi); `git diff` no toca `build-adapter.mjs` | | |
| CA-6 (no regresión) | `npm test` 203/203 verde; `npm run check` verde end-to-end (incluye paso nuevo). `core/scripts/estado.mjs` INTACTO | Suite completa `npm test` (build claude+kimi + checks ambos adaptadores + valida) | | |
| CA-7 (RN-11 existe y el check la hace cumplir) | RN-11 ya en `docs/fundacion/reglas.md` (autora: sdd-arquitecto); su "Verificable" cita `tools/checks/descripcion-fuente-unica.mjs`, que es exactamente el check cableado en `tools/check.mjs` | Enforcement: el propio check `descripcion-fuente-unica` + su test | | |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-005/. Informe HTML opcional: _qa/SPEC-005/informe.html -->
No aplica: cambio de datos/tooling sin superficie UI. Evidencia = salida de checks y `npm test`.

## Salvedades / follow-ups
<!-- IDs F-SPEC-005-1, F-SPEC-005-2… con destino (spec futura o EPIC-MEJORA). -->
- **Decisión de diseño (resuelta, no bloqueante) — orquestador en la canónica.** CA-1
  enumera 6 roles (sin `sdd-orquestador`); pero CA-4 exige cubrir los **7 skills Claude**,
  y existe `adapters/claude-code/skills/sdd-orquestador/SKILL.md` con `description:` de
  disparo → esa superficie mapea a `larga`. Para no dejarla sin forma canónica, la canónica
  declara un **7.º rol** `sdd-orquestador` con **solo `larga`** (es el raíz, nunca subagente:
  no tiene skill Kimi ni entrada en el mapa `subagents:`, así que no necesita `corta`). No
  contradice CA-1 ("al menos … para los 6 roles"): los 6 siguen con `larga`+`corta`.
- **F-SPEC-005-1 (nota, no defecto): la `larga` única arrastra matices de un harness a otro.**
  La `larga` canónica de `sdd-documentalista` incluye "Tier barato (haiku)" (concepto de
  Claude); al ser fuente única compartida, el skill Kimi ahora también lo lleva. Es el
  trade-off aceptado por ADR-005 (una sola `larga` para todas las superficies de disparo).
  Mecánicamente inocuo (CA-5 verde: la canónica es `.json`, no la escanea `nucleo-agnostico`;
  `${...}`-free). Si en el futuro se quiere prosa por-harness, requeriría otra forma declarada
  (p. ej. `larga-kimi`) o "generar" — fuera de alcance de SPEC-005.
- **Entorno (ajeno a SPEC-005): eslint sin config.** El hook PostToolUse `calidad` autodetecta
  `eslint` para `.mjs` y falla ("ESLint couldn't find an eslint.config file") sobre CUALQUIER
  `.mjs`, incluidos ficheros ya commiteados. No lo introduce esta spec y no afecta al
  pre-commit L2 (que NO corre eslint). No lo he tocado (fuera de alcance / decisión repo-wide).

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->
Implementación COMPLETA y en verde. Para verificar:
- `npm test` → 203/203 (incluye 8 casos nuevos en `tools/tests/descripcion-fuente-unica.test.mjs`).
- `node tools/checks/descripcion-fuente-unica.mjs` → OK, 23 superficies.
- `npm run check` → verde end-to-end (el paso `descripcion-fuente-unica` está entre
  `manifiestos-kimi` y `valida`).
- RED→GREEN demostrado: antes de alinear, el check fallaba nombrando 4 skills Kimi divergentes
  (arquitecto, documentalista, producto, verificador); tras alinear a la `larga` canónica, verde.
- Superficies cubiertas (23): 4 agents Claude + 7 skills Claude + 6 skills Kimi + 6 `subagents:` Kimi.
- Fronteras respetadas: sin cambios en `core/scripts/estado.mjs`, `core/lib/`, `tools/build-adapter.mjs`,
  `adapters/*/hooks/`, ni en `core/roles/es/<rol>.md`.
- Pendiente del verificador: emitir GREEN/RED y rellenar columnas Verif./Estado de la matriz.
