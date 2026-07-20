---
id: ADR-001
tipo: adr
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-07-20, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-20, por: Alberto Fojo}
---
# ADR-001: Estructura del repo para multi-harness

- Deciders: propone sdd-arquitecto; aprueba Alberto Fojo (pendiente, gate humano). Iteraciones del gate (2026-07-20): (1) confirma el reencuadre de scope de roles; (2) rechaza la asimetría del "adaptador anfitrión" y exige simetría total; (3) refuta —contra la doc oficial de Claude Code— la vía de referencia relativa `../../core` y fija el mecanismo: simetría total + paso de build que empaqueta el núcleo dentro de cada adaptador instalable.
- Specs relacionadas: SPEC-001 (Refactor a núcleo + adaptadores) lo consume y materializa. Origen: EPIC-001, CE-1, CE-3, CE-5.

## Contexto

tremen-sdd empaqueta el método SDD como plugin de un harness de agentes. Hoy
corre solo sobre Claude Code y todo vive en un único repo con dos naturalezas
mezcladas en la raíz:

- **Método agnóstico** (no sabe nada de ningún harness): `templates/`,
  `scripts/*.mjs` (máquina de estados en `estado.mjs`, `scaffold.mjs`,
  `tablero.mjs`, `valida.mjs`, `informe-qa.mjs`), `lib/frontmatter.mjs`,
  `roles/es/*.md` (la prosa = system prompts de los roles) y su suite de
  `tests/` (node:test).
- **Empaque específico de Claude Code**: `.claude-plugin/plugin.json` +
  `marketplace.json`, `agents/*.md`, `skills/*/SKILL.md`, `commands/*.md`,
  `hooks/hooks.json` + `hooks/*.mjs`.

EPIC-001 quiere correr el mismo método también en Kimi Code (harness #2, de la
misma familia) y dejar la puerta abierta a Gemini CLI / opencode / Cursor /
Codex sin construirlos. La pregunta estructural que hay que fijar ANTES de mover
un solo fichero es: **¿un mono-repo con un núcleo agnóstico y una capa de
adaptadores por harness, o un repo por harness? Y si es mono-repo, ¿cómo obtiene
cada adaptador el núcleo sin duplicarlo en git y sin romper la instalación?**

Datos de encaje relevantes para la decisión:

- El grafo de dependencias hoy ya apunta en la dirección correcta: `lib/` es
  hoja pura; `scripts/` solo importan `node:*`, `../lib/frontmatter.mjs` y entre
  sí (`valida`→`estado`); **ningún fichero del método importa nada de
  `hooks/`, `agents/`, `skills/`, `commands/` ni `.claude-plugin/`**. El
  acoplamiento existente va siempre adaptador→núcleo, nunca al revés.
- El delta por harness es fino: agents, config de hooks, manifiesto de plugin y
  commands. La lógica pesada (scripts, máquina de estados, plantillas, prosa de
  roles) es común.
- El lema del producto es "una sola fuente de verdad". Distribuir el método como
  dos repos que se copian es la negación directa de ese lema.
- **Restricciones DURAS del empaquetado de plugins de Claude Code (doc oficial,
  verificadas en el gate del 2026-07-20)**:
  - Al instalar, Claude Code copia **solo el directorio del plugin** a
    `~/.claude/plugins/cache/{marketplace}/{plugin}/{version}/`. Los directorios
    hermanos del plugin **no** se copian.
  - `${CLAUDE_PLUGIN_ROOT}` es ese directorio del plugin en la cache, **no** el
    repo.
  - Doc literal: *"plugins can't reference files outside their directory using
    paths like `../shared-utils`, because those files won't be copied."* Y:
    *"Don't use `../` to reference paths outside the marketplace root."*
  - Conclusión: cualquier referencia del adaptador al núcleo que **escape** el
    plugin root (p. ej. `${CLAUDE_PLUGIN_ROOT}/../../core/…`) apunta a ficheros
    que no existen tras instalar. El núcleo debe quedar **dentro** del plugin
    root en el artefacto instalable.
  - El único mecanismo documentado para compartir código del repo es un
    **symlink dentro del plugin** (al copiar a cache se dereferencia y copia el
    contenido). Es un mecanismo de *bundling*, no de referencia in situ — y en un
    repo que se dogfoodea en **Windows**, los symlinks en git son fricción real.

