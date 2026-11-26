---
id: SPEC-030
tipo: ledger
epica: EPIC-008
---
# Ledger — SPEC-030 Ficha de CA manual: formato, validacion y cierre que la respeta

## Resumen
- Fase: <!-- refleja el estado de la spec; la fuente de verdad es el frontmatter de la spec -->
- Rama: `ft/SPEC-030-ficha-de-ca-manual-formato-validacion-y-cierre-que-la-respeta`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `core/lib/ca-manual.mjs` (`lineasVisibles`, `leerCAs`, `esSpecDelModelo`): el lector único | `core/tests/ca-manual-lector.test.mjs` (los cinco CA de la fixture, ficha sin errores, bloque de código, bloque sangrado en lista, comentario en una línea); fixture en `core/tests/_ca-manual-fixtures.mjs` (`CUERPO_CA1`); SPEC-030 no es del modelo: `core/tests/ca-manual-sin-marca.test.mjs` | Tests leídos y en verde. Adversarial propio (`leerCAs` directo): la fixture con CRLF da los mismos cinco CA y ficha, sin errores; `~~~`, valla de 4 cerrada solo por 4, valla sin cerrar, comentario en la misma línea, `[MANUAL]` en mayúsculas y «manual» en el texto no activan la marca; una lista tras el Given no entra en la ficha. Árbol real: 33 specs, 0 del modelo | ✅ |
| CA-2 | `core/lib/ca-manual.mjs` (`erroresFicha`); `core/scripts/valida.mjs` (`erroresModeloCaManual`); textos `valida.ficha.*` en `core/mensajes/es/mensajes.json` | `core/tests/ca-manual-valida-ficha.test.mjs`: casos (a)–(l), cada variante por separado por el CLI; dos errores en dos CA; la fixture de CA-1 da OK | Tests leídos: (a)–(l) cada variante por el CLI, con fichero, CA y clave; los dos errores aparecen. Adversarial: `bloquea-hecho: quizá` por el CLI → código 1, nombra fichero, CA-1 y valores admitidos | ✅ |
| CA-3 | `core/lib/ca-manual.mjs` (`leerMatriz`, `analizarEstado`, `erroresMarcas`); `core/lib/persona.mjs` (predicado único, también lo importa `estado.mjs`); `core/scripts/valida.mjs`; textos `valida.marca.*` | `core/tests/ca-manual-valida-marcas.test.mjs`: (a)–(b) sin error, (c)–(i) con error por el CLI nombrando ledger, CA y celda; sin ledger no hay error; test de fuente de la definición única de persona | Tests leídos y en verde. Adversarial (`analizarEstado` + CLI): `[salvedad: SDD-Verificador, …]` y `[salvedad: desconocido, …]` → no-persona; `✅️` (con VS16), `**✅**`, `N/A`, `n-a ok`, `✅ <!-- nota -->` y celda vacía → error, nunca cierran; `❌ [salvedad: …]` → calificador sin cierre. `esPersona` vive solo en `core/lib/persona.mjs` | ✅ |
| CA-4 | `core/scripts/estado.mjs` (`guardaHecho`, tras firma y aprobación); `core/lib/ca-manual.mjs` (`bloqueosHecho`, `estadoCierra`, `rutaLedger`); textos `estado.hecho-*` | `core/tests/ca-manual-estado-hecho.test.mjs`: (a) ×3 pasa a hecho; (b)–(g) se niega, nombra cada CA y su Estado y la spec no cambia byte a byte; CLI en (b); firma antes; en-progreso/bloqueada/en-revision y hecho de épica sin cambios | Tests leídos y en verde. Adversarial sobre `transition` en temporal: niega (spec intacta byte a byte) con `✅ [salvedad: sdd-verificador, …]`, `✅ [salvedad: SDD-Implementador, …]`, ⚠️ en CA automático bloqueante, `⚠` sin VS16, ⏳ bloqueante, celda vacía, fila ausente, fila ✅ escondida en comentario, sin ledger, `bloquea-hecho: quizá` (cuenta como sí), y con spec+ledger en CRLF; CLI → código 1 nombrando CA y celda; `--por sdd-implementador` se niega por firma antes. Pasa con salvedad de persona y con `bloquea-hecho: No`. Huecos no exigidos por la spec: F-SPEC-030-2 y F-SPEC-030-7 | ✅ |
| CA-5 | `core/scripts/valida.mjs` y `core/scripts/estado.mjs` solo aplican el modelo con `esSpecDelModelo` | `core/tests/ca-manual-sin-marca.test.mjs`: (a) valida OK y pasa a hecho; (b) lista `rutasVigiladas` sin error; (c) valida del árbol real «OK» sin modificar `docs/` (hash) y SPEC-030 no es del modelo | Tests leídos y en verde. Adversarial: spec sin marca con «manual» en el texto, `CA-M1` y ledger con ⚠️ y 🚧 → valida OK y pasa a `hecho`. Árbol real: `node core/scripts/valida.mjs` → `[valida] OK`; ninguna de las 33 specs es del modelo; `git status` limpio tras los gates | ✅ |
| CA-6 | `core/templates/es/artefactos/SPEC.md` (comentario con la marca, la ficha y un ejemplo; remite a ADR-020); `core/templates/es/artefactos/SPEC.ledger.md` (leyenda con ⏳, los tres calificadores y RN-12); `core/roles/es/sdd-verificador.md` (RN-12 y GREEN de ADR-020 §5); `tools/tests/golden/scaffold-es.json` (solo las dos entradas de spec y ledger, ver F-SPEC-030-1). `docs/fundacion/reglas.md` no se toca | `tools/tests/regla-salvedad.test.mjs`: 6.1 ejemplo aceptado por el lector; 6.2 scaffold + valida; 6.3/6.4/6.6 frase, RN-12, calificadores, GREEN y sin frases antiguas; 6.5 RN-12 en reglas.md y RN-09 literal; 6.7 el fallo nombra el fichero y la normalización tolera acentos/mayúsculas/markdown | Tests leídos y en verde. Diff revisado: plantilla de spec (comentario con ejemplo, remite a ADR-020), leyenda del ledger (⏳, tres calificadores, RN-12), rol del verificador (RN-12 y GREEN de §5), sin las frases antiguas. `docs/fundacion/reglas.md` sin tocar en la rama; RN-12 presente | ✅ |
| CA-7 | Sin código propio: `valida.mjs` y `estado.mjs` importan el lector | `core/tests/ca-manual-fuente-unica.test.mjs` (ninguno de los dos reconoce `[manual]`, ids CA ni marcas de Estado fuera de comentarios); `npm test`, `npm run check`, `node core/scripts/valida.mjs` en verde (ver handoff). Tests previos de estado, valida, scaffold y frontmatter sin tocar | Ejecutado por el verificador el 2026-11-26: `npm test` 811/811, 0 fail, 0 skipped; `npm run check` OK (4 builds + 10 checks + valida); `node core/scripts/valida.mjs` → `[valida] OK`. `git diff --name-status 528af4b..HEAD -- core/tests tools/tests`: solo ficheros nuevos y `tools/tests/golden/scaffold-es.json`; ningún `.test.mjs` previo cambia. Golden (F-SPEC-030-1): compatible con CA-7.2, ver veredicto | ✅ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->
**GREEN — 2026-11-26 (sdd-verificador).** CA-1 a CA-7 en ✅, sin calificadores. Gates
ejecutados en la rama (HEAD `e7ebcf2`): `npm test` 811/811, `npm run check` OK, `valida` OK.
Pruebas adversariales propias en temporal (lector, marcas, guarda de `hecho`, CRLF) sin
fallos contra lo que exige la spec. Ningún intento de colar `✅ [salvedad: <rol sdd-*>, …]`
ni un ⚠️/⏳/celda vacía/fila ausente en un CA bloqueante llega a `hecho`.

