---
id: SPEC-018
tipo: ledger
epica: EPIC-005
---
# Ledger — SPEC-018 Que puede afirmar un documento de verdad y como se verifica

## Resumen
- Fase: hecho <!-- refleja el estado de la spec; la fuente de verdad es el frontmatter de la spec -->
- Rama: `ft/SPEC-018-afirmaciones-documento-de-verdad`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | **NO aplicado a propósito** — RN-12 elevada al gate (ver *RN-12 propuesta*). `docs/fundacion/reglas.md` sin tocar (RN-08 / CA-9) | pendiente de la firma; la aserción exacta queda escrita abajo para quien la aplique | Comprobado otra vez en la ronda 2: `grep -c RN-12 docs/fundacion/reglas.md` → **0**; el fichero no aparece en `git status` ni en `git diff main`. La elevación es el patrón de SPEC-016 y es lo correcto, pero el CA **no está cumplido** hasta la firma del anexo A | ⚠️ |
| CA-2 | `tools/tests/fixtures/afirmaciones/casos.json` → caso `M3-marca-volatil-cursor-rojo` + `docs/M3-marca-volatil-cursor-rojo.md` | `corpus-afirmaciones.test.mjs` → «CA-2: el caso canónico del adaptador de Cursor…» y «CA-2: el validador falla si un caso de clase P rechazado se queda sin reformulación» | Ronda 2: el rojo del caso Cursor ya es **derivado**, no declarado — quitar «en el roadmap» del léxico lo pone verde y la suite lo caza (G2/G3, `mutacion-corpus-ronda2.txt`). Sobre la cláusula citada corrijo mi ⚠️ de la ronda 1: el test que el propio CA-2 escribe pide que «ambos campos existan y no estén vacíos», y `validaCorpus` exige `nota` y `reformulacion` no vacías. Se cumple | ✅ |
| CA-3 | `tools/tests/fixtures/afirmaciones/inventario.json` (17 entradas) + `_corpus-afirmaciones.mjs` (`RECUENTO_RECONCILIADO`, `RECUENTO_POR_MECANISMO`) | `corpus-afirmaciones.test.mjs` → 5 casos «CA-3: …» (clase/mecanismo únicos, residuales declarados, dos clases, sin clase, mecanismo fuera del set, recuento) | 17 entradas contadas a mano contra la lista reconciliada de `_epica.md` (README 4 · contexto 2 · dominio 7 · FOUNDATION 3 · vision 1). M2=7 · M3=8 · ninguno=2, cuadra. Las constantes NO se derivan del corpus: están fijadas en el `.mjs` | ✅ |
| CA-4 | **Ronda 2**: `tools/tests/fixtures/afirmaciones/` (`casos.json`, `arbol.json` ampliado, **`lexico.json` nuevo**, `docs/*.md` ×25, `LEEME.md`) + `_corpus-afirmaciones.mjs` (esquema) + **`_oraculo-afirmaciones.mjs` nuevo** (resuelve contra el árbol) | `corpus-afirmaciones.test.mjs` (7 casos «CA-4: …») + **`oraculo-afirmaciones.test.mjs` nuevo**: «F-V-1: TODO veredicto declarado coincide con el derivado del árbol», «los VERDES sobreviven al check ENTERO», «cada ROJO lo es por el motivo que declara» y los 6 tests E1 | **Cerrado en la ronda 2.** Control propio con el oráculo: **25 casos, 0 desajustes** entre veredicto declarado y derivado del árbol. Mutaciones mías, distintas de las de la suite (`sonda-ronda2.out.txt`): añadir `adapters/cursor/` mueve 3 casos, añadir RN-09 al contenido de `reglas.md` mueve 1, quitar ADR-012 mueve 1 — todos con el motivo que declaran. E1/E2/E3 repetidos por mí sobre una copia: los tres hacen fallar la suite (antes 0, 1 y 0 fallos respectivamente) | ✅ |
| CA-5 | `_corpus-afirmaciones.mjs` → `COBERTURA_EXIGIDA` (12 casillas, lista cerrada) | `corpus-afirmaciones.test.mjs` → «CA-5: hay al menos un caso por casilla…», «…salen VERDES (no se persiguen)», «…falla NOMBRANDO la casilla vacía» | Las 12 casillas de la lista de CA-5 están y la lista es cerrada en código, no derivada. Cae la salvedad de la ronda 1: los 13 verdes sobreviven ahora al check ENTERO (test «los casos VERDES sobreviven al check ENTERO», y mi control de 0 desajustes lo confirma de forma independiente) | ✅ |
| CA-6 | `_corpus-afirmaciones.mjs` (`FORMAS`/`SINTAXIS`/`REGLAS_GRAMATICA` B1..B6) + **ronda 2**: `_oraculo-afirmaciones.mjs` → `parseMarcadores`, que implementa la gramática del anexo B y decide la validez leyendo el documento | `corpus-afirmaciones.test.mjs` (5 casos «CA-6: …») + **ronda 2**: `oraculo-afirmaciones.test.mjs` → «F-V-3: la sintaxis declarada del anexo B es lo que el parser lee del documento» (ata también el lado VÁLIDO) y «E1: borrar el marcador de un documento verde lo pone en rojo» | Cerrado el hueco de la ronda 1: `parseMarcadores` lee la sintaxis del documento y el test F-V-3 la contrasta contra el `sintaxis` declarado, en los dos sentidos. Verificado por mí: quitar el marcador de `M2-cifra-marcada-reglas-verde.md` —un VERDE con `forma: cifra, sintaxis: valida`— ahora hace fallar 2 tests (en la ronda 1, cero) | ✅ |
| CA-7 | `inventarios.json` (6 inventarios, resolutor + cardinalidad medida y fechada; **ronda 2**: `hooks-<adaptador>` pasa a leer el MANIFIESTO por decisión del gate) + **ronda 2**: `_oraculo-afirmaciones.mjs` → `resuelveInventario` / `hooksDeclarados` | `corpus-afirmaciones.test.mjs` (4 casos «CA-7: …») + **ronda 2**: `oraculo-afirmaciones.test.mjs` → «CA-7: la cardinalidad … se RESUELVE del árbol, no se declara» y «Gate 2026-07-29: un hook es lo que DECLARA EL MANIFIESTO» | Reproducidas por mí contra el árbol REAL el 2026-07-29: adaptadores **3**, checks **10**, roles **7**, reglas **11**. Y con la decisión del gate, hooks **por manifiesto**: claude-code **3** (`hooks.json`), kimi-code **2** (`hooks.toml`), opencode **1** (`opencode.json` → `plugin[]`). Confirmo el punto que lo justifica: `adapters/opencode/hooks/` **no existe** —los plugins viven en `plugins/`—, así que contar ficheros da 0 y el manifiesto da 1. Coinciden exactamente con `cardinalidad_por_parametro`. (Corrijo mi propia línea de la ronda 1, que decía 3/2/0 con exclusión `_`: esa vía la descartó el gate) | ✅ |
| CA-8 | lista enumerada abajo (fichero + enunciado), **8 sitios** ≤ 15 | recuento reproducible abajo con el escáner pegado | Reproducido de forma independiente (`docs/_qa/SPEC-018/ca8-escaner.mjs`): **8** pares, mismos ficheros y mismas líneas que la tabla del ledger. 8 ≤ 15, no procede parar | ✅ |
| CA-9 | ninguna escritura sobre `docs/fundacion/` ni `FOUNDATION.md`: `git diff main --name-only` no los contiene | `git status` / `git diff main --name-only` pegados abajo | Confirmado en la ronda 2: `git status` y `git diff main --name-only` no contienen `docs/fundacion/`, `FOUNDATION.md` ni `README.md`. La firma del anexo A sigue *pendiente*, que es lo que CA-9 exige a esta altura | ✅ |
| CA-10 | las 17 afirmaciones falsas siguen intactas; el diff no toca `docs/adr/`, `core/roles/`, `site/`, épicas ni otros ledgers | `git diff main --name-only` pegado abajo | Confirmado en el árbol tras la ronda 2: «6 checks» (README:141), «dos adaptadores» ×2 (contexto:24 y :93), «Gemini CLI» (dominio:15), «hoy instalar exige» (FOUNDATION:25), «(Por ahora)» (vision:34) siguen ahí. El diff contra `main` (fca033a) son exactamente 2 ficheros: la spec (frontmatter) y este ledger. Interpretación de CA-10 fijada abajo | ✅ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

