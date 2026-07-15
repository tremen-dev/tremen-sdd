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

Lanza el rol y no hagas nada más:

    Agent(subagent_type: "tremen-sdd:sdd-arquitecto",
          description: "Especifica <lo que sea>",
          prompt: "<la épica o la petición, con su id si existe — el subagente
                    no ve esta conversación>")

(Si el harness lista el agente sin el prefijo `tremen-sdd:`, usa `sdd-arquitecto`.)

Cuando devuelva su informe, preséntaselo al humano: la spec nace en `borrador` y
**solo el humano la aprueba**. Si el arquitecto devuelve preguntas en vez de una
spec, hazlas tú: el subagente no tiene canal con el humano.
