---
id: {{ID}}
tipo: spec
epica: {{EPICA}}
estado: borrador
aprobada-por:
historial:
  - {estado: borrador, fecha: {{FECHA}}, por: sdd-arquitecto}
---
# {{ID}} — {{TITULO}}

## Problema
<!-- Qué duele y a quién. Cita reglas de negocio (RN-xx) de docs/fundacion/reglas.md. -->

## Usuarios / roles afectados

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA debe ser verificable con un test. -->
<!-- CA manual (ADR-020 de tremen-sdd): un CA cuya evidencia no se reproduce ejecutando la suite
(un dispositivo, un entorno real, una cuenta o el juicio de una persona) lleva la marca [manual]
detrás del id y, justo debajo, su ficha: una línea `clave`: valor por clave. Claves: ejecuta
(humano, orquestador, implementador o verificador), bloquea-hecho (sí o no), comprobacion (qué se
observa y qué valor se espera; una por entorno, con la etiqueta detrás de la clave: [staging]),
precondiciones, consentimiento, manos, cuando (codigo o tras-merge) y depende-de. En un CA sin la
marca solo se admiten bloquea-hecho (por defecto, sí) y depende-de. La ficha termina en la primera
línea que no tiene su forma. Dentro de un comentario o de un bloque de código, la marca no cuenta.
Ejemplo:

- **CA-2** [manual]: Dado … cuando … entonces …
  - `ejecuta`: humano
  - `bloquea-hecho`: sí
  - `comprobacion`: el panel muestra el recurso activo con la cuenta que tiene el feature
-->
- **CA-1**: Dado … cuando … entonces …

## Entidades y reglas afectadas
<!-- Cita RN-xx, ADR-NNN y términos de docs/fundacion/dominio.md. Referencia, no dupliques. -->

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

## Notas para el gate humano
<!-- Lo que quien aprueba necesita saber para decidir. -->
