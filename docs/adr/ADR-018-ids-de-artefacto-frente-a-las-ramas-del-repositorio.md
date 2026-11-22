---
id: ADR-018
tipo: adr
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-10-27, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-10-27, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# ADR-018: Ids de artefacto frente a las ramas del repositorio

- Deciders: propone sdd-arquitecto; aprueba Alberto Fojo (pendiente, gate humano de
  SPEC-028). Lo pidió Alberto Fojo el 2026-10-27.
- Specs relacionadas: **SPEC-028** (EPIC-FIX) lo materializa.
  - Respeta **ADR-004**: el núcleo es agnóstico al harness. Git no es un harness, pero el
    núcleo tiene que funcionar sin él.
  - Respeta **ADR-015**: la barrera de `.sdd.json` va antes que esto.
  - **No supersede** ningún ADR (RN-04).

## Contexto

`scaffold.mjs` asigna el siguiente id (`nextId`) mirando solo el árbol `docs/` del disco:
el máximo existente más uno. No sabe nada de git.

El 2026-10-26 el orquestador creó una épica, un ADR y specs desde un `main` local que iba
10 días por detrás de `origin/main`. scaffold dio ids que ya existían en remoto (EPIC-006,
SPEC-019, SPEC-020 y ADR-013), y la implementación se hizo sobre un núcleo viejo. Hubo
que renumerar y reverificar: es el origen de ADR-016, SPEC-025 y SPEC-026.

El mismo día apareció la segunda forma del problema. Con `origin/main` al día, scaffold
sigue dando SPEC-025 y ADR-016, que están reservados en una rama sin mergear
(`ft/SPEC-025-…`).

Son dos causas distintas:
1. **Base local desactualizada**: el id ya está en la rama por defecto del remoto. El id
   es el síntoma; el daño de verdad es trabajar sobre un núcleo viejo.
2. **Reserva concurrente**: el id está en otra rama, remota o local, que aún no se ha
   mergeado. Nadie se ha equivocado: hay trabajo en paralelo.

Restricciones:
- el núcleo debe funcionar fuera de git, sin remoto y sin red (ADR-004);
- cero dependencias;
- la numeración la hace el script, nunca el LLM (comentario de cabecera de
  `scaffold.mjs`).

## Decisión

### 1. Dos capas, como el resto del método

- **Prosa**: el rol `sdd-orquestador` hace `git fetch` y comprueba que la rama por
  defecto local está al día antes de leer estado o crear artefactos. Crea las ramas
  `ft/SPEC-NNN-slug` desde `origin/<rama por defecto>`. Es la única capa que puede
  refrescar los refs, porque hace falta red.
- **Mecánica**: `scaffold.mjs` consulta los refs que git ya tiene en local antes de
  asignar un id. **Nunca contacta con el remoto** (ni `fetch` ni `ls-remote`), así que
  funciona sin red. Ve los refs tal como quedaron en el último `fetch`, y por eso la capa
  de prosa sigue haciendo falta.

### 2. Política de scaffold ante cada causa

Se calcula el id candidato como hoy y se compara con los ids de los refs:
- **Causa 1 (el candidato existe en la rama por defecto del remoto): se niega.**
  - Sale con código distinto de 0 y no crea nada.
  - El mensaje nombra el id, el ref y la ruta del artefacto en ese ref.
  - Dice que la base local va por detrás y que hay que actualizarla (o rebasar la rama
    sobre ella) antes de crear artefactos.
  - Saltar el id escondería el problema real, que es el núcleo viejo.
- **Causa 2 (el candidato solo existe en otras ramas): lo salta.**
  - Asigna el primer id libre en el árbol local y en todos los refs consultados.
  - Escribe en `stderr` qué ids se saltó y qué refs los reservan, y sale con 0.
  - Negarse no tendría salida sin numerar a mano, y la numeración no es del LLM. Saltar
    es la respuesta correcta a una reserva legítima.

Los ids fijos de las épicas bucket (`--id EPIC-FIX`, etc.) no se numeran y no se
comprueban: compartirlos entre ramas es lo esperado.

