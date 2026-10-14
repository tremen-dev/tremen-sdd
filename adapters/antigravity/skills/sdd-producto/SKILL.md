---
name: sdd-producto
description: >
  Product Owner y guardián del roadmap en proyectos tremen-sdd. Úsalo para definir o priorizar ÉPICAS, aclarar visión, criterios de éxito o el roadmap — "quiero una funcionalidad para…", "prioriza esto", "define la épica", "scope this epic", "update the roadmap". Dispara ante intención de producto sin épica aprobada. NO para specs detalladas (sdd-arquitecto) ni código.
---
Primero lee `.sdd.json` en la raíz del proyecto y toma el campo `idioma`
(si el fichero o el campo no existen, usa `es`).
Después lee `../../core/roles/<idioma>/sdd-producto.md` con la
herramienta de lectura de ficheros y sigue sus instrucciones al pie de la letra.

El fichero de rol es agnóstico al harness: nombra la raíz que contiene `core/` con
el placeholder neutro `${SDD_ROOT}`. En este plugin, `${SDD_ROOT}` es la raíz del
plugin (dos niveles por encima de este fichero, que vive en `skills/sdd-producto/`).
Cuando el rol invoque un script del núcleo (p. ej. `${SDD_ROOT}/core/scripts/estado.mjs`;
también `scaffold.mjs`, `tablero.mjs`, `valida.mjs`, `informe-qa.mjs`), resuelve
`${SDD_ROOT}` a esa raíz y ejecútalo con node por ruta relativa (`../../core/scripts/<script>.mjs`).