**GREEN — 2026-07-29, sdd-verificador (ronda 2).**

Los dos bloqueantes de la ronda 1 están cerrados, y lo he comprobado con
mutaciones **mías**, distintas de las que trae la suite. Control con el oráculo:
**25 casos, 0 desajustes** entre el veredicto declarado y el derivado del árbol.
Mis mutaciones mueven lo que deben y por el motivo declarado: añadir
`adapters/cursor/` mueve 3 casos, añadir RN-09 al contenido de `reglas.md` mueve
la cifra de `reglas`, quitar ADR-012 cuelga la referencia del caso de fragmentos.
E1, E2 y E3 repetidos por mí sobre una copia hacen fallar la suite (en la ronda 1
fallaban 0, 1 y 0 tests). Gates sin regresión: `npm test` **384/384** (baseline de
`main` verificado otra vez con `git archive` sobre fca033a: **339**),
`node tools/check.mjs` exit 0 con 18 pasos y 10 checks, `valida` OK. Frontera
intacta: RN-12 sigue sin escribirse, las 17 afirmaciones falsas siguen ahí, y el
diff contra `main` son 2 ficheros.

**El árbol enriquecido no es mover la portería.** Lo audité: materializa 23
artefactos (RN-01..08, ADR-001/010/011/012, SPEC-001/002/003/014/016/017,
EPIC-001/003/004/005) y **rechaza todo lo demás** — ADR-005, RN-10, RN-11,
SPEC-013, EPIC-002 y `core/scripts/publica.mjs` salen rojos en mi sonda. Sus
cardinalidades siguen sin copiar las reales (checks 3 y no 10, roles 4 y no 7,
reglas 8 y no 11), así que ningún caso pasa por parecerse a la realidad. Y mi
aviso de la ronda 1 —meter RN-08 sube `reglas` y rompe el «cinco»— se atendió
**corrigiendo la cifra del fixture a «ocho»**, no tapándola: añadir RN-09 la
vuelve a poner en rojo.

**La circularidad se ha desplazado, y está vigilada.** El «esperado» tiene ahora
tres fuentes separadas: `casos.json` (el veredicto), `arbol.json` (el mundo) y
`lexico.json` + `inventarios.json` (el criterio). El oráculo consume las tres
últimas y no la primera, que es lo que evita que el corpus se valide a sí mismo.
El léxico **sí** es una palanca capaz de volver verde un rojo (quitar `gemini-cli`
del universo, «en el roadmap» del léxico o `adaptadores` del mapa lo hace), pero
ninguna de esas tres mutaciones cuela: el test maestro «TODO veredicto declarado
coincide con el derivado» las caza. Ablandar el oráculo tampoco (desactivé M1 y
fallan 3 tests). Queda **una** cifra declarada sin mecanismo — ver F-V-5.

Cierro con CA-1 en ⚠️, no en ✅: RN-12 sigue elevada y sin firmar, que es
exactamente lo que CA-9 exige a esta altura. **Esto no es un detalle de trámite**:
mientras el anexo A no se firme, la entrega de CE-4 —el criterio citable— no
existe todavía en `docs/fundacion/reglas.md`. Ver la tensión 1.

---

**RED — 2026-07-28, sdd-verificador (ronda 1).**

Los tres gates mecánicos están en verde y sin regresión (369 = 339 de `main` + 30
nuevos; `tools/check.mjs` exit 0 con 18 pasos y 10 checks; `valida` OK). La
frontera se respeta al milímetro: cero `core/`, cero `docs/fundacion/`, cero
`FOUNDATION.md`, cero `README.md`, cero `docs/adr/`, cero `site/`; RN-12 está
elevada y no aplicada; las 17 afirmaciones falsas siguen intactas. CA-3, CA-7,
CA-8, CA-9 y CA-10 los he reproducido de forma independiente y cuadran.

Devuelvo por la entrega de fondo: **el corpus no es ejecutable en el sentido que
CA-4 y `LEEME.md` prometen**. Seis de los trece casos VERDES no pueden salir
verdes bajo el bucle de consumo que el propio `LEEME.md` publica, y el veredicto
de ningún caso —ni rojo ni verde— está atado al árbol simulado contra el que
dice resolverse. Un corpus cuyos verdes son inalcanzables empuja a la spec #2 a
lo único que ADR-011 §5 prohíbe: ablandar el check hasta que pasen. Findings
F-V-1 a F-V-4.

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-018/. Informe HTML opcional: _qa/SPEC-018/informe.html -->
No aplica: la entrega es un corpus de datos y su validador, sin superficie de UI.
La evidencia es ejecutable y vive en `docs/_qa/SPEC-018/`:

| Fichero | Qué demuestra |
|---|---|
| `sonda-veredictos.mjs` + `.out.txt` | F-V-1: aplica M1 y M3 tal y como ADR-012 §2 los define, documento a documento, contra `arbol.json`. Lista los 6 casos VERDES que salen ROJOS |
| `mutacion-corpus.txt` | F-V-2 y F-V-3: los tres experimentos de mutación (E1 árbol, E2 documento rojo, E3 marcador de un verde) con su resultado |
| `ca8-escaner.mjs` + `.out.txt` | CA-8 reproducido de forma independiente: 8 sitios, mismos ficheros y líneas que el ledger |
| `sonda-ronda2.mjs` + `.out.txt` | **Ronda 2**: control de 25 casos sin desajustes, mis 5 mutaciones de árbol, la prueba de discriminación del árbol enriquecido y las 4 mutaciones de los datos que alimentan al oráculo |
| `mutacion-corpus-ronda2.txt` | **Ronda 2**: E1/E2/E3 repetidos sobre una copia, más el ablandamiento del léxico y del propio oráculo, con el recuento de tests que falla en cada caso |

## Findings del verificador — ronda 2 (2026-07-29)

**F-V-1 · F-V-2 · F-V-3 · F-V-4 — CERRADOS.** Verificados con mutaciones propias
(ver arriba y `mutacion-corpus-ronda2.txt`). Las dos decisiones del gate del
2026-07-29 están aplicadas y las he contrastado contra el árbol REAL: el
resolutor por manifiesto da 3/2/1 y `adapters/opencode/hooks/` no existe, con lo
que el número correcto de opencode (**1**) solo aparece leyendo `opencode.json`;
y `hoy` condicionado está en `lexico.json` con `token`, `condicion` y `motivo`.

