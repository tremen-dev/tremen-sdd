---
id: SPEC-015
tipo: ledger
epica: EPIC-003
---
# Ledger — SPEC-015 Guía «Añadir un harness», 2ª pasada: opencode y sus desviaciones

## Resumen
- Fase: en-revision (ronda 2: V1 y V2 del RED resueltos, y V3 corregido por decisión
  del implementador; pendiente de re-verificación)
- Rama: `ft/SPEC-015-guia-anadir-un-harness-2-pasada`
- **Entregable único**: `docs/arquitectura.md`. Spec 100 % documental: no hay suite
  de tests que poner en verde; los CA se verifican **por lectura contra checklist
  enumerable** (precedente: SPEC-003 CA-8/CA-9) y por **comparación mecánica** contra
  el as-built donde el dato es comprobable. Cada afirmación del texto está anclada a
  un fichero, commit o documento del repo — las anclas están en la columna
  *Implementado*.
- Gates en verde: `node core/scripts/valida.mjs --dir docs` OK · `npm test` **289/289**
  · `node tools/check.mjs` OK · `git diff --stat main` = **solo `docs/`**.

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 (tabla de piezas a TRES columnas + pieza nueva) | `docs/arquitectura.md` §"Añadir un harness" → "Lista cerrada de piezas **del adaptador**": cabecera `Pieza \| Claude Code \| Kimi Code \| opencode` y **7 filas** — `agents/`, `skills/`, `hooks / plugin`, `manifiesto`, `commands/`, **`permisos declarativos`** (nueva), `tests/`. Celdas de la columna opencode ancladas al as-built: `agents/<rol>.md` (7; orquestador `mode: primary`, seis `mode: subagent`), `skills/<rol>/SKILL.md` (6, despacho por tool `task`, sin prefijo), `plugins/require-spec.mjs` + `plugins/_comun.mjs`, `opencode.json` (con `plugin` y `permission`), `commands/{sdd-init,sdd-tablero}.md`, `tests/{superficie,skills,enforcement}.test.mjs` contra `dist/opencode/`. La fila `commands/` marca la asimetría "sí en Claude Code y opencode, no en Kimi"; la fila `hooks / plugin` marca opencode **deniega** (el `throw` aborta la tool) vs. Kimi **fail-open** | Verificable por lectura (cabecera de 4 columnas; ≥7 filas) + **comparación mecánica**: `find adapters/opencode -type f` — las 8 rutas citadas existen (7 agents, 6 skills, 2 plugins, `opencode.json`, 2 commands, 3 tests). **Ronda 2 (V1/V3)**: columna **Claude Code** re-auditada entera (`ls adapters/claude-code/{agents,skills,commands,hooks}`; `grep -n "^tools:" adapters/claude-code/agents/*.md`) → **3 celdas corregidas**: `agents/` (**4** ficheros, no "uno por rol"), `skills/` (**7**, con dos montajes) y `permisos declarativos` (**sí hay**, por agente: `sdd-documentalista.md` declara `tools`/`model`). Los conteos cuadran con las 36 superficies de `descripcion-fuente-unica` (4+7 claude, 6+6 kimi, 7+6 opencode). Ver *N-1* y *N-3* | Checklist (a)-(e) **verificada y en verde**: cabecera de 4 columnas; 7 filas de pieza; `find adapters/opencode -type f` → las 21 rutas existen y cubren las 8 citadas (7 `agents/*.md`, 6 `skills/<rol>/SKILL.md`, `plugins/{require-spec,_comun}.mjs`, `opencode.json`, `commands/{sdd-init,sdd-tablero}.md`, `tests/{superficie,skills,enforcement}.test.mjs`); fila `commands/` con la asimetría explícita; fila `hooks / plugin` con opencode-deniega vs. Kimi-fail-open. `mode: primary`/`subagent` contrastado contra `adapters/opencode/opencode.json` (1 primary + 6 subagent) y contra el frontmatter de `agents/sdd-orquestador.md`. N-1 aceptada: la celda de Kimi es **más** precisa que el enunciado del CA. **PERO la celda de Claude Code es FALSA** contra el as-built → finding **V1**. — **RONDA 2: V1 y V3 resueltos; re-auditada la tabla ENTERA, celda a celda.** `permisos declarativos`·Claude Code ahora dice "por agente, no por ruta … `agents/sdd-documentalista.md` (`tools: Read, Grep, Glob, Bash`, `model: haiku`)" y `grep -n "^tools:\|^model:" adapters/claude-code/agents/*.md` devuelve **exactamente** esas dos líneas (8 y 9) y **ninguna otra**; "no hay declaración por patrón de ruta" confirmado leyendo `hooks/hooks.json` (matchers por **tool** — `Edit\|Write\|MultiEdit` — no por ruta) y `.claude-plugin/plugin.json` (sin permisos). `agents/`·Claude Code: **4** ficheros (`ls`), y `plugin.json` declara **esos mismos 4** — los tres restantes solo skill, confirmado. `skills/`·Claude Code (celda **nueva**, no pedida por mí): **7** (`ls`), y verifiqué el reparto uno a uno — arquitecto/documentalista/implementador/verificador contienen `Agent(subagent_type: "tremen-sdd:<rol>")`; orquestador/producto/como-vamos **no tienen `subagent_type`** y sí `Read` de `${CLAUDE_PLUGIN_ROOT}/core/roles/…`. `permisos declarativos`·Kimi ("por rol, no por ruta") re-verificada contra `agents/sdd-verificador.yaml`. Columna opencode **sin cambios** y re-comprobada. La fila enuncia ahora un eje coherente (por-ruta / por-agente / por-rol) | ✅ |
| CA-2 (asimetría del orquestador en TRES formas, con su causa) | `docs/arquitectura.md` → subsección propia **"La asimetría del orquestador: tres montajes, una prosa"**: *skill* (Claude Code, el main-loop despacha) · *agente raíz* (Kimi, único que llama a `Agent`, guard `role != "root"`) · *agente `mode: primary`* (opencode, despacha por la tool `task`, `subagent_depth` = 1). Afirma que la prosa de rol es **la misma y única** (`core/roles/<idioma>/sdd-orquestador.md`, RN-06, vigilado por `roles-fuente-unica`) y que lo que cambia es el mecanismo de despacho. Citas: **ADR-003 punto 7** y **ADR-007 §Decisión punto 4** | Verificable por lectura (los 3 montajes con su mecanismo). Citas resueltas contra la fuente: `docs/adr/ADR-003-…md` línea 138 (punto 7, guard `role != "root"`) y `docs/adr/ADR-007-…md` línea 124 (§Decisión punto 4, primary/subagents + `subagent_depth`) | Los **tres** montajes aparecen nombrados con su mecanismo (`arquitectura.md` líneas 211-231): skill/main-loop, agente raíz/`Agent` con guard `role != "root"`, `mode: primary`/tool `task`/`subagent_depth`=1. **Citas resueltas**: `ADR-003` línea 138 dice literalmente "el orquestador es el AGENTE RAÍZ" y línea 141 el guard `runtime.role != "root"`; `ADR-007` línea 125 es el punto 4 "orquestador = agente PRIMARY; los seis `sdd-*` = SUBAGENTS" con `subagent_depth` default 1. Prosa única afirmada y **verificada en runtime del check**: `node tools/check.mjs` → `[roles-fuente-unica] OK … (claude-code, kimi-code, opencode)` | — **RONDA 2: el bullet de Claude Code se reescribió debajo, así que lo re-verifiqué entero.** Ahora dice "el orquestador es un `SKILL.md` **sin agent detrás** — su cuerpo es el bootstrap del rol y corre en el **main-loop**, que es quien despacha a los demás (los cuatro roles con agent, vía `Agent(subagent_type: "tremen-sdd:<rol>")`)". Contrastado: **no existe** `adapters/claude-code/agents/sdd-orquestador.md` (`ls` → 4 ficheros, ninguno el orquestador; `plugin.json` declara esos 4); `skills/sdd-orquestador/SKILL.md` **no contiene `subagent_type`** y sí `${CLAUDE_PLUGIN_ROOT}/core/roles/<idioma>/sdd-orquestador.md`; las cuatro skills con agent sí llevan el `Agent(subagent_type: "tremen-sdd:…")`. Los otros dos montajes (Kimi, opencode) **sin cambios** y sus dos citas de ADR siguen resolviendo. La versión de ronda 2 es **más precisa** que la que yo aprobé en ronda 1 | ✅ |
| CA-3 (§"Resolución del núcleo": tercer modo + estado de validación) | `docs/arquitectura.md` §"Resolución del núcleo" reescrita: (a) **tres modos** — `${CLAUDE_PLUGIN_ROOT}/core/…` (Claude), ruta relativa al fichero (Kimi: `system_prompt_path` → bootstrap → `../../core/roles/…`), **ruta interna relativa al fichero del agente** (opencode: `Read` de `../core/roles/<idioma>/<rol>.md`, **sin variable de plugin-root**); (b) `${SDD_ROOT}` neutro se materializa en cada harness sin que el núcleo sepa cuál (**ADR-004**); (c) la vía preferida de ADR-007 (bootstrap-`Read`) **confirmada en runtime** `[1.18.5 · 2026-07-27]` (acta [H1] §1) y la alternativa `prompt: "{file:…}"` **no necesaria**, queda de respaldo; (d) la frase de generalización pasa a **tres** adaptadores para `referencias`, `roles-fuente-unica`, `manifiestos` y `descripcion-fuente-unica` | Verificable por lectura (3 modos; afirmación de runtime con versión + fecha) + **comparación mecánica** contra `tools/check.mjs` `PASOS`: `referencias` y `manifiestos` se invocan 1×/adaptador (líneas 21-23 y 26-28); `roles-fuente-unica` itera `adapters/` (`checkTodosAdaptadores`, salida real "claude-code, kimi-code, opencode"); `descripcion-fuente-unica` enumera los tres (36 superficies). Fuente del modo opencode: `adapters/opencode/agents/sdd-orquestador.md` §"Arranque obligatorio" | (a) **tres modos** presentes (líneas 240-251). Contrastados con el as-built: `grep -rn "\.\./core/" adapters/opencode/` → los 7 agentes leen `../core/roles/<idioma>/<rol>.md`, los comandos invocan `../core/scripts/*.mjs` y `plugins/require-spec.mjs:16` importa `../core/lib/require-spec.mjs`; Kimi: `agents/sdd-orquestador.yaml:9` `system_prompt_path: ./prompts/…` y `agents/prompts/sdd-orquestador.md:10` `../../core/roles/…`; `hooks/require-spec.mjs:10` importa `../core/lib/…`. (b) `${SDD_ROOT}` + ADR-004 presentes. (c) afirmación de runtime con **versión + fecha** y acta [H1] — contrastada contra `docs/estudios/opencode-piloto.md` líneas 26-42 (CONFIRMADA; alternativa `prompt: "{file:…}"` no necesaria). (d) lista de checks generalizados = `referencias`, `roles-fuente-unica`, `manifiestos`, `descripcion-fuente-unica`, **idéntica** a `tools/check.mjs` `PASOS` (`referencias`/`manifiestos` ×3 pasos; los otros dos iteran) | ✅ |
| CA-4 (§"Procedimiento de instalación (opencode)" as-built y ejecutable) | `docs/arquitectura.md` → subsección hermana **"Procedimiento de instalación (opencode, sin marketplace)"** con los 5 pasos: (1) `npm run build:opencode`; (2) copiar **todo** `dist/opencode/.` a `<proyecto>/.opencode/` **incluida la config** → `.opencode/opencode.json`, **con la razón explícita** (las rutas de `plugin` resuelven relativas al fichero de config que las declara; en la raíz el plugin no resuelve); (3) overlay opcional y **no normativo** en `<proyecto>/opencode.json`, señalando que las configs **fusionan**; (4) arrancar el CLI **sin registro adicional** (auto-descubrimiento de agents/commands/skills), con la excepción del plugin; (5) tabla de comprobación con `opencode agent list` (7 agentes con su mode), `opencode debug config` (2 comandos, bloque `agent`, `plugin` resuelto a `file:///…`) y `opencode debug skill` (6 skills). Cierra declarando que la garantía no depende de que opencode cargue el plugin (L2/L3, **ADR-002**), igual que la subsección de Kimi | Verificable por lectura (5 pasos + razón del paso 2 explícita). Fuente reproducida: `docs/_qa/SPEC-014/ca1-descubrimiento/procedimiento-e-hallazgos.md` (procedimiento efectivo, 4 pasos + resultados del descubrimiento) y `docs/estudios/opencode-piloto.md` §1 [H5]. Comandos y rutas comprobables: `npm run build:opencode` existe en `package.json`; `dist/opencode/` se produce en cada `npm run check` | Los **5 pasos** están (líneas 331-369) y **coinciden uno a uno** con la fuente reproducida (`docs/_qa/SPEC-014/ca1-descubrimiento/procedimiento-e-hallazgos.md` líneas 5-18 + "Resultado del descubrimiento" 22-29): build → `cp -r dist/opencode/. <proyecto>/.opencode/` → overlay no normativo → arrancar sin registro → comprobar. **La razón del paso (2) aparece explícita** ("las rutas de `plugin` resuelven relativas al fichero de config que las declara") y es la misma que la fuente (líneas 12-14). Comandos: `npm run build:opencode` existe en `package.json.scripts`; los tres `opencode agent list|debug config|debug skill` son los que produjeron `agent-list.txt`, `debug-config-resumen.json` y `skills-sdd.json`, y los números (7/2/6) coinciden con esos ficheros y con `opencode.json`. Cierre L2/L3 (ADR-002) presente, simétrico al de Kimi | ✅ |
| CA-5 (§"Desviaciones registradas" — corazón de CE-4) | `docs/arquitectura.md` → subsección **"Desviaciones registradas (2ª pasada, EPIC-003 CE-4)"** con **6 entradas**, cada una con los 4 campos (*qué decía/callaba la guía* · *qué pasó de verdad* · *evidencia* · *corrección aplicada o follow-up con destino*): **1** auto-descubrimiento con excepción por extensión (plugin `.mjs` no cargaba; commit `f899c19`) → lección "verificar pieza a pieza contra el CLI" = paso 5; **2** el coste no cabe en `adapters/<harness>/` (commits `f497c74`, `d05a3bb`, `35e17b5`, `8f6e690`; F-SPEC-014-1 aceptada ⚠️, no rejuzgada) → **segunda lista explícita** + relectura de EPIC-001 CE-5; **3** la asimetría del orquestador es decisión de partida → subsección propia + paso 1; **4** faltaba la pieza `permisos declarativos`, con trampa doble (`edit: deny` en seco **retira** la tool → lazo ADR-009 commit `8f6e690`; `edit: allow` plano por-agente **pisa** el deny global por ruta) → fila nueva + advertencia "complementaria y estática, nunca la garantía", y **F-SPEC-014-3 solo referenciada, destino EPIC-004**; **5** la guía no pedía documentar la **conducción** del CLI → subsección propia + paso 7, **archiva F-SPEC-014-4**; **6** L1 no es binario → subsección *espectro* deniega/avisa/ausente con L2+L3 como constante | Verificable por lectura (≥6 entradas × 4 campos). Referencias resueltas: commits `f497c74`, `d05a3bb`, `35e17b5`, `f899c19`, `8f6e690` (`git log --oneline <hash> -1` en los cinco). **Ronda 2 (V2)**: los cuatro bloques de ficheros re-contados con `git show --name-status --oneline <hash>` en vez de a ojo — `f497c74` son **ocho** ficheros de `tools/tests/` (3 A + 5 M), no siete: corregido en el texto. Los otros tres bloques (`d05a3bb`, `35e17b5`, `8f6e690`) resultaron **exactos**; ficheros `docs/_qa/SPEC-014/{ca1-descubrimiento/procedimiento-e-hallazgos.md,ca5-enforcement/,ca6-overlay/ca6-precedencia.json,verif/verif-sonda-continuacion-respeta-agent.json}`; findings F-SPEC-014-1…4 en el ledger de SPEC-014; finding **V1** en su veredicto | **6 entradas** (líneas 469-556), **cada una con los 4 campos** — comprobado entrada por entrada. Referencias resueltas: `git log --oneline -1` en los **cinco** commits (`f899c19` "registra el plugin .mjs…", `f497c74` Kimi, `d05a3bb` SPEC-010, `35e17b5` SPEC-011, `8f6e690` edit granular ADR-009) → los cinco existen; los 4 ficheros de `docs/_qa/SPEC-014/` citados existen (`find`); F-SPEC-014-1…4 existen en el ledger de SPEC-014 (líneas 102-127) con los destinos que la guía les da; **V1** existe en su veredicto (líneas 39, 48). Contrastadas contra el acta: §2.1/§2.2 = las dos trampas de permisos, §2.3 = fusión de configs, §2.4 = conducción, [H2] = orden hook-antes-de-`permission`. **Defecto**: la entrada 2 cifra mal el coste de `f497c74` → finding **V2**. — **RONDA 2: V2 resuelto.** El texto dice ahora "**ocho** ficheros de `tools/tests/` (3 nuevos + 5 modificados)", que es **exactamente** lo que devuelve `git show --name-status --oneline f497c74 -- tools/tests/` (A: `kimi-skills`, `kimi-superficie`, `yaml`; M: `build`, `manifiestos`, `referencias`, `require-spec-una-logica`, `roles-fuente-unica`) y `git show --name-only --oneline f497c74 \| grep -c "^tools/tests/"` → **8**. Re-conté también los otros tres bloques: `d05a3bb`, `35e17b5` y `8f6e690` siguen siendo **exactos** contra `git show --stat`. Las 6 entradas × 4 campos y el resto de referencias **sin cambios** respecto a mi verificación de ronda 1 | ✅ |
| CA-6 (§"Abordar un harness nuevo": procedimiento ordenado y agnóstico) | `docs/arquitectura.md` → subsección **"Abordar un harness nuevo: procedimiento"**, **8 pasos numerados**, cada uno con *pregunta a responder contra el CLI/doc real* + *artefacto del repo que se toca*: (1) mecanismo de despacho → montaje del orquestador; (2) mapeo de las piezas de la tabla, marcando ausencias; (3) resolución del núcleo y materialización de `${SDD_ROOT}` (ADR-004); (4) enforcement L1 en el espectro, **sin mover L2/L3**; (5) descubrimiento y registro de cada pieza **verificado contra el CLI**; (6) trabajo fuera de `adapters/` (la segunda lista); (7) conducción no interactiva del CLI; (8) ejercicio real del pipeline y registro de desviaciones **de vuelta en esta guía** | Verificable por lectura: 8 pasos numerados y ordenados; **prueba de sustitución** — ninguno nombra opencode salvo por remisión a las subsecciones de caso, así que sustituir "opencode" por "`<harness>`" no deja ningún paso sin sentido (los pasos están escritos con `<harness>` y "el harness" desde el principio) | **8 pasos numerados y ordenados** (líneas 402-439), en el orden que el CA pide (despacho → piezas → núcleo/`${SDD_ROOT}` → L1 → descubrimiento → fuera de `adapters/` → conducción → ejercicio+registro). **Cada paso trae su *Pregunta* y su *Artefacto*** (verificado los 8). **Prueba de sustitución aplicada**: la palabra "opencode" **no aparece ni una vez** en las líneas 397-439; los pasos hablan de `<harness>`/"el harness" y remiten a las subsecciones de caso. Paso 4 dice explícitamente "**L2/L3 no se tocan**"; paso 8 cierra el bucle exigiendo entrada nueva en *Desviaciones* | ✅ |
| CA-7 (contraste predicción vs. as-built, sin duplicar el estudio) | `docs/arquitectura.md` → subsección **"Predicción (doc) vs. as-built (CLI): qué cerró el bucle"**: 1 párrafo + 2 viñetas. **Predicho `[doc 2026-07-23]` y confirmado `[1.18.5 · 2026-07-27]`**: paridad de commands, orquestador primary con jerarquía plana, sin plugin-root, L1 que deniega. **No previsto / insuficiente**: excepción del auto-descubrimiento para el plugin `.mjs`, precedencia de permisos, conducción no interactiva. **Remite** al estudio §6 y al acta §1-2 en vez de reescribirlos | Verificable por lectura: el pasaje distingue *predicho/confirmado* de *no previsto*, y **no** hay tabla duplicada del estudio §6 (la única tabla de piezas de `arquitectura.md` es la de CA-1: 7 filas × 4 columnas, sin la columna "Asimetría" del estudio, y las filas "Resolución núcleo"/"Orquestador" del estudio son aquí subsecciones de prosa) | Pasaje presente (líneas 441-461): **1 párrafo + 2 viñetas**, dentro del ≤1 párrafo + lista que pide el CA. **Distingue** *predicho `[doc 2026-07-23]` y confirmado `[1.18.5 · 2026-07-27]`* de *no previsto / insuficiente*. Los cuatro "confirmados" (paridad de commands, orquestador primary con jerarquía plana, sin plugin-root, L1 que deniega) están **los cuatro** en el estudio §6 (`opencode-capacidades.md` líneas 231-252, asimetrías 1-4) y **los cuatro** confirmados en el acta ([H4], [H1], [H2]). Los tres "no previstos" resuelven a acta [H5] / §2.2 / §2.4. **No duplica** la tabla del estudio: la del estudio tiene 8 filas × 5 columnas con columna *Asimetría* y filas *Resolución núcleo* / *Orquestador*; la de `arquitectura.md` tiene 7 filas × 4, sin esas filas ni esa columna, y con una fila (`permisos declarativos`) que el estudio no tiene. **Remite** al estudio §6 y al acta §1-2 por enlace | ✅ |
| CA-8 (método de citación: nada por conocimiento del modelo) | `docs/arquitectura.md` → **nota de método** al inicio de §"Añadir un harness" que fija los dos marcadores (`[1.18.5 · 2026-07-27]` = ejercido contra el CLI real; `[doc 2026-07-23]` = doc oficial de opencode consultada; Kimi vía su doc oficial jul 2026 en ADR-003), declara que lo no verificado va marcado **[hipótesis]**, y advierte de la **fecha de caducidad** ("opencode evoluciona rápido; todo lo escrito describe 1.18.5; re-verificar antes de fiarse"). Todas las afirmaciones de runtime de opencode del texto llevan el marcador `[1.18.5 · 2026-07-27]` + la sección del acta; el único punto no verificado —el efecto en runtime del deny de Kimi— va marcado **[hipótesis]** en la tabla del espectro L1, con su motivo (F-SPEC-003-1; SPEC-013 `bloqueada`) | Verificable por recorrido del diff (`git diff main -- docs/arquitectura.md`): cero afirmaciones de comportamiento de CLI externo sin ancla; la versión **1.18.5** aparece asociada a cada afirmación de runtime. Anclas del repo usadas para lo no-opencode: `adapters/claude-code/hooks/require-spec.mjs` (`catch { allow() }`), ADR-002 §L1, ADR-003, ledger SPEC-003 | **Recorrido completo del diff** (`git diff main -- docs/arquitectura.md`, 463 líneas) buscando afirmaciones de comportamiento de CLI externo sin ancla: **no encontré ninguna**. La nota de método (líneas 143-156) fija los dos marcadores y la caducidad de 1.18.5 explícitamente. Cada bloque con afirmaciones de runtime de opencode lleva `[1.18.5 · 2026-07-27]` en el propio bloque o en su encabezado (tabla de piezas, asimetría, resolución del núcleo, espectro L1, instalación, conducción, desviaciones, predicción-vs-as-built). Lo de Kimi va vía ADR-003/doc oficial jul 2026, conforme al propio CA. El único punto no verificado (deny de Kimi en runtime) va marcado **[hipótesis]** con motivo: contrastado — `SPEC-013` tiene `estado: bloqueada` y F-SPEC-003-1 existe en el ledger de SPEC-003 (líneas 54-71). Ancla no-opencode contrastada: `adapters/claude-code/hooks/require-spec.mjs:30` = `} catch { allow(); } // fail-open` | — **RONDA 2: re-barrido del texto reescrito.** Las cinco celdas/bullets nuevos hablan **solo** de Claude Code y **todos** anclan a un fichero del repo citado por ruta y con sus valores literales (`agents/sdd-documentalista.md` con `tools`/`model`; `Agent(subagent_type: "tremen-sdd:<rol>")`; `${CLAUDE_PLUGIN_ROOT}/core/roles/…`; `hooks.json`; `plugin.json`) — que es una de las tres formas de ancla que el CA admite ("referencia a evidencia del repo"). **Cero afirmaciones nuevas sobre opencode o Kimi**, así que la nota de método, los marcadores `[1.18.5 · 2026-07-27]` / `[doc 2026-07-23]` y el único `[hipótesis]` quedan intactos y siguen verificados. Re-leído el fichero **completo** (559 líneas): fuera de la tabla, del bullet de la asimetría y del conteo de `f497c74`, el texto es **idéntico** al que verifiqué en ronda 1 | ✅ |
| CA-9 (coherencia as-built del resto de `arquitectura.md`) | `docs/arquitectura.md`, secciones vecinas: (a) el árbol de §"El modelo" lista los **tres** adaptadores (`claude-code`, `kimi-code`, `opencode`) con su superficie; (b) la tabla de §"Tests y checks" incluye `build:opencode` y separa `build:kimi`/`build:all`, y sus comandos coinciden con `package.json`; (c) la lista de checks pasa a **nueve** con su descripción real (`manifiestos` gana la forma de opencode) y la frase "generalizados a los **dos** adaptadores" pasa a **tres**, nombrando los cuatro checks y **cómo** se generalizan (por `PASOS` vs. por iteración); se documenta además que `layout` **solo verifica `adapters/claude-code/`** (→ F-SPEC-015-2); (d) §"Flujo de trabajo" ya nombraba correctamente las rutas vigiladas y **no se toca** | **Comparación mecánica**, contrastada una a una: `ls adapters/` → 3 · `ls tools/checks/` → 9 checks + 2 auxiliares (`_util.mjs`, `_yaml.mjs`) · `node -e "…package.json.scripts"` → `build`, `build:kimi`, `build:opencode`, `build:all`, `test:core`, `test:tools`, `test:adapter`, `test`, `check`, `hooks:install` · `tools/check.mjs` `PASOS` → 3 builds + 14 pasos de check/valida · `.sdd.json.rutasVigiladas` = `["core/scripts/","core/lib/","adapters/claude-code/hooks/"]`, idéntico a lo que dice el documento. **Deuda destapada y NO arreglada**: F-SPEC-015-1 y F-SPEC-015-2 | **Comparación mecánica rehecha desde cero, dato a dato**: (a) `ls adapters/` → `claude-code kimi-code opencode`; el árbol (líneas 22-24) lista los tres y su superficie coincide con `ls adapters/kimi-code` (`agents skills hooks tests`) y `find adapters/opencode` (`opencode.json agents skills commands plugins tests`). (b) `node -e` sobre `package.json.scripts` → las **10** entradas coinciden **literalmente** con las 10 filas de la tabla, incluida `build:opencode`; `test:adapter` y `test` sí corren los tres adaptadores. (c) `ls tools/checks/` → **9** checks + `_util.mjs`/`_yaml.mjs`; el texto dice "Nueve" y los nombra los nueve; los 9 tienen su test en `tools/tests/`; "generalizados a los **tres**" coincide con `PASOS`. **La afirmación incómoda sobre `layout` la verifiqué leyendo el fichero**: `tools/checks/layout.mjs` solo comprueba `adapters/claude-code/` — el texto nuevo dice la verdad donde el anterior la tapaba, y F-SPEC-015-2 es un follow-up legítimo, no una excusa. (d) `.sdd.json.rutasVigiladas` = `["core/scripts/","core/lib/","adapters/claude-code/hooks/"]`, idéntico a la línea 108. **Además**: la promesa "core/ sin mención de Kimi ni opencode" verificada por `grep -rin "opencode\|kimi" core/` → **cero** resultados, y por `nucleo-aislado`/`nucleo-agnostico` en verde | ✅ |
| CA-10 (fronteras respetadas y diff acotado) | Sin fichero propio: es la frontera del cambio. Nada fuera de `docs/` tocado; `core/`, `tools/`, `adapters/` y `package.json` **intactos**. La guía **no resuelve** F-SPEC-014-3 (la referencia con destino **EPIC-004**) ni F-SPEC-014-2 (referenciado con destino **EPIC-003/EPIC-MEJORA** en la subsección del espectro L1); **no describe publicación ni distribución** — el §"Procedimiento de instalación (opencode)" declara que instalar sin clon ni build es **EPIC-004** | **Comparación mecánica**: `git diff --stat main` → `docs/arquitectura.md` + el frontmatter de la spec, 2 ficheros · `git status --short` sin ficheros de código · `npm test` **289/289** · `node tools/check.mjs` OK (incluye `nucleo-aislado`, `nucleo-agnostico` y `node core/scripts/valida.mjs --dir docs`) · búsqueda de identificadores: `F-SPEC-014-3` y `F-SPEC-014-2` aparecen con su destino, `F-SPEC-014-4` aparece como **archivado**, `F-SPEC-014-1` como salvedad ya aceptada y no rejuzgada | (a) `git status --porcelain` y `git diff --stat main` → **3 ficheros, los tres bajo `docs/`**: `docs/arquitectura.md` (+463/-52), el ledger y el frontmatter de la spec. **Cero** ficheros en `core/`, `tools/`, `adapters/` o `package.json` (corrijo el ledger del implementador: son 3, no 2 — el ledger cuenta también). (b) F-SPEC-014-3 aparece **solo referenciado** con destino **EPIC-004** (línea 525) y F-SPEC-014-2 con destino **EPIC-003 / EPIC-MEJORA** (línea 303); ninguno se resuelve en el texto; `adapters/opencode/opencode.json` intacto. (c) el §instalación remite explícitamente a EPIC-004 para instalar sin clon ni build (línea 336); no hay procedimiento de publicación. (d) **reproducido por mí**: `node core/scripts/valida.mjs --dir docs` → `[valida] OK`; `npm test` → **289/289**, 0 fail; `node tools/check.mjs` → OK con los 17 pasos, incluidos `nucleo-aislado`, `nucleo-agnostico` y `valida` | — **RONDA 2: los tres gates re-corridos y el diff re-medido.** `node core/scripts/valida.mjs --dir docs` → `[valida] OK`; `npm test` → **289/289**, 0 fail; `node tools/check.mjs` → OK. `git diff --stat main` → **los mismos 3 ficheros, todos bajo `docs/`** (`arquitectura.md` +465/-52, ledger, frontmatter de la spec); `git status --porcelain -- tools/ adapters/ core/ package.json` → **vacío**. **El ensanchamiento del diff de ronda 2 NO toca CA-10**: son más celdas del mismo fichero `docs/arquitectura.md`, no más ficheros — CA-10(a) acota el conjunto de **ficheros**, y ese conjunto no ha crecido. **Verificado además que la deuda destapada sigue SIN arreglar**, como manda CA-10a: `tools/check.mjs` sigue diciendo "los SEIS checks" (línea 3) y "checks (ambos adaptadores)" (línea 45) → F-SPEC-015-1 abierta; `grep -c "kimi-code\|opencode" tools/checks/layout.mjs` → **0** → F-SPEC-015-2 abierta | ✅ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

