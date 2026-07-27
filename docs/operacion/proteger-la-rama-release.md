# Runbook — proteger la rama `release`

> **Estado: BLOQUEADO por el plan de GitHub.** Comprobado el 2026-07-27 contra la
> API en vivo. Lee "El hallazgo" antes de intentar nada: la protección que
> ADR-010 recomienda **no se puede activar hoy** en este repositorio.

Precondición de **EPIC-004 — Distribución del artefacto a runtime**. ADR-010
decide publicar el artefacto construido en una rama huérfana `release` del propio
repo fuente, y recomienda una regla de protección sobre ella. Este documento dice
qué se puede y qué no, y qué hacer mientras tanto.

## El hallazgo

`tremen-dev/tremen-sdd` es un repositorio **privado** en una organización con plan
**free**. En esa combinación GitHub no ofrece ni *rulesets* ni *branch protection*.

Comprobado el **2026-07-27** con la API, no de memoria:

```
$ gh api orgs/tremen-dev -q '{login:.login, plan:.plan}'
{"login":"tremen-dev","plan":{"filled_seats":1,"name":"free", ...}}

$ gh api repos/tremen-dev/tremen-sdd/rulesets
{"message":"Upgrade to GitHub Pro or make this repository public to enable this
feature.", "status":"403"}

$ gh api repos/tremen-dev/tremen-sdd/branches/main/protection
{"message":"Upgrade to GitHub Pro or make this repository public to enable this
feature.", "status":"403"}
```

Coherente con la documentación oficial (consultada el 2026-07-27):

- *About rulesets* — «A ruleset is a named list of rules that applies to a
  repository or to multiple repositories in an organization **for customers on
  GitHub Team and GitHub Enterprise plans**».
  <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets>
- *About protected branches* — «You can enable branch restrictions **in public
  repositories owned by a GitHub Free organization** and in all repositories owned
  by an organization using GitHub Team or GitHub Enterprise Cloud».
  <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches>

Consecuencia directa: **`main` tampoco está protegida hoy.** Esto no es una
carencia que traiga EPIC-004; es una que EPIC-004 destapa.

## Las tres salidas

Ninguna es técnica: las tres son decisiones del dueño del repo.

### A — Subir la organización a GitHub Team

Desbloquea rulesets y branch protection en repos privados. Es de pago por
asiento. Es la única salida que da protección **real** —imposible saltarse desde
el cliente— sin cambiar la visibilidad del código. Si la distribución interna va
a crecer a varios equipos, es la salida natural.

### B — Hacer público el repositorio

Con org free, los repos **públicos** sí admiten protección. Pero publicar el
código es una decisión de producto, no de infraestructura: la visión declara la
apertura a terceros como «puerta abierta, no compromiso adquirido», y EPIC-004
dejó la distribución pública **fuera de alcance** a propósito. No lo hagas para
conseguir una regla de protección.

### C — Convivir sin protección, con controles compensatorios

Es lo que aplica **hoy por defecto**, y es defendible mientras el repo tenga un
único committer. Lo que ya sostiene la garantía sin depender de GitHub:

- **La publicación la hace un script, nunca una edición a mano**, y desde un
  worktree aparte — nunca conmutando el checkout de desarrollo (ADR-010).
- **Un commit por publicación, sin force-push** (ADR-010): el historial de
  `release` es append-only por convención, y cualquier reescritura se ve en el
  reflog del remoto.
- **`PROVENANCE.json`** hace el árbol publicado contrastable contra el commit de
  fuente que lo generó: si alguien edita `release` a mano, deja de cuadrar.
- **CI sigue siendo fail-closed para la fuente**: `pull_request` no se filtra, así
  que un PR que intentara mezclar `release` en una rama de fuente corre la suite y
  **falla**.
- **Publicar no necesita `--no-verify` ni `SDD_SKIP_GATE=1`** — es un criterio de
  aceptación de SPEC-016, no una casualidad. Si algún día hiciera falta una
  válvula para publicar, el mecanismo estaría mal, no la válvula.

Lo que **no** cubre la opción C, y conviene tener escrito: nada impide
técnicamente un `git push --force origin release` ni un commit a mano en esa
rama. La detección es posterior (PROVENANCE deja de cuadrar), no preventiva.

## Si algún día se desbloquea (A o B): cómo se hace

Estos pasos **no se han podido ejercer** en este repo — están escritos contra la
API documentada y quedan como hipótesis hasta que alguien los ejecute y anote el
resultado aquí.

Regla mínima sobre `release`, coherente con ADR-010 (append-only, sin borrado,
sin force-push; **sin** exigir pull request, porque `release` se publica por
script y no por PR):

```bash
gh api -X POST repos/tremen-dev/tremen-sdd/rulesets \
  -f name='release append-only' \
  -f target='branch' \
  -f enforcement='active' \
  -f 'conditions[ref_name][include][]=refs/heads/release' \
  -f 'conditions[ref_name][exclude][]=' \
  -f 'rules[][type]=deletion' \
  -f 'rules[][type]=non_fast_forward'
```

Identificadores de regla, según *REST API — Repository rules* (consultada el
2026-07-27, <https://docs.github.com/en/rest/repos/rules>):

| `type` | Qué hace | ¿Para `release`? |
|---|---|---|
| `deletion` | impide borrar la rama | **sí** |
| `non_fast_forward` | impide force-push | **sí** |
| `update` | impide actualizar la rama | no — la publicación *es* una actualización |
| `pull_request` | exige PR para modificar | no — se publica por script |
| `required_signatures` | exige commits firmados | opcional |
| `required_status_checks` | exige checks en verde | no — CI ignora `release` a propósito |

Por la UI: *Settings → Rules → Rulesets → New ruleset*, target `branch`, patrón
`release`, y marcar *Restrict deletions* y *Block force pushes*. Verifica el
resultado con `gh api repos/tremen-dev/tremen-sdd/rulesets` — si devuelve la
regla en vez de un 403, está activa.

**Si se desbloquea, protege también `main`.** Hoy está igual de desprotegida y es
la rama de la que todo cuelga.

## Qué hacer ahora

1. **Decide entre A, B y C.** Si no decides, estás en C.
2. Si eliges **C**, no hace falta ninguna acción: el mecanismo de ADR-010 ya está
   diseñado para no depender de la protección. Anota la decisión y sigue.
3. Si eliges **A** o **B**, ejecuta los pasos de arriba y **actualiza este
   fichero** con lo que realmente pasó — incluidas las desviaciones respecto a lo
   escrito aquí, que está sin ejercer.

## Qué corrige este documento

ADR-010 y SPEC-016 dan por hecho que la regla de protección es «configuración
suya, no código», dando a entender que basta con querer activarla. **No es
cierto en el plan actual.** No invalida la decisión de ADR-010 —el mecanismo de
publicación funciona sin protección— pero sí degrada una de sus mitigaciones de
"recomendada" a "no disponible". Queda registrado aquí en lugar de editar el ADR,
que es inmutable (RN-04).
