---
id: SPEC-024
tipo: spec
epica: EPIC-FIX
estado: en-progreso
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-10-16, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-10-16, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-10-16, por: sdd-implementador}
---
# SPEC-024 — Guarda de activacion por sdd-json en skills agentes roles y CLI del nucleo

## Problema

Los adaptadores de `tremen-sdd` (`claude-code`, `kimi-code`, `opencode`, `antigravity`) se
instalan a nivel global de usuario en cada harness. Por ello, sus skills (`SKILL.md`), agentes
(`agents/`) y scripts del núcleo (`core/scripts/*.mjs`) están visibles para el asistente en
**cualquier repositorio** que el usuario abra, incluidos repositorios corporativos o proyectos
personales que **no utilizan `tremen-sdd`** (no tienen `.sdd.json` en su raíz).

Hoy existe una asimetría crítica cuando se trabaja en un repositorio **sin `.sdd.json`**:

1. **Hooks L1 (`require-spec`, `protege-verdad`, `calidad`)**: Sí comprueban `.sdd.json` y son
   *fail-open* (`if (!cfg) allow()`), quedando inactivos cuando `.sdd.json` no existe (ADR-002).
2. **Skills (`adapters/*/skills/sdd-*/SKILL.md`), Agentes (`adapters/*/agents/**/*.md`) y Roles
   (`core/roles/es/sdd-*.md`)**:
   - En los skills directos y en los 18 ficheros de agentes (`claude-code`, `kimi-code`,
     `opencode`), el arranque dice:
     *"Lee `.sdd.json` en la raíz del proyecto y toma el campo `idioma` (si el fichero o el campo
     no existen, usa `es`). Después lee `.../core/roles/<idioma>/sdd-<rol>.md` y sigue sus
     instrucciones al pie de la letra."*
     Esto trata la **ausencia de `.sdd.json`** como un *fallback* de idioma a `es` en vez de como
     una **guarda de precondición**, ordenando al modelo continuar y aplicar `tremen-sdd` en un
     repositorio que no lo tiene activado.
   - En las skills delegadoras de roles pesados (`sdd-arquitecto`, `sdd-implementador`,
     `sdd-verificador`, `sdd-documentalista` en `claude-code` y `antigravity`, y las 6 skills de
     `kimi-code` y `opencode`), ni siquiera se comprueba `.sdd.json` antes de ordenar el
     despacho del subagente (`Agent`, `task` o `invoke_subagent`).
3. **Scripts CLI del núcleo (`core/scripts/scaffold.mjs`, `estado.mjs`, `tablero.mjs`,
   `valida.mjs`, `informe-qa.mjs`)**:
   - Sus bloques CLI (`esEntrypoint`) no verifican que el proyecto destino tenga `.sdd.json`. Si
     un agente ejecuta por error `scaffold.mjs` o `tablero.mjs` en un repositorio sin `.sdd.json`,
     el script crea directorios (`docs/epicas/`, `docs/adr/`) o ficheros (`docs/tablero.md`),
     ensuciando un repositorio ajeno a `tremen-sdd`.

Esta spec corrige el defecto en dos capas complementarias fijadas en **ADR-015**: guarda de
precondición en prosa (skills, agentes y roles, vigilada por `prosa-gates.mjs`) y barrera
mecánica *fail-closed* en los entrypoints CLI de `core/scripts/` (vía `core/lib/entrypoint.mjs`),
manteniendo puras las funciones programáticas exportadas para no acoplar los tests unitarios.

## Usuarios / roles afectados

- **Usuarios de cualquier harness con el plugin instalado globalmente**: Pueden trabajar en
  repositorios corporativos o proyectos sin `.sdd.json` con la garantía de que ningún rol, skill
  ni script de `tremen-sdd` se ejecutará ni ensuciará el árbol de trabajo por accidente.
- **`sdd-orquestador` y los 6 roles del pipeline (`sdd-producto`, `sdd-arquitecto`,
  `sdd-implementador`, `sdd-verificador`, `sdd-documentalista`, `sdd-como-vamos`)**: Reciben una
  guarda de precondición uniforme que aborta la ejecución si `.sdd.json` no existe en la raíz del
  proyecto.
- **`sdd-implementador`**: Implementa los 6 CA con TDD en la rama de la spec.
- **`sdd-verificador`**: Verifica con ojos frescos cada CA contra los tests y artefactos.

