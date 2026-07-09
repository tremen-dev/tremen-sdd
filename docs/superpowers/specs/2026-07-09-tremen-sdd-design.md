# tremen-sdd — Diseño del estándar SDD unificado y su plugin de Claude Code

- Fecha: 2026-07-09
- Estado: aprobado (diseño validado sección a sección con Alberto en sesión de brainstorming)
- Origen: análisis best-of-breed de 13 proyectos de `D:\src` (fortos, phis, god-pain, luada, descoberto, gastio, xana-dashboard, xana-pensa, pezas, galiactivapp, mighty-scrapper, musaas, pc-bolsa-utils, saas-generator, lidr-ai-specs)

## 1. Contexto y problema

Todos los proyectos comparten un ADN común — SDD con jerarquía épica→spec→tarea, "nada se codea sin spec aprobada", ADRs inmutables y un pipeline de roles PO → arquitecto → implementador → verificador — pero cada uno lo reimplementó desde cero. Las divergencias son accidentales, no deliberadas: IDs incompatibles (`EPIC-0001` vs `E01` vs `EP-NN` vs `epicXXX`), estados en tres idiomas y cuatro formatos, cuatro mecanismos distintos para el mismo rol (skills, commands con `@include`, agents, prosa en `.ai-context`), y ubicaciones distintas para las specs.

**Objetivo**: una única forma canónica de trabajar con Claude, empaquetada como plugin instalable, aplicable a proyectos nuevos y migrable en los existentes.

**No-objetivos de la v1**: comercialización, CLI npm independiente, traducciones gl/en (pero el diseño las deja preparadas), roles de dominio empaquetados, integración con saas-generator.

## 2. Convenciones canónicas (el estándar)

### 2.1 Artefactos e IDs

- `EPIC-NNN`, `SPEC-NNN`, `TASK-NNN`, `ADR-NNN` — 3 dígitos, mayúsculas, numeración **global por tipo** (no por épica).
- Los IDs los asigna **siempre un script** (`scaffold.mjs`), nunca el LLM.
- El vínculo spec↔épica va en el frontmatter, no en el ID.
- Épicas transversales permanentes (de phis): `EPIC-FIX`, `EPIC-INFRA`, `EPIC-MANT`, `EPIC-MEJORA`. El trabajo que no encaja en una épica de producto siempre tiene casa.

### 2.2 Frontmatter canónico

YAML al inicio de cada artefacto. Los tokens (claves y valores de estado) son canónicos en español y **no cambian con la i18n** (la i18n traduce plantillas y prosa, nunca tokens — así el tooling no se rompe).

```yaml
id: SPEC-001
tipo: spec            # epica | spec | task | adr
epica: EPIC-001
estado: en-revision
aprobada-por: Alberto (2026-07-10)
historial:
  - {estado: borrador,    fecha: 2026-07-09, por: sdd-arquitecto}
  - {estado: aprobada,    fecha: 2026-07-10, por: Alberto}
  - {estado: en-progreso, fecha: 2026-07-10, por: sdd-implementador}
  - {estado: en-revision, fecha: 2026-07-11, por: sdd-implementador}
```

- `historial` se **añade automáticamente en cada transición** (lo escribe quien cambia el estado, vía `estado.mjs`); nunca se edita retroactivamente. Permite calcular tiempos por fase y auditar quién movió qué (misma filosofía que el campo `Deciders` de los ADR de fortos).

### 2.3 Máquina de estados de una spec

```
borrador ─(humano aprueba)→ aprobada → en-progreso → en-revision
en-revision ─(verificador GREEN)→ hecho
en-revision ─(verificador RED)→ en-progreso
cualquiera ↔ bloqueada (estado lateral)
```

- `borrador → aprobada` lo cruza **solo el humano** (gate de spec).
- `en-revision → hecho` lo decide el veredicto GREEN del verificador.
- El hook `require-spec` solo permite editar código con spec en `aprobada` o `en-progreso`.

### 2.4 Estructura de carpetas en cada proyecto

```
proyecto/
├─ CLAUDE.md            ← puntero fino (3-5 líneas): FOUNDATION + referencia SDD
├─ FOUNDATION.md        ← constitución: decisiones locked D1-DN; solo un ADR la reinterpreta
├─ .sdd.json            ← config del estándar (idioma, rutas vigiladas, linter, excepciones)
├─ .ai-context/
│   └─ skills/          ← lógica de skills del proyecto (roles de dominio); fuente de verdad
├─ .claude/
│   ├─ skills/          ← wrappers finos que apuntan a .ai-context/skills/
│   └─ settings.json    ← hooks registrados por /sdd-init
└─ docs/
    ├─ fundacion/       ← vision.md, dominio.md (lenguaje ubicuo), reglas.md (RN-xx), contexto.md
    ├─ roadmap.md       ← curado por el PO: secuencia de épicas, horizonte, criterios de corte
    ├─ epicas/EPIC-NNN-slug/
    │    ├─ _epica.md
    │    ├─ SPEC-NNN-slug.md
    │    ├─ SPEC-NNN-slug.ledger.md
    │    └─ _qa/SPEC-NNN/   ← capturas, vídeo y (opcional) informe.html
    ├─ adr/ADR-NNN-slug.md
    └─ tablero.md       ← SIEMPRE generado por script; editarlo a mano está prohibido (hook)
```