**F-V-5 — la única cifra declarada que queda sin mecanismo está dentro del corpus.
No bloqueante; follow-up para la spec #2.**
`inventarios.json` declara `cardinalidad` (3 / 10 / 7 / 11) y
`cardinalidad_por_parametro` (3 / 2 / 1) como medición del árbol **real**, y
**ningún test las consume**: el oráculo resuelve contra el árbol *simulado*.
Falseé `adaptadores` a 99 y `hooks-opencode` a 42 y los 45 tests siguieron en
verde. Es exactamente la clase de cifra que RN-12 obliga a marcar, viviendo sin
mecanismo dentro del corpus que existe para eso. Hoy no engaña a nadie porque la
he reproducido a mano y cuadra, pero caducará igual que caducó el «nueve checks».
*Destino*: la spec #2, cuyo check resuelve esos inventarios contra el árbol real
y puede contrastarlos —o dejar de declararlos, que es la salida más limpia.

**Observaciones al gate, sin efecto sobre el veredicto**

1. **El manifiesto se cree lo que declara.** Borré `adapters/claude-code/hooks/calidad.mjs`
   del árbol dejando `hooks.json` intacto y no se movió ningún veredicto: es la
   consecuencia buscada de la decisión del gate, pero significa que la coherencia
   manifiesto ↔ fichero es un invariante **distinto**, que hoy vigila
   `tools/checks/manifiestos.mjs` y no este mecanismo. Conviene que la spec #2 no
   lo dé por cubierto.
2. **Parte del árbol enriquecido es decorado.** `docs/fundacion/dominio.md`,
   `contexto.md`, `vision.md`, `docs/roadmap.md`, `README.md`, `FOUNDATION.md` y
   `package.json` están en `arbol.json` y ningún caso los ejerce: quitarlos no
   mueve nada. No estorban —dan verosimilitud al árbol— pero no son evidencia.
3. **`M2-enumeracion-tabla-verde` perdió su párrafo explicativo** al quitarle la
   cita a `docs/fundacion/dominio.md`, y ya no hacía falta quitarlo porque el
   árbol ahora materializa ese fichero. La demostración de legibilidad en celda de
   tabla sigue viva en la tabla del fixture y en la sección de legibilidad de este
   ledger, pero el fixture ya no dice por qué existe.
4. **`hoy` sigue siendo el punto delicado del léxico de M3.** La regla del gate lo
   deja determinista y bien calibrado para los dos casos reales del inventario,
   pero sigue siendo un adverbio corrientísimo: en cuanto la spec #3 escriba «hoy
   los adaptadores viven en `adapters/`» tendrá un rojo legítimo y la salida
   correcta será reformular a clase R, no exentar. Merece un ejemplo en la RN.
5. **Las fechas del frontmatter y las del ledger difieren en un día**, y no es
   culpa de nadie: `core/scripts/estado.mjs` fecha con `new Date().toISOString()`
   —UTC— mientras el trabajo se escribe con la fecha local. Con la máquina en
   `Wed Jul 29 01:36 2026` (UTC+2), las transiciones de la ronda 2 quedan
   registradas como `2026-07-28`. No afecta a ningún CA, `valida` pasa y no lo
   toco (`core/` es frontera). Lo dejo dicho porque es, literalmente, una cifra
   que envejece sola dentro del ciclo que estamos endureciendo contra eso.

### ¿El oráculo invade la spec #2? Mi opinión, que el gate me pidió

**La frontera literal se respeta**: `_oraculo-afirmaciones.mjs` no está bajo
`tools/checks/`, no aparece en `PASOS`, no está en CI y `tools/check.mjs` sigue
diciendo 10 checks. Es test-only.

**La frontera sustantiva se roza, y hay que decirlo.** El oráculo es el motor de
decisión del futuro check: resuelve referencias y rutas (M1), parsea marcadores y
resuelve inventarios (M2) y aplica el léxico (M3). Lo que la spec #2 añade encima
es el **ámbito** (autodescubrimiento de `docs/fundacion/**` + la tabla de extras
que mete `README.md`), los **mensajes** que nombran fichero / enunciado / clase,
el «a quién he mirado» de ADR-011 §6, el cableado y la robustez sobre Markdown
arbitrario. Es bastante, pero no es el corazón.

**Aun así lo doy por justificado, y no lo convierto en RED**, por dos razones:
(a) F-V-2 no se puede cerrar sin resolver el árbol —un veredicto que no se deriva
de nada es el defecto de la ronda 1—; y (b) la alternativa, declarar las
cardinalidades dentro del corpus, es literalmente la segunda declaración capaz de
divergir en silencio que ADR-012 §2 prohíbe. Además, el anexo B y el anexo D son
propiedad de SPEC-018 por CA-6 y CA-7: implementarlos aquí es implementar lo suyo.

**Lo que sí queda como condición vinculante sobre la spec #2**, y por eso lo
escribo en el ledger y no solo en `LEEME.md`: **el check no puede importar el
oráculo y darse por satisfecho**. Si lo hiciera, el bucle de RED sería el oráculo
comparándose consigo mismo y no probaría nada — sería la circularidad de la ronda
1 reaparecida un nivel más arriba. El check se escribe aparte, con sus propios
tests, y el oráculo se queda donde está: como el lado *esperado* del corpus.

**Tensión honesta para el humano**: el «Fuera de alcance» de SPEC-018 dice «aquí
solo se entrega su corpus de RED», y lo que se entrega es *criterio + corpus +
oráculo de referencia*. Es más de lo que la spec escribió, y es consecuencia
directa de mi propio RED de la ronda 1. Si el gate prefiere que eso quede
registrado como ampliación de alcance decidida en verificación, este párrafo es
el sitio.

---

## Cómo se ejecuta el corpus

```bash
node --test tools/tests/corpus-afirmaciones.test.mjs tools/tests/oraculo-afirmaciones.test.mjs
# ronda 2: 45 tests, 0 fallos (30 de esquema y cobertura + 15 de derivación y E1)
```

Va dentro de `npm run test:tools` y de `npm test`. Cómo lo consume la spec #2 —el
bucle de RED completo— está en `tools/tests/fixtures/afirmaciones/LEEME.md`.

**Gates el 2026-07-29, tras la ronda 2:**

- `npm test` → **384/384** (339 en `main`; 369 tras la ronda 1; +15 en la ronda 2).
- `node tools/check.mjs` → exit 0, 18 pasos, 10 checks + `valida` en verde.
- `node core/scripts/valida.mjs` → OK.

## Evidencia CA-9 y CA-10 — alcance del diff

```
$ git status --porcelain
 M docs/epicas/EPIC-005-.../SPEC-018-....md          <- solo frontmatter (máquina de estados)
?? tools/tests/_corpus-afirmaciones.mjs
?? tools/tests/corpus-afirmaciones.test.mjs
?? tools/tests/fixtures/afirmaciones/                <- el corpus

$ git diff main --name-only
docs/epicas/EPIC-005-.../SPEC-018-....md
```

Ni `docs/fundacion/`, ni `FOUNDATION.md`, ni `README.md`, ni `docs/adr/`, ni
`core/`, ni `site/`, ni ningún otro ledger o épica. **Las 17 afirmaciones falsas
del inventario siguen exactamente donde estaban**: son trabajo de las specs #3 y
#4, y arreglarlas aquí destruiría el RED que la spec #2 necesita.

> **Lectura de CA-10 que el verificador debe conocer.** CA-10 pide literalmente
> que el diff «no contenga specs». El único fichero de spec que aparece es
> `SPEC-018` misma, y solo su frontmatter, porque la máquina de estados
> (`core/scripts/estado.mjs`, RN-07) escribe ahí cada transición. Leído al pie de
> la letra, CA-10 sería insatisfacible por construcción: toda spec en curso muta
> su propio frontmatter. Se interpreta como «no se modifica el CONTENIDO de
> ninguna spec, ledger, épica ni ADR», y así se cumple.

## Evidencia CA-7 — cardinalidad de cada inventario del anexo D

