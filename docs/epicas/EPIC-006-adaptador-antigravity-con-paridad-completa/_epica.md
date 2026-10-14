---
id: EPIC-006
tipo: epica
estado: aprobada
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-10-14, por: sdd-producto}
  - {estado: aprobada, fecha: 2026-10-14, por: Alberto Fojo}
---
# EPIC-006 — Adaptador Antigravity con paridad completa

## Objetivo
Dar soporte de primera clase a **Google Antigravity** (IDE, 2.0 y CLI) como cuarto
harness de tremen-sdd, permitiendo que cualquier proyecto del estándar se opere con
la misma disciplina, roles y garantías que en Claude Code y opencode, sin
reimplementar el método y manteniendo intactas las invariantes del núcleo agnóstico.

Por qué ahora: Antigravity es el entorno de desarrollo agentic principal del equipo,
ofreciendo capacidades nativas de lifecycle hooks (`hooks.json`), progressive disclosure
en skills y visualización de artefactos enriquecida.

## Criterios de éxito
- **CE-1 (Paridad de roles y comandos)**: Los siete roles canónicos (`sdd-orquestador`,
  `sdd-producto`, `sdd-arquitecto`, `sdd-implementador`, `sdd-verificador`,
  `sdd-documentalista`, `sdd-como-vamos`) y comandos (`sdd-init`, `sdd-tablero`) están
  operativos en Antigravity consumiendo la fuente única de prosa de `core/roles/es/`.
- **CE-2 (Enforcement L1 que deniega de verdad)**: Interceptar las herramientas de
  escritura de Antigravity (`write_to_file`, `replace_file_content`, `multi_replace_file_content`)
  mediante `PreToolUse` en `hooks.json`, abortando cualquier intento de codear código
  vigilado sin rama `ft/SPEC-NNN` y spec aprobada.
- **CE-3 (Aislamiento e invariantes en verde)**: Todo lo nuevo vive bajo
  `adapters/antigravity/` y `dist/antigravity/`; el núcleo agnóstico no gana ninguna
  dependencia ni token hacia Antigravity (`nucleo-aislado` y `nucleo-agnostico` en verde);
  y `npm run check` pasa con todos los checks generalizados.
- **CE-4 (Pipeline ejercible)**: El ciclo completo de SDD se opera de principio a fin
  desde Antigravity con gates humanos claros.

## Alcance
- Dentro:
  - Adaptador `adapters/antigravity/`: `plugin.json`, `skills/` para los 7 roles y
    comandos, `hooks/hooks.json` y entrypoints `.mjs`.
  - Integración en `tools/build-adapter.mjs` y `package.json` (`build:antigravity`).
  - Integración en los checks de invariantes (`layout`, `referencias`, `manifiestos`,
    `descripcion-fuente-unica`) y `tools/check.mjs`.
  - Tests unitarios en `adapters/antigravity/tests/`.
  - Plantilla de reglas de proyecto (`AGENTS.md`) para scaffolding con `sdd-init`.
- Fuera:
  - Modificar la lógica interna de la máquina de estados o validadores de `core/`.
  - Publicación en registros externos (forma parte de EPIC-004).

## Specs
- `SPEC-019`: Adaptador Antigravity base (manifiesto, skills, resolución núcleo, build).
- `SPEC-020`: Enforcement L1 en Antigravity (`hooks.json`, `require-spec`, `protege-verdad`).
- `SPEC-021`: Integración de checks de invariantes y suite de tests.
- `SPEC-022`: Scaffolding (`sdd-init` con `AGENTS.md`) y actualización de `docs/arquitectura.md`.

## Riesgos
- **Diversidad de herramientas de mutación de código en Antigravity**:
  Mitiga: regex amplia en matcher de `PreToolUse` (`write_to_file|replace_file_content|multi_replace_file_content`)
  y normalización de rutas en el shim `_comun.mjs`.
- **Fuga de acoplamiento al núcleo**:
  Mitiga: `nucleo-aislado` y `nucleo-agnostico` verifican la ausencia de imports y tokens.
