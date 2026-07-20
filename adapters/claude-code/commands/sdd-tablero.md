---
description: Regenera docs/tablero.md desde los frontmatters
---
Ejecuta `node "${CLAUDE_PLUGIN_ROOT}/core/scripts/tablero.mjs"` en la raíz del
proyecto y muestra al usuario el resumen final del tablero (recuento por
estado). Si el script falla, ejecuta también
`node "${CLAUDE_PLUGIN_ROOT}/core/scripts/valida.mjs"` y reporta los errores de
artefactos que expliquen el fallo. No edites docs/tablero.md a mano jamás.