- `docs/fundacion/contexto.md` formaliza el "documento maestro de contexto" recurrente (patrón carburelo / axents / lidr).
- ADRs: inmutables una vez aceptados; para cambiar una decisión se escribe otro que la *supersede*. Campo `Deciders` registra quién propuso (rol) y quién aprobó (humano), con matices de negociación.

### 2.5 Git

- Rama por spec: `ft/SPEC-NNN-slug`.
- Conventional Commits con footer `Refs: SPEC-NNN`.
- Política "commit sí, merge nunca": el implementador commitea en la rama; el orquestador hace push y abre PR (checklist de CA + trazabilidad); el **merge es siempre humano**. El verificador nunca escribe código ni toca git.

### 2.6 Idiomas

- Canónico v1: **español** en docs, specs, estados y nombres de skills. Código e identificadores en inglés. Los términos de dominio se preservan según `dominio.md` (lenguaje ubicuo manda).
- i18n futura (gl/en): el usuario elige idioma en `/sdd-init`; se materializa vía plantillas y definiciones de rol por idioma (ver §3.2). Los tokens de frontmatter no se traducen.

## 3. Arquitectura del plugin

### 3.1 Repo

`tremen-dev/tremen-sdd` en GitHub, con marketplace propio (`/plugin marketplace add tremen-dev/tremen-sdd`).

```
tremen-sdd/
├─ .claude-plugin/
│   ├─ plugin.json          ← nombre, versión, descripción
│   └─ marketplace.json
├─ skills/                  ← 7 wrappers finos (SKILL.md: frontmatter + "lee roles/<idioma>/<rol>.md")
├─ roles/
│   └─ es/                  ← la lógica real de cada rol (futuro: gl/, en/)
├─ agents/                  ← definiciones de subagentes ejecutores
├─ commands/                ← /sdd-init, /sdd-tablero
├─ hooks/                   ← require-spec.mjs, protege-verdad.mjs, calidad.mjs + hooks.json
├─ scripts/                 ← deterministas, invocados por skills vía ${CLAUDE_PLUGIN_ROOT}/scripts/
│   ├─ scaffold.mjs         ← crea EPIC/SPEC/TASK/ADR numerados desde plantilla
│   ├─ tablero.mjs          ← regenera docs/tablero.md desde frontmatters
│   ├─ estado.mjs           ← transición de estado + entrada en historial (atómico)
│   ├─ valida.mjs           ← lint de frontmatters, IDs, enlaces rotos spec↔ADR
│   └─ informe-qa.mjs       ← ensambla _qa/SPEC-NNN/informe.html desde ledger + capturas
└─ templates/               ← lo estampable en proyectos; autocontenido y consumible por un
                              futuro instalador externo (npx) sin cambios
    ├─ FOUNDATION.md, CLAUDE.md, .sdd.json
    ├─ fundacion/ (vision, dominio, reglas, contexto), roadmap.md
    ├─ _epica.md, SPEC.md, SPEC.ledger.md, TASK.md, ADR.md
    └─ rol-dominio.md       ← plantilla para generar roles de dominio por proyecto
```

Principios:
- **"La estructura se scriptea, el juicio se escribe"** (xana-dashboard): todo lo mecánico es un script determinista en `scripts/`; el LLM solo redacta contenido. Ahorra tokens y elimina las divergencias de numeración/formato.
- Los scripts viven en el plugin (actualización central), no se estampan. Solo se estampa lo que debe personalizarse por proyecto (`templates/`).
- `templates/` es independiente del formato plugin: la fase "profesional" (`npx tremen-sdd init`, skills.sh) consumirá esa misma carpeta.

### 3.2 Patrón wrapper + definición (doble ámbito)

