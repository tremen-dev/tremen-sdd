# FOUNDATION — tremen-sdd

> Constitución del proyecto. Las decisiones D-N están **locked**: solo un ADR
> aceptado puede reinterpretarlas o supersederlas. Dueños: sdd-arquitecto y
> sdd-producto (hook protege-verdad).

- Creado: 2026-07-20
- Dominio: Estándar SDD (spec-driven development) empaquetado para varios harnesses de agentes: núcleo agnóstico + adaptadores por harness.

## Decisiones locked
<!-- Una por línea, numeradas y datadas. Ej.: -->
- **D-1** (2026-07-20): **Nada se implementa sin una SPEC aprobada.** Toda otra
  convención del método (ramas `ft/SPEC-NNN`, gates humanos, ledger de evidencia,
  ADRs inmutables) deriva de esta.

## Alcance
- Dentro: el estándar SDD (épica → spec → tarea, ADRs inmutables, pipeline de
  roles, ledger de evidencia) empaquetado como **núcleo agnóstico + adaptadores
  por harness**, el enforcement que lo hace cumplir, y el adaptador de Claude
  Code. Soportar nuevos harnesses (empezando por Kimi Code) es alcance vivo
  (EPIC-001).
- Fuera (aparcado a propósito, no por descuido): construir ya los adaptadores de
  Gemini CLI / opencode / Cursor / Codex (se diseña PARA que quepan, no se
  construyen aún); el multi-idioma de roles (solo `es`); y resolver la
  distribución del artefacto construido para usuarios finales (hoy instalar exige
  build local).

## No-negociables
- **Nada se codea sin una SPEC aprobada** (D-1): lo hacen cumplir el hook
  `require-spec` y git; no es una recomendación.
- **El núcleo nunca se acopla a un harness**: la dependencia va solo
  adaptador → núcleo, guardada por un check de CI. El método debe poder ejecutarse
  sin ningún harness presente.
- **El enforcement es independiente del harness**: la garantía vive en git + CI,
  no solo en los hooks de un harness concreto, para que sobreviva incluso en
  harnesses sin hooks.

## Cómo se trabaja aquí
Este proyecto sigue el estándar **tremen-sdd**: nada se implementa sin una
SPEC aprobada; las decisiones técnicas se registran como ADR inmutables; la
evidencia de verificación vive en el ledger de cada spec. Roles: /sdd-orquestador
(entrada), /sdd-producto, /sdd-arquitecto, /sdd-implementador, /sdd-verificador,
/sdd-documentalista, /sdd-como-vamos.
