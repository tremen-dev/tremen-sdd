---
name: sdd-implementador
description: >
  Implementa UNA spec aprobada de un proyecto tremen-sdd, CA a CA con TDD, y
  mantiene su mitad del ledger — "implementa SPEC-012", "codea esta spec",
  "implement the approved spec", "build this feature (ya especificada)".
  Dispara solo con spec aprobada; sin spec, deriva a sdd-orquestador.
---
Esta skill NO implementa nada: **despacha al subagente**. El rol corre siempre
con contexto aislado, para que quien lo verifique después no haya visto cómo se
escribió el código.

Lanza el rol y no hagas nada más:

    Agent(subagent_type: "tremen-sdd:sdd-implementador",
          description: "Implementa SPEC-NNN",
          prompt: "<id de la spec, rama ft/SPEC-NNN-slug, y cualquier finding
                    previo copiado literal — el subagente no ve esta conversación>")

(Si el harness lista el agente sin el prefijo `tremen-sdd:`, usa `sdd-implementador`.)

Antes de lanzarlo, comprueba lo mínimo para no encargar trabajo imposible:
- ¿Hay spec y está en `aprobada`/`en-progreso`? Si no, esto es de sdd-orquestador.
- ¿Estás en la rama `ft/SPEC-NNN-slug`? Si no existe, créala.

Cuando el subagente devuelva su informe, relávaselo al humano tal cual: es la
única salida del rol. Si pide algo que solo el humano puede decidir, pregúntaselo
tú — el subagente no tiene canal.
