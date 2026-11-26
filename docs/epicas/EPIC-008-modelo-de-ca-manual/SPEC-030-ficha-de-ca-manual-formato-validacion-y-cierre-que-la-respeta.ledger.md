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
| CA-1 | `core/lib/ca-manual.mjs` (`lineasVisibles`, `leerCAs`, `esSpecDelModelo`): el lector único | `core/tests/ca-manual-lector.test.mjs` (los cinco CA de la fixture, ficha sin errores, bloque de código, bloque sangrado en lista, comentario en una línea); fixture en `core/tests/_ca-manual-fixtures.mjs` (`CUERPO_CA1`); SPEC-030 no es del modelo: `core/tests/ca-manual-sin-marca.test.mjs` | | ❌ |
| CA-2 | `core/lib/ca-manual.mjs` (`erroresFicha`); `core/scripts/valida.mjs` (`erroresModeloCaManual`); textos `valida.ficha.*` en `core/mensajes/es/mensajes.json` | `core/tests/ca-manual-valida-ficha.test.mjs`: casos (a)–(l), cada variante por separado por el CLI; dos errores en dos CA; la fixture de CA-1 da OK | | ❌ |
| CA-3 | `core/lib/ca-manual.mjs` (`leerMatriz`, `analizarEstado`, `erroresMarcas`); `core/lib/persona.mjs` (predicado único, también lo importa `estado.mjs`); `core/scripts/valida.mjs`; textos `valida.marca.*` | `core/tests/ca-manual-valida-marcas.test.mjs`: (a)–(b) sin error, (c)–(i) con error por el CLI nombrando ledger, CA y celda; sin ledger no hay error; test de fuente de la definición única de persona | | ❌ |
| CA-4 | `core/scripts/estado.mjs` (`guardaHecho`, tras firma y aprobación); `core/lib/ca-manual.mjs` (`bloqueosHecho`, `estadoCierra`, `rutaLedger`); textos `estado.hecho-*` | `core/tests/ca-manual-estado-hecho.test.mjs`: (a) ×3 pasa a hecho; (b)–(g) se niega, nombra cada CA y su Estado y la spec no cambia byte a byte; CLI en (b); firma antes; en-progreso/bloqueada/en-revision y hecho de épica sin cambios | | ❌ |
| CA-5 | `core/scripts/valida.mjs` y `core/scripts/estado.mjs` solo aplican el modelo con `esSpecDelModelo` | `core/tests/ca-manual-sin-marca.test.mjs`: (a) valida OK y pasa a hecho; (b) lista `rutasVigiladas` sin error; (c) valida del árbol real «OK» sin modificar `docs/` (hash) y SPEC-030 no es del modelo | | ❌ |
| CA-6 | `core/templates/es/artefactos/SPEC.md` (comentario con la marca, la ficha y un ejemplo; remite a ADR-020); `core/templates/es/artefactos/SPEC.ledger.md` (leyenda con ⏳, los tres calificadores y RN-12); `core/roles/es/sdd-verificador.md` (RN-12 y GREEN de ADR-020 §5); `tools/tests/golden/scaffold-es.json` (solo las dos entradas de spec y ledger, ver F-SPEC-030-1). `docs/fundacion/reglas.md` no se toca | `tools/tests/regla-salvedad.test.mjs`: 6.1 ejemplo aceptado por el lector; 6.2 scaffold + valida; 6.3/6.4/6.6 frase, RN-12, calificadores, GREEN y sin frases antiguas; 6.5 RN-12 en reglas.md y RN-09 literal; 6.7 el fallo nombra el fichero y la normalización tolera acentos/mayúsculas/markdown | | ❌ |
| CA-7 | Sin código propio: `valida.mjs` y `estado.mjs` importan el lector | `core/tests/ca-manual-fuente-unica.test.mjs` (ninguno de los dos reconoce `[manual]`, ids CA ni marcas de Estado fuera de comentarios); `npm test`, `npm run check`, `node core/scripts/valida.mjs` en verde (ver handoff). Tests previos de estado, valida, scaffold y frontmatter sin tocar | | ❌ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

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
