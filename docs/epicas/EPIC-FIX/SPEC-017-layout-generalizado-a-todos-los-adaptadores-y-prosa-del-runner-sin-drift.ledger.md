---
id: SPEC-017
tipo: ledger
epica: EPIC-FIX
---
# Ledger — SPEC-017 layout generalizado a todos los adaptadores y prosa del runner sin drift

## Resumen
- Fase: **hecho** (GREEN del verificador, 2026-07-27; implementación cerrada el mismo día)
- Rama: `ft/SPEC-017-layout-generalizado` (creada por el orquestador; no coincide con el slug largo)

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `tools/checks/layout.mjs`: `descubreAdaptadores()` itera `adapters/` (patrón `roles-fuente-unica`) + const `MINIMO_COMUN = ['agents/','skills/','tests/']` exigido a cada adaptador descubierto | `tools/tests/layout.test.mjs`: `SPEC-017 CA-1a/CA-2: kimi-code sin tests/…`, `CA-1b: opencode sin agents/…`, `CA-1c: un adaptador desconocido sin skills/ falla sin que su nombre esté en el check` (este último assertea `!/harness-nuevo/.test(FUENTE_CHECK)`) | **Rojo ejercido por el verificador sobre copias del árbol REAL** (no fixtures del implementador): quitados `agents/`, `skills/` y `tests/` a **cada uno** de los tres adaptadores → 9/9 escenarios exit 1. Los mismos 9 sobre `main`: 6 verde falso (kimi-code y opencode). Autodescubrimiento confirmado: `adapters/harness-falso/` (nombre inexistente en el fuente) sin `skills/` → exit 1; `grep` del fuente: cero `if (harness === …)`, los únicos nombres de harness están en `EXTRAS_POR_HARNESS` (líneas 28-30) y en comentarios | ✅ |
| CA-2 | `layout.mjs`: `errores.push(\`falta adapters/${h}/${rel}\`)` — ruta relativa al repo, adaptador nombrado | `tools/tests/layout.test.mjs`: `SPEC-017 CA-1a/CA-2…` asserta `/falta adapters\/kimi-code\/tests\//` | Verificado en los 16 escenarios rojos que ejercí: **todos** nombran adaptador + ruta relativa (`- falta adapters/kimi-code/tests/`, `- falta adapters/opencode/plugins/`, `- falta adapters/harness-falso/skills/`). Cero mensajes genéricos | ✅ |
| CA-3 | `layout.mjs`: tabla `EXTRAS_POR_HARNESS`; `exigencias(h)` usa `EXTRAS_POR_HARNESS[h] ?? []`, así que un adaptador no declarado se juzga solo por el mínimo común | `tools/tests/layout.test.mjs`: `SPEC-017 CA-3a: un adaptador nuevo con solo el mínimo común pasa`, `CA-3b: a kimi-code no se le exige commands/`, `CA-3c: a opencode no se le exige hooks/` | Ejercido sobre el árbol real: `adapters/harness-falso/{agents,skills,tests}` y **nada más** → exit 0, y el OK lo nombra (`claude-code, harness-falso, kimi-code, opencode`), luego se le aplicó la regla y pasó, no se le ignoró. El árbol real ya prueba (b) y (c): kimi-code no tiene `commands/` y opencode no tiene `hooks/`, y `node tools/checks/layout.mjs` sale exit 0 | ✅ |
| CA-4 | `layout.mjs`: `EXTRAS_POR_HARNESS` as-built (claude-code: `.claude-plugin/plugin.json`, `commands/`, `hooks/`; kimi-code: `hooks/`; opencode: `opencode.json`, `commands/`, `plugins/`) + bucle "harness declarado que no existe es fallo" | `tools/tests/layout.test.mjs`: `CA-4a` (claude-code sin `commands/`), `CA-4a-bis` (sin `plugin.json`), `CA-4b` (opencode sin `plugins/`), `CA-4b-bis` (sin `opencode.json`), `CA-4c` (kimi-code sin `hooks/`), `CA-4d` (borrar `adapters/claude-code/` entero → rojo) | **Rompí yo los 7 extras declarados** sobre copias del árbol real: claude-code sin `commands/`, sin `hooks/`, sin `plugin.json`; kimi-code sin `hooks/`; opencode sin `opencode.json`, sin `commands/`, sin `plugins/` → **7/7 exit 1** nombrando la ruta. Adaptador declarado ausente: borrado `adapters/kimi-code/` y `adapters/opencode/` enteros → exit 1 (`falta el adaptador declarado adapters/…/`); borrado `adapters/` entero → exit 1. Y al revés: **declaré un `harness-fantasma` inexistente en la tabla** sobre una copia → exit 1 `falta el adaptador declarado adapters/harness-fantasma/` | ✅ |
| CA-5 | `layout.mjs`: const `SUPERFICIE_PROHIBIDA_RAIZ = ['agents','skills','commands','hooks','plugins']` — literal, ampliada con `plugins`; **no** hay `readdir` en esa rama | `tools/tests/layout.test.mjs`: `CA-5a: un plugins/ en la raíz hace fallar el check`, `CA-5b: un adapters/<h>/docs/ no convierte el docs/ de la raíz en infracción` | Fuente auditado: el único `readdirSync` del fichero está en `descubreAdaptadores` (línea 44); la rama de raíz (líneas 79-81) itera la constante. Ejercido: `plugins/`, `agents/` y `hooks/` en la raíz → exit 1 cada uno; y **tres** contrapruebas de no-derivación —`adapters/kimi-code/docs/`, `adapters/opencode/tools/`, `adapters/claude-code/core/`— dejan el check en exit 0, o sea el `docs/`, `tools/` y `core/` legítimos de la raíz siguen siendo legales | ✅ |
| CA-6 | `layout.mjs`: `checkLayout()` devuelve `{ok, errores, adaptadores}` y el entrypoint imprime `[layout] OK: … (claude-code, kimi-code, opencode)` (ADR-011 §6) | `tools/tests/layout.test.mjs`: `CA-1: el árbol real del repo pasa el check` (existente) + `SPEC-017 CA-6: el resultado expone los adaptadores recorridos y contiene los tres`. Comando: `node tools/checks/layout.mjs` → exit 0 | Ejecutado: exit 0 con `[layout] OK: frontera núcleo/adaptador materializada (claude-code, kimi-code, opencode)`. Que la lista es real y no cosmética lo prueba el escenario del adaptador falso: aparece `harness-falso` en ella (ADR-011 §6 satisfecho de verdad) | ✅ |
| CA-7 | **No se activó**: tras generalizar, `node tools/checks/layout.mjs` salió exit 0 a la primera. Cero comprobaciones retiradas, cero extras degradados a opcional; la única tabla escrita es la superficie as-built verificada con `ls adapters/*` | Cubierto por CA-6 (árbol real verde) y por CA-4 (los extras declarados se exigen, no se ablandan) | **Buscada la tercera vía (ablandamiento) y NO la hay.** Diff `main`→rama de `layout.mjs` comparado exigencia a exigencia: a claude-code se le pedían `.claude-plugin/plugin.json`, `agents/`, `skills/`, `commands/`, `hooks/`, `tests/` y se le siguen pidiendo **las seis**; la lista de raíz pasa de `[agents, skills, commands, hooks]` a **superconjunto** `+plugins`; siguen intactos `DIRS_METODO` en ambos sentidos, el `plugin.json` prohibido en raíz, `tools/build-adapter.mjs` y `marketplace.json`. Contraprueba ejecutable: los 8 escenarios que `main` ya detectaba (6 de claude-code + `agents/` y `hooks/` en raíz) siguen todos en exit 1 en la rama. Cero comprobaciones retiradas, cero extras degradados a opcional | ✅ |
| CA-8 | `tools/check.mjs`: función pura exportada `resumen(pasos)` que deriva adaptadores (arg de `build-adapter.mjs`), checks distintos (`/checks/`) y `valida` de los propios pasos; `ejecuta()` imprime `` `[check] OK: ${resumen(pasos)}.` `` | `tools/tests/check.test.mjs`: `SPEC-017 CA-8: resumen(PASOS) nombra los tres adaptadores…`, `SPEC-017 CA-8: resumen() se deriva de los pasos recibidos, no de una cadena fija` (pasos sintéticos → nombra `harness-x`/`foo` y **no** los reales) | Ejercido a mano con pasos míos: `resumen(PASOS)` → `build (claude-code, kimi-code, opencode) + 9 checks (…) + valida en verde`; `resumen([build zeta-harness, checks/uno, checks/dos])` → `build (zeta-harness) + 2 checks (dos, uno) en verde` — **cero** filtración de los reales; `resumen([])` → `todos los pasos en verde`. `PASOS` sin tocar (diff), luego el texto no puede contradecirlo. `ejecuta()` lo imprime: salida real de `node tools/check.mjs` | ✅ |
| CA-9 | `tools/check.mjs`: cabecera reescrita — sin `SEIS`, sin `ambos adaptadores`, sin conteo; remite a `PASOS` y a `resumen()` | `tools/tests/check.test.mjs`: `SPEC-017 CA-9: la prosa de check.mjs no contradice a PASOS`, `…la cabecera no repite el conteo de checks`, `…PASOS referencia exactamente 9 scripts distintos de tools/checks/` | `grep -ni "seis\|ambos adaptadores\|claude+kimi" tools/check.mjs` → **0 resultados**. Cabecera leída línea a línea (1-10): no declara conteo de checks ni lista de adaptadores; remite explícitamente a `PASOS` y a `resumen()`. Los 9 scripts distintos de `tools/checks/` en `PASOS` coinciden con la salida real del runner | ✅ |
| CA-10 | `tools/check.mjs`: `PASOS` **sin tocar** (17 pasos, `layout` una sola vez); el cambio es solo prosa + `resumen()` | `tools/tests/check.test.mjs`: `SPEC-017 CA-10: el runner conserva sus 17 pasos, con layout como un solo paso` (`deepEqual` de los 17 nombres) + los 9 tests preexistentes del fichero, verdes sin modificarse. Comando: `node tools/check.mjs` → exit 0 | Comprobado con `git diff main -- tools/tests/check.test.mjs`: **0 líneas borradas** (`grep -c '^-[^-]'` → 0), luego los 9 tests preexistentes están intactos; lo único añadido antes de ellos es un `import * as runner`. En vivo: `PASOS.length` = **17**, pasos con `tools/checks/layout.mjs` = **1**, y `node tools/check.mjs` → **exit 0** | ✅ |
| CA-11 | `docs/arquitectura.md` §"Tests y checks": `layout` pasa a la lista de generalizados, con el mecanismo (autodescubrimiento vs enumeración), la tabla de extras y la lista cerrada de raíz, citando **ADR-011** | Comando: ``grep -n 'solo verifica la superficie de `adapters/claude-code/`' docs/arquitectura.md`` → **0 resultados** (exit 1); `grep -c 'ADR-011' docs/arquitectura.md` → 2 | Reproducidos ambos greps: la frase de SPEC-015 tiene **0 resultados** y `ADR-011` aparece **2** veces. Leído el párrafo nuevo: mete `layout` en la lista de generalizados, explica el mecanismo (autodescubrimiento vs enumeración, con el criterio de ADR-011), transcribe la tabla de extras as-built y deja constancia de que la lista de raíz es cerrada (ADR-011 §4). Sin drift residual | ✅ |
| CA-12 | n-a para este rol: ADR-011 lo entregó sdd-arquitecto y está `aprobada` (2026-07-27). El implementador solo lo consume | `docs/adr/ADR-011-generalizacion-de-los-checks-de-invariantes-autodescubrimiento-vs-enumeracion.md` existe; `node core/scripts/valida.mjs --dir docs` → OK | ADR-011 leído entero y **contrastado con la implementación**: §1 (autodescubrimiento), §3 (mínimo común + tabla de extras; no declarado → solo mínimo), §4 (lista de raíz cerrada), §5 (no ablandar) y §6 (el check dice a quién miró) se cumplen los cinco. El ADR está `aprobada` por el humano y ya venía en `main` (no aparece en el diff de la rama), coherente con que el implementador no lo escribió | ✅ |
| CA-13 | Sin regresión: no se retiró ninguna comprobación existente | `npm test` → **310/310, 0 fallos** (baseline 289 + 21 nuevos); `node tools/check.mjs` → exit 0 con sus 9 checks; `node core/scripts/valida.mjs --dir docs` → OK | Los tres comandos ejecutados por mí: `npm test` → **310 tests / 310 pass / 0 fail**; `node tools/check.mjs` → **exit 0**, 17 pasos, 9 checks; `node core/scripts/valida.mjs --dir docs` → **OK**. Baseline verificado, no aceptado de palabra: `git archive main` extraído aparte y ejecutada su suite → **289 tests** (2 fallos ahí son artefactos de la copia fuera de `.git`, no de `main`), luego 289 + 21 nuevos = 310, cuadra | ✅ |
| CA-14 | Diff acotado | `git diff --name-only main` → `docs/arquitectura.md`, la spec, `tools/check.mjs`, `tools/checks/layout.mjs`, `tools/tests/check.test.mjs`, `tools/tests/layout.test.mjs` (+ este ledger). **0** ficheros bajo `core/`, **0** bajo `docs/fundacion/`, `FOUNDATION.md` intacto, `README.md` intacto | Reproducido: `git diff --name-only main` → exactamente **7** ficheros, todos dentro de la lista de CA-14. Filtro `^(core/|docs/fundacion/|FOUNDATION.md|README.md)` → **ninguno**. `git status` no muestra ficheros sin seguimiento. El diff de la propia spec es **solo frontmatter** (estado + historial): el implementador no reescribió sus CA | ✅ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

