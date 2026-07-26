---
tipo: roadmap
---
# Roadmap — tremen-sdd

> Curado por sdd-producto. Secuencia de épicas, horizonte y criterios de corte.
> El estado fino por spec vive en el tablero; aquí vive la INTENCIÓN.

## Ahora (en curso)
- **EPIC-002 — Higiene del proceso y tooling del método**: cerrar la deuda de
  proceso que EPIC-001 destapó (roles que invaden gates, tablero sin ADRs, ruido
  de linter, warning de CI). Va ahora porque son defectos ya observados, baratos
  de cerrar, y erosionan la confianza en el pipeline justo cuando el método se
  usa en dos harnesses.
- **EPIC-003 — Adaptador opencode con paridad completa**: tercer harness (roles,
  comandos y enforcement real) sobre el mismo núcleo, para un equipo interno que
  ya lo necesita. Entra ahora pero **detrás de EPIC-002**: no queremos construir
  el tercer adaptador sobre un pipeline con defectos de proceso aún abiertos.
  Sube por delante de la Distribución porque tiene un usuario concreto empujando,
  y no espera a EPIC-001 (bloqueada por dependencia externa de Kimi, no por
  trabajo aquí). Es, además, el primer test real de "añadir un harness es un
  adaptador fino" (EPIC-001 CE-5).

## Cerradas (con residual)
- **EPIC-001 — tremen-sdd multi-harness** — `hecho` 2026-07-26 (Alberto Fojo),
  **cerrada con residual**. 5 specs en `hecho` y 4/5 criterios cumplidos; el
  adaptador Kimi está construido, aprobado y con smoke test (SPEC-003). **CE-2 NO
  se verificó en runtime**: ejercer el pipeline end-to-end contra el **CLI real de
  Kimi** quedó bloqueado por dependencia externa (no hay cuenta de Kimi Code; el
  plan gratuito no da acceso). No se marca como cumplido: es residual explícito,
  rastreado por **SPEC-013** (`bloqueada`) — ver follow-up abajo.

## Después (comprometido, sin empezar)
- **Verificación de CE-2 contra el CLI real de Kimi** (follow-up del cierre de
  EPIC-001): ejecutar **SPEC-013** (escrita y aprobada, hoy `bloqueada`) el día que
  haya una cuenta de Kimi Code disponible. Cierra el único residual con el que se
  cerró EPIC-001. Depende de: acceso a Kimi Code.
- **Distribución del artefacto a runtime** (que los fixes mergeados lleguen sin
  reconstruir+reinstalar el plugin a mano): su propia épica; hoy [ABIERTO].

## Más adelante (idea, sin compromiso)

## Criterios de corte
<!-- Qué haría subir o bajar una épica de sección. -->
