---
id: ADR-016
tipo: adr
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-10-27, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-10-27, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# ADR-016: Multi-idioma del metodo: resolucion por proyecto, catalogos, identificadores fijos y paridad sellada

- **Procedencia (renumeración, 2026-10-27).** Este ADR se escribió y se aprobó como
  **ADR-013** en la rama `ft/SPEC-019-mecanismo-de-idioma-catalogos-y-plantillas-por-idioma`:
  - borrador el 2026-10-26;
  - `aprobada` por Alberto Fojo el 2026-10-27 (último estado en el commit `dc66b00`).

  La rama no llegó a mergearse. Mientras tanto, `main` asignó ADR-013 a *encaje de
  antigravity* y ocupó ADR-014 y ADR-015. Por decisión del humano (2026-10-27), se
  renumera a ADR-016 como **artefacto nuevo en `borrador`**: su contenido cambia frente a
  `main` (cuarto adaptador, raíz unificada con ADR-015), así que la aprobación anterior no
  cubre este texto. El historial del ADR-013 de la rama no se reescribe: sigue en git.
  Todo "ADR-013" que aparezca abajo es el de `main` (antigravity).
- Deciders: propone sdd-arquitecto; aprueba el humano (Alberto Fojo, pendiente de
  aprobación formal de este texto). El 2026-10-27, Alberto Fojo revisó el borrador
  anterior y fijó cinco decisiones, que este texto mantiene:
  1. acepta el recorte de §3;
  2. parte la spec en SPEC-025 y SPEC-026;
  3. el texto de FOUNDATION/vision y las dos citas de rutas de plantilla son de la
     spec #3 de EPIC-005;
  4. `valida.mjs` y `sdd-init` rechazan un `idioma` no soportado (§2);
  5. la tabla de terminología gl la firma solo él (§6, §7).

  Restricciones de partida fijadas por el humano en el gate de EPIC-007
  (2026-10-26), que este ADR no reabre: el alcance es "todo" (roles, plantillas,
  mensajes de scripts del núcleo y de los hooks de todos los adaptadores, que hoy son
  cuatro: claude-code, kimi-code, opencode y antigravity); la paridad
  es-gl-ca la **bloquea** CI; galego primero y català después como prueba de que
  añadir un idioma no toca lógica; en paralelo a EPIC-004 y EPIC-005; la calidad
  lingüística la valida Alberto Fojo.
