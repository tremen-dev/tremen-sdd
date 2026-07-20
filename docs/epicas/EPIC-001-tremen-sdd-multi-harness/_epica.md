---
id: EPIC-001
tipo: epica
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-07-20, por: sdd-producto}
  - {estado: aprobada, fecha: 2026-07-20, por: Alberto Fojo}
---
# EPIC-001 — tremen-sdd multi-harness

## Objetivo
Hacer que el estándar tremen-sdd sea reutilizable en varios harnesses de
agentes sin reescribir el método por cada uno. Hoy el método vive acoplado al
empaque de Claude Code (plugin.json, agents/, skills/, hooks/, commands/);
mañana queremos correrlo también en Kimi Code —de la misma familia (agents,
subagents, Agent Skills en SKILL.md, hooks, plugin.json) y que ya lee
`.claude/skills/` de forma nativa— y dejar la puerta abierta a Gemini CLI,
opencode, Cursor y Codex.

Por qué ahora: acaba de aparecer un segundo harness viable (Kimi Code) con
coste por suscripción atractivo, y el repo aún es pequeño. Separar núcleo de
adaptadores cuesta poco hoy y mucho cuando haya dos copias divergiendo — y una
herramienta cuyo lema es "una sola fuente de verdad" no puede distribuirse como
dos repos que driftan.

## Criterios de éxito
<!-- Medibles. Cómo sabremos que la épica cumplió su promesa. -->
- **CE-1 (núcleo aislado)**: el método (templates, scripts, lib, roles/prosa,
  máquina de estados, tests) vive en una capa que no importa ni referencia
  ningún adaptador. Se mide con un check de CI (análisis de imports/rutas, no
  grep de cadenas) que falla si algo bajo el núcleo depende de un adaptador, y
  con que el núcleo pase sus tests en verde sin ningún harness instalado ni sus
  directorios presentes.
- **CE-2 (dos harnesses reales)**: un mismo proyecto SDD se opera de principio a
  fin (init → épica → spec → implementación → verificación) tanto desde Claude
  Code como desde Kimi Code, apoyándose en el mismo núcleo.
- **CE-3 (sin duplicar el system prompt)**: cada rol tiene UNA fuente de prosa;
  los agents de cada harness la consumen, no la copian. Cambiar un rol se hace
  en un solo sitio.
- **CE-4 (enforcement independiente del harness)**: los gates duros
  (require-spec, valida, calidad) se cumplen vía git pre-commit + CI, de modo
  que la garantía "nada se codea sin spec aprobada" se sostiene aunque el
  harness no tenga hooks.
- **CE-5 (coste de un harness nuevo acotado)**: añadir un harness de la misma
  familia se documenta como una lista cerrada de piezas de adaptador, sin tocar
  el núcleo.

## Alcance
- Dentro:
  - Separación núcleo agnóstico ↔ adaptadores por harness.
  - Adaptador Claude Code (el actual, reordenado) y adaptador Kimi Code (nuevo).
  - Salida del enforcement duro a git pre-commit + CI.
  - Fuente única de prosa de roles consumida por los agents de cada harness.
- Fuera (aparcado a propósito, no por descuido):
  - Adaptadores para Gemini CLI, opencode, Cursor y Codex: se diseña PARA que
    quepan, pero no se construyen en esta épica.
  - Soporte multi-idioma de roles (sigue siendo solo `es`).
  - Elegir/optimizar modelo o plan de facturación de Kimi: es decisión de uso,
    no de la herramienta.
  - Reescribir la lógica de los scripts o la máquina de estados: se mueven, no
    se rehacen.

## Specs
<!-- El estado por spec vive en el frontmatter de cada spec; el tablero agregado se regenera con /sdd-tablero (docs/tablero.md). No mantengas listas de specs a mano aquí. -->
Desglose orientativo (lo autora sdd-arquitecto, no es vinculante):

| # | Spec candidata | Entrega |
|---|---|---|
| 1 | Refactor a núcleo + adaptadores | Mover método a una capa sin acoplamiento; Claude Code queda como adaptador; verde en tests. |
| 2 | Fuente única de roles → agents | Los agents de cada harness apuntan a la prosa de `roles/`; se elimina la duplicación actual agents/ ↔ roles/es/. |
| 3 | Enforcement en git + CI | require-spec/valida/calidad como pre-commit hook y check de CI, sin depender del harness. |
| 4 | Adaptador Kimi Code | agents YAML, config de hooks y manifiesto de plugin de Kimi, reusando skills y scripts. |
| 5 | Guía "añadir un harness" | Documento que enumera las piezas de adaptador para el siguiente harness. |

> Decisión técnica pendiente de ADR (sdd-arquitecto): un solo repo con capa de
> adaptadores frente a repo por harness. Dirección preferida a partir del
> estudio: mono-repo con adaptadores, para evitar drift del núcleo.

## Riesgos
- **Deriva de formatos de harness**: los formatos de agents/hooks/plugin de cada
  harness evolucionan; el adaptador puede quedar obsoleto. Mitiga: mantener el
  adaptador delgado y el núcleo estable.
- **Fuga de acoplamiento**: que detalles de un harness se filtren al núcleo "por
  comodidad". Mitiga: CE-1 como test de guardia en CI.
- **Divergencia del payload de hooks entre harnesses**: los `.mjs` asumen el
  formato de stdin de Claude Code; Kimi puede diferir. Mitiga: shim de entrada
  en el adaptador, no en la lógica.
- **Dogfooding recién estrenado**: el repo se acaba de autogestionar; parte del
  trabajo de la épica es sobre las mismas rutas vigiladas. Mitiga: trabajar en
  ramas ft/SPEC-NNN desde la primera spec.
- **Meta-regresión conocida**: existe el defecto abierto de specs migradas en
  estado.mjs; vigilar que la refactor no lo agrave.
