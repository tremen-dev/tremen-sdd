---
id: ADR-013
tipo: adr
estado: aprobada
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-10-14, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-10-14, por: Alberto Fojo}
---
# ADR-013: Encaje de Antigravity, modelo de plugins, skills y enforcement PreToolUse

- Deciders: propone sdd-arquitecto; aprueba Alberto Fojo (gate humano).
- Specs relacionadas: SPEC-019 (Adaptador Antigravity base), SPEC-020 (Enforcement L1),
  SPEC-021 (Integración de invariantes) y SPEC-022 (Scaffolding y documentación) de
  EPIC-006. Complementa ADR-001 (build/empaquetado), ADR-002 (enforcement en capas
  L1/L2/L3), ADR-003/ADR-007 (empaquetado y resolución sin variable de plugin-root) y
  ADR-011 (generalización de checks). No los supersede.

## Contexto

EPIC-006 incorpora **Google Antigravity** como el cuarto harness soportado por
tremen-sdd con **paridad completa**. Antigravity coexiste como IDE (entorno AI-first
basado en VS Code), aplicación de escritorio (Antigravity 2.0) y CLI (`agy`).
Para mantener la disciplina del estándar y satisfacer los criterios de éxito de
EPIC-006, debemos definir sobre la especificación técnica oficial de Antigravity:
1. El mecanismo de empaque y distribución del adaptador.
2. El modelo de exposición de roles y comandos (skills vs agentes).
3. La resolución del núcleo agnóstico (`core/`) dentro del artefacto autocontenido.
4. El mecanismo de enforcement L1: interceptación y capacidad de denegación real.

### Hallazgos técnicos sobre Antigravity (skills `agy-customizations` y `antigravity-guide`)

- **Plugins**: Antigravity define un estándar formal de plugins empaquetados en un
  subdirectorio bajo `plugins/<nombre>/` dentro de cualquier raíz de personalización
  (local en `.agents/plugins/` o global en `~/.gemini/config/plugins/`). Un plugin
  declara su manifiesto `plugin.json` e ingesta automáticamente sus `skills/`,
  `hooks.json`, `rules/` y servidores MCP asociados.
- **Skills**: Residen en `skills/<skill_name>/SKILL.md` con frontmatter YAML
  (`name`, `description`). Antigravity emplea **progressive disclosure**: solo los
  metadatos (`name` y `description`) entran al contexto inicialmente; el cuerpo
  completo de la skill se carga bajo demanda cuando el modelo o el usuario deciden
  activarla.
- **Rules**: Reglas contextuales jerárquicas (`GEMINI.md`, `AGENTS.md` o
  `.agents/rules/*.md`). Se descubren subiendo desde el directorio del fichero
  editado hasta la raíz del repositorio, aportando directrices persistentes.
- **Lifecycle Hooks (`hooks.json`)**:
  - Evento `PreToolUse`: Recibe en `stdin` el payload JSON con `toolCall` (`name`,
    `args`), `stepIdx`, `workspacePaths`, etc.
  - Matcher: Soporta expresiones regulares sobre el nombre de la tool (ej.
    `"write_to_file|replace_file_content|multi_replace_file_content"`).
  - **Decisión y severidad**: Al responder en `stdout` `{"decision": "deny", "reason": "..."}`,
    Antigravity **aborta inmediatamente** la herramienta (`Hard block the execution
    immediately`). Por tanto, Antigravity **deniega de verdad** en L1.
  - Evento `PostToolUse`: Permite inspeccionar el resultado tras la ejecución para
    comprobaciones de calidad.
- **Herramientas de edición**: En Antigravity las mutaciones de código no usan
  `Edit`/`Write` genéricos de Claude ni `edit` de opencode, sino las tools
  especializadas `write_to_file`, `replace_file_content` y `multi_replace_file_content`,
  cuyo argumento de ruta es `TargetFile` o `AbsolutePath`.

## Decisión

