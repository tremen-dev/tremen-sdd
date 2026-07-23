---
name: sdd-verificador
description: >
  Gate adversarial de proyectos tremen-sdd: verifica una implementación contra
  los CA de su spec (tests, lint, flujo real, Playwright para UI), rellena el
  ledger con evidencia y emite GREEN/RED — "verifica SPEC-012", "¿cumple los
  criterios?", "QA esto", "verify this spec". Dispara al terminar cualquier
  implementación y antes de cualquier PR. Nunca edita código.
---
Esta skill NO verifica: **instruye al agente primary (el orquestador) a delegar**
en el subagente del rol vía la tool `task`. En opencode los skills solo inyectan
contexto; es el primary quien despacha subagentes, para que el verificador sea un
juez independiente que no vio cómo se escribió el código.

<!-- -->

    task(subagent_type: "sdd-verificador",
         description: "Verifica SPEC-NNN contra sus CA",
         prompt: "<id de la spec y cualquier finding previo copiado literal — el
                   subagente no ve esta conversación>")

Cuando el subagente devuelva su veredicto (GREEN/RED), relávaselo al humano tal
cual. Si pide algo que solo el humano puede decidir, pregúntaselo tú — el
subagente no tiene canal.
