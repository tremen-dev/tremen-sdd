---
description: Inicializa (o migra) un proyecto al estándar tremen-sdd
---
Vas a adoptar el estándar tremen-sdd en este proyecto. Los hooks del plugin ya
están activos (fail-open: no hacen nada hasta que exista `.sdd.json`).

## Paso 0 — Detección
Comprueba si el proyecto ya tiene estructura SDD de alguna variante conocida:
`specs/` en raíz (estilo fortos/god-pain), `docs/epicas/` (estilo phis),
`project_management/` (estilo galiactivapp/xana), o nada.
- Si NO hay nada → modo NUEVO (Paso 1).
- Si hay una variante → modo MIGRACIÓN (Paso 2).

## Paso 1 — Modo nuevo
1. Pregunta (una a una): nombre del proyecto, dominio en una frase, rutas de
   código a vigilar (p. ej. `src/`) e idioma.
   - **Idioma**: los idiomas soportados son los subdirectorios de
     `${CLAUDE_PLUGIN_ROOT}/core/roles/` (lístalos; no uses una lista fija). Ofrécelos como
     opciones. Si la respuesta no es uno de ellos, no la aceptes: dilo, muestra
     la lista y vuelve a preguntar. Nunca escribas en `.sdd.json` un `idioma`
     fuera de esa lista.
2. Copia desde `${CLAUDE_PLUGIN_ROOT}/core/templates/<idioma>/` (el idioma elegido) a la raíz del
   proyecto, rellenando `{{PROYECTO}}`, `{{FECHA}}` (hoy) y `{{DOMINIO}}`:
   - `FOUNDATION.md`, `CLAUDE.md` (si ya existe CLAUDE.md, NO lo pises:
     muestra el bloque tremen-sdd para que el humano lo integre),
   - `${CLAUDE_PLUGIN_ROOT}/core/templates/sdd.json` → `.sdd.json` (con las rutas vigiladas
     respondidas y el `idioma` elegido),
   - `roadmap.md` → `docs/roadmap.md`,
   - `fundacion/*` → `docs/fundacion/`.
3. Crea `docs/epicas/` y `docs/adr/` vacíos y ejecuta
   `node "${CLAUDE_PLUGIN_ROOT}/core/scripts/tablero.mjs"` para el primer tablero.
4. Ofrece generar roles de dominio desde
   `${CLAUDE_PLUGIN_ROOT}/core/templates/<idioma>/rol-dominio.md`: por cada uno, pide nombre
   y dominio, estampa la lógica en `.ai-context/skills/sdd-<slug>.md` y un
   wrapper en `.claude/skills/sdd-<slug>/SKILL.md` que la lea con Read.
5. Termina mostrando el flujo: "/sdd-producto para la primera épica →
   /sdd-arquitecto para su primera spec → gate humano → a construir".

## Paso 2 — Modo migración
0. Si ya existe `.sdd.json`, comprueba su `idioma` antes de nada. Si declara un
   idioma no soportado (no es uno de los subdirectorios de `${CLAUDE_PLUGIN_ROOT}/core/roles/`, o
   no es una cadena), señálalo al humano, muestra la lista de soportados y pide
   que elija uno antes de copiar plantillas; corrige `.sdd.json` con el elegido.
   Sin campo `idioma`, el proyecto es `es`.
1. Inventaría la variante detectada: dónde viven épicas/specs/ADRs, qué
   nomenclatura usan, qué estados aparecen.
2. Presenta un PLAN de migración (tabla origen → destino: renombrados a
   EPIC/SPEC/ADR-NNN, movimientos a docs/epicas y docs/adr, mapeo de estados
   antiguos a los canónicos, frontmatters a añadir) y los riesgos.
3. NO MUEVAS NADA sin aprobación explícita del humano. Con aprobación, estampa
   primero `.sdd.json` (kit base del Paso 1.2, con un `idioma` soportado) para respetar la barrera CLI de los
   scripts del núcleo, migra por lotes pequeños ejecutando
   `node "${CLAUDE_PLUGIN_ROOT}/core/scripts/valida.mjs"` tras cada lote, y
   termina completando el kit base restante y regenerando el tablero con
   `node "${CLAUDE_PLUGIN_ROOT}/core/scripts/tablero.mjs"`.