## Decisión

**Mono-repo con núcleo agnóstico (`core/`) + capa de adaptadores simétrica
(`adapters/<harness>/`, todos los harnesses incluido Claude Code, ninguno en la
raíz), y un PASO DE BUILD explícito que empaqueta el núcleo DENTRO de cada
adaptador instalable, de modo que en el artefacto el núcleo se resuelva como una
ruta interna al plugin root.**

1. **Núcleo (única fuente en git)**: `core/lib/`, `core/scripts/`,
   `core/templates/`, `core/roles/`, `core/tests/`. Es la ÚNICA copia versionada
   del método.
2. **Adaptadores (fuente en git, simétricos)**: `adapters/<harness>/` con la
   superficie del harness (agents, `.claude-plugin/plugin.json`, skills,
   commands, hooks y los tests de esas piezas). Claude Code es
   `adapters/claude-code/`. Ningún adaptador vive en la raíz.
3. **Regla de dependencia (invariante duro, CE-1)**: ningún fichero bajo `core/`
   importa, referencia ni resuelve una ruta que escape de `core/`; solo depende
   de `node:*` y de otros ficheros de `core/`. La única dirección permitida es
   adaptador→núcleo. Se guarda con un check de CI (análisis de imports/rutas, no
   grep de cadenas).
4. **Fuente única de prosa de roles (CE-3)**: `core/roles/<idioma>/<rol>.md` es
   la única fuente del cuerpo del system prompt. Los agents lo **referencian**
   (no lo copian); tras el build la referencia es una ruta interna al plugin
   root (`${CLAUDE_PLUGIN_ROOT}/core/roles/<idioma>/<rol>.md`).
5. **Paso de build/empaquetado (mecanismo por el que el adaptador obtiene el
   núcleo)**:
   - Un script Node **cross-platform y determinista** (`tools/build-adapter.mjs`,
     a nivel de repo — ni núcleo ni adaptador; el ensamblador puede conocer ambos
     sin violar CE-1, cuyo check solo vigila `core/`) ensambla cada adaptador
     instalable copiando la superficie de `adapters/<harness>/` y el contenido de
     `core/` a un directorio de salida.
   - **Salida**: `dist/<harness>/` (p. ej. `dist/claude-code/`), con el núcleo
     bajo `dist/<harness>/core/`. Es un plugin **autocontenido**: todo lo que
     necesita está bajo su propia raíz.
   - **INVARIANTE de fuente única (CE-1/CE-3)**: `dist/` está **gitignored**;
     `core/` sigue siendo la única copia de núcleo versionada. La copia dentro
     del adaptador es artefacto de build, jamás se comitea. Nada de duplicar el
     núcleo en el árbol de git; nada de symlinks.
   - **Referencias adaptador→núcleo, resueltas dentro del plugin root**: la prosa
     de los agents usa `${CLAUDE_PLUGIN_ROOT}/core/…` (sin `../`); los imports
     ESM de los hooks hacia el núcleo resuelven a una ruta **interna** al plugin
     root (`./core/…` o `../core/…` según la profundidad del fichero dentro del
     plugin), que NO escapa la raíz — a diferencia del `../../core` refutado, que
     apuntaba a un hermano no copiado.
   - **Descubrimiento**: `.claude-plugin/marketplace.json` permanece en la raíz
     (índice/escaparate repo-level, no pieza de adaptador) con
     `plugins[].source: "./dist/claude-code"` — apunta al **output del build**.
     Instalar = build → añadir el marketplace local → Claude Code copia el subtree
     autocontenido de `dist/claude-code/` a cache.
6. **Simetría**: el MISMO mecanismo (build → `dist/<harness>/` autocontenido)
   sirve a Claude Code y a todos los adaptadores no-anfitriones (Kimi y
   siguientes). CE-5 = "crear `adapters/<harness>/` + entrada en el marketplace";
   la ruta-forma es idéntica para todos.

