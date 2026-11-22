---
id: SPEC-025
tipo: ledger
epica: EPIC-007
---
# Ledger — SPEC-025 Mecanismo de idioma, catalogos y plantillas por idioma

## Resumen
- Fase: hecho <!-- refleja el estado de la spec; la fuente de verdad es el frontmatter de la spec -->
- **Código base de CA-3** (implementador, 2026-10-27): `f522ca6bf9ad07b006969fd43bbf5169476c3992`, que es
  `origin/main` en el punto de integración (merge `8e295d0`). El golden se recapturó ejecutando un
  worktree de ese commit con `tools/tests/golden/captura.mjs`.
- Rama efectiva: `ft/SPEC-025-mecanismo-de-idioma-catalogos-y-plantillas-por-idioma` (ya renombrada al
  retomarla, como pide RN-01).
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
| CA-1 | `core/lib/idioma.mjs` (`resolverDesde`/`idiomaDesde` sobre `buscarRaizSdd`; `buscarRaizProyecto` retirado); `core/lib/require-spec.mjs` y `adapters/{claude-code,kimi-code,antigravity}/hooks/_comun.mjs` resuelven desde su cwd; los CLI pasan la raíz de `exigirProyectoSdd` a `resolverIdioma` | `core/tests/idioma.test.mjs`: "CA-1(a)-(h): idiomaDesde resuelve… con la raíz de buscarRaizSdd" (compara la raíz con `buscarRaizSdd`, sin stdout/stderr), "no hay una segunda búsqueda de raíz", y los de (a)-(f) / idiomas soportados | Test leído y en verde. Usa un subproceso y compara la raíz con `buscarRaizSdd` en (a)-(h). En (h), con un `.git` intermedio, da `es` y raíz null. `idioma.mjs` solo llama a `buscarRaizSdd`: la única búsqueda de raíz del núcleo sigue en `entrypoint.mjs` (grep). `buscarRaizProyecto` no existe. | ✅ |
| CA-2 | `core/lib/mensajes.mjs` (`traductor`, `interpola`; `IDIOMA_ORIGEN` vive aquí, ver F-SPEC-025-12), `core/mensajes/es/mensajes.json` | `core/tests/mensajes.test.mjs` (6 casos CA-2, incluido "ningún catálogo bajo core/ contiene ${"); check `nucleo-agnostico` en `npm run check` | Tests en verde. `traductor` cae a `es` clave a clave y, si la clave no existe, lanza un error que la nombra. `nucleo-agnostico` OK en `npm run check`. | ✅ |
| CA-3 | Catálogos `core/mensajes/es/`, `adapters/{claude-code,kimi-code,antigravity}/mensajes/es/`; emisores `core/scripts/*.mjs`, `core/lib/{entrypoint,require-spec}.mjs` (la barrera entra en el catálogo, siempre `es`), hooks de los tres adaptadores con hooks y plugin de opencode | `tools/tests/golden-es.test.mjs` (CA-3 `es` y `sin-idioma`, barrera de los cinco CLI); golden `tools/tests/golden/{es,scaffold-es,barrera-es}.json` capturado desde `f522ca6`; fidelidad: `SDD_GOLDEN_ARBOL=<worktree f522ca6 con dist/> node --test tools/tests/golden-es.test.mjs` → 6/6. Diff de tests del código base: solo cambia una aserción de ruta (F-SPEC-025-13) | Fidelidad comprobada por el verificador: worktree de `f522ca6` (`git -c core.longpaths=true worktree add` + `npm run build:all`) y `SDD_GOLDEN_ARBOL=<worktree> node --test tools/tests/golden-es.test.mjs` → 6/6; en la rama también 6/6. El golden cubre todos los emisores de la lista: los 5 CLI con su barrera, la lib require-spec, los hooks de Claude Code, Kimi Code y antigravity y el plugin de opencode. Fuera del catálogo solo quedan los prefijos `[script]` de los `catch` (F-SPEC-025-9). Diff de los tests preexistentes: solo `superficie.test.mjs` (una ruta) y `kimi-superficie.test.mjs` (la lista de directorios); ninguno toca el texto de un mensaje. Los tests de SPEC-024 (`entrypoint`, `cli-sdd-guard`, `prosa-gates`) son idénticos a `f522ca6`. `protege-verdad` de los tres adaptadores sobre este repo da la misma salida en la base y en la rama. | ✅ |
| CA-4 | `core/scripts/{tablero,scaffold,informe-qa}.mjs` | `tools/tests/golden-es.test.mjs`: "CA-4: scaffold crea épica, spec+ledger, task y ADR…" (×2) y "CA-4: informe-qa sigue emitiendo <html lang="es">"; `renderBoard('docs', '2026-01-01')` de este repo con el código de `f522ca6` y con el de la rama: idéntico (a mano, F-SPEC-025-4) | Ejecutado por el verificador: `renderBoard('D:/src/tremen-sdd/docs', '2026-01-01')` da lo mismo (5743 bytes) con el código de `f522ca6` y con el de la rama, y `docs/tablero.md` está al día. Scaffold e `informe-qa` los cubre el golden, que pasa contra la base. | ✅ |
| CA-5 | `adapters/antigravity/mensajes/es/mensajes.json`, `adapters/antigravity/hooks/{_comun,protege-verdad,calidad}.mjs` y el resto de emisores de CA-3 | `tools/tests/idioma-emisores.test.mjs`: CA-5(a)-(i) y "quitando la marca zz, cada salida es el golden es" (fixture `zz` en las tres raíces del núcleo y en los catálogos de adaptador autodescubiertos; cuatro adaptadores construidos) | Test leído y en verde. El árbol temporal tiene `zz` en `core/{roles,templates,mensajes}` y en los catálogos de adaptador autodescubiertos, con los cuatro adaptadores construidos por `buildAdapter`. Pasan (a)-(i) y la comprobación de que, quitando la marca, cada salida es el golden `es`. Antigravity está cubierto en (c), (d) y (e). | ✅ |
| CA-6 | `core/scripts/valida.mjs` (`errorIdioma(raiz)`; orden barrera → `.sdd.json` → artefactos), `core/lib/idioma.mjs` (`leerIdiomaDeclarado` distingue fichero ilegible), clave `valida.sdd-json-ilegible` | `core/tests/valida-idioma.test.mjs`: CA-6(a)-(g), "con errores de artefactos… se informan todos" para (a) y (g), y "validateFile… no habla del idioma" | Flujo real ejecutado por el verificador en proyectos temporales, rama frente a base. Con `eu`, `5`, `null` y JSON corrupto sale con 1 y el error esperado (la base sale con 0). Con `es`, sin campo y `[]` da `[valida] OK` y sale con 0, como la base. Sin `.sdd.json` da la misma barrera que la base. Tests (a)-(g) en verde. | ✅ |
| CA-7 | `adapters/{claude-code,opencode,antigravity}/commands/sdd-init.md` | `tools/tests/sdd-init-idioma.test.mjs`: CA-7(a)-(d) para los tres `sdd-init` y "el idioma de core/templates/sdd.json es soportado"; `tools/tests/prosa-gates.test.mjs` (SPEC-024 CA-3) sin cambios | Verificado sobre la prosa, como prevé la nota 3 de la spec: tests en verde y diff de los tres `sdd-init` leído. Se conserva la guarda de SPEC-024 (estampar `.sdd.json` antes de llamar a los scripts). `prosa-gates` no cambia y está en verde. | ✅ |
| CA-8 | `core/templates/es/` (`AGENTS.md` movido, renombrado al 100 %), `core/templates/sdd.json` en su sitio, `adapters/antigravity/commands/sdd-init.md` copia desde `../core/templates/<idioma>/` | `tools/tests/plantillas-idioma.test.mjs` (4 casos CA-8, con `AGENTS.md` y antigravity); `adapters/antigravity/tests/superficie.test.mjs` "CA-6: …core/templates/es/AGENTS.md"; checks `referencias` y `layout` | `git diff -M --summary f522ca6 HEAD` muestra 14 `rename core/templates/{ => es}/… (100%)`, `AGENTS.md` incluido. En `core/templates/` solo quedan `es/` y `sdd.json`. `dist/antigravity/core/templates/es/AGENTS.md` está presente. `referencias` y `layout` OK. | ✅ |
| CA-9 | Las 44 superficies `adapters/*/skills/sdd-*/SKILL.md` y `adapters/*/agents/**/*.md` de los cuatro adaptadores: "si no existe `core/roles/<idioma>/`, usa `es`" | `tools/tests/bootstraps-idioma.test.mjs` (46 casos: descubrimiento en los cuatro adaptadores, uno por superficie y `checkPrecondicionSdd` en verde); `prosa-gates` y `descripcion-fuente-unica` en `npm run check` | En las 44 superficies el diff cambia 1 línea por 2 y no toca ninguna línea `description:` (grep del diff). `checkPrecondicionSdd` devuelve 44 bootstraps de adaptador y el test los cubre todos. `prosa-gates` y `descripcion-fuente-unica` OK. | ✅ |
| CA-10 | — | `npm test` 475/475 y `npm run check` en verde; `git diff f522ca6 HEAD -- package.json` vacío; `find core adapters -type d \( -name gl -o -name ca \)` vacío (F-SPEC-025-3) | Ejecutado por el verificador. `npm test` da 475/475; en la base `f522ca6` da 373/373, y no se ha eliminado ningún test. `npm run check` sale con 0. `git diff f522ca6 HEAD -- package.json` y el `find` de `gl/` y `ca/` salen vacíos. | ✅ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->
**GREEN** — 2026-10-27, sdd-verificador, sobre `1206546` (rama `ft/SPEC-025-mecanismo-de-idioma-catalogos-y-plantillas-por-idioma`), código base `f522ca6`.