Script de un solo uso, ejecutado el 2026-07-28 contra el árbol de la rama. No se
comitea (no es el resolutor de la spec #2); se pega aquí para que el resultado
sea reproducible:

```js
const dirs = (p) => fs.readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const adaptadores = dirs('adapters');
const checks = [...new Set(PASOS.map((p) => String(p.cmd?.[1] ?? '').replaceAll('\\', '/'))
  .filter((s) => s.includes('/checks/')).map((s) => path.basename(s, '.mjs')))];
const roles   = fs.readdirSync('core/roles/es').filter((f) => f.endsWith('.md'));
const reglas  = fs.readFileSync('docs/fundacion/reglas.md', 'utf8').match(/^- \*\*RN-\d{2} —/gm);
const hooks   = (a) => fs.readdirSync(`adapters/${a}/hooks`).filter((f) => f.endsWith('.mjs'));
```

Salida:

```
adaptadores      = 3   [claude-code, kimi-code, opencode]
checks           = 10  [descripcion-fuente-unica, fuente-unica, layout, manifiestos,
                        nucleo-agnostico, nucleo-aislado, prosa-gates, referencias,
                        roles-fuente-unica, version-unica]
roles            = 7   [arquitecto, como-vamos, documentalista, implementador,
                        orquestador, producto, verificador]
reglas           = 11  [RN-01 … RN-11]
hooks-claude-code = 4  [_comun.mjs, calidad.mjs, protege-verdad.mjs, require-spec.mjs]
hooks-kimi-code   = 3  [_comun.mjs, protege-verdad.mjs, require-spec.mjs]
hooks-opencode    = 0  []
harnesses        = 3   (alias de adaptadores)
```

Las cuatro cardinalidades no parametrizadas del anexo D (**3 / 10 / 7 / 11**)
quedan **reproducidas exactamente**. Las de `hooks-<adaptador>` **no**: ver
F-SPEC-018-1, que es el hallazgo más importante de esta medición.

> **Corregido en la ronda 2 (gate del 2026-07-29).** Los números de `hooks-*` de
> arriba son los que devuelve **contar ficheros**, y son los equivocados. El
> resolutor aprobado lee el **manifiesto**, y el manifiesto existe en los tres
> adaptadores: `adapters/claude-code/hooks/hooks.json`,
> `adapters/kimi-code/hooks/hooks.toml` y `adapters/opencode/opencode.json`.
> Medido el 2026-07-29 contra el árbol real:
>
> ```
> hooks-claude-code = 3  [require-spec, protege-verdad, calidad]     (contar ficheros daba 4)
> hooks-kimi-code   = 2  [require-spec, protege-verdad]              (contar ficheros daba 3)
> hooks-opencode    = 1  [require-spec]                              (contar ficheros daba 0)
> ```
>
> `opencode` es el caso que zanja la discusión: **no tiene directorio `hooks/`**,
> así que contar ficheros da 0 y ninguna exclusión de prefijo lo arregla. Su
> manifiesto declara un plugin. El número correcto solo aparece leyendo el
> manifiesto, que es exactamente lo que el gate decidió.

## Evidencia CA-8 — sitios que RN-12 obligará a marcar

Escáner de un solo uso, 2026-07-28. Recorre `FOUNDATION.md`, `docs/fundacion/*` y
`README.md` buscando *cardinal (≥ dos, palabra o dígito) + sustantivo del léxico
cerrado de inventarios*, con los números de identificador enmascarados antes
(anexo B, regla 4). Escanea el **enunciado**, no la línea: la fundación va plegada
a 80 columnas y `los seis\nchecks` es un solo enunciado — escanear por líneas se
come ese caso, que es justo la cifra más famosa del inventario.

```js
const SUSTANTIVOS = ['adaptador','adaptadores','check','checks','rol','roles',
  'papel','papeles','regla','reglas','hook','hooks','harness','harnesses'];
const CARDINALES  = ['dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once',…];
const enmascara = (s) => s
  .replace(/\b(?:RN|ADR|SPEC|EPIC|TASK|CA|CE|F-SPEC|L|D)-?\d+(?:-\d+)*/g, (m) => ' '.repeat(m.length))
  .replace(/\bv?\d+\.\d+(?:\.\d+)?\b/g, (m) => ' '.repeat(m.length));
const RE = new RegExp(`\\b(?:\\*\\*)?(${cardinal})(?:\\*\\*)?\\s+(?:[\\wáéíóúñ]+\\s+){0,2}(${sust})\\b`, 'gi');
```

| # | Fichero:línea | Enunciado | Inventario |
|---|---|---|---|
| 1 | `README.md`:25 | «**Este es tu equipo**: los **7 roles**, como personas» | `roles` |
| 2 | `README.md`:126 | «`npm run check` (los **seis checks** de invariantes contra el árbol real…)» | `checks` |
| 3 | `README.md`:141 | «`npm run check` # build → **6 checks** → valida» | `checks` |
| 4 | `docs/fundacion/dominio.md`:23 | fila `rol`: «Uno de los **7 papeles** del pipeline» | `roles` |
| 5 | `docs/fundacion/contexto.md`:11 | «un pipeline de **7 roles** (producto → arquitecto → …)» | `roles` |
| 6 | `docs/fundacion/contexto.md`:24 | «existen **dos adaptadores** (`adapters/claude-code/` y `adapters/kimi-code/`)» | `adaptadores` |
| 7 | `docs/fundacion/contexto.md`:57 | «**Enforcement (hoy)**: **tres hooks** del adaptador de Claude Code» | `hooks-claude-code` |
| 8 | `docs/fundacion/contexto.md`:93 | «Existen **dos adaptadores** (`adapters/claude-code/` y `adapters/kimi-code/`)» | `adaptadores` |

**TOTAL: 8.** Muy por debajo del techo de 15 de CA-8, y por debajo de los 11
estimados. **No se para ni se escala**: el coste de autoría está acotado.

La diferencia con los 11 del ADR no es un error de nadie: es la **anchura del
léxico**. El corpus documental tiene **13** pares *cardinal + palabra*; los otros
5 son «Los **tres** son fail-open» (README:105), «**dos capas** fail-closed»
(README:117), «**Dos** válvulas auditables» (README:123), «**dos** está
prohibido» (reglas.md:42) y «**tres capas**» de tests (contexto.md:62). Ninguno
nombra un inventario del registro del anexo D, así que ninguno puede llevar
marcador: marcar `capas` o `válvulas` exigiría inventarlos como inventarios, y un
marcador con nombre desconocido es ROJO por diseño (anexo B, regla 1). Dos de
ellos sí son afirmaciones de inventario reales pero **anafóricas** —«Los tres son
fail-open» habla de hooks sin decir «hooks»— y M2 no puede detectarlas: ver
F-SPEC-018-4.

## Legibilidad del marcador en su contexto — respuesta con evidencia

`docs/fundacion/dominio.md` es **una tabla entera**, así que el sitio real donde
los marcadores van a vivir es una celda, no un párrafo. Para no responder esto
con una opinión, el corpus incluye el caso `M2-enumeracion-tabla-verde`
(`docs/M2-enumeracion-tabla-verde.md`), con un marcador de enumeración cerrado en
línea y uno de cifra dentro de celdas de la misma tabla:

```markdown
| **harness** | El entorno de agentes que hospeda el plugin. | <!-- sdd:inventario harnesses -->Claude Code, Kimi Code y opencode.<!-- /sdd:inventario --> Un adaptador = un harness. |
```

**Veredicto**: legible al renderizar (el comentario HTML es invisible y la celda
se lee igual que hoy), y **incómodo en el fuente** — la fila pasa de ~180 a ~260
columnas y el cierre en línea es fácil de perder de vista al editar. No es
motivo para cambiar la gramática, pero sí conviene que el gate lo sepa **antes**
de que la spec #3 marque `dominio.md`: la alternativa barata, cuando la celda se
vuelva ilegible, es reformular a clase R («los harnesses con adaptador bajo
`adapters/`») en vez de marcar, que es la salida que la propia *Nota 5* de la
spec recomienda.

---

## RN-12 propuesta — ELEVADA AL GATE, no aplicada

`docs/fundacion/**` tiene dueño único (RN-08) y lo defiende `protege-verdad`.
Siguiendo el patrón que ya funcionó en SPEC-016 con RN-05, **el implementador no
la escribe**: la eleva para que la firme el gate humano. CA-9 exige explícitamente
que ninguna escritura sobre `docs/fundacion/` o `FOUNDATION.md` ocurra **antes**
de esa firma, y el commit que añada RN-12 debe ser posterior a la entrada de firma
en este ledger.

**Estado: PENDIENTE DE FIRMA.** Texto propuesto, literal del anexo A de SPEC-018,
para añadir al final de `docs/fundacion/reglas.md` con el formato de las demás RN:

> - **RN-12 — Un documento de verdad solo afirma lo verificable o lo remitido.**
>   Toda afirmación de `FOUNDATION.md`, `docs/fundacion/` y `README.md` pertenece
>   a una de tres clases (ADR-012):
>   **(a) verificable** — referencia a un artefacto (`RN-NN`, `ADR-NNN`,
>   `SPEC-NNN`, `EPIC-NNN`) o ruta anclada desde la raíz del repo; cifra o
>   enumeración de un inventario **con su marcador**; o cita literal de un dato de
>   fuente canónica única;
>   **(b) remitida a su fuente** — enuncia la forma y **apunta** al artefacto que
>   es autoridad, sin reproducir su contenido (el estado de una spec vive en su
>   frontmatter, no narrado aquí). Toda afirmación sobre una herramienta externa
>   es de esta clase: se ancla con **versión y fecha** o se marca explícitamente
>   como **hipótesis**;
>   **(c) prohibida por volátil** — estado de progreso ("aún no", "pendiente", "en
>   curso"), futuros ("migrará a", "está en el roadmap"), presentes sin datar
>   ("hoy instalar exige…", "por ahora…") y cifras sin marcador. **No se
>   escribe**: vive en la épica, spec, ADR, ledger o roadmap que la posee, y desde
>   aquí se toma en forma (b).
>   Las afirmaciones de juicio, intención o motivación quedan **fuera** de esta
>   regla y no se verifican. Los ADRs, las specs, los ledgers y las épicas quedan
>   fuera del ámbito por ser registro histórico inmutable (RN-04).
>   Verificable: el check de coherencia docs↔repo de EPIC-005 (CE-2) resuelve las
>   referencias, compara cada cifra y enumeración marcada contra su inventario
>   real y falla ante una marca de volatilidad sin exención explícita, nombrando
>   fichero, enunciado y clase.

**Firma del gate** (a rellenar por la persona que apruebe, RN-09):

| Anexo | Firmado por | Fecha |
|---|---|---|
| A (RN-12) | *pendiente* | *pendiente* |

**Test de CA-1, listo para añadir el mismo día que RN-12** (no se añade ahora
porque hoy saldría rojo y ADR-011 §5 prohíbe ablandarlo para que pase):

```js
const reglas = fs.readFileSync('docs/fundacion/reglas.md', 'utf8');
assert.match(reglas, /^- \*\*RN-12 —/m);
for (const clase of ['verificable', 'remitida', 'prohibida por volátil']) {
  assert.ok(reglas.includes(clase), `RN-12 debe nombrar la clase «${clase}»`);
}
assert.match(reglas, /versión y fecha|hipótesis/);   // cláusula de herramienta externa
```

Al aplicarla, dos cosas más: la cardinalidad del inventario `reglas` pasa de 11 a
12 (`inventarios.json` ya lo dice en su nota), y queda pendiente el follow-up del
propio anexo A —cuando la spec #2 cree el check, RN-12 se actualiza para nombrar
su ruta; hoy se deja sin nombrar a propósito para que la regla no cite un fichero
inexistente el día que se escribe—.

## Decisiones del gate registradas

- **2026-07-28, Alberto Fojo — `docs/fundacion/contexto.md` ENTRA en el ámbito de
  RN-12.** La *Nota 6* de la spec ofrecía dejarlo fuera por declararse «documento
  vivo» en su propio encabezado. Decisión: **no**. Ser un documento vivo no
  justifica afirmar cosas falsas; lo que cambia se **remite a su fuente** (el
  tablero, el roadmap, el frontmatter de cada spec) en vez de duplicarse allí. En
  la práctica esto significa que `contexto.md` es el documento que más va a
  cambiar con la spec #3: hoy concentra 3 de los 8 sitios a marcar (CA-8) y 2 de
  las afirmaciones de clase P del inventario (#5, #6).
- **2026-07-28, Alberto Fojo — el inventario cerrado se amplía a 17 entradas.**
  Reconciliación registrada en `_epica.md` de EPIC-005: la lista de 13 más las 4
  de `FOUNDATION.md` y `vision.md` que CE-1 nombraba pero la lista original no
  cubría. `inventario.json` cierra contra esas 17, y `RECUENTO_POR_MECANISMO`
  (M2→7, M3→8, ninguno→2) lo hace verificable en vez de creíble.
- **Los ADRs quedan fuera del ámbito** (RN-04), igual que specs, ledgers, épicas,
  `core/roles/` y `site/`. Escrito en el texto de RN-12 para que nadie los
  «corrija» después creyendo que se olvidaron.

## Salvedades / follow-ups

- **F-SPEC-018-1 — el resolutor de `hooks-<adaptador>` del anexo D pondría en rojo
  la prosa correcta. ELEVADO, es lo más importante de esta implementación.**
  El anexo D lo escribe como «ficheros `.mjs` bajo `adapters/<adaptador>/hooks/`»,
  sin exclusión. Medido: devuelve **4** para claude-code y **3** para kimi-code,
  porque cuenta `_comun.mjs`, que es módulo compartido y **no un hook**. O sea:
  «los **tres** hooks» de `README.md` y `dominio.md` —que es la verdad— saldría
  **ROJO**, y alguien lo «arreglaría» escribiendo cuatro. Es exactamente el modo de
  fallo que ADR-012 existe para evitar: prosa reescrita para el parser.
  **CERRADO por el gate el 2026-07-29**: el resolutor lee el **manifiesto**
  (`hooks/hooks.json`, `hooks/hooks.toml`, `opencode.json` → `plugin[]`), no cuenta
  ficheros. El gate rechazó la propuesta de la ronda 1 —excluir el prefijo `_`—
  porque depende de una convención de nombres que nadie verifica; el manifiesto sí
  es la fuente de verdad de qué **es** un hook. Aplicado en `inventarios.json`
  (`criterio: manifiesto`, cardinalidades 3/2/**1**), en el árbol simulado (que
  conserva el `_comun.mjs` y añade los tres manifiestos) y en
  `_oraculo-afirmaciones.mjs` → `hooksDeclarados`. El árbol simulado guarda el
  `_comun.mjs` a propósito: si alguien vuelve a contar ficheros, el test «Gate
  2026-07-29: un hook es lo que DECLARA EL MANIFIESTO» lo caza.
  *Efecto no previsto y medido*: `hooks-opencode` pasa de **0** a **1**. opencode
  no tiene directorio `hooks/`, así que ninguna exclusión de prefijo lo habría
  arreglado — el número correcto solo existe leyendo el manifiesto.
- **F-SPEC-018-2 — la clase V3 (cita literal) se queda sin casos en el corpus.**
  ADR-012 §1 la define, pero la lista cerrada de cobertura de CA-5 no la incluye y
  «nada fuera de los CA». No es un hueco grave: su mecanismo ya existe con otro
  nombre (`version-unica.mjs`, `descripcion-fuente-unica.mjs`, RN-11/ADR-010 §4).
  Queda declarado en `LEEME.md`. **Destino: spec #2**, que decide si V3 entra en su
  ámbito o se declara cubierta por los checks existentes.
- **F-SPEC-018-3 — el léxico que obliga a marcar es más ancho que el registro de
  inventarios, y hace falta el mapa.** `dominio.md` dice «los 7 **papeles** del
  pipeline» y `contexto.md` «7 **roles**»: dos sustantivos, un solo inventario
  (`roles`). El escáner de CA-8 ya necesitó `papeles` para no perderse la entrada
  #4. La spec #2 necesita, por tanto, **dos listas cerradas y no una**: el léxico
  que dispara la obligación de marcar, y el registro de nombres válidos dentro de
  un marcador. Confundirlas produce o falsos negativos (léxico corto) o marcadores
  imposibles (nombres que no existen). **Destino: spec #2.**
- **F-SPEC-018-4 — los cardinales anafóricos son afirmaciones de inventario que M2
  no puede detectar.** «Los **tres** son fail-open» (README:105) afirma la
  cardinalidad de los hooks sin nombrar el inventario; el sustantivo está en la
  frase anterior. No hay forma determinista de cazarlo sin heurística sobre la
  frase, que ADR-012 rechaza expresamente. Es el mismo falso negativo residual que
  el ADR ya acepta para las enumeraciones sin marcar, extendido a las cifras
  anafóricas — y merece decirse porque el ADR sí presenta las **cifras** como
  cobertura obligatoria sin matizar este caso. Mitiga: la spec #3, al reformular,
  puede dejar el sustantivo en la frase. **Destino: spec #2 (declararlo) / #4.**
- **F-SPEC-018-5 — CA-1 queda abierto por diseño hasta la firma del gate.** No es
  deuda ni olvido: es el patrón de frontera de SPEC-016 aplicado (CA-9). El texto,
  el test y el punto de aplicación están arriba, listos. **Destino: gate de esta
  spec.**
- **F-SPEC-018-6 — el marcador dentro de una celda de tabla es legible al
  renderizar pero incómodo en el fuente.** Ver la sección de legibilidad. No
  bloquea; conviene que la spec #3 lo tenga delante antes de marcar `dominio.md`,
  y que sepa que reformular a clase R es la salida legítima. **Destino: spec #3.**
- **F-SPEC-018-7 (ronda 2) — «ningún no-miembro» solo es decidible donde hay
  universo declarado.** Los miembros de un inventario salen del árbol, pero para
  decidir que `Gemini CLI` es un intruso hace falta saber que es un candidato:
  `lexico.json` → `universo_de_miembros`, hoy solo para `adaptadores` y
  `harnesses`. Un inventario sin universo comprueba solo la mitad «todos los
  miembros» y su mitad «ningún no-miembro» sale verde por ausencia. Es enumeración
  justificada (ADR-011 §2) y el fallo residual es de **menos** cobertura, nunca de
  falso positivo. **Destino: spec #2**, que decide si declara universo para
  `checks`, `roles` y `reglas` o acepta el residual por escrito.
- **F-SPEC-018-8 (ronda 2) — un marcador mal formado suprime el marcado
  obligatorio.** En `gramatica-cifra-con-valor-rojo` salta B2, pero la cifra que
  acompaña no se reporta además como «sin marcador válido», porque el enunciado
  contiene *algo* que parece un marcador. El caso sale rojo igual y ningún
  veredicto cambia, pero un documento real podría acumular las dos faltas y ver
  solo una. **Destino: spec #2**, al escribir los mensajes.

## Findings del verificador — ronda 1 (2026-07-28)

**F-V-1 — Seis de los trece casos VERDES no pueden salir verdes. BLOQUEANTE.**
`LEEME.md` publica el bucle de consumo de la spec #2 como
`checkAfirmaciones(doc, raiz)` sobre el **documento entero**, comparando `ok`
contra `caso.veredicto`. Bajo ese bucle, seis documentos declarados VERDES
contienen infracciones de M1 o M3 relativas a `arbol.json`
(`docs/_qa/SPEC-018/sonda-veredictos.out.txt`):

| Caso (declara verde) | Por qué sale ROJO |
|---|---|
| `numero-en-identificador-verde` | cita `RN-08`, `ADR-011` y `SPEC-017`; el árbol simulado solo materializa RN-01..RN-05, ADR-001 y SPEC-001 → tres referencias colgadas para M1 |
| `M3-marca-volatil-verde` | cita `SPEC-002`, que no está en el árbol simulado |
| `M1-ruta-fragmento-verde` | cita `ADR-012`, que no está en el árbol simulado |
| `M2-enumeracion-tabla-verde` | cita la ruta anclada `docs/fundacion/dominio.md`, que no está en el árbol simulado |
| `M2-cifra-marcada-adaptadores-verde` | «El método se empaqueta **hoy** en tres adaptadores»: `hoy` es léxico de volatilidad (ADR-012, tabla de medición y cláusula (c)) sin exención |
| `M3-exencion-explicita-verde` | cita `EPIC-003` (dentro del motivo del marcador), ausente del árbol simulado |

Los dos primeros son los graves, y por lo que son: `numero-en-identificador-verde`
existe para fijar que un número dentro de un identificador no es una cifra, y lo
hace eligiendo tres identificadores que su propio árbol no tiene;
`M3-marca-volatil-verde` es el ejemplar de «así se dice bien en forma R» y sale
rojo. El corpus enseña que la reformulación que RN-12 recomienda no pasa el
check.
La lectura caritativa —«cada caso solo ejerce su mecanismo declarado»— no salva
el finding: `M1-ruta-fragmento-verde` declara `mecanismo: M1` y aun así falla M1,
y `numero-en-identificador-verde` declara `mecanismo: ninguno`, con lo que bajo
esa lectura no ejerce nada y es un caso vacío.
*Consecuencia para la spec #2*: la única forma de poner esos seis en verde sin
tocar el corpus es recortar el check (dejar de resolver identificadores, sacar
`hoy` del léxico, ignorar rutas ancladas), que es exactamente el ablandamiento
que ADR-011 §5 prohíbe y que `LEEME.md` dice que los verdes existen para impedir.
*Ojo al arreglarlo*: meter `RN-08` en `arbol.json` sube la cardinalidad de
`reglas` y rompe el «cinco» de `M2-cifra-marcada-reglas-verde`. No es un parche
mecánico.

**F-V-2 — El veredicto de ningún caso está atado al árbol simulado. BLOQUEANTE.**
`validaCorpus` valida esquema, cobertura y coherencia `casos ↔ inventario ↔
registro`, pero **nunca resuelve un inventario ni una referencia contra
`arbol.json`**. Experimento E1 (`docs/_qa/SPEC-018/mutacion-corpus.txt`): añado
un rol y quito `adapters/opencode/` del árbol simulado; con eso la prosa del caso
`M2-cifra-marcada-roles-rojo` («5 roles») pasa a ser **cierta** y la de
`M2-cifra-marcada-adaptadores-verde` («tres») pasa a ser **falsa**, y los 30
tests siguen en verde. Es decir: el corpus afirma «este caso es rojo» sin que
nada compruebe que lo es por la razón declarada. El test «CA-4: el corpus es
EJECUTABLE» materializa el árbol y luego solo comprueba que los documentos no
estén vacíos y que los rojos tengan `mensaje_esperado`; no ejerce ninguna
semántica.
*Qué haría falta*: un resolutor mínimo en el propio corpus —no el check— que,
para cada caso M1/M2, compruebe contra `arbol.json` que la afirmación del
documento es falsa cuando el caso es rojo y cierta cuando es verde. Eso es lo que
convierte la tabla en corpus.

**F-V-3 — El lado VÁLIDO de la gramática del anexo B es metadato, no evidencia.**
Experimento E3: borro la línea del marcador de
`M2-cifra-marcada-adaptadores-verde.md` (que declara `forma: cifra`, `sintaxis:
valida`) y los 30 tests siguen en verde. El lado inválido sí está protegido (el
test del fragmento literal y el de B2 leen el documento). CA-6 queda por tanto
verificado a medias: se comprueba que existe una fila con `sintaxis: valida`, no
que el documento contenga un marcador bien formado.

**F-V-4 — El léxico cerrado de M3 no se entrega en ninguna parte, y el corpus lo
contradice consigo mismo.** ADR-012 §2 dice «lista cerrada y corta» pero no la
enumera; la spec la ejemplifica en el anexo A; el corpus no la declara como dato
en ningún fichero. Resultado práctico: los casos M3 no son ejecutables sin que la
spec #2 **invente** la lista, lo que choca con el espíritu de CA-6 («la spec #2
no decide nada»). Y el corpus ya discrepa de sí mismo sobre `hoy`:
`M3-exencion-explicita-verde` lo usa **con** exención (luego lo trata como
léxico) y `M2-cifra-marcada-adaptadores-verde` lo usa **sin** exención y lo
declara verde. Sugerencia: la lista cerrada de M3 debería vivir como dato del
corpus (p. ej. `lexico.json`), con un caso que fije si `hoy` a secas es rojo.

**Observación al gate, no bloqueante — ¿obliga esto a escribir prosa para el
parser?** He mirado el corpus con esos ojos y mi lectura es: los marcadores en sí
son practicables. El caso de tabla (`M2-enumeracion-tabla-verde`) confirma lo que
dice F-SPEC-018-6: invisible al renderizar, incómodo en el fuente (la fila pasa
de ~180 a ~260 columnas). Eso se aguanta. Lo que sí me preocupa es `hoy` en el
léxico de M3: es un adverbio castellano corrientísimo («hoy existe», «hoy en
día») y, tal y como está, obliga a exención o reescritura en prosa perfectamente
honesta —el propio fixture verde tropieza con él—. Recomiendo que el gate decida
si `hoy` entra al léxico solo en construcciones concretas («hoy … exige», «hoy no
…») o si se acepta el coste de exenciones frecuentes. Es la palanca de
calibración que ADR-012 ya previó, y conviene tirarla antes de la spec #2.

**Ruling sobre la lectura de CA-10 (queda escrito, como pedía el encargo).**
La lectura del implementador es la correcta y la confirmo: CA-10 no puede leerse
al pie de la letra sobre la spec misma, porque `core/scripts/estado.mjs` escribe
en su frontmatter en cada transición y ninguna spec en curso podría cumplirlo.
La lectura vinculante es: **el diff no modifica el CONTENIDO de ninguna spec,
ledger, épica o ADR ajenos, ni el de la propia SPEC-018 más allá del frontmatter
que escribe la máquina de estados**. Verificado: el diff de la spec son 3 líneas
de frontmatter y nada más; `_epica.md` de EPIC-005 no está tocado en la rama (la
reconciliación a 17 entradas que el ledger cita ya venía en `main`, no se ha
escrito aquí). Esta lectura **no** autoriza tocar contenido de specs, ledgers,
épicas ni ADRs ajenos, y no se ha tocado ninguno.

---

## Respuesta del implementador a la ronda 1 (2026-07-29)

El RED es correcto y el diagnóstico también: el corpus validaba que estaba **bien
escrito**, no que **decía la verdad**. Los veredictos estaban declarados en
`casos.json` y ningún test los confrontaba con el árbol.

### Qué cambió, por finding

**F-V-2 (la raíz) — los veredictos ahora se DERIVAN del árbol.** Nuevo
`tools/tests/_oraculo-afirmaciones.mjs`: resuelve los inventarios del anexo D
contra `arbol.json` (`directorios`, `ficheros`, `pasos-de-PASOS`, `cabeceras`,
`manifiesto`), resuelve las referencias e identificadores de M1, parsea la
gramática del anexo B y aplica el léxico de M3. Nueva suite
`tools/tests/oraculo-afirmaciones.test.mjs` con la aserción central: **para los 25
casos, el veredicto declarado tiene que ser igual al derivado**. El validador de
esquema (`_corpus-afirmaciones.mjs`) sigue donde estaba y hace lo que hacía; lo que
faltaba era esta segunda capa, no una sustituta.

**F-V-1 — los 6 verdes imposibles.** Cuatro se arreglan **enriqueciendo el árbol**
(que era pobre, no permisivo: le faltaban `RN-06..RN-08`, `ADR-010..012`,
`SPEC-002/003/014/016/017` y `EPIC-003/004/005`) y dos **arreglando la prosa**:

| Caso | Causa | Arreglo |
|---|---|---|
| `numero-en-identificador-verde` | citaba `RN-08`, `ADR-011`, `SPEC-017` ausentes | árbol: `reglas.md` simulado pasa a RN-01..RN-08; se añaden los ADR y SPEC citados |
| `M3-marca-volatil-verde` | citaba `SPEC-002` ausente | árbol: se añade `SPEC-002` |
| `M1-ruta-fragmento-verde` | citaba `ADR-012` ausente | árbol: se añade `ADR-012` |
| `M3-exencion-explicita-verde` | `EPIC-003` en el motivo del marcador | árbol: se añade `EPIC-003` |
| `M2-enumeracion-tabla-verde` | ruta anclada `docs/fundacion/dominio.md` en la prosa introductoria | prosa: la meta-explicación se va a `nota`; el documento-ejemplo queda mínimo, que es lo que CA-4 pide |
| `M2-cifra-marcada-adaptadores-verde` | «se empaqueta **hoy** en tres adaptadores» | prosa: fuera el `hoy`. La frase tiene una cifra de inventario, así que con la regla nueva es volátil **con razón** |

Como `reglas` sube a 8 en el árbol simulado, `M2-cifra-marcada-reglas-verde` pasa
de «cinco» a «**ocho**» — que es justo el aviso que traía el finding, y ahora lo
sostiene un test en vez de la memoria de nadie.

**F-V-3 — CA-6 ya no es metadato por el lado válido.** `parseMarcadores` decide la
validez leyendo el documento, y el test «F-V-3» compara esa lectura con el campo
`sintaxis` declarado en los dos sentidos. Además, E3 del verificador queda cubierto
por «E1: borrar el marcador de un documento verde lo pone en rojo».

**F-V-4 — el léxico de M3 se entrega como dato.** Nuevo
`fixtures/afirmaciones/lexico.json` con cinco listas cerradas: volatilidad
(incondicionales + condicionados), mapa sustantivo → inventario, cardinales,
anclas de ruta y universo de miembros. El validador de esquema falla si falta
cualquiera, y si un sustantivo apunta a un inventario que no está en el registro.

### Decisiones del gate del 2026-07-29, aplicadas

1. **Un hook es lo que declara el MANIFIESTO.** `inventarios.json` pasa a
   `criterio: manifiesto`; el oráculo lee `hooks/hooks.json`, `hooks/hooks.toml` y
   `opencode.json` → `plugin[]`. Cardinalidades reales: **3 / 2 / 1**. El cambio
   destapó algo que la exclusión del prefijo `_` nunca habría arreglado:
   **`hooks-opencode` pasa de 0 a 1** porque opencode no tiene directorio `hooks/`
   y su plugin solo existe en el manifiesto.
2. **`hoy` condicionado.** Implementado en `lexico.json` como token
   `condicionado` con su motivo, y en el oráculo como «hay marca solo si el
   enunciado trae además una ruta anclada, una cifra de inventario o un nombre del
   registro». Test dedicado con los dos lados: «hoy instalar exige un build local
   desde `tools/build-adapter.mjs`» → **rojo**; «hoy, 2026-07-29, opencode 1.18.5»
   → **verde**. Esto cierra la contradicción de F-V-4 sobre `hoy`: el fixture verde
   que tropezaba ya no tropieza, y no por exención sino porque la regla nueva no lo
   considera volátil.

### E1 repetido por mí — los veredictos se mueven

Institucionalizado como **6 tests permanentes** en
`oraculo-afirmaciones.test.mjs`, para que no vuelva a ser una comprobación de una
tarde:

| Mutación del árbol | Efecto medido |
|---|---|
| **+1 rol** (`core/roles/es/sdd-orquestador.md`, 4 → 5) | `M2-cifra-marcada-roles-rojo` **rojo → verde**: «5 roles» pasa a ser cierto |
| **−`adapters/opencode/`** | `M2-cifra-marcada-adaptadores-verde` **verde → rojo** («tres» ya no cuadra); `M2-enumeracion-miembro-que-falta-rojo` **rojo → verde** (ya no falta opencode); `M2-enumeracion-no-miembro-verde` **verde → rojo**, nombrando `opencode` como no-miembro |
| **Las dos a la vez** | se mueven **≥ 4** veredictos; el test falla si se mueven menos |
| **−`PostToolUse` de `hooks.json`** | `M2-cifra-marcada-hooks-verde` **verde → rojo**, aunque el fichero `calidad.mjs` siga en el árbol — el manifiesto manda |
| **+1 check en `PASOS`** | `M2-enumeracion-completa-checks-verde` **verde → rojo**, nombrando el check que falta |
| **−`SPEC-002`** | `M3-marca-volatil-verde` **verde → rojo** por referencia colgada |
| **−marcador del documento** | `M2-cifra-marcada-adaptadores-verde` **verde → rojo** por marcado obligatorio |

Y la prueba de que el arreglo no es un árbol permisivo: evaluando los 6 verdes del
finding contra el **árbol de la ronda 1**, cuatro salen rojos con el motivo exacto
que el verificador nombró (`M1: referencia colgada 'RN-08' / 'SPEC-002' /
'ADR-012' / 'EPIC-003'`). Los otros dos salen verdes porque su arreglo fue de
prosa, no de árbol.

### Aparecidos al atar los veredictos

- **«Ningún no-miembro» no es decidible sin un universo declarado.** Los miembros
  salen del árbol, pero para saber que `Gemini CLI` es un intruso hace falta saber
  que `Gemini CLI` es un candidato. Se resuelve con `universo_de_miembros` en
  `lexico.json` (enumeración justificada, ADR-011 §2): los miembros vienen del
  árbol y las prohibiciones de una lista cerrada, nunca al revés. Hoy solo
  `adaptadores` y `harnesses` lo tienen; el resto comprueba media regla. Declarado
  en `LEEME.md` y en F-SPEC-018-7.
- **Los alias son obligatorios.** El árbol dice `claude-code` y la prosa escribe
  «Claude Code». Sin mapa de alias, toda enumeración correcta saldría roja. Va en
  el mismo `universo_de_miembros`.
- **Un marcador mal formado suprime el marcado obligatorio.** En
  `gramatica-cifra-con-valor-rojo` el fallo B2 salta, pero la cifra sin marcador
  válido no se reporta además. Es rojo igual y no cambia ningún veredicto; lo dejo
  anotado para la spec #2 en F-SPEC-018-8.

## Cómo retomar (handoff)

**Qué está hecho.** El corpus ejecutable completo bajo
`tools/tests/fixtures/afirmaciones/` (25 casos: 12 rojos, 13 verdes; 25
documentos-ejemplo; `lexico.json`; el anexo C con sus 17 entradas y el anexo D con
sus 6 inventarios, todo como datos), el validador de esquema en
`_corpus-afirmaciones.mjs`, el **oráculo** que resuelve contra el árbol en
`_oraculo-afirmaciones.mjs`, y sus dos suites (45 tests). CA-2..CA-10 cubiertos.
Los tres gates en verde: `npm test` **384/384**, `node tools/check.mjs` exit 0,
`valida` OK.

**Qué falta, y por qué falta.** Solo **CA-1**, y falta a propósito: RN-12 está
elevada, no aplicada, porque `docs/fundacion/` tiene dueño único (RN-08) y CA-9
prohíbe escribir ahí antes de la firma. En cuanto el gate firme el anexo A:
(1) rellenar la tabla de firma de este ledger **primero** —CA-9 se verifica con
`git log --follow docs/fundacion/reglas.md`, que debe mostrar el commit de RN-12
**después** de la entrada de firma—; (2) añadir el texto al final de
`reglas.md`; (3) añadir el test de CA-1 que está escrito arriba; (4) actualizar la
nota de `inventarios.json` (el inventario `reglas` pasa de 11 a 12).

**Dónde sigue el trabajo.** La spec #2 de EPIC-005 (el check) arranca leyendo
`tools/tests/fixtures/afirmaciones/LEEME.md`, que trae el bucle de RED entero. No
empieza escribiendo el parser: empieza pegando ese bucle y viéndolo fallar 25
veces. F-SPEC-018-1 y F-SPEC-018-3 ya están cerrados por el gate y aplicados;
quedan por decidir F-SPEC-018-2 (V3), F-SPEC-018-7 (universo por inventario) y
F-SPEC-018-8 (mensajes acumulados), y son decisiones, no detalles.

**Sobre el oráculo, para que no se malinterprete.**
`tools/tests/_oraculo-afirmaciones.mjs` implementa lo que SPEC-018 posee —la
gramática del anexo B (CA-6: «la spec #2 no decide sintaxis») y los resolutores
del anexo D (CA-7)—, y existe porque sin él los veredictos no se derivaban de
nada. **No es el check**: no autodescubre `docs/fundacion/**`, no aplica la tabla
de extras que mete `README.md` en el ámbito, no emite mensajes que nombren
fichero / enunciado / clase, no declara a quién ha mirado (ADR-011 §6), no está
cableado en `tools/check.mjs` ni en CI, y solo se ejerce sobre los 25
documentos-ejemplo. Si la spec #2 quiere promover esa lógica a `tools/checks/`,
es una decisión legítima y suya, con sus propios tests: `tools/tests/` no es
dependencia de producción y el check no puede limitarse a importarla.

**Lo que no hay que hacer.** No corregir ninguna de las 17 afirmaciones falsas:
son las specs #3 y #4, y arreglarlas ahora destruye el RED. No ablandar ningún
caso verde del corpus para que el check pase: los 13 verdes son la mitad que
impide que el mecanismo obligue a escribir prosa para el parser (ADR-011 §5). Y
no volver a declarar veredictos: el criterio informal del verificador es el
bueno — **si tocas el árbol y todo sigue verde, no está arreglado**.
