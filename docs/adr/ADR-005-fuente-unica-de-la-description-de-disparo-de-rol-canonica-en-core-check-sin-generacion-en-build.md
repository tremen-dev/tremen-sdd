---
id: ADR-005
tipo: adr
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-07-21, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-21, por: Alberto Fojo}
---
# ADR-005: Fuente unica de la description de disparo de rol: canonica en core + check, sin generacion en build

- Deciders: propone sdd-arquitecto; aprueba el humano (pendiente, gate humano). La decisión
  binaria (generar vs autorar+check) la **resolvió el gate (Alberto Fojo, 2026-07-21):
  autorar + check**, canónica en JSON aparte (`core/roles/es/_descripciones.json`), y
  **codificar RN-11**. Este ADR ya recoge esa resolución.
- Specs relacionadas: SPEC-005 (Fuente única de la description de rol) lo consume y
  materializa. **Complementa** ADR-001 (build/empaquetado, núcleo verbatim) y ADR-004
  (núcleo agnóstico, resolución la aporta el bootstrap); NO los supersede. Origen:
  EPIC-001, CE-3 (una sola fuente de prosa de rol; los adaptadores la consumen, no la
  copian) aplicado ahora a la `description`, y F-SPEC-001-1.

## Contexto

CE-3 y RN-06 garantizan una **única fuente** para el **cuerpo** del system prompt de
cada rol: vive solo en `core/roles/<idioma>/<rol>.md` y los adaptadores lo **referencian**
(`Read` en ejecución), nunca lo copian. Ese mecanismo funciona porque el cuerpo se lee de
un fichero en tiempo de ejecución.

La **`description` de disparo** de cada rol —la prosa "qué hace este rol y cuándo
invocarlo", con sus frases-gatillo— **no** goza de esa garantía. Está **autorada y
duplicada** en cuatro superficies de adaptador:

1. **Claude — agents**: `adapters/claude-code/agents/sdd-*.md`, frontmatter `description:`
   (4 agents: arquitecto, implementador, verificador, documentalista).
2. **Claude — skills**: `adapters/claude-code/skills/sdd-*/SKILL.md`, frontmatter
   `description:` (7 skills, incluidos orquestador, producto y como-vamos).
3. **Kimi — skills**: `adapters/kimi-code/skills/sdd-*/SKILL.md`, frontmatter `description:`
   (6 skills).
4. **Kimi — mapa `subagents:`**: `adapters/kimi-code/agents/sdd-orquestador.yaml`, un
   `description:` por rol (6 blurbs de una línea).

**Diferencia estructural con el cuerpo (la que fuerza la decisión):** el harness lee el
`description:` del frontmatter/YAML de forma **LITERAL** para decidir el disparo. A
diferencia del cuerpo, **no** puede referenciar un fichero con `Read`: no hay indirección
posible. Por tanto una "fuente única **física**" de la description solo es alcanzable
**generando** las copias desde un origen; sin generación, lo máximo es "una fuente
**canónica** + N copias autoradas **verificadas**".

**El drift ya ocurre, no es hipotético.** Para `sdd-arquitecto`:
- Claude agent y Claude skill coinciden (forma larga completa, con "(stack, datos,
  fronteras)" y la frase-gatillo "record this decision as an ADR").
- **Kimi skill** está **parafraseado y más corto**: cae "(stack, datos, fronteras)" y cae
  "record this decision as an ADR".
