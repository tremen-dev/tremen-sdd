---
name: sdd-implementador
description: >
  Implementa UNA spec aprobada de un proyecto tremen-sdd, CA a CA con TDD, y
  mantiene su mitad del ledger — "implementa SPEC-012", "codea esta spec",
  "implement the approved spec", "build this feature (ya especificada)".
  Dispara solo con spec aprobada; sin spec, deriva a sdd-orquestador.
---
Esta skill NO implementa nada: **despacha al subagente**. El rol corre siempre
con contexto aislado, para que quien lo verifique después no haya visto cómo se
escribió el código.

Primero comprueba si existe `.sdd.json` en la raíz del proyecto:
- Si `.sdd.json` NO existe: `tremen-sdd` no está activo en este repositorio.
  PARA inmediatamente:
  - Si esta skill se activó automáticamente ante una petición genérica (p. ej.
    "arregla este bug", "implementa esto"), sal del flujo `tremen-sdd` y
    atiende la petición de forma estándar sin mencionar ni aplicar `tremen-sdd`.
  - Si el usuario invocó explícitamente un rol o comando de `tremen-sdd`, informa
    de que no existe `.sdd.json` (`tremen-sdd` no está activado) y sugiere
    ejecutar `/sdd-init`.
  No lances ningún subagente, no leas roles ni ejecutes scripts del núcleo.
- Si `.sdd.json` SÍ existe: toma el campo `idioma` (si no está definido en
  `.sdd.json`, usa `es`) y procede con el despacho:

Lanza el rol y no hagas nada más:

    Agent(subagent_type: "tremen-sdd:sdd-implementador",
          description: "Implementa SPEC-NNN",
          prompt: "<id de la spec, rama ft/SPEC-NNN-slug, y cualquier finding
                    previo copiado literal — el subagente no ve esta conversación>")

(Si el harness lista el agente sin el prefijo `tremen-sdd:`, usa `sdd-implementador`.)

Antes de lanzarlo, comprueba lo mínimo para no encargar trabajo imposible:
- ¿Hay spec y está en `aprobada`/`en-progreso`? Si no, esto es de sdd-orquestador.
- ¿Estás en la rama `ft/SPEC-NNN-slug`? Si no existe, créala.

Cuando el subagente devuelva su informe, relávaselo al humano tal cual: es la
única salida del rol. Si pide algo que solo el humano puede decidir, pregúntaselo
tú — el subagente no tiene canal.
