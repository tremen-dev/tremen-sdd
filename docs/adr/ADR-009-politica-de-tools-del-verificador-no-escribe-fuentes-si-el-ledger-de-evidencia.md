---
id: ADR-009
tipo: adr
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-07-25, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-25, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# ADR-009: Politica de tools del verificador no escribe fuentes si el ledger de evidencia

- Deciders: propone sdd-arquitecto; aprueba el humano (pendiente, gate humano).
- Specs relacionadas: **SPEC-013** (cierre CE-2, verificación end-to-end contra el
  CLI real de Kimi) lo origina y lo consume: resuelve en runtime la tensión que este
  ADR fija como política. **Complementa** ADR-003 (modelo de orquestación de Kimi,
  punto 7.c "`allowed_tools` explícito por rol"; deja como [ABIERTO] la herencia de
  tools a re-verificar en runtime) y ADR-006 (anatomía de un gate: el verificador
  cierra `hecho` y, por tanto, escribe su ledger de evidencia como trabajo legítimo,
  no como invasión). **NO supersede** a ninguno (RN-04). Origen: EPIC-001, CE-2.

## Contexto

ADR-003 (punto 7, "herencia de herramientas por subagente") fijó que el adaptador
Kimi declara `allowed_tools` **explícito** por rol —"escritura para el implementador;
**read-only** para verificador y como-vamos"— y dejó esa herencia como asunción
**[ABIERTO]**, a re-verificar contra el CLI real (diferida a F-SPEC-003-1). SPEC-003
la materializó al pie de la letra: `adapters/kimi-code/agents/sdd-verificador.yaml`
declara `allowed_tools` = Read/Grep/Glob/Bash, **sin Write ni Edit**.

El verificador de SPEC-003 constató la **tensión** al escribir su propio ledger
(`SPEC-003-...ledger.md`, sección "Tensiones constatadas"): el rol **sdd-verificador
escribe el ledger de evidencia** —es parte de su contrato (rellena la matriz de CA,
el veredicto GREEN/RED y las salvedades) y ADR-006 lo reconoce como trabajo suyo—,
pero un `allowed_tools` **puramente read-only** (sin Write/Edit) se lo **impediría**
en un runtime que lo respete. La política "read-only" de ADR-003 era imprecisa:
confundió "no toca **fuentes** (código, rutas vigiladas, docs de verdad)" —que sí es
el invariante deseado (RN-08, y el espíritu de que el juez no altera lo juzgado)—
con "no escribe **nada**", que rompe la propia función del rol.

La pregunta que este ADR fija: **¿cuál es la política de `allowed_tools` del
verificador, cross-harness, que le permite hacer su trabajo (escribir el ledger) sin
poder alterar lo que juzga (fuentes)?** No es una cuestión de Kimi: es una frontera
del rol que vale para todo adaptador (Claude Code, Kimi, opencode/EPIC-003). Kimi
solo la sacó a la luz porque su modelo de tools por subagente es explícito y
potencialmente restrictivo.

## Decisión

**La política de tools del verificador es "no escribe FUENTES, SÍ escribe su
LEDGER". El `allowed_tools` del `sdd-verificador` de cada adaptador DEBE permitirle
escribir su fichero de ledger de evidencia (`*.ledger.md` de la spec en curso) y NO
debe permitirle escribir fuentes: código, rutas vigiladas (`.sdd.json.rutasVigiladas`),
ni documentos de verdad (`FOUNDATION.md`, `docs/fundacion/`). Un `allowed_tools`
puramente read-only —sin ningún mecanismo de escritura— es INSUFICIENTE y queda
corregido por esta política.**

1. **Qué SÍ puede escribir el verificador**: su **ledger** (`<spec>.ledger.md`:
   matriz de CA en columnas Verif./Estado, veredicto GREEN/RED, salvedades/
   follow-ups, evidencia visual, handoff) y los artefactos de evidencia asociados
   (p. ej. `docs/_qa/SPEC-NNN/`). Escribir el ledger es la forma en que el rol
   **emite** su juicio; negárselo vacía el gate adversarial.

2. **Qué NO puede escribir el verificador** (invariante que motivaba el "read-only"):
   código y cualquier ruta bajo `.sdd.json.rutasVigiladas`; los documentos de verdad
   (RN-08); el tablero y `dist/` (RN-05, ya cubierto por `protege-verdad`). El juez
   no altera el sistema bajo prueba. "Nunca edita código" sigue siendo verdad del rol
   (su prosa y ADR-006).

3. **Cómo se declara, por harness** (política, no mecanismo único —cada harness la
   satisface con lo que ofrece):
   - **Kimi Code**: el `allowed_tools` de `sdd-verificador.yaml` incluye la
     capacidad de escritura **acotada al ledger**. La forma concreta (una tool
     `Write`/`Edit` con `allowed_tools`/`exclude_tools` o matcher de rutas que la
     limite a `*.ledger.md`/`_qa/`, o —si el runtime no permite acotar por ruta en el
     `ToolPolicy`— la escritura vía `Bash` restringida a esos destinos) la fija
     SPEC-013 contra el CLI **real**, según lo que Kimi soporte. El norte es la
     política, no una tool concreta.
   - **Claude Code**: el agente `sdd-verificador` ya opera con acceso de escritura de
     facto (escribe su ledger hoy); esta política lo **documenta y acota** —debe
     poder el ledger, no las fuentes—, sin exigir un cambio si el enforcement de
     fuentes ya lo garantizan `protege-verdad` (RN-08) y require-spec/L2/L3 (RN-01).
   - **Futuros adaptadores** (opencode, EPIC-003): heredan la política; la lista
     cerrada de piezas de adaptador (ADR-003/CA-9) la incorpora al declarar
     `allowed_tools` del verificador.

