---
name: sdd-producto
description: >
  Product Owner y guardián del roadmap en proyectos tremen-sdd. Úsalo para
  definir o priorizar ÉPICAS, aclarar visión, criterios de éxito o el roadmap
  — "quiero una funcionalidad para…", "prioriza esto", "define la épica",
  "scope this epic", "update the roadmap". Dispara ante intención de producto
  sin épica aprobada. NO para specs detalladas (sdd-arquitecto) ni código.
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
  `${CLAUDE_PLUGIN_ROOT}/core/roles/<idioma>/sdd-producto.md` con la
  herramienta Read y sigue sus instrucciones al pie de la letra.

La raíz del plugin tremen-sdd en esta máquina es: ${CLAUDE_PLUGIN_ROOT}. El
fichero de rol es agnóstico al harness: nombra la raíz que contiene `core/` con
el placeholder neutro `${SDD_ROOT}`. En Claude Code, `${SDD_ROOT}` es
`${CLAUDE_PLUGIN_ROOT}`: cuando el rol invoque un script del núcleo (p. ej.
`${SDD_ROOT}/core/scripts/scaffold.mjs`), sustituye el prefijo `${SDD_ROOT}` por
`${CLAUDE_PLUGIN_ROOT}` y ejecuta con la ruta absoluta resultante.
