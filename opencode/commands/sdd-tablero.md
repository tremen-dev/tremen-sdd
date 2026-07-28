---
description: Regenera docs/tablero.md desde los frontmatters
---
En opencode no hay variable de plugin-root: el núcleo viaja dentro de este mismo
artefacto bajo `core/`, así que `${SDD_ROOT}` es la raíz del artefacto (un nivel
por encima de este fichero, que vive en `commands/`).

Ejecuta `node "../core/scripts/tablero.mjs"` en la raíz del proyecto y muestra al
usuario el resumen final del tablero (recuento por estado). Si el script falla,
ejecuta también `node "../core/scripts/valida.mjs"` y reporta los errores de
artefactos que expliquen el fallo. No edites `docs/tablero.md` a mano jamás.