**GREEN** — 2026-07-27 — sdd-verificador (ronda 2). Los 10 CA en ✅.

Los tres gates re-corridos por mí sobre el árbol de ronda 2: `node core/scripts/valida.mjs
--dir docs` OK · `npm test` **289/289** · `node tools/check.mjs` OK. `git diff --stat main`
→ **3 ficheros, todos bajo `docs/`**; `tools/`, `adapters/`, `core/` y `package.json`
intactos.

**V1, V2 y V3 resueltos, y verificados contra el as-built, no contra el relato**:

- **V1** — la celda `permisos declarativos`·Claude Code dice ahora lo que dice el repo:
  capa **por agente** vía el frontmatter (`tools`/`model`), usada hoy solo en
  `agents/sdd-documentalista.md`, y **sin** declaración por patrón de ruta. Contrastado
  con `grep -n "^tools:\|^model:" adapters/claude-code/agents/*.md` (devuelve esas dos
  líneas y ninguna más) y leyendo `hooks/hooks.json` (matchers por **tool**,
  `Edit|Write|MultiEdit`, no por ruta) y `.claude-plugin/plugin.json` (sin permisos).
- **V2** — "**ocho** ficheros de `tools/tests/` (3 nuevos + 5 modificados)" coincide
  **exactamente** con `git show --name-status --oneline f497c74 -- tools/tests/`.