**GREEN — 2026-07-27, sdd-verificador.** 14/14 CA en ✅, ninguna salvedad.

**Cómo lo he verificado (no por lectura amable).** Un check que da verde no prueba nada
—el defecto original era justamente dar verde—, así que ejercí el **rojo** con un banco de
**28 escenarios** sobre **copias del árbol REAL del repo** (no sobre los fixtures del
implementador), ejecutando el entrypoint de verdad `node tools/checks/layout.mjs` y
mirando el exit code:

| bloque de escenarios | resultado en la rama | los mismos sobre `main` |
|---|---|---|
| mínimo común (`agents/`, `skills/`, `tests/`) quitado a cada uno de los 3 adaptadores (9) | 9 × exit 1 | **6 verdes falsos** (kimi-code y opencode) |
| extras declarados quitados uno a uno (7) | 7 × exit 1 | **4 verdes falsos** (kimi + opencode) |
| adaptador declarado borrado entero / `adapters/` entero (3) | 3 × exit 1 | 2 verdes falsos |
| adaptador falso vacío y sin `skills/` (2) | 2 × exit 1 | 2 verdes falsos |
| adaptador falso con solo el mínimo común (1) | exit 0 (sin falso positivo) | exit 0 |
| superficie prohibida en raíz `plugins/`, `agents/`, `hooks/` (3) | 3 × exit 1 | 1 verde falso (`plugins/`) |
| `adapters/<h>/{docs,tools,core}/` no ilegalizan la raíz (3) | 3 × exit 0 | 3 × exit 0 |

