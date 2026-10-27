---
id: SPEC-019
tipo: ledger
epica: EPIC-006
---
# Ledger — SPEC-019 Mecanismo de idioma, catalogos y plantillas por idioma

## Resumen
- Fase: <!-- refleja el estado de la spec; la fuente de verdad es el frontmatter de la spec -->
- Rama: `ft/SPEC-019-mecanismo-de-idioma-catalogos-y-plantillas-por-idioma`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `core/lib/idioma.mjs` (`resolverIdioma`, `idiomasSoportados`, `leerIdiomaDeclarado`, `buscarRaizProyecto`, `idiomaDesde`) | `core/tests/idioma.test.mjs` — casos (a)-(f) en subproceso (stdout/stderr vacíos), fixture `zz` en copia del núcleo | Test leído (no vacío: subproceso, stdout/stderr == "", 6 casos). Verde en `npm test`. Flujo real: `dist/claude-code` copiado con `core/roles/zz`, proyecto `zz` → hook y `estado` salen en zz; proyecto `eu` → salida `es` sin aviso. | ✅ |
| CA-2 | `core/lib/mensajes.mjs` (`traductor`, `interpola`, `mensajesNucleo`); `core/mensajes/es/mensajes.json` | `core/tests/mensajes.test.mjs` — k1 interpolada, k2 cae a es, clave inexistente lanza nombrándola, sin `${` en catálogos de `core/`; `nucleo-agnostico` verde en `npm run check` | Test leído. Verde. `grep` de `${` en `core/mensajes/`: vacío. `nucleo-agnostico` OK en `npm run check`. | ✅ |
| CA-3 | Golden capturado en 0b80c25, ANTES del refactor (4e627f5). Emisores: `core/scripts/{estado,valida,scaffold,tablero,informe-qa}.mjs`, `core/lib/require-spec.mjs`, `adapters/claude-code/hooks/{require-spec,protege-verdad,calidad}.mjs`, `adapters/kimi-code/hooks/{require-spec,protege-verdad}.mjs`, `adapters/opencode/plugins/require-spec.mjs` (reenvía el `motivo`); catálogos `adapters/{claude-code,kimi-code}/mensajes/es/mensajes.json` | `tools/tests/golden-es.test.mjs` (40 casos de `tools/tests/golden/es.json`, recorridos por `tools/tests/golden/_casos.mjs`) en proyecto `es`, sin `idioma` y sin `.sdd.json`; `git diff e26a0dc HEAD --diff-filter=M` sobre tests previos solo cambia la lista de directorios de `kimi-superficie` (ninguna aserción de texto) | Golden y `_casos.mjs` sin cambios desde 0b80c25 (`git diff --stat` vacío). Golden ejecutado en un worktree de 0b80c25 (código anterior al refactor, adaptadores construidos): 6/6 pass → el golden es la salida real previa. En HEAD: verde en `es`, sin `idioma` y sin `.sdd.json`. Tests previos modificados: solo `fuente-unica.test` (solo añade) y `kimi-superficie` (lista de directorios); ninguna aserción de texto tocada. | ✅ |
| CA-4 | `core/scripts/tablero.mjs`, `core/scripts/scaffold.mjs`, `core/scripts/informe-qa.mjs` | `tools/tests/golden-es.test.mjs` — `tablero.render` (fixture), scaffold épica/épica bucket/spec+ledger/task/ADR byte a byte contra `golden/scaffold-es.json`, `<html lang="es">`. `renderBoard('docs','2026-01-01')` del repo real: idéntico antes/después (comparación manual, ver F-SPEC-019-4) | `renderBoard(docs,2026-01-01)` del repo real con el código de 0b80c25 y con HEAD: `cmp` idéntico (84 líneas). Flujo real en dos proyectos temporales `es` (código viejo vs nuevo): scaffold épica, épica bucket, spec+ledger, task, ADR + `estado` ilegal + `valida` + `tablero`: `diff -r` idéntico. `lang="es"` en golden. | ✅ |
| CA-5 | mismos emisores + `core/templates/<idioma>/artefactos/` en `scaffold.mjs`; `lang` = idioma resuelto | `tools/tests/idioma-emisores.test.mjs` — árbol temporal con `zz` en las 3 raíces del núcleo y en los mensajes de Claude Code y Kimi Code, adaptadores construidos con `buildAdapter`; (a)-(h) y "quitando la marca zz, cada salida es el golden es" (identificadores intactos) | Test leído: construye los 3 adaptadores del árbol zz y cubre (a)-(h); además exige que cada caso cambie (`notEqual`) y que sin la marca sea el golden. Verde. Comprobado a mano con `dist/claude-code`: `protege-verdad`, `estado` y `tablero` en zz; estados e IDs intactos. | ✅ |
| CA-6 | `core/scripts/valida.mjs` (`errorIdioma`, solo en el CLI); clave `valida.idioma-no-soportado` | `core/tests/valida-idioma.test.mjs` — (a)-(f), errores de idioma y de artefactos en la misma ejecución, `validateFile` mudo ante el idioma | Test leído. Verde. A mano con el CLI: `eu`→exit 1, `5`→exit 1, `null`→exit 1; nombra valor y soportados; `es`/sin fichero→`[valida] OK` exit 0. `validateFile` sin cambios de firma ni de idioma. | ✅ |
| CA-7 | `adapters/claude-code/commands/sdd-init.md`, `adapters/opencode/commands/sdd-init.md` | `tools/tests/sdd-init-idioma.test.mjs` — (a), (b), (c) por adaptador + `core/templates/sdd.json` con idioma soportado | Verificación sobre prosa, como fija la spec (nota 3). Diff de los dos `sdd-init` leído: lista derivada de `core/roles/`, rechazo y re-pregunta, paso 0 de migración antes de copiar plantillas. `core/templates/sdd.json` → `es`. Test verde. | ✅ |
| CA-8 | `git mv core/templates/* core/templates/es/` (4d94bb5, renombrado 100 %), `scaffold.mjs`, los dos `sdd-init` | `tools/tests/plantillas-idioma.test.mjs` — inventario exacto de `es/`, `sdd.json` en su sitio, ninguna cita de ruta antigua bajo `core/`, `adapters/`, `tools/`, `sdd-init` copia de `templates/<idioma>/`; `referencias` y `layout` verdes | `git diff -M e26a0dc HEAD --stat -- core/templates`: 13 renombrados, 0 líneas. `grep` de `templates` en `core/` y `adapters/` sin rutas antiguas. `referencias` y `layout` OK. Test verde. | ✅ |
| CA-9 | — | `npm test` (385 pass, 0 fail) y `npm run check` en verde; `package.json` sin cambios desde e26a0dc; `find core adapters -type d -name gl -o -name ca` vacío (ver F-SPEC-019-3) | `npm test`: 385 pass, 0 fail. `npm run check`: OK. `git diff e26a0dc HEAD -- package.json package-lock.json`: vacío. `find core adapters -type d -name gl -o -name ca`: vacío. | ✅ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->
**GREEN — 2026-10-27 (sdd-verificador).** CA-1 a CA-9 cerrados con evidencia ejecutada.
- Gates: `npm test` 385/385 y `npm run check` en verde (build de los 3 adaptadores, 10 checks y `valida`).
- El golden es fiel: pasa contra el código de 0b80c25, anterior al refactor, y nadie lo ha regenerado después.
- No hay regresión `es`: el tablero del repo real y los artefactos de scaffold salen idénticos con el código viejo y con el nuevo.
- Cambios en `tools/` que la spec no prevé:
  - **F-SPEC-019-1 (`fuente-unica`)**: se acepta. Está justificado, porque ADR-013 §2 fija la ruta `adapters/<h>/mensajes/<idioma>/mensajes.json` y su nombre relativo coincide con el del catálogo del núcleo. Está acotado a esa forma exacta con una regex anclada, y los tests prueban que `tools/mensajes/…` y `adapters/<h>/hooks/mensajes/…` siguen fallando. No debilita el check: `fuente-unica` compara nombres, no contenidos, y fuera de esa forma la cobertura es la de antes. Tampoco añade pasos a `tools/check.mjs`, que no cambia.
  - **F-SPEC-019-2 (`kimi-superficie`)**: se acepta. Añade `mensajes` a la lista cerrada, que es la consecuencia directa de ADR-013 §2. No toca ninguna aserción de texto.