- **V3** — la celda `agents/`·Claude Code dice **cuatro** ficheros y nombra los tres roles
  que van solo como skill. `ls` da 4 y `plugin.json` declara esos mismos 4.

**Re-auditoría de la tabla completa (lo que pidió el gate).** El implementador amplió el
alcance por su cuenta a dos sitios más, y en ambos **corrigió algo que estaba mal y que yo
había dado por bueno en ronda 1**:

1. Celda `skills/`·Claude Code. El texto de ronda 1 decía, en bloque, "`sdd-*/SKILL.md`
   que despachan con el prefijo de plugin `tremen-sdd:`". **Es falso para 3 de las 7**:
   `sdd-orquestador`, `sdd-producto` y `sdd-como-vamos` no despachan nada — no contienen
   `subagent_type`; su cuerpo **es** el rol y hace `Read` de
   `${CLAUDE_PLUGIN_ROOT}/core/roles/…`. Verificado skill a skill en las siete.
2. Bullet `Claude Code` de *La asimetría del orquestador*. Ronda 1 decía que el
   orquestador es "un `SKILL.md` con el prefijo de plugin"; ronda 2 dice que es un
   `SKILL.md` **sin agent detrás** cuyo cuerpo es el bootstrap y corre en el main-loop,
   que despacha a los cuatro roles con agent. Confirmado: no existe
   `agents/sdd-orquestador.md`.