Juicio sobre F-SPEC-030-1 (golden de scaffold) frente a CA-7.2: **compatible, no necesita
OK humano**. (1) `tools/tests/golden-es.test.mjs` no cambia: su aserción
(`deepEqual(ejecutaScaffold(…), GOLDEN_SCAFFOLD)`) es la misma. (2) El delta de las dos
entradas es exactamente el delta de las plantillas `SPEC.md` y `SPEC.ledger.md`
(comprobado comparando el texto insertado/sustituido); las otras tres entradas,
`es.json`, `barrera-es.json` y `_casos.mjs` no cambian. (3) CA-6, aprobado por una
persona, obliga a cambiar lo que crea `scaffold`: ninguna implementación conforme podía
dejar intacto ese golden. (4) «No se regeneran» es un comentario de un test de SPEC-025
(fidelidad al código base del refactor i18n, CE-4 de EPIC-007), no una regla de spec, ADR
o RN. Queda el comentario de cabecera desfasado para esas dos entradas: F-SPEC-030-8.

Follow-ups: ninguno bloquea. F-SPEC-030-2 y F-SPEC-030-7 son la misma clase (la matriz
la escribe quien juzga; un verificador puede escribir ✅ igualmente) y van a la siguiente
spec de EPIC-008, que añade otra tabla con `CA` delante. F-SPEC-030-3: todas las
decisiones son del lado seguro (niegan o dan error). F-SPEC-030-4, -5, -6: informativos.

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-030/. Informe HTML opcional: _qa/SPEC-030/informe.html -->