- **En el plugin**: cada `skills/<n>/SKILL.md` es un wrapper fino — frontmatter (`name`, `description` con triggers bilingües es/en, estilo xana-dashboard) + una línea: *"Lee `${CLAUDE_PLUGIN_ROOT}/roles/<idioma>/<rol>.md` y sigue sus instrucciones"*, donde `<idioma>` sale del `.sdd.json` del proyecto (default: `es`). **La traducción futura no toca ninguna skill**: solo añade `roles/gl/`, `roles/en/`.
- **En cada proyecto**: las skills propias (roles de dominio) siguen el mismo patrón — lógica en `.ai-context/skills/<n>.md` (fuente de verdad, agnóstica de herramienta, reutilizable desde Cursor/Gemini/AGENTS.md), wrapper en `.claude/skills/<n>/SKILL.md`.
- Coste asumido: un Read extra por invocación (despreciable). Las `description` (que disparan) viven en el wrapper.

## 4. Roles

7 skills con prefijo `sdd-` (neutro entre idiomas) + 2 comandos. Patrón: skill = front-door (diálogo, flags, encargo); el trabajo pesado corre como **subagente con contexto aislado**.

| Skill | Ejecución | Modelo | Escribe | Responsabilidad |
|---|---|---|---|---|
| `/sdd-orquestador` | inline | heredado | git push/PR | Entrada de todo trabajo: clasifica, localiza o encarga la spec, conduce el pipeline, enforce de gates, cap de reintentos con escalado |
| `/sdd-producto` | inline + agente para redacción | heredado | fundacion/, épicas, roadmap.md | Product Owner + guardián del roadmap: visión, prioridad, convierte intención en épica con criterios de éxito |
| `/sdd-arquitecto` | agente | heredado | specs, ADRs, fundacion/ | Única autora de specs y ADRs; diseña cómo satisfacer la épica |
| `/sdd-implementador` | agente | heredado | código + su mitad del ledger + commits | Codea contra spec aprobada y nada más; test por cada CA; rama `ft/` |
| `/sdd-verificador` | agente (fallback inline documentado) | heredado | su mitad del ledger + `_qa/` | **Adversarial, sin edición de código**: asume que NO se cumple; matriz CA→evidencia; veredicto GREEN/RED; Playwright para UI |
| `/sdd-documentalista` | agente | haiku | índices, tablero, archivo | Cierre mecánico del ciclo: coherencia docs↔código, regenera tablero, archiva |
| `/sdd-como-vamos` | inline | heredado | nada (read-only) | Informe de estado desde el filesystem: pendientes, bloqueadas, "cerradas con residual" |

Comandos: `/sdd-init` (§6), `/sdd-tablero` (regenera `docs/tablero.md` vía `tablero.mjs`).

Reglas transversales:
- **Comunicación solo por artefactos** (spec, ledger, informes, resultado devuelto). Nunca por contexto compartido. El filesystem es el bus de mensajes.
- El verificador juzga con ojos frescos: al ser subagente, no ve el razonamiento del implementador. Si Playwright resulta poco fiable en subagente (lección de phis: necesita app y navegador vivos), la excepción inline se documenta; se intenta primero como subagente.
- **Separación de escritores en el ledger**: implementador rellena Impl./Test; verificador rellena Verif./veredicto. Nunca al revés.
- **No duplicar Superpowers**: implementador invoca `test-driven-development`; verificador se apoya en `verification-before-completion`; arquitecto en `writing-plans`. El plugin aporta gobernanza, no el bucle genérico de ingeniería.
- Roles de dominio (fiscal, compliance-legal, dominio-forestal…) NO van en el plugin: `/sdd-init` ofrece generarlos por proyecto desde `templates/rol-dominio.md`.

## 5. Verificación y evidencia

- **Ledger por spec** (`SPEC-NNN-slug.ledger.md`, el `estado.md` de fortos): fase actual, matriz CA → fichero → test → verificación → evidencia visual, veredicto persistido, salvedades/follow-ups con ID, sección "cómo retomar (handoff)". Viaja en el PR.
- Regla de honestidad: un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde; una salvedad se marca ⚠️, nunca ✅.
- Evidencia cruda en `_qa/SPEC-NNN/` (PNG por CA/viewport, vídeo webm).
- **Informe HTML opcional** (flag `--informe` del verificador): `_qa/SPEC-NNN/informe.html`, autocontenido (imágenes base64, sin dependencias), con veredicto, matriz CA→evidencia, pasos ejecutados y capturas/vídeo inline. Lo ensambla `informe-qa.mjs` (determinista), no el LLM. Es el acta de verificación enseñable a cliente o adjuntable al PR.

## 6. Enforcement y adopción

### 6.1 Hooks (Node `.mjs` puro, sin dependencias; compatible Windows)

