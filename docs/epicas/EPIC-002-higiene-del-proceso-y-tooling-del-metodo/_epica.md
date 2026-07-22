---
id: EPIC-002
tipo: epica
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-07-21, por: sdd-producto}
  - {estado: aprobada, fecha: 2026-07-21, por: Alberto Fojo}
---
# EPIC-002 — Higiene del proceso y tooling del metodo

## Objetivo
Cerrar la deuda de proceso y tooling que la ejecución de EPIC-001 destapó: que el
método se cumpla a sí mismo con la misma disciplina que exige. Durante EPIC-001
se vio que los roles pueden invadir gates humanos (el verificador cerró una spec
a `hecho`; el documentalista propuso cerrar la épica), que el tablero no refleja
los ADRs, y que hay ruido de tooling (linter sin config, warning de Node en CI).
Ninguno es de multi-harness; son integridad del propio método.

Por qué ahora: son defectos ya observados y baratos de cerrar, y dejarlos abiertos
erosiona la confianza en el pipeline justo cuando el método se usa en dos harnesses.

## Criterios de éxito
<!-- Medibles. Cómo sabremos que la épica cumplió su promesa. -->
- **CE-1 (cada gate lo firma quien debe)**: una **barrera estructural** —no solo
  prosa— impide que un rol firme un gate que no le corresponde. Política por tipo:
  `aprobada` (cualquier artefacto) y el cierre de una **épica** (`epica → hecho`)
  los firma una **persona**; el `hecho` de una **spec/tarea** lo firma
  `sdd-verificador` (gate adversarial, ya vigente desde `18ad848` — NO es invasión).
  El hueco real: hoy `epica → hecho` exige `sdd-verificador`, cuando una épica no
  la verifica el verificador — debe firmarla la persona. Medible: cerrar una épica
  atribuida a un rol falla; aprobar atribuido a un rol falla; la prosa del
  documentalista prohíbe explícitamente cerrar/proponer cerrar épicas.
- **CE-2 (el tablero es completo)**: `docs/tablero.md` refleja TODOS los artefactos
  de nivel superior —épicas, specs y **ADRs**— con su estado. Medible: los ADRs
  aparecen en el tablero regenerado.
- **CE-3 (tooling sin ruido espurio)**: el hook `calidad` con `linter:"auto"` no
  falla cuando no hay config de linter presente. Medible: editar un `.mjs` sin
  `eslint.config` no produce `exit 2` ruidoso.
- **CE-4 (CI sin warnings evitables)**: el workflow no emite el aviso de
  deprecación de Node 20 en las actions. Medible: el run no muestra ese warning.

## Alcance
- Dentro: los cuatro items — barrera anti-invasión de gates + prosa de roles;
  tablero indexa ADRs; `calidad`/`linter:"auto"` sin ruido; actualizar las actions
  de CI a Node no-deprecado.
- Fuera (aparcado a propósito, no por descuido):
  - **Deuda de distribución** (que los fixes mergeados lleguen al runtime sin
    reconstruir+reinstalar el plugin manualmente): mayor, su propia épica.
  - **F-SPEC-005-1** (split por-harness de la `larga` de `sdd-documentalista`):
    trade-off menor aceptado por ADR-005.
  - **Regresión conocida de `estado.mjs`** (specs migradas): deuda abierta aparte;
    aquí solo NO agravarla.

## Specs
<!-- El estado por spec vive en el frontmatter de cada spec; el tablero agregado se regenera con /sdd-tablero (docs/tablero.md). No mantengas listas de specs a mano aquí. -->
Desglose orientativo (lo autora sdd-arquitecto, no vinculante):

| # | Spec candidata | Entrega |
|---|---|---|
| 1 | Barrera anti-invasión de gates | `estado.mjs` rechaza transiciones a `aprobada`/`hecho` atribuidas a un rol; prosa de verificador/documentalista lo prohíbe. (CE-1) |
| 2 | Tablero indexa ADRs | `tablero.mjs` incluye los ADRs con su estado. (CE-2) |
| 3 | `calidad`/linter sin ruido | `linter:"auto"` exige config presente o no lanza; sin `exit 2` espurio. (CE-3) |
| 4 | CI sin warning de Node 20 | actions actualizadas/pinneadas. (CE-4) |

## Riesgos
- **`tablero.mjs` y `estado.mjs` son código vigilado**: tocarlos exige rama de
  spec y cuidado con la regresión conocida de `estado.mjs` (sus tests deben seguir
  igual de verdes).
- **CE-1 es en parte prosa**: el cumplimiento por el LLM no es determinista; por
  eso el criterio exige una barrera ESTRUCTURAL además de la prosa.
- **Barrera de gate demasiado estricta**: podría bloquear un uso legítimo (p. ej.
  el humano transicionando desde un contexto de rol). Mitiga: la barrera mira la
  atribución (`--por`), no el contexto; el humano usa su nombre.
