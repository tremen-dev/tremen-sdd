---
id: SPEC-023
tipo: spec
epica: EPIC-FIX
estado: hecho
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-10-15, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-10-15, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-10-15, por: sdd-orquestador}
  - {estado: en-revision, fecha: 2026-10-15, por: sdd-implementador}
  - {estado: hecho, fecha: 2026-10-15, por: sdd-verificador}
---
# SPEC-023 — Despacho real de subagentes en Antigravity con contexto aislado

## Problema

En la integración inicial de Google Antigravity (EPIC-006 / ADR-013), se modeló el adaptador
bajo la asunción de que Antigravity descubría subagentes desde un subdirectorio `agents/` en el
plugin y que las skills podían actuar como puntos de entrada que cargaban y ejecutaban el rol
directamente en el hilo principal de la conversación.

El análisis técnico del runtime de Antigravity (vía la skill oficial `agy-customizations`) y la
auditoría de arquitectura evidencian tres problemas críticos:

1. **Inexistencia de autodescubrimiento de `agents/`**: El estándar de plugins de Antigravity
   solo procesa automáticamente `skills/`, `rules/`, `hooks.json` y servidores MCP declarados
   en `plugin.json`. Antigravity **no reconoce ni lee** un directorio `agents/` dentro de un plugin.
   El directorio `adapters/antigravity/agents/` es código muerto e inoperativo.
2. **Ausencia de la herramienta `Agent`**: La herramienta `Agent(subagent_type: ...)` de Claude Code
   no existe en Antigravity. El runtime de Antigravity ofrece la tool del sistema `invoke_subagent`.
3. **Quiebre del aislamiento de contexto y pérdida de ojos frescos (RN-02, RN-03)**:
   Las skills actuales de Antigravity (`adapters/antigravity/skills/sdd-*/SKILL.md`) leen el rol
   del núcleo agnóstico y ejecutan sus instrucciones en la conversación principal. Esto provoca:
   - Acumulación masiva de contexto en el diálogo principal durante tareas pesadas de arquitectura,
     implementación o documentación.
   - Ruptura del principio de **verificación adversarial independiente**: el verificador evalúa
     con la memoria del implementador en el mismo hilo, en lugar de evaluar de forma objetiva con
     ojos frescos sobre los artefactos versionados (código, tests y ledger).

Esta spec resuelve estos problemas adoptando el despacho nativo con `invoke_subagent`
(`TypeName: "self"`), limpiando la superficie del adaptador (eliminando `agents/`) y generalizando
la prosa de delegación en el núcleo agnóstico.

## Usuarios / roles afectados

- **`sdd-orquestador`**: Como conductor del pipeline, debe despachar a los roles pesados mediante
  `invoke_subagent` con `TypeName: "self"` y `Role: "sdd-<rol>"`.
- **`sdd-arquitecto`**: Rol pesado. Debe ejecutarse como subagente aislado para producir specs y ADRs
  sin sesgos de contexto previo.
- **`sdd-implementador`**: Rol pesado. Debe ejecutarse como subagente aislado enfocado en ciclo TDD
  sin saturar la conversación principal.
- **`sdd-verificador`**: Gate adversarial. Debe ejecutarse obligatoriamente en un subagente aislado
  con ojos frescos para evaluar objetivamente los artefactos frente a los CA.
- **`sdd-documentalista`**: Rol pesado de cierre. Debe ejecutarse como subagente aislado para procesar
  la documentación, índices y tablero.
- **`sdd-producto` y `sdd-como-vamos`**: Roles dialógicos directos. Se mantienen en el contexto
  principal para interactuar de forma inmediata con el usuario humano.

## Criterios de aceptación

### CA-1: Delegación en skills de roles pesados en Antigravity
- **Given**: El directorio `adapters/antigravity/skills/` y sus ficheros `SKILL.md` para los roles
  pesados (`sdd-arquitecto`, `sdd-implementador`, `sdd-verificador`, `sdd-documentalista`).
- **When**: Se inspecciona el contenido de cada una de estas 4 skills.
- **Then**: Cada `SKILL.md` prohíbe explícitamente la autoejecución del rol en el hilo principal e
  instruye a delegar la tarea invocando la herramienta `invoke_subagent` con `TypeName: "self"`,
  especificando `Role: "sdd-<rol>"` y un `Prompt` completo y autosuficiente.

### CA-2: Prescripción de despacho en sdd-orquestador para Antigravity
- **Given**: Un agente ejecutando el rol `sdd-orquestador` bajo el entorno Google Antigravity.
- **When**: El orquestador debe despachar trabajo a uno de los roles pesados (`sdd-arquitecto`,
  `sdd-implementador`, `sdd-verificador` o `sdd-documentalista`).
- **Then**: Prescribe e invoca la herramienta `invoke_subagent` con el parámetro
  `Subagents: [{ "TypeName": "self", "Role": "sdd-<rol>", "Prompt": "..." }]`, esperando el informe
  final mediante `send_message` antes de avanzar al siguiente paso del pipeline.

### CA-3: Eliminación de agents/ en adapters/antigravity/ y dist/antigravity/
- **Given**: El árbol de código de fuente y el proceso de build de adaptadores.
- **When**: Se examina `adapters/antigravity/` y se ejecuta `npm run build:antigravity` para
  generar `dist/antigravity/`.
- **Then**: El subdirectorio `agents/` no existe bajo `adapters/antigravity/` ni bajo
  `dist/antigravity/`.

### CA-4: Ajuste de layout.mjs y manifiestos.mjs sin agents/ para Antigravity
- **Given**: Los checks de invariantes estructurales en `tools/checks/layout.mjs` y
  `tools/checks/manifiestos.mjs`.
