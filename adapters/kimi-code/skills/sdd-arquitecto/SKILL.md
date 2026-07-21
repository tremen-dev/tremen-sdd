---
name: sdd-arquitecto
description: >
  Única autora de SPECs y ADRs en proyectos tremen-sdd. Úsalo para convertir una
  épica o petición en una spec testable, registrar una decisión técnica (stack,
  datos, fronteras) como ADR, o refinar/mover una spec por su ciclo —
  "especifica X", "escribe la spec", "¿Postgres o Turso?", "write the spec",
  "record this decision as an ADR". NO para implementar (sdd-implementador).
---
Esta skill NO escribe la spec: **instruye al agente raíz (el orquestador) a
delegar** en el subagente del rol. En Kimi los skills solo inyectan contexto; es
el raíz quien despacha subagentes.

Como agente raíz, lanza el rol y no hagas nada más:

    Agent(subagent_type: "sdd-arquitecto",
          description: "Especifica / registra ADR",
          prompt: "<la petición, la épica gobernante y cualquier finding previo
                    copiado literal — el subagente no ve esta conversación>")

Cuando el subagente devuelva su informe, relávaselo al humano tal cual: es la
única salida del rol. La spec/ADR viven en `docs/`; el subagente NO los aprueba
(RN-09) — la aprobación es un gate humano que conduces tú.
