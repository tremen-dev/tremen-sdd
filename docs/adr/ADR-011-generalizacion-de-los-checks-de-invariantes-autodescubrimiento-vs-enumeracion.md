---
id: ADR-011
tipo: adr
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-07-27, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-27, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# ADR-011: Generalizacion de los checks de invariantes autodescubrimiento vs enumeracion

- Deciders: propone sdd-arquitecto; aprueba el humano (pendiente, gate humano de SPEC-017).
- Specs relacionadas: **SPEC-017** (EPIC-FIX) lo origina y lo consume: generaliza
  `tools/checks/layout.mjs` a todos los adaptadores y necesita una regla escrita para
  elegir el mecanismo. **Complementa** ADR-001 (estructura del repo para multi-harness:
  este ADR dice cómo se *comprueba* esa estructura cuando hay N harnesses) y ADR-007
  (encaje de opencode: la fuente de que las superficies de los adaptadores difieren por
  diseño). **NO supersede** a ninguno (RN-04). Antecedente: F-SPEC-015-2, destapado por
  SPEC-015.

## Contexto

`tools/checks/` alberga nueve checks de invariantes que ejerce CI. Con **tres**
adaptadores (`claude-code`, `kimi-code`, `opencode`) y más previstos, cada check tuvo que
resolver por su cuenta "¿cómo cubro N harnesses?". El resultado, as-built, son **tres
mecanismos distintos conviviendo sin que nadie haya escrito por qué**:

1. **Autodescubrimiento**: `roles-fuente-unica` itera el directorio `adapters/` leyendo el
   FS (`checkTodosAdaptadores`) y aplica la misma regla a lo que encuentre. Un harness
   nuevo queda cubierto **el día que se crea su directorio**, sin tocar código.
2. **Enumeración en el runner**: `referencias` y `manifiestos` reciben el harness como
   argumento y `tools/check.mjs` los invoca **una vez por adaptador** desde `PASOS`, con
   ramas por harness dentro del check. Un harness nuevo exige **añadir el paso y la rama**.
3. **Enumeración interna**: `descripcion-fuente-unica` enumera dentro del propio check las
   superficies de los tres.

Y un cuarto caso, que es el defecto que motiva este ADR: **`layout` no se generalizaba en
absoluto** — tenía `adapters/claude-code` cableado y **daba verde sobre adaptadores que no
miraba**. Un check que miente sobre su propia cobertura es peor que no tenerlo.

La tentación fácil sería decretar un único mecanismo para todos. Sería un error: los tres
casos no validan lo mismo. `manifiestos` **no puede** autodescubrirse sin más, porque *qué
es un manifiesto válido* **depende del harness** (plugin.json de Claude Code, agentes YAML
+ mapa `subagents` de Kimi, `opencode.json` de opencode): un harness desconocido no tiene
regla que aplicar, y aplicarle la de otro sería inventar. En cambio "un adaptador tiene su
superficie completa en el árbol" es un invariante **común a cualquier adaptador**, y ahí el
cableado solo produce huecos.

Hay además una asimetría de **modo de fallo** que decide el reparto:

- Un check **autodescubierto** que no conoce el harness nuevo le aplica igualmente la regla;
  su riesgo es el **falso positivo** (acusar a un harness de no tener algo que legítimamente
  no tiene — p. ej. exigir `hooks/` a opencode, que usa `plugins/`). Falla **ruidosamente**,
  y un rojo falso se detecta el mismo día.
- Un check **enumerado** que no conoce el harness nuevo falla **en silencio**: no lo mira y
  sale verde. Su riesgo es el **falso negativo**, que es el que erosiona la confianza (RN-03)
  y el que acaba de costar F-SPEC-015-2.

## Decisión

**El mecanismo de generalización de un check lo determina la naturaleza de su invariante,
no la comodidad de quien lo escribe.**

1. **Invariante común a cualquier adaptador → AUTODESCUBRIMIENTO (por defecto).** El check
   itera `adapters/` leyendo el sistema de ficheros y aplica la regla a cada adaptador que
   encuentre. **Ningún nombre de harness es necesario para que la comprobación ocurra.**
   Patrón de referencia: `tools/checks/roles-fuente-unica.mjs`. `layout` pasa a este grupo
   (SPEC-017).
2. **Validación específica del harness → ENUMERACIÓN explícita**, con su paso por adaptador
   en `PASOS` de `tools/check.mjs` (o su tabla interna). Se aplica **solo** cuando la regla
   a validar *no existe* sin conocer el harness. `referencias`, `manifiestos` y
   `descripcion-fuente-unica` se quedan aquí, y su enumeración queda **justificada**, no
   tolerada.
3. **Cuando un invariante es común "en su núcleo" pero la superficie difiere por harness**
   —el caso de `layout`— el check se parte en dos:
   - **mínimo común**, autodescubierto y exigido a **todos** (regla 1);
   - **extras por harness**, en una **tabla declarativa** dentro del check. Un adaptador
     **no declarado** se juzga **solo** por el mínimo común y **no falla** por carecer de
     los extras de otro; un adaptador **declarado** debe existir y cumplir sus extras.
   Esto evita a la vez el falso negativo (regla 1 cubre lo nuevo) y el falso positivo
   (regla 3 no exige `commands/` a kimi-code ni `hooks/` a opencode — ADR-007).