### 3. Qué refs y cómo se consultan

- **Rama por defecto**: la que apunta `refs/remotes/origin/HEAD`. Si no existe ese ref
  simbólico, `origin/main` y después `origin/master`. Si no hay ninguno, la causa 1 no se
  evalúa.
- **Otras ramas**: todos los refs bajo `refs/remotes/` (sin los `*/HEAD`) y bajo
  `refs/heads/`, salvo la rama por defecto y la rama actual. Las ramas locales cuentan
  porque las reservas concurrentes viven a menudo en worktrees locales sin push.
- **Lectura**: solo comandos de lectura sobre la base de objetos local. Se usan
  `for-each-ref`, `symbolic-ref` y `ls-tree -r --name-only <ref> -- <prefijo de docs>`,
  con el prefijo relativo a la raíz del repo, de modo que `--dir` siga funcionando. Un
  id se reconoce con la misma expresión que usa `nextId` sobre cada segmento de la ruta.
- **Degradación**: fuera de un repo, sin binario de git, sin remotos o ante cualquier
  error de git, scaffold numera como hoy. Como mucho emite una línea en `stderr` y nunca
  falla por esto. Es la única excepción a "se niega": no saber no es motivo para
  bloquear, porque la capa de prosa existe para refrescar.

### 4. Dónde vive

- La lectura de git va en un módulo de `core/lib/` que solo importa `node:*`.
- La decisión (negarse, saltar o seguir) es una función pura exportada, que recibe los
  ids locales y los ids por ref.
- `createArtifact` mantiene su firma y su comportamiento cuando no recibe información de
  git. Así los tests unitarios de hoy no cambian, igual que con la barrera de ADR-015.
- La consulta se hace desde el bloque CLI.

## Consecuencias
### Positivas
- Se cierra el incidente del 2026-10-26 en su raíz: con el `fetch` hecho, no se puede
  crear un artefacto sobre una base vieja sin enterarse.
- Las reservas concurrentes dejan de requerir renumerar a mano o pasar `--dir` sobre un
  árbol fabricado.
- Funciona sin red y fuera de git, sin dependencias nuevas.

### Negativas / follow-ups
- **Ids quemados**: una rama abandonada que no se borra del remoto reserva sus ids para
  siempre. Deja huecos en la numeración. Se asume: los ids son baratos, y borrar ramas
  muertas es higiene del repo.
- **Refs viejos**: sin `fetch`, scaffold no ve lo que llegó al remoto después. Lo cubre
  la prosa del orquestador, no el script.
- **Coste**: un `ls-tree` por ref. Con los unos 40 refs de este repo es despreciable. Con cientos
  de ramas habría que acotar el conjunto (por ejemplo, solo `ft/*`); queda como
  follow-up si llega a notarse.
- **Rebasar no renumera**: si dos ramas reservan el mismo id antes de verse, el conflicto
  sigue saliendo en el merge. scaffold solo evita crear uno nuevo encima de algo visible.

## Alternativas consideradas
- **Solo avisar en los dos casos.** Rechazada: un aviso con código 0 lo ignoran los
  agentes. Es lo que pasó: el orquestador no comprobó nada y nada lo paró.
- **Negarse en los dos casos.** Rechazada para la causa 2: sin una forma sancionada de
  elegir otro id, empuja a numerar a mano, que es justo lo que el script prohíbe.
- **Saltar también en la causa 1.** Rechazada: el id saldría bien y la implementación
  seguiría sobre un núcleo de hace diez días, que fue el daño caro del incidente.
- **Que scaffold haga `git fetch`.** Rechazada: necesita red, puede pedir credenciales o
  colgarse, y cambia el estado del repo desde un script que solo debería crear un
  fichero.
- **Consultar solo `origin/<rama por defecto>`.** Rechazada: no ve la causa 2, que se
  dio el mismo día.
- **Añadir un `--id` libre para specs y ADR.** Rechazada: abre la numeración al LLM.

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