## Criterios de aceptación

### CA-1: Guarda de precondición `.sdd.json` en los 7 roles del núcleo (`core/roles/es/sdd-*.md`)
- **Given**: Los 7 ficheros de rol del núcleo agnóstico bajo `core/roles/es/`
  (`sdd-orquestador.md`, `sdd-producto.md`, `sdd-arquitecto.md`, `sdd-implementador.md`,
  `sdd-verificador.md`, `sdd-documentalista.md`, `sdd-como-vamos.md`).
- **When**: Se inspecciona el contenido de cada uno de los 7 ficheros de rol.
- **Then**:
  1. Cada rol declara explícitamente que la existencia de `.sdd.json` en la raíz del proyecto es
     precondición obligatoria y ordena **PARAR inmediatamente** (sin ejecutar el rol, sin delegar
     en subagentes y sin crear ni modificar ficheros) si `.sdd.json` no existe.
  2. El núcleo se mantiene 100% agnóstico al harness (`tools/checks/nucleo-agnostico.mjs` en
     verde).

### CA-2: Guarda de precondición `.sdd.json` en todas las skills de los 4 adaptadores (`adapters/*/skills/sdd-*/SKILL.md`)
- **Given**: Todos los ficheros `SKILL.md` bajo `adapters/claude-code/skills/` (7),
  `adapters/kimi-code/skills/` (6), `adapters/opencode/skills/` (6) y
  `adapters/antigravity/skills/` (7).
- **When**: Se inspecciona el contenido de cada `SKILL.md` (y su copia construida en `dist/<harness>/skills/`).
- **Then**:
  1. Ningún `SKILL.md` contiene el antipatrón de tratar la inexistencia del fichero `.sdd.json`
     como fallback a `es` (`si el fichero o el campo no existen`).
  2. Todo `SKILL.md` exige comprobar primero si existe `.sdd.json` en la raíz del proyecto:
     - **Si `.sdd.json` NO existe**: ordena **PARAR inmediatamente** (sin leer el rol del núcleo,
       sin invocar scripts de `core/scripts/` y sin lanzar subagentes mediante `Agent`, `task` o
       `invoke_subagent`). Si la skill se activó sola por una petición genérica, instruye a salir
       del flujo `tremen-sdd` y atender la petición de forma estándar sin mencionar ni aplicar
       `tremen-sdd`; si el usuario invocó explícitamente un rol o artefacto SDD, instruye a
       informar brevemente de que no existe `.sdd.json` y sugerir `/sdd-init`.
     - **Si `.sdd.json` SÍ existe**: toma el campo `idioma` (usando `es` por defecto únicamente si
       el campo `idioma` no está definido en `.sdd.json`) y continúa con la lectura del rol o la
       delegación al subagente.
  3. En `adapters/antigravity/skills/` para los 4 roles pesados (`sdd-arquitecto`,
     `sdd-implementador`, `sdd-verificador`, `sdd-documentalista`), además de la guarda previa al
     despacho, el `Prompt` de `invoke_subagent` incluye la instrucción de verificar `.sdd.json` en
     el arranque del subagente.

### CA-3: Guarda de precondición `.sdd.json` en todos los bootstraps de agentes (`adapters/*/agents/**/*.md`)
- **Given**: Los 18 ficheros markdown de agentes en `adapters/claude-code/agents/sdd-*.md` (4),
  `adapters/kimi-code/agents/prompts/sdd-*.md` (7) y `adapters/opencode/agents/sdd-*.md` (7), así
  como los comandos `adapters/*/commands/sdd-init.md` en su modo migración.
- **When**: Se inspecciona la sección `## Arranque obligatorio` de cada fichero de agente (y el
  Paso 2 de `sdd-init.md`).
- **Then**:
  1. Ningún fichero de agente contiene el antipatrón `si el fichero o el campo no existen`.
  2. El paso 1 de `## Arranque obligatorio` comprueba si existe `.sdd.json` en la raíz del
     proyecto: si NO existe, ordena **PARAR inmediatamente** sin leer el rol del núcleo, sin
     ejecutar scripts, sin delegar en subagentes y sin tocar ficheros (devolviendo/informando que
     `tremen-sdd` no está activado y sugiriendo `/sdd-init`, o atendiendo de forma estándar si es
     el agente raíz/primary ante una petición genérica); si SÍ existe, toma `idioma` (con
     fallback a `es` solo si falta el campo `idioma`) y pasa al punto 2.
  3. En `adapters/*/commands/sdd-init.md` (Paso 2 — Modo migración), se indica estampar primero
     `.sdd.json` (kit base) antes de correr `valida.mjs` por lotes, para respetar la barrera CLI.
  4. Los checks `roles-fuente-unica` y `referencias` pasan en verde para todos los adaptadores.

