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

Como agente raíz, lanza el rol y no hagas nada más:

    Agent(subagent_type: "sdd-verificador",
          description: "Verifica SPEC-NNN",
          prompt: "<id de la spec, rama, y qué se implementó — el subagente no ve
                    esta conversación>")

Cuando el subagente devuelva su veredicto (GREEN/RED + evidencia en el ledger),
relávaselo al humano tal cual. Si es RED, el siguiente turno es volver a
sdd-implementador con los findings copiados literal.
