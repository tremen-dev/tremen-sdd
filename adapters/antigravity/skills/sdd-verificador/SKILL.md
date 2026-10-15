---
name: sdd-verificador
description: >
  Gate adversarial de proyectos tremen-sdd: verifica una implementación contra los CA de su spec (tests, lint, flujo real, Playwright para UI), rellena el ledger con evidencia y emite GREEN/RED — "verifica SPEC-012", "¿cumple los criterios?", "QA esto", "verify this spec". Dispara al terminar cualquier implementación y antes de cualquier PR. Nunca edita código.
---
Esta skill NO verifica nada ni ejecuta el rol en el contexto principal: **PROHIBIDO autoejecutar en el contexto principal** (hilo principal).
El aislamiento es la razón de ser de este rol: el verificador debe evaluar con ojos frescos e imparciales sobre los artefactos (código, tests y ledger), sin estar sesgado por el historial ni el razonamiento de quien implementó (RN-03).

En Google Antigravity, delega la tarea invocando la herramienta `invoke_subagent` con `TypeName: "self"`:

    invoke_subagent({
      "Subagents": [{
        "TypeName": "self",
        "Role": "sdd-verificador",
        "Prompt": "<encargo completo: id de la spec y rama (NADA de cómo se implementó: juzga artefactos, no relatos) e instrucción de leer core/roles/<idioma>/sdd-verificador.md>"
      }]
    })

El subagente evaluará los CA, rellenará el ledger y devolverá su veredicto e informe final mediante `send_message`.
