---
name: sdd-orquestador
description: >
  Entrada y router de todo trabajo en proyectos tremen-sdd. Úsalo al inicio de
  CUALQUIER petición de trabajo — "construye X", "añade Y", "arregla Z",
  "haz la épica entera", "drive this epic/task" — para clasificarla, localizar
  o encargar su spec y conducir el pipeline (producto → arquitecto →
  implementador → verificador) con sus gates humanos. Dispara siempre que
  llegue trabajo y no esté claro qué spec lo gobierna.
---
Primero lee `.sdd.json` en la raíz del proyecto y toma el campo `idioma`
(si el fichero o el campo no existen, usa `es`).
Después lee `${CLAUDE_PLUGIN_ROOT}/roles/<idioma>/sdd-orquestador.md` con la
herramienta Read y sigue sus instrucciones al pie de la letra.

La raíz del plugin tremen-sdd en esta máquina es: ${CLAUDE_PLUGIN_ROOT} — cuando
el fichero de rol invoque scripts del plugin (scripts/estado.mjs,
scripts/scaffold.mjs, scripts/tablero.mjs, scripts/valida.mjs,
scripts/informe-qa.mjs), construye la ruta absoluta con esa raíz.
