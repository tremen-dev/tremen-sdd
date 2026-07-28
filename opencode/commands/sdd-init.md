---
description: Inicializa (o migra) un proyecto al estándar tremen-sdd
---
Vas a adoptar el estándar tremen-sdd en este proyecto. En opencode no hay
variable de plugin-root: el núcleo viaja dentro de este mismo artefacto bajo
`core/`, así que `${SDD_ROOT}` es la raíz del artefacto (un nivel por encima de
este fichero, que vive en `commands/`); resuelve toda ruta `../core/...` desde
aquí.

## Paso 0 — Detección
Comprueba si el proyecto ya tiene estructura SDD de alguna variante conocida:
`specs/` en raíz (estilo fortos/god-pain), `docs/epicas/` (estilo phis),
`project_management/` (estilo galiactivapp/xana), o nada.
- Si NO hay nada → modo NUEVO (Paso 1).
- Si hay una variante → modo MIGRACIÓN (Paso 2).

## Paso 1 — Modo nuevo
1. Pregunta (una a una): nombre del proyecto, dominio en una frase, rutas de
   código a vigilar (p. ej. `src/`), idioma (hoy solo `es`; confirma).
2. Copia desde `../core/templates/` a la raíz del proyecto, rellenando
   `{{PROYECTO}}`, `{{FECHA}}` (hoy) y `{{DOMINIO}}`:
   - `FOUNDATION.md`, `CLAUDE.md` (si ya existe CLAUDE.md, NO lo pises:
     muestra el bloque tremen-sdd para que el humano lo integre),
   - `sdd.json` → `.sdd.json` (con las rutas vigiladas respondidas),
   - `roadmap.md` → `docs/roadmap.md`,
   - `fundacion/*` → `docs/fundacion/`.
3. Crea `docs/epicas/` y `docs/adr/` vacíos y ejecuta
   `node "../core/scripts/tablero.mjs"` para el primer tablero.
4. Ofrece generar roles de dominio desde `../core/templates/rol-dominio.md`: por
   cada uno, pide nombre y dominio, estampa la lógica en
   `.ai-context/skills/sdd-<slug>.md` y un wrapper en
   `.opencode/skills/sdd-<slug>/SKILL.md` que la lea con Read.
5. Termina mostrando el flujo: "/sdd-producto para la primera épica →
   /sdd-arquitecto para su primera spec → gate humano → a construir".

## Paso 2 — Modo migración
1. Inventaría la variante detectada: dónde viven épicas/specs/ADRs, qué
   nomenclatura usan, qué estados aparecen.
2. Presenta un PLAN de migración (tabla origen → destino: renombrados a
   EPIC/SPEC/ADR-NNN, movimientos a docs/epicas y docs/adr, mapeo de estados
   antiguos a los canónicos, frontmatters a añadir) y los riesgos.
3. NO MUEVAS NADA sin aprobación explícita del humano. Con aprobación, migra
   por lotes pequeños, ejecutando `node "../core/scripts/valida.mjs"` tras cada
   lote, y termina con el Paso 1.2-1.3 (kit base + tablero).