4. **La barrera dura de "no tocar fuentes" NO recae en `allowed_tools`.** El
   `allowed_tools` es *higiene/feedback* dentro del harness; la **garantía** de que
   el verificador (ni nadie) codee sin spec, edite documentos de verdad o el tablero
   la sostienen los hooks `require-spec`/`protege-verdad` (L1) y, sobre todo, git
   pre-commit + CI (L2/L3), independientes del harness (ADR-002, RN-03). Por eso
   ampliar el `allowed_tools` del verificador al ledger **no** abre un agujero: aunque
   un verificador intentara escribir una fuente, L2/L3 lo cazan. Esta separación es
   la que hace segura la política.

5. **Distinción con como-vamos**: la corrección aplica **solo** al verificador.
   `sdd-como-vamos` es genuinamente **read-only** (solo informa; no escribe ledger ni
   nada) y su `allowed_tools` sin escritura **se mantiene**. ADR-003 acertaba para
   como-vamos; erraba solo al meter al verificador en el mismo saco.

**Relación con ADR-003 y ADR-006 (COMPLEMENTA, no supersede).** ADR-003 sigue
vigente e inmutable: su decisión nuclear (orquestador = raíz, resolución por ruta
interna, `allowed_tools` **explícito** por rol) se mantiene; este ADR solo **precisa
el contenido** de ese `allowed_tools` para un rol —el verificador— resolviendo el
punto que ADR-003 mismo dejó [ABIERTO] ("herencia de tools a re-verificar en
runtime"). ADR-006 sigue vigente: que el verificador escriba el ledger y cierre
`hecho` es su trabajo legítimo, no invasión de gate; este ADR le da la **capacidad
de tool** coherente con esa atribución. No hay contradicción con ninguno.

**Asunción [ABIERTO] hasta el CLI real (la cierra SPEC-013)**: que el `ToolPolicy`
de Kimi permita **acotar la escritura por ruta** (limitar Write/Edit a `*.ledger.md`).
Si no lo permitiera —solo escritura total o nada—, SPEC-013 documentará el
compromiso elegido (escritura vía Bash acotada, o Write total con la barrera dura
delegada a L2/L3) sin cambiar esta política: "el verificador escribe su ledger" es
el requisito; el mecanismo lo fija la spec según el runtime.

## Consecuencias
### Positivas
- **El rol verificador puede hacer su trabajo en todo harness** sin que un
  `allowed_tools` mal calibrado lo bloquee; la tensión de SPEC-003 queda resuelta como
  política, no como parche puntual.
- **Frontera explícita y verificable**: "ledger sí, fuentes no" es una regla que un
  check o una prueba de runtime puede ejercer (SPEC-013 la ejerce contra Kimi real).
- **Coherencia con ADR-006**: la atribución (el verificador cierra `hecho`/escribe el
  ledger) y la capacidad de tool dejan de estar en tensión.
- **Sin coste de seguridad**: la garantía dura no dependía del `allowed_tools`
  (recae en L2/L3), así que ampliar al ledger no relaja ningún invariante.

### Negativas / follow-ups
- **Depende de la granularidad del `ToolPolicy` de cada harness**: si un harness no
  permite acotar la escritura por ruta, la política se cumple con un mecanismo más
  tosco (Bash acotado o escritura amplia + barrera L2/L3). Coste asumido; lo
  documenta SPEC-013 por harness.
- **Revisión de los adaptadores existentes**: `sdd-verificador.yaml` de Kimi
  (read-only puro hoy) requiere ajuste si SPEC-013 confirma el bloqueo en runtime; el
  de Claude Code, a lo sumo, documentación. Trabajo acotado, gobernado por SPEC-013.
- **EPIC-003 (opencode)** debe aplicar esta política al declarar el `allowed_tools`
  de su verificador; queda como nota para esa épica, no bloquea.

## Alternativas consideradas
<!-- Cada una con el motivo de rechazo. -->
- **Mantener el verificador puramente read-only (statu quo de ADR-003) y que
  "escriba" el ledger por otra vía (p. ej. el raíz/orquestador escribe lo que el
  verificador dicta).** RECHAZADA: rompe el aislamiento del subagente y la atribución
  de ADR-006 (el ledger es del verificador, con su `por: sdd-verificador`); mediar la
  escritura por otro rol enturbia quién firma qué y añade acoplamiento entre roles.
- **Dar al verificador escritura total sin acotar (Write/Edit sin restricción).**
  RECHAZADA como política nominal: aunque L2/L3 impedirían el daño real, declarar
  escritura irrestricta contradice el espíritu "el juez no toca lo juzgado" y degrada
  el feedback L1 (el hook/tool ya no expresa la frontera). Se admite **solo** como
  compromiso documentado si el runtime de un harness no permite acotar por ruta
  (punto 3/[ABIERTO]), no como decisión por defecto.
- **Tratar la tensión como defecto de implementación de SPEC-003 y arreglar solo el
  YAML de Kimi sin ADR.** RECHAZADA: la frontera "ledger sí, fuentes no" es
  cross-harness y constriñe todo adaptador presente y futuro (Claude, Kimi, opencode);
  es una decisión de rol, no un bug local. Registrarla como ADR evita que cada
  adaptador la reinvente (o la olvide) y da al implementador un norte estable.
- **Superseder ADR-003 con uno nuevo que reescriba su punto 7.** RECHAZADA:
  innecesario y prohibido por RN-04 para lo aprobado. ADR-003 dejó la herencia de
  tools **explícitamente [ABIERTO]**; cerrar ese hueco es **complementar**, no
  cambiar la decisión nuclear (orquestación/resolución) que sigue intacta.

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
