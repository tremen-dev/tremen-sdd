---
name: sdd-verificador
description: >
  Gate adversarial de proyectos tremen-sdd: verifica una implementación contra los CA de su spec (tests, lint, flujo real, Playwright para UI), rellena el ledger con evidencia y emite GREEN/RED — "verifica SPEC-012", "¿cumple los criterios?", "QA esto", "verify this spec". Dispara al terminar cualquier implementación y antes de cualquier PR. Nunca edita código.
---
Esta skill NO verifica nada ni ejecuta el rol en el contexto principal: **PROHIBIDO autoejecutar en el contexto principal** (hilo principal).
El aislamiento es la razón de ser de este rol: el verificador debe evaluar con ojos frescos e imparciales sobre los artefactos (código, tests y ledger), sin estar sesgado por el historial ni el razonamiento de quien implementó (RN-03).

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
  `.sdd.json`, usa `es`) y procede con la delegación:

En Google Antigravity, delega la tarea invocando la herramienta `invoke_subagent` con `TypeName: "self"`:

    invoke_subagent({
      "Subagents": [{
        "TypeName": "self",
        "Role": "sdd-verificador",
        "Prompt": "<encargo completo: comprobar la existencia de .sdd.json en la raíz del proyecto (parar si no existe), id de la spec y rama (NADA de cómo se implementó: juzga artefactos, no relatos) e instrucción de leer core/roles/<idioma>/sdd-verificador.md>"
      }]
    })

El subagente evaluará los CA, rellenará el ledger y devolverá su veredicto e informe final mediante `send_message`.