Total: **28/28 como debe** en la rama frente a **15 verdes falsos** en `main`. Además, los
tests nuevos ejecutados contra los fuentes de `main` fallan **12** casos: el RED es
reproducible, no declarado.

**Las tres trampas del encargo, comprobadas explícitamente.**
1. *Ningún nombre de harness en el recorrido ni en el mínimo común*: cierto. Los nombres
   solo viven en `EXTRAS_POR_HARNESS` (líneas 28-30) y en comentarios; cero
   `if (harness === …)`. La prueba dura no es el grep sino el escenario del adaptador
   `harness-falso`, que el check juzga y nombra sin conocerlo.
2. *Los extras declarados se exigen de verdad*: los rompí los siete, y encima **declaré un
   `harness-fantasma` inexistente** en la tabla sobre una copia → exit 1. La tabla no es
   decorativa en ninguna de las dos direcciones.
3. *La lista de raíz sigue cerrada*: el único `readdirSync` del fichero está en
   `descubreAdaptadores`; la rama de raíz itera la constante. Verificado por comportamiento
   con tres contrapruebas (`docs/`, `tools/`, `core/` dentro de un adaptador no contaminan
   la raíz).

**CA-7, la tercera vía.** No se activó *y no se disfrazó*. Comparé exigencia a exigencia lo
que `main` pedía a claude-code (6 comprobaciones) con lo que pide la rama: **las mismas 6**,
más una lista de raíz que es **superconjunto** de la anterior. Ningún adaptador ya cubierto
ha perdido comprobaciones, ningún extra se degradó a opcional. Lo confirma la ejecución: los
8 escenarios que `main` ya detectaba siguen en rojo en la rama.

