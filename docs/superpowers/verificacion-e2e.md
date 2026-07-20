# Verificación E2E — Task 17

Ejecutada en modo headless (sin sesión interactiva de Claude Code). Sandbox:
`%TEMP%\claude\...\scratchpad\sdd-sandbox` (repo git nuevo, rama `main`).
Plugin: `D:\src\tremen-sdd` (rama `ft/v1-implementacion`).

## Paso 1 — Instalación del plugin

```
claude plugin marketplace add D:\src\tremen-sdd
claude plugin install tremen-sdd@tremen-sdd
```

**PASA.** Ambos comandos terminaron sin error:

```
✔ Successfully added marketplace: tremen-sdd (declared in user settings)
✔ Successfully installed plugin: tremen-sdd@tremen-sdd (scope: user)
```

`claude plugin list` confirma `tremen-sdd@tremen-sdd` versión `0.1.0`, scope `user`, estado `✔ enabled`.

## Paso 2 — Sandbox y ciclo completo de scripts

`/sdd-init` no se pudo invocar como slash-command headless (no hay sesión
interactiva), así que se simuló a mano: `git init -b main`, copia de
`core/templates/sdd.json` → `.sdd.json` con `rutasVigiladas: ["src/"]`, y `mkdir docs`.

> **Nota (SPEC-001)**: esta verificación E2E se corrió en v0.2.0, cuando el
> método vivía plano en la raíz (`scripts/`, `hooks/`, `templates/`, `lib/`).
> Tras el refactor a núcleo + adaptadores, esas rutas son `core/scripts/`,
> `core/templates/`, `core/lib/` y `adapters/claude-code/hooks/`. Los comandos
> de abajo están re-apuntados al layout actual; las **salidas capturadas** se
> conservan tal cual se grabaron entonces.

```
node core/scripts/scaffold.mjs epica "Facturación"
node core/scripts/scaffold.mjs spec "Alta de factura" --epica EPIC-001
node core/scripts/estado.mjs docs/epicas/EPIC-001-facturacion/SPEC-001-alta-de-factura.md aprobada --por Alberto
node core/scripts/tablero.mjs
node core/scripts/valida.mjs
```

**PASA.**

- Épica creada: `docs/epicas/EPIC-001-facturacion/_epica.md`
- Spec creada: `docs/epicas/EPIC-001-facturacion/SPEC-001-alta-de-factura.md` (slug real:
  `alta-de-factura`, usado luego para la rama del paso 3)
- Ledger creado: `SPEC-001-alta-de-factura.ledger.md`
- `estado.mjs` transicionó `borrador → aprobada` y el frontmatter quedó con
  **2 entradas de historial**:
  ```
  historial:
    - {estado: borrador, fecha: 2026-07-09, por: sdd-arquitecto}
    - {estado: aprobada, fecha: 2026-07-09, por: Alberto}
  ```
- `tablero.mjs` regeneró `docs/tablero.md` mostrando:
  ```
  | SPEC-001 — alta-de-factura | aprobada | 2026-07-09 (Alberto) |
  ```
- `valida.mjs` → `[valida] OK`

## Paso 3 — Hooks E2E (payloads reales por stdin, sin sesión)

Se invocaron los hooks directamente simulando el payload que envía Claude Code,
sin abrir una sesión interactiva (headless).

### 3a. `require-spec.mjs` en rama `main` (código vigilado) → esperado: deny

```
echo '{"cwd":"<sandbox>","tool_name":"Edit","tool_input":{"file_path":"<sandbox>/src/app.ts"}}' | node adapters/claude-code/hooks/require-spec.mjs
```

**PASA.**
```
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny",
"permissionDecisionReason":"La rama 'main' no es una rama de spec (ft/SPEC-NNN-slug).
Crea o aprueba la spec con /sdd-arquitecto y trabaja en su rama."}}
```
Menciona `/sdd-arquitecto` como se esperaba.

### 3b. `git checkout -b ft/SPEC-001-alta-de-factura` + repetir → esperado: allow