- Gates: `npm test` 475/475 y `npm run check` en verde (10 checks + valida).
- Golden fiel al código base: 6/6 contra un worktree de `f522ca6`.
- El español no cambia:
  - el golden pasa byte a byte;
  - el tablero real sale idéntico;
  - `valida`, con `es` o sin campo, da lo mismo que la base;
  - la barrera de SPEC-024 emite el mismo texto en los cinco CLI.
- SPEC-024 sigue entera: sus tests no cambian y `exigirProyectoSdd` sigue en los cinco CLI.
- Cambios que la spec no prevé, valorados:
  - **Exención de `fuente-unica`** (F-SPEC-025-1). Aceptada. Está aprobada por el humano, la regex se limita a `adapters/<h>/mensajes/<idioma>/mensajes.json` y tiene un test positivo y otro negativo.
  - **Aserción de ruta en `adapters/antigravity/tests/superficie.test.mjs`** (F-SPEC-025-13). Aceptada. Sigue a la plantilla que mueve CA-8 y no es texto de un mensaje. Vale lo mismo para `kimi-superficie.test.mjs`, que añade `mensajes` a su lista cerrada (F-SPEC-025-2).
  - **Prosa de los `sdd-init`**. Aceptada. Es la que piden CA-7 y CA-8. En antigravity, "crea `AGENTS.md`" pasa a "copia `AGENTS.md` desde la plantilla `es`", que ya existía en la base.
