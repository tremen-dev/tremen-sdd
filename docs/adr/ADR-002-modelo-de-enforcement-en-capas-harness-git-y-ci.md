---
id: ADR-002
tipo: adr
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-07-20, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-20, por: Alberto Fojo}
---
# ADR-002: Modelo de enforcement en capas: harness, git y CI

- Deciders: propone sdd-arquitecto; aprueba Alberto Fojo (pendiente, gate humano).
- Specs relacionadas: SPEC-002 (Enforcement a git + CI) lo consume y materializa. Origen: EPIC-001, CE-4 (enforcement independiente del harness) y CE-1 (núcleo aislado vigilado en CI); RN-01, RN-03.

## Contexto

Hoy el enforcement de tremen-sdd vive como **tres hooks del adaptador Claude
Code** (`adapters/claude-code/hooks/`): `require-spec` (PreToolUse, deniega editar
rutas vigiladas sin rama `ft/SPEC-NNN` + spec aprobada/en-progreso),
`protege-verdad` (PreToolUse, protege documentos de verdad y el tablero generado)
y `calidad` (PostToolUse, coherencia frontmatter/estado vía `valida.mjs` o linter).
Los tres son **fail-open** (ante cualquier duda permiten) con válvula
`SDD_SKIP_GATE=1`.

Ese diseño tiene dos límites estructurales que EPIC-001 obliga a resolver:

- **Atado al harness (CE-4 / RN-03)**: si el harness no tiene hooks —o alguien
  edita fuera del harness (git directo, otro editor, un segundo harness sin la
  config de hooks)— la garantía "nada se codea sin spec aprobada" no se sostiene.
  El enforcement debe ser **independiente del harness**.
- **Fail-open no es garantía (RN-01)**: un hook fail-open es *feedback*, no
  *garantía*. Sirve para avisar rápido dentro del editor, pero por diseño nunca
  bloquea de verdad; RN-01 exige que exista además una capa que **bloquee**.

La lógica reutilizable ya existe y no debe reescribirse (SPEC-001 la dejó en
`core/` y `tools/`): `core/scripts/valida.mjs` (`validateFile`, `validate`, con
CLI `--dir`), `core/scripts/estado.mjs` (`TRANSITIONS`), `core/lib/frontmatter.mjs`
y los seis checks de `tools/checks/*.mjs` (cada uno con entrypoint CLI, exit 0/1).
La decisión de la regla require-spec (rama + estado de spec), en cambio, vive HOY
**embebida** dentro de `require-spec.mjs` acoplada al payload del hook de Claude
Code; para reusarla en git sin duplicarla hay que extraerla.

Restricciones del repo que condicionan el mecanismo: **cero dependencias de
terceros** (paquete `private`, `dependencies` vacío) y **dogfooding en Windows**.
El `origin` es GitHub (`github.com/tremen-dev/tremen-sdd`).

La pregunta que este ADR fija, antes de escribir un hook o un workflow: **¿qué
capas de enforcement hay, con qué modo de fallo cada una, mediante qué mecanismo
(sin dependencias nuevas y cross-platform), y cómo comparten UNA sola lógica en
lugar de duplicarla?**

## Decisión

**Enforcement en TRES capas sobre UNA lógica compartida. Las capas se distinguen
por velocidad, alcance y modo de fallo; ninguna reimplementa la regla: todas
invocan los mismos módulos de `core/` y `tools/`.**

1. **L1 — Hooks del harness (existente): feedback rápido, FAIL-OPEN.**
   Los hooks de `adapters/<harness>/hooks/` (hoy Claude Code) siguen como están:
   avisan dentro del editor en el momento de la edición, y ante cualquier fallo
   **permiten** (una herramienta rota jamás debe frenar al desarrollador).
   Válvula explícita `SDD_SKIP_GATE=1`. Son *feedback*, no la garantía.

2. **L2 — Git pre-commit (nuevo): garantía local, FAIL-CLOSED.**
   Un hook `pre-commit` de git, **independiente del harness**, bloquea el commit
   (exit ≠ 0) si el conjunto staged viola una regla expresable sobre contenido
   staged: require-spec (rutas vigiladas ↔ rama/spec) y coherencia de artefactos
   (`valida`). Se instala vía **`git config core.hooksPath <dir versionado>`**
   (dir bajo control de versiones, p. ej. `tools/githooks/`), con un shim
   `#!/bin/sh` que invoca `node` sobre un `.mjs` cross-platform. Tiene **dos
   válvulas de escape sancionadas**: (a) la **nativa de git** `git commit
   --no-verify` (no dispara ningún hook), y (b) **`SDD_SKIP_GATE=1`**, la misma
   variable que honran los hooks L1 — el pre-commit la respeta por **coherencia
   entre capas** (una sola forma de saltarse el gate, se edite donde se edite).
   Ambas son auditables.

3. **L3 — CI / GitHub Actions (nuevo): garantía autoritativa, FAIL-CLOSED, no
   evitable en local.** Un workflow de GitHub Actions corre en cada push/PR la
   suite completa (`npm test` = build + núcleo + tools + adaptador), **los seis
   checks de invariantes** contra el árbol real (aquí vive CE-1: `nucleo-aislado`)
   y `valida` sobre todos los artefactos. Falla (rojo) ante cualquier exit ≠ 0.
   A diferencia de L2, **no es evitable con `--no-verify`**: convertido en
   *required status check* por protección de rama, es la puerta real de merge.

**Una sola lógica (invariante anti-duplicación, RN núcleo):**
- La decisión require-spec (parseo de rama `ft/SPEC-NNN`, búsqueda de la spec,
  comprobación de `estado ∈ {aprobada, en-progreso}`) se **extrae a un único
  módulo en `core/`**; tanto `require-spec.mjs` (L1) como el pre-commit (L2)
  lo **invocan**, no lo copian.