- Specs relacionadas (EPIC-007):
  - **SPEC-025** implementa §1 y §2: mecanismo de idioma, catálogos, plantillas por
    idioma y rechazo del idioma no soportado.
  - **SPEC-026** implementa §3 y §5: check de paridad, sellos, `prosa-gates` por idioma
    y gatillos. Depende de SPEC-025.
  - Las specs de contenido gl y ca lo consumen.
  **Reinterpreta** el Alcance de `FOUNDATION.md` ("Fuera: el multi-idioma de roles
  (solo `es`)") y la línea equivalente de `docs/fundacion/vision.md`. **Complementa**
  ADR-004 (núcleo agnóstico, `${SDD_ROOT}`), ADR-005 (canónica única de la
  `description`), ADR-011 (autodescubrimiento frente a enumeración), ADR-012 (qué
  puede afirmar un documento de verdad), ADR-013 (encaje de antigravity: sus hooks son
  emisores más) y **ADR-015** (activación opt-in por `.sdd.json`). De ADR-015 toma la
  raíz del proyecto y la barrera de los CLI, y matiza un caso que ADR-015 no trata: el
  `idioma` declarado pero no soportado (§2). **No supersede** a ninguno (RN-04).

## Contexto

El método está escrito en un solo idioma por construcción, no por configuración. El
campo `idioma` de `.sdd.json` existe desde el principio, pero solo lo leen los
bootstraps de los agentes para elegir `core/roles/<idioma>/<rol>.md`, y `es` es el
único directorio que hay. Todo lo demás está en castellano sin posibilidad de
cambiarlo:

- **Mensajes del núcleo** incrustados como literales en el código: `estado.mjs`
  (transición no permitida, firma inválida, aprobación humana ausente), `valida.mjs`,
  `scaffold.mjs`, `tablero.mjs` (además, el propio tablero generado: cabecera,
  "Actualizado", "Resumen", cabeceras de tabla), `informe-qa.mjs` (incluido
  `<html lang="es">`) y `core/lib/require-spec.mjs`, cuyo `motivo` es lo que el humano
  y el agente leen cuando un hook o el pre-commit deniega. Medido el 2026-10-26: del
  orden de 45 sitios de emisión en 12 ficheros, sumando los hooks.
- **Mensajes propios de los hooks de adaptador**:
  - `protege-verdad` de Claude Code y de Kimi Code, con redacciones distintas entre sí;
  - `protege-verdad` de antigravity, que solo protege el tablero y usa el mismo texto
    que Claude Code;
  - el prefijo de `calidad` en Claude Code y en antigravity. En antigravity va a stderr
    y sale siempre con código 0.

  opencode no emite texto propio: reenvía el `motivo` del núcleo. El `require-spec` de
  los cuatro adaptadores reenvía ese mismo `motivo`.
- **La barrera fail-closed de ADR-015** (`exigirProyectoSdd` en
  `core/lib/entrypoint.mjs`) emite un mensaje propio cuando falta `.sdd.json`. Lo emite
  justo cuando no hay ningún idioma que leer.
- **Plantillas** en `core/templates/` sin dimensión de idioma: `scaffold.mjs` las lee
  de una ruta fija y `sdd-init` las copia de otra.
- **La description de disparo** (RN-11, ADR-005): canónica en
  `core/roles/es/_descripciones.json`, copiada y verificada en las superficies de los
  cuatro adaptadores. El harness la lee **literal al instalar el plugin**, una sola vez
  por máquina, no por proyecto. Un dato que conviene no perder: la forma `larga` ya es
  **bilingüe** (es + en: "write the spec", "record this decision as an ADR").
- **Checks que dependen del idioma**: `prosa-gates.mjs` verifica con expresiones
  regulares en castellano que `core/roles/es/sdd-documentalista.md` contiene la regla
  de no cerrar épicas. En otro idioma esa garantía de seguridad desaparecería sin
  ningún aviso.

Y hay contrato que **no** es texto aunque lo parezca: `TRANSITIONS` (los estados),
`FIRMANTES` (`^sdd-`, `'desconocido'`), `ID_RE` y la regex de rama `ft/SPEC-NNN` de
`require-spec`, los `TIPOS` de `scaffold.mjs`, las rutas `docs/epicas/`, `docs/adr/`,
`_epica.md` y `.ledger.md` que buscan `valida`, `tablero` y `require-spec`.

La épica pide cinco decisiones que constriñen todo el trabajo posterior: cómo
resuelven el idioma scripts y hooks, qué pasa con la description estática, qué no se
traduce, qué significa "alineado" para un check que bloquea, y qué hace la regla de
`dominio.md` en un proyecto gl o ca.

## Decisión

### 0. Reinterpretación del Alcance de FOUNDATION

El multi-idioma del método **pasa a estar dentro del alcance**: un proyecto elige un
idioma al crearse y el método entero —roles, plantillas, mensajes de scripts y hooks—
le habla en él. Los idiomas soportados los decide el contenido presente en el árbol
(punto 1). Siguen **fuera**: traducir los identificadores (punto 3), mezclar idiomas en
un proyecto, migrar el idioma de un proyecto existente y traducir los documentos de
este repo, que se gestiona en castellano.

Este ADR es la autoridad de la reinterpretación (FOUNDATION: "solo un ADR aceptado
puede reinterpretarlas").

**La edición textual** de `FOUNDATION.md` y `vision.md` la hace la **spec #3 de
EPIC-005**, con este ADR aprobado como respaldo (gate, 2026-10-27). Esas mismas frases
están en su inventario de discrepancias, y así se editan una sola vez, aplicando a la vez
este ADR y RN-12: sin "por ahora" ni "solo `es`", que son de la clase P de ADR-012.
Ninguna spec de EPIC-007 edita documentos de verdad.

### 1. Qué es un idioma soportado: conjuntos de idioma autodescubiertos

Un **conjunto de idioma** es un directorio `<raíz>/<idioma>/` bajo una raíz de contenido
traducible. Las raíces son una **lista cerrada en el núcleo** —`core/roles/`,
`core/templates/`, `core/mensajes/`— más **`adapters/<harness>/mensajes/`
autodescubierto** para cada adaptador que lo tenga (ADR-011: enumeración donde el
conjunto no se deriva sin conocer la estructura, autodescubrimiento donde sí).

- `idiomasSoportados()` = los subdirectorios de `core/roles/`. `es` es el **idioma
  origen**: no se declara en ningún sitio, es el que existe siempre.
- Un idioma está soportado cuando existe `core/roles/<idioma>/`. A partir de ese
  momento el check de paridad (punto 4) le exige el conjunto completo en todas las
  raíces. No hay idiomas "a medias" que pasen CI.
- Consecuencia de diseño buscada: **añadir un idioma es crear directorios**. Ningún
  fichero de código enumera idiomas, así que la pasada de català no tiene dónde tocar
  lógica (CE-2).
- **Las plantillas pasan a `core/templates/<idioma>/`**, y las de hoy se mueven a
  `core/templates/es/`, en simetría con `core/roles/<idioma>/`. Eso incluye
  `AGENTS.md`, la plantilla que añadió el adaptador antigravity. Se queda fuera de los
  conjuntos `core/templates/sdd.json`, que es configuración y no prosa.

### 2. (a) Cómo resuelven el idioma scripts y hooks: catálogo de mensajes con fallback a `es`

- **Resolución, una sola función del núcleo** (`core/lib/`): lee `idioma` de `.sdd.json`
  en la raíz del proyecto. Si falta el fichero, falta el campo, el JSON es ilegible o el
  valor no es un idioma soportado, devuelve `es`. Esta resolución **no avisa**: los hooks
  son fail-open y silenciosos, y un aviso en cada salida sería ruido. El idioma es **uno
  por proyecto** y vale para todo: no hay resolución por fichero ni por rol.
- **La raíz del proyecto es la de ADR-015, sin duplicarla.** La resolución del idioma
  localiza la raíz con `buscarRaizSdd` (`core/lib/entrypoint.mjs`, ADR-015 §3.1): sube
  desde la ruta objetivo y corta en `.git`. No existe una segunda búsqueda de raíz.
  - Los CLI del núcleo ya obtienen esa raíz de `exigirProyectoSdd` y se la pasan a la
    resolución.
  - Los hooks, que trabajan sobre el `cwd` del payload, usan la misma función desde ese
    `cwd`.
- **Cómo encaja con la barrera de ADR-015**, caso por caso:
  - **Sin `.sdd.json`**: los CLI se paran en la barrera antes de que el idioma importe, y
    los hooks permiten en silencio, como hoy. El mensaje de la barrera entra en el
    catálogo del núcleo, pero se emite **siempre en `es`**, porque sin `.sdd.json` no hay
    idioma que leer. Solo la API programática (los tests) llega a resolver con raíz nula,
    y obtiene `es`.
  - **`.sdd.json` sin `idioma`**: `es`. Coincide con ADR-015 §2.
  - **`idioma` no soportado**: la barrera deja pasar, porque el fichero existe. Hooks y
    scripts hablan `es` y `valida.mjs` falla (ver abajo). Este es el caso que ADR-015 no
    trata, y aquí se fija también para la prosa: los bootstraps de skills y agents de los
    cuatro adaptadores usan `es` cuando no existe `core/roles/<idioma>/`. La redacción
    debe esquivar el antipatrón que caza `checkPrecondicionSdd`: la ausencia de
    `.sdd.json` sigue siendo una parada, nunca un fallback.
  - **`.sdd.json` ilegible** (JSON corrupto): la barrera deja pasar y el resolutor da
    `es`. Pero los hooks de los cuatro adaptadores tratan un `readConfig` nulo como
    "proyecto sin SDD" y **permiten todo**, así que el proyecto se declara activo y tiene
    todos los gates L1 apagados. Es el estado más peligroso de los cuatro. Por eso
    `valida.mjs` **falla** también ante un `.sdd.json` ilegible, con un error que nombra el
    fichero y dice que los hooks lo tratan como ausente. Esto sustituye el "trátalo como
    sin fichero" de la ronda anterior (F-SPEC-019-10). Este ADR no cambia el fail-open de
    los hooks (ADR-002).
- **Un `idioma` no soportado se señala en dos sitios, y solo en esos dos** (gate,
  2026-10-27):
  - **`valida.mjs` falla**: código de salida distinto de 0, con un error que nombra el
    valor declarado y la lista de idiomas soportados. Se elige fallo y no aviso por
    estos motivos:
    - el fallback es silencioso en todos los demás sitios, así que `valida` es el único
      punto donde el error se ve;
    - un aviso con código 0 lo ignoran los agentes y la automatización, que se guían por
      el código de salida;
    - el valor nunca es legítimo, porque `sdd-init` no lo genera; solo aparece editando
      `.sdd.json` a mano, se arregla en una línea y no puede dar un falso positivo en un
      proyecto bien creado.

    El fallo vive en el CLI de `valida.mjs`, no en `validateFile`: el hook `calidad` y el
    pre-commit no cambian, y los hooks siguen sin hablar del idioma. Si falta el campo, no
    hay error (CE-4). Si falta el fichero, se aplica la barrera de ADR-015, que ya existía.
  - **`sdd-init` se niega**: ofrece como idiomas los subdirectorios de `core/roles/`, no
    acepta ni escribe otro valor, y en migración señala un `idioma` no soportado ya
    existente antes de copiar plantillas. Aplica a los tres adaptadores que tienen
    `sdd-init`: claude-code, opencode y antigravity. Kimi Code no lo tiene.
- **Catálogo por idioma**: `core/mensajes/<idioma>/mensajes.json`, un objeto plano
  `clave → plantilla`. La clave lleva el espacio del emisor (`estado.transicion-no-permitida`,
  `require-spec.rama-no-es-de-spec`, `tablero.cabecera`) y nunca nombra un harness. La
  interpolación es `{nombre}`. **No** se usa `${…}`, porque bajo `core/` está reservado a
  `${SDD_*}` y `nucleo-agnostico` lo trataría como fuga de token (ADR-004).
- **Fallback por clave**: si una clave falta en el idioma resuelto, se usa la de `es`. En
  CI eso no puede ocurrir (el check de paridad lo impide); en runtime evita que un hook
  falle por un catálogo incompleto. Una clave que no existe ni en `es` es un error de
  programación y lanza excepción (la suite lo caza).
- **Los mensajes propios de un adaptador viven en su adaptador**:
  `adapters/<harness>/mensajes/<idioma>/mensajes.json`, con el mismo formato y la misma
  función del núcleo, a la que el adaptador pasa su propio directorio (dependencia
  adaptador → núcleo, RN-02). Meterlos en el catálogo del núcleo exigiría claves por
  harness dentro de `core/`, o unificar las redacciones de `protege-verdad`, que
  cambiaría el texto de hoy (CE-4). Hoy tienen catálogo propio claude-code, kimi-code y
  antigravity. opencode no lo necesita.
- **`es` byte a byte**: el catálogo `es` reproduce **literalmente** los textos actuales.
  Extraer a catálogo es un refactor sin cambio observable para un proyecto `es` o sin
  `idioma`.
- **Lo que no entra**: los mensajes de `tools/` (runner, checks, `githooks`,
  `build-adapter`, `publica`) son utillaje de este repo, que trabaja en castellano. La
  salida de terceros (linters en `calidad`) se reenvía tal cual. El `motivo` del núcleo
  que muestra el pre-commit sí sale traducido, porque viene del catálogo.

### 3. (b) Descriptions de disparo: una canónica multilingüe por rol, no una por idioma

La description es una propiedad **del plugin instalado**, no del proyecto: el harness la
lee al instalar y es la misma para todos los proyectos de esa máquina, sean es, gl o ca.
Por eso:

- **Sigue habiendo una canónica por rol**, donde está:
  `core/roles/es/_descripciones.json` (ADR-005 y RN-11 intactos: misma ruta, mismas
  formas `larga`/`corta`, el mismo check de copias). Su prosa base sigue en castellano.
- **Se hace multilingüe en sus frases-gatillo**, siguiendo el precedente que ya existe
  con el inglés: la `larga` de cada rol incorpora frases-gatillo en cada idioma soportado
  ("fai a spec", "escriu l'spec"…).
- **Los gatillos de cada idioma se declaran como dato en su conjunto**:
  `core/roles/<idioma>/_gatillos.json` (también en `es`), con una lista no vacía de frases
  por rol. Lo que se verifica de forma mecánica: cada gatillo declarado aparece
  **literalmente** en la `larga` canónica de su rol. Añadir un idioma = su `_gatillos.json`
  + editar la `larga` + las copias de adaptador que RN-11 ya obliga a mantener iguales.
- La `corta` (blurb del mapa `subagents:` de Kimi), los **bootstraps** de agents y skills y
  la prosa de los comandos `sdd-init` **se quedan en castellano**: los lee el LLM como
  instrucciones, no le llegan al usuario como salida del método. El rol que carga el
  bootstrap sí está en el idioma del proyecto.
- **Esto rebaja el alcance de la épica, y el recorte está aceptado.** El Alcance de
  EPIC-007 dice "los 7 roles en gl/ca, *incluidas sus descriptions de disparo*". Aquí eso
  queda en "incluidos sus **gatillos**". Lo que el usuario ve en el listado de skills del
  harness sigue en castellano, más los gatillos de su idioma. La épica ya avisaba de que
  esto podía recortar CE-1.
  **Decisión aceptada por Alberto Fojo en el gate del 2026-10-27**: las descriptions no
  se localizan; solo ganan gatillos gl/ca.

### 4. (c) Los identificadores del método no se traducen: se confirma la hipótesis

Se quedan **idénticos en todos los idiomas**, como contrato de los scripts y entre
proyectos. Lista cerrada:

- **Estados** (`borrador`, `aprobada`, `en-progreso`, `en-revision`, `hecho`,
  `bloqueada`) y valores de `tipo` (`epica`, `spec`, `task`, `adr`, `ledger`).
- **Campos del frontmatter** (`id`, `tipo`, `epica`, `estado`, `aprobada-por`,
  `historial`, `fecha`, `por`).
- **Prefijos y etiquetas de identificador**: `EPIC-`, `SPEC-`, `TASK-`, `ADR-`, las
  épicas bucket, `CA-`, `CE-`, `RN-`, `D-`, `F-SPEC-`.
- **Nombres de rol** `sdd-*` y el literal `desconocido` de `estado.mjs`, que
  `FIRMANTES` interpreta.
- **Disposición de ficheros del proyecto**: `.sdd.json` con sus claves y valores,
  `FOUNDATION.md`, `CLAUDE.md`, `docs/epicas/`, `docs/adr/`, `docs/fundacion/` y sus
  cuatro nombres de fichero, `docs/roadmap.md`, `docs/tablero.md`, `_epica.md`,
  `*.ledger.md`, `_qa/`.
- **Rama** `ft/SPEC-NNN-slug`, **flags de CLI** (`--epica`, `--por`, `--dir`, `--id`),
  **nombres de script**, `${SDD_ROOT}` y los placeholders `{{…}}` de las plantillas.

En la prosa traducida estos identificadores aparecen **entre backticks y sin traducir**.
Es lo que el check de paridad compara (punto 5). Motivo: cada uno lo interpreta código
(`TRANSITIONS`, `ID_RE`, `RAMA_SPEC_RE`, `FIRMANTES`, `TIPOS`, las rutas de búsqueda).
Traducirlos exigiría ramas por idioma en esa lógica, que es justo lo que CE-2 prohíbe, y
partiría el método en dialectos que no se entienden entre proyectos.

### 5. (d) "Alineado" para el check de paridad: inventario, invariantes y sello de origen

Que existan los ficheros no basta. Un conjunto de idioma `L ≠ es` está alineado con `es`
cuando cumple **las tres** condiciones, y el check falla en cuanto una no se cumple:

1. **Inventario.** El conjunto `L` de cada raíz contiene exactamente los mismos ficheros
   que el de `es`, y cada catálogo `L` exactamente las mismas claves, ninguna vacía. Dos
   únicas exenciones, por nombre y cerradas: `_descripciones.json` (solo en `es`, punto 3)
   y `_sellos.json` (solo en `L`).
2. **Invariantes estructurales**: lo que una traducción no puede tocar, detectado por
   **sintaxis**, nunca por diccionario.
   - Markdown (roles y plantillas): misma secuencia de niveles de encabezado; el mismo
     multiconjunto de *spans* de código y de bloques cercados, donde el contenido de
     cada `<…>` se normaliza a comodín porque los placeholders descriptivos sí se
     traducen (`"<título>"` → `"<títol>"`); los mismos `{{…}}`; los mismos
     identificadores de artefacto y regla fuera del código; los mismos destinos de
     enlace; los mismos marcadores `<!-- sdd:… -->` de ADR-012. En plantillas, además,
     el frontmatter es **byte a byte idéntico**.
   - Catálogos: por cada clave, el mismo conjunto de `{variables}` y los mismos tokens
     entrecomillados o con aspecto de ruta, flag o identificador.
3. **Sello de origen vigente.** Cada conjunto `L` lleva `_sellos.json`, que registra para
   cada fichero traducido (y para cada clave de catálogo) el hash del contenido `es` del
   que se tradujo, con los saltos de línea normalizados a LF. Si el `es` actual no casa
   con su sello, el check falla: *"es cambió desde la última traducción de L"*, y nombra
   el fichero o la clave. En Markdown nombra además las secciones `es` que cambiaron,
   porque el sello guarda un hash por sección.

El sello es lo que convierte en verdad literal CE-3 ("cambia en `es` sin el cambio
correspondiente en `gl` y `ca` → CI falla"): las condiciones 1 y 2 solas no detectan una
corrección de redacción en `es`. Para volver a sellar hay que nombrar explícitamente el
fichero o la clave y el idioma, con un script de `tools/` que no admite "sellar todo". El
resellado aparece en el diff y se revisa en el PR, igual que cualquier exención de
ADR-012.

**Checks dependientes del idioma.** `prosa-gates` deja de llevar sus patrones en código.
Cada conjunto de roles declara los suyos en `core/roles/<idioma>/_prosa-gates.json`, con
los **mismos ids de regla** en todos los idiomas (los ids los fija el check, los patrones
los pone cada idioma). El check falla si un idioma soportado no tiene el fichero o le
falta una regla.

Esto vale para **las dos** verificaciones de `prosa-gates`:
- la regla del documentalista;
- la guarda de precondición `.sdd.json` de ADR-015 (`checkPrecondicionSdd`). Hoy solo
  recorre `core/roles/es/` y busca expresiones en castellano: el antipatrón de fallback
  y la orden de "parar inmediatamente".

Con este cambio, cada idioma soportado declara sus patrones de antipatrón y de parada,
y el check recorre `core/roles/<idioma>/` para todos. Las skills y los agents de los
adaptadores siguen en castellano (§3) y conservan los patrones `es`. Sin esto, una
traducción podría perder la regla de seguridad del documentalista o la parada sin
`.sdd.json` sin que nada avisara.

El check se cablea en `tools/check.mjs` y, por tanto, en el pre-commit (L2) y en CI (L3).
Con solo `es` presente pasa en verde y su mensaje de éxito dice que no ha comparado nada
(ADR-011 §6: un verde anónimo no distingue "miré" de "no había qué mirar").

### 6. (e) La regla "los términos de `dominio.md` no se traducen" en proyectos gl/ca

- **Sigue valiendo, con su sentido de siempre**: un término del glosario de un proyecto
  tiene **una forma canónica** y no se traduce ni se angliciza en su código, su UI ni sus
  documentos. En un proyecto gl o ca la forma canónica es la que su glosario fije,
  normalmente en su idioma. La regla impide la sinonimia, no obliga a escribir en
  castellano. La plantilla `dominio.md` de cada idioma la enuncia así.
- **El vocabulario del método** se reparte en tres grupos. Los identificadores del
  punto 4 no se tocan. Los préstamos que el castellano ya usa sin traducir —`spec`,
  `ledger`, `gate`, `harness`, `SDD`, `ADR`, y las siglas `CA`, `CE`, `RN`— se quedan
  igual en gl y en ca. El resto (épica, tarea, criterio de aceptación, máquina de
  estados…) se traduce con **una tabla de terminología por idioma**. La tabla es fija y
  la firma **solo Alberto Fojo, antes de traducir en masa y sin un segundo revisor
  nativo** (gate, 2026-10-27). Así CE-5 se aplica al principio y no al final. Es la
  defensa contra los calcos que la épica identifica como riesgo, y le da a quien revisa
  un único sitio que validar.
- `docs/fundacion/dominio.md` de **este** repo no cambia: tremen-sdd sigue en castellano.

### 7. Orden respecto a EPIC-005

EPIC-005 **excluye expresamente** `core/roles/`, y no toca `core/templates/` ni el
código. La tensión que anota el roadmap ("traducir antes de que EPIC-005 cierre obliga a
corregir tres veces") no existe para roles ni plantillas por esa vía. Además, el sello
hace que cualquier corrección posterior en `es` se vea, en vez de esconderse.

- **Puede empezar ya**: SPEC-025 entera, SPEC-026 en cuanto SPEC-025 esté en `hecho`, y
  la tabla de terminología gl.
- **Puntos de contacto reales**: todos se resuelven del lado de EPIC-005 (gate,
  2026-10-27), y ninguna spec de EPIC-007 toca documentos de verdad.
  1. **El texto de `FOUNDATION.md` y `vision.md`** (§0): lo reescribe la spec #3 de
     EPIC-005.
  2. **Dos rutas de plantilla citadas en documentos del inventario de EPIC-005.** Mover
     las plantillas (SPEC-025) cambia la fila `tarea` de `docs/fundacion/dominio.md` y
     `README.md` §plantillas. También las actualiza la spec #3 de EPIC-005.
     - Hasta entonces, esas citas apuntan a la ruta antigua.
     - Si el check M1 de EPIC-005 (su spec #2) entra antes que su spec #3, la cita de
       `dominio.md` le dará un rojo legítimo, y el orden de merge debe tenerlo en cuenta.
  3. **`tools/check.mjs` (`PASOS`)**: SPEC-026 y la spec #2 de EPIC-005 añaden cada una
     un paso. Es un conflicto de merge trivial.
- **Conviene esperar**: traducir roles en masa debería ir detrás de cualquier spec
  **abierta** que reescriba prosa de `core/roles/es/`. No es por EPIC-005: es para no
  pagar el resellado dos veces.

**Desglose de EPIC-007 resultante** (sustituye al orientativo de la épica):

| # | Spec | Cubre |
|---|---|---|
| 1 | SPEC-025 — mecanismo de idioma, catálogos y plantillas por idioma | CE-4 |
| 2 | SPEC-026 — paridad bloqueante: sellos, `prosa-gates` y gatillos | CE-3 (con fixtures), CE-2 anticipado |
| 3 | Terminología y contenido gl. Primer entregable: la tabla de terminología gl, firmada solo por Alberto Fojo antes de traducir en masa y sin segundo revisor nativo. Después: roles, plantillas, catálogos y gatillos gl, y el RED de CE-3 en un PR real. | CE-3 (cierre), CE-5 (gl) |
| 4 | Pipeline real en gl | CE-1 |
| 5 | Contenido ca y pipeline real en ca, con el diff de rutas como criterio | CE-2, CE-5 (ca) |

## Consecuencias
### Positivas
- **Añadir un idioma es añadir directorios.** Ningún código enumera idiomas. CE-2 se
  puede comprobar con un diff de rutas: la pasada de ca solo toca conjuntos `ca/`,
  `_descripciones.json` y las copias de description de los adaptadores.
- **CE-3 queda bloqueante por construcción**, y no a medias: el sello caza la corrección
  de redacción, que es el caso más frecuente y el que inventario y estructura solos no
  verían.
- **CE-4 se puede demostrar**: el catálogo `es` es literal, y lo demuestran pruebas golden
  de salida (mensajes, tablero, scaffold) contra el comportamiento de antes del cambio.
- Los identificadores fijos mantienen un solo método: un tablero gl y uno es se leen con
  el mismo `valida`, y un agente que salta de proyecto no tiene que reaprender estados.
- La garantía de seguridad de `prosa-gates` se extiende a cada idioma en vez de evaporarse.

### Negativas / follow-ups
- **Cada edición de prosa `es` cuesta tres.** Es el precio aceptado en la épica. El sello
  lo hace explícito en cada PR en vez de esconderlo, y por eso mismo será molesto.
- **El sello se puede rellenar sin traducir.** Es un acto explícito, por fichero, visible
  en el diff. El check certifica que alguien declaró la traducción al día, no que lo esté.
  Contra eso quedan la revisión humana (CE-5) y las invariantes.
- **El multiconjunto de invariantes es estricto**: una traducción que omita una mención
  redundante de `` `borrador` `` sale en rojo. No hay exenciones en la primera versión. Si
  la spec de contenido gl encuentra casos legítimos, se escala al gate; no se ablanda el
  check (ADR-011 §5).
- **El disparo no queda localizado del todo** (punto 3): prosa base de la description en
  castellano y listado de skills en castellano. Revisable si un harness llegara a permitir
  descriptions por proyecto.
- **Las plantillas cambian de ruta** (`core/templates/` → `core/templates/es/`). Hay que
  actualizar `scaffold.mjs`, los tres `sdd-init` y los tests (SPEC-025). Hay además dos
  citas en documentos del inventario de EPIC-005, que quedan desfasadas hasta que su
  spec #3 las corrija (§7).
- **RN nueva**: el invariante de paridad debe ser citable igual que RN-11. Se propone en
  SPEC-026 (anexo), sin aplicar, y se numera con el siguiente RN libre cuando entre la
  RN-12 de SPEC-018. Los términos nuevos (*idioma soportado*, *conjunto de idioma*,
  *catálogo de mensajes*, *sello de origen*) deben entrar en `dominio.md` antes de usarse
  en la fundación.

## Alternativas consideradas
<!-- Cada una con el motivo de rechazo. -->
- **(a) Que el LLM traduzca en caliente los mensajes de los scripts.** Rechazada: los
  hooks y el pre-commit no pasan por un LLM, el pre-commit corre sin harness (RN-03) y el
  texto de un gate tiene que ser determinista.
- **(a) Catálogos como módulos `.mjs` en vez de JSON.** Rechazada: los convierte en código,
  de modo que la pasada de ca "tocaría código", y el check de paridad tendría que
  ejecutarlos para leerlos.
- **(a) Un único catálogo con todos los idiomas** (`clave → {es, gl, ca}`). Rechazada:
  añadir un idioma edita un fichero compartido, el diff de CE-2 deja de ser por rutas y
  cada traducción obliga a tocar el fichero del origen.
- **(a) Unificar en el núcleo los mensajes de los hooks de adaptador.** Rechazada: o mete
  claves con nombre de harness en `core/`, o cambia hoy la redacción de `protege-verdad`
  en un adaptador (CE-4).
- **(a) Avisar en runtime de un `idioma` no soportado, en todos los emisores.**
  Rechazada para los hooks: son fail-open y silenciosos. Se señala solo en `valida.mjs` y
  en `sdd-init` (§2).
- **(a) Que `valida.mjs` dé solo un aviso con código 0.** Rechazada: los agentes y la
  automatización se guían por el código de salida, y el valor nunca es legítimo (§2).
- **(a) Meter el fallo en `validateFile`**, para que salga también en `calidad` y en el
  pre-commit. Rechazada: haría hablar a los hooks del idioma y bloquearía commits por una
  cuestión de configuración que no tiene que ver con el artefacto.
- **(a) Que el resolutor tenga su propia búsqueda de raíz** (la de la ronda anterior:
  primer ancestro con `.sdd.json`, sin corte en `.git`). Rechazada: habría dos
  definiciones de "raíz del proyecto" que divergen con repos anidados. Un script podría
  pasar la barrera con una raíz y leer el idioma de otra, y se rompería la simetría que
  fija ADR-015.
- **(a) Tratar un `.sdd.json` ilegible como "sin fichero" en `valida.mjs`** (código 0,
  como en la ronda anterior). Rechazada: con ADR-015, un fichero que existe pero no se
  puede leer significa que el proyecto se declara activo y tiene los gates L1 apagados.
  Callarlo esconde justo el estado más peligroso.
- **(b) Un build por idioma** (`dist/claude-code-gl`). Rechazada: multiplica los artefactos
  publicados de EPIC-004, obliga a elegir idioma al instalar y choca con que el idioma sea
  del proyecto: la misma máquina tiene proyectos es y gl con un solo plugin instalado.
- **(b) `_descripciones.json` traducido en cada conjunto de idioma.** Rechazada: ningún
  harness lo leería. Sería contenido muerto que el check obligaría a mantener.
- **(b) Description solo en castellano**, confiando en que el modelo entienda gl y ca.
  Considerada y viable como mínimo. No se elige porque el disparo explícito por frase ya
  es la convención (lo es en inglés) y los gatillos cuestan poco.
- **(b) Mover la canónica a `core/roles/_descripciones.json`**, fuera de `es/`.
  Rechazada: obligaría a superseder ADR-005 y a reescribir RN-11 por una ganancia de
  nombre.
- **(c) Traducir estados y campos** y mapearlos en los scripts. Rechazada: lógica por
  idioma en el núcleo (contra CE-2), proyectos ilegibles entre sí y una superficie de
  error enorme en `valida` y `estado`.
- **(d) Paridad solo por existencia de ficheros.** Rechazada: el humano la descartó
  expresamente, y no detecta ni un rol vacío ni una corrección sin propagar.
- **(d) Paridad por fecha de commit en git** (el `es` es más nuevo que el `gl`). Rechazada:
  frágil con clones superficiales en CI, rebases y squash, no funciona sobre lo staged del
  pre-commit y no es reproducible.
- **(d) Comparar contra una traducción automática de referencia.** Rechazada: no es
  determinista, necesita red o modelo en CI y convierte a un traductor automático en
  árbitro de la calidad, que es de CE-5.
- **(d) Sello en el frontmatter de cada fichero traducido.** Rechazada: los roles son prosa
  pura que el LLM lee como contrato (por eso ADR-005 descartó frontmatter en ellos), y el
  frontmatter de las plantillas se copia a los proyectos.
- **(e) Glosario del proyecto siempre en castellano.** Rechazada: contradice el objetivo de
  la épica. **(e) Traducir libremente el vocabulario del método sin tabla.** Rechazada: es
  la puerta de los calcos y de la sinonimia, justo lo que la regla de `dominio.md` existe
  para impedir.
- **Plantillas `es` en la raíz de `core/templates/` y solo gl/ca en subdirectorio.**
  Rechazada: hace de `es` un caso especial en `scaffold`/`sdd-init` y en el check, y rompe
  la simetría con `core/roles/<idioma>/`. Ahorra dos citas de documentación a cambio de
  una excepción permanente en código.

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
