---
id: EPIC-006
tipo: epica
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-10-26, por: sdd-producto}
  - {estado: aprobada, fecha: 2026-10-26, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# EPIC-006 — Multi-idioma: galego y catala

## Objetivo
Que un proyecto pueda trabajar con tremen-sdd **entero en galego o en català**:
los agentes hablan y escriben en su idioma, `sdd-init` genera la fundación y los
artefactos en ese idioma, y los scripts y hooks le responden en él.

**Por qué ahora**: lo pide un proyecto real que trabaja en gl/ca (petición del
humano, 2026-10-26). *Hipótesis a confirmar en el gate: nombre del proyecto
solicitante y si necesita los dos idiomas o uno primero le basta.*

**Qué cambia en la fundación**: `FOUNDATION.md` (Alcance → Fuera) y
`vision.md` aparcan a propósito "el multi-idioma de roles (solo `es`)". Esta
épica levanta ese aparcamiento. Reinterpretar la fundación exige un ADR de
sdd-arquitecto. Esta épica lo encarga, no lo decide.

**Orden**: galego primero. Con gl se construye el mecanismo; català entra como
segunda pasada. Esa segunda pasada demuestra lo que de verdad se promete: que
añadir un idioma es traducir, no reconstruir.

## Criterios de éxito
- **CE-1 — Pipeline completo en galego.** Con `"idioma": "gl"` en `.sdd.json`,
  un proyecto recién creado con `sdd-init` recorre épica → spec → implementación
  → verificación → `hecho`. Las salidas que produce el método están en galego:
  roles, documentos generados y mensajes de scripts y hooks. Se demuestra con
  evidencia de una ejecución real.
- **CE-2 — Lo mismo en català**, con `"idioma": "ca"`. Además, la segunda
  pasada **no toca la lógica del núcleo**: solo añade contenido de idioma. El
  diff lo demuestra.
- **CE-3 — Paridad bloqueante en CI.** Si un rol, una plantilla o un catálogo de
  mensajes cambia en `es` sin el cambio correspondiente en `gl` y `ca`, CI
  falla. Se ejercita de forma adversarial: un PR que desalinea uno de ellos
  queda en rojo.
- **CE-4 — Español sin regresión.** Los proyectos con `"idioma": "es"`, o sin
  campo `idioma`, se comportan exactamente igual que hoy. La suite y los checks
  existentes siguen en verde.
- **CE-5 — Calidad lingüística validada por el humano.** Alberto Fojo revisa y
  firma las traducciones gl y ca antes de cerrar la épica. Que el pipeline
  funcione no basta.

## Alcance
- Dentro:
  - Los 7 roles en `core/roles/gl/` y `core/roles/ca/`, incluidas sus
    descriptions de disparo.
  - Las plantillas de `core/templates/` en gl/ca: FOUNDATION, fundación, roadmap,
    artefactos y CLAUDE.md.
  - Los mensajes que escriben los scripts del núcleo y los hooks de los tres
    adaptadores (estado.mjs, tablero, scaffold, valida, require-spec,
    protege-verdad, calidad…).
  - `sdd-init` ofrece y acepta `gl` y `ca`.
  - El check de paridad de CI.
  - El ADR que reinterpreta el Alcance de FOUNDATION y la actualización de
    `vision.md` ("Qué NO es").
- Fuera (aparcado a propósito, no por descuido):
  - **Otros idiomas** (inglés, euskera…). El mecanismo debe admitirlos, pero esta
    épica no los traduce.
  - **Los documentos de este repo** (docs/, specs, ADRs, README). tremen-sdd se
    sigue gestionando en español.
  - **Migrar el idioma de un proyecto existente** (de es a gl). Los proyectos
    eligen idioma al crearse.
  - **Traducir los identificadores del método** (estados `borrador`, `aprobada`,
    `hecho`; campos del frontmatter; nombres de rol `sdd-*`). Hipótesis: se
    quedan como están porque son contrato de los scripts. Lo confirma o lo
    desmiente el ADR.
  - **Mezclar idiomas en un proyecto**, por ejemplo roles en gl y plantillas en
    es.

## Specs
<!-- El estado por spec vive en el frontmatter de cada spec; el tablero agregado se regenera con /sdd-tablero (docs/tablero.md). No mantengas listas de specs a mano aquí. -->

Desglose orientativo; la autoría es de sdd-arquitecto:

| # | Spec propuesta | Cubre |
|---|---|---|
| 1 | ADR + mecanismo de idioma: catálogo de mensajes para scripts y hooks, resolución por `.sdd.json`, check de paridad | CE-3, CE-4 |
| 2 | Contenido gl: roles, plantillas y mensajes | CE-1 (parcial) |
| 3 | Cierre CE-1: pipeline real en gl | CE-1 |
| 4 | Contenido ca y pipeline real en ca | CE-2 |

## Riesgos
- **Las descriptions de disparo son estáticas por adaptador.** El frontmatter de
  agents y skills lo lee el harness al instalarse, no por proyecto, así que no
  puede variar según el `.sdd.json` de cada proyecto. El disparo por intención
  ("especifica X", "fai a spec") podría quedar en español o volverse multilingüe.
  Es una decisión técnica del ADR y puede rebajar el alcance de CE-1.
- **Triplicar la prosa multiplica el coste de cada cambio de rol.** Es el precio
  de CE-3, y está aceptado. EPIC-005 todavía está quitando drift de la prosa en
  es. Si se traduce antes de que cierre, las correcciones llegarán tres veces.
  Mitigación: el check de paridad hace visible ese coste, no lo esconde.
- **La traducción la escribe un agente y la revisa una sola persona** (CE-5).
  Sin un segundo revisor nativo, hay riesgo de calcos del castellano, sobre todo
  en terminología del dominio.
- **Los términos de `dominio.md` "no se traducen"**, según el CLAUDE.md de este
  repo. Falta decidir si esa regla vale para los proyectos gl/ca, o si en ellos
  el glosario se traduce.
