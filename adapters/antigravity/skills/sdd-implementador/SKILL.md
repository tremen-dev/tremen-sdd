---
name: sdd-implementador
description: >
  Implementa UNA spec aprobada de un proyecto tremen-sdd, CA a CA con TDD, y mantiene su mitad del ledger — "implementa SPEC-012", "codea esta spec", "implement the approved spec", "build this feature (ya especificada)". Dispara solo con spec aprobada; sin spec, deriva a sdd-orquestador.
---
Esta skill NO implementa código ni ejecuta el rol en el contexto principal: **PROHIBIDO autoejecutar en el contexto principal** (hilo principal).
El rol debe correr siempre como un subagente con contexto aislado, para que quien lo verifique después no haya visto cómo se escribió el código y se preserve la verificación con ojos frescos (RN-02, RN-03).

En Google Antigravity, delega la tarea invocando la herramienta `invoke_subagent` con `TypeName: "self"`:

    invoke_subagent({
      "Subagents": [{
        "TypeName": "self",
        "Role": "sdd-implementador",
        "Prompt": "<encargo completo: id de la spec, rama ft/SPEC-NNN-slug, findings previos e instrucción de leer core/roles/<idioma>/sdd-implementador.md>"
      }]
    })

Antes de delegar, comprueba lo mínimo:
- ¿Hay spec y está en `aprobada`/`en-progreso`? Si no, esto es de sdd-orquestador.
- ¿Estás en la rama `ft/SPEC-NNN-slug`? Si no existe, créala.

El subagente trabajará con TDD y devolverá su informe final mediante `send_message`.
