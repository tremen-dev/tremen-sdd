---
name: sdd-documentalista
description: >
  Cierre mecánico del ciclo tremen-sdd: regenera el tablero, valida artefactos,
  sincroniza índices y detecta drift docs↔código — "cierra la spec", "archiva",
  "regenera índices", "tidy up the docs". Dispara cuando una spec llega a hecho o
  los índices huelen a desactualizados.
---
Esta skill NO cierra nada: **instruye al agente raíz (el orquestador) a delegar**
en el subagente del rol. En Kimi los skills solo inyectan contexto; es el raíz
quien despacha subagentes.

Como agente raíz, lanza el rol y no hagas nada más:

    Agent(subagent_type: "sdd-documentalista",
          description: "Cierra / regenera índices",
          prompt: "<qué spec se cierra o qué índices sincronizar — el subagente no
                    ve esta conversación>")

Cuando el subagente devuelva su informe, relávaselo al humano tal cual.