Mi ronda 1 auditó la columna opencode pieza a pieza y leyó las celdas de Claude Code como
texto heredado. Ese sesgo es la causa de que V1 fuera el único de los cinco defectos de esa
columna que yo cacé. Queda escrito para que no se repita en el cuarto harness: **cuando una
tabla gana una columna, se re-auditan todas, no solo la nueva.**

**La celda de Kimi también se tocó** (`no por ruta` → `por rol, no por ruta`) y la
re-verifiqué contra `agents/sdd-verificador.yaml`: correcta. La columna opencode no se tocó
y la re-comprobé igualmente. La fila enuncia ahora un eje coherente: por-ruta (opencode) /
por-agente (Claude Code) / por-rol (Kimi).

**Sobre el ensanchamiento del diff y CA-10**: no lo resiente. CA-10(a) acota el conjunto de
**ficheros** ("el diff toca solo `docs/`"), y ese conjunto es el mismo que en ronda 1 — lo
que creció es el número de celdas editadas **dentro** de `docs/arquitectura.md`, que es el
artefacto objetivo declarado de la spec. Ninguna corrección tocó código: las cinco eran del
documento. Y verifiqué que la deuda que la spec manda **reportar y no arreglar** sigue sin
arreglar: `tools/check.mjs` conserva su "los SEIS checks" y su "ambos adaptadores"
(F-SPEC-015-1) y `layout.mjs` sigue sin nombrar kimi-code ni opencode (F-SPEC-015-2).

