# Contexto maestro — tremen-sdd

> Documento vivo: TODO lo que un agente (o una persona) necesita para situarse.
> Se actualiza al cambiar el rumbo; la historia fina vive en ADRs y specs.

## Qué es y en qué punto está

**tremen-sdd** es el estándar SDD (spec-driven development) de tremen.dev,
empaquetado como plugin de un harness de agentes. Codifica la jerarquía
**épica → spec → tarea**, el lema "nada se codea sin spec aprobada" (RN-01),
los ADRs inmutables (RN-04) y un pipeline de 7 roles (producto → arquitecto →
implementador → verificador, más orquestador, documentalista y como-vamos),
con hooks que lo hacen cumplir y scripts que lo automatizan — en vez de dejarlo
en prosa que cada proyecto reimplementa a su manera.

Punto actual: el estándar está **establecido y en uso** (el repo se
autogestiona con él, RN-10). El trabajo vivo es **EPIC-001 — multi-harness**
(aprobada): hacer el método reutilizable en varios harnesses sin reescribirlo.
Su primera spec, **SPEC-001 — Refactor a núcleo + adaptadores**, está **hecha**:
ya separó el método (`core/`) del empaque de Claude Code
(`adapters/claude-code/`) e introdujo el paso de build. Quedan por delante las
specs candidatas de la épica; sigue pendiente la **fuente única de roles →
agents** (F-SPEC-001-1). Y **SPEC-003 — Adaptador Kimi Code** está **hecha**:
existen **dos adaptadores** (`adapters/claude-code/` y `adapters/kimi-code/`)
sobre el mismo núcleo, así que el multi-harness es **hecho** en estructura;
falta ejercerlo end-to-end multi-rol contra el CLI real de Kimi (F-SPEC-003-1,
CE-2 completo).

También **SPEC-002 — Enforcement a git + CI** está **hecha**: las garantías
duras (nada sin spec, coherencia de artefactos, invariantes) viven ahora en git
pre-commit (L2) + GitHub Actions (L3), independientes del harness, sobre la
lógica compartida de `core/lib/require-spec.mjs` (RN-03).

## Stack y arquitectura (resumen as-built)

- **Runtime**: Node.js, ESM (`"type": "module"`), sin dependencias de terceros;
  scripts `.mjs` y tests con `node:test`. Paquete `private`, versión 0.4.0.
- **Modelo núcleo + adaptadores** (frontera fijada por ADR-001):
  - `core/` — núcleo agnóstico, única copia versionada del método: `lib/`
    (frontmatter), `scripts/` (`estado.mjs`/`TRANSITIONS`, `scaffold.mjs`,
    `tablero.mjs`, `valida.mjs`, `informe-qa.mjs`), `templates/`, `roles/es/`
    (prosa = system prompts), `tests/`.
  - `adapters/<harness>/` — empaque por harness, simétricos, ninguno en la raíz.
    Hoy `adapters/claude-code/`: `.claude-plugin/`, `agents/`, `skills/`,
    `commands/`, `hooks/`, `tests/`.
  - `tools/` — utillaje de repo (ni núcleo ni adaptador): `build-adapter.mjs` y
    `checks/` (invariantes: `nucleo-aislado`, `nucleo-agnostico`, `fuente-unica`,
    `descripcion-fuente-unica`, `layout`, `referencias`, `roles-fuente-unica`,
    `manifiestos`, `prosa-gates`).
  - `dist/` — salida de build, **gitignored**; `.claude-plugin/marketplace.json`
    en la raíz apunta a `./dist/claude-code`.
- **Paso de build**: `tools/build-adapter.mjs <harness>` ensambla un plugin
  autocontenido en `dist/<harness>/` copiando la superficie del adaptador + el
  núcleo bajo `dist/<harness>/core/`. Determinista, idempotente, cross-platform,
  sin symlinks. Es OBLIGATORIO para instalar/dogfoodear (el núcleo se resuelve
  como ruta interna al plugin root; ver ADR-001 para el porqué).
- **Enforcement (hoy)**: tres hooks del adaptador de Claude Code
  (`require-spec`, `protege-verdad`, `calidad`), todos fail-open, con válvula
  `SDD_SKIP_GATE=1`. Rutas vigiladas: `core/scripts/`, `core/lib/`,
  `adapters/claude-code/hooks/`. El destino (RN-03/CE-4) es git pre-commit + CI,
  aún no implementado.
- **Tests**: tres capas — núcleo (directo sobre `core/tests/`, debe pasar con
  `adapters/` y `dist/` ausentes), tools (build + `tools/tests/`) y adaptador
  (build + `adapters/claude-code/tests/` contra `dist/`). `npm test` corre las
  tres.
- **Documentación visual**: `site/` (design system de tremen.dev).

## Decisiones clave hasta hoy
<!-- Referencias a ADR-NNN, no duplicar su contenido. -->

- **ADR-001 — Estructura del repo para multi-harness** (aprobada, inmutable):
  fija mono-repo con núcleo agnóstico (`core/`) + adaptadores simétricos
  (`adapters/<harness>/`), la regla de dependencia adaptador → núcleo (RN-02) y
  el paso de build que empaqueta el núcleo dentro de cada adaptador instalable.
  Rechaza expresamente: referencia relativa `../../core` (refutada por la doc de
  Claude Code), symlink del núcleo (fricción en Windows/git), adaptador anfitrión
  asimétrico y repo-por-harness. Consúltalo para el detalle; aquí no se duplica.
- **D-1 (decisión humana, no-negociable)**: nada se implementa sin una SPEC
  aprobada → RN-01. No-negociables asociados: el núcleo nunca acoplado a un
  harness (RN-02) y el enforcement independiente del harness (RN-03).

## Riesgos y preguntas abiertas

- **[ABIERTO] Distribución para usuarios finales sin resolver.** `dist/` está
  gitignored, así que instalar exige un build local; publicar el artefacto
  construido (registro remoto o git del `dist/`) es trabajo explícitamente fuera
  de SPEC-001 y de EPIC-001. Hoy no hay vía de instalación "clonar y usar".
- **[ABIERTO / deuda conocida] Regresión de specs migradas en `estado.mjs`.**
  Defecto abierto a propósito: `estado.mjs` atasca cualquier spec que venga de un
  sistema previo. No agravarlo — cualquier trabajo sobre la máquina de estados
  debe mantener los tests de `estado` igual de verdes (SPEC-001 CA-2).
- **[PARCIAL] Multi-harness: estructura hecha, ejecución real pendiente.**
  Existen dos adaptadores (`adapters/claude-code/` y `adapters/kimi-code/`,
  SPEC-003) sobre el mismo núcleo, con la guía "añadir un harness" as-built
  (CE-5). Queda abierto: la **operación end-to-end multi-rol contra el CLI real
  de Kimi** (F-SPEC-003-1, CE-2 completo) — hoy validado a nivel de
  formato/build/resolución (smoke test), no ejecutado contra el CLI real.

> Resueltos en SPEC-002 (2026-07-21): «enforcement atado al harness» (ahora en
> git+CI, RN-03) y el falso positivo de `protege-verdad` con el prefijo de rol
> (F-SPEC-001-3, arreglado en `_comun.mjs`).
