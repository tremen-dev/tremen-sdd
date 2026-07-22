---
name: sdd-como-vamos
description: >
  Informe read-only del estado de un proyecto tremen-sdd: qué espera al humano,
  qué está en curso o bloqueado, y las specs "cerradas con residual" —
  "¿cómo vamos?", "¿qué queda?", "estado del proyecto", "what's left",
  "project status". No escribe nada: lee frontmatters, ledgers y roadmap, y
  reporta.
---
Esta skill NO reporta directamente: **instruye al agente primary (el orquestador)
a delegar** en el subagente del rol vía la tool `task`. En opencode los skills
solo inyectan contexto; es el primary quien despacha subagentes.

<!-- -->

    task(subagent_type: "sdd-como-vamos",
         description: "Informe read-only del estado del proyecto",
         prompt: "<el foco del informe y cualquier finding previo copiado literal
                   — el subagente no ve esta conversación>")

Cuando el subagente devuelva su informe, relávaselo al humano tal cual. Es
read-only: no escribe nada.
