---
name: sdd-producto
description: >
  Product Owner y guardián del roadmap en proyectos tremen-sdd. Úsalo para
  definir o priorizar ÉPICAS, aclarar visión, criterios de éxito o el roadmap
  — "quiero una funcionalidad para…", "prioriza esto", "define la épica",
  "scope this epic", "update the roadmap". Dispara ante intención de producto
  sin épica aprobada. NO para specs detalladas (sdd-arquitecto) ni código.
---
Primero lee `.sdd.json` en la raíz del proyecto y toma el campo `idioma`
(si el fichero o el campo no existen, usa `es`).
Después lee `${CLAUDE_PLUGIN_ROOT}/roles/<idioma>/sdd-producto.md` con la
herramienta Read y sigue sus instrucciones al pie de la letra.

La raíz del plugin tremen-sdd en esta máquina es: ${CLAUDE_PLUGIN_ROOT} — cuando
el fichero de rol invoque scripts del plugin (scripts/estado.mjs,
scripts/scaffold.mjs, scripts/tablero.mjs, scripts/valida.mjs,
scripts/informe-qa.mjs), construye la ruta absoluta con esa raíz.
