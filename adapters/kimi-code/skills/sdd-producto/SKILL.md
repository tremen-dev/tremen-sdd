---
name: sdd-producto
description: >
  Product Owner y guardián del roadmap en proyectos tremen-sdd. Úsalo para definir
  o priorizar ÉPICAS, aclarar visión, criterios de éxito o el roadmap — "quiero una
  funcionalidad para…", "prioriza esto", "define la épica", "scope this epic".
  Dispara ante intención de producto sin épica aprobada. NO para specs (sdd-arquitecto).
---
Esta skill NO define la épica: **instruye al agente raíz (el orquestador) a
delegar** en el subagente del rol. En Kimi los skills solo inyectan contexto; es
el raíz quien despacha subagentes.

Como agente raíz, lanza el rol y no hagas nada más:

    Agent(subagent_type: "sdd-producto",
          description: "Define / prioriza épica",
          prompt: "<la intención de producto y el contexto — el subagente no ve
                    esta conversación>")

Cuando el subagente devuelva su informe, relávaselo al humano tal cual. La épica
la aprueba el humano (gate), no el subagente.