1. **Formato de empaque**:
   El adaptador de Antigravity será un **plugin estándar** autocontenido, ensamblado
   por `tools/build-adapter.mjs antigravity` en `dist/antigravity/`.
   - Contendrá `plugin.json`, `hooks/hooks.json`, entrypoints `hooks/*.mjs`,
     `skills/` y el subárbol completo `core/`.
   - Se distribuirá/instalará copiándolo a `.agents/plugins/tremen-sdd/` (ámbito de
     proyecto) o a `~/.gemini/config/plugins/tremen-sdd/` (ámbito de usuario).

2. **Modelo de roles y despacho (Skills con Progressive Disclosure)**:
   - Los 7 roles canónicos (`sdd-orquestador`, `sdd-producto`, `sdd-arquitecto`,
     `sdd-implementador`, `sdd-verificador`, `sdd-documentalista`, `sdd-como-vamos`)
     se implementarán como skills en `skills/sdd-*/SKILL.md`.
   - Cada skill declarará la `description` idéntica a la canónica de
     `core/roles/es/_descripciones.json` (RN-11).
   - Ninguna skill embeberá el cuerpo del rol (RN-06). Su cuerpo será el bootstrap que
     lee `.sdd.json` y carga `../core/roles/<idioma>/sdd-<rol>.md` mediante rutas
     relativas internas.
   - Los comandos `sdd-init` y `sdd-tablero` se expondrán como skills y comandos
     ejecutables para operar el ciclo de vida del proyecto.

3. **Resolución de `${SDD_ROOT}` sin plugin-root**:
   Al igual que en Kimi y opencode (ADR-003, ADR-004), Antigravity no inyecta una
   variable de entorno con la raíz del plugin. `${SDD_ROOT}` se resuelve de forma
   relativa interna dentro del artefacto:
   - En skills: `../core/...` relativo al fichero de skill.
   - En scripts ESM de hooks: mediante `import.meta.url` o relativo al cwd del hook
     (que Antigravity fija en el directorio que contiene `hooks.json`).

4. **Enforcement L1 (Hooks que deniegan de verdad)**:
   - Se configurará `hooks/hooks.json` registrando `PreToolUse` con matcher:
     `"write_to_file|replace_file_content|multi_replace_file_content"`.
   - El script `hooks/require-spec.mjs` normalizará el payload a través de
     `hooks/_comun.mjs`, extraerá la ruta del fichero (`TargetFile` o `AbsolutePath`)
     y llamará a la lógica pura compartida `core/lib/require-spec.mjs`
     (`evaluarRequireSpec`).
   - Si la edición viola la regla (código vigilado sin rama `ft/SPEC-NNN` o spec no
     aprobada), responderá `{"decision": "deny", "reason": motivo}`.
   - Se respetará el principio fail-open de L1: ante cualquier error no controlado o
     con `SDD_SKIP_GATE=1`, emitirá `{"decision": "allow"}`.
   - La garantía dura e ineludible permanece en git pre-commit (L2) y CI (L3), según
     ADR-002.

5. **Reglas de gobernanza en proyecto**:
   - El comando de scaffolding `sdd-init` generará un fichero `AGENTS.md` en la
     raíz del proyecto destino, complementando a `CLAUDE.md`, para que Antigravity
     ingeste en su contexto las directrices de SDD desde el primer turno.

## Consecuencias

### Positivas
- Paridad funcional completa con Claude Code y opencode.
- Enforcement L1 estricto: los intentos de codear sin spec son bloqueados de forma
  nativa antes de tocar el sistema de ficheros.
- Descubrimiento nativo y ergonómico gracias al sistema de plugins y progressive disclosure.
- Cumplimiento de todas las invariantes del núcleo (`nucleo-aislado`, `roles-fuente-unica`,
  `descripcion-fuente-unica`).

### Negativas / seguimiento
- Se añaden nuevos entrypoints y checks de invariantes que mantener en el repositorio.
