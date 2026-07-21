---
id: SPEC-004
tipo: spec
epica: EPIC-001
estado: en-revision
aprobada-por:
historial:
  - {estado: borrador, fecha: 2026-07-21, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-21, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-07-21, por: sdd-implementador}
  - {estado: en-revision, fecha: 2026-07-21, por: sdd-implementador}
---
# SPEC-004 — Nucleo de roles sin token de harness

## Problema
<!-- Qué duele y a quién. Cita reglas de negocio (RN-xx) de docs/fundacion/reglas.md. -->

EPIC-001 promete un **núcleo aislado** (CE-1) cuya prosa de roles es la **única
fuente** que cada harness consume sin copiar (CE-3). Pero la prosa del núcleo
—el system prompt de cada rol, en `core/roles/es/*.md`— **hardcodea el token de
Claude Code `${CLAUDE_PLUGIN_ROOT}`** en **9 sitios** (arquitecto 2, documentalista
2, implementador 1, orquestador 1, producto 1, verificador 2), siempre para
invocar un script del núcleo (`${CLAUDE_PLUGIN_ROOT}/core/scripts/<script>.mjs`).
Ese token es propiedad de Claude Code; en Kimi Code **no existe** (ADR-003). Es
decir: el núcleo que se declara agnóstico **nombra un harness concreto**, violando
la letra de CE-1/CE-3.

Hoy Kimi "funciona" por dos parches que tapan el síntoma sin resolver la causa:
(1) el bootstrap del adaptador Kimi suple la resolución de la raíz, y (2) el pase
`kimi-code` de `tools/checks/referencias.mjs` **excluye a propósito** el subárbol
`core/` copiado en `dist/` (filtro `enAdaptador`, con un comentario que admite que
la prosa del núcleo "puede contener ejemplos con el token de otro harness"). El
resultado: **esta clase de fuga no se caza en CI** —ni `nucleo-aislado` (que solo
analiza imports `.mjs`, no prosa) ni `referencias` la ven.

