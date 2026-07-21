---
id: ADR-004
tipo: adr
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-07-21, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-21, por: Alberto Fojo}
---
# ADR-004: Resolucion del nucleo la aporta el adaptador; el nucleo es agnostico al harness

- Deciders: propone sdd-arquitecto; aprueba el humano (pendiente, gate humano).
- Specs relacionadas: SPEC-004 (Núcleo de roles sin token de harness) lo consume y
  materializa. **Complementa** ADR-003 (empaquetado/resolución para Kimi) y ADR-001
  (build/empaquetado); NO los supersede. Origen: EPIC-001, CE-1 (núcleo aislado) y
  CE-3 (prosa de rol sin duplicar/acoplar).

## Contexto

El núcleo (`core/`) se declara **agnóstico al harness** (CE-1) y su prosa de roles es
la **única fuente** que cada adaptador consume sin copiar (CE-3, RN-06). Sin embargo,
la prosa de `core/roles/es/*.md` **nombra el token de Claude Code
`${CLAUDE_PLUGIN_ROOT}`** en 9 sitios, siempre para invocar un script del núcleo
(`${CLAUDE_PLUGIN_ROOT}/core/scripts/<script>.mjs`). Ese token es propiedad de Claude
Code; Kimi Code no lo ofrece (ADR-003, que ya rechazó depender de un `${KIMI_PLUGIN_ROOT}`
inexistente). O sea: el núcleo agnóstico **hardcodea acoplamiento a un harness** en su
prosa.

Hoy no se rompe en Kimi por dos parches: (1) el bootstrap del adaptador Kimi suple la
resolución de la raíz, y (2) el pase `kimi-code` de `tools/checks/referencias.mjs`
**excluye** el subárbol `core/` copiado en `dist/` (con un comentario que admite que la
prosa del núcleo "puede contener ejemplos con el token de otro harness"). Ningún check
caza esta clase de fuga: `nucleo-aislado` solo analiza imports `.mjs` (no prosa) y
`referencias` mira las referencias **del adaptador** al núcleo, no la prosa interna del
núcleo.

