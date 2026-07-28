# Changelog

Todas las novedades relevantes de este proyecto se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto se adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [Sin publicar] — 0.5.0

### Añadido

- **El artefacto se puede instalar sin clonar el repo ni construir** (SPEC-016,
  EPIC-004, ADR-010). El build de los tres adaptadores se publica en una rama
  **huérfana `release`** de este mismo repo —100% generada, un commit por
  publicación, sin force-push— con tag `v<version>` y Release con notas. Un solo
  ref sirve a los tres harnesses: Claude Code lo consume como marketplace git
  nativo (`marketplace add <url>#<ref>`, el `#ref` es **obligatorio**) y Kimi y
  opencode lo obtienen por git plano (`--depth 1 --single-branch --branch v<X>`)
  y copian el árbol a su destino nativo.
- **`tools/publica.mjs`**: ensambla el árbol publicable (modo `--dry-run`) y lo
  comitea sobre un **worktree aparte** con su tag (modo `--local`). No empuja: el
  último paso —`git push` de rama y tag, y el Release— lo ejecuta una persona,
  porque un tag publicado no se re-publica. El commit de publicación pasa el
  pre-commit **sin `--no-verify` ni `SDD_SKIP_GATE=1`**.
- **Trazabilidad de lo instalado** (semilla de "¿qué versión tengo?"): cada árbol
  construido lleva un **`PROVENANCE.json`** con `version`, `commit` de fuente,
  `harness`, `fecha` UTC y `sucio`, y viaja dentro del artefacto hasta la cache
  del harness instalado. La `fecha` es la del commit de fuente, no la hora de
  build, para no romper el determinismo.
- **Check `version-unica`**, cableado en `npm run check`: `package.json.version`
  es la única fuente de versión; falla si un manifiesto del árbol fuente diverge
  o si la entrada del marketplace declara `version`.

### Cambiado

- **CI ignora la rama `release` en el evento `push`** (`branches-ignore`), y solo
  eso: la rama publicada no contiene fuente y un run sobre ella solo podría
  fallar. `pull_request` **no** se filtra, así que un PR que intentara mezclar
  `release` sigue corriendo la suite completa y falla. Efecto colateral aceptado
  y argumentado en ADR-010 §8: los pushes de **tag** dejan de disparar CI, sin
  pérdida de cobertura (todo commit de fuente ya pasó por CI en su rama y su PR).
- El `marketplace.json` de la raíz declara `description`, para que el catálogo
  publicado pase `claude plugin validate` sin warnings.

## [Sin publicar] — 0.4.0

### Corregido

- **`protege-verdad`: cierre del hueco de cobertura del prefijo de plugin en el
  adaptador kimi-code** (SPEC-012, EPIC-FIX). El gate `protege-verdad` (RN-08:
  los documentos de verdad tienen dueño único) denegaba al **dueño legítimo**
  (arquitecto/PO) cuando su identidad de rol llegaba **prefijada por el harness**
  (p. ej. `tremen-sdd:sdd-arquitecto`), porque se comparaba el `agent_type` crudo
  contra la lista de dueños. La reparación de fondo —normalizar la identidad
  quitando el prefijo con la semántica `lastIndexOf(':')`— ya estaba en la fuente
  0.4.0 desde el commit `7323a1f` (`normalizaRol()` en claude-code y `sinPrefijo()`
  en kimi-code). Este cambio **añade la cobertura de test que faltaba** en
  `adapters/kimi-code/tests/protege-verdad.test.mjs` para la forma prefijada
  (dueño prefijado → permite; no-dueño prefijado → deniega), en paridad con los
  casos CA-8 ya existentes de claude-code. No se modifica el comportamiento del
  gate: solo se fija la regresión. El adaptador opencode no compara identidad de
  rol y no aplica (delega en git/CI L2/L3, ADR-007 [H3]).
- La política sobre qué prefijos se aceptan al normalizar queda registrada en
  **ADR-008** (aceptar cualquier prefijo, `lastIndexOf(':')`).

### Notas

- El mismo fix de fondo (`7323a1f`) se **backporta** a la línea publicada 0.3.x
  como **0.3.1** (rama de mantenimiento sobre el layout antiguo de un solo
  adaptador), para desbloquear a quienes hoy corren el plugin publicado 0.3.0.
  Consulta la entrada de 0.3.1 para el detalle del síntoma y la vía de
  actualización.
