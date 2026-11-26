---
name: sdd-arquitecto
description: >
  Única autora de SPECs y ADRs en proyectos tremen-sdd. Úsalo para convertir una épica o petición en una spec testable, registrar una decisión técnica (stack, datos, fronteras) como ADR, o refinar/mover una spec por su ciclo — "especifica X", "escribe la spec", "¿Postgres o Turso?", "write the spec", "record this decision as an ADR". NO para implementar (sdd-implementador).
---
Esta skill NO escribe specs ni ejecuta el rol en el contexto principal: **PROHIBIDO autoejecutar en el contexto principal** (hilo principal).
El rol debe correr siempre como un subagente con contexto aislado para producir specs y ADRs sin sesgos de contexto previo (RN-02, RN-03).

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
  `.sdd.json`, o si no existe `core/roles/<idioma>/`,
  usa `es`) y procede con la delegación:

En Google Antigravity, delega la tarea invocando la herramienta `invoke_subagent` con `TypeName: "self"`:

    invoke_subagent({
      "Subagents": [{
        "TypeName": "self",
        "Role": "sdd-arquitecto",
        "Prompt": "<encargo completo: comprobar la existencia de .sdd.json en la raíz del proyecto (parar si no existe), id de épica/spec, petición técnica, expectativas e instrucción de leer core/roles/<idioma>/sdd-arquitecto.md>"
      }]
    })

El subagente no ve esta conversación y devolverá su informe final mediante `send_message`. Cuando lo recibas, preséntaselo al humano: la spec nace en `borrador` y solo el humano la aprueba (gate humano obligatorio).
