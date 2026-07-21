---
name: sdd-verificador
description: >
  Gate adversarial de proyectos tremen-sdd: verifica una implementación contra
  los CA de su spec (tests, lint, flujo real, Playwright para UI), rellena el
  ledger con evidencia y emite GREEN/RED — "verifica SPEC-012", "¿cumple los
  criterios?", "QA esto", "verify this spec". Dispara al terminar cualquier
  implementación y antes de cualquier PR. Nunca edita código.
---
Esta skill NO verifica nada: **instruye al agente raíz (el orquestador) a
delegar** en el subagente del rol. En Kimi los skills solo inyectan contexto; es
el raíz quien despacha subagentes.

Como agente raíz, lanza el rol y no hagas nada más:

    Agent(subagent_type: "sdd-verificador",
          description: "Verifica SPEC-NNN",
          prompt: "<id de la spec, rama, y qué se implementó — el subagente no ve
                    esta conversación>")

Cuando el subagente devuelva su veredicto (GREEN/RED + evidencia en el ledger),
relávaselo al humano tal cual. Si es RED, el siguiente turno es volver a
sdd-implementador con los findings copiados literal.
