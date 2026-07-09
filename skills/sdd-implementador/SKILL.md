---
name: sdd-implementador
description: >
  Implementa UNA spec aprobada de un proyecto tremen-sdd, CA a CA con TDD, y
  mantiene su mitad del ledger — "implementa SPEC-012", "codea esta spec",
  "implement the approved spec", "build this feature (ya especificada)".
  Dispara solo con spec aprobada; sin spec, deriva a sdd-orquestador.
---
Primero lee `.sdd.json` en la raíz del proyecto y toma el campo `idioma`
(si el fichero o el campo no existen, usa `es`).
Después lee `${CLAUDE_PLUGIN_ROOT}/roles/<idioma>/sdd-implementador.md` con la
herramienta Read y sigue sus instrucciones al pie de la letra.

La raíz del plugin tremen-sdd en esta máquina es: ${CLAUDE_PLUGIN_ROOT} — cuando
el fichero de rol invoque scripts del plugin (scripts/estado.mjs,
scripts/scaffold.mjs, scripts/tablero.mjs, scripts/valida.mjs,
scripts/informe-qa.mjs), construye la ruta absoluta con esa raíz.
