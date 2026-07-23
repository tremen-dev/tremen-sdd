---
id: SPEC-011
tipo: ledger
epica: EPIC-003
---
# Ledger — SPEC-011 Enforcement en-harness de opencode: plugin que deniega

## Resumen
- Fase: en-progreso (implementación completa; pendiente de verificación)
- Rama: `ft/SPEC-011-enforcement-en-harness-de-opencode-plugin-que-deniega`
- API del plugin de opencode CONFIRMADA contra doc real (opencode.ai/docs/plugins
  y /permissions, consultado 2026-07-23), además del estudio SPEC-009:
  - **Forma del export**: named async factory `export const RequireSpecPlugin =
    async ({ project, client, $, directory, worktree }) => ({ hooks })`.
  - **Hook `tool.execute.before(input, output)`**: `input.tool` = nombre de la tool;
    `output.args.filePath` = ruta del fichero. `throw` aborta la tool (ejemplo `.env`).
  - **`permission.edit` admite sintaxis granular por patrón de ruta**
    (`"path/glob": "deny"`, ej. oficial `"packages/web/.../*.mdx": "allow"`) — esto
    es lo que habilita el deny estático de generados (`docs/tablero.md`, `dist/**`).

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 (deny real: el plugin aborta escritura fuera de carril) | `adapters/opencode/plugins/require-spec.mjs` (hook `tool.execute.before`: `throw`=deny para edit/write/patch en ruta vigilada sin carril; fail-open ante error interno; honra `SDD_SKIP_GATE` y `gates.requireSpec:false`) + `adapters/opencode/plugins/_comun.mjs` (shim: normaliza tool+filePath+cwd, `SddGateError`) | `adapters/opencode/tests/enforcement.test.mjs` (matriz: edit/write/patch→`assert.rejects`; read / ruta no vigilada / carril `aprobada` / `en-progreso`→`doesNotReject`; `SDD_SKIP_GATE=1`; `requireSpec:false`; fail-open sin `.sdd.json`) | | |
| CA-2 (una sola lógica: el plugin la importa) | `plugins/require-spec.mjs` importa `evaluarRequireSpec` de `../core/lib/require-spec.mjs`; NO duplica `RAMA_SPEC_RE`/`ESTADOS_CODEABLES` (viven solo en el módulo) | `tools/tests/require-spec-una-logica.test.mjs` (SPEC-011 CA-2: importa el módulo compartido / NO reimplementa el parseo de rama), generalizado al plugin | | |
| CA-3 (permission estático complementario) | `adapters/opencode/opencode.json` (`permission.edit` deny de `docs/tablero.md` y `dist/**`; read-only `edit:deny` heredado de SPEC-010) + `tools/checks/manifiestos.mjs` (`checkManifiestosOpencode` valida el bloque) | `adapters/opencode/tests/enforcement.test.mjs` (CA-3: deny de generados; read-only siguen deny); `tools/tests/opencode.test.mjs` (SPEC-011 CA-3: falta deny de `dist/**` / sin `permission.edit`→falla) | | |
| CA-4 (el build empaqueta el plugin) | `tools/build-adapter.mjs` **reutilizado sin tocar** (copia la superficie del adaptador → `dist/opencode/plugins/`) | `tools/tests/opencode.test.mjs` (SPEC-011 CA-4: el build copia `plugins/require-spec.mjs`; import a core resuelve interno; sin plugin-root; idempotente con el plugin en la firma) | | |
| CA-5 (referencias/manifiestos verdes con el plugin) | `tools/checks/manifiestos.mjs` (acepta el estado con enforcement: exige plugin empaquetado; **elimina** la aserción SPEC-010 "NO debe registrar el plugin"); `tools/checks/referencias.mjs` sin cambios (el import ESM interno ya se valida) | `tools/tests/opencode.test.mjs` (SPEC-011 CA-5: registrar plugin YA NO falla / falta `plugins/require-spec.mjs`→falla); `enforcement.test.mjs` (CA-5: import interno del plugin); `referencias-opencode` verde en el runner | | |
| CA-6 (L2 y L3 cubren opencode) | `tools/githooks/pre-commit.mjs` (L2, harness-agnóstico, **sin cambios**); `tools/check.mjs` `PASOS` (ya incluye `build-opencode`/`referencias-opencode`/`manifiestos-opencode` desde SPEC-010) | `tools/tests/opencode.test.mjs` (SPEC-011 CA-6: pre-commit sin rama condicionada a opencode y reutiliza `evaluarRequireSpec`; el runner incluye los 3 pasos de opencode) | | |
| CA-7 (aislamiento: el núcleo no gana dependencia hacia opencode) | Diff limitado a `adapters/opencode/` y `tools/`; `core/` intacto (0 referencias a opencode) | `tools/checks/nucleo-aislado.mjs` + `nucleo-agnostico.mjs` verdes en `node tools/check.mjs`; `npm run test:core` verde (59/59) con el núcleo autónomo | | |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-011/. Informe HTML opcional: _qa/SPEC-011/informe.html -->

