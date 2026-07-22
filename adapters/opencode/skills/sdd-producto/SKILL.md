---
name: sdd-producto
description: >
  Product Owner y guardián del roadmap en proyectos tremen-sdd. Úsalo para
  definir o priorizar ÉPICAS, aclarar visión, criterios de éxito o el roadmap —
  "quiero una funcionalidad para…", "prioriza esto", "define la épica",
  "scope this epic", "update the roadmap". Dispara ante intención de producto
  sin épica aprobada. NO para specs detalladas (sdd-arquitecto) ni código.
---
Esta skill NO define producto: **instruye al agente primary (el orquestador) a
delegar** en el subagente del rol vía la tool `task`. En opencode los skills solo
inyectan contexto; es el primary quien despacha subagentes.

<!-- -->

    task(subagent_type: "sdd-producto",
         description: "Define/prioriza la épica",
         prompt: "<la intención de producto y cualquier finding previo copiado
                   literal — el subagente no ve esta conversación>")

Cuando el subagente devuelva su informe, relávaselo al humano tal cual. Si pide
algo que solo el humano puede decidir, pregúntaselo tú — el subagente no tiene
canal.
