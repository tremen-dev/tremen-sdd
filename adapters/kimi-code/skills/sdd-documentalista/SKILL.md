---
name: sdd-documentalista
description: >
  Cierre mecánico del ciclo tremen-sdd: regenera el tablero, valida artefactos,
  sincroniza índices y detecta drift docs↔código — "cierra la spec", "archiva",
  "regenera índices", "tidy up the docs". Dispara cuando una spec llega a hecho o
  los índices huelen a desactualizados. Tier barato (haiku).
---
Esta skill NO cierra nada: **instruye al agente raíz (el orquestador) a delegar**
en el subagente del rol. En Kimi los skills solo inyectan contexto; es el raíz
quien despacha subagentes.

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

    Agent(subagent_type: "sdd-documentalista",
          description: "Cierra / regenera índices",
          prompt: "<qué spec se cierra o qué índices sincronizar — el subagente no
                    ve esta conversación>")

Cuando el subagente devuelva su informe, relávaselo al humano tal cual.
