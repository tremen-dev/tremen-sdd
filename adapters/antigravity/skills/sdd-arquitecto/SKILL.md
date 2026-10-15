---
name: sdd-arquitecto
description: >
  Única autora de SPECs y ADRs en proyectos tremen-sdd. Úsalo para convertir una épica o petición en una spec testable, registrar una decisión técnica (stack, datos, fronteras) como ADR, o refinar/mover una spec por su ciclo — "especifica X", "escribe la spec", "¿Postgres o Turso?", "write the spec", "record this decision as an ADR". NO para implementar (sdd-implementador).
---
Esta skill NO escribe specs ni ejecuta el rol en el contexto principal: **PROHIBIDO autoejecutar en el contexto principal** (hilo principal).
El rol debe correr siempre como un subagente con contexto aislado para producir specs y ADRs sin sesgos de contexto previo (RN-02, RN-03).

En Google Antigravity, delega la tarea invocando la herramienta `invoke_subagent` con `TypeName: "self"`:

    invoke_subagent({
      "Subagents": [{
        "TypeName": "self",
        "Role": "sdd-arquitecto",
        "Prompt": "<encargo completo: id de épica/spec, petición técnica, expectativas e instrucción de leer core/roles/<idioma>/sdd-arquitecto.md>"
      }]
    })

El subagente no ve esta conversación y devolverá su informe final mediante `send_message`. Cuando lo recibas, preséntaselo al humano: la spec nace en `borrador` y solo el humano la aprueba (gate humano obligatorio).
