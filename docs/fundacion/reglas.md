# Reglas de negocio — tremen-sdd

> Numeradas y estables: las specs y ADRs las citan como RN-xx. No se borran;
> se marcan derogadas con fecha y motivo.
>
> El "negocio" de este repo es el propio método SDD. Estas RN codifican los
> invariantes ya vigentes del método y de su repo; no son propuestas nuevas.
> Cada una está redactada para ser verificable (por un hook, un check de CI o
> una inspección del árbol).

- **RN-01 — Nada se codea sin spec aprobada.** Ningún cambio de código bajo las
  rutas vigiladas (`.sdd.json.rutasVigiladas`) es admisible salvo en una rama
  `ft/SPEC-NNN-slug` cuya spec esté `aprobada` o `en-progreso`. Es el no-negociable
  central (decisión humana D-1). Verificable: el hook `require-spec` deniega la
  edición; en el destino final (RN-03) lo guarda git pre-commit + CI.

- **RN-02 — La dependencia va solo adaptador → núcleo.** Ningún fichero bajo
  `core/` importa, referencia ni resuelve una ruta que escape de `core/`; solo
  depende de `node:*` y de otros ficheros de `core/`. El acoplamiento en sentido
  núcleo → adaptador está prohibido. Verificable: `tools/checks/nucleo-aislado.mjs`
  (análisis de imports/rutas, no grep) falla si el núcleo se contamina; y el
  núcleo pasa sus tests con `adapters/` y `dist/` ausentes. Materializa CE-1 de
  EPIC-001 y la regla de dependencia de ADR-001.

- **RN-03 — El enforcement es independiente del harness.** Las garantías duras
  (nada sin spec, coherencia frontmatter/estado, calidad) deben sostenerse aunque
  el harness no tenga hooks: se cumplen vía git pre-commit + CI, no solo vía los
  hooks de Claude Code. Verificable: el check corre en CI y en pre-commit sin
  ningún harness instalado. Estado: es CE-4 de EPIC-001; hoy vive como hooks del
  adaptador y su salida a git+CI está pendiente (ver contexto.md).

- **RN-04 — Un ADR aceptado es inmutable.** Una decisión registrada como ADR en
  estado `aprobada` no se edita: para cambiarla se escribe otro ADR que la
  supersede (el viejo pasa a `bloqueada` con nota "superseded por ADR-NNN").
  Verificable: inspección de `docs/adr/`; el historial del ADR no muta tras
  `aprobada`. Recogido en la regla de pie de cada plantilla de ADR.

- **RN-05 — El tablero y `dist/` son generados: no se editan a mano.**
  `docs/tablero.md` solo lo produce `core/scripts/tablero.mjs` (`/sdd-tablero`);
  el artefacto de build `dist/<harness>/` solo lo produce `tools/build-adapter.mjs`.
  Editar a mano cualquiera de los dos está prohibido. Verificable: el hook
  `protege-verdad` deniega escribir `docs/tablero.md`; `dist/` está gitignored y
  ningún fichero suyo se comitea (`tools/checks/fuente-unica.mjs`).

- **RN-06 — La prosa de cada rol tiene una única fuente.** El cuerpo del system
  prompt de cada rol vive solo en `core/roles/<idioma>/<rol>.md`; los agents de
  cada adaptador lo REFERENCIAN (`${CLAUDE_PLUGIN_ROOT}/core/roles/…`), nunca
  copian sus secciones (`## Misión`, `## Flujo`, `## Reglas duras`). Verificable:
  `tools/checks/roles-fuente-unica.mjs` falla si un agent embebe el cuerpo del
  rol. Materializa CE-3 de EPIC-001.

- **RN-07 — El estado de un artefacto solo cambia por la máquina de estados.**
  Toda transición de `estado` (spec, épica, tarea) pasa por
  `core/scripts/estado.mjs` (`TRANSITIONS`); es ilegal cualquier transición fuera
  del grafo, y cada transición añade una entrada `{estado, fecha, por}` a
  `historial`. `hecho` es terminal. Verificable: `core/scripts/valida.mjs`
  comprueba que la última entrada del historial coincide con el `estado`
  declarado; el hook `calidad` lo reporta.

- **RN-08 — Los documentos de verdad tienen dueño único.** `FOUNDATION.md` y
  `docs/fundacion/` (dominio, reglas, contexto, visión) solo los escriben sus
  dueños (sdd-arquitecto y sdd-producto); el resto de roles PROPONEN el cambio en
  su informe al gate, no lo escriben. Verificable: el hook `protege-verdad`
  deniega la escritura a quien no sea dueño.

- **RN-09 — Ningún rol aprueba su propio trabajo.** La transición a `aprobada` de
  una épica, spec o ADR la realiza el humano en el gate, no el rol que la redactó.
  Verificable: en el `historial`, el `por` de la entrada `aprobada` es una persona,
  distinta del autor del `borrador`. No-negociable operativo del pipeline.

- **RN-10 — El repo se autogestiona con su propio estándar (dogfooding).** El
  desarrollo de tremen-sdd sigue el método tremen-sdd: cambios bajo rutas
  vigiladas entran por rama `ft/SPEC-NNN` con su spec. Verificable: el historial
  git muestra ramas `ft/SPEC-NNN-slug` para el trabajo de código vigilado; los
  propios hooks del repo disparan sobre sus rutas vigiladas.
