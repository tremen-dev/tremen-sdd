---
id: EPIC-004
tipo: epica
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-07-27, por: sdd-producto}
  - {estado: aprobada, fecha: 2026-07-27, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# EPIC-004 — Distribucion del artefacto a runtime

## Objetivo
Que un equipo de tremen.dev pueda **instalar y actualizar** tremen-sdd en su
harness sin clonar este repo ni construir nada a mano: hay un artefacto
publicado, versionado e identificable, y un procedimiento de una línea por
harness para ponerlo en el runtime.

Hoy no existe esa vía. `dist/` está gitignored y el `marketplace.json` de la raíz
apunta a `./dist/claude-code`, así que instalar exige `npm install` +
`npm run build` + `marketplace add <ruta local del clon>` (README §Instalación).
Eso convierte a cualquier consumidor en un colaborador del repo, y hace que
"lo instalado" y "lo mergeado" diverjan sin que nadie lo note: el caso de
**SPEC-012**, un bug reportado contra el plugin instalado (0.3.0) que ya estaba
arreglado en fuente (0.4.0). Sin distribución, la promesa de la visión —"el
método se cambia en un único sitio"— se cumple en el repo pero no en las
máquinas donde se usa.

**Por qué ahora**: EPIC-003 entregó el tercer harness para un equipo interno
concreto que ya lo necesita, y ese equipo no tiene forma de instalarlo salvo
clonando y construyendo. La distribución es lo que convierte tres adaptadores
construibles en tres adaptadores *usables*. Además es la última pieza [ABIERTO]
de `contexto.md` que no depende de terceros: SPEC-013 sigue bloqueada por la
cuenta de Kimi, esta no bloquea con nadie.

**Audiencia (decidida en el gate, 2026-07-27)**: equipos internos de tremen.dev.
La apertura a terceros que la visión deja como puerta abierta **no** entra aquí:
no hay compromiso de soporte externo, ni registro público, ni superficie de
comercialización.

## Criterios de éxito
<!-- Medibles. Cómo sabremos que la épica cumplió su promesa. -->
- **CE-1 (instalación sin clon ni build)**: una persona de tremen.dev que **no
  tiene el repo clonado** instala tremen-sdd en su harness siguiendo un
  procedimiento documentado, y opera el pipeline (`/sdd-init` → épica → spec)
  **sin haber ejecutado `npm run build`** y sin que su procedimiento pase en
  ningún punto por el árbol de fuentes. Se mide ejerciéndolo de verdad sobre una
  máquina/entorno limpio, no describiéndolo.

  > **Reescrito en el gate del 2026-07-27 (Alberto Fojo).** La redacción original
  > exigía además "ni haber tenido acceso al código fuente del núcleo". El humano
  > eligió publicar en una **rama del propio repo fuente** (ADR-010) en lugar de
  > un repo de distribución dedicado; como GitHub concede lectura **por
  > repositorio y no por rama**, quien recibe acceso para instalar ve `core/`, y
  > esa cláusula pasaba a ser inalcanzable por construcción. CE-1 mide ahora lo
  > que el mecanismo elegido sí entrega —instalar y operar sin clonar ni
  > construir—; el **aislamiento de la fuente** no se pierde: sale como criterio
  > propio, aparcado en "Más adelante" del roadmap, y será exigible el día que
  > haya audiencia externa. No se marca como residual de esta épica: es alcance
  > retirado a propósito, no promesa incumplida.
- **CE-2 (cobertura de los tres harnesses)**: claude-code, kimi-code y opencode
  tienen cada uno su vía de instalación publicada y verificada. Se acepta que el
  *mecanismo* difiera por harness (solo Claude Code tiene marketplace nativo;
  Kimi y opencode se instalan por procedimiento sobre el artefacto
  autocontenido, ADR-003/ADR-007), pero **ninguno** puede exigir construir desde
  fuente.
- **CE-3 (versión identificable y trazable)**: desde el runtime instalado se
  puede responder "¿qué versión tengo?" y contrastarla con lo publicado, y cada
  publicación deja rastro de qué cambió. Se mide reproduciendo el escenario de
  SPEC-012: ante un bug reportado, se determina si la versión instalada lo
  incluye **sin** leer el código fuente ni el historial de git.
- **CE-4 (actualizar es barato y no rompe)**: quien ya lo tiene instalado pasa a
  una versión nueva con el mismo procedimiento de instalación, sin perder el
  estado SDD de sus proyectos (`.sdd.json`, `docs/`, ramas). Se mide con un
  ciclo real instalar → publicar cambio → actualizar → verificar que el cambio
  llegó.
- **CE-5 (publicar es un paso del proceso, no una gesta)**: publicar una versión
  es un procedimiento acotado y documentado (idealmente automatizado desde CI),
  no una secuencia manual que solo el autor del repo sabe ejecutar. Se mide por
  que **otra persona** lo ejecute siguiendo la doc.

## Alcance
- Dentro:
  - Mecanismo de publicación del artefacto construido para los tres adaptadores,
    sobre GitHub de la organización (canal confirmado en el gate). La forma
    concreta —release con adjuntos, tag, rama con `dist/` commiteado, repo
    aparte— es **decisión técnica del ADR**, no de esta épica.
  - Versionado del artefacto y su trazabilidad: qué versión hay instalada, qué
    entró en cada versión, cómo se contrasta contra lo publicado.
  - Procedimiento de instalación y de actualización **por harness**, ejercido y
    documentado, sustituyendo el "hoy la instalación pasa por un build local"
    del README.
  - Automatización de la publicación (build + checks + publicar) apoyada en el
    CI existente.
  - Cerrar el `[ABIERTO]` de `docs/fundacion/contexto.md` y las referencias que
    lo declaran fuera de alcance en ADR-003 §213, ADR-007 §187/§204, SPEC-010
    §197 y SPEC-011 §236.
  - **F-SPEC-014-3** (precedencia real de permisos en opencode: un `edit: allow`
    plano por-agente pisa el deny global por-ruta): su destino declarado es "doc
    de instalación", y el doc de instalación de opencode se reescribe aquí.
- Fuera (aparcado a propósito, no por descuido):
  - **Distribución pública / a terceros**: registro público, comercialización,
    soporte externo, licencia de uso. La visión deja la puerta abierta; esta
    épica no la cruza. Si el mecanismo elegido la facilita, bien; no es
    criterio.
  - **Instalador interactivo o gestor de versiones propio**: si el harness ya da
    un mecanismo, se usa; no se construye tooling nuevo de instalación por
    encima.
  - **Telemetría de uso o inventario de instalaciones**: saber quién tiene qué
    versión instalada no entra.
  - **Multi-idioma de roles**: sigue siendo solo `es` (heredado de EPIC-003).
  - **Cambiar el método, los roles o la máquina de estados**: esta épica mueve
    el artefacto, no lo que contiene. Si distribuir obliga a tocar `core/`, es
    un hallazgo a elevar, no alcance.
  - **F-SPEC-014-2** (`protege-verdad` por identidad de agente en opencode): es
    enforcement, no distribución. Su destino sigue siendo EPIC-003/EPIC-MEJORA.
  - **Migrar instalaciones existentes**: hoy la única instalación es la del
    autor; no hay parque que migrar.

## Specs
<!-- El estado por spec vive en el frontmatter de cada spec; el tablero agregado se regenera con /sdd-tablero (docs/tablero.md). No mantengas listas de specs a mano aquí. -->
Desglose orientativo (lo autora sdd-arquitecto, no es vinculante):

| # | Spec candidata | Entrega |
|---|---|---|
| 1 | Mecanismo de publicación y versionado | ADR + implementación de cómo se publica el artefacto en GitHub de la org y cómo se versiona; incluye qué pasa con `dist/` gitignored y con el `marketplace.json` que hoy apunta a una ruta local. |
| 2 | Publicación automatizada desde CI | El pipeline que construye, pasa los checks y publica una versión; CE-5. |
| 3 | Instalación y actualización por harness | Procedimiento ejercido para claude-code, kimi-code y opencode sobre entorno limpio (CE-1, CE-2, CE-4), + reescritura del README §Instalación y del doc de opencode con F-SPEC-014-3. |
| 4 | Trazabilidad de versión en runtime | Responder "qué versión tengo" desde el harness instalado y contrastarla con lo publicado (CE-3, escenario SPEC-012). |

> **Decisión técnica pendiente de ADR (sdd-arquitecto)**: la forma de publicación
> sobre GitHub de la organización. Sobre la mesa, al menos: *release* con el
> artefacto adjunto, rama/tag con `dist/` commiteado (hoy gitignored — cambiarlo
> tiene consecuencias en L2/L3 y en los checks de aislamiento), o repo separado
> de distribución. La restricción dura es CE-2: la solución tiene que servir a
> un harness **con** marketplace y a dos **sin** él, sin bifurcar el método.
>
> **Restricción de método**: cualquier afirmación sobre el mecanismo de plugins
> de un harness (marketplace de Claude Code, instalación de Kimi, plugins de
> opencode) se basa en documentación real y vigente citada con su fecha, o se
> marca como hipótesis a verificar contra el CLI. Es la misma restricción que
> EPIC-003 y por la misma razón: estas herramientas se mueven rápido.

## Riesgos
- **`dist/` commiteado contamina el repo y los gates**: la vía más directa
  (versionar `dist/`) mete artefacto generado en git, con ruido en diffs,
  posibilidad de que fuente y artefacto diverjan en el mismo commit, y roce con
  los checks de aislamiento y con `protege-verdad`. Mitiga: es exactamente lo
  que el ADR de la spec #1 debe pesar contra las alternativas, con criterio
  explícito.
- **Divergencia silenciosa fuente↔publicado**: es el fallo que motiva la épica
  (SPEC-012) y también su riesgo: publicar tarde o a medias reproduce el
  problema con otra cara. Mitiga: CE-3 y CE-5 lo atacan de frente; publicar debe
  ser barato y trazable, o no se hará.
- **El mecanismo de un harness cambia bajo nuestros pies**: los tres CLIs
  evolucionan rápido y el procedimiento de instalación es justo la superficie
  más volátil. Mitiga: procedimientos ejercidos contra CLI real con versión y
  fecha anotadas (como hizo SPEC-014), no descritos de memoria.
- **CE-1 sin quien lo valide de verdad**: "una persona sin el repo clonado" pide
  a alguien que no sea el autor. Si nadie lo ejerce, se validará con un entorno
  limpio simulado y el criterio quedará más débil de lo escrito. Mitiga:
  identificar antes de empezar a quién se le pide la instalación real —
  candidato natural, el equipo interno de opencode de EPIC-003.
- **Alcance que se estira hacia lo público**: "ya que publicamos, hagámoslo
  bien para terceros" es la deriva probable. Mitiga: está explícitamente fuera;
  cualquier trabajo que solo tenga sentido para audiencia externa se para y se
  eleva.