### CA-4: Check mecánico `checkPrecondicionSdd` en `tools/checks/prosa-gates.mjs`
- **Given**: El check `tools/checks/prosa-gates.mjs` cableado en `tools/check.mjs`.
- **When**: Se ejecuta `checkPrecondicionSdd(repoRoot)` (y `node tools/checks/prosa-gates.mjs`)
  contra el árbol real del repositorio y contra fixtures sintéticos en `tools/tests/prosa-gates.test.mjs`.
- **Then**:
  1. Descubre automáticamente todos los ficheros `core/roles/es/sdd-*.md`,
     `adapters/*/skills/sdd-*/SKILL.md` y `adapters/*/agents/**/*.md`.
  2. Devuelve `ok: false` (e identifica en `infractores` el fichero y motivo) si algún fichero:
     - contiene el antipatrón de fallback ante fichero ausente (`si el fichero o el campo no existen`), o
     - no menciona `.sdd.json`, o
     - no incluye la instrucción de parada cuando `.sdd.json` no existe.
  3. Devuelve `ok: true` (y código de salida `0` en CLI) sobre el árbol real del repositorio,
     manteniendo intactos los tests existentes de `checkProsaGates` sobre `sdd-documentalista.md`.

### CA-5: Funciones `buscarRaizSdd` y `exigirProyectoSdd` en `core/lib/entrypoint.mjs`
- **Given**: El módulo `core/lib/entrypoint.mjs`.
- **When**: Se invocan `buscarRaizSdd(desde)` y `exigirProyectoSdd(desde)` en tests unitarios
  (`core/tests/entrypoint.test.mjs`) sobre:
  1. Un directorio con `.sdd.json` en su raíz o un subdirectorio suyo (p. ej. `<raiz>/docs` o
     `<raiz>/docs/epicas/EPIC-001`, exista o no aún el subdirectorio `docs` en disco).
  2. Un directorio con `.git` en su raíz pero sin `.sdd.json` (incluso si un directorio padre
     externo tuviera `.sdd.json`).
  3. Un directorio temporal sin `.sdd.json` en ningún ancestro.
- **Then**:
  1. En (1), `buscarRaizSdd` y `exigirProyectoSdd` devuelven la ruta absoluta de la raíz que
     contiene `.sdd.json`.
  2. En (2) y (3), `buscarRaizSdd` devuelve `null` y `exigirProyectoSdd` lanza un `Error` cuyo
     mensaje menciona `.sdd.json` y `/sdd-init`.
  3. `core/lib/entrypoint.mjs` solo importa módulos `node:*` (`nucleo-aislado` en verde).

### CA-6: Barrera mecánica fail-closed en el CLI de los 5 scripts de `core/scripts/` y pureza de funciones exportadas
- **Given**: Los 5 scripts del núcleo (`core/scripts/scaffold.mjs`, `core/scripts/estado.mjs`,
  `core/scripts/tablero.mjs`, `core/scripts/valida.mjs`, `core/scripts/informe-qa.mjs`).
- **When**:
  1. Se ejecuta cada uno de los 5 scripts como proceso CLI (`node <script>.mjs ...`) apuntando a
     un directorio temporal sin `.sdd.json`.
  2. Se ejecuta cada script como proceso CLI apuntando a un directorio temporal que sí posee
     `.sdd.json`.
  3. Se ejecuta la suite completa `npm test` (que invoca directamente las funciones exportadas
     `createArtifact`, `transition`, `renderBoard`, `validate`, `validateFile`, `renderReport` en
     `core/tests/*.test.mjs`, y el runner en `tools/tests/check.test.mjs`).
- **Then**:
  1. En (1), los 5 scripts terminan con código de salida `!= 0`, escriben en `stderr` el error de
     `.sdd.json` ausente y **no crean ni modifican ningún fichero ni directorio en disco**.
  2. En (2), los scripts completan su operación con código de salida `0`.
  3. En (3), las funciones exportadas siguen funcionando sin exigir `.sdd.json` en los tests
     unitarios de `core/tests/`, `arbolDocs` en `tools/tests/check.test.mjs` incluye `.sdd.json`
     para su test de subproceso CLI, y `npm test` + `npm run check` pasan íntegramente en verde.

