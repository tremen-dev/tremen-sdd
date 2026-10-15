---
id: ADR-014
tipo: adr
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-10-15, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-10-15, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# ADR-014: Despacho de subagentes en Google Antigravity con invoke_subagent (self)

- Deciders: propone sdd-arquitecto; aprueba Alberto Fojo (gate humano).
- Specs relacionadas: SPEC-023 (EPIC-FIX). Enmienda y supersede parcialmente el punto 2
  ("Modelo de roles y despacho (Skills con Progressive Disclosure)") de ADR-013.
  ADR-013 permanece como registro histórico inmutable (RN-04) y mantiene plenamente vigentes
  sus puntos 1 (formato de plugin), 3 (resolución de `${SDD_ROOT}` sin plugin-root),
  4 (enforcement PreToolUse L1) y 5 (reglas de gobernanza con `AGENTS.md`).
  Complementa ADR-001 (multi-harness), ADR-003/ADR-007 (resolución interna), ADR-009
  (separación del verificador) y ADR-011 (generalización de checks).

## Contexto

EPIC-006 incorporó Google Antigravity como cuarto harness oficial de tremen-sdd. En ADR-013
se modeló la integración preliminar basándose en la documentación de plugins y skills de
Antigravity. Sin embargo, el ejercicio real del runtime y la auditoría técnica de la
plataforma revelaron tres defectos de diseño estructurales que impiden el funcionamiento
correcto del método SDD:

1. **Inexistencia de descubrimiento de `agents/` en plugins**:
   La especificación formal de plugins de Antigravity (verificada en la skill oficial
   `agy-customizations`) establece que un plugin solo ingesta automáticamente:
   - `skills/` (cada una con su `SKILL.md` bajo `skills/<nombre>/`),
   - `rules/` (`.agents/rules/*.md`),
   - `hooks.json` (declaración de lifecycle hooks),
   - y servidores MCP declarados en `plugin.json`.
   Antigravity **no descubre ni procesa** un directorio `agents/` dentro de un plugin.
   El subdirectorio `adapters/antigravity/agents/` creado en EPIC-006 constituía un
   directorio fantasma (código muerto) que el runtime ignoraba por completo.

2. **Inexistencia de la herramienta `Agent`**:
   Antigravity no expone la tool `Agent(subagent_type: ...)` propia de Claude Code o
   del shim de Kimi Code. El runtime de Antigravity proporciona la herramienta nativa
   del sistema `invoke_subagent` (acompañada por `define_subagent` y `manage_subagents`).

3. **Ruptura del aislamiento de contexto y pérdida de ojos frescos (RN-02, RN-03)**:
   Al carecer de despacho de subagentes funcional, las skills de Antigravity
   (`adapters/antigravity/skills/sdd-*/SKILL.md`) se implementaron con un bootstrap
   que instruía al modelo a leer `.sdd.json` y el rol en `../../core/roles/es/<rol>.md`,
   asumiendo el rol **en el hilo principal de la conversación**.
   Esto quiebra dos principios fundacionales de tremen-sdd:
   - **Aislamiento de contexto**: los roles pesados (`sdd-arquitecto`, `sdd-implementador`,
     `sdd-verificador`, `sdd-documentalista`) contaminaban el hilo de diálogo principal
     acumulando miles de tokens de contexto irrelevante para los pasos subsiguientes.
   - **Verificación adversarial independiente (ojos frescos)**: el verificador no evaluaba
     con ojos frescos e imparciales frente a los artefactos (código, tests y ledger), sino
     influenciado por todo el historial de razonamiento e intentos previos del
     implementador y del orquestador en el mismo hilo, quebrando el principio de
     verificación adversarial.

Debemos definir el mecanismo de despacho de subagentes en Antigravity que restaure el
aislamiento estricto de contexto y limpie la superficie del adaptador.

## Decisión

### 1. Mecanismo de despacho: Adopción de Opción A (`invoke_subagent` con `TypeName: "self"`)

Se adopta como mecanismo oficial de despacho en Antigravity la invocación directa e
inmediata de la herramienta del sistema `invoke_subagent` parametrizada con `TypeName: "self"`:

```json
invoke_subagent({
  "Subagents": [{
    "TypeName": "self",
    "Role": "sdd-<rol>",
    "Prompt": "<encargo exhaustivo y autosuficiente: id de spec, rama, ficheros, expectativas>",
    "Model": "inherit"
  }]
})
```

