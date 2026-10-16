---
description: Inicializa (o migra) un proyecto al estándar tremen-sdd
---
Vas a adoptar el estándar tremen-sdd en este proyecto. En Antigravity el núcleo viaja dentro
de este mismo artefacto bajo `core/`, así que `${SDD_ROOT}` es la raíz del artefacto
(un nivel por encima de este fichero, que vive en `commands/`); resuelve toda ruta `../core/...` desde aquí.

## Paso 0 — Detección
Comprueba si el proyecto ya tiene estructura SDD:
- Si NO hay nada → modo NUEVO (Paso 1).
- Si hay una variante → modo MIGRACIÓN (Paso 2).

## Paso 1 — Modo nuevo
1. Pregunta: nombre del proyecto, dominio en una frase, rutas vigiladas, idioma (`es`).
2. Copia desde `../core/templates/` a la raíz del proyecto, rellenando placeholders:
   - `FOUNDATION.md`, `CLAUDE.md` y crea `AGENTS.md`.
   - `sdd.json` → `.sdd.json`.
   - `roadmap.md` → `docs/roadmap.md`.
   - `fundacion/*` → `docs/fundacion/`.
3. Crea `docs/epicas/` y `docs/adr/` y corre `node "../core/scripts/tablero.mjs"`.
4. Muestra el flujo siguiente.

## Paso 2 — Modo migración
1. Presenta un plan de migración paso a paso y pide aprobación humana antes de mover nada.
2. Con aprobación, estampa primero `.sdd.json` (kit base del Paso 1.2) para respetar la barrera CLI de los scripts del núcleo, migra por lotes pequeños ejecutando `node "../core/scripts/valida.mjs"` tras cada lote, y termina completando el kit base restante y regenerando el tablero con `node "../core/scripts/tablero.mjs"`.
