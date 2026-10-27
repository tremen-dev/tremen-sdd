---
id: SPEC-028
tipo: spec
epica: EPIC-FIX
estado: borrador
aprobada-por:
historial:
  - {estado: borrador, fecha: 2026-10-27, por: sdd-arquitecto}
---
# SPEC-028 — Trabajar sobre la base remota

## Problema

El 2026-10-26 el orquestador abrió una épica, un ADR y specs, y creó una rama, desde un
`main` local que iba 10 días por detrás de `origin/main`. Pasaron dos cosas:
- `scaffold.mjs` numera solo con el árbol local, así que dio ids que ya existían en
  remoto: EPIC-006, SPEC-019, SPEC-020 y ADR-013.
- Toda una implementación se hizo sobre un núcleo viejo.

Hubo que renumerar (de ahí ADR-016, SPEC-025 y SPEC-026) y reverificar.

El 2026-10-27 apareció la otra cara del problema. Con `origin/main` al día, scaffold
vuelve a dar SPEC-025 y ADR-016, reservados en la rama sin mergear `ft/SPEC-025-…`.

Ni el rol `sdd-orquestador` (`core/roles/es/sdd-orquestador.md`) ni scaffold miran el
remoto. Esto rompe:
- RN-07 en la práctica: dos artefactos distintos con el mismo id;
- la promesa de que la numeración la hace el script y no el LLM, porque hoy evitarlo
  exige numerar a mano.

Esta spec aplica **ADR-018**.

## Usuarios / roles afectados

- **sdd-orquestador**: gana un paso de sincronización antes de leer estado o crear
  artefactos, y cambia la base de las ramas `ft/SPEC-NNN-slug`.
- **sdd-arquitecto y sdd-producto**, que llaman a scaffold: scaffold se niega o salta
  ids según ADR-018 §2.
- **Quien trabaja con varios worktrees o agentes en paralelo**: las reservas de otras
  ramas dejan de pisarse.
- **sdd-implementador y sdd-verificador**: implementan y verifican los CA en
  `ft/SPEC-028-…`.

## Criterios de aceptación

Convenciones de los tests:
- Los fixtures de git son repos temporales: un repo *bare* hace de `origin` y uno o dos
  clones lo usan. Nunca se toca el árbol real ni la red.
- Todo fixture que ejecuta el CLI de scaffold lleva `.sdd.json` en la raíz (ADR-015).
- "La rama por defecto" es la que resuelve ADR-018 §3. En los fixtures es `origin/main`,
  con `origin/HEAD` apuntando a ella salvo que el caso diga otra cosa.

### Prosa del orquestador

### CA-1 — El rol exige sincronizar antes de trabajar y ramifica desde el remoto
- **Given**: `core/roles/es/sdd-orquestador.md` tras el cambio.
- **When**: se inspecciona su texto.
- **Then**: el rol ordena, con estas condiciones:
  1. Si el proyecto es un repo git con remoto, antes de leer estado (specs, tablero,
     ids), crear artefactos o despachar a un subagente:
     - hacer `git fetch`;
     - comprobar que la rama por defecto local no va por detrás de
       `origin/<rama por defecto>` (la que apunta `origin/HEAD`).
  2. Si va por detrás, llevarla a `origin/<rama por defecto>` con fast-forward. Si no se
     puede (hay divergencia o la rama está en uso en otro worktree), PARAR y decírselo
     al humano antes de seguir.
  3. Si `git fetch` falla (sin red, sin credenciales), decírselo al humano y seguir solo
     con su OK explícito, sabiendo que la base puede estar vieja.
  4. Crear las ramas `ft/SPEC-NNN-slug` desde `origin/<rama por defecto>`, nunca desde
     el `HEAD` local, con `git switch -c ft/SPEC-NNN-slug origin/<rama por defecto>` o un
     equivalente.
  5. Incluir en el encargo al implementador y al verificador la rama y el commit base
     desde el que se creó.
  6. Fuera de git, o sin remoto, la regla no aplica, y el rol lo dice.

  Además, el rol conserva intactas:
  - la precondición de `.sdd.json` y su orden de parada (SPEC-024);
  - la prohibición de que el orquestador edite specs, código o documentos de verdad.

### CA-2 — La regla se vigila mecánicamente
- **Given**: `tools/checks/prosa-gates.mjs`, ampliado con una comprobación de la regla de
  CA-1, al estilo de `checkProsaGates` para el documentalista (ADR-012). Lo lanza
  `tools/check.mjs`.
- **When**: se ejecuta sobre el árbol real y sobre fixtures en
  `tools/tests/prosa-gates.test.mjs`.
