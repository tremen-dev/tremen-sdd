---
name: sdd-init
description: >
  Inicializa o migra un proyecto al estándar tremen-sdd creando la estructura base, FOUNDATION.md, AGENTS.md y el primer tablero.
---
Vas a adoptar el estándar tremen-sdd en este proyecto. En Antigravity el núcleo viaja dentro
de este mismo artefacto bajo `core/`, así que `${SDD_ROOT}` es la raíz del artefacto
(dos niveles por encima de este fichero); resuelve toda ruta `../../core/...` desde aquí.

## Paso 0 — Detección
Comprueba si el proyecto ya tiene estructura SDD de alguna variante conocida:
`specs/` en raíz, `docs/epicas/`, `project_management/`, o nada.
- Si NO hay nada → modo NUEVO (Paso 1).
- Si hay una variante → modo MIGRACIÓN (Paso 2).

## Paso 1 — Modo nuevo
1. Pregunta (una a una): nombre del proyecto, dominio en una frase, rutas de
   código a vigilar (p. ej. `src/`), idioma (hoy solo `es`; confirma).
2. Copia desde `../../core/templates/` a la raíz del proyecto, rellenando
   `{{PROYECTO}}`, `{{FECHA}}` (hoy) y `{{DOMINIO}}`:
   - `FOUNDATION.md`, `CLAUDE.md` y crea `AGENTS.md` con las directrices de SDD.
   - `sdd.json` → `.sdd.json` (con las rutas vigiladas respondidas),
   - `roadmap.md` → `docs/roadmap.md`,
   - `fundacion/*` → `docs/fundacion/`.
3. Crea `docs/epicas/` y `docs/adr/` vacíos y ejecuta
   `node "../../core/scripts/tablero.mjs"` para el primer tablero.
4. Termina mostrando el flujo: "/sdd-producto para la primera épica →
   /sdd-arquitecto para su primera spec → gate humano → a construir".

## Paso 2 — Modo migración
1. Inventaría la variante detectada: dónde viven épicas/specs/ADRs, qué
   nomenclatura usan, qué estados aparecen.
2. Presenta un PLAN de migración y los riesgos.
3. NO MUEVAS NADA sin aprobación explícita del humano. Con aprobación, migra
   por lotes pequeños, ejecutando `node "../../core/scripts/valida.mjs"` tras cada
   lote, y termina con el Paso 1.2-1.3 (kit base + tablero).
