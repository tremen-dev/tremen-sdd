---
id: EPIC-FIX
tipo: epica
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-07-25, por: sdd-producto}
  - {estado: aprobada, fecha: 2026-07-25, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# EPIC-FIX — Correcciones del metodo

## Objetivo
<!-- Qué capacidad de negocio entrega esta épica y por qué ahora. -->

Épica **bucket** (vía sancionada `scaffold --id EPIC-FIX`, ver `core/scripts/scaffold.mjs`
`EPICAS_BUCKET`): no nace de una idea de producto, sino que **agrupa correcciones
transversales** de defectos del método ya observados en uso real, para que cada fix
entre por el pipeline (spec con CA testables → TDD → verificación → gate humano) sin
inventar una épica de producto por cada bug. Entra ahora porque el primer defecto que
alberga (SPEC-012) **bloquea en producción** al dueño legítimo de los documentos de
verdad en el plugin publicado 0.3.0.

## Criterios de éxito
<!-- Medibles. Cómo sabremos que la épica cumplió su promesa. -->

- **CE-FIX-1**: cada defecto alojado aquí se cierra con su spec, sus CA testables y su
  ledger de evidencia, sin degradar ningún invariante del método (RN-01..RN-11).
- **CE-FIX-2**: los fixes que afectan a artefactos publicados dejan trazado **qué se
  rompía, desde cuándo y cómo se actualiza** (CHANGELOG + nota de actualización), no
  solo el commit.

## Alcance
- Dentro: correcciones de defectos del método/enforcement/tooling ya observados, cada
  una gobernada por su spec. Primer inquilino: **SPEC-012** (protege-verdad deniega al
  dueño con prefijo de plugin; backport 0.3.1 + paridad en la fuente 0.4.0).
- Fuera (aparcado a propósito, no por descuido): mejoras y features (van por sus épicas
  de producto o por EPIC-MEJORA); refactors de infraestructura sin defecto detrás
  (EPIC-INFRA); mantenimiento rutinario (EPIC-MANT).

## Specs
<!-- El estado por spec vive en el frontmatter de cada spec; el tablero agregado se regenera con /sdd-tablero (docs/tablero.md). No mantengas listas de specs a mano aquí. -->

## Riesgos
- Una épica bucket puede convertirse en cajón de sastre: cada spec debe justificar por
  qué es un **fix** (defecto observado) y no una mejora encubierta.