**Gates mecánicos.** `npm test` 310/310 (baseline 289 comprobado ejecutando la suite de
`main` extraída aparte, + 21 nuevos); `node tools/check.mjs` exit 0 con 17 pasos, `layout`
como **un** solo paso, y 9 checks; `node core/scripts/valida.mjs --dir docs` OK. Los tests
preexistentes de `tools/tests/check.test.mjs` están intactos: **0 líneas borradas** en su
diff contra `main`.

**Frontera (CA-14).** 7 ficheros, todos dentro de la lista; cero bajo `core/`, cero bajo
`docs/fundacion/`, `FOUNDATION.md` y `README.md` sin tocar. El diff de la spec es solo
frontmatter.

**Tensión para el humano (no bloquea, no es de esta spec).** ADR-011 §6 —"cada check declara
a quién ha mirado"— hoy solo lo cumplen `layout` y `roles-fuente-unica`. `manifiestos` y
`referencias` imprimen un OK **anónimo** (en la salida real, `[manifiestos] OK: …` sale tres
veces idéntico, sin distinguir a qué adaptador miró cada una). Es exactamente el modo de
fallo que §6 quiere evitar, pero está **fuera** de los CA de SPEC-017 y **fuera** de la
frontera de CA-14, así que no lo cuento en contra. Ver F-SPEC-017-3.

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-017/. Informe HTML opcional: _qa/SPEC-017/informe.html -->

