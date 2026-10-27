---
id: ADR-017
tipo: adr
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-10-27, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-10-27, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# ADR-017: Un sdd-json ilegible cierra los gates en lugar de apagarlos

- Deciders: propone sdd-arquitecto; aprueba Alberto Fojo (pendiente, gate humano de
  SPEC-027). Lo pidió Alberto Fojo el 2026-10-27.
- Specs relacionadas: **SPEC-027** (EPIC-FIX) lo materializa.
  - Complementa **ADR-002** (enforcement en capas) y **ADR-015** (activación opt-in por
    `.sdd.json`).
  - Encaja con **ADR-016** §2 (rama `ft/SPEC-025-…`, sin mergear a fecha de hoy), que hace
    fallar `valida.mjs` ante un `.sdd.json` ilegible y deja fuera, a propósito, el
    fail-open de los hooks.
  - **No supersede** ningún ADR (RN-04). Ver "Relación con ADR-002" abajo.

## Contexto

Un `.sdd.json` puede estar en tres estados:
- **ausente**: no existe el fichero;
- **válido**: existe y es un objeto JSON;
- **ilegible**: existe, pero no se puede leer o no es un objeto JSON. Casos: sintaxis
  rota, fichero vacío, `null`, un array, un escalar, o una entrada que es un directorio.

ADR-015 fija que el proyecto está activo **si y solo si existe** `.sdd.json`. La barrera
de los CLI del núcleo (`buscarRaizSdd`) mira solo la existencia, así que con un
`.sdd.json` ilegible el proyecto cuenta como activo.

Pero hoy los cinco lectores de configuración usan el mismo patrón,
`try { JSON.parse(...) } catch { return null; }`:
- `readConfig` en `adapters/{claude-code,kimi-code,antigravity}/hooks/_comun.mjs`;
- `readConfig` en `adapters/opencode/plugins/_comun.mjs`;
- `leerConfig` en `tools/githooks/pre-commit.mjs`.

Con ese patrón, ilegible y ausente dan el mismo `null`. Los hooks L1 hacen `if (!cfg)
allow()` y dejan pasar todo. El pre-commit L2 sigue adelante con `rutasVigiladas` vacío,
así que tampoco aplica require-spec. Resultado: el proyecto se declara activo y tiene
apagados los gates L1 y la parte require-spec de L2. ADR-016 lo llama "el estado más
peligroso de los cuatro".

Hay un caso que no requiere editar a mano con torpeza: un `.sdd.json` válido guardado
con BOM UTF-8. Algunos editores y shells de Windows lo escriben así, y `JSON.parse` lo
rechaza. Hoy ese proyecto pierde los gates sin que nada avise.

ADR-016 cierra la parte de L3: `valida.mjs` falla con un `.sdd.json` ilegible y su
mensaje dice que los hooks lo tratan como ausente. Deja expresamente fuera cambiar ese
comportamiento de los hooks. Eso es lo que decide este ADR.

## Decisión

### 1. Un lector único en el núcleo, con tres estados

Se añade en `core/lib/` una función que lee `.sdd.json` de una raíz dada y devuelve uno
de tres estados: `ausente`, `ilegible` (con el motivo) o `valida` (con la configuración).
- Quita un BOM UTF-8 inicial antes de parsear.
- Un valor JSON que no es un objeto (o es un array) cuenta como `ilegible`.
- Solo importa módulos `node:*` (RN-02).

Los cinco lectores de arriba pasan a delegar en ella. No queda otro `JSON.parse` de
`.sdd.json` en hooks, plugins ni pre-commit. Es la misma invariante de fuente única que
ADR-002 fijó para la decisión require-spec.

La función **no cambia cómo se localiza la raíz**. Los hooks siguen leyendo desde el
`cwd` (o el `worktree` en opencode) y el pre-commit desde la raíz del repo. ADR-016
puede unificar eso con `buscarRaizSdd`, y este ADR no lo impide.

### 2. Ilegible es una configuración determinada, no un fallo de la herramienta

ADR-002 hace fail-open a L1 "ante cualquier fallo", para que una herramienta rota no
frene a quien trabaja. Un `.sdd.json` ilegible no es una herramienta rota. Es un estado
del proyecto que se conoce con certeza: el proyecto se declara activo y su configuración
no se puede aplicar. Se trata igual que una violación determinada de require-spec, que
ya deniega en L1.

Comportamiento por capa cuando el estado es `ilegible`:
- **require-spec L1, en los cuatro adaptadores**: deniega toda escritura que le llegue,
  esté o no bajo una ruta vigilada (sin configuración no se puede saber cuáles son).
  - **Excepción**: la escritura sobre el propio `.sdd.json` de esa raíz se permite. Sin
    ella, el agente no podría arreglarlo desde el harness.
  - La denegación no depende de git, así que funciona también fuera de un repo.
