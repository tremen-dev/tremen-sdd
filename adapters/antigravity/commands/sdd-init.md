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
1. Pregunta: nombre del proyecto, dominio en una frase, rutas vigiladas e idioma.
   - **Idioma**: los idiomas soportados son los subdirectorios de
     `../core/roles/` (lístalos; no uses una lista fija). Ofrécelos como
     opciones. Si la respuesta no es uno de ellos, no la aceptes: dilo, muestra
     la lista y vuelve a preguntar. Nunca escribas en `.sdd.json` un `idioma`
     fuera de esa lista.
2. Copia desde `../core/templates/<idioma>/` (el idioma elegido) a la raíz del proyecto, rellenando placeholders:
   - `FOUNDATION.md`, `CLAUDE.md` y `AGENTS.md`.
   - `../core/templates/sdd.json` → `.sdd.json` (con las rutas vigiladas
     respondidas y el `idioma` elegido).
   - `roadmap.md` → `docs/roadmap.md`.
   - `fundacion/*` → `docs/fundacion/`.
3. Crea `docs/epicas/` y `docs/adr/` y corre `node "../core/scripts/tablero.mjs"`.
4. Muestra el flujo siguiente.

## Paso 2 — Modo migración
0. Si ya existe `.sdd.json`, comprueba su `idioma` antes de nada. Si declara un
   idioma no soportado (no es uno de los subdirectorios de `../core/roles/`, o
   no es una cadena), señálalo al humano, muestra la lista de soportados y pide
   que elija uno antes de copiar plantillas; corrige `.sdd.json` con el elegido.
   Sin campo `idioma`, el proyecto es `es`.
1. Presenta un plan de migración paso a paso y pide aprobación humana antes de mover nada.
2. Con aprobación, estampa primero `.sdd.json` (kit base del Paso 1.2, con un `idioma` soportado) para respetar la barrera CLI de los scripts del núcleo, migra por lotes pequeños ejecutando `node "../core/scripts/valida.mjs"` tras cada lote, y termina completando el kit base restante y regenerando el tablero con `node "../core/scripts/tablero.mjs"`.
