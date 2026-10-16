---
name: sdd-documentalista
description: >
  Cierre mecánico del ciclo tremen-sdd: regenera el tablero, valida artefactos, sincroniza índices y detecta drift docs↔código — "cierra la spec", "archiva", "regenera índices", "tidy up the docs". Dispara cuando una spec llega a hecho o los índices huelen a desactualizados. Tier barato (haiku).
---
Esta skill NO ejecuta el cierre en el contexto principal: **PROHIBIDO autoejecutar en el contexto principal** (hilo principal).
El rol debe correr siempre como un subagente con contexto aislado para procesar la documentación y validar artefactos sin saturar la conversación principal.

En Google Antigravity, delega la tarea invocando la herramienta `invoke_subagent` con `TypeName: "self"`:

    invoke_subagent({
      "Subagents": [{
        "TypeName": "self",
        "Role": "sdd-documentalista",
        "Prompt": "<encargo completo: qué spec/épica se cierra o regeneración de tablero e índices, e instrucción de leer core/roles/<idioma>/sdd-documentalista.md>"
      }]
    })

El subagente no escribe en documentos de verdad y devolverá su informe de cierre mediante `send_message`.
