---
name: sdd-implementador
description: >
  Implementa UNA spec aprobada de un proyecto tremen-sdd, CA a CA con TDD, y
  mantiene su mitad del ledger — "implementa SPEC-012", "codea esta spec",
  "implement the approved spec", "build this feature (ya especificada)".
  Dispara solo con spec aprobada; sin spec, deriva a sdd-orquestador.
---
Esta skill NO implementa nada: **instruye al agente primary (el orquestador) a
delegar** en el subagente del rol vía la tool `task`. En opencode los skills solo
inyectan contexto; es el primary quien despacha subagentes, para que quien
verifique después no haya visto cómo se escribió el código.

Como agente primary, comprueba lo mínimo y lanza el rol:
- ¿Hay spec y está en `aprobada`/`en-progreso`? Si no, esto es de sdd-orquestador.
- ¿Estás en la rama `ft/SPEC-NNN-slug`? Si no existe, créala.

<!-- -->

    task(subagent_type: "sdd-implementador",
         description: "Implementa SPEC-NNN",
         prompt: "<id de la spec, rama ft/SPEC-NNN-slug, y cualquier finding
                   previo copiado literal — el subagente no ve esta conversación>")

Cuando el subagente devuelva su informe, relávaselo al humano tal cual: es la
única salida del rol. Si pide algo que solo el humano puede decidir, pregúntaselo
tú — el subagente no tiene canal.