- F-SPEC-025-12 (`IDIOMA_ORIGEN` en `mensajes.mjs`): revisado y aceptado. No hay ciclo de módulos, porque `mensajes.mjs` no importa nada del núcleo.
- Observación sin efecto en los CA: el Resumen de este ledger conserva una línea antigua, "la rama git **conserva su nombre** ft/SPEC-019-…", que contradice "Rama efectiva". La rama real es `ft/SPEC-025-…`.

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-025/. Informe HTML opcional: _qa/SPEC-025/informe.html -->
n-a: la spec no tiene UI. La evidencia es de CLI y de hooks (ver la columna Verif.).

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

Notas del implementador (2026-10-27) sobre los heredados:
- **F-SPEC-025-1**: se mantiene, aprobada por el humano. La exención es por forma (`adapters/<h>/mensajes/<idioma>/mensajes.json`) y cubre antigravity; `tools/tests/fuente-unica.test.mjs` lo ejerce.
- **F-SPEC-025-2**: `adapters/antigravity/tests/superficie.test.mjs` no tiene una lista cerrada de directorios; `mensajes/` no exigió cambios allí.
- **F-SPEC-025-4**: hecho a mano en esta ronda contra `f522ca6`: idéntico.
- **F-SPEC-025-6**: hecho (CA-1).
- **F-SPEC-025-9**: el mensaje de la barrera está en el catálogo (`entrypoint.sin-sdd-json`) y se emite siempre en `es`; los prefijos `[script]` de los `catch` siguen en código.
- **F-SPEC-025-10**: hecho (CA-6(g)).