4. **Las listas de "esto no puede estar aquí" son CERRADAS y explícitas, nunca derivadas del
   FS.** En concreto, la superficie de adaptador prohibida en la raíz del repo se declara
   como constante. Derivarla de `readdir(adapters/*)` haría que un adaptador con un
   directorio llamado `docs`, `core` o `tools` convirtiera en infracción el `docs/`,
   `core/` o `tools/` legítimos de la raíz. **El autodescubrimiento se usa para ampliar
   cobertura, jamás para ampliar la lista de prohibiciones.**
5. **Un check nunca se ablanda para pasar a verde.** Si al generalizar aparece un rojo real,
   se para y se escala al gate humano; retirar una comprobación o degradar un extra a
   opcional para conseguir el verde queda **prohibido** (SPEC-017 CA-7).
6. **Cada check declara a quién ha mirado.** Su mensaje de éxito nombra los adaptadores
   efectivamente recorridos, como ya hace `roles-fuente-unica`. Un verde anónimo no permite
   distinguir "los miré todos" de "no miré ninguno" — que es exactamente cómo F-SPEC-015-2
   pasó desapercibido.

## Consecuencias
### Positivas
- El harness **nº4** queda cubierto por los checks de invariante común el día que se crea su
  directorio: el agujero no se hereda.
- Desaparece la clase de fallo "verde por no mirar" en los checks de estructura, la más
  dañina porque produce confianza injustificada (RN-03).
- La convivencia de mecanismos deja de ser un accidente y pasa a ser una regla con criterio;
  quien añada un check tiene una pregunta que responder ("¿mi invariante existe sin conocer
  el harness?") en vez de un precedente que copiar al azar.
- El punto 6 hace **auditable** la cobertura desde la salida del propio check.

### Negativas / follow-ups
- La tabla de extras del punto 3 **sigue siendo enumeración**: un harness nuevo con
  superficie propia no gana cobertura de sus extras hasta que alguien lo declare. Se acepta:
  el mínimo común lo cubre desde el día cero, y el fallo residual es de **menos** cobertura,
  nunca de falso positivo.
- Coexistirán durante mucho tiempo checks autodescubiertos y enumerados; leer
  `tools/checks/` seguirá exigiendo saber cuál es cuál. Mitigación: `docs/arquitectura.md`
  §"Tests y checks" lo documenta y cita este ADR.
- Este ADR **no** reordena los checks existentes que ya enumeran: `referencias`,
  `manifiestos` y `descripcion-fuente-unica` se quedan como están (SPEC-017 los declara
  fuera de alcance). Si algún día se demuestra que alguno valida en realidad un invariante
  común, será otra spec — no una excepción tácita a este ADR.
- El autodescubrimiento lee el FS en cada ejecución: cualquier directorio suelto bajo
  `adapters/` se interpretará como adaptador y se le exigirá el mínimo común. Es el
  comportamiento deseado (un adaptador a medio crear debe salir rojo), pero conviene saberlo.

## Alternativas consideradas
<!-- Cada una con el motivo de rechazo. -->

- **Un único mecanismo para todos: autodescubrimiento en los nueve checks.** Rechazada:
  `manifiestos` y `referencias` validan reglas que **no existen** sin conocer el harness;
  aplicarle a un harness desconocido la regla de otro sería inventar un contrato y produciría
  falsos positivos en el sitio más caro (CI en rojo por algo que no es un defecto).
- **Un único mecanismo para todos: enumeración explícita, también en `layout` (un paso por
  adaptador en `PASOS`).** Rechazada: es exactamente el mecanismo cuyo modo de fallo es el
  **silencio**. Reintroduce por diseño el agujero que este ADR cierra —el harness nº4 sale
  verde hasta que alguien se acuerde de añadir su paso— y encima infla `PASOS` linealmente
  con el número de harnesses.
- **Generalizar `layout` copiando el bucle actual a los tres adaptadores** (exigir a todos
  `agents/`, `skills/`, `commands/`, `hooks/` y `.claude-plugin/plugin.json`). Rechazada por
  **falsa**: acusaría a kimi-code de no tener `commands/` y a opencode de no tener `hooks/`
  ni `plugin.json`, que son diferencias de diseño (ADR-007), no incumplimientos. Un check
  que grita donde no hay defecto se acaba desactivando, y entonces vuelve a no cubrir nada.
- **Exigir a todos los adaptadores solo el mínimo común, sin tabla de extras.** Rechazada
  por **regresión de cobertura**: `layout` perdería lo que hoy sí comprueba de claude-code
  (`.claude-plugin/plugin.json`, `commands/`, `hooks/`). Cerrar un hueco abriendo otro no es
  un arreglo. (Queda registrada como la simplificación disponible si el gate la prefiere:
  SPEC-017, nota 2.)
- **Derivar la lista de superficie prohibida en la raíz del contenido real de
  `adapters/*/`.** Rechazada: sería el mismo autodescubrimiento aplicado en la dirección
  peligrosa — un `adapters/<h>/docs/` haría ilegal el `docs/` de la raíz. Ver punto 4.
- **No escribir ADR y dejar el criterio en el comentario de cabecera del check.** Rechazada:
  es precisamente la clase de verdad que se pierde y luego envejece —F-SPEC-015-1 es el
  ejemplo: prosa fija en `tools/check.mjs` que acabó contradiciendo a su propio `PASOS`. La
  decisión constriñe a todo check y a todo harness futuro, así que le toca ADR (RN-04).

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
