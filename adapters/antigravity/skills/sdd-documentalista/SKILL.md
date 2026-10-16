---
name: sdd-documentalista
description: >
  Cierre mecánico del ciclo tremen-sdd: regenera el tablero, valida artefactos, sincroniza índices y detecta drift docs↔código — "cierra la spec", "archiva", "regenera índices", "tidy up the docs". Dispara cuando una spec llega a hecho o los índices huelen a desactualizados. Tier barato (haiku).
---
Esta skill NO ejecuta el cierre en el contexto principal: **PROHIBIDO autoejecutar en el contexto principal** (hilo principal).
El rol debe correr siempre como un subagente con contexto aislado para procesar la documentación y validar artefactos sin saturar la conversación principal.

Primero comprueba si existe `.sdd.json` en la raíz del proyecto:
- Si `.sdd.json` NO existe: `tremen-sdd` no está activo en este repositorio.
  PARA inmediatamente:
  - Si esta skill se activó automáticamente ante una petición genérica, sal del
    flujo `tremen-sdd` y atiende la petición de forma estándar sin mencionar ni
    aplicar `tremen-sdd`.
  - Si el usuario invocó explícitamente un rol o comando de `tremen-sdd`, informa
    de que no existe `.sdd.json` (`tremen-sdd` no está activado) y sugiere
    ejecutar `/sdd-init`.
  No lances ningún subagente, no leas roles ni ejecutes scripts del núcleo.
- Si `.sdd.json` SÍ existe: toma el campo `idioma` (si no está definido en
  `.sdd.json`, usa `es`) y procede con la delegación:

En Google Antigravity, delega la tarea invocando la herramienta `invoke_subagent` con `TypeName: "self"`:

    invoke_subagent({
      "Subagents": [{
        "TypeName": "self",
        "Role": "sdd-documentalista",
        "Prompt": "<encargo completo: comprobar la existencia de .sdd.json en la raíz del proyecto (parar si no existe), qué spec/épica se cierra o regeneración de tablero e índices, e instrucción de leer core/roles/<idioma>/sdd-documentalista.md>"
      }]
    })

El subagente no escribe en documentos de verdad y devolverá su informe de cierre mediante `send_message`.
