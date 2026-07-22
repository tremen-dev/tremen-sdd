---
id: ADR-006
tipo: adr
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-07-21, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-22, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# ADR-006: Anatomia de un gate: atribucion rol-vs-persona y politica de firma por tipo y estado

- Deciders: propone sdd-arquitecto; aprueba el humano (pendiente, gate humano). La
  **decision binaria** de la firma de `hecho` para spec/task la **resolvio el gate
  (Alberto Fojo, 2026-07-22): OPCION A** — la cierra `sdd-verificador` (statu quo de
  `18ad848`, NO es invasion). Este ADR ya recoge esa resolucion; el hueco real que
  materializa es `epica → hecho` = persona.
- Specs relacionadas: SPEC-006 (Barrera anti-invasion de gates) lo materializa. Origen:
  EPIC-002, CE-1 (los roles no invaden gates). Complementa RN-07 (el estado solo lo
  cambia la maquina) y RN-09 (nadie aprueba su propio trabajo); NO los supersede.

## Contexto

EPIC-001 destapo dos invasiones de gate por roles subagentes: (1) **sdd-verificador
transiciono una spec a `hecho` por su cuenta** —un cierre que el humano considera suyo—,
y (2) **sdd-documentalista propuso cerrar la epica**. La epica EPIC-002 (CE-1) exige una
**barrera ESTRUCTURAL, no solo prosa**: que intentar una transicion de gate atribuida a un
rol **falle** en `core/scripts/estado.mjs`, no que un fichero de rol pida por favor que no
se haga.

**Estado real del codigo (importante, corrige la premisa de la epica).** La epica afirma
"hoy nada lo IMPIDE: `estado.mjs` acepta cualquier `--por`". **Eso ya no es cierto.** El
commit `18ad848` ("el gate humano deja de ser prosa y pasa a ser estructura") introdujo
`FIRMANTES` en `estado.mjs`:
- `aprobada` → exige que `--por` sea **persona**: no vacio, no `desconocido`, no `sdd-*`.
  Con test (`aprobada rechaza la firma de un rol sdd-*`, etc.). **Esta parte de CE-1 ya
  esta hecha y verde.**
- `hecho` → exige **exactamente `sdd-verificador`**, y **rechaza a una persona**
  (`transition(f,'hecho','Alberto')` lanza `/sdd-verificador/`). La prosa de
  `sdd-verificador` (paso 7) le **instruye** cerrar: `estado.mjs <spec> hecho --por
  sdd-verificador`.

Es decir: para `aprobada` la barrera ya cumple CE-1; para **`hecho` el codigo hace lo
CONTRARIO de lo que la epica pide** —la epica lista `hecho` como gate humano; el codigo lo
reserva al rol verificador y prohibe a la persona—. Y `estado.mjs` **no lee `data.tipo`**:
aplica la MISMA regla de `hecho` a spec, epica, task y adr, de modo que cerrar una **epica**
exigiria hoy `--por sdd-verificador`, lo cual no tiene sentido (el verificador no cierra
epicas) y deja el cierre de epica sin un guard coherente.

Faltan, pues, tres cosas: (a) un **modelo explicito** de que es un gate y como la atribucion
distingue rol de persona; (b) que la politica de firma **dependa del `tipo`** de artefacto,
no una regla unica para todo `hecho`; y (c) fijar quien cierra cada `hecho`. El punto (c) lo
**resolvio el gate (2026-07-22, OPCION A)**: el `hecho` de una **spec/task** lo cierra
`sdd-verificador` —el juez adversarial independiente— y NO es invasion (statu quo de
`18ad848`); el `hecho` de una **epica** lo cierra una **persona** (una epica no la verifica el
verificador). El hueco real, por tanto, es que hoy la regla unica de `hecho` obliga a firmar
el cierre de epica con el verificador.

## Decisión

Se define la **anatomia de un gate** y una **politica de firma por (tipo, estado destino)**
que `estado.mjs` evalua leyendo `data.tipo`.

1. **Gate humano = estado destino cuya transicion debe atribuirse a una PERSONA.** No es un
   estado por el que se "pasa" (RN-07 ya lo trata como hecho del historial append-only): es
   una propiedad de la ARISTA de destino. La barrera mira la **atribucion (`--por`)**, nunca
   el contexto de quien invoca (un humano operando desde un rol usa su propio nombre; ver
   Riesgos de la epica).

2. **Atribucion: rol vs persona se distingue por el prefijo `sdd-`.** Un `--por` es **rol**
   si casa `^sdd-` (el conjunto cerrado de roles del metodo: `sdd-producto`, `sdd-arquitecto`,
   `sdd-implementador`, `sdd-verificador`, `sdd-documentalista`, `sdd-orquestador`,
   `sdd-como-vamos`). Cualquier otra atribucion **no vacia y distinta de `desconocido`** se
   trata como **persona**. Vacio / ausente / `desconocido` (el default del CLI) **no es
   persona**: se rechaza en todo gate humano. Se elige el patron de prefijo (no una lista
   blanca de personas) porque es robusto, no requiere mantener un censo de humanos, y el
   espacio de nombres de roles es cerrado y ya namespaced `sdd-*`.

