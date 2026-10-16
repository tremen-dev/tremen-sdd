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
Primero comprueba si existe `.sdd.json` en la raíz del proyecto:
- Si `.sdd.json` NO existe: `tremen-sdd` no está activo en este repositorio.
  PARA inmediatamente:
  - Si esta skill se activó automáticamente ante una petición genérica (p. ej.
    "arregla este bug", "añade X"), sal del flujo `tremen-sdd` y atiende la
    petición de forma estándar sin mencionar ni aplicar `tremen-sdd`.
  - Si el usuario invocó explícitamente un rol o comando de `tremen-sdd`, informa
    de que no existe `.sdd.json` (`tremen-sdd` no está activado) y sugiere
    ejecutar `/sdd-init`.
  No leas el rol, no ejecutes scripts ni lances subagentes.
- Si `.sdd.json` SÍ existe: toma el campo `idioma` (si no está definido en
  `.sdd.json`, usa `es`). Después lee
  `${CLAUDE_PLUGIN_ROOT}/core/roles/<idioma>/sdd-orquestador.md` con la
  herramienta Read y sigue sus instrucciones al pie de la letra.

La raíz del plugin tremen-sdd en esta máquina es: ${CLAUDE_PLUGIN_ROOT}. El
fichero de rol es agnóstico al harness: nombra la raíz que contiene `core/` con
el placeholder neutro `${SDD_ROOT}`. En Claude Code, `${SDD_ROOT}` es
`${CLAUDE_PLUGIN_ROOT}`: cuando el rol invoque un script del núcleo (p. ej.
`${SDD_ROOT}/core/scripts/estado.mjs`), sustituye el prefijo `${SDD_ROOT}` por
`${CLAUDE_PLUGIN_ROOT}` y ejecuta con la ruta absoluta resultante.