- **Semántica de `TypeName: "self"`**: En Antigravity, `self` clona el subagente con la
  configuración y herramientas del agente llamador (herramientas de lectura, edición
  `write_to_file`/`replace_file_content`, ejecución de comandos `run_command`, etc.), pero
  en un subproceso con **contexto completamente aislado y ventana de conversación limpia**.
- **Identidad del rol**: Se fija en la propiedad `Role` (ej. `"Role": "sdd-implementador"`).
- **Comunicación asíncrona**: El subagente ejecuta su labor de forma aislada y reporta
  su informe de cierre al orquestador llamador mediante la herramienta de mensajería
  `send_message(Recipient: <caller_id>, Message: "...")`.
- **Independencia de artefactos**: El prompt suministrado debe ser autosuficiente, pues
  el subagente no tiene visibilidad de la conversación previa del orquestador. La verdad
  se transmite por artefactos versionados (spec, ledger, ficheros de código y test), nunca
  por arrastre de memoria en la ventana de contexto.

### 2. Justificación frente a la Opción B (`define_subagent`)

Se descarta la Opción B (`define_subagent`) por las siguientes razones:
- **Stateless vs Stateful**: `define_subagent` exige una mutación previa de estado en la
  sesión para registrar un nuevo tipo de subagente antes de poder invocarlo. Si la sesión
  se reinicia o cambia de ventana, o si el paso de definición no se ejecuta, el despacho falla.
  La Opción A es completamente **stateless**: `TypeName: "self"` está disponible de forma
  garantizada e intrínseca en cada turno y conversación.
- **Sin sobrecoste de bootstrap**: `define_subagent` requiere inyectar un system prompt
  completo en la definición dinámica. Con `self`, el subagente arranca al instante y el
  propio prompt le instruye a leer su rol desde el núcleo agnóstico (`../../core/roles/es/<rol>.md`).
- **Simplicidad operativa**: No requiere gestionar identificadores dinámicos de tipos de
  subagentes ni lidiar con colisiones de nombres o ciclos de vida en `manage_subagents`.

### 3. Limpieza de superficie: Eliminación de `adapters/antigravity/agents/`

Al confirmar que Antigravity no descubre `agents/` desde `plugin.json`:
- Se elimina completamente el directorio `adapters/antigravity/agents/` del árbol de fuente.
- `tools/build-adapter.mjs antigravity` no generará `dist/antigravity/agents/`.
- La superficie de Antigravity queda compuesta exclusivamente por:
  - `plugin.json` (manifiesto del plugin),
  - `skills/` (`skills/sdd-*/SKILL.md`),
  - `commands/` (`commands/sdd-init.md`, `commands/sdd-tablero.md`),
  - `hooks/` (`hooks/hooks.json` y entrypoints `.mjs`),
  - `tests/` (suite del adaptador).

### 4. Actualización del check de invariante estructural (`tools/checks/layout.mjs`)

En cumplimiento de ADR-011 §3 (los adaptadores difieren por diseño y el mínimo común solo
debe exigir lo que es verdaderamente universal):
- Se redefine `MINIMO_COMUN` en `tools/checks/layout.mjs` a:
  ```javascript
  const MINIMO_COMUN = ['skills/', 'tests/'];
  ```
- `agents/` pasa a ser un extra por harness en `EXTRAS_POR_HARNESS`:
  ```javascript
  const EXTRAS_POR_HARNESS = {
    'claude-code': ['.claude-plugin/plugin.json', 'agents/', 'commands/', 'hooks/'],
    'kimi-code': ['agents/', 'hooks/'],
    'opencode': ['opencode.json', 'agents/', 'commands/', 'plugins/'],
    'antigravity': ['plugin.json', 'commands/', 'hooks/'],
  };
  ```
- Esto garantiza que ningún harness sufra falsos positivos ni falsos negativos (ADR-011 §5).

### 5. Actualización del validador de manifiestos (`tools/checks/manifiestos.mjs`)

En `checkManifiestosAntigravity(distDir)`:
- Se retira la verificación de existencia de `agents/${rol}.md`.
- Se valida rigurosamente que las 7 skills canónicas (`skills/${rol}/SKILL.md`) estén presentes
  en el artefacto construido, junto con los comandos y hooks preceptivos.

