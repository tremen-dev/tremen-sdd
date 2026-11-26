---
id: EPIC-008
tipo: epica
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-11-23, por: sdd-producto}
  - {estado: aprobada, fecha: 2026-11-26, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# EPIC-008 — Modelo de CA manual

## Objetivo
Que un CA manual tenga **forma propia en el método**: quién lo ejecuta, qué
necesita del humano, cómo se comprueba, si bloquea el cierre y cómo se registra
su evidencia. Hoy es un CA automático con la palabra «manual» delante, y todo lo
demás se decide sesión a sesión.

**Por qué ahora**: es la fuente de coste más repetida en los proyectos reales
(`docs/mejoras-propuestas.md`, 16 entradas: 13 de xana-pensa y 3 de artica,
con tremen-sdd 0.5.0; la 4 y la 27 se repitieron de nuevo el 2026-11-24, en
la entrada 68). Pasa esto:
- Se gastan rondas completas del verificador (unos 10 minutos de suite) solo
  para decir «faltan los manuales» (30), o para añadir una fila de evidencia
  (57).
- Los agentes ejecutan CA «del humano» sin que el método diga que pueden (27,
  31, 56).
- Un permiso dado por el humano no llega al subagente (21).
- Un paso de producción dio «Deploy complete!» y estaba roto (28).
- Pasos urgentes quedan repartidos en ledgers de specs ya cerradas (18).

**Por qué es épica y no una tanda de correcciones**: casi todas las entradas
tocan lo mismo, la matriz del ledger y la semántica del GREEN, y la RN-09 («una
salvedad nunca es ✅»). Arreglarlas por separado daría dieciséis parches
incoherentes. El modelo lo decide un ADR de sdd-arquitecto; esta épica lo
encarga, no lo decide.

## Criterios de éxito
- **CE-1 — Una sola pasada del verificador cuando los manuales se pueden hacer
  ya.** El orquestador reúne los CA manuales ejecutables antes de lanzar al
  verificador. Cuando alguno tiene que esperar, el verificador da un veredicto
  parcial que **no cambia el estado**. La segunda pasada se limita a lo
  pendiente. Se demuestra con una spec real que tenga CA manuales: el número de
  rondas completas del verificador queda en el ledger.
- **CE-2 — Registrar evidencia sin repetir la verificación.** Añadir la
  evidencia de un CA manual a la matriz no exige volver a pasar la suite. La
  frontera entre añadir evidencia y cambiar el veredicto está escrita y se
  comprueba.
- **CE-3 — Cada CA manual dice quién lo ejecuta y qué necesita del humano.** La
  plantilla de spec separa tres cosas:
  - quién lo ejecuta;
  - lo que exige el **consentimiento** del humano (el agente lo hace tras un
    «sí»);
  - lo que exige **sus manos o sus secretos**.

  El orquestador confirma las precondiciones **antes** de lanzar al
  verificador. Ante una acción destructiva sin precondición cumplida, el
  verificador devuelve el comando exacto en vez de intentarla.
- **CE-4 — Comprobar el resultado, no el comando.** Cada paso manual declara una
  comprobación observable, una por entorno. «El comando terminó sin error» no
  basta como evidencia, y el verificador lo rechaza.
- **CE-5 — Marcas explícitas en la matriz.** Hay estados distintos para:
  - ✅ con salvedad aceptada por el humano;
  - ✅ con desviación del texto;
  - ✅ ejecutado por un agente y confirmado por el humano.

  Cada CA dice si `bloquea-hecho`. El verificador lee estos campos en vez de
  razonar por precedente.
- **CE-6 — Lo pendiente tras el merge es visible.** Los pasos humanos
  posteriores al merge viven en una sección estándar del ledger, con casillas y
  dependencias. `sdd-como-vamos` los agrega en una lista ordenada y el tablero
  distingue «hecho» de «hecho con pasos humanos abiertos».
- **CE-7 — Sin regresión.** Las specs ya cerradas siguen validando. `valida.mjs`
  y la suite siguen en verde sin migrar los ledgers antiguos.

## Alcance
- Dentro (las entradas de `docs/mejoras-propuestas.md` que cubre):
  - 1, 30 y 57: verificación parcial y registro de evidencia.
  - 27, 31 y 56: quién ejecuta el CA manual.
  - 21: precondiciones humanas.
  - 4: salvedad aceptada.
  - 54: `bloquea-hecho`.
  - 18: pasos humanos tras el merge.
  - 28: comprobación observable.
  - 29: desviación.
  - 55: commit de la evidencia.
  - 22: receta de dispositivos y cuentas, como documento del proyecto
    referenciado desde `.sdd.json`.
  - 37: registro externo de manuales, como clave opcional.
  - 2: dependencias entre CA, al menos `[manual]` y `depende-de`, para saber
    qué CA automáticos no esperan a un manual.
  - Plantillas de spec y ledger, roles del orquestador, el verificador y el
    implementador, `sdd-como-vamos`, el tablero y `valida.mjs`.
  - Todo en `es`. La paridad gl/ca la exige EPIC-007, si ya está activa.
- Fuera (aparcado a propósito, no por descuido):
  - **Automatizar la ejecución de los CA manuales** (adb, consolas, paneles). La
    épica define el contrato, no herramientas de dispositivo.
  - **Migrar los ledgers ya cerrados** al formato nuevo.
  - **Planificar olas de specs en paralelo** a partir de las dependencias entre
    CA. Va a EPIC-009; esta épica solo declara la dependencia.
  - **La entrada 26** (referencias de diseño en el frontmatter): aparcada; un
    solo caso.

## Specs
<!-- El estado por spec vive en el frontmatter de cada spec; el tablero agregado se regenera con /sdd-tablero (docs/tablero.md). No mantengas listas de specs a mano aquí. -->
Desglose orientativo (lo decide sdd-arquitecto):
1. ADR y spec del modelo: campos por CA, marcas de la matriz, semántica del
   veredicto parcial y su relación con RN-09.
2. Plantillas y `valida.mjs` (CE-3, CE-4, CE-5).
3. Roles: orquestador y verificador (CE-1, CE-2, CE-3).
4. Pasos tras el merge: `sdd-como-vamos` y el tablero (CE-6).

## Riesgos
- **Cambia la semántica del gate.** Un veredicto parcial o «evidencia sin
  reverificar» pueden abrir una puerta trasera al GREEN. El ADR tiene que dejar
  claro qué no puede cambiar sin una pasada completa.
- **Sobrecarga de la plantilla.** Demasiados campos por CA harán que las specs
  pequeñas paguen el coste de las grandes. Hipótesis a validar: los campos nuevos
  son opcionales salvo en los CA manuales.
- **Sesgo de muestra.** 13 de las 16 entradas vienen de un único proyecto
  (xana-pensa, móvil y Firebase); las otras 3 (1, 2 y 4) son de artica.
  Conviene contrastar el modelo con artica antes de cerrarlo.
- **Colisión con EPIC-007.** Si la paridad bloqueante (SPEC-026) entra antes,
  cada cambio de rol o de plantilla se triplica (es, gl y ca).
