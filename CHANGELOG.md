# Changelog

Todas las novedades relevantes de este proyecto se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto se adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [Sin publicar] — 0.4.0

### Corregido

- **`protege-verdad`: cierre del hueco de cobertura del prefijo de plugin en el
  adaptador kimi-code** (SPEC-012, EPIC-FIX). El gate `protege-verdad` (RN-08:
  los documentos de verdad tienen dueño único) denegaba al **dueño legítimo**
  (arquitecto/PO) cuando su identidad de rol llegaba **prefijada por el harness**
  (p. ej. `tremen-sdd:sdd-arquitecto`), porque se comparaba el `agent_type` crudo
  contra la lista de dueños. La reparación de fondo —normalizar la identidad
  quitando el prefijo con la semántica `lastIndexOf(':')`— ya estaba en la fuente
  0.4.0 desde el commit `7323a1f` (`normalizaRol()` en claude-code y `sinPrefijo()`
  en kimi-code). Este cambio **añade la cobertura de test que faltaba** en
  `adapters/kimi-code/tests/protege-verdad.test.mjs` para la forma prefijada
  (dueño prefijado → permite; no-dueño prefijado → deniega), en paridad con los
  casos CA-8 ya existentes de claude-code. No se modifica el comportamiento del
  gate: solo se fija la regresión. El adaptador opencode no compara identidad de
  rol y no aplica (delega en git/CI L2/L3, ADR-007 [H3]).
- La política sobre qué prefijos se aceptan al normalizar queda registrada en
  **ADR-008** (aceptar cualquier prefijo, `lastIndexOf(':')`).

### Notas

- El mismo fix de fondo (`7323a1f`) se **backporta** a la línea publicada 0.3.x
  como **0.3.1** (rama de mantenimiento sobre el layout antiguo de un solo
  adaptador), para desbloquear a quienes hoy corren el plugin publicado 0.3.0.
  Consulta la entrada de 0.3.1 para el detalle del síntoma y la vía de
  actualización.