1. **`require-spec.mjs`** — PreToolUse deny sobre Edit|Write en código: exige rama `ft/SPEC-NNN-slug` y SPEC existente en `aprobada` o `en-progreso`. Mejoras sobre phis: cubre también migraciones/config (rutas vigiladas configurables en `.sdd.json`), fail-open ante fallos de git, válvula `SDD_SKIP_GATE=1`, mensajes pedagógicos ("crea la spec con /sdd-arquitecto").
2. **`protege-verdad.mjs`** — PreToolUse deny: `FOUNDATION.md`, `docs/fundacion/*` y `docs/tablero.md` solo los escriben sus dueños (arquitecto/PO los primeros; solo `tablero.mjs` el tablero). Los demás roles proponen en su informe.
3. **`calidad.mjs`** — PostToolUse exit 2: tras editar código corre el linter del proyecto (autodetección: ruff, eslint, dart analyze, dotnet format; override en `.sdd.json`) y devuelve fallos como feedback accionable. Advisory adicional: aviso si cambia `estado:` sin entrada nueva en `historial`.

### 6.2 `/sdd-init` — adopción con dos modos

- **Proyecto nuevo**: pregunta nombre, dominio, stack e idioma (v1: solo español; el selector queda en el flujo para gl/en); estampa `FOUNDATION.md`, `CLAUDE.md` puntero, `.sdd.json`, `docs/` completo y registra los hooks en `.claude/settings.json`. Ofrece generar roles de dominio.
- **Proyecto existente (migración)**: detecta la variante actual (specs/ de fortos, docs/epicas/ de phis, project_management/ de galiactivapp…), propone un plan de migración de nomenclatura y **no toca nada sin aprobación humana**.

### 6.3 `.sdd.json` (estampado por init)

```json
{
  "idioma": "es",
  "rutasVigiladas": ["src/", "lib/", "supabase/migrations/"],
  "linter": "auto",
  "gates": { "requireSpec": true, "protegeVerdad": true, "calidad": true }
}
```

## 7. Validación del propio plugin

- Cada skill lleva `trigger-eval.json` (práctica de fortos): casos should/shouldn't-trigger, ejecutables con el skill-creator de Anthropic.
- **Piloto doble** antes de declarar v1: un proyecto greenfield pequeño + la migración de gastio (método definido, docs sin materializar — candidato ideal).

## 8. Fases futuras (fuera de alcance v1, pero condicionan el diseño)

- **Fase 2**: i18n gl/en (`roles/gl/`, `roles/en/`, plantillas traducidas — incluido el contenido de `site/` —, selector en init); generador de roles de dominio asistido; evals completos; compatibilidad multi-copiloto (AGENTS.md/GEMINI.md punteros a `.ai-context/`, patrón lidr-ai-specs); empaquetado "profesional" (`npx tremen-sdd init`, skills.sh, npm) consumiendo el mismo `templates/`.
- **Fase 2 — integración con gestores de tareas (Jira, Linear, GitHub Issues)**: patrón **adaptador por proveedor** (`scripts/sync-<proveedor>.mjs` tras una interfaz común), nunca lógica de un proveedor en el núcleo. Dirección 1 (primera): **espejo de salida** — el filesystem sigue siendo la única verdad; el emisor se engancha al único choke point de transiciones (`estado.mjs`) y mapea estados→columnas según `.sdd.json`. Dirección 2: **entrada como propuestas** (patrón notion-sync de galiactivapp: backlog externo → propuestas con ledger de idempotencia → revisión humana → spec); NUNCA bidireccional. El gate `borrador→aprobada` es siempre un acto en el repo, jamás un drag en el board externo.
- **Condición transversal (el plugin puede venderse o cederse a terceros)**: cero credenciales o rutas personales en el código (secretos solo por env vars; endpoints/proyectos en `.sdd.json`); la marca es separable — `site/` y `design/tremen-ds/` son capa de presentación intercambiable (los tokens del DS son el switch); decidir licencia antes de la primera cesión (candidata: código del plugin con licencia permisiva o dual, DS y marca tremen.dev reservados); los adaptadores de proveedor deben poder desarrollarse/venderse como módulos independientes del núcleo.
- **Fase 3**: integración con saas-generator — la fábrica emite proyectos ya inicializados con tremen-sdd (invoca el equivalente de `/sdd-init` al generar).

## 9. Riesgos y mitigaciones

- **Hooks con puntos ciegos** (lección de phis): `require-spec` es fail-open por diseño — se acepta el trade-off (nunca brickear al usuario) y se compensa con rutas vigiladas configurables y el orquestador como segunda línea.
- **Válvula de escape que se vuelve permanente** (`SDD_SKIP_GATE=1`): `/sdd-como-vamos` reporta si la válvula está activa.
- **Drift del tablero/índices**: eliminado de raíz — todo índice es generado, y el hook impide editarlo a mano.
- **Verificador-subagente con Playwright**: riesgo conocido; fallback inline documentado (§4).
- **Estado duplicado**: la cabecera de la spec es la ÚNICA fuente de verdad; `_epica.md` y tablero son derivados regenerables. Ningún rol actualiza tablas de estado a mano.