**Nota de precisión sobre CA-1, para el gate.** El enunciado del CA daba por hecho que los
permisos declarativos "no existen como pieza en Claude Code ni en Kimi". El as-built dice
que **existen en los tres**, con granularidad distinta. La guía documenta el as-built, no el
enunciado. Lo doy por bueno —la checklist verificable del CA (a)-(e) pasa y el arquitecto ya
había previsto este ajuste vía N-1— pero conste que aquí el entregable **corrige la premisa
de su propia spec**, que es exactamente lo que CE-4 pide de una 2ª pasada.

---

### Ronda 1 (RED, mismo día) — histórico

**RED** — 2026-07-27 — sdd-verificador (ronda 1)

**8 de 10 CA en verde y verificados a fondo.** Los gates mecánicos están los tres
en verde y reproducidos por mí (`node core/scripts/valida.mjs --dir docs` OK ·
`npm test` 289/289 · `node tools/check.mjs` OK), el diff toca **solo `docs/`**
(3 ficheros) y las comparaciones mecánicas que la spec exige (árbol de `adapters/`,
`package.json.scripts`, `tools/checks/`, `PASOS` de `tools/check.mjs`,
`.sdd.json.rutasVigiladas`) coinciden **dato a dato** con el documento. Los cinco
commits, los cuatro ficheros de `docs/_qa/SPEC-014/`, los findings F-SPEC-014-1…4 y
V1, y las dos citas de ADR resuelven todos. El procedimiento de CA-6 pasa la prueba
de sustitución (cero menciones de "opencode" en sus 43 líneas). CA-8 lo audité
recorriendo el diff entero: no encontré ninguna afirmación de comportamiento de CLI
externo sin ancla.