- Salvedades sin bloqueo: F-SPEC-019-6 (regla de la raíz del proyecto), F-SPEC-019-7 (fallback de plantilla) y F-SPEC-019-10 (`.sdd.json` corrupto en `valida` → exit 0) quedan como diseño o follow-up. Ninguna contradice un CA. En el caso de F-SPEC-019-10, ADR-013 §2 trata el JSON corrupto como `es`.

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-019/. Informe HTML opcional: _qa/SPEC-019/informe.html -->
n-a: la spec no tiene UI. La evidencia es la salida de los CLI y los hooks, citada en la matriz.

## Salvedades / follow-ups
<!-- IDs F-SPEC-019-1, F-SPEC-019-2… con destino (spec futura o EPIC-MEJORA). -->
- **F-SPEC-019-1 — `fuente-unica` necesitó una exención (decisión para el gate).** El
  check trataba `adapters/<harness>/mensajes/<idioma>/mensajes.json` como copia de
  `core/mensajes/<idioma>/mensajes.json` porque comparten la ruta relativa, que es
  justo la que fija ADR-013 §2. Se añadió una exención cerrada a esa forma en
  `tools/checks/fuente-unica.mjs` (4962cf7), con tests de que cualquier otra réplica
  sigue fallando. La spec no prevé tocar `tools/checks/`. No es un paso nuevo de
  `tools/check.mjs`. Destino: confirmación en el gate o en SPEC-020.
