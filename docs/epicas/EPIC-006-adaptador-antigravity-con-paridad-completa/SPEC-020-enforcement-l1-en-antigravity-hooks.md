---
id: SPEC-020
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
# SPEC-020 — Enforcement L1 en Antigravity hooks

## Problema
SPEC-019 entregó la superficie base del adaptador Antigravity (manifiesto, skills y build).
Sin embargo, todavía no existe el mecanismo de control de flujo en el harness (L1).
Sin hooks activos en Antigravity, un agente podría editar ficheros vigilados sin una spec
aprobada y sin estar en la rama de trabajo adecuada, dependiendo exclusivamente de L2
(git pre-commit) para detectar la infracción.

Esta spec implementa el **enforcement L1 en Antigravity** mediante el estándar nativo
`hooks.json`, interceptando en `PreToolUse` las herramientas de escritura
(`write_to_file`, `replace_file_content`, `multi_replace_file_content`), invocando
la lógica pura compartida de `core/lib/require-spec.mjs` (RN-01) y emitiendo una decisión
dura `deny` cuando corresponda.

## Criterios de aceptación

- **CA-1 (Configuración de hooks.json)**:
  Dado `adapters/antigravity/hooks/hooks.json`, cuando se inspecciona,
  entonces declara `PreToolUse` con matcher `"write_to_file|replace_file_content|multi_replace_file_content"`
  para `require-spec.mjs` y `protege-verdad.mjs`, y `PostToolUse` para `calidad.mjs`.

- **CA-2 (Shim de comunicación _comun.mjs)**:
  Dado `adapters/antigravity/hooks/_comun.mjs`, cuando se invoca con payloads de Antigravity,
  entonces extrae correctamente la ruta del fichero (`TargetFile` o `AbsolutePath`) y
  emite respuestas válidas en stdout (`decision: "deny"` con `reason`, o `decision: "allow"`).

- **CA-3 (Gate require-spec — RN-01)**:
  Dado `adapters/antigravity/hooks/require-spec.mjs`:
  (a) cuando se intenta editar un fichero bajo `rutasVigiladas` fuera de rama `ft/SPEC-NNN`
  o con spec no aprobada, emite `decision: "deny"`;
  (b) cuando la rama y spec son válidas, emite `decision: "allow"`;
  (c) cuando `process.env.SDD_SKIP_GATE === '1'` o ante fallo inesperado, degrada fail-open (`decision: "allow"`).

- **CA-4 (Protección de verdad)**:
  Dado `adapters/antigravity/hooks/protege-verdad.mjs`, cuando se intenta editar
  `docs/tablero.md`, emite `decision: "deny"` explicando que es un fichero generado.

- **CA-5 (Tests unitarios de enforcement)**:
  Dado `adapters/antigravity/tests/enforcement.test.mjs`, cuando se ejecuta,
  entonces valida todos los escenarios de decisión de `require-spec.mjs` y `protege-verdad.mjs`
  usando mocks de stdin y argumentos de Antigravity.
