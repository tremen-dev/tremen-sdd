---
name: sdd-como-vamos
description: >
  Informe read-only del estado de un proyecto tremen-sdd: qué espera al humano,
  qué está en curso o bloqueado, y las specs "cerradas con residual" — "¿cómo
  vamos?", "¿qué queda?", "estado del proyecto", "what's left", "project
  status". No escribe nada: lee frontmatters, ledgers y roadmap, y reporta.
---
Primero lee `.sdd.json` en la raíz del proyecto y toma el campo `idioma`
(si el fichero o el campo no existen, usa `es`).
Después lee `${CLAUDE_PLUGIN_ROOT}/roles/<idioma>/sdd-como-vamos.md` con la
herramienta Read y sigue sus instrucciones al pie de la letra.

La raíz del plugin tremen-sdd en esta máquina es: ${CLAUDE_PLUGIN_ROOT} — cuando
el fichero de rol invoque scripts del plugin (scripts/estado.mjs,
scripts/scaffold.mjs, scripts/tablero.mjs, scripts/valida.mjs,
scripts/informe-qa.mjs), construye la ruta absoluta con esa raíz.
