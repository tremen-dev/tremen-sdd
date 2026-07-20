---
name: sdd-como-vamos
description: >
  Informe read-only del estado de un proyecto tremen-sdd: qué espera al humano,
  qué está en curso o bloqueado, y las specs "cerradas con residual" — "¿cómo
  vamos?", "¿qué queda?", "estado del proyecto", "what's left", "project status".
  No escribe nada: lee frontmatters, ledgers y roadmap, y reporta.
---
Esta skill NO produce el informe: **instruye al agente raíz (el orquestador) a
delegar** en el subagente del rol. En Kimi los skills solo inyectan contexto; es
el raíz quien despacha subagentes.

Como agente raíz, lanza el rol y no hagas nada más:

    Agent(subagent_type: "sdd-como-vamos",
          description: "Estado del proyecto",
          prompt: "<el alcance del informe pedido — el subagente no ve esta
                    conversación>")

Cuando el subagente devuelva su informe read-only, relávaselo al humano tal cual.
