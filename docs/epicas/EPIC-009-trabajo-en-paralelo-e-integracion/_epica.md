---
id: EPIC-009
tipo: epica
estado: borrador
historial:
  - {estado: borrador, fecha: 2026-11-23, por: sdd-producto}
---
# EPIC-009 — Trabajo en paralelo e integración

## Objetivo
Que trabajar varias specs a la vez (en worktrees, en sesiones distintas o con
ramas apiladas) **no cueste trabajo manual de integración**:
- que fusionar un PR no deje en conflicto a los siguientes;
- que dos suites pesadas no tumben la máquina;
- que integrar con `main` después del GREEN tenga dueño y reglas.

**Por qué**: xana-pensa usa el método así de forma habitual y lo paga en cada
sesión (`docs/mejoras-propuestas.md`, tremen-sdd 0.5.0):
- `docs/tablero.md` es el **único** conflicto en 5 de 5 integraciones (14).
- Dos verificadores a la vez agotaron la memoria y el harness mató a uno; pasó 3
  veces (16, 38, 46).
- Dos specs aprobadas por separado chocaron y el arreglo tuvo que ir en una
  tercera (15).
- Después del GREEN hubo que renumerar, fusionar y volver a pasar las guardas
  sin que nadie volviera a verificar (44).

**Por qué en "Después" y no en "Ahora"**: dependía de SPEC-028 (trabajar sobre
la base remota; scaffold consulta los refs, ADR-018), que ya está en `hecho`
(PR #30). SPEC-028 resolvió la entrada más repetida de todas, la numeración
entre ramas (13), con 6 apariciones. Esta épica cubre lo que queda después.
Sigue en "Después" porque EPIC-008 cuesta más por incidente.

## Criterios de éxito
- **CE-1 — Fusionar no deja el tablero en conflicto.** Con tres PR en cola de
  specs distintas, fusionar uno no deja conflicto en `docs/tablero.md` en los
  otros dos. Se demuestra con un ensayo de tres ramas.
- **CE-2 — Las ejecuciones pesadas no se pisan.** Dos sesiones o worktrees que
  lanzan a la vez la suite completa o una build declarada como pesada se
  serializan; la segunda espera o lo dice. Ninguna muere por falta de memoria
  por culpa de la otra. Ningún rol entrega su informe con procesos de fondo
  vivos.
- **CE-3 — La integración tras el GREEN tiene dueño.** Está escrito quién
  integra `main` en una rama ya en `hecho`, qué se vuelve a ejecutar y cuándo
  una integración obliga a volver a verificar. Queda en una sección estándar del
  ledger, no inventada sobre la marcha.
- **CE-4 — Renumerar es una operación segura.** Si un id choca a pesar de
  SPEC-028, renumerar una spec o un ADR es un comando:
  - renombra los ficheros;
  - sustituye las referencias en lo que la rama cambió;
  - lo deja anotado en el historial y en el ledger;
  - dice cómo renombrar la rama.

  Renombrar el título de una épica o spec usa la misma herramienta. Fusionar
  dos specs en `borrador` también (62): la absorbida queda en un estado
  terminal (p. ej. `absorbida`, con `absorbida-por:`) que `valida.mjs` y el
  tablero entienden, en vez de un hueco sin explicación, y se listan las
  referencias que hay que tocar.
- **CE-5 — Las specs de una misma ola se planifican juntas.** Al planificar
  varias specs en paralelo, el orquestador declara el orden de fusión y la rama
  base de cada una, y detecta antes de lanzarlas los solapes con lo aprobado en
  `origin/main` y en los PR abiertos.

## Alcance
- Dentro (las entradas de `docs/mejoras-propuestas.md` que cubre):
  - 14: el tablero en conflicto.
  - 16, 38 y 24: recursos compartidos y procesos vivos.
  - 44: integración tras el GREEN.
  - 40, 8 y 62: renumerar, renombrar y fusionar specs.
  - 15: orden de fusión y rama base (se repitió el 2026-11-24, entrada 68:
    tres specs apiladas en ramas encadenadas que decían «rama desde `main`»).
  - 36: fijar el lugar de trabajo antes de lanzar al arquitecto.
  - 43: solapes con decisiones aprobadas en paralelo.
- Fuera (aparcado a propósito, no por descuido):
  - **Numeración de ids entre ramas** (13): ya la cubre SPEC-028 (EPIC-FIX).
  - **Merge automático o CI propio del método.** El merge sigue siendo humano.
  - **Un planificador de olas a partir de `depende-de`**: solo se declara el
    orden. La dependencia por CA la define EPIC-008.
  - **Coordinación entre máquinas distintas.** El cerrojo es por máquina.

## Specs
<!-- El estado por spec vive en el frontmatter de cada spec; el tablero agregado se regenera con /sdd-tablero (docs/tablero.md). No mantengas listas de specs a mano aquí. -->
Desglose orientativo (lo decide sdd-arquitecto):
1. Tablero sin conflictos (CE-1). Probablemente necesite un ADR: no hacer
   commit del tablero en las ramas de spec choca con el cierre actual del
   documentalista.
2. Cerrojo de ejecuciones pesadas y regla de procesos vivos (CE-2).
3. `renumera.mjs` / `scaffold rename` (CE-4).
4. Integración tras el GREEN y planificación de olas en el rol del orquestador
   (CE-3, CE-5).

## Riesgos
- **CE-1 puede romper una regla escrita.** El cierre actual hace commit del
  tablero en la rama. Cambiarlo es una decisión del arquitecto, con ADR.
- **El cerrojo es sensible al harness.** Un fichero de cerrojo fuera del repo
  (en `~`) puede chocar con la frontera «el núcleo no se acopla al harness»
  (FOUNDATION).
- **Contrato de SPEC-028.** SPEC-028 ya está en `hecho`. Antes de especificar
  CE-4 hay que comprobar que encaja con el contrato de `scaffold.mjs` que dejó.