Slug real confirmado por scaffold: `alta-de-factura` (spec ya `aprobada` desde el
paso 2), rama creada como `ft/SPEC-001-alta-de-factura`.

**PASA.** Salida vacía, exit code `0` → allow (sin bloqueo).

### 3c. `protege-verdad.mjs` sobre `docs/tablero.md` → esperado: deny mencionando `/sdd-tablero`

**PASA.**
```
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny",
"permissionDecisionReason":"docs/tablero.md es GENERADO: regenéralo con /sdd-tablero
(scripts/tablero.mjs); no se edita a mano."}}
```

### 3d. `calidad.mjs` con la spec desincronizada a propósito → esperado: exit 2

Se editó `SPEC-001-alta-de-factura.md` cambiando `estado: aprobada` →
`estado: en-progreso` sin añadir la entrada de historial correspondiente
(desincronización deliberada), y se invocó `calidad.mjs` (PostToolUse) sobre
ese fichero.

**PASA.**
```
[sdd-calidad] Artefacto inconsistente:
 - epicas\EPIC-001-facturacion\SPEC-001-alta-de-factura.md: la última entrada
   de historial no coincide con estado 'en-progreso'. Usa scripts/estado.mjs
   para transicionar.
EXITCODE=2
```
El fichero se restauró a su estado sincronizado inmediatamente después
(`valida.mjs` → `OK` de nuevo) para no dejar el sandbox roto.

## Paso 4 — Skill headless (mejor esfuerzo)

```
claude -p "¿cómo vamos?" --plugin-dir D:\src\tremen-sdd --max-turns 3
```

**FALLA** con `--max-turns 3` (valor sugerido en el brief): `Error: Reached max
turns (3)`, exit code 1 — la skill necesita más turnos para leer frontmatters,
ledger y tablero antes de poder responder en modo headless.

Reintentado con `--max-turns 8` (y `--output-format json` para capturar el
resultado completo):

**PASA (con una salvedad).** La skill `sdd-como-vamos` se disparó y devolvió un
informe de estado coherente, mencionando explícitamente que **SPEC-001 está
aprobada pero la implementación no ha empezado** (no existe `src/`, ledger
vacío), tal como se esperaba:

> "TL;DR: hay 1 épica y 1 spec aprobada, pero todo es esqueleto — la
> implementación no ha empezado (no existe `src/`) y la spec aprobada está
> vacía por dentro."
>
> "Formalmente el siguiente paso sería `sdd-implementador` con SPEC-001..."

Salvedad detectada durante la ejecución: el proceso headless denegó por
permisos la lectura del propio playbook del rol
(`D:\src\tremen-sdd\roles\es\sdd-como-vamos.md`, fuera del directorio permitido
de la sesión headless) — la skill lo señaló ella misma en el informe y
respondió igualmente siguiendo el contrato conocido (frontmatter + ledger +
tablero). Esto es un artefacto del modo `-p` headless (aislamiento de
directorios), no un fallo del hook/skill en sí.

**PENDIENTE de validación interactiva por el humano:** confirmar en una sesión
real de Claude Code (sin las restricciones de directorio del modo headless)
que el prompt "¿cómo vamos?" dispara `sdd-como-vamos` con acceso pleno al
playbook del rol y con el `--max-turns` por defecto de una sesión normal
(muy superior a 3).

## Resumen

| Paso | Resultado |
|---|---|
| 1. Instalación marketplace + plugin | PASA |
| 2. Ciclo scaffold → estado → tablero → valida | PASA |
| 3a. require-spec deny en main | PASA |
| 3b. require-spec allow en rama de spec aprobada | PASA |
| 3c. protege-verdad deny en docs/tablero.md | PASA |
| 3d. calidad.mjs exit 2 con spec desincronizada | PASA |
| 4. Skill `sdd-como-vamos` headless | PASA (con salvedad de permisos de directorio en modo `-p`; `--max-turns 3` insuficiente, usar ≥8) |
| Validación interactiva completa (sesión real de Claude Code) | PENDIENTE — a validar por el humano |