3. **La politica de firma es una tabla por `(tipo, estado destino)`, no una regla global.**
   `estado.mjs` lee `data.tipo` y aplica:

   | tipo | `aprobada` | `hecho` |
   |------|-----------|---------|
   | spec | persona (RN-09) — **hecho y verde** | **`sdd-verificador`** (gate adversarial, statu quo `18ad848` — punto 4) |
   | epica | persona (RN-09) — **hecho y verde** | **persona, nunca un rol** (cierre de epica; corrige la invasion del documentalista) |
   | adr | persona (RN-09) — **hecho y verde** | n/a (un ADR no llega a `hecho`: es `aprobada` inmutable o `bloqueada`/superseded, RN-04) |
   | task | persona (RN-09) | **`sdd-verificador`** (igual que spec, punto 4) |

   Las transiciones de **PROCESO** (`en-progreso`, `en-revision`, `borrador`, `bloqueada`,
   y los rechazos que vuelven a `en-progreso`) **siguen admitiendo atribucion de rol**: no
   son gates. No se tocan.

4. **spec/task → `hecho`: lo firma `sdd-verificador` (OPCION A, resuelta por el gate).** El
   gate (Alberto Fojo, 2026-07-22) confirmo el **statu quo de `18ad848`**: el `hecho` de una
   spec/task lo cierra **solo `sdd-verificador`** —el juez **independiente** (≠ autor)—, y NO
   es invasion: cerrar tras el veredicto GREEN **no es autocertificacion** (RN-09 goberno
   siempre `aprobada`, no `hecho` de spec). En consecuencia: **NO se revierte `18ad848`** —el
   `FIRMANTES.hecho` para spec/task queda como esta—, el test `hecho solo lo firma
   sdd-verificador` queda **VERBATIM**, y la **prosa del verificador (paso 7) no se toca**
   (el verificador SI cierra la spec, es correcto). La celda que se corrige es unicamente
   `epica → hecho` (persona), hoy atrapada por la regla unica que exigiria el verificador.
   Se descarta la alternativa "persona cierra tambien la spec": aumentaria la friccion (cada
   cierre pediria accion humana) y revertiria un diseño deliberado sin ganancia, dado que el
   verificador es independiente del autor.

5. **La barrera vive en el script, no en la prosa (RN-07).** El mensaje de una transicion
   rechazada **no** debe listar el estado de gate como "permitido" de forma que un agente lo
   lea como invitacion: el rechazo nombra el motivo ("es gate humano; usa el nombre de la
   persona") sin ofrecer un rodeo. La prosa de los roles (RN-06) **refuerza** la prohibicion
   pero **no es la garantia**: la garantia es este `FIRMANTES` por tipo.

## Consecuencias
### Positivas
- **CE-1 estructural y completo por tipo**: el cierre de **epica** por un rol (la invasion
  del documentalista) queda **estructuralmente bloqueado**, no solo desaconsejado en prosa.
- **Modelo unico y explicito de "gate"**: futuros estados, roles o tipos de artefacto se
  clasifican en la tabla (punto 3) en vez de re-litigar caso a caso.
- **Atribucion robusta**: el patron `sdd-*` no exige mantener un censo de personas y encaja
  con el espacio de nombres ya existente.
- **Proceso intacto**: las transiciones que no son gate siguen admitiendo rol; no se añade
  friccion donde no toca.

### Negativas / follow-ups
- **`estado.mjs` pasa a leer `data.tipo`**: es logica nueva en codigo VIGILADO (`core/scripts/`).
  Riesgo controlado por TDD y por no tocar `TRANSITIONS` ni el check de aprobacion previa
  (la **regresion conocida de specs migradas no se agrava**: SPEC-006 CA de no-regresion).
- **`18ad848` se PRESERVA, no se revierte**: la firma de spec/task→`hecho` sigue siendo
  `sdd-verificador`, su test queda **verbatim** y la prosa del verificador **intacta**. El
  cambio de `FIRMANTES` solo **añade** la rama por `tipo` para `epica`+`hecho` = persona; la
  rama de spec/task es la de hoy.
- **La distincion rol-vs-persona es sintactica**: una persona que se llamara literalmente
  `sdd-algo` seria rechazada. Aceptable (nadie firma un gate con ese nombre) y explicito.
- **Historial pasado grandfathered**: las entradas `hecho` firmadas por una persona en
  SPEC-001..005 (previas a esta politica) **no se reescriben** (historial append-only, RN-07);
  quedan como estan. La politica rige de aqui en adelante.

## Alternativas consideradas
<!-- Cada una con el motivo de rechazo. -->
- **Regla global unica para `hecho` (sin leer `tipo`), como hoy.** RECHAZADA: conflaciona
  el cierre de spec (dominio del verificador o del humano) con el de epica (milestone humano),
  y hoy exigiria `--por sdd-verificador` para cerrar una epica —absurdo— dejando esa invasion
  sin guard.
- **Lista blanca de personas (censo de humanos autorizados) en vez del patron `sdd-*`.**
  RECHAZADA: exige mantener y versionar un censo; fragil ante nuevos colaboradores; el
  objetivo real es "no un rol del metodo", que el prefijo `sdd-*` captura directamente.
- **Mirar el CONTEXTO de invocacion (que subagente corre) en vez de la atribucion `--por`.**
  RECHAZADA por la propia epica (Riesgos): bloquearia a un humano operando desde un contexto
  de rol. La atribucion es el dato correcto; el humano usa su nombre.
- **Dejar la prohibicion solo en la prosa de los roles.** RECHAZADA: es exactamente lo que
  fallo en EPIC-001; CE-1 exige barrera estructural. La prosa refuerza, no garantiza.
- **Que una PERSONA cierre tambien la `hecho` de una spec/task (uniformar "ningun rol cierra
  gates").** CONSIDERADA y **descartada por el gate (2026-07-22)**: el verificador es el juez
  independiente del autor, asi que su cierre no es autocertificacion; exigir persona en cada
  cierre de spec añadiria friccion y revertiria el diseño deliberado de `18ad848` sin ganancia.
  Se mantiene `sdd-verificador` para spec/task.

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
