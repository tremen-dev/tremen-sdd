---
name: sdd-documentalista
description: >
  Cierre mecánico del ciclo tremen-sdd: regenera el tablero, valida artefactos,
  sincroniza índices y detecta drift docs↔código — "cierra la spec", "archiva",
  "regenera índices", "tidy up the docs". Dispara cuando una spec llega a
  hecho o los índices huelen a desactualizados. Tier barato (haiku).
---
Primero lee `.sdd.json` en la raíz del proyecto y toma el campo `idioma`
(si el fichero o el campo no existen, usa `es`).
Después lee `${CLAUDE_PLUGIN_ROOT}/roles/<idioma>/sdd-documentalista.md` con la
herramienta Read y sigue sus instrucciones al pie de la letra.

La raíz del plugin tremen-sdd en esta máquina es: ${CLAUDE_PLUGIN_ROOT} — cuando
el fichero de rol invoque scripts del plugin (scripts/estado.mjs,
scripts/scaffold.mjs, scripts/tablero.mjs, scripts/valida.mjs,
scripts/informe-qa.mjs), construye la ruta absoluta con esa raíz.
