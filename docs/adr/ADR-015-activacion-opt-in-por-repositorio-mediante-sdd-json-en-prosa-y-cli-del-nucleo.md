---
id: ADR-015
tipo: adr
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-10-16, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-10-16, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# ADR-015: Activacion opt-in por repositorio mediante sdd-json en prosa y CLI del nucleo

- Deciders: propone sdd-arquitecto; aprueba Alberto Fojo (pendiente, gate humano de SPEC-024).
- Specs relacionadas: **SPEC-024** (EPIC-FIX). Complementa **ADR-002** (modelo de enforcement en
  capas: extiende la semántica opt-in por proyecto de `.sdd.json` desde los hooks L1 hacia la
  superficie de skills/agentes/roles y el CLI del núcleo), **ADR-011** (autodescubrimiento en
  checks transversales) y **ADR-012** (verificabilidad mecánica de reglas duras en prosa).
  **NO supersede** ningún ADR previo (RN-04).

## Contexto

Los adaptadores de `tremen-sdd` (`claude-code`, `kimi-code`, `opencode`, `antigravity`) se
instalan a **nivel global de usuario** en el harness correspondiente (p. ej.
`~/.claude/plugins/`, `~/.gemini/config/plugins/tremen-sdd`, `~/.config/opencode/`). Como
consecuencia directa de este modelo de instalación:

1. **Visibilidad global del catálogo SDD**: Las skills (`skills/sdd-*/SKILL.md`), subagentes
   (`agents/`) y scripts del núcleo (`core/scripts/*.mjs`) están disponibles y visibles para el
   LLM en **cualquier repositorio** que el usuario abra en su máquina, incluyendo repositorios
   corporativos (p. ej. proyectos de empresa donde `tremen-sdd` no se utiliza) o proyectos
   personales aún no inicializados.
2. **Asimetría entre hooks L1 y el resto del plugin**:
   - **Hooks L1 (`require-spec`, `protege-verdad`, `calidad`)**: Desde ADR-002 leen `.sdd.json`
     en la raíz del proyecto (`readConfig(cwd)`) y son *fail-open* cuando `.sdd.json` no existe
     (`if (!cfg) allow()`), permaneciendo 100% transparentes e inactivos en repositorios ajenos
     a `tremen-sdd`.
   - **Skills y Agentes (`SKILL.md` y `agents/**/*.md`)**:
     - En los skills directos y en los bootstraps de agentes (`## Arranque obligatorio`), el
       paso 1 decía:
       *"Lee `.sdd.json` en la raíz del proyecto y toma el campo `idioma` (si el fichero o el
       campo no existen, usa `es`). Después lee `.../core/roles/<idioma>/sdd-<rol>.md` y sigue
       sus instrucciones al pie de la letra."*
       Es decir, trataba la **inexistencia de `.sdd.json`** como un simple *fallback* de idioma a
       `es` en lugar de como la señal de que `tremen-sdd` **no está activo en el repositorio**,
       ordenando imperativamente al agente cargar el rol y ejecutar el pipeline SDD.
     - Peor aún: las skills delegadoras de roles pesados en `claude-code`, `kimi-code`,
       `opencode` y `antigravity` ni siquiera mencionaban `.sdd.json` antes de ordenar el
       lanzamiento inmediato del subagente (`Agent`, `task` o `invoke_subagent`).
   - **Scripts CLI del núcleo (`core/scripts/scaffold.mjs`, `estado.mjs`, `tablero.mjs`,
     `valida.mjs`, `informe-qa.mjs`)**:
     Cuando un agente desorientado invoca por CLI cualquiera de estos scripts en un repositorio
     sin `.sdd.json` (por ejemplo, `node .../scaffold.mjs epica "..."` o `node .../tablero.mjs`),
     el bloque `esEntrypoint` ejecuta la acción sin verificar si el repositorio tiene `.sdd.json`,
     creando directorios (`docs/epicas/`, `docs/adr/`) o ficheros (`docs/tablero.md`) y
     contaminando el árbol de trabajo de un repositorio ajeno a `tremen-sdd`.

Necesitamos cerrar esta asimetría fijando una frontera inequívoca de activación opt-in por
repositorio gobernada por `.sdd.json`, tanto en la capa cognitiva (prosa de skills, agentes y
roles) como en la capa mecánica (entrypoints CLI de `core/scripts/`), sin degradar la pureza
unitaria de las funciones exportadas del núcleo.

## Decisión

### 1. `.sdd.json` como marcador canónico de activación opt-in por proyecto