- **Then**:
  1. Sobre el árbol real, sale con 0.
  2. Cada fixture quita del rol uno de estos marcadores, y en cada caso el check sale con
     código distinto de 0 y nombra el marcador que falta:
     - la orden de `git fetch` antes de leer estado o crear artefactos;
     - la comprobación de la rama por defecto frente a `origin/`;
     - la parada ante divergencia;
     - la creación de `ft/SPEC-NNN` desde `origin/<rama por defecto>`.
  3. `checkPrecondicionSdd`, `descripcion-fuente-unica`, `roles-fuente-unica` y
     `nucleo-agnostico` siguen en verde.
  4. `core/roles/es/_descripciones.json` no cambia (`git diff` vacío): la regla es del
     cuerpo del rol, no de su `description` de disparo (RN-11).

### Barrera mecánica en scaffold

### CA-3 — scaffold se niega si el id existe en la rama por defecto del remoto
- **Given**: un `origin` con los commits SPEC-001, SPEC-002 y SPEC-003 (más una épica y
  un ADR-001 y ADR-002) en `main`. Un clon que ha hecho `fetch`, de modo que
  `origin/main` los tiene todos, pero cuyo `main` local se quedó en el primer commit
  (solo SPEC-001 y ADR-001).
- **When**: en ese clon se ejecuta el CLI de scaffold para:
  - (a) una spec;
  - (b) un ADR;
  - (c) una épica numerada, con un `origin/main` que ya tiene `EPIC-002-…`.
- **Then**: en cada caso,
  1. sale con código distinto de 0;
  2. no crea ni modifica ningún fichero (el árbol de trabajo queda igual, comprobado con
     `git status --porcelain`);
  3. `stderr` nombra el id candidato (SPEC-002, ADR-002 o EPIC-002), el ref
     (`origin/main`) y la ruta del artefacto en ese ref;
  4. `stderr` dice que la base local va por detrás y que hay que actualizarla antes de
     crear artefactos.

### CA-4 — scaffold salta los ids reservados en otras ramas
- **Given**: un clon con `main` al día con `origin/main`, que solo tiene SPEC-001.
- **When**: se ejecuta el CLI de scaffold para una spec con:
  - (a) una rama remota sin mergear `origin/ft/SPEC-002-x` que contiene SPEC-002 y
    SPEC-003;
  - (b) lo de (a), más una rama local sin push `otra` que contiene SPEC-004;
  - (c) lo de (b), con la rama actual siendo `otra`.
- **Then**:
  1. (a) crea SPEC-004.
  2. (b) crea SPEC-005.
  3. (c) crea SPEC-005, porque SPEC-004 ya está en el árbol de trabajo. La rama actual no
     cuenta como reserva ajena.
  4. En los tres casos sale con 0 y escribe en `stderr` los ids saltados y los refs que
     los reservan.
  5. Si no hay ningún id que saltar, no escribe nada en `stderr` (sin ruido).

### CA-5 — Degradación: sin git, sin remoto, sin red
- **Given**: un proyecto con `.sdd.json` y SPEC-001 en el árbol local, en estas
  situaciones (en (c) y (e), los refs remotos son los del fixture de CA-3):
  - (a) no es un repo git;
  - (b) es un repo git sin remotos;
  - (c) tiene un remoto sin `origin/HEAD`, con `origin/main`;
  - (d) tiene un remoto sin `origin/HEAD`, sin `origin/main` y sin `origin/master`, con
    una rama remota `origin/ft/SPEC-002-x` que contiene SPEC-002;
  - (e) la URL del remoto apunta a una ruta que no existe, pero los refs remotos están
    en local de un `fetch` anterior;
  - (f) git no está en el `PATH` del proceso.
- **When**: se ejecuta el CLI de scaffold para una spec.
- **Then**:
  1. (a), (b) y (f) crean la spec con la numeración local de hoy y salen con 0. Emiten
     como mucho una línea en `stderr`.
  2. (c) aplica CA-3 contra `origin/main`.
  3. (d) no evalúa CA-3 y aplica CA-4: crea SPEC-003.
  4. (e) aplica CA-3 y CA-4 contra los refs locales y termina sin intentar contactar con
     el remoto. Con la URL rota, cualquier intento haría fallar o colgarse el proceso.
  5. Se mantiene la barrera de ADR-015: sin `.sdd.json`, scaffold se para antes de
     consultar git.