Este es el follow-up **F-SPEC-003-2** de SPEC-003: al añadir el adaptador Kimi se
hizo visible que la prosa del núcleo asume Claude. La resolución del root/base **ya
la aporta el bootstrap de cada adaptador** (Claude: "la raíz del plugin es
`${CLAUDE_PLUGIN_ROOT}`, construye rutas con ella"; Kimi: ruta relativa al artefacto);
lo que sobra es que la prosa del núcleo **además** nombre el token de Claude. Toca
`RN-02` (el núcleo no debe resolver hacia fuera de `core/`) y `RN-06` (fuente única
de la prosa, que aquí solo se **renombra** el token, sin tocar el cuerpo del rol).

## Usuarios / roles afectados

- **Mantenedores de tremen-sdd** (humano): ganan un núcleo de verdad agnóstico y un
  check que impide que la fuga vuelva; dejan de arrastrar el parche de exclusión.
- **sdd-implementador**: quita el token de `core/roles/es/*.md`, ajusta el bootstrap
  de cada adaptador para que aporte la resolución, añade el check de invariante y
  retira el parche del pase Kimi. No reescribe lógica de scripts (RN-02).
- **sdd-verificador**: valida agnosticismo del núcleo (cero tokens de harness), que
  el check nuevo caza la fuga, que ambos adaptadores siguen resolviendo, y la
  no-regresión (`npm test` verde, `estado.mjs` intacto).
- **Los dos adaptadores (Claude Code y Kimi Code)**: su bootstrap pasa a ser el
  **único** lugar donde vive el token del harness; deben seguir resolviendo roles
  y scripts tras el cambio.

## Criterios de aceptación
<!-- CA-1, CA-2… en Given/When/Then. Cada CA debe ser verificable con un test. -->

- **CA-1 (el núcleo no nombra ningún token de harness — CE-1/CE-3)**: Dado el árbol
  `core/`, **cuando** se analiza toda su prosa (`core/roles/**/*.md` y demás textos
  del núcleo), **entonces** NO aparece ningún token propietario de un harness
  —`${CLAUDE_PLUGIN_ROOT}`, `${KIMI_*}`, cualquier `${*PLUGIN_ROOT*}` u otro
  placeholder de un harness—; el **único** placeholder de raíz permitido bajo `core/`
  es el neutro y propio del núcleo `${SDD_ROOT}` (además de los `<…>` de plantilla).
  Verificable: un análisis sobre `core/` cuenta **cero** tokens de harness (hoy hay
  **9** en `core/roles/es/*.md`; tras el cambio, **0**).

- **CA-2 (referencia neutral a los scripts; la resolución la deja al bootstrap —
  mecanismo)**: Dado cada rol en `core/roles/<idioma>/*.md`, **cuando** invoca un
  script del núcleo, **entonces** lo referencia con el placeholder neutro
  `${SDD_ROOT}/core/scripts/<script>.mjs`, y **nada** en el núcleo declara cómo
  `${SDD_ROOT}` se resuelve a una ruta concreta (esa resolución la aporta EXCLUSIVA-
  mente el bootstrap del adaptador, CA-5). El **cuerpo** del rol (`## Misión` /
  `## Flujo` / `## Reglas duras`) permanece por lo demás **intacto**: el cambio es un
  **rename del prefijo del token**, no una reescritura (RN-06, fuente única). Verificable:
  toda invocación de script bajo `core/roles/` usa `${SDD_ROOT}/…`; el `git diff`
  contra la versión previa muestra solo el cambio de prefijo del token; el check
  `roles-fuente-unica` sigue verde (ningún agent embebe el cuerpo).

- **CA-3 (un check de invariante caza la fuga en CI — cierre de la clase)**: Dado un
  check de invariante nuevo o generalizado (p. ej. `tools/checks/nucleo-agnostico.mjs`),
  **cuando** corre sobre `core/`, **entonces** (a) **PASA** con el núcleo agnóstico
  resultante; (b) **FALLA**, nombrando fichero y token, si se introduce **cualquier**
  token de harness bajo `core/` (fixture sintético con `${CLAUDE_PLUGIN_ROOT}` o
  `${KIMI_HOME}`) —regla: **allowlist**, bajo `core/` solo se admite `${SDD_*}` y los
  `<…>` de plantilla; cualquier otro `${…}` estilo entorno es fuga—; (c) para cada
  referencia `${SDD_ROOT}/<ruta>` bajo `core/`, la `<ruta>` **existe** dentro del
  núcleo (resoluble), preservando la validación de existencia que `referencias` daba
  en el build de Claude; (d) está **cableado** en el runner agregado `tools/check.mjs`
  (y por tanto en pre-commit/CI, L2/L3) y tiene su test en `tools/tests/`. Verificable:
  test del check con un fixture agnóstico (pasa) y uno contaminado (falla y el mensaje
  nombra el token); el paso aparece en `PASOS` de `tools/check.mjs`.

- **CA-4 (retirar el parche: el pase Kimi de `referencias` deja de excluir `core/`)**:
  Dado `tools/checks/referencias.mjs`, **cuando** corre el pase `kimi-code`,
  **entonces** ya **no excluye** el subárbol `core/` del artefacto (se elimina el
  filtro que salta `core/` en la comprobación de token de plugin-root de
  `referenciasKimi`), de modo que `dist/kimi-code/core/` **queda cubierto** y una
  reintroducción de token de harness en el núcleo se cazaría también a nivel `dist`
  (segundo guardián). El pase queda **verde** porque el núcleo ya no lleva token de
  harness. Verificable: el check ya no contiene el filtro de exclusión de `core/`;
  `node tools/checks/referencias.mjs kimi-code` verde tras el cambio; un fixture con
  token de harness bajo `dist/kimi-code/core/` haría fallar el pase.

- **CA-5 (ambos adaptadores resuelven; su bootstrap aporta la resolución — CE-2)**:
  Dado el conjunto de bootstraps del adaptador —Claude: `adapters/claude-code/agents/*.md`
  y `adapters/claude-code/skills/sdd-*/SKILL.md`; Kimi: `adapters/kimi-code/agents/prompts/*.md`—,
  **cuando** un rol del núcleo escribe `${SDD_ROOT}`, **entonces** cada bootstrap
  **define** su resolución: **Claude** → `${SDD_ROOT}` es `${CLAUDE_PLUGIN_ROOT}` (la
  raíz del plugin que el harness ya sustituye); **Kimi** → `${SDD_ROOT}` es la raíz
  del artefacto, por ruta relativa al fichero. El token de harness
  (`${CLAUDE_PLUGIN_ROOT}`) queda **solo** en la superficie del adaptador, **nunca**
  en el núcleo. Verificable: cada bootstrap contiene la instrucción de mapeo de
  `${SDD_ROOT}`; en `dist/claude-code/` y `dist/kimi-code/`, cada script referido por
  los roles (`core/scripts/*.mjs`) **existe** en la ruta que el mapeo resuelve.

- **CA-6 (no regresión: `npm test` verde en ambos, CI incluido; `estado.mjs` no
  agravado)**: Dado el conjunto de cambios, **cuando** se ejecuta `npm test` (build
  claude + kimi → los checks de invariantes de **ambos** adaptadores → `valida`),
  **entonces** la suite queda **verde** con conteo **≥** el previo más el/los test(s)
  del check nuevo; pasan `nucleo-aislado`, `roles-fuente-unica`, `referencias`
  (claude y kimi) y el nuevo `nucleo-agnostico`; los tests de
  `core/tests/estado.test.mjs` quedan **intactos** y la regresión conocida de specs
  migradas (`estado.mjs`) **no se agrava** —no se toca `core/scripts/estado.mjs`.
  Verificable: `npm test` verde en local y en CI; el `git diff` no toca
  `core/scripts/estado.mjs`; el runner `tools/check.mjs` incluye el paso nuevo.

## Entidades y reglas afectadas
<!-- Cita RN-xx, ADR-NNN y términos de docs/fundacion/dominio.md. Referencia, no dupliques. -->

- **ADR-004** (Resolución del núcleo la aporta el adaptador; el núcleo es agnóstico al
  harness): esta spec lo **materializa**. El placeholder neutro `${SDD_ROOT}`, la
  resolución exclusiva por el bootstrap, el "sin sustitución en build" (núcleo
  verbatim) y el check de invariante vienen de ahí; no se redefinen aquí.
- **ADR-003** (empaquetado/resolución del núcleo para Kimi): esta spec **cierra** un
  cabo que ADR-003 dejó implícito. ADR-003 ya afirmó que "la única diferencia con
  Claude Code es el token de ruta"; ADR-004/SPEC-004 lo **hacen cierto también para la
  prosa del núcleo**, que hasta hoy seguía nombrando el token de Claude.
- **ADR-001** (build/empaquetado): **intacto**. El build sigue copiando el núcleo
  **verbatim**; no se añade sustitución de tokens en build (ver ADR-004).
- **Reglas**: **RN-02** (el núcleo no resuelve hacia fuera de `core/` —ahora también
  su prosa deja de anclarse a un token de un harness), **RN-06** (fuente única de la
  prosa de roles: solo se **renombra** el token, el cuerpo del rol no se toca),
  **RN-04** (ningún ADR aprobado se modifica: ADR-001/002/003 quedan intactos),
  **RN-10** (dogfooding: el cambio toca el propio estándar).
- **Criterios de éxito de EPIC-001**: **CE-1** (núcleo aislado —ahora también en la
  prosa, no solo en imports `.mjs`) y **CE-3** (prosa de rol sin acoplar a un harness).
- **Lógica reutilizada (no reescrita)**: `core/scripts/*` y `core/lib/*` no cambian;
  `tools/build-adapter.mjs` no cambia (núcleo verbatim); `referencias.mjs` solo pierde
  el filtro de exclusión de `core/`.

## Fuera de alcance
<!-- Aparcado a propósito, no por descuido. -->

- **Reescribir la lógica** de scripts, máquina de estados o hooks: prohibido (RN-02,
  EPIC-001). Solo se **renombra** un token en la prosa y se ajusta el mapeo en el
  bootstrap.
- **Sustituir el token en el build** (Claude→`CLAUDE_PLUGIN_ROOT`, Kimi→relativo):
  descartado (ADR-004). El núcleo viaja **verbatim**; `${SDD_ROOT}` permanece literal
  en `dist/` y lo mapea el bootstrap, como hoy ya pasa con la lectura del fichero de rol.
- **Tocar los hooks** (`adapters/claude-code/hooks/`, `adapters/kimi-code/hooks/`): no
  hace falta; los hooks resuelven el núcleo por import ESM interno, no por este token.
- **Multi-idioma de roles**: sigue solo `es`.
- **Deduplicar skills/bootstraps entre adaptadores**: follow-up independiente (ADR-003).
- **La regresión conocida de `estado.mjs`** (specs migradas que se atascan): abierta a
  propósito; esta spec solo garantiza **no agravarla**.

## Notas para el gate humano
<!-- Lo que quien aprueba necesita saber para decidir. -->

> Esta spec sigue en `borrador`; la arquitecta NO la aprueba (RN-09). Va acompañada de
> **ADR-004** (también en `borrador`). No hay ninguna decisión de **producto** pendiente:
> es un ajuste técnico interno de agnosticismo del núcleo. Sí hay **una** decisión de
> mecanismo que conviene mirar con lupa:

1. **Mecanismo neutral — RECOMENDADO: placeholder propio del núcleo `${SDD_ROOT}`.**
   La prosa del núcleo pasa de `${CLAUDE_PLUGIN_ROOT}/core/scripts/…` a
   `${SDD_ROOT}/core/scripts/…` (un **rename de prefijo**, 9 sitios). `${SDD_ROOT}` no
   es de ningún harness: es el placeholder del núcleo para "la raíz que contiene
   `core/`". La **resolución** la aporta solo el bootstrap del adaptador (Claude →
   `${CLAUDE_PLUGIN_ROOT}`; Kimi → raíz del artefacto por ruta relativa). Es el **mismo
   mecanismo que ya funciona hoy** —el fichero de rol se lee con `Read` y su token no lo
   sustituye el harness, lo mapea el LLM con lo que dijo el bootstrap— solo que el token
   deja de nombrar un harness. **Alternativa considerada y no elegida**: prosa puramente
   descriptiva sin placeholder ("invoca el script `scaffold.mjs` del núcleo, en
   `core/scripts/`"); es aún más agnóstica pero pierde la afordancia de "comando
   ejecutable tras sustituir el prefijo" y deja al check sin un ancla resoluble; un
   `core/scripts/…` a secas puede leerse como relativo al CWD del proyecto y ejecutarse
   mal. **Si el gate prefiere la vía descriptiva, es un cambio acotado** (ajustar CA-2/CA-3).

2. **El token de harness no desaparece del repo: se muda a su sitio correcto.**
   `${CLAUDE_PLUGIN_ROOT}` sigue existiendo —pero **solo** en la superficie del adaptador
   Claude (agents/skills), que es donde el conocimiento del harness debe vivir. El núcleo
   queda limpio.

3. **Dos guardianes tras el cambio, uno nuevo y uno recuperado.** El check nuevo
   (`nucleo-agnostico`, sobre `core/` en origen, allowlist `${SDD_*}`) cierra la clase en
   CI, algo que **hoy no se caza**. Y al retirar el parche de exclusión, el pase Kimi de
   `referencias` vuelve a cubrir `dist/kimi-code/core/` (guardián a nivel build). Redundancia
   barata y deliberada.

4. **Rutas vigiladas (dogfooding, RN-10).** El cambio toca: `core/roles/es/*.md` (**no
   vigilado**), el bootstrap de cada adaptador —`adapters/claude-code/agents|skills/`,
   `adapters/kimi-code/agents/prompts/`— (**no vigilado**) y un check en `tools/` (**no
   vigilado**). La única ruta vigilada relevante (`adapters/claude-code/hooks/`) **no se
   toca**. `core/scripts/estado.mjs` (vigilado) **no se toca**.
