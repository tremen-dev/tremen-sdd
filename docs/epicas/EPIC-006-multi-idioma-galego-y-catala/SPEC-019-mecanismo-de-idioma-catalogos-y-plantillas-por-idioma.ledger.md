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
| CA-1 | `core/lib/idioma.mjs` (`resolverIdioma`, `idiomasSoportados`, `leerIdiomaDeclarado`, `buscarRaizProyecto`, `idiomaDesde`) | `core/tests/idioma.test.mjs` — casos (a)-(f) en subproceso (stdout/stderr vacíos), fixture `zz` en copia del núcleo | | ❌ |
| CA-2 | `core/lib/mensajes.mjs` (`traductor`, `interpola`, `mensajesNucleo`); `core/mensajes/es/mensajes.json` | `core/tests/mensajes.test.mjs` — k1 interpolada, k2 cae a es, clave inexistente lanza nombrándola, sin `${` en catálogos de `core/`; `nucleo-agnostico` verde en `npm run check` | | ❌ |
| CA-3 | Golden capturado en 0b80c25, ANTES del refactor (4e627f5). Emisores: `core/scripts/{estado,valida,scaffold,tablero,informe-qa}.mjs`, `core/lib/require-spec.mjs`, `adapters/claude-code/hooks/{require-spec,protege-verdad,calidad}.mjs`, `adapters/kimi-code/hooks/{require-spec,protege-verdad}.mjs`, `adapters/opencode/plugins/require-spec.mjs` (reenvía el `motivo`); catálogos `adapters/{claude-code,kimi-code}/mensajes/es/mensajes.json` | `tools/tests/golden-es.test.mjs` (40 casos de `tools/tests/golden/es.json`, recorridos por `tools/tests/golden/_casos.mjs`) en proyecto `es`, sin `idioma` y sin `.sdd.json`; `git diff e26a0dc HEAD --diff-filter=M` sobre tests previos solo cambia la lista de directorios de `kimi-superficie` (ninguna aserción de texto) | | ❌ |
| CA-4 | `core/scripts/tablero.mjs`, `core/scripts/scaffold.mjs`, `core/scripts/informe-qa.mjs` | `tools/tests/golden-es.test.mjs` — `tablero.render` (fixture), scaffold épica/épica bucket/spec+ledger/task/ADR byte a byte contra `golden/scaffold-es.json`, `<html lang="es">`. `renderBoard('docs','2026-01-01')` del repo real: idéntico antes/después (comparación manual, ver F-SPEC-019-4) | | ❌ |
| CA-5 | mismos emisores + `core/templates/<idioma>/artefactos/` en `scaffold.mjs`; `lang` = idioma resuelto | `tools/tests/idioma-emisores.test.mjs` — árbol temporal con `zz` en las 3 raíces del núcleo y en los mensajes de Claude Code y Kimi Code, adaptadores construidos con `buildAdapter`; (a)-(h) y "quitando la marca zz, cada salida es el golden es" (identificadores intactos) | | ❌ |
| CA-6 | `core/scripts/valida.mjs` (`errorIdioma`, solo en el CLI); clave `valida.idioma-no-soportado` | `core/tests/valida-idioma.test.mjs` — (a)-(f), errores de idioma y de artefactos en la misma ejecución, `validateFile` mudo ante el idioma | | ❌ |
| CA-7 | `adapters/claude-code/commands/sdd-init.md`, `adapters/opencode/commands/sdd-init.md` | `tools/tests/sdd-init-idioma.test.mjs` — (a), (b), (c) por adaptador + `core/templates/sdd.json` con idioma soportado | | ❌ |
| CA-8 | `git mv core/templates/* core/templates/es/` (4d94bb5, renombrado 100 %), `scaffold.mjs`, los dos `sdd-init` | `tools/tests/plantillas-idioma.test.mjs` — inventario exacto de `es/`, `sdd.json` en su sitio, ninguna cita de ruta antigua bajo `core/`, `adapters/`, `tools/`, `sdd-init` copia de `templates/<idioma>/`; `referencias` y `layout` verdes | | ❌ |
| CA-9 | — | `npm test` (385 pass, 0 fail) y `npm run check` en verde; `package.json` sin cambios desde e26a0dc; `find core adapters -type d -name gl -o -name ca` vacío (ver F-SPEC-019-3) | | ❌ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-019/. Informe HTML opcional: _qa/SPEC-019/informe.html -->

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
