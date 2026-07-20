# Visión — tremen-sdd

## El problema
Cada proyecto que adopta spec-driven development acaba reimplementándolo a su
manera: en prosa dispersa (un `CLAUDE.md` aquí, una convención allá), sin
enforcement real (nada impide codear sin spec), y atado al harness de agentes de
turno. La disciplina se erosiona en cuanto hay prisa, y el conocimiento no viaja
ni entre proyectos ni entre harnesses.

## Para quién
Primario: los proyectos internos de **tremen.dev** que trabajan con agentes de
código y quieren SDD con disciplina real. Diseñado, además, para poder abrirse a
**terceros** más adelante (comercialización) — puerta abierta, no compromiso
adquirido.

## La promesa
Un único estándar SDD, con enforcement de verdad, reutilizable en cualquier
harness de agentes. Cuando funciona: "nada se codea sin spec aprobada" se cumple
solo (hooks + git + CI), el método se cambia en un único sitio (el núcleo
agnóstico), y correr el mismo flujo en otro harness es escribir un adaptador
fino, no reimplementar nada.

Métrica norte (hipótesis a validar con el humano): nº de harnesses soportados
sobre un único núcleo sin duplicar el método, y cero caminos por los que se pueda
codear saltándose el gate.

## Qué NO es este producto
- No es un framework de código ni un runtime: es el método + su enforcement + su
  empaque.
- No es específico de un harness: Claude Code es el primer adaptador, no el
  producto.
- No es prosa que cada proyecto copia y adapta: es una sola fuente de verdad,
  versionada y verificable.
- (Por ahora) no resuelve la distribución para usuarios finales ni el
  multi-idioma de roles.
