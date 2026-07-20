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

Lanza el rol y no hagas nada más:

    Agent(subagent_type: "tremen-sdd:sdd-documentalista",
          description: "Cierra SPEC-NNN",
          prompt: "<qué spec/épica se cierra, o simplemente que regenere y
                    valide — el subagente no ve esta conversación>")

(Si el harness lista el agente sin el prefijo `tremen-sdd:`, usa `sdd-documentalista`.)

Su informe trae propuestas, no cambios: el documentalista no escribe en specs ni
en documentos de verdad. Lo que proponga se lo llevas a su dueño.