Un repositorio tiene `tremen-sdd` activo **sí y solo si** existe el fichero `.sdd.json` en su
raíz de proyecto. La única pieza de todo el ecosistema autorizada a operar en ausencia de
`.sdd.json` es el comando de inicialización `/sdd-init` (`commands/sdd-init.md`), cuya misión es
precisamente crear `.sdd.json` antes de invocar `tablero.mjs` o `valida.mjs`.

### 2. Capa 1 (Prosa): Guarda de precondición en Skills, Agentes y Roles

Se elimina en todos los adaptadores y roles el antipatrón *"si el fichero o el campo no existen,
usa `es`"* y se separa explícitamente la **existencia de `.sdd.json`** (precondición de
activación) del **valor por defecto de `idioma`** (`es` cuando `.sdd.json` existe pero omite la
clave `idioma`):

1. **En todas las `SKILL.md` (`adapters/*/skills/sdd-*/SKILL.md`)**:
   - Antes de leer el rol del núcleo o de delegar en un subagente (`Agent`, `task`,
     `invoke_subagent`), la skill exige comprobar si existe `.sdd.json` en la raíz del proyecto.
   - **Si `.sdd.json` NO existe**: `tremen-sdd` no está activado en el repositorio. El agente
     **PARA inmediatamente** el flujo SDD (no lee el rol, no ejecuta scripts de `core/scripts/`
     y no lanza subagentes):
     - Si la skill se activó automáticamente por una petición genérica del usuario (p. ej.
       *"arregla este bug"*, *"añade un endpoint"*), el asistente sale en silencio del flujo
       `tremen-sdd` y atiende la petición de forma estándar sin aplicar ni mencionar `tremen-sdd`.
     - Si el usuario invocó explícitamente un rol o artefacto de `tremen-sdd` (p. ej. *"usa
       sdd-arquitecto"*, *"¿cómo vamos con las specs?"*), el asistente informa brevemente de que
       el repositorio no tiene `.sdd.json` (`tremen-sdd` no está activado) y sugiere ejecutar
       `/sdd-init`.
   - **Si `.sdd.json` SÍ existe**: toma el campo `idioma` (usando `es` por defecto únicamente si
     el campo `idioma` no está definido en `.sdd.json`) y procede con la lectura del rol o la
     delegación al subagente.
2. **En todos los bootstraps de agentes (`adapters/*/agents/**/*.md`)**:
   - El paso 1 de `## Arranque obligatorio` verifica la existencia de `.sdd.json` en la raíz del
     proyecto. Si no existe, **PARA inmediatamente** sin leer el rol, sin ejecutar scripts del
     núcleo, sin delegar en subagentes y sin crear ni modificar ficheros.
3. **En los 7 roles del núcleo (`core/roles/es/sdd-*.md`)**:
   - Cada fichero de rol incluye en sus reglas duras la precondición de que sin `.sdd.json` en la
     raíz del proyecto `tremen-sdd` no está activo y el rol debe parar de inmediato sin tocar el
     árbol ni delegar.
4. **Verificación mecánica en CI (`tools/checks/prosa-gates.mjs`)**:
   - Se amplía `tools/checks/prosa-gates.mjs` con `checkPrecondicionSdd(repoRoot)`, que recorre
     por autodescubrimiento (ADR-011) `core/roles/es/sdd-*.md`, `adapters/*/skills/sdd-*/SKILL.md`
     y `adapters/*/agents/**/*.md`, verificando que todos declaren la guarda de `.sdd.json` con
     orden de parada y que ninguno contenga el antipatrón de fallback cuando el fichero no existe.

### 3. Capa 2 (Mecánica): Barrera fail-closed en los entrypoints CLI de `core/scripts/`

La prosa detiene al agente obediente; la barrera mecánica detiene al agente que ignora la prosa
e invoca directamente un script del núcleo por CLI:

1. **Helper compartido en `core/lib/entrypoint.mjs`**:
   - `buscarRaizSdd(desde = process.cwd())`: asciende desde `path.resolve(desde)` hacia los
     directorios padre buscando `.sdd.json`. Si encuentra `.sdd.json`, devuelve ese directorio
     raíz. Si encuentra una frontera de repositorio `.git` sin `.sdd.json` en ese mismo nivel, o
     alcanza la raíz del sistema de ficheros sin hallar `.sdd.json`, devuelve `null` (cortar en
     `.git` impide que un `.sdd.json` accidental en un directorio superior fuera del repositorio
     enmascare un repositorio git que no usa `tremen-sdd`).
   - `exigirProyectoSdd(desde = process.cwd())`: invoca `buscarRaizSdd(desde)`; si devuelve
     `null`, lanza un `Error` claro indicando que el proyecto no tiene `.sdd.json` (`tremen-sdd`
     no está activado) y sugiriendo `/sdd-init`.
2. **Separación entre API programática (pura) y entrypoint CLI (protegido)**:
   - Las funciones exportadas por `core/scripts/*.mjs` (`createArtifact`, `nextId`, `slugify`,
     `transition`, `renderBoard`, `validate`, `validateFile`, `renderReport`) **permanecen puras
     respecto a `.sdd.json`**: operan directamente sobre las rutas recibidas por parámetro, de
     modo que los tests unitarios de `core/tests/*.test.mjs` siguen probando la lógica de negocio
     sobre directorios temporales ligeros (`tmpDocs()`) sin boilerplate adicional.
   - Los bloques CLI (`if (esEntrypoint(import.meta.url, process.argv[1]))`) de los 5 scripts
     (`scaffold.mjs`, `estado.mjs`, `tablero.mjs`, `valida.mjs`, `informe-qa.mjs`) invocan
     `exigirProyectoSdd(rutaObjetivo)` **antes** de leer o escribir cualquier fichero. Si no hay
     `.sdd.json`, imprimen el error por `stderr` y terminan con `process.exit(1)` sin crear ni
     modificar nada en disco.

## Consecuencias

### Positivas
- **Cero contaminación de repositorios no-SDD**: Ni las skills/agentes se activan por accidente en
  repositorios corporativos o personales sin `.sdd.json`, ni una llamada CLI errónea a
  `scaffold.mjs` o `tablero.mjs` puede ensuciar un repositorio ajeno creando carpetas `docs/`.
- **Simetría arquitectónica completa**: Hooks L1, skills, agentes, roles y scripts CLI comparten
  exactamente el mismo predicado de activación (`.sdd.json` en la raíz del proyecto).
- **Suites de tests unitarios intactas**: Al situar la barrera mecánica en el bloque
  `esEntrypoint` (vía `core/lib/entrypoint.mjs`), las funciones exportadas del núcleo conservan
  su firma y pureza funcional.
- **Vigilancia continua en CI**: `checkPrecondicionSdd` en `prosa-gates.mjs` impide regresiones
  en cualquiera de los 4 adaptadores actuales o en futuros adaptadores por autodescubrimiento.

### Negativas / follow-ups
- Cualquier test de integración que invoque un script de `core/scripts/` como subproceso CLI
  (`node valida.mjs --dir ...`) sobre un directorio temporal debe incluir `.sdd.json` en la raíz
  de ese fixture temporal (como ocurre en `arbolDocs` de `tools/tests/check.test.mjs`).

## Alternativas consideradas

- **Exigir `.sdd.json` dentro de las funciones exportadas (`createArtifact`, `transition`,
  `renderBoard`, `validate`, `renderReport`) en lugar de en el entrypoint CLI**.
  *Motivo de rechazo*: Acoplaría funciones puras de transformación/validación de documentos a la
  estructura de configuración del proyecto en disco, obligando a reescribir todos los fixtures
  unitarios de `core/tests/*.test.mjs` sin aportar ninguna seguridad extra frente al agente (que
  siempre invoca los scripts como subproceso CLI `node <script>.mjs`).
- **Confiar únicamente en la prosa de `SKILL.md` y `agents/*.md` sin barrera mecánica en
  `core/scripts/`**.
  *Motivo de rechazo*: Viola el principio del método *"la prosa refuerza; la barrera real es
  estructural en el script"* (como en `estado.mjs` para `FIRMANTES`, ADR-006). Si un agente
  ignora la prosa y ejecuta `scaffold.mjs` o `tablero.mjs`, solo una guarda en el script evita
  que se creen ficheros en un repositorio ajeno.
- **Comprobar `.sdd.json` únicamente en `process.cwd()` ignorando `--dir` o la `<ruta>` pasada al
  script CLI**.
  *Motivo de rechazo*: Si el proceso se invocara pasando `--dir /otro/repo/docs` o una ruta de
  artefacto de otro directorio sin `.sdd.json`, mirar solo `process.cwd()` no protegería el
  directorio destino, y a la inversa fallaría si el comando se lanza desde un subdirectorio del
  propio proyecto SDD. Resolver ascendiendo desde la ruta objetivo (con corte en `.git`) cubre
  ambos casos con precisión.

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
