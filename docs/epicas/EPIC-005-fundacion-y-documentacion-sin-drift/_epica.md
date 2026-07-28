---
id: EPIC-005
tipo: epica
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-07-28, por: sdd-producto}
  - {estado: aprobada, fecha: 2026-07-28, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# EPIC-005 — Fundacion y documentacion sin drift

## Objetivo
Que la documentación de tremen-sdd —la fundación, el glosario y la puerta de
entrada— **diga lo que el repo es**, y que dejar de decirlo vuelva a costar
trabajo en vez de pasar desapercibido.

El diagnóstico no es una intuición: es lo que destaparon EPIC-003 y EPIC-004 al
ejercerse. Hoy `README.md` presenta un solo adaptador existiendo tres, atribuye
la distribución a una épica cerrada, y habla de "6 checks" habiendo nueve;
`docs/fundacion/contexto.md` describe el enforcement duro como "aún no
implementado" desde que SPEC-002 lo implementó; y `docs/fundacion/dominio.md`
—el glosario que define los términos del método— dice que los hooks los dispara
Claude Code cuando opencode y Kimi tienen los suyos, que existen dos
adaptadores, que Kimi y opencode están "en el roadmap" estando construidos,
menciona un *Gemini CLI* que no aparece en ningún roadmap vigente, y cita RN-08
donde corresponde RN-01.

**La causa raíz, y por eso esto es una épica y no una tanda de correcciones**:
`core/` tiene diez checks vigilándolo y la fundación no tiene ninguno. El
método verifica su código con dureza y su constitución con nada. Por eso el
drift no se detecta cuando se produce, sino meses después y por casualidad —
`layout.mjs` mintió sobre su cobertura durante semanas, y la guía "Añadir un
harness" llegó a acumular tres afirmaciones falsas sobre el harness que más se
usa.

**Por qué ahora**: la documentación es lo primero que ve quien llega, y por
primera vez va a llegar gente. EPIC-004 acaba de producir una versión instalable
sin clonar el repo; el README que la acompaña dice que hay que clonarlo y
construir. Corregirlo ahora es barato; hacerlo después de que tres equipos lo
hayan leído, no.

## Criterios de éxito
<!-- Medibles. Cómo sabremos que la épica cumplió su promesa. -->
- **CE-1 (la fundación describe el as-built)**: `FOUNDATION.md`, `docs/fundacion/*`
  y `README.md` no contienen ninguna afirmación falsificable por el estado actual
  del repo. Se mide recorriendo el inventario cerrado de discrepancias conocidas
  (ver *Alcance*) y comprobando cada una contra el código, no contra el recuerdo.
- **CE-2 (el drift cuesta trabajo, no pasa desapercibido)**: existe al menos una
  verificación **automática** —check de CI, no revisión humana— que falla cuando
  la documentación afirma algo contradicho por el repo, en la clase de
  afirmaciones que sí son verificables mecánicamente (conteos, inventarios de
  ficheros y directorios, referencias cruzadas a reglas y ADRs, rutas citadas).
  Se mide introduciendo el drift a propósito y viendo el check en rojo.
- **CE-3 (la puerta de entrada refleja la instalación real)**: `README.md`
  documenta la instalación publicada de EPIC-004 —sin clonar ni construir— para
  los tres harnesses, y ninguna de sus instrucciones exige acceso al árbol de
  fuentes. Se mide ejecutando lo que el README dice, no leyéndolo.
- **CE-4 (el criterio queda escrito)**: existe una regla explícita sobre qué
  clase de afirmaciones puede contener un documento de verdad —qué se verifica,
  qué se remite a su fuente y qué no debe escribirse por ser inevitablemente
  volátil. Se mide porque una afirmación nueva del tipo prohibido se puede
  rechazar citándola.

## Alcance
- Dentro:
  - **Inventario cerrado de discrepancias conocidas**, todas localizadas con
    fichero y línea durante EPIC-003, EPIC-004 y el trabajo de SPEC-018:
    - `README.md`: un adaptador presentado donde hay tres; distribución
      atribuida a EPIC-001; "6 checks" habiendo **diez**; §Instalación
      describiendo la vía por build local.
    - `FOUNDATION.md`: el adaptador en singular; los adaptadores de opencode y
      Kimi declarados como "no se construyen ya" cuando EPIC-001 y EPIC-003
      están cerradas; "hoy instalar exige [build local]".
    - `docs/fundacion/vision.md`: "(por ahora) no resuelve la distribución para
      usuarios finales", falso desde `v0.5.0`.
    - `docs/fundacion/contexto.md`: "dos adaptadores"; enforcement duro descrito
      como pendiente cuando SPEC-002 lo cerró.
    - `docs/fundacion/dominio.md`: fila `hook` (los dispara "Claude Code" y
      "migrará a git+CI"); fila `adaptador` (faltan tres); fila `harness` (Kimi
      y opencode como roadmap, más un *Gemini CLI* inexistente); fila
      `paso de build` ("obligatorio para instalar"); fila `rutas vigiladas`
      (cita RN-08 donde va RN-01).

    > **Corregido en el gate del 2026-07-28 (Alberto Fojo).** La primera
    > redacción hablaba de "quince discrepancias" cuando la lista enumeraba
    > trece, y de "nueve checks" cuando `version-unica` ya había hecho diez al
    > entrar con SPEC-016. Se deja escrito en vez de corregirlo en silencio,
    > porque es **la propia tesis de la épica ocurriéndole a la épica**: una
    > cifra envejeció en menos de una semana dentro del documento que denuncia
    > cifras envejecidas, y nadie lo habría notado sin el trabajo de SPEC-018.
    > El inventario se amplía además con `FOUNDATION.md` y `vision.md`, que CE-1
    > nombra pero la lista original no cubría: sin esa ampliación, CE-1 era
    > inalcanzable por construcción. **CA-3 de la spec #3 cierra contra la lista
    > de arriba, no contra ningún número.**
  - **La verificación automática de CE-2**, que es la entrega de fondo de la
    épica. Su forma la decide el ADR: qué clase de afirmación se puede verificar
    y con qué mecanismo.
  - **El criterio de CE-4** sobre qué puede afirmar un documento de verdad,
    incorporado donde corresponda a la fundación.
- Fuera (aparcado a propósito, no por descuido):
  - **Los ADRs**. Un ADR registra una decisión con su fecha y su contexto: que
    ADR-002 diga "los seis checks" no es drift, es historia. Son **inmutables**
    (RN-04) y quedan explícitamente excluidos de esta limpieza, para que nadie
    los "corrija" después creyendo que se olvidaron.
  - **Specs y ledgers cerrados**: son el registro de lo que se hizo y se verificó
    en su momento. No se reescriben.
  - **`site/`**: la web es superficie de producto y tiene otro ciclo; si resulta
    tener el mismo drift, se reporta, no se arregla aquí.
  - **Reescribir la prosa de los roles** (`core/roles/`): es el método en sí, no
    su documentación. Cualquier hallazgo ahí se eleva.
  - **Traducción o multi-idioma**: sigue siendo solo `es`.
  - **Verificar afirmaciones de juicio o de intención** ("por qué se decidió",
    "conviene que"): no son falsificables mecánicamente y CE-2 no las persigue.
    Distinguirlas es justo el trabajo de CE-4.

## Specs
<!-- El estado por spec vive en el frontmatter de cada spec; el tablero agregado se regenera con /sdd-tablero (docs/tablero.md). No mantengas listas de specs a mano aquí. -->
Desglose orientativo (lo autora sdd-arquitecto, no es vinculante):

| # | Spec candidata | Entrega |
|---|---|---|
| 1 | Qué puede afirmar un documento de verdad, y cómo se verifica | ADR + la regla de CE-4: taxonomía de afirmaciones (verificable / remitida a su fuente / prohibida por volátil) y el mecanismo de verificación elegido. Precede al resto: sin criterio, la limpieza es cosmética. |
| 2 | Check de coherencia docs↔repo | La verificación automática de CE-2, cableada en `tools/check.mjs` y en CI, con su RED demostrado introduciendo drift a propósito. |
| 3 | Fundación y glosario al día | El inventario de `contexto.md` y `dominio.md` corregido, pasando el check nuevo. |
| 4 | README de la instalación real | CE-3: la puerta de entrada describe la vía publicada de EPIC-004, ejercida y no descrita. |

> **Decisión técnica pendiente de ADR (sdd-arquitecto)**: qué es verificable
> mecánicamente en prosa y cómo. Sobre la mesa, al menos: aserciones embebidas
> con marcadores que un check resuelve contra el filesystem; inventarios
> generados y comparados; validación de referencias cruzadas (`RN-NN`, `ADR-NNN`,
> `SPEC-NNN`, rutas citadas) contra los artefactos reales. El riesgo a evitar es
> un check tan rígido que obligue a escribir prosa para el parser.
>
> **Restricción heredada**: cualquier afirmación sobre un CLI externo que entre
> en la documentación se ancla con versión y fecha o se marca como hipótesis. Es
> la regla que ya rige desde EPIC-003 y esta épica debería consolidarla, no
> reinventarla.

## Riesgos
- **La limpieza se hace y el drift vuelve en dos meses.** Es el fallo por
  defecto, y el motivo de que CE-2 exista: sin verificación automática, esta
  épica se repite dentro de un año con otro nombre. Mitiga: la spec del check va
  **antes** de la spec de corrección, no después; si el orden se invierte, la
  épica ya ha fallado aunque cierre en verde.
- **El check pide más de lo que la prosa puede dar.** Un verificador demasiado
  ambicioso convierte los documentos de verdad en formularios, y la gente deja
  de escribirlos o los escribe para el parser. Mitiga: CE-4 acota primero qué
  clase de afirmación se persigue; lo no verificable se remite a su fuente y se
  deja en paz.
- **La frontera de `docs/fundacion/` fricciona con el propio trabajo.** RN-08 da
  dueño único a los documentos de verdad y `protege-verdad` los defiende: esta
  épica los toca por definición. Mitiga: ya hay precedente de cómo se hace bien
  —SPEC-016 **elevó** la redacción de RN-05 en vez de aplicarla, y el gate la
  aprobó aparte—. Ese patrón es el que se sigue.
- **Corregir un sitio destapa incoherencias en otros.** Ya pasó al acotar RN-05:
  arreglar una fila de `dominio.md` puso el fichero en contradicción consigo
  mismo y hubo que arreglar dos más. Mitiga: el inventario de arriba está
  cerrado y localizado, pero la spec debe prever el caso y decidir por adelantado
  si expande alcance o reporta.
- **Nadie nota el valor.** Esta épica no entrega funcionalidad: entrega que la
  documentación deje de mentir. Es fácil de despriorizar a mitad. Mitiga: CE-3
  sí tiene consumidor visible —el equipo que va a instalar desde el README— y es
  el que justifica el "ahora".
