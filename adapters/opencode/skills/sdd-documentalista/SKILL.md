---
name: sdd-documentalista
description: >
  Cierre mecánico del ciclo tremen-sdd: regenera el tablero, valida artefactos,
  sincroniza índices y detecta drift docs↔código — "cierra la spec", "archiva",
  "regenera índices", "tidy up the docs". Dispara cuando una spec llega a hecho
  o los índices huelen a desactualizados. Tier barato (haiku).
---
Esta skill NO cierra nada: **instruye al agente primary (el orquestador) a
delegar** en el subagente del rol vía la tool `task`. En opencode los skills solo
inyectan contexto; es el primary quien despacha subagentes.

<!-- -->

    task(subagent_type: "sdd-documentalista",
         description: "Cierra/archiva y regenera índices",
         prompt: "<la spec o el encargo de cierre y cualquier finding previo
                   copiado literal — el subagente no ve esta conversación>")

Cuando el subagente devuelva su informe, relávaselo al humano tal cual. Si pide
algo que solo el humano puede decidir, pregúntaselo tú — el subagente no tiene
canal.
