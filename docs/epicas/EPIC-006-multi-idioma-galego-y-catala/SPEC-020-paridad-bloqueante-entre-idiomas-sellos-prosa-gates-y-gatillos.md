---
id: SPEC-020
tipo: spec
epica: EPIC-006
estado: aprobada
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-10-26, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-10-27, por: Alberto Fojo}
---
# SPEC-020 — Paridad bloqueante entre idiomas: sellos, prosa-gates y gatillos

## Problema

Tras SPEC-019 ya hay dónde poner una traducción, pero nada impide que se desalinee. Si
en `es` se corrige un rol y en `gl` no, todo sigue en verde. Lo mismo si una traducción
convierte `` `borrador` `` en `` `rascuño` `` y rompe el contrato con los scripts. Y
`prosa-gates` verifica con expresiones regulares en castellano la regla de seguridad del
documentalista, así que en otro idioma esa garantía desaparece sin avisar. El humano
decidió en el gate de EPIC-006 que la paridad **la bloquea CI**, no que solo avise.

Esta spec implementa ADR-013 §3 y §5:
- el check de paridad, que exige inventario, invariantes estructurales y sello de origen;
- el script de resellado explícito;
- `prosa-gates` por idioma;
- los gatillos de la description declarados como dato.

Cubre **CE-3 en la parte que se puede demostrar con fixtures**. El RED sobre un PR real
necesita un segundo idioma en el árbol y se cierra en la spec de contenido gl. Incluye
además la **prueba anticipada de CE-2**: añadir un idioma no toca lógica. **No traduce
nada.**

Reglas citadas:
- **RN-01 y RN-10**: el trabajo va en una rama `ft/SPEC-020-…`.
- **RN-03**: el check corre en pre-commit y en CI sin harness.
- **RN-06**: el cuerpo de cada rol sigue teniendo una fuente única por idioma.
- **RN-11**: la canónica de la description queda intacta.

## Usuarios / roles afectados

- **Quien cambia prosa `es`** (cualquier rol, cualquier spec futura): en cuanto exista
  otro idioma, su PR saldrá en rojo hasta que propague el cambio o vuelva a sellar.
- **sdd-implementador de las specs de contenido gl y ca**: trabaja contra este check.
  Los sellos y las invariantes son su definición de "terminado".
- **sdd-verificador**: gana un check citable para la paridad.

## Criterios de aceptación

Convenciones de los tests:
- Se usan las de SPEC-019 (fixture `zz` en un árbol temporal, nunca en el árbol real).
- La fixture `zz` **alineada y sellada** es una copia de cada conjunto `es` con la prosa
  marcada fuera de las invariantes, más su `_sellos.json` generado con el script de
  resellado.

### Check de paridad (CE-3, ADR-013 §5)

- **CA-1 — Inventario.** Dada la fixture `zz` alineada y sellada, el check pasa. A partir
  de ella, se aplica por separado cada una de estas mutaciones:
  - (a) borrar un rol;
  - (b) borrar una plantilla de `artefactos/`;
  - (c) añadir un fichero que no existe en `es`;
  - (d) borrar una clave del catálogo del núcleo;
  - (e) vaciar el valor de una clave en el catálogo de un adaptador;
  - (f) borrar el `_sellos.json`.

  En cada caso, el check sale con código distinto de 0 y el mensaje nombra idioma, raíz
  y fichero o clave. Que `_descripciones.json` exista solo en `es` y `_sellos.json`
  solo en `zz` no produce error.
- **CA-2 — Invariantes estructurales.** Dada la fixture `zz` alineada y sellada, se
  aplica por separado cada mutación sobre el lado `zz`. El check sale en rojo y nombra
  el fichero y la clase de invariante. Las mutaciones son:
  - (a) quitar un encabezado de un rol o cambiar su nivel;
  - (b) traducir un identificador entre backticks (`` `borrador` `` → `` `rascuño` ``);
  - (c) cambiar una línea dentro de un bloque de código cercado;
  - (d) borrar un `{{ID}}` de una plantilla;
  - (e) alterar un carácter del frontmatter de una plantilla;
  - (f) cambiar `SPEC-NNN` o `RN-01` en la prosa por otro identificador;
  - (g) cambiar el destino de un enlace;
  - (h) renombrar una `{variable}` en una clave de catálogo;
  - (i) traducir un token de ruta o un flag dentro de un mensaje (`--por`,
    `scripts/estado.mjs`).

  **Control negativo:** traducir el contenido de un placeholder descriptivo
  (`"<título>"` → `"<títol>"`), o cualquier prosa fuera de las invariantes, deja el
  check en **verde**.
