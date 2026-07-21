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
Después lee `${CLAUDE_PLUGIN_ROOT}/core/roles/<idioma>/sdd-orquestador.md` con la
herramienta Read y sigue sus instrucciones al pie de la letra.

La raíz del plugin tremen-sdd en esta máquina es: ${CLAUDE_PLUGIN_ROOT}. El
fichero de rol es agnóstico al harness: nombra la raíz que contiene `core/` con
el placeholder neutro `${SDD_ROOT}`. En Claude Code, `${SDD_ROOT}` es
`${CLAUDE_PLUGIN_ROOT}`: cuando el rol invoque un script del núcleo (p. ej.
`${SDD_ROOT}/core/scripts/estado.mjs`), sustituye el prefijo `${SDD_ROOT}` por
`${CLAUDE_PLUGIN_ROOT}` y ejecuta con la ruta absoluta resultante.
