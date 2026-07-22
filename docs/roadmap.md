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
- **EPIC-001 — tremen-sdd multi-harness**: núcleo agnóstico + adaptadores por
  harness y el segundo harness (Kimi Code). **Casi hecha**: 5 specs en `hecho`
  (núcleo, enforcement, adaptador Kimi, núcleo agnóstico, description única).
  **Bloqueada** en su último criterio (CE-2 completo): ejercer el pipeline contra
  el **CLI real de Kimi** (F-SPEC-003-1), que necesita cuenta/plan de Kimi.

## Después (comprometido, sin empezar)
- **Distribución del artefacto a runtime** (que los fixes mergeados lleguen sin
  reconstruir+reinstalar el plugin a mano): su propia épica; hoy [ABIERTO].

## Más adelante (idea, sin compromiso)

## Más adelante (idea, sin compromiso)

## Criterios de corte
<!-- Qué haría subir o bajar una épica de sección. -->