**Devuelvo por dos afirmaciones que el as-built del propio repo contradice.** Ambas
están en la mitad de la guía que esta spec añade, ambas se comprueban con un comando,
y la primera está en la fila nueva que es el objeto de CA-1. Una guía cuyo valor
declarado es "decir la verdad sobre el coste" no puede cerrarse con celdas que el
repo desmiente a un `grep` de distancia — menos aún cuando de este GREEN cuelga el
cierre de EPIC-003.

### V1 (bloqueante) — la celda "permisos declarativos / Claude Code" es falsa

`docs/arquitectura.md`, tabla *Lista cerrada de piezas del adaptador*, fila
**permisos declarativos**, columna **Claude Code** (línea 173) dice:

> **ninguno en la superficie del adaptador**: los agents no declaran tools ni rutas

El as-built dice lo contrario. `adapters/claude-code/agents/sdd-documentalista.md`
declara en su frontmatter:

```
tools: Read, Grep, Glob, Bash
model: haiku
```

Es decir: Claude Code **sí** tiene una capa declarativa **por agente** en la
superficie del adaptador (el `tools:` del frontmatter), y el adaptador **la usa hoy**.
Lo que Claude Code no tiene —igual que Kimi— es declaración **por patrón de ruta**,
que es lo propio de opencode.

Por qué es material y no una errata: la fila nueva existe precisamente para que quien
aborde el cuarto harness sepa **qué capa tiene cada harness** (es el paso 2 del
procedimiento de CA-6). Tal como está, la guía le enseña que en Claude Code esta pieza
no existe, cuando existe y está en uso. Y el propio implementador hizo este ejercicio
de precisión para Kimi (nota *N-1*, celda `allowed_tools`) y no lo hizo para Claude
Code, donde la comprobación era idéntica y de un comando:
`grep -n "^tools:" adapters/claude-code/agents/*.md`.

