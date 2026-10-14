---
id: SPEC-021
tipo: spec
epica: EPIC-006
estado: en-progreso
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-10-14, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-10-14, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-10-14, por: sdd-implementador}
---
# SPEC-021 — Integración de checks de invariantes y runner

## Problema
Las specs anteriores (SPEC-019 y SPEC-020) construyeron la superficie base del adaptador
Antigravity y su enforcement L1. Sin embargo, tal como se documentó en las lecciones de
EPIC-003, el soporte de un nuevo harness no está completo sin integrar sus comprobaciones
en los guardianes de invariantes del repositorio (`tools/checks/*`) y en el runner
reproducible en local y CI (`tools/check.mjs`).

Actualmente `tools/check.mjs` no construye ni valida Antigravity de forma sistemática en
`PASOS`, y checks como `referencias.mjs`, `manifiestos.mjs` y `descripcion-fuente-unica.mjs`
no enumeran la superficie de Antigravity.

Esta spec integra el adaptador Antigravity en la **batería de invariantes del repositorio**,
garantizando que layout, manifiestos, referencias relativas y la coincidencia de descripciones
de disparo (RN-11) queden auditados de forma permanente.

## Criterios de aceptación

- **CA-1 (Layout generalizado)**:
  Dado `tools/checks/layout.mjs`, cuando se ejecuta `checkLayout()`,
  entonces reconoce a `antigravity` y valida sus extras (`plugin.json`, `commands/`, `hooks/`).

- **CA-2 (Referencias internas)**:
  Dado `tools/checks/referencias.mjs`, cuando se invoca con `antigravity`,
  entonces valida que ninguna ruta escapa de `dist/antigravity/`, que no se usan tokens
  de plugin-root de otros harnesses y que todas las referencias a `core/` existen.

- **CA-3 (Manifiestos y configuración)**:
  Dado `tools/checks/manifiestos.mjs`, cuando se invoca con `antigravity`,
  entonces audita la validez de `plugin.json` (nombre y versión), la existencia de
  `hooks/hooks.json` y la presencia de las 7 skills canónicas y los 7 agents.

- **CA-4 (Fuente única de descripciones — RN-11)**:
  Dado `tools/checks/descripcion-fuente-unica.mjs`, cuando se ejecuta,
  entonces enumera las skills y agents de Antigravity y valida que sus descripciones
  coinciden byte a byte con `core/roles/es/_descripciones.json`.

- **CA-5 (Runner de checks agregado en verde)**:
  Dado `tools/check.mjs`, cuando se ejecuta `npm run check`,
  entonces incluye `build-antigravity`, `referencias-antigravity` y `manifiestos-antigravity`
  en `PASOS`, finalizando con exit 0 y todos los pasos en verde.