Dato clave del mecanismo actual: el fichero de rol se **lee con la herramienta `Read`**
en tiempo de ejecución (el bootstrap dice "lee `…/core/roles/<idioma>/<rol>.md` y sigue
sus instrucciones"). El harness **no** sustituye `${CLAUDE_PLUGIN_ROOT}` dentro del
contenido leído con `Read` —solo lo sustituye en el prompt del agente/bootstrap—; es el
**LLM** quien mapea el token usando lo que el bootstrap le dijo ("la raíz del plugin es
`<ruta abs>`"). Es decir: **la resolución del root ya la aporta el bootstrap**; la prosa
del núcleo solo usa un símbolo. El problema es únicamente que ese símbolo **nombra un
harness**.

De aquí la pregunta que este ADR fija: **¿cómo se refiere la prosa del núcleo a sus
propios scripts sin nombrar ningún harness, dejando la resolución del root/base
enteramente al bootstrap del adaptador, y cómo se garantiza en CI que la fuga no vuelva?**

## Decisión

**La prosa del núcleo es agnóstica al harness: no nombra ningún token propietario de un
harness. Se refiere a la raíz que contiene `core/` mediante un placeholder neutro y
propio del núcleo, `${SDD_ROOT}`, y la resolución de ese placeholder a una ruta concreta
la aporta EXCLUSIVAMENTE el bootstrap de cada adaptador. Un check de invariante cierra la
clase de fuga en CI.**

1. **Placeholder neutro `${SDD_ROOT}` en la prosa del núcleo.** `core/roles/**` pasa de
   `${CLAUDE_PLUGIN_ROOT}/core/scripts/<script>.mjs` a
   `${SDD_ROOT}/core/scripts/<script>.mjs`. `${SDD_ROOT}` significa "la raíz del artefacto
   que contiene `core/`"; **no** es de ningún harness (no es `CLAUDE_*`, no es `KIMI_*`).
   Es un **rename de prefijo**: el cuerpo del rol (`## Misión`/`## Flujo`/`## Reglas
   duras`) no se toca (RN-06, fuente única intacta).

2. **La resolución la aporta SOLO el bootstrap del adaptador.** El token del harness vive
   únicamente en la superficie del adaptador:
   - **Claude Code** (`adapters/claude-code/agents/*.md` y `skills/sdd-*/SKILL.md`): el
     bootstrap mapea `${SDD_ROOT}` → `${CLAUDE_PLUGIN_ROOT}` (que el harness sustituye a la
     ruta absoluta del plugin root).
   - **Kimi Code** (`adapters/kimi-code/agents/prompts/*.md`): el bootstrap mapea
     `${SDD_ROOT}` → la raíz del artefacto, por **ruta relativa** al fichero (coherente con
     ADR-003: resolución por ruta interna al artefacto, sin plugin-root).

3. **Sin sustitución en el build: el núcleo viaja verbatim.** `tools/build-adapter.mjs`
   sigue copiando `core/` byte a byte (RN-06, ADR-001 intacto). `${SDD_ROOT}` permanece
   **literal** en `dist/<harness>/core/`; es el LLM quien lo mapea en ejecución con la
   instrucción del bootstrap. Es exactamente el mecanismo que hoy ya opera con el token de
   Claude leído vía `Read`, con la única diferencia de que el símbolo deja de nombrar un
   harness. **No** se introduce lógica de sustitución por-harness en el build.

4. **Cierre de la clase en CI.** Un check de invariante (nuevo `nucleo-agnostico` o una
   generalización equivalente) analiza `core/` en origen y **falla** si aparece cualquier
   token de harness bajo el núcleo. Regla: **allowlist** —bajo `core/` solo se admiten
   `${SDD_*}` y los `<…>` de plantilla; cualquier otro `${…}` estilo entorno es fuga—, más
   futura-a-prueba que una denylist de tokens conocidos (cazaría un `${GEMINI_…}` no visto).
   El check valida además que cada `${SDD_ROOT}/<ruta>` resuelve a un fichero existente del
   núcleo (recupera la validación de existencia que daba `referencias`). Se **retira el
   parche de exclusión** de `core/` en el pase Kimi de `referencias`, con lo que
   `dist/<harness>/core/` queda cubierto también a nivel build (segundo guardián).

**Relación con ADR-003 y ADR-001 (COMPLEMENTA, no supersede).** ADR-003 ya dijo que "la
única diferencia entre Claude y Kimi es el token de ruta"; este ADR lo hace **cierto
también para la prosa del núcleo**, que hasta hoy seguía nombrando el token de Claude. El
build reutilizable de ADR-001 se mantiene sin cambios (núcleo verbatim). Ningún ADR
aprobado se modifica (RN-04); ADR-001/002/003 quedan intactos.

## Consecuencias
### Positivas
- **Núcleo de verdad agnóstico (CE-1/CE-3)**: `core/` no nombra ningún harness ni en
  imports (ya cubierto) ni en prosa (esta decisión).
- **El token del harness vive donde debe**: solo en la superficie del adaptador, que es
  el lugar del conocimiento harness-específico (RN-02).
- **La clase de fuga se caza en CI** —hoy no— y con margen de futuro (allowlist), sin
  depender de enumerar cada token de harness posible.
- **Coste de un harness nuevo más honesto (CE-5)**: añadir un harness es aportar un
  bootstrap que mapea `${SDD_ROOT}`, sin tener que "no mirar" un token ajeno en el núcleo.
- **Cambio mínimo y de bajo riesgo**: rename de prefijo en 9 sitios + mapeo en el
  bootstrap + un check; no se reescribe lógica ni el build (RN-02, RN-06 intactos).

### Negativas / follow-ups
- **Un símbolo más que el LLM debe mapear** (`${SDD_ROOT}`). Mitiga: es el mismo
  mecanismo que hoy con `${CLAUDE_PLUGIN_ROOT}`, y el bootstrap lo define explícitamente;
  el riesgo de que el LLM ejecute la ruta sin sustituir el prefijo es igual o menor que hoy.
- **Redundancia de guardianes** (check de origen + pase Kimi de `dist`): deliberada y
  barata; cubre tanto el repo como el artefacto construido.
- **Deduplicar los bootstraps entre adaptadores** (el mapeo de `${SDD_ROOT}` se repite en
  varias superficies) queda como follow-up de higiene, no como parte de esta decisión.

## Alternativas consideradas
<!-- Cada una con el motivo de rechazo. -->
- **Statu quo: dejar `${CLAUDE_PLUGIN_ROOT}` en el núcleo y tapar con el parche de
  exclusión.** RECHAZADA: el núcleo agnóstico hardcodea un harness, el parche tapa el
  síntoma y la clase de fuga queda sin caza en CI. Contradice CE-1/CE-3.
- **Sustituir el token en el build** (Claude→`${CLAUDE_PLUGIN_ROOT}`, Kimi→ruta relativa).
  RECHAZADA: reintroduce tokens de harness en `dist/<harness>/core/`, rompe "núcleo
  verbatim" (RN-06), mete lógica por-harness en el build y complica `fuente-unica`/
  `roles-fuente-unica`. Innecesario: el bootstrap ya resuelve el símbolo en ejecución.
- **Prosa puramente descriptiva, sin placeholder** ("invoca el script `scaffold.mjs` del
  núcleo, en `core/scripts/`"). CONSIDERADA, no elegida: es válida y aún más agnóstica,
  pero (a) pierde la afordancia de "comando ejecutable tras sustituir el prefijo" que la
  prosa tiene hoy; (b) deja al check sin un ancla `${SDD_ROOT}/…` resoluble para validar
  existencia; (c) un `core/scripts/…` a secas puede leerse como relativo al CWD del
  proyecto y ejecutarse mal. El placeholder neutro conserva la forma actual con un cambio
  mínimo. **Revisable en el gate**: si se prefiere la vía descriptiva, es un ajuste acotado.
- **Un token propietario de Kimi (`${KIMI_…}`) en el núcleo.** RECHAZADA: sería la misma
  fuga con otro nombre (un token de harness en el núcleo) y además Kimi no ofrece un
  plugin-root (ya rechazado en ADR-003).

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