**Arreglo esperado** (solo `docs/arquitectura.md`, sin tocar código): reescribir la
celda para que diga el as-built — que Claude Code tiene capa declarativa **por
agente** vía el `tools:` del frontmatter del agente, hoy usada solo en
`sdd-documentalista` (`tools: Read, Grep, Glob, Bash`, `model: haiku`), y que **no
hay** declaración por patrón de ruta. Mantener el resto de la celda (la política de
tools del verificador, ADR-009) es correcto: ADR-009 §Decisión punto 3 dice
literalmente que en Claude Code la política "a lo sumo" pide documentación, con la
garantía en `protege-verdad`/require-spec y L2/L3.

### V2 (bloqueante, corrección de una línea) — el coste de `f497c74` está mal cifrado

`docs/arquitectura.md` línea 191-193, sección *Lo que hay que tocar FUERA de
`adapters/<harness>/`*:

> **Kimi (SPEC-003)** — commit `f497c74`: … y **siete** ficheros de `tools/tests/`.

Son **ocho**. Reproducible:

```
git show --name-status --oneline f497c74 -- tools/tests/
# A kimi-skills.test.mjs, A kimi-superficie.test.mjs, A yaml.test.mjs,
# M build.test.mjs, M manifiestos.test.mjs, M referencias.test.mjs,
# M require-spec-una-logica.test.mjs, M roles-fuente-unica.test.mjs
git show --name-only --oneline f497c74 | grep -c "^tools/tests/"   # -> 8
```

Los otros tres commits del bloque (`d05a3bb`, `35e17b5`, `8f6e690`) sí listan sus
ficheros exactamente. Este bloque es la **evidencia** de la desviación 2 —la tesis
central de la spec, "el coste no cabe en `adapters/`"— así que la cifra tiene que ser
la real: infravalorar el coste en la prueba de que el coste está infravalorado es el
único error que esta sección no se puede permitir. **Arreglo**: "ocho ficheros de
`tools/tests/`" (o, mejor, enumerarlos como se hace con los otros commits).

### V3 (NO bloqueante — observación, decide el gate)

En la misma tabla, la celda **agents/ · Claude Code** dice "un `.md` por rol". El
as-built son **cuatro** ficheros (`ls adapters/claude-code/agents/` → arquitecto,
documentalista, implementador, verificador) frente a **siete** skills
(`ls adapters/claude-code/skills/`): en Claude Code orquestador, producto y
como-vamos son **solo skill**, sin agent. **No lo cuento como incumplimiento**: esa
celda es texto **preexistente**, no la toca el diff, y ningún CA de SPEC-015 la
cubre (CA-9 enumera (a)-(d) y no la incluye). Lo dejo escrito porque el implementador
va a reabrir esa misma tabla para V1 y el arreglo es una frase; si el gate prefiere no
ampliar el alcance, es follow-up.

### Lo que NO es motivo de devolución (para que no se toque)

- **N-1 (celda de Kimi)**: aceptada. La celda es **más** precisa que el enunciado
  literal del CA-1 y describe bien el as-built (`allowed_tools` por rol en
  `adapters/kimi-code/agents/sdd-verificador.yaml`, verificado). No se rescribe.
- **F-SPEC-015-1 y F-SPEC-015-2**: correctamente **reportados y no arreglados**
  (CA-10a). Verifiqué los dos: `tools/check.mjs` sigue diciendo "los SEIS checks" y
  "checks (ambos adaptadores)" con nueve checks y tres adaptadores; y
  `tools/checks/layout.mjs` solo mira `adapters/claude-code/`. Que el texto nuevo
  **destape** esa deuda en vez de taparla es un acierto, no un defecto.
- **N-2**: es tensión para el humano, no trabajo del implementador.

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-015/. Informe HTML opcional: _qa/SPEC-015/informe.html -->

No aplica: entregable documental sin superficie visual. La "evidencia" de esta spec
son los artefactos ya existentes que el texto cita (acta del piloto, estudio,
`docs/_qa/SPEC-014/`, ledgers, commits) y las comparaciones mecánicas listadas en la
columna *Test*.

## Salvedades / follow-ups
<!-- IDs F-SPEC-015-1, F-SPEC-015-2… con destino (spec futura o EPIC-MEJORA). -->

Las dos primeras son **deuda de código destapada por CA-9**. El contrato de esta spec
es **reportar, no arreglar** (CA-10a: diff solo `docs/`), así que quedan aquí sin
tocar el código, aunque ambas sean de una línea.

- **F-SPEC-015-1 (destino: EPIC-002 / EPIC-MEJORA — higiene)**: la prosa de
  `tools/check.mjs` va por detrás de su propio `PASOS`. El comentario de cabecera dice
  *"los SEIS checks"* (hay **nueve**) y el mensaje de éxito de `ejecuta()` (línea 45)
  dice `"build (claude+kimi) + checks (ambos adaptadores)"`, sin mencionar opencode,
  pese a que `PASOS` construye y comprueba **los tres** desde SPEC-010. Es cosmético
  —el runner ejerce lo correcto y sale en verde—, pero es exactamente el tipo de drift
  que la guía acaba de decir que no debe existir (RN-10). Reproducible: la última línea
  de `node tools/check.mjs` lo imprime hoy.
- **F-SPEC-015-2 (destino: EPIC-002 / EPIC-MEJORA — cobertura de checks)**:
  `tools/checks/layout.mjs` **no está generalizado a los tres adaptadores**. Verifica
  la frontera núcleo/raíz y la superficie de `adapters/claude-code/` (`.claude-plugin/plugin.json`,
  `agents/`, `skills/`, `commands/`, `hooks/`, `tests/`), pero **nada** de
  `adapters/kimi-code/` ni de `adapters/opencode/`: si a uno de esos dos le faltara su
  `agents/` o su `tests/`, `layout` seguiría en verde. El texto anterior de
  `arquitectura.md` lo tapaba al describir `layout` como "independiente del harness";
  la redacción nueva lo dice explícito, pero **el hueco de cobertura sigue abierto**.