**n-a: SPEC-017 no tiene superficie de UI.** No hay nada que capturar con Playwright: los 14
CA se verifican con exit codes, salida de proceso, inspección del fuente y diff contra
`main`. La evidencia es la traza de comandos recogida en el veredicto y en la matriz —toda
reproducible: banco de 28 escenarios rojos sobre copias del árbol real, tests de la rama
contra los fuentes de `main` (12 fallos), y los tres gates mecánicos.

## Salvedades / follow-ups
<!-- IDs F-SPEC-017-1, F-SPEC-017-2… con destino (spec futura o EPIC-MEJORA). -->

- **F-SPEC-017-1 — misma clase de drift en `tools/checks/descripcion-fuente-unica.mjs`.**
  Su comentario (línea 53) dice *"todas las superficies … de **ambos** adaptadores"*
  cuando enumera **tres**. Es exactamente el defecto que cierra el bloque B, pero en otro
  fichero: **fuera** de CA-9 (que habla de `check.mjs`) y **fuera** de la frontera de
  CA-14, así que **no lo he tocado**. Destino sugerido: EPIC-FIX, junto con el siguiente.
- **F-SPEC-017-2 — nombre de test envejecido en `tools/tests/check.test.mjs`.**
  El caso `CA-6: PASOS incluye build, los 6 checks y valida…` dice "6 checks" y comprueba
  9. No lo he renombrado **a propósito**: CA-10 exige que los tests preexistentes de ese
  fichero sigan verdes *"sin modificarse"*, y renombrarlos habría enturbiado esa
  verificación. Es prosa, no comportamiento. Destino: junto a F-SPEC-017-1.