### 6. Contrato de las skills en `adapters/antigravity/skills/`

Las skills se clasifican según su naturaleza operativa:

- **Roles pesados (`sdd-arquitecto`, `sdd-implementador`, `sdd-verificador`, `sdd-documentalista`)**:
  El cuerpo de su `SKILL.md` prohíbe taxativamente la autoejecución en el hilo principal y
  prescribe instruir al orquestador a delegar la labor vía `invoke_subagent` con `TypeName: "self"`
  y `Role: "sdd-<rol>"`.
- **Roles dialógicos directos (`sdd-producto`, `sdd-como-vamos`)**:
  Corren en el contexto principal del usuario. `sdd-producto` requiere iteración dialógica
  en vivo con el humano para refinar requisitos. `sdd-como-vamos` es una consulta read-only
  rápida de estado. Sus skills mantienen el bootstrap de lectura de `.sdd.json` y el fichero
  de rol correspondiente del núcleo agnóstico.
- **Orquestador (`sdd-orquestador`)**:
  Opera en el contexto principal como despachador y conductor del pipeline.

### 7. Agnosticismo del núcleo (`core/roles/es/sdd-orquestador.md`)

Se generaliza la sección "Cómo se delega" de `core/roles/es/sdd-orquestador.md` para que la
prosa sea neutra y prescriba la delegación en función de la herramienta nativa del harness:
- Google Antigravity: `invoke_subagent(TypeName: "self", Role: "sdd-<rol>", Prompt: "...")`
- Claude Code / Kimi Code: `Agent(subagent_type: "tremen-sdd:<rol>", ...)`
- opencode: `task(agent: "<rol>", ...)`
Se preserva de forma estricta la invariante de aislamiento del núcleo (RN-02).

## Consecuencias

### Positivas
- **Aislamiento real de contexto**: Los roles pesados ya no ensucian la ventana de conversación
  principal ni consumen contexto compartido innecesario.
- **Garantía de ojos frescos para la verificación (RN-03)**: El verificador corre en un subagente
  independiente, juzgando estrictamente artefactos (código, tests, ledger) sin estar sesgado
  por el razonamiento previo del implementador.
- **Superficie limpia sin código muerto**: La eliminación de `adapters/antigravity/agents/`
  suprime directorios fantasmas que confundían tanto a los desarrolladores como a los modelos LLM.
- **Alineación con ADR-011**: Los checks de invariantes reflejan con fidelidad la arquitectura
  as-built sin tolerar falsos verdes ni relajar controles.

### Negativas / follow-ups
- Al utilizar `TypeName: "self"`, el subagente clona las capacidades del entorno; por tanto,
  el `Prompt` provisto por el orquestador debe ser explícito, exhaustivo y autocontenido
  para que el subagente cargue su rol del núcleo (`../../core/roles/es/sdd-<rol>.md`) y
  conozca con precisión los límites de su cometido.
- La comunicación subagente → orquestador depende del envío estructurado del informe mediante
  `send_message`; si un subagente finalizara sin invocar dicha tool, el orquestador solo
  recibirá la notificación de finalización del subproceso.

## Alternativas consideradas

- **Opción B: Registro dinámico mediante `define_subagent`**.
  *Motivo de rechazo*: Introduce estado mutable y dependencias temporales en la sesión (hacer
  `define_subagent` antes de cada invocación). Si una conversación se retoma o se limpia el
  contexto, los subagentes registrados previamente pueden dejar de existir. Además, añade
  latencia y pasos adicionales innecesarios frente a la inmediatez stateless de `self`.
- **Mantener la autoejecución en el hilo principal mediante skills**.
  *Motivo de rechazo*: Inadmisible. Destruye el principio de verificación adversarial con ojos
  frescos, haciendo que el verificador comparta la memoria del implementador, y degrada
  rápidamente el rendimiento por saturación del contexto de la conversación principal.
- **Mantener `adapters/antigravity/agents/` como documentación pasiva**.
  *Motivo de rechazo*: Viola el principio de que los adaptadores solo contienen superficie
  operativa real consumida por el runtime del harness. El código muerto crea falsa sensación
  de cobertura (RN-03) e infringe la higiene del repositorio establecida en ADR-001.

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