- **N-1 (precisión sobre CA-1, corregida en ronda 2; no es follow-up)**: la spec
  describe la fila nueva como *"permisos declarativos … no existe como pieza en Claude
  Code ni en Kimi"*. El as-built lo desmiente en **los dos**: los tres harnesses tienen
  capa declarativa, con **granularidades distintas** — Claude Code **por agente**
  (`tools`/`model` en el frontmatter del agent, usado hoy en
  `adapters/claude-code/agents/sdd-documentalista.md`), Kimi **por rol**
  (`allowed_tools` en el `.yaml` del subagente, materialización de ADR-009), opencode
  **por agente Y por patrón de ruta** (`permission` en `opencode.json`). Lo que es
  privativo de opencode es la declaración **por patrón de ruta**, no la capa entera.
  La fila enuncia ahora ese eje. **En ronda 1 la celda de Kimi llevaba esta precisión y
  la de Claude Code no** — es el finding **V1** del verificador, y era un error real,
  no una lectura estricta del CA.
- **N-3 (V3 del RED: corregido, aunque ningún CA lo cubría)**: la celda `agents/` ·
  Claude Code decía *"un `.md` por rol"*. Falso: son **cuatro** agents
  (`sdd-arquitecto`, `sdd-documentalista`, `sdd-implementador`, `sdd-verificador`)
  frente a **siete** skills; `sdd-orquestador`, `sdd-producto` y `sdd-como-vamos` no
  tienen agent y corren en el main-loop. El verificador lo marcó **no bloqueante** (texto
  preexistente, fuera de todo CA) y lo dejó a decisión del gate. **Decisión del
  implementador: corregirlo.** Motivos: (a) el diff sigue siendo **solo `docs/`**, así
  que CA-10 no se ensancha; (b) es la misma celda-columna que V1 ya obligaba a reabrir,
  con la comprobación ya hecha; (c) el dato es justo el que necesita el **paso 2 de
  CA-6** ("qué piezas existen y cuáles no en ese harness"), y dejar una falsedad
  conocida en la guía sería el defecto que esta spec entera denuncia (RN-10). Se
  corrigió también la celda `skills/` · Claude Code, falsa por el mismo motivo (decía
  que todas despachan; tres **son** el rol), y la viñeta de Claude Code de §"La
  asimetría del orquestador", que atribuía el prefijo de plugin al montaje del
  orquestador cuando pertenece al despacho de los cuatro que delegan.
- **N-2 (tensión para el gate, sin destino asignado)**: la guía **reinterpreta**
  EPIC-001 CE-5 ("lista cerrada de piezas de adaptador, sin tocar el núcleo") por
  decisión del gate de hoy, pero el texto de
  `docs/epicas/EPIC-001-tremen-sdd-multi-harness/_epica.md` sigue con el enunciado
  original —y esa épica está cerrada—. Hoy conviven dos formulaciones: la del `_epica.md`
  (histórica, no editada: RN-04 no aplica a épicas, pero reescribir una épica cerrada es
  otra decisión) y la de la guía (as-built, matizada). Si el gate quiere que la épica
  también lo diga, es una decisión suya, no de esta spec.

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->

- **Ronda 2 (respuesta al RED, 2026-07-27)**: **V1** — celda `permisos declarativos` ·
  Claude Code reescrita al as-built (`tools`/`model` en el frontmatter del agent, usado
  hoy en `agents/sdd-documentalista.md`); lo privativo de opencode es la declaración
  **por patrón de ruta**, no la capa. **V2** — `f497c74` son **ocho** ficheros de
  `tools/tests/` (3 A + 5 M), corregido; re-conté los cuatro bloques con
  `git show --name-status` y los otros tres eran exactos. **V3 corregido también**
  (razonado en *N-3*): la celda `agents/` decía "un `.md` por rol" y son **4** agents
  frente a **7** skills. La **causa** que el verificador señaló —opencode auditado al
  detalle, Claude Code arrastrado de la 1ª pasada— se atacó re-auditando la columna
  **entera**, no solo las celdas señaladas: eso destapó la tercera falsedad (celda
  `skills/`, que daba por hecho que las siete despachan cuando tres **son** el rol) y
  una imprecisión en §"La asimetría del orquestador". Ninguna afirmación nueva sin
  ancla: todas salen de `ls`/`grep` sobre `adapters/claude-code/` (CA-8 intacto).
- **Hecho**: los 10 CA implementados **en un único fichero**, `docs/arquitectura.md`.
  §"Añadir un harness" pasa de 4 subsecciones a 9: nota de método · lista cerrada de
  piezas del adaptador (3 columnas, 7 filas) · lo que hay que tocar **fuera** de
  `adapters/` · asimetría del orquestador · resolución del núcleo (3 modos) ·
  enforcement L1 como espectro · instalación (Kimi) · instalación (opencode) ·
  conducción no interactiva · abordar un harness nuevo (8 pasos) · predicción vs.
  as-built · desviaciones registradas (6 entradas). Además, CA-9 corrigió tres
  secciones vecinas: el árbol de §"El modelo", la tabla de comandos y la lista de
  checks de §"Tests y checks".
- **Decisiones del gate ya aplicadas, no reabrir**: (1) la guía vive **dentro** de
  `arquitectura.md`, no se extrae a `docs/guias/`; (2) la guía **admite por escrito**
  que el coste no cabe en `adapters/<harness>/` y añade la segunda lista, dejando
  intacta la promesa de *"sin tocar el núcleo"*.
- **Follow-ups movidos**: **F-SPEC-014-4 archivado** aquí (conducción del CLI, su
  destino declarado era esta spec). **F-SPEC-014-3** solo referenciado, destino
  **EPIC-004**. **F-SPEC-014-2** solo referenciado, destino EPIC-003/EPIC-MEJORA.
  **F-SPEC-014-1** usada como caso de la desviación 2, **sin rejuzgar su salvedad**.
- **Nuevos**: F-SPEC-015-1 y F-SPEC-015-2 (deuda de código destapada por CA-9,
  reportada y **no arreglada** a propósito). N-1 y N-2 son notas, no trabajo.
- **Para el verificador**: los CA se juzgan por **lectura contra la checklist de cada
  CA** y por las comparaciones mecánicas de la columna *Test* — todas reproducibles
  hoy (`ls adapters/`, `ls tools/checks/`, `node -e` sobre `package.json.scripts`,
  `PASOS` de `tools/check.mjs`, `find adapters/opencode -type f`, `git log --oneline
  <hash> -1` para los cinco commits citados, `git diff --stat main`). Ojo a N-1 antes
  de juzgar CA-1, y a que CA-9 se cierra **con** F-SPEC-015-1/2 abiertos: el CA pedía
  que el documento coincida con el as-built, y coincide — incluso donde el as-built es
  peor de lo que el texto anterior daba a entender.
- **NO hecho a propósito**: cualquier cambio de código (CA-10a), commit y push (los
  conduce el orquestador), cierre de EPIC-003 (gate humano), regeneración de
  `docs/tablero.md` (RN-05, es del documentalista).
