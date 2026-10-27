---
id: SPEC-022
tipo: spec
epica: EPIC-006
estado: hecho
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-10-14, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-10-14, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-10-14, por: sdd-implementador}
  - {estado: en-revision, fecha: 2026-10-14, por: sdd-verificador}
  - {estado: hecho, fecha: 2026-10-14, por: sdd-verificador}
---
# SPEC-022 — Scaffolding con AGENTS.md y documentacion de Antigravity

## Problema
El adaptador Antigravity cuenta con superficie base (`SPEC-019`), enforcement L1 (`SPEC-020`)
e integración en los guardianes de invariantes (`SPEC-021`), pero carece de la plantilla
normativa de reglas para el entorno de trabajo (`AGENTS.md`) requerida al inicializar
un proyecto consumidor con `/sdd-init`, y de la documentación formal en la arquitectura
del repositorio (`docs/arquitectura.md`) y guía principal (`README.md`).

Sin esto:
- Un proyecto nuevo inicializado bajo Antigravity no recibiría las directrices de trabajo
  en el fichero estándar reconocido por los agentes (`AGENTS.md`).
- El equipo carecería del recetario as-built documentado para la instalación y operación
  de Antigravity, contraviniendo los requisitos de transparencia arquitectónica (EPIC-006 CE-1..CE-4).

## Usuarios / roles afectados
- `sdd-arquitecto`, `sdd-documentalista`, desarrolladores y agentes operando en Google Antigravity.

## Criterios de aceptación
- **CA-1 (Plantilla AGENTS.md en core/templates/)**: Existe `core/templates/AGENTS.md` con
  los placeholders correspondientes (`{{PROYECTO}}`), respetando las reglas de `nucleo-agnostico`
  (sin dependencias de harness prohibidas) y orientando al agente sobre las reglas de trabajo SDD.
- **CA-2 (Comando sdd-init actualizado en Antigravity)**: `adapters/antigravity/commands/sdd-init.md`
  instruye la copia y estampado de `AGENTS.md` en la raíz del proyecto.
- **CA-3 (Documentación en docs/arquitectura.md)**: `docs/arquitectura.md` incorpora
  Google Antigravity en:
  - Árbol de adaptadores (`adapters/antigravity/`).
  - Tabla de comandos de build (`npm run build:antigravity`).
  - Tabla comparativa de piezas de adaptador (manifiesto `plugin.json`, commands, hooks, tests).
  - Espectro de enforcement L1 (clasificación: "deniega de verdad" vía `PreToolUse`).
  - Procedimiento reproducible de instalación (plugin en workspace `.agents/plugins/` o global `~/.gemini/config/plugins/`).
- **CA-4 (Documentación en README.md)**: `README.md` incluye a Google Antigravity entre
  los adaptadores soportados y detalla el comando de build correspondiente.
- **CA-5 (Guardianes y tests en verde)**: `npm run check` y `npm test` verifican que
  todas las invariantes (`nucleo-aislado`, `nucleo-agnostico`, `layout`, `referencias`,
  `manifiestos`, `descripcion-fuente-unica`, `roles-fuente-unica`, `version-unica`)
  se mantienen 100% en verde.

## Entidades y reglas afectadas
- RN-01 (código vigilado solo en branch con spec aprobada).
- RN-02 (núcleo agnóstico y aislado).
- ADR-013 (encaje de Antigravity).
- `core/templates/AGENTS.md`
- `docs/arquitectura.md`
- `README.md`

## Fuera de alcance
- Publicación automática en registros remotos (objeto de EPIC-004).

## Notas para el gate humano
- Se añade `core/templates/AGENTS.md` como contraparte harness-agnóstica/multi-agente
  de `CLAUDE.md`, consumible por Antigravity y otros asistentes de código.
