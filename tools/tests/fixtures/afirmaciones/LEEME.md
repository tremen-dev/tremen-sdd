# Corpus de afirmaciones — SPEC-018 (EPIC-005)

Este corpus existe para una sola cosa: que **la spec #2 de EPIC-005 tenga RED que
ejecutar el primer día** en vez de una tabla en prosa que alguien tenga que
interpretar. Lo entrega SPEC-018, que **no** implementa el check.

Si tienes que leer prosa para saber qué espera el corpus, el corpus ha fallado.
Todo lo que espera está en `casos.json`, y **todo veredicto se deriva del árbol**:
mueve `arbol.json` y los veredictos se mueven.

## Qué hay aquí

| Fichero | Qué es |
|---|---|
| `casos.json` | Un caso por entrada: documento-ejemplo + veredicto esperado + fragmento literal que el error debe contener. Esquema del anexo B de SPEC-018. |
| `docs/*.md` | Los documentos-ejemplo, uno por caso. Fragmentos mínimos de "documento de verdad". |
| `arbol.json` | El árbol mínimo **simulado** contra el que resuelven M1, M2 y M3. Declarativo: se materializa en un temporal. |
| `lexico.json` | Los léxicos **cerrados**: volatilidad de M3, mapa sustantivo → inventario, cardinales, anclas de ruta, marcas de plantilla y universo de miembros. |
| `inventario.json` | El anexo C ejecutable: las 17 afirmaciones del inventario cerrado de EPIC-005, con su clase, su mecanismo y el caso que la demuestra. |
| `inventarios.json` | El anexo D: registro cerrado de inventarios con su resolutor y su cardinalidad **medida y fechada** contra el árbol real. |

El validador de esquema vive en `../../_corpus-afirmaciones.mjs`; el **oráculo**
—que resuelve contra el árbol— en `../../_oraculo-afirmaciones.mjs`. Sus suites:
`../../corpus-afirmaciones.test.mjs` y `../../oraculo-afirmaciones.test.mjs`.

## Cómo se ejecuta

```bash
node --test tools/tests/corpus-afirmaciones.test.mjs tools/tests/oraculo-afirmaciones.test.mjs
```

Va dentro de `npm run test:tools` y de `npm test`. El primero valida el corpus
contra su esquema, su cobertura (lista cerrada de CA-5) y la gramática del anexo B;
el segundo comprueba que **cada veredicto declarado es derivable del árbol** y
reproduce el experimento E1: tocar el árbol tiene que mover veredictos.

## Cómo lo consume la spec #2

```js
import { cargaCorpus, materializaArbol, CORPUS_DIR } from '../_corpus-afirmaciones.mjs';

const { casos, arbol, registro, lexico } = cargaCorpus();
const raiz = materializaArbol(arbol, fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-')));

for (const caso of casos) {
  const doc = path.join(CORPUS_DIR, caso.documento);
  const { ok, errores } = checkAfirmaciones(doc, raiz, { registro, lexico });  // <- lo escribe la spec #2
  assert.equal(ok, caso.veredicto === 'verde', caso.id);
  if (caso.veredicto === 'rojo') {
    assert.ok(errores.some((e) => e.includes(caso.mensaje_esperado)), caso.id);
  }
}
```

Ese bucle es el RED entero: **25 casos, 12 rojos y 13 verdes**. El día 1 falla 25
veces; el día que la spec #2 termina, pasa 25 veces. Los 13 verdes valen tanto como
los 12 rojos: son los que impiden que el check se vuelva tan estricto que obligue a
escribir prosa para el parser.

## Sobre el oráculo, y por qué NO es el check

`_oraculo-afirmaciones.mjs` resuelve inventarios y marcadores contra `arbol.json`.
Existe porque en la ronda 1 los veredictos estaban **declarados** y nadie los
comprobaba: se podía añadir un rol o quitar un adaptador y todo seguía verde.

Implementa exactamente lo que **SPEC-018 posee**: la gramática del anexo B (CA-6
dice que la spec #2 no decide sintaxis) y los resolutores del anexo D (CA-7). Lo
que **NO** hace, y sigue siendo trabajo de la spec #2:

- recorrer `docs/fundacion/**` por **autodescubrimiento** (ADR-011 §1);
- la tabla de **extras declarados** que mete `README.md` en el ámbito (§3);
- los **mensajes** que nombran fichero, enunciado y clase (RN-12);
- **declarar a quién ha mirado** en el mensaje de éxito (§6);
- el **cableado** en `tools/check.mjs` y en CI;
- ser robusto sobre Markdown arbitrario — el oráculo solo se ejerce sobre estos
  25 documentos, y es test-only por diseño.

Si la spec #2 quiere **promover** esta lógica a `tools/checks/`, es una decisión
legítima, pero es suya y va con sus propios tests: `tools/tests/` no es una
dependencia de producción. Lo que no puede hacer es importarla desde el check y
darse por satisfecha.

## Lo que este corpus fija, y no se renegocia al implementarlo

- **M1 no persigue rutas fragmento ni plantillas.** `M1-ruta-fragmento-verde` y
  `M1-plantilla-verde` son VERDES por diseño (ADR-012 §2). Un check que los ponga
  en rojo obliga a reescribir la prosa en rutas completas, que es el modo de fallo
  caro que el ADR existe para evitar.
- **Un número dentro de un identificador no es una cifra.** `RN-08`, `ADR-011`,
  `v0.5.0`, `L2` se excluyen **antes** de escanear. Sin esa exclusión el corpus
  documental entero sale rojo el primer día.
- **El marcador nombra, nunca lleva el valor.** `<!-- sdd:cifra adaptadores=3 -->`
  es ROJO: sería una segunda declaración capaz de divergir en silencio.
- **Un marcador con un inventario desconocido es ROJO**, nunca verde silencioso.
- **La exención de volatilidad es individual y con motivo.** No hay exención
  global ni por fichero.
- **Un hook es lo que declara el MANIFIESTO** (`hooks.json`, `hooks.toml`,
  `opencode.json`), no un fichero suelto en un directorio — decisión del gate del
  2026-07-29. Contar ficheros da 4 donde la prosa correcta dice tres, y da 0 para
  opencode donde el manifiesto declara 1.
- **`hoy` solo es volátil si la frase trae además un token de estado del repo**
  (ruta anclada, cifra de inventario o nombre del registro) — misma decisión del
  gate. Así «hoy instalar exige [build local]» cae y «hoy, 2026-07-29, opencode
  1.18.5» no: datar una medición es prosa honesta, no volatilidad.

## Qué NO cubre, y está declarado

- **La clase V3 (cita literal de una fuente canónica única)** no tiene casos: no
  aparece en la lista cerrada de cobertura de CA-5, y su mecanismo ya existe con
  otro nombre (`version-unica.mjs`, `descripcion-fuente-unica.mjs`).
- **Las enumeraciones sin marcar salen verdes.** Falso negativo residual que
  ADR-012 acepta a conciencia.
- **«Ningún no-miembro» solo es decidible donde hay universo declarado** en
  `lexico.json` (hoy `adaptadores` y `harnesses`). Un inventario sin universo
  comprueba solo la mitad «todos los miembros». Residual declarado.
- **Los cardinales anafóricos** («Los **tres** son fail-open») afirman una
  cardinalidad sin nombrar el inventario y M2 no puede cazarlos sin heurística
  sobre la frase, que ADR-012 rechaza.
- **La cita existente pero equivocada no la caza nadie** (`RN-08` donde va
  `RN-01`). Enumerada como residual en `inventario.json` (#13).
