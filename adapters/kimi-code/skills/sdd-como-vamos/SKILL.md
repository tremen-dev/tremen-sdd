---
name: sdd-como-vamos
description: >
  Informe read-only del estado de un proyecto tremen-sdd: qué espera al humano,
  qué está en curso o bloqueado, y las specs "cerradas con residual" — "¿cómo
  vamos?", "¿qué queda?", "estado del proyecto", "what's left", "project status".
  No escribe nada: lee frontmatters, ledgers y roadmap, y reporta.
---
Esta skill NO produce el informe: **instruye al agente raíz (el orquestador) a
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

    Agent(subagent_type: "sdd-como-vamos",
          description: "Estado del proyecto",
          prompt: "<el alcance del informe pedido — el subagente no ve esta
                    conversación>")

Cuando el subagente devuelva su informe read-only, relávaselo al humano tal cual.
