# Dominio y lenguaje ubicuo — tremen-sdd

> Glosario canónico. Estos términos NO se traducen ni se anglicizan en código,
> UI ni documentación. Si un término falta, se añade aquí antes de usarse.
>
> El dominio de este proyecto es el propio **método SDD** y el **repo** que lo
> empaqueta: ambos ya establecidos. Esta tabla codifica el vocabulario en uso,
> no propone términos nuevos.

| Término | Definición | Notas |
|---|---|---|
| **SDD** | Spec-driven development: el estándar de tremen.dev por el que nada se codea sin una spec aprobada. Es el dominio de este repo. | Se escribe SDD, no "sdd" en prosa. No confundir con el nombre del paquete `tremen-sdd`. |
| **núcleo** | Capa agnóstica del método: `core/` (lib, scripts, templates, roles/prosa, máquina de estados, tests). Única copia versionada del método en git. | No sabe nada de ningún harness. Frontera fijada por ADR-001. En prosa informal "core"; el directorio es `core/`. |
| **adaptador** | Empaque del método para un harness concreto: `adapters/<harness>/` (agents, skills, commands, hooks, manifiesto de plugin, tests de esas piezas). | Simétricos: ninguno vive en la raíz. Existen `adapters/claude-code/` y `adapters/kimi-code/`. Dependen del núcleo, nunca al revés (RN-02). |
| **harness** | El entorno de agentes que hospeda el plugin (Claude Code, y en el roadmap Kimi Code, Gemini CLI…). | Término canónico, no se traduce por "entorno" ni "runtime". Un adaptador = un harness. |
| **épica** | Unidad mayor de trabajo: una capacidad de producto con criterios de éxito (CE-x). Se desglosa en specs. Artefacto `EPIC-NNN`. | La define/prioriza sdd-producto. Vive en `docs/epicas/EPIC-NNN-slug/_epica.md`. |
| **spec** | Especificación implementable y testable de un trozo de épica: problema, roles afectados, CA en Given/When/Then, entidades/reglas, fuera de alcance. Artefacto `SPEC-NNN`. | Única autora: sdd-arquitecto. "Nada se codea sin spec aprobada" (RN-01). No se traduce por "especificación" en nombres de artefacto. |
| **tarea** | Subdivisión opcional de una spec para trocear la implementación. Artefacto `TASK-NNN`. | Plantilla en `core/templates/artefactos/TASK.md`. Comparte máquina de estados con spec y épica. |
| **CA** | Criterio de aceptación de una spec, en Given/When/Then, cada uno verificable con un test. | `CA-1`, `CA-2`… Un CA sin forma verificable = spec incompleta. |
| **CE** | Criterio de éxito de una épica; medible. | `CE-1`, `CE-2`… No confundir con CA (nivel spec). |
| **ADR** | Architecture Decision Record: registro inmutable de una decisión técnica que constriñe trabajo futuro (stack, datos, fronteras, integraciones). Artefacto `ADR-NNN`. | Única autora: sdd-arquitecto. Un ADR aceptado es inmutable; solo lo supersede otro ADR (RN-04). Viven en `docs/adr/`. |
| **RN** | Regla de negocio numerada y estable del dominio (aquí, del método SDD), citable por specs y ADRs. | `RN-01`, `RN-02`… En `docs/fundacion/reglas.md`. No se borran: se derogan con fecha y motivo. |
| **rol** | Uno de los 7 papeles del pipeline (producto, arquitecto, implementador, verificador, orquestador, documentalista, como-vamos). Su prosa = system prompt. | Fuente única en `core/roles/<idioma>/<rol>.md` (RN-06). Los agents la referencian, no la copian. |
| **ledger** | Registro de doble entrada de una spec: mitad del implementador (qué hizo) y mitad del verificador (evidencia GREEN/RED). Fichero `SPEC-NNN-slug.ledger.md`. | No se traduce por "registro" ni "bitácora". Convive junto a la spec en la carpeta de la épica. |
| **gate (humano)** | Punto de control donde una persona aprueba (épica, spec, ADR) o acepta un residual. Ningún rol aprueba su propio trabajo. | El gate es estructura, no prosa. El arquitecto deja specs/ADRs en `borrador`; aprueba el humano. |
| **máquina de estados** | El grafo sancionado de transiciones de estado de un artefacto (`borrador → aprobada → en-progreso → en-revision → hecho`, con `bloqueada` y rechazo). Definida en `core/scripts/estado.mjs` (`TRANSITIONS`). | Única vía para cambiar estado (RN-07). `hecho` es terminal. Cada transición añade una entrada a `historial`. |
| **frontmatter** | Cabecera YAML de cada artefacto SDD (`id`, `tipo`, `estado`, `historial`…). Fuente de verdad del estado. | `core/lib/frontmatter.mjs`. El tablero y los informes se derivan de aquí. |
| **rutas vigiladas** | Conjunto de rutas de código bajo enforcement (`.sdd.json.rutasVigiladas`): hoy `core/scripts/`, `core/lib/`, `adapters/claude-code/hooks/`. | Editar ahí exige rama `ft/SPEC-NNN-slug` con spec aprobada/en-progreso (RN-08). Lo guarda el hook `require-spec`. |
| **hook** | Script `.mjs` del adaptador que Claude Code dispara en Pre/PostToolUse: `require-spec`, `protege-verdad`, `calidad`. | Todos **fail-open**: ante duda, permiten. Válvula `SDD_SKIP_GATE=1` (no afecta a `calidad`). El enforcement duro migrará a git+CI (RN-03). |
| **tablero** | `docs/tablero.md`: vista agregada del estado de todos los artefactos. GENERADO. | Solo lo produce `core/scripts/tablero.mjs` (`/sdd-tablero`). No se edita a mano (RN-05). |
| **artefacto de build** (`dist/`) | Salida del paso de build: el adaptador instalable autocontenido con el núcleo empaquetado dentro (`dist/<harness>/core/`). | **gitignored**, nunca se comitea. `core/` sigue siendo la única fuente versionada. No se edita a mano (RN-05). Lo ensambla `tools/build-adapter.mjs`. |
| **paso de build** | Ensamblado determinista e idempotente que copia la superficie del adaptador + el núcleo a `dist/<harness>/`, para que el núcleo se resuelva como ruta interna al plugin root. | `tools/build-adapter.mjs`. Obligatorio para instalar/dogfoodear (ADR-001). Cross-platform, sin symlinks. |
| **dogfooding** | El repo se autogestiona con su propio estándar: todo cambio bajo rutas vigiladas entra por el método (rama `ft/SPEC-NNN`, spec aprobada). | Se ejerce en Windows. Valida el runtime real tras un build+recarga. |
| **fuente única** | Invariante de "una sola fuente de verdad": del núcleo (`core/`), de la prosa de roles (`core/roles/`) y de los documentos de verdad (`FOUNDATION.md`, `docs/fundacion/`). | Guardada por checks (`fuente-unica.mjs`, `roles-fuente-unica`) y por el hook `protege-verdad`. |
