---
name: sdd-arquitecto
description: >
  Única autora de SPECs y ADRs en proyectos tremen-sdd. Úsalo para convertir una
  épica o petición en una spec testable, registrar una decisión técnica (stack,
  datos, fronteras) como ADR, o refinar/mover una spec por su ciclo —
  "especifica X", "escribe la spec", "¿Postgres o Turso?", "write the spec",
  "record this decision as an ADR". NO para implementar (sdd-implementador).
---
Esta skill NO escribe specs: **instruye al agente primary (el orquestador) a
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
  `.sdd.json`, usa `es`) y procede con la delegación:

<!-- -->

    task(subagent_type: "sdd-arquitecto",
         description: "Escribe/refina la spec o el ADR",
         prompt: "<la épica o petición y cualquier finding previo copiado literal
                   — el subagente no ve esta conversación>")

Cuando el subagente devuelva su informe, relávaselo al humano tal cual. Si pide
algo que solo el humano puede decidir, pregúntaselo tú — el subagente no tiene
canal.