- La coherencia de artefactos es siempre `core/scripts/valida.mjs`; los
  invariantes son siempre los `tools/checks/*.mjs` existentes; las transiciones
  son siempre `core/scripts/estado.mjs`. Ninguna capa reimplementa nada.

**Modo de fallo — el porqué:** el *feedback* (L1) falla-abierto para que la
fragilidad de una herramienta nunca detenga a quien trabaja; las capas de
*garantía* (L2/L3) fallan-cerrado porque una garantía que cede ante un error no
es garantía. Las válvulas son explícitas y auditables (`SDD_SKIP_GATE`,
`--no-verify`); y CI (sin bypass local) es el backstop que hace que las válvulas
locales no comprometan la garantía de la rama protegida.

**Alcance de cada regla por capa.** No todas las reglas son expresables en todas
las capas: `protege-verdad` decide por **identidad de rol de agente**
(`agent_type`), un concepto del harness que **no existe a nivel de git** (git solo
conoce al *committer*). Por eso la parte de identidad de `protege-verdad` sigue
siendo **solo L1**; L2/L3 enforcan lo expresable sobre contenido staged
(require-spec, coherencia de `valida`, invariantes estructurales — incluido
"`dist/` no se comitea" vía `fuente-unica`, y "tablero generado" es cubrible por
coherencia). Esta asimetría es deliberada, no un hueco.

Mecanismo (cerrado por este ADR; la materialización la especifica SPEC-002):
- **Git hooks vía `core.hooksPath`** a un directorio versionado, no copiando a
  `.git/hooks/`. Shim `sh` fino → `node` (Git para Windows trae `sh`, así que es
  cross-platform). **Sin dependencias nuevas.** Instalación = un comando
  reproducible (`git config core.hooksPath …`, envuelto en un script npm).
- **CI = GitHub Actions** (el `origin` es GitHub; encaje natural). Sin `npm ci`
  significativo (no hay deps), solo Node + los scripts del repo.

## Consecuencias
### Positivas
- **Garantía independiente del harness (CE-4/RN-03)**: "nada sin spec aprobada" y
  la coherencia de artefactos se sostienen aunque el harness no tenga hooks, vía
  git y CI.
- **CE-1 vigilada en CI**: `nucleo-aislado.mjs` corre como guardián de la regla de
  dependencia adaptador→núcleo (RN-02) en cada PR.
- **Sin duplicar lógica**: una sola fuente de la decisión require-spec y de la
  validación; coherente con "una sola fuente de verdad".
- **Sin dependencias nuevas, cross-platform**: `core.hooksPath` + `node`, sin
  husky ni symlinks; compatible con el dogfooding en Windows.
- **Modo de fallo correcto por capa**: feedback que no estorba; garantía que no
  cede.

### Negativas / follow-ups
- **`core.hooksPath` es un paso de setup por clon**: un clone fresco no tiene el
  pre-commit activo hasta correr el comando de instalación (no hay `postinstall`
  automático porque no hay ciclo de `npm install` con deps). Coste asumido y
  documentado.
- **CI como puerta de merge exige protección de rama**: el workflow se entrega,
  pero convertirlo en *required status check* sobre `main` es una acción de
  **admin humano** en GitHub, fuera del código. Sin ella, CI informa pero no
  bloquea el merge.
- **Las válvulas locales de L2 (`--no-verify` y `SDD_SKIP_GATE=1`) son bypass
  local**; mitigado por L3 (CI no respeta ninguna de las dos). Es intencional: la
  conveniencia local no debe ser inviolable, pero la rama protegida sí.
- **`manifiestos` y `referencias` exigen build previo** (operan sobre
  `dist/<harness>/`): CI y cualquier runner agregado deben `npm run build` antes.
- **`protege-verdad` (identidad) no baja a git/CI**: la protección de documentos
  de verdad por rol de agente sigue siendo solo L1; a nivel de git la protegen la
  revisión humana del PR y `valida`/checks, no una regla de identidad.

## Alternativas consideradas
- **Husky (o similar) para gestionar los git hooks.** Rechazada: añade una
  dependencia de terceros a un repo deliberadamente **cero-deps**, y su único
  valor (instalar/gestionar hooks) se obtiene con una línea `git config
  core.hooksPath`. Peso injustificado.
- **Copiar los hooks a `.git/hooks/`.** Rechazada: `.git/` no se versiona, así que
  el hook no vive en el repo (drift, no auditable) y exige un paso de copia por
  clon igualmente. `core.hooksPath` a un dir versionado es fuente única.
- **Symlink del hook.** Rechazada por el mismo motivo que ADR-001 descartó los
  symlinks del núcleo: fricción real en Windows/git.
- **Fail-open también en git/CI.** Rechazada: reproduce el límite actual (feedback
  sin garantía). Las capas de garantía deben fallar-cerrado o no garantizan
  RN-01.
- **Solo CI, sin pre-commit.** Rechazada: se pierde el fail-closed local y rápido;
  el desarrollador descubre la violación tarde (en el PR) en vez de en el commit.
- **Solo pre-commit, sin CI.** Rechazada: `--no-verify` lo hace localmente
  evitable; sin una capa server-side no hay garantía real sobre la rama.
- **Reimplementar la regla require-spec dentro del pre-commit** (copiar el parseo
  de rama/estado). Rechazada: duplica lógica que debe tener fuente única; obliga a
  extraerla a `core/` y compartirla (la decisión adoptada).
- **CI en otra plataforma (no GitHub Actions).** Rechazada para esta épica: el
  `origin` es GitHub; Actions es el encaje natural sin infraestructura extra.

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