### CA-6 — API pura y casos sin numeración
- **Given**: `core/scripts/scaffold.mjs` y `core/tests/scaffold.test.mjs`.
- **When**: se ejecutan los tests del núcleo, y el CLI con `--id EPIC-FIX` en un fixture
  cuyo `origin/main` ya tiene `docs/epicas/EPIC-FIX/`.
- **Then**:
  1. Los tests existentes de `nextId` y `createArtifact` pasan sin cambiar sus
     aserciones. `createArtifact` sin información de git se comporta como hoy.
  2. La función de decisión de ADR-018 §4 (negarse, saltar o seguir) se exporta y tiene
     tests unitarios sin git. Recibe los ids locales y los ids por ref, y cubre los
     casos de CA-3 y CA-4.
  3. `--id EPIC-FIX` no se compara contra los refs y se comporta como hoy.
  4. El módulo que lee git solo importa `node:*` (`nucleo-aislado` en verde).

### CA-7 — Mensajes y sin regresión
- **Given**: el árbol tras el cambio.
- **When**: se ejecutan `npm test` y `npm run check`.
- **Then**:
  1. Los dos pasan en verde.
  2. Los mensajes nuevos de scaffold (negativa de CA-3, aviso de CA-4, nota de CA-5)
     viven en el catálogo de mensajes del núcleo si SPEC-025 ya está en `main`, y no
     como literales sueltos.

## Entidades y reglas afectadas

- **RN-02**: la lectura de git vive en `core/lib/` y solo usa `node:*`.
- **RN-03**: la barrera de scaffold no depende del harness.
- **RN-06**: la regla nueva vive solo en el cuerpo de `core/roles/es/sdd-orquestador.md`.
  Los bootstraps de los adaptadores no la copian.
- **RN-07**: se evita que dos artefactos distintos compartan id.
- **RN-09**: la spec y ADR-018 quedan en `borrador`.
- **RN-10**: `core/scripts/` y `core/lib/` son rutas vigiladas, así que el trabajo va en
  `ft/SPEC-028-…`.
- **RN-11**: `_descripciones.json` no se toca (CA-2.4).
- **ADR-004** (núcleo agnóstico), **ADR-012** (verificabilidad de la prosa), **ADR-015**
  (barrera de `.sdd.json`, que va antes), **ADR-018** (esta decisión).
- Términos de `docs/fundacion/dominio.md`: núcleo, rol, gate, adaptador.

## Fuera de alcance

- **Que scaffold haga `fetch` o hable con el remoto**: rechazado en ADR-018.
- **Renumerar al rebasar** cuando dos ramas reservan el mismo id antes de verse. El
  conflicto sigue saliendo en el merge.
- **Aplicar la regla de sincronización a otros roles**. El arquitecto y el producto
  quedan cubiertos por la barrera de scaffold. El implementador trabaja en la rama que
  le da el orquestador.
- **Borrar o archivar ramas remotas muertas** que queman ids (ADR-018, follow-ups).
- **Acotar el conjunto de refs consultados** por rendimiento: solo si llega a notarse.

## Notas para el gate humano

1. **Orden respecto a SPEC-025 y SPEC-026**:
   - **Va después de SPEC-025** (dependencia dura): los mensajes nuevos de scaffold
     entran en el catálogo que crea SPEC-025.
   - **Conviene que vaya después de SPEC-026** (dependencia blanda): las dos tocan
     `tools/checks/prosa-gates.mjs`, que SPEC-026 vuelve por idioma. Si en `main` ya
     hay otro idioma con roles sellados, el cambio del rol se propaga o se resella según
     la regla de SPEC-026.
   - Con SPEC-027 no hay conflicto: tocan ficheros distintos y pueden ir en cualquier
     orden.
2. **Decisión a mirar con lupa, negarse o saltar** (ADR-018 §2):
   - si el id está en la rama por defecto, scaffold se niega, porque el problema real es
     la base vieja;
   - si solo está en otras ramas, lo salta y avisa, porque es una reserva legítima.

   La petición planteaba avisar o negarse. Saltar es una tercera opción, y la elegí
   porque negarse ahí empujaría a numerar a mano.
3. **Las ramas locales cuentan como reservas** (ADR-018 §3), no solo las remotas. El
   caso del 2026-10-27, con `ft/SPEC-025-…` en otro worktree, lo necesita.
4. **Ids quemados**: una rama remota abandonada reserva sus ids para siempre. Esto ya
   pasa hoy con `origin/ft/SPEC-019-…`, pero sus ids están por debajo del máximo de
   `main` y no molestan.
5. **CA-1.3, seguir sin red con OK del humano**: ¿lo quieres así, o prefieres que el
   orquestador siga sin preguntar y solo lo diga en su informe?