## Entidades y reglas afectadas

- **Reglas de negocio (`docs/fundacion/reglas.md`)**:
  - **RN-01**: Nada se codea sin spec aprobada.
  - **RN-02**: La dependencia va solo adaptador → núcleo (`core/lib/entrypoint.mjs` y
    `core/scripts/*.mjs` solo usan `node:*` y ficheros de `core/`).
  - **RN-03**: El enforcement es independiente del harness (la barrera CLI en `core/scripts/`
    protege cualquier invocación en cualquier harness o terminal).
  - **RN-04**: Un ADR aceptado es inmutable (se registra `ADR-015` como decisión nueva que
    complementa `ADR-002`, `ADR-011` y `ADR-012`).
  - **RN-06**: La prosa de cada rol tiene una única fuente (`core/roles/es/sdd-*.md`; los
    bootstraps de `agents/` mantienen solo arranque y contrato de subagente sin embeber
    `## Misión`, `## Flujo` ni `## Reglas duras`).
  - **RN-09**: Ningún rol aprueba su propio trabajo (spec y ADR quedan en `borrador` para el gate
    humano).
  - **RN-10**: Dogfooding (las rutas vigiladas `core/scripts/` y `core/lib/` se modificarán
    exclusivamente en la rama `ft/SPEC-024-...` una vez aprobada la spec).
- **Decisiones arquitectónicas (`docs/adr/`)**:
  - **ADR-015** (nuevo, en `borrador`): Activación opt-in por repositorio mediante `.sdd.json` en
    prosa y CLI del núcleo.
  - **ADR-002**: Modelo de enforcement en capas (hooks L1 fail-open sin `.sdd.json`).
  - **ADR-011**: Generalización de los checks de invariantes por autodescubrimiento.
  - **ADR-012**: Verificabilidad mecánica de la prosa.
- **Dominio (`docs/fundacion/dominio.md`)**:
  - Conceptos de `núcleo`, `adaptador`, `harness`, `rol`, `hook` y `gate (humano)`.

## Fuera de alcance

- No se modifica el comportamiento de los hooks L1 (`require-spec`, `protege-verdad`, `calidad`)
  ni del pre-commit L2 (`tools/githooks/pre-commit.mjs`), que ya verifican `.sdd.json`.
- No se altera la fuente canónica de descripciones `core/roles/es/_descripciones.json` (RN-11),
  que describe cuándo disparan las skills en proyectos `tremen-sdd`.
- No se cambia la firma ni el comportamiento de las funciones programáticas exportadas por
  `core/scripts/*.mjs` cuando se importan como módulos ESM.

## Notas para el gate humano

- **Defecto observado en uso real**: Al estar instalado el plugin a nivel global de usuario, abrir
  un repositorio corporativo o ajeno a `tremen-sdd` hacía que las skills/agentes tratasen la
  ausencia de `.sdd.json` como `idioma: "es"` y ejecutasen el método SDD (o sus scripts CLI) en
  repositorios que no usan `tremen-sdd`.
- **Doble barrera (cognitiva + mecánica)**:
  1. La guarda en todas las `SKILL.md`, `agents/**/*.md` y `core/roles/es/sdd-*.md` instruye al
     modelo a detenerse inmediatamente si no existe `.sdd.json` (respondiendo de forma estándar
     sin mencionar SDD ante peticiones genéricas, o sugiriendo `/sdd-init` ante invocaciones
     explícitas a SDD).
  2. La guarda `exigirProyectoSdd` en el bloque `esEntrypoint` de los 5 scripts de `core/scripts/`
     garantiza mecánicamente que ninguna invocación CLI pueda crear ni modificar ficheros en un
     repositorio sin `.sdd.json`.
- **Aprobación requerida (RN-09)**: Tanto `SPEC-024` como `ADR-015` se entregan en estado
  `borrador`. Requieren el OK explícito de Alberto Fojo para transicionar a `aprobada` y abrir la
  rama `ft/SPEC-024-guarda-de-activacion-por-sdd-json-en-skills-agentes-roles-y-cli-del-nucleo`.
