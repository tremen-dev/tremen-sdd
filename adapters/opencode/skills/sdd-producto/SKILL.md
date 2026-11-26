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

<!-- -->

    task(subagent_type: "sdd-producto",
         description: "Define/prioriza la épica",
         prompt: "<la intención de producto y cualquier finding previo copiado
                   literal — el subagente no ve esta conversación>")

Cuando el subagente devuelva su informe, relávaselo al humano tal cual. Si pide
algo que solo el humano puede decidir, pregúntaselo tú — el subagente no tiene
canal.
