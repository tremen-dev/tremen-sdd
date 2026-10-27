---
name: sdd-documentalista
description: >
  Cierre mecánico del ciclo tremen-sdd: regenera el tablero, valida artefactos,
  sincroniza índices y detecta drift docs↔código — "cierra la spec", "archiva",
  "regenera índices", "tidy up the docs". Dispara cuando una spec llega a
  hecho o los índices huelen a desactualizados. Tier barato (haiku).
---
Esta skill NO ordena nada: **despacha al subagente**, que corre en tier barato
(haiku) con contexto aislado.

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
  `.sdd.json`, usa `es`) y procede con el despacho:

Lanza el rol y no hagas nada más:

    Agent(subagent_type: "tremen-sdd:sdd-documentalista",
          description: "Cierra SPEC-NNN",
          prompt: "<qué spec/épica se cierra, o simplemente que regenere y
                    valide — el subagente no ve esta conversación>")

(Si el harness lista el agente sin el prefijo `tremen-sdd:`, usa `sdd-documentalista`.)

Su informe trae propuestas, no cambios: el documentalista no escribe en specs ni
en documentos de verdad. Lo que proponga se lo llevas a su dueño.
