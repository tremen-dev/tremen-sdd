# CA-5 (lado deny) — el plugin aborta DE VERDAD en runtime (2026-07-27, opencode 1.18.5)

Fixture en rama `main` (sin carril `ft/SPEC-NNN`), `.sdd.json` con
`rutasVigiladas: ["src/"]`, plugin `require-spec.mjs` cargado vía manifiesto.

## Intento 1 — `write` de `src/suma.mjs` (transcript `ca5-deny-write.json`)
- Evento real: `{"tool":"write","state":{"status":"error","error":"La rama 'main'
  no es una rama de spec (ft/SPEC-NNN-slug). Crea o aprueba la spec con
  sdd-arquitecto y trabaja en su rama."}}`
- Filesystem: `src/suma.mjs` NO existe tras el intento; `src/` intacto
  (`git status --porcelain src/` vacío).

## Intento 2 — `edit` de `src/.gitkeep` (transcript `ca5-deny-edit.json`)
- Mismo error de require-spec en el evento de la tool `edit` (status `error`).
- Hash sha1 de `src/.gitkeep` idéntico antes/después:
  `9ffc5d0667e0504d8bab0fc99331abb9352ae008` (fichero intacto).

## Lectura
- [H2] CONFIRMADA: el `throw` del hook `tool.execute.before` aborta la tool
  (`write` y `edit`) en el CLI real; el payload real (`input.tool`,
  `output.args.filePath`) basta para decidir require-spec.
- Observación operativa (no falla del gate): el MODELO informó "Creado
  src/suma.mjs" pese al error de la tool — alucinación de éxito del modelo free;
  la verdad del filesystem y del evento de tool es la denegación. El gate L1
  sostiene aunque el modelo misreporte; L2/L3 siguen detrás (ADR-002).