## Salvedades / follow-ups
<!-- IDs F-SPEC-011-1, F-SPEC-011-2… con destino (spec futura o EPIC-MEJORA). -->

- **F-SPEC-011-1** ([H2], ya previsto en la spec §Fuera de alcance): la confirmación
  en runtime de que el `throw` en `tool.execute.before` **aborta de verdad** un
  `edit`/`write` en el CLI real de opencode (y que el payload trae tool+paths
  suficientes) se ejerce en la **spec #4** (piloto contra el CLI). Aquí el deny se
  verifica invocando el hook del plugin construido con payload simulado (sin CLI).
- **F-SPEC-011-2** ([H5], previsto en la spec): aplicar el overlay `permission`
  deny/ask por-proyecto sobre las `rutasVigiladas` concretas de `.sdd.json` (el
  manifiesto del adaptador es genérico y no las enumera) se **documenta** como paso
  de instalación; ejecutarlo y confirmar la fusión de overlay de proyecto es del piloto.
- **Matiz para el gate (no bloqueante, coherente con ADR-002/007):** la `permission`
  estática global de `opencode.json` deniega los **generados** (`docs/tablero.md`,
  `dist/**`) para todos los agentes; opencode fusiona global + por-agente con
  precedencia del agente. Cuán fuerte resiste ese deny frente a un `edit:allow`
  por-agente es parte de [H5]/piloto. No contradice ADR-002/007: la denegación
  dependiente del carril la aporta el **plugin** (dinámico), y la garantía dura vive
  en L2/L3. **No he editado ADR-002 ni ADR-007** (inmutables).

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->

- **Hecho (CA-1…CA-7 implementados con test):** plugin de enforcement L1 que deniega
  (`adapters/opencode/plugins/require-spec.mjs` + `_comun.mjs`), `opencode.json` con
  `permission` estático de generados, `manifiestos-opencode` actualizado (exige plugin
  empaquetado; ya no prohíbe registrarlo), invariante `require-spec-una-logica`
  generalizado al plugin. El build (`build-adapter.mjs`) se reutiliza SIN tocar.
- **Verificación local verde:** `npm test` → 281/281; `node tools/check.mjs` → OK
  (build ×3 + todos los checks + valida); `npm run test:core` → 59/59.
- **Pendiente:** verificación adversarial por sdd-verificador (rellena columnas
  Verif./Estado de la matriz y el veredicto). NO mover la spec a `en-revision`/`hecho`
  desde aquí. El piloto contra el CLI real (F-SPEC-011-1/[H2]) es la spec #4.
- **Dónde mirar primero:** `adapters/opencode/tests/enforcement.test.mjs` (matriz de
  deny) y `tools/tests/opencode.test.mjs` (build + manifiestos + runner).