- **CA-3 — Sello de origen.** Dada la fixture `zz` alineada y sellada:
  - (a) si se cambia una frase de un rol en `es`, el check sale en rojo y nombra el
    idioma, el fichero y el encabezado `es` de la sección cambiada;
  - (b) si se cambia el valor `es` de una clave de catálogo, sale en rojo y nombra la
    clave;
  - (c) si el script de resellado de `tools/` se ejecuta con idioma y fichero (o clave)
    explícitos, solo cambia esa entrada de `_sellos.json` y el check vuelve a verde;
  - (d) si el script se ejecuta sin un objetivo explícito, o con un comodín de "todo",
    se niega con código distinto de 0 y no escribe nada;
  - (e) un fichero `es` que solo cambia los saltos de línea (CRLF en lugar de LF) no
    rompe el sello.

### Verificaciones que dependen del idioma (ADR-013 §3 y §5)

- **CA-4 — `prosa-gates` por idioma.** Dado el árbol tras el cambio:
  - Los patrones de `prosa-gates` viven en `core/roles/es/_prosa-gates.json`, con los
    mismos tres ids de regla de hoy.
  - El check pasa sobre el árbol real, y `tools/tests/prosa-gates.test.mjs` no pierde
    ninguna aserción.

  Con la fixture `zz`, el check sale en rojo y nombra el idioma en cada uno de estos
  casos:
  - (a) falta `_prosa-gates.json`;
  - (b) falta un id de regla;
  - (c) un patrón no casa con `core/roles/zz/sdd-documentalista.md`.
- **CA-5 — Gatillos de la description.** Dado el árbol tras el cambio:
  - Existe `core/roles/es/_gatillos.json`, con una lista no vacía de frases para cada
    rol de `core/roles/es/`.
  - Cada frase aparece literalmente en la `larga` de su rol en `_descripciones.json`.
  - Las formas `larga` y `corta` canónicas y sus copias de adaptador no cambian en esta
    spec, y `descripcion-fuente-unica` sigue en verde.

  Con la fixture `zz`, el check sale en rojo si a `zz` le falta un rol en
  `_gatillos.json`, o si un gatillo `zz` no aparece en la `larga` canónica.

### Cableado, CE-2 y no regresión

- **CA-6 — Cableado, verde no anónimo y CI.** Dado el árbol real, que solo tiene `es`:
  - Al ejecutar `npm run check`, el paso de paridad está en `PASOS` y pasa.
  - Su mensaje de éxito dice qué idiomas comparó (ninguno aparte de `es`) y qué raíces
    recorrió.
  - El pre-commit L2 y el workflow de CI lo ejecutan, igual que el resto de `PASOS`.
  - El ledger recoge el id de una ejecución real de CI en verde sobre la rama.
- **CA-7 — Añadir un idioma no toca lógica (CE-2 anticipado).** Se parte de una copia
  temporal del repo y se añade la fixture `zz` **solo** bajo rutas de conjunto de
  idioma: `core/roles/zz/`, `core/templates/zz/`, `core/mensajes/zz/` y
  `adapters/*/mensajes/zz/`. Los gatillos `zz` se eligen entre frases que ya están en
  las `larga` actuales. Entonces:
  - todos los pasos de `tools/check.mjs` y la suite completa pasan;
  - un proyecto con `"idioma": "zz"` resuelve a `zz`, y `valida.mjs` lo acepta;
  - el test comprueba que las rutas añadidas o modificadas en la copia son un
    subconjunto de esas rutas.
- **CA-8 — Sin regresión ni contenido.** Dado el árbol tras el cambio:
  - `npm test` y `npm run check` pasan;
  - `package.json` no gana dependencias;
  - no existe ningún directorio `gl/` ni `ca/` bajo `core/` ni bajo `adapters/`.

## Entidades y reglas afectadas

