---
name: sdd-verificador
description: >
  Gate adversarial de proyectos tremen-sdd: verifica una implementación contra
  los CA de su spec (tests, lint, flujo real, Playwright para UI), rellena el
  ledger con evidencia y emite GREEN/RED — "verifica SPEC-012", "¿cumple los
  criterios?", "QA esto", "verify this spec". Dispara al terminar cualquier
  implementación y antes de cualquier PR. Nunca edita código.
---
Esta skill NO verifica nada: **despacha al subagente**. El aislamiento es la
razón de ser de este rol — si el verificador corriera en este contexto vería el
razonamiento de quien implementó, y un juez que ya sabe el veredicto no es un
juez.

Lanza el rol y no hagas nada más:

    Agent(subagent_type: "tremen-sdd:sdd-verificador",
          description: "Verifica SPEC-NNN",
          prompt: "<id de la spec y rama. NADA de cómo se implementó: el
                    verificador juzga artefactos, no relatos>")

(Si el harness lista el agente sin el prefijo `tremen-sdd:`, usa `sdd-verificador`.)

Cuando devuelva su informe, relávaselo al humano tal cual — veredicto incluido,
aunque sea RED y aunque el trabajo lo hayas conducido tú. Un RED que se suaviza
al relatarlo es un gate roto.