- **When**: Se ejecutan los checks contra el repositorio y los artefactos construidos (`dist/`).
- **Then**:
  1. `layout.mjs` define `MINIMO_COMUN = ['skills/', 'tests/']` y declara `agents/` en
     `EXTRAS_POR_HARNESS` únicamente para `claude-code`, `kimi-code` y `opencode`.
  2. `checkManifiestosAntigravity` en `manifiestos.mjs` valida la presencia de `skills/`, `commands/`
     y `hooks/` sin requerir la presencia de `agents/`.
  3. Los checks pasan en verde (`OK`).

### CA-5: Tests unitarios de superficie en adapters/antigravity/
- **Given**: La suite de tests del adaptador en `adapters/antigravity/tests/superficie.test.mjs`.
- **When**: Se ejecuta `node --test adapters/antigravity/tests/superficie.test.mjs` (o `npm run test:adapter`).
- **Then**: Los tests verifican:
  1. Que `dist/antigravity/agents/` NO existe.
  2. Que las 4 skills de roles pesados instruyen a delegar vía `invoke_subagent` (`TypeName: "self"`).
  3. Que las skills directas (`sdd-producto`, `sdd-como-vamos`) conservan su contrato de lectura.
  4. La suite completa finaliza en verde sin aserciones obsoletas sobre `agents/`.

### CA-6: Generalización agnóstica de la prosa de delegación en sdd-orquestador.md
- **Given**: El fichero del núcleo agnóstico `core/roles/es/sdd-orquestador.md`.
- **When**: Se examina la sección "Cómo se delega (literal, no es una metáfora)".
- **Then**: La prosa es neutra respecto al harness y describe la delegación refiriendo la
  herramienta respectiva: `invoke_subagent` en Antigravity, `Agent` en Claude Code / Kimi Code y
  `task` en opencode, prohibiendo taxativamente asumir el sombrero o ejecutar roles pesados en el
  contexto principal y preservando RN-02 y RN-06.

### CA-7: Sincronización documental de ADR-014 y docs/arquitectura.md
- **Given**: La documentación arquitectónica en `docs/arquitectura.md` y `docs/adr/ADR-014-...`.
- **When**: Se inspeccionan las referencias a los adaptadores, la tabla de piezas y los mecanismos
  de despacho.
- **Then**: `docs/arquitectura.md` describe con precisión que Antigravity utiliza `skills/` para el
  despacho mediante `invoke_subagent` (`TypeName: "self"`), no posee `agents/`, y cita formalmente
  ADR-014 como enmienda a ADR-013 sin drift documental.

## Entidades y reglas afectadas

- **Reglas de negocio (docs/fundacion/reglas.md)**:
  - **RN-01**: Nada se codea sin spec aprobada.
  - **RN-02**: La dependencia va solo adaptador → núcleo (la generalización en `sdd-orquestador.md`
    no acopla el núcleo a ningún SDK externo).
  - **RN-03**: El enforcement es independiente del harness (la verificación con ojos frescos es
    garantía dura de la metodología).
  - **RN-04**: Un ADR aceptado es inmutable (ADR-014 enmienda a ADR-013 sin alterar el documento
    original aprobado).
  - **RN-06**: La prosa de cada rol tiene una única fuente.
  - **RN-09**: Ningún rol aprueba su propio trabajo (gate humano obligatorio para spec y ADR).
  - **RN-10**: El repo se autogestiona con su propio estándar (dogfooding).
  - **RN-11**: La description de disparo de cada rol tiene una fuente canónica única
    (`_descripciones.json`).
- **Decisiones arquitectónicas**:
  - `ADR-014`: Despacho de subagentes en Google Antigravity con `invoke_subagent (self)`.
  - `ADR-013`: Encaje de Antigravity (enmendado parcialmente en §2).
  - `ADR-011`: Generalización de los checks de invariantes (autodescubrimiento vs enumeración).
  - `ADR-001`: Estructura del repo para multi-harness.
- **Dominio (docs/fundacion/dominio.md)**:
  - Conceptos de `orquestador`, `subagente`, `aislamiento de contexto`, `ojos frescos`, `gate adversarial`
    y `superficie de adaptador`.

## Fuera de alcance

- No se modifica la implementación de hooks L1 (`hooks/require-spec.mjs`, `hooks/protege-verdad.mjs`),
  que ya operan y deniegan de verdad en Antigravity.
- No se altera la configuración ni el comportamiento de Claude Code, Kimi Code ni opencode.
- No se modifica ningún script de automatización bajo `core/scripts/` ni utilidades bajo `core/lib/`.
- No se introducen herramientas MCP adicionales para subagentes.

## Notas para el gate humano

- **Corrección de defecto arquitectónico crítico**: Antigravity ejecutaba los roles en el hilo
  principal de chat, saturando el contexto e impidiendo una verificación adversarial real.
- **Elección de `invoke_subagent` con `TypeName: "self"`**: Proporciona aislamiento inmediato y
  stateless sin necesidad de pasos previos de registro ni latencia de inicialización (Opción A vs Opción B).
- **Higiene del repositorio**: Eliminar `adapters/antigravity/agents/` erradica un directorio fantasma
  que no tenía ningún efecto en el runtime de Antigravity.
- **Aprobación requerida**: Como dicta RN-09, la aprobación de SPEC-023 y ADR-014 corresponde
  exclusivamente a Alberto Fojo en el gate humano antes de iniciar la implementación en la rama
  `ft/SPEC-023-despacho-real-de-subagentes-en-antigravity-con-contexto-aislado`.