## Salvedades / follow-ups
<!-- IDs F-SPEC-030-1, F-SPEC-030-2… con destino (spec futura o EPIC-MEJORA). -->
| ID | Detalle | Destino |
|---|---|---|
| F-SPEC-030-1 | **Golden de scaffold.** CA-6 cambia `SPEC.md` y `SPEC.ledger.md`, y `tools/tests/golden-es.test.mjs` (SPEC-025 CA-4) compara byte a byte lo que crea scaffold con `tools/tests/golden/scaffold-es.json`, cuya cabecera dice que «no se regeneran». Se actualizaron solo las dos entradas que salen de esas plantillas (spec y ledger de SPEC-001), recalculadas con `ejecutaScaffold`; las otras tres (épicas, task, ADR) son idénticas. No cambia ninguna aserción del test: cambian los datos esperados, como consecuencia directa del cambio de plantilla que exige CA-6. Lo señalo para que el verificador lo juzgue frente a CA-7.2 (y el humano, si lo ve como un cambio de golden que necesita su OK). | Verificador (CA-7.2) |
| F-SPEC-030-2 | La matriz se localiza como la primera tabla cuya cabecera empieza por `CA`, y el Estado es su última columna. Una tabla anterior con esa cabecera (no hay en la plantilla) se tomaría por la matriz. | Siguiente spec de EPIC-008 (sección «Evidencia de CA manuales» añade otra tabla con `CA` delante; va detrás de la matriz) |
| F-SPEC-030-3 | Decisiones del lector no fijadas por la spec: una celda de Estado vacía en el ledger de una spec del modelo es error (`marca no reconocida`); `⚠` sin selector de variante vale como `⚠️`; `[desviacion]` sin tilde vale como `[desviación]`; `bloquea-hecho` con un valor no admitido cuenta como `sí` para la guarda (el seguro). | Informativo para el verificador |
| F-SPEC-030-4 | No se valida: ids de CA repetidos en una spec, ni filas de la matriz de CA que no existen en la spec (salvo `⏳`, que da error porque no es un CA manual). La validación de ficha solo se aplica a `tipo: spec` (no a tasks). | EPIC-MEJORA si se quiere |
| F-SPEC-030-5 | La plantilla y el rol citan «ADR-020 de tremen-sdd» y «RN-12 de tremen-sdd»: en un proyecto usuario la numeración de RN y ADR es la suya (ADR-020, Contexto: xana-pensa). | Informativo |
| F-SPEC-030-6 | Gotcha: `tools/checks/nucleo-aislado.mjs` lee como import cualquier `import … from '<x>'` del fuente, también dentro de una regex de un test bajo `core/tests/`. Los tests de fuente de CA-3/CA-7 escriben la regex sin esa forma. | Informativo |
| F-SPEC-030-7 | (verificador) Filas repetidas de un CA en la matriz: `leerMatriz` toma la primera y `valida` no avisa. Un ledger con `CA-2 ✅` y después `CA-2 ⚠️` pasa a `hecho` sin error. Junto con F-SPEC-030-2. | Siguiente spec de EPIC-008 (o EPIC-MEJORA): error de valida por fila repetida |
| F-SPEC-030-8 | (verificador) La cabecera de `tools/tests/golden-es.test.mjs` dice que los golden se capturaron del código base y «no se regeneran»; tras CA-6, las entradas de spec y ledger de `scaffold-es.json` siguen a las plantillas. Conviene anotar en la cabecera que un cambio de plantilla aprobado por una spec actualiza esas entradas. | EPIC-MANT |
| F-SPEC-030-9 | (verificador) Bordes del lector no exigidos por la spec: un `<!--` sin cerrar dentro de un code span (`` `<!--` ``) oculta el resto del texto, también una marca `[manual]` posterior (la spec no sería del modelo); la fecha de `salvedad`/`confirmado` se valida por forma (`2026-13-45` pasa); una marca dentro de la negrita (`- **CA-3 [manual]**`) no cuenta. En el árbol real los `<!--` en code span están cerrados en la misma línea. | EPIC-MEJORA |

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->
- **Hecho**: CA-1 a CA-7 implementados con su test, en la rama
  `ft/SPEC-030-ficha-de-ca-manual-formato-validacion-y-cierre-que-la-respeta`, creada desde
  `origin/main` 528af4b. La spec pasa a `en-revision`.
- **Gates del implementador, 2026-11-26**: `npm test` 811/811 en verde, 0 skipped; `npm run check`
  OK (build de los cuatro adaptadores + 10 checks + valida); `node core/scripts/valida.mjs` → `[valida] OK`.
- **Dónde mirar**: el lector es `core/lib/ca-manual.mjs` (único); `core/lib/persona.mjs` es el
  predicado de persona que antes vivía en `estado.mjs`. Tests de la spec: `core/tests/ca-manual-*.test.mjs`
  (fixtures en `core/tests/_ca-manual-fixtures.mjs`) y `tools/tests/regla-salvedad.test.mjs`.
- **Para el verificador**: F-SPEC-030-1 (golden de scaffold actualizado en dos entradas) frente a
  CA-7.2. `docs/fundacion/reglas.md` no se ha tocado (RN-12 la escribió el arquitecto).
- **Falta**: nada de código. Fuera de alcance, para las siguientes specs de EPIC-008: evidencia de
  CA manuales, ronda acotada, `.sdd.json`, PARCIAL, roles y pasos tras el merge.