La materialización concreta (qué se mueve, qué rutas se reescriben, el script de
build, los checks de CI, la verificación de instalabilidad del artefacto
construido y el flujo de dogfooding) la especifica y verifica SPEC-001; este ADR
fija la forma, la regla de dependencia y el mecanismo de empaquetado.

## Consecuencias
### Positivas
- **Sin drift del núcleo**: una sola copia versionada del método; la que viaja en
  cada plugin es artefacto de build. Coherente con "una sola fuente de verdad".
- **Instalable de verdad**: el artículo instalable es autocontenido, así que
  respeta la restricción dura de Claude Code (todo bajo el plugin root); no
  depende de hermanos no copiados.
- **Simetría real (CE-5 limpio)**: mismo mecanismo para todo harness; ninguno
  privilegiado.
- **CE-1 / CE-3 comprobables**: regla de dependencia como check de CI, y "sin
  copia de núcleo comiteada fuera de `core/`" como invariante verificable.
### Negativas / follow-ups
- **El build es paso OBLIGATORIO para instalar/dogfoodear**: ya no basta con
  "apuntar al repo". Sin build no hay artefacto instalable. Coste operativo: un
  paso de empaquetado en el flujo de desarrollo y de release, y un modo de
  recarga tras rebuild para el dogfooding.
- **`dist/` gitignored ⇒ no hay instalable en un clone fresco** hasta construir.
  La distribución vía registro/git del artefacto ya construido (si se quisiera)
  es trabajo aparte, fuera de esta épica.
- **`.claude-plugin/marketplace.json` permanece en la raíz**: fichero repo-level
  (escaparate), no de adaptador. Excepción consciente, no asimetría de adaptador.
- **Tests del adaptador dependen del build**: como el núcleo se resuelve por ruta
  interna del artefacto, los tests de las piezas del adaptador (p. ej. hooks) se
  ejercen contra el adaptador **construido** en `dist/`, no contra la fuente
  suelta. Los tests del núcleo siguen corriendo directos sobre `core/`.

## Alternativas consideradas
- **Referencia por ruta relativa `${CLAUDE_PLUGIN_ROOT}/../../core` (Opción "A"
  previa)**. **REFUTADA** por la doc oficial de Claude Code (ver Contexto): al
  instalar solo se copia el directorio del plugin; los hermanos (incl. `core/`)
  no se copian, y la doc prohíbe explícitamente `../` fuera del plugin/marketplace
  root. La "suposición de carga" (el instalador materializa el repo completo) es
  falsa. No instala.
- **Symlink del núcleo dentro del plugin (dereferenciado al copiar a cache)**.
  Documentado por Claude Code, pero **descartado**: los symlinks en git son
  fricción real en Windows (este repo se dogfoodea en Windows: creación,
  clonado, core.symlinks, permisos), y el mismo efecto de bundling se obtiene con
  un paso de build cross-platform sin symlinks. Menos portátil, más frágil.
- **Adaptador anfitrión asimétrico (Claude Code en la raíz, resto bajo
  `adapters/`)**. Rechazada por el gate humano (2026-07-20): privilegia a Claude
  Code y rompe la simetría que hace de CE-5 una lista de piezas idéntica para
  todo harness; su única ventaja (evitar churn de rutas y el build) no compensa
  la deuda estructural, y además el build acaba siendo necesario igualmente para
  los adaptadores no-anfitriones.
- **Repo por harness (copia del método por repo)**. Rechazada: produce N copias
  del núcleo que divergen (drift) —lo que EPIC-001 nace para evitar—, contradice
  "una sola fuente de verdad" y no da punto único donde CI guarde la regla de
  dependencia.
- **Núcleo como paquete npm versionado consumido por los adaptadores**. Rechazada
  para esta épica: introduce ciclo de publicación/semver entre núcleo y
  adaptadores, peso operativo desproporcionado para un repo pequeño en dogfooding
  y separa lo que aún cambia a la vez. Posible evolución con ≥3 adaptadores
  estables; hoy, prematuro.

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