- **protege-verdad L1** (claude-code, kimi-code, antigravity): aplica sus reglas como si
  el gate estuviera activo. Con la configuración ilegible no se puede leer un
  `gates.protegeVerdad: false`, así que el interruptor de apagado no cuenta.
- **calidad L1**: tras editar, informa de que `.sdd.json` sigue ilegible. Cada adaptador
  conserva su modo: claude-code devuelve feedback con exit 2; antigravity escribe en
  `stderr` y no bloquea, como ya hace con los artefactos.
- **pre-commit L2**: bloquea el commit.
- **L3**: lo cubre `valida.mjs` tal como lo fija ADR-016 §2. Este ADR solo cambia el
  texto de su error, que deja de decir que los hooks lo tratan como ausente.

Lo que **no** cambia:
- **ausente** sigue siendo "proyecto sin tremen-sdd": los hooks permiten en silencio
  (ADR-015).
- La válvula `SDD_SKIP_GATE=1` se comprueba antes de leer la configuración y sigue
  saltándose el gate en L1 y L2. En L2 sigue valiendo `git commit --no-verify`.
- Un error interno inesperado (git ausente, payload raro) sigue siendo fail-open en L1.

### 3. Un solo mensaje accionable

Todas las capas emiten el mismo texto. El mensaje:
- nombra la ruta absoluta del `.sdd.json`;
- da el motivo (el error del parser, o "no es un objeto JSON");
- dice que los gates no se pueden evaluar y que por eso se deniega;
- dice cómo arreglarlo: corregir el JSON tomando como referencia la plantilla
  `core/templates/sdd.json` del plugin, o ejecutar `/sdd-init` en modo migración;
- recuerda la válvula `SDD_SKIP_GATE=1`.

Si el catálogo de mensajes de ADR-016 ya está en `main` cuando se implemente, el texto
entra en él como una clave. Si no, va como literal en el núcleo y lo extrae el catálogo.

### Relación con ADR-002

Este ADR no supersede ADR-002. ADR-002 hace fail-open a L1 ante fallos de la herramienta.
Este ADR fija que una configuración ilegible es un estado determinado y no un fallo, y
deniega por la misma vía que ya existe para las violaciones de require-spec (por ejemplo,
`SddGateError` en opencode). El modo de fallo de L1 ante errores internos no cambia.

## Consecuencias
### Positivas
- Se cierra el único estado en el que el proyecto se declara activo y no tiene gates.
- Las cuatro capas (hooks, pre-commit, CI y CLI del núcleo) tratan igual el mismo
  fichero.
- El caso del BOM deja de apagar los gates sin aviso.
- Un solo lector y un solo mensaje para cinco sitios que hoy duplican el mismo patrón.

### Negativas / follow-ups
- Un `.sdd.json` roto bloquea todas las escrituras del harness salvo la del propio
  fichero. Es intencionado. La salida es arreglar el fichero (una línea, casi siempre) o
  usar `SDD_SKIP_GATE=1`.
- La validación es de forma (objeto JSON), no de esquema. Un `rutasVigiladas` que no es
  un array sigue haciendo fallar a require-spec por dentro, y eso acaba en fail-open.
  Queda como follow-up de SPEC-027 (pregunta abierta en su gate).
- El texto del error de `valida.mjs` que fija ADR-016 §2 queda desactualizado en cuanto
  se implemente SPEC-027, y SPEC-027 lo corrige. ADR-016 no se toca: lo que describía
  era el comportamiento de los hooks en su fecha.

## Alternativas consideradas
- **Dejar los hooks como están y confiar en `valida.mjs` (L3), como hace ADR-016.**
  Rechazada: CI avisa en el PR, después de que todo el trabajo se haya hecho con los
  gates apagados. L1 y L2 existen justo para avisar antes.
- **Que require-spec, con config ilegible, aplique las `rutasVigiladas` de la plantilla
  por defecto.** Rechazada: la plantilla trae `src/` y `lib/`, que no tienen por qué
  coincidir con las del proyecto. Daría una falsa sensación de protección y bloquearía
  rutas que el proyecto no vigila.
- **Denegar también la escritura del propio `.sdd.json`.** Rechazada: dejaría al agente
  sin forma de arreglarlo dentro del harness y obligaría a usar la válvula, que queda
  como salida de emergencia y no como camino normal.
- **Solo avisar en `stderr`, sin denegar.** Rechazada: es el fail-open de hoy con más
  ruido. Los agentes se guían por la decisión del hook, no por el texto de un aviso
  (el mismo argumento que usa ADR-016 para que `valida.mjs` falle en vez de avisar).
- **Que cada hook deniegue por su cuenta con su propio texto.** Rechazada: cinco
  lectores y cinco mensajes que divergen. Es el patrón que este ADR elimina.
- **Validar el esquema completo de `.sdd.json`.** Aplazada: cambia más superficie que el
  fix y abre la discusión de qué campos son obligatorios. Ver follow-up.

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