- **Kimi subagents-map** es otro texto: un one-liner ("Única autora de SPECs y ADRs;
  convierte una épica o petición en una spec testable").

Es decir, hay **tres redacciones distintas** del mismo disparo ya conviviendo. Ningún
check lo caza: `manifiestos` valida que el mapa `subagents:` **tenga** un `description`,
no que **coincida** con nada; `roles-fuente-unica` vigila el **cuerpo** (`## Misión` /
`## Flujo` / `## Reglas duras`), no la description. Es exactamente la clase de duplicación
que una herramienta cuyo lema es "una sola fuente de verdad" no debe tolerar.

**Matiz que hay que respetar:** las cuatro superficies **no** son intercambiables en
longitud. Las tres primeras (agent/skill frontmatter) son la **superficie de disparo**
del harness y admiten la forma larga con frases-gatillo. La cuarta (mapa `subagents:`) es
un **blurb de selección de subagente** para el agente raíz, donde una sola frase es la
convención natural. La solución debe permitir **≥1 forma declarada** por rol, no imponer
una única cadena idéntica en sitios con convenciones distintas.

La pregunta que este ADR fija: **¿dónde vive la fuente canónica de la description de cada
rol, y qué mecanismo garantiza que ninguna copia de adaptador diverja — generación en
build o autoría + check en CI — respetando que ADR-001/004 fijaron build tonto (copia
verbatim, sin transformar la superficie del adaptador)?**

## Decisión

**Fuente canónica única por rol en el núcleo + copias autoradas en cada adaptador,
verificadas por un check nuevo en CI (Opción "autorar + check"). El build NO cambia: sigue
copiando verbatim y no genera ni inyecta descriptions. La fuente física única de la
description es imposible sin generación (el harness la lee literal); se acepta ese límite
y se cierra el drift con un check duro.**

1. **Fuente canónica en el núcleo.** Cada rol declara su(s) forma(s) de description en un
   **manifiesto del núcleo** `core/roles/<idioma>/_descripciones.json` (idioma = `es`,
   único hoy), con por rol una forma **`larga`** (superficie de disparo: agent/skill
   frontmatter) y una forma **`corta`** (blurb de una frase: mapa `subagents:` de Kimi).
   Es dato del núcleo, machine-readable, y NO toca el cuerpo del rol
   (`core/roles/<idioma>/<rol>.md` queda intacto → RN-06 a salvo).

2. **Las copias de adaptador siguen autoradas, pero deben coincidir con una forma
   declarada.** Mapeo superficie→forma:
   - Claude agents `description:` → `larga`.
   - Claude skills `description:` → `larga`.
   - Kimi skills `description:` → `larga`.
   - Kimi mapa `subagents:` `description:` → `corta`.
   La comparación normaliza el plegado YAML (`>` colapsa saltos a espacios; se comparan
   espacios normalizados), de modo que "coincide" = igualdad textual tras normalizar, no
   igualdad byte a byte del fichero.

3. **Build verbatim, intacto (ADR-001/004).** `tools/build-adapter.mjs` **no** se toca: no
   inyecta descriptions en `dist/`, no transforma la superficie del adaptador. El núcleo
   (incluido el manifiesto) viaja verbatim. Coherente con ADR-004, que explícitamente
   rechazó meter sustitución por-harness en el build.

4. **Check nuevo `descripcion-fuente-unica` (cierre de la clase en CI).** Un check de
   invariante en `tools/checks/` que, para cada rol y cada superficie de adaptador de
   **ambos** harnesses: (a) lee la description autorada, (b) la compara (normalizada) con
   la forma canónica que le toca por el mapeo, (c) **FALLA** nombrando rol + superficie +
   forma esperada si diverge o falta. Cableado en el runner `tools/check.mjs` (→
   pre-commit L2 y CI L3) con su test en `tools/tests/`. Usa `core/lib/entrypoint.mjs`
   para el arranque CLI cross-platform (lección SPEC-002).

**Por qué "autorar + check" y no "generar":** ADR-001 y ADR-004 fijaron que el build es
**tonto** (copia verbatim; la superficie del adaptador se **autora**; ADR-004 rechazó de
plano introducir sustitución por-harness en el build). Un generador que poblara las
descriptions —sea escribiendo en `adapters/*` en autoría, sea inyectando en `dist/` en
build— sería el **primer** mecanismo que hace al build/codegen **transformar** la
superficie del adaptador, invirtiendo una decisión tomada hace dos días. "Autorar + check"
consigue el objetivo real (cero drift, cazado en CI) con el menor cambio estructural y sin
tocar ADR-001/004. **Es una decisión con trade-off real** (ver Negativas y Alternativas);
por eso se lleva al gate como pregunta binaria.

**Relación con RN-06 y RN-11.** RN-06 cubre el **cuerpo** (referenciado, fuente física
única). La description **no** puede referenciarse, así que su garantía es de **otra
naturaleza**: canónica + verificación. El gate confirmó codificar esto como **RN-11** ("la
`description` de disparo de cada rol tiene una fuente canónica única en
`core/roles/es/_descripciones.json`; las copias de la superficie de cada adaptador deben
coincidir con la canónica; lo hace cumplir `descripcion-fuente-unica`"), ya escrita en
`docs/fundacion/reglas.md` por sdd-arquitecto (co-dueño del documento con producto, RN-08).

## Consecuencias
### Positivas
- **CE-3 extendido a la description**: el disparo de cada rol tiene una fuente canónica; el
  drift Claude↔Kimi que hoy ya existe queda **prohibido y cazado** en CI.
- **ADR-001/004 intactos**: build sigue tonto y verbatim; ninguna decisión previa se
  invierte (RN-04).
- **Respeta las convenciones por harness**: `larga`/`corta` por rol cubren la superficie de
  disparo y el blurb de subagente sin forzar una cadena única en sitios distintos; un
  harness futuro con otra convención añade otra forma declarada.
- **Cambio acotado y de bajo riesgo**: un manifiesto en el núcleo, alinear las descriptions
  ya existentes a la canónica, y un check + su test. No se reescribe lógica ni el build
  (RN-02).
- **Fuente canónica machine-readable**: un JSON que el check parsea directo, sin depender de
  parsear frontmatter de un fichero de prosa.

### Negativas / follow-ups
- **No es fuente única FÍSICA**: la description sigue autorada en N sitios; solo está
  **verificada**. Es el techo alcanzable sin generación, dado que el harness lee el campo
  literal. Un cambio de wording obliga a tocar el manifiesto **y** las copias — el check
  te obliga a no olvidarte, pero es más de un fichero. (Con "generar" sería un único
  sitio; ese es el trade-off que decide el gate.)
- **Un artefacto nuevo en el núcleo** (`_descripciones.json`): el check `nucleo-agnostico`
  lo escaneará; las descriptions no contienen `${...}` de entorno, así que pasan la
  allowlist, pero conviene un test que lo confirme.
- **Deduplicar wording entre superficies** (que la description viva de verdad en un solo
  fichero) queda como follow-up solo si el gate elige "generar" en el futuro.

## Alternativas consideradas
<!-- Cada una con el motivo de rechazo. -->
- **GENERAR en autoría (codegen commiteado): un generador puebla las `description:` de
  `adapters/*` desde la canónica.** CONSIDERADA — es la que da fuente única de wording en
  un solo sitio. NO elegida (recomendación): hace que las agents/skills sean **parcialmente
  generadas**, contradiciendo "la superficie del adaptador se autora" (ADR-001); exige
  además un check de "está regenerado" (drift canónica↔commit) que no es más simple que el
  check de igualdad de "autorar + check". **Es la opción que el gate puede preferir** si
  valora "un solo sitio de edición" por encima de "build/superficie tontos".
- **GENERAR en build (inyectar la description en `dist/` desde la canónica).** RECHAZADA:
  hace al build **transformar** la superficie del adaptador (hoy la copia verbatim), justo
  lo que ADR-004 rechazó para el token; las agents/skills en **origen** dejarían de ser
  auto-descriptivas (no podrías leer el disparo en el fuente); mete plantillado por-harness
  en un build deliberadamente tonto. Da fuente física única, pero al mayor coste
  estructural. **Revisable en el gate** junto con la anterior.
- **Canónica en el frontmatter del propio `core/roles/<idioma>/<rol>.md`** (en vez de un
  manifiesto JSON aparte). CONSIDERADA: evita un fichero nuevo. No elegida: el fichero de
  rol es hoy **prosa pura** que el LLM lee como contrato en ejecución; añadirle frontmatter
  de metadatos lo mezcla con datos de empaquetado y obliga al check a parsear frontmatter
  de un `.md`. El JSON aparte es machine-readable y separa datos de prosa. **Ajuste acotado
  si el gate lo prefiere** (mover la canónica al frontmatter y que el check lo lea de ahí).
- **Statu quo: dejar las descriptions autoradas sin canónica ni check.** RECHAZADA: es el
  estado que **ya** produjo tres redacciones divergentes del disparo de `sdd-arquitecto`;
  contradice CE-3 y el lema del producto.
- **Una única cadena idéntica en las cuatro superficies (sin `corta`).** RECHAZADA: fuerza
  al blurb del mapa `subagents:` a cargar la forma larga multi-frase, rompiendo la
  convención de "una línea por subagente" y degradando la selección de subagente en Kimi.

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
