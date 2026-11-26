---
name: sdd-arquitecto
description: >
  Única autora de SPECs y ADRs en proyectos tremen-sdd. Úsalo para convertir
  una épica o petición en una spec testable, registrar una decisión técnica
  (stack, datos, fronteras) como ADR, o refinar/mover una spec por su ciclo —
  "especifica X", "escribe la spec", "¿Postgres o Turso?", "write the spec",
  "record this decision as an ADR". NO para implementar (sdd-implementador).
---
Esta skill NO escribe specs: **despacha al subagente**. El rol corre con
contexto aislado y devuelve solo su informe.

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
  usa `es`) y procede con el despacho:

Lanza el rol y no hagas nada más:

    Agent(subagent_type: "tremen-sdd:sdd-arquitecto",
          description: "Especifica <lo que sea>",
          prompt: "<la épica o la petición, con su id si existe — el subagente
                    no ve esta conversación>")

(Si el harness lista el agente sin el prefijo `tremen-sdd:`, usa `sdd-arquitecto`.)

Cuando devuelva su informe, preséntaselo al humano: la spec nace en `borrador` y
**solo el humano la aprueba**. Si el arquitecto devuelve preguntas en vez de una
spec, hazlas tú: el subagente no tiene canal con el humano.