- **ADR-013**: esta spec implementa §3 (gatillos) y §5 (paridad y `prosa-gates`).
- **ADR-005 / RN-11**: la canónica sigue en `core/roles/es/_descripciones.json`. Los
  gatillos son un dato nuevo que la complementa; no la sustituye.
- **ADR-011**: las raíces del núcleo se enumeran y las de adaptador se autodescubren; el
  verde dice qué miró; el check no se ablanda.
- **ADR-012**: los marcadores `<!-- sdd:… -->` son invariante de paridad.
- Términos de `docs/fundacion/dominio.md`: rol, fuente única, hook, adaptador. Los
  términos nuevos van en el Anexo B.

## Dependencias y coordinación

- **Depende de SPEC-019.** Necesita el formato de catálogo, la disposición de conjuntos
  (`core/templates/<idioma>/`, `core/mensajes/<idioma>/`, `adapters/*/mensajes/<idioma>/`),
  la función de idiomas soportados y el rechazo de `valida.mjs` ante un idioma no
  soportado (en CA-7). La spec puede aprobarse en paralelo, pero no pasa a `en-progreso`
  hasta que SPEC-019 esté en `hecho`.
- **`tools/check.mjs` (`PASOS`)**: la spec #2 de EPIC-005 también añade un paso. Es un
  conflicto de merge trivial, y lo resuelve quien llegue segundo.
- **Documentos de verdad**: esta spec no los toca. La RN y los términos del Anexo se
  proponen y no se aplican.

## Fuera de alcance

- Cualquier contenido gl o ca, incluida la tabla de terminología.
- El RED de CE-3 sobre un PR real: lo hace la spec de contenido gl.
- Exenciones a las invariantes: en la primera versión no hay ninguna (ADR-013,
  Consecuencias).
- Localizar las descriptions más allá de los gatillos (ADR-013 §3, aceptado en el gate).

## Notas para el gate humano

1. Esta spec hará rojo cualquier PR que toque prosa `es` **en cuanto exista gl**. Con
   solo `es` no cambia nada.
2. El sello certifica que alguien declaró la traducción al día, no que lo esté. El
   resellado es explícito y fichero a fichero, y queda visible en el diff. Contra un
   resellado sin traducir, la defensa es la revisión humana (CE-5).
3. El desglose del resto de la épica está en ADR-013 §7.

## Anexo A — RN propuesta (texto para el gate; NO se aplica sin firma)

> **RN-NN — Los idiomas del método están alineados con el origen `es`.**
>
> Todo idioma soportado (aquel para el que existe `core/roles/<idioma>/`) cumple, en
> cada raíz traducible (`core/roles/`, `core/templates/`, `core/mensajes/`,
> `adapters/<harness>/mensajes/`), tres condiciones:
> - el mismo inventario que `es`;
> - las mismas invariantes estructurales: identificadores, código, placeholders,
>   frontmatter de plantilla y marcadores;
> - un sello de origen que casa con el contenido `es` actual.
>
> Los identificadores del método no se traducen: estados, campos del frontmatter,
> prefijos de id, nombres `sdd-*`, disposición de ficheros, rama y flags.
>
> Verificable: el check de paridad falla nombrando idioma, raíz y fichero o clave.
> Fijada por ADR-013.

Numeración: el siguiente RN libre después de la RN-12 de SPEC-018.

## Anexo B — Términos nuevos para `docs/fundacion/dominio.md` (propuesta)

| Término | Definición | Notas |
|---|---|---|
| **idioma soportado** | Idioma para el que existe `core/roles/<idioma>/`. `es` es el origen. | Se resuelve por proyecto a partir de `.sdd.json.idioma`; si falta, `es`. Si el valor no está soportado, los hooks caen a `es` y `valida.mjs` falla. |
| **conjunto de idioma** | Directorio `<raíz>/<idioma>/` de una raíz traducible. | Raíces: `core/roles/`, `core/templates/`, `core/mensajes/`, `adapters/<harness>/mensajes/`. |
| **catálogo de mensajes** | `mensajes.json` de un conjunto: clave → plantilla con `{variables}`. | Lo usan los scripts del núcleo y los hooks. Nunca `${…}`. |
| **sello de origen** | `_sellos.json` de un conjunto que no es `es`: hash del contenido `es` del que se tradujo cada fichero o clave. | Se resella de forma explícita, fichero a fichero, y queda en el diff. |