- **CA-7 no se activó** (ver matriz): generalizar `layout` **no** destapó ningún
  incumplimiento real. Los tres adaptadores tienen `agents/`, `skills/` y `tests/`, y sus
  extras declarados existen. No hubo nada que escalar y no se ablandó ninguna
  comprobación. Queda anotada la **consecuencia conocida de ADR-011** (§Negativas): a
  partir de ahora **cualquier directorio suelto bajo `adapters/` se juzga como adaptador**
  y se le exige el mínimo común. Es el comportamiento deseado, pero quien cree un
  adaptador a medias verá CI en rojo desde el primer `mkdir`.
  *Confirmado por el verificador*: `adapters/harness-falso/` vacío pone `layout` en exit 1.
- **F-SPEC-017-3 — ADR-011 §6 solo lo cumplen 2 de los 9 checks** (abierto por el
  verificador). `manifiestos` y `referencias` imprimen un OK anónimo idéntico en cada una de
  sus tres invocaciones, sin nombrar el adaptador mirado; `descripcion-fuente-unica`,
  `fuente-unica`, `nucleo-aislado`, `nucleo-agnostico` y `prosa-gates` tampoco declaran
  cobertura. Es el mismo modo de fallo que dejó pasar F-SPEC-015-2 ("verde anónimo no
  distingue *los miré todos* de *no miré ninguno*"). **Fuera** de los CA de SPEC-017 y fuera
  de la frontera de CA-14, así que no se ha tocado. Destino sugerido: EPIC-FIX, junto a
  F-SPEC-017-1 y F-SPEC-017-2.
- **Follow-ups del implementador verificados**: F-SPEC-017-1 es real
  (`tools/checks/descripcion-fuente-unica.mjs` línea 53 dice *"ambos adaptadores"* y enumera
  tres) y F-SPEC-017-2 también (`tools/tests/check.test.mjs` línea 20, `CA-6: … los 6
  checks`). Ambos correctamente dejados fuera por CA-14; el segundo, además, por no
  enturbiar la verificación de CA-10.

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->

**Estado: implementación completa; nada a medias.** Los 14 CA tienen implementación y
test (CA-12 es del arquitecto; CA-7 no llegó a activarse). Spec en `en-revision`.

- **Rama** `ft/SPEC-017-layout-generalizado`, **sin commitear** (el implementador no
  commitea en este ciclo). `git status` muestra 6 ficheros modificados + este ledger.
- **RED reproducible** (lo que pedirá el verificador): sobre `main`, los tests nuevos de
  `tools/tests/layout.test.mjs` y `tools/tests/check.test.mjs` fallan **8 + 4 = 12**
  casos. El RED canónico que nombra la spec —borrar `adapters/kimi-code/tests/` deja
  `layout` en `ok:true`— es el caso `SPEC-017 CA-1a/CA-2` y falló con
  `Expected values to be strictly equal: true !== false`. Tras el arreglo: 20/20 en
  `layout.test.mjs`, 15/15 en `check.test.mjs`.
- **Comandos de cierre ejecutados**: `npm test` → 310/310 (0 fallos);
  `node tools/check.mjs` → exit 0, 17 pasos, 9 checks;
  `node core/scripts/valida.mjs --dir docs` → OK; `node tools/checks/layout.mjs` → exit 0
  imprimiendo `(claude-code, kimi-code, opencode)`.
- **Dónde mirar si algo falla**: la tabla `EXTRAS_POR_HARNESS` de
  `tools/checks/layout.mjs` es lo único que conoce nombres de harness; el mínimo común y
  el recorrido de `adapters/` no contienen ninguno. La lista cerrada de raíz es
  `SUPERFICIE_PROHIBIDA_RAIZ`, y **no** debe derivarse del FS (ADR-011 §4).