Nuevos:

| ID | Descripción | Destino |
|---|---|---|
| F-SPEC-025-12 | `IDIOMA_ORIGEN` se define en `core/lib/mensajes.mjs` y `idioma.mjs` lo reexporta: `entrypoint.mjs` lee el catálogo para la barrera e `idioma.mjs` importa `buscarRaizSdd` de `entrypoint.mjs`; así no hay ciclo de módulos con evaluación temprana. | Diseño; a revisar por el verificador. |
| F-SPEC-025-13 | `adapters/antigravity/tests/superficie.test.mjs` (test del código base) cambia una aserción de **ruta**, `core/templates/AGENTS.md` → `core/templates/es/AGENTS.md`, porque CA-8 mueve la plantilla. No es una aserción sobre el texto de un mensaje (CA-3). | Informativo. |
| F-SPEC-025-14 | El `sdd-init` de antigravity no ofrece roles de dominio (ya era así en el código base), así que la aserción de `rol-dominio.md` de CA-8 no aplica a antigravity. | Informativo; posible EPIC-MEJORA si se quiere paridad. |
| F-SPEC-025-15 | Reproducir la captura del golden en Windows: el worktree del código base necesita `git -c core.longpaths=true worktree add`; después `npm run build:all` en el worktree y `node tools/tests/golden/captura.mjs <worktree>`. | Informativo para el verificador. |
| F-SPEC-025-16 | La frase de CA-9 en los bootstraps nombra `core/roles/<idioma>/` en genérico, no con el prefijo propio de cada harness (`${CLAUDE_PLUGIN_ROOT}/core/…`, `../core/…`, `../../core/…`) que usan en el punto siguiente. | Informativo. |

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->
- **Estado** (implementador, 2026-10-27): implementación terminada, spec en `en-revision`. Falta la
  verificación (columnas Verif./Estado y veredicto).
- **Integración**: `origin/main` (`f522ca6`) entró con un merge (`8e295d0`), no con rebase: la rama
  está publicada. Conflictos en los cinco CLI del núcleo, resueltos con la barrera de SPEC-024 íntegra;
  `docs/tablero.md` regenerado con `core/scripts/tablero.mjs`.
- **Commits de esta ronda**: `8e295d0` (merge), `a2ffd5b` (golden), `b25da29` (en-progreso),
  `b54413f` (resolución + valida), `2b4b07f` (antigravity), `6bd3602` (plantillas y `sdd-init`),
  `1d8e8c3` (bootstraps) y el commit de cierre con este ledger.
- **Para verificar CA-3 contra el código base**: worktree de `f522ca6` (ver F-SPEC-025-15), `npm run build:all`
  dentro y `SDD_GOLDEN_ARBOL=<worktree> node --test tools/tests/golden-es.test.mjs` desde esta rama.
- **Fuera de alcance, sin tocar**: SPEC-026, directorios `gl/`/`ca/`, documentos de verdad y `README.md`,
  y el fail-open de los hooks ante un `.sdd.json` ilegible (EPIC-FIX).