- **F-SPEC-019-2 — `kimi-superficie` (lista cerrada) admite `mensajes/`.** Es el
  único cambio en un test que ya existía, y no toca ninguna aserción de texto.
- **F-SPEC-019-3 — CA-9 sin test permanente para "no hay gl/ ni ca/" ni para "sin
  dependencias".** Un test permanente bloquearía las specs de contenido gl/ca. La
  evidencia es el comando de la matriz. Destino: verificador.
- **F-SPEC-019-4 — CA-4 sobre el tablero del repo real comparado a mano.** Antes del
  refactor se guardó `renderBoard('docs','2026-01-01')`, y después salió idéntico
  (`cmp`). No es un test permanente: el CI clona en superficial y no tiene el commit
  base para reconstruir la versión anterior. La regresión permanente es la fixture
  `tablero.render` del golden.
- **F-SPEC-019-5 — Citas de ruta antigua fuera de alcance.** `README.md` §plantillas y
  la fila `tarea` de `docs/fundacion/dominio.md` siguen citando `core/templates/…`.
  Son de la spec #3 de EPIC-005, según la spec.
- **F-SPEC-019-6 — Regla de raíz del proyecto (decisión de diseño no explícita en la
  spec).** Los scripts que reciben una ruta (`estado`, `informe-qa`, `valida`,
  `tablero`, `scaffold`) toman como raíz el primer ancestro con `.sdd.json`, y sin
  ninguno resuelven a `es`. `require-spec` y los hooks usan su `cwd`.
- **F-SPEC-019-7 — Fallback de plantilla por fichero en `scaffold`.** Si
  `templates/<idioma>/artefactos/X` falta, se usa la de `es`, en simetría con el
  fallback por clave. En CI no puede ocurrir: lo impide la paridad de SPEC-020.
- **F-SPEC-019-8 — Normalización del golden.** Lo único que no es byte a byte: la
  ruta temporal se sustituye por `<PROY>`, los separadores pasan a `/` y CRLF a LF.
- **F-SPEC-019-9 — Lo que queda en código.** Los prefijos `[estado]`, `[scaffold]` e
  `[informe-qa]` en errores y la línea de éxito `[informe-qa] <ruta>` son nombres de
  script sin prosa. El `lang` del informe es el código del idioma resuelto. También
  quedan en código el texto de error de "clave inexistente" de `mensajes.mjs` (error
  de programación) y los mensajes de `tools/` (ADR-013 §2).
- **F-SPEC-019-10 — `.sdd.json` corrupto en `valida`.** Se trata como "sin fichero"
  (código 0). La spec no cubre ese caso. Destino: EPIC-MEJORA si se quiere señalar.
- **F-SPEC-019-11 — Hueco de bisect.** Entre 4e627f5 y 577146d, `npm run check`
  fallaba en `fuente-unica`. Lo arregló 4962cf7. `npm test` no se vio afectado salvo
  el test de `fuente-unica` sobre el árbol real.

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->
- **Hecho:** CA-1 a CA-9 implementados con tests. La spec está en `en-revision`.
  Rama `ft/SPEC-019-mecanismo-de-idioma-catalogos-y-plantillas-por-idioma`, sin push.
- **Orden de commits** (lo exige CA-3): 0b80c25 golden → 6709f14 lib → 4d94bb5
  plantillas → 4e627f5 refactor de mensajes → e915805 valida → 577146d fixture zz →
  4962cf7 fuente-unica.
- **Para verificar:**
  - `npm test` y `npm run check`;
  - `git diff -M e26a0dc HEAD --stat -- core/templates` (renombrados al 100 %);
  - `git diff 0b80c25 HEAD -- tools/tests/golden/*.json` tiene que salir vacío.
- **Para SPEC-020:**
  - formato del catálogo: `<dir>/<idioma>/mensajes.json`, objeto plano
    `clave → plantilla` con `{var}`;
  - raíces: `core/roles`, `core/templates`, `core/mensajes` y
    `adapters/<h>/mensajes` (hoy, Claude Code y Kimi Code);
  - la fixture `zz` de `tools/tests/idioma-emisores.test.mjs` se puede reutilizar.
- **Pendiente de decisión:** F-SPEC-019-1.
