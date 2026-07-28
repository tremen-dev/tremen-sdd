---
tipo: roadmap
---
# Roadmap — tremen-sdd

> Curado por sdd-producto. Secuencia de épicas, horizonte y criterios de corte.
> El estado fino por spec vive en el tablero; aquí vive la INTENCIÓN.

## Ahora (en curso)
- **EPIC-004 — Distribución del artefacto a runtime**: que un equipo de
  tremen.dev instale y actualice tremen-sdd en su harness **sin clonar el repo ni
  construir nada**. Sube de "Después" a "Ahora" (2026-07-27) y va **detrás del
  cierre de EPIC-003**: los tres adaptadores ya existen y son construibles, pero
  ninguno es *instalable* — el equipo interno que empujó EPIC-003 no tiene forma
  de usarlo salvo clonando. Es, además, la última pieza `[ABIERTO]` de
  `contexto.md` que no depende de terceros (SPEC-013 sí depende de la cuenta de
  Kimi). Audiencia decidida en el gate: **interna**; la apertura a terceros que
  la visión deja como puerta abierta no entra. Canal: GitHub de la organización.
  **Estado (2026-07-28)**: SPEC-016 `hecho` — el mecanismo existe, `v0.5.0` está
  construida y preparada, pendiente solo del push que la publica. Quedan las
  specs de automatización en CI, procedimientos por harness y trazabilidad.
- **EPIC-005 — Fundación y documentación sin drift**: que la fundación, el
  glosario y la puerta de entrada digan lo que el repo es, y que dejar de
  decirlo vuelva a costar trabajo. Entra en "Ahora" (2026-07-28) **junto a
  EPIC-004, no por delante**: se alimenta de ella —CE-3 documenta la instalación
  que EPIC-004 acaba de hacer posible— y llega ahora porque por primera vez va a
  leer el README gente que no ha clonado el repo.
  El diagnóstico lo produjeron EPIC-003 y EPIC-004 al ejercerse: quince
  discrepancias localizadas con fichero y línea, tres de ellas en el glosario que
  define los términos del método. La causa raíz es estructural y es lo que
  convierte esto en épica y no en una tanda de correcciones: **`core/` tiene
  nueve checks vigilándolo y la fundación no tiene ninguno**.

## Cerradas
- **EPIC-003 — Adaptador opencode con paridad completa** — `hecho` 2026-07-27
  (Alberto Fojo), **cerrada limpia**: los 4 criterios cumplidos, 5 specs en
  `hecho`. CE-1/CE-2/CE-3 los cerró SPEC-014 ejerciendo el pipeline completo
  contra el CLI real de opencode 1.18.5, en dos rondas. CE-4 lo cierra SPEC-015:
  la guía "Añadir un harness" incorpora opencode y registra seis desviaciones.
  Tercer harness operativo sobre el mismo núcleo, sin que `core/` ganara una sola
  dependencia hacia opencode.
  **Lo que esta épica desmintió, y conviene no olvidar**: la promesa de EPIC-001
  CE-5 de que añadir un harness es "una lista cerrada de piezas de adaptador"
  nunca fue cierta — `package.json`, `tools/check.mjs`, `tools/checks/*` y
  `tools/tests/*` se tocaron **las tres veces**. La guía lo dice ahora por
  escrito, con una segunda lista explícita de puntos de integración. La promesa
  que sí aguanta, verificada tres veces por el check `nucleo-aislado`, es la
  otra: **sin tocar el núcleo**.
  Residual heredado, no creado aquí: la deuda de `layout.mjs` (F-SPEC-015-2) sale
  a EPIC-FIX con spec propia.
- **EPIC-002 — Higiene del proceso y tooling del método** — `hecho` 2026-07-27
  (Alberto Fojo), **cerrada limpia**: los 4 criterios cumplidos con evidencia.
  CE-1, barrera estructural de gates ejercida adversarialmente (SPEC-006); CE-2,
  el tablero indexa los 9 ADRs (SPEC-007); CE-3, `linter:"auto"` sin config ya no
  invoca al linter (SPEC-008, adversarial contra `dist/`); CE-4, verificado
  contra el run de CI 30250203839 en `main` — `checkout@v7`/`setup-node@v7`/node
  22, cero avisos de deprecación.
  **Matiz honesto sobre CE-3**: está arreglado en el **fuente**, no en el runtime
  instalado — el propio ledger de SPEC-008 anota que el hook `calidad.mjs`
  cacheado seguía ladrando durante la implementación. No es residual de esta
  épica (su alcance era el fuente): es precisamente la carencia que **EPIC-004**
  existe para eliminar. EPIC-002 ya declaraba la deuda de distribución fuera de
  alcance con la frase "mayor, su propia épica"; esa épica es EPIC-004.

## Cerradas (con residual)
- **EPIC-001 — tremen-sdd multi-harness** — `hecho` 2026-07-26 (Alberto Fojo),
  **cerrada con residual**. 5 specs en `hecho` y 4/5 criterios cumplidos; el
  adaptador Kimi está construido, aprobado y con smoke test (SPEC-003). **CE-2 NO
  se verificó en runtime**: ejercer el pipeline end-to-end contra el **CLI real de
  Kimi** quedó bloqueado por dependencia externa (no hay cuenta de Kimi Code; el
  plan gratuito no da acceso). No se marca como cumplido: es residual explícito,
  rastreado por **SPEC-013** (`bloqueada`) — ver follow-up abajo.

## Después (comprometido, sin empezar)
- **Verificación de CE-2 contra el CLI real de Kimi** (follow-up del cierre de
  EPIC-001): ejecutar **SPEC-013** (escrita y aprobada, hoy `bloqueada`) el día que
  haya una cuenta de Kimi Code disponible. Cierra el único residual con el que se
  cerró EPIC-001. Depende de: acceso a Kimi Code.

## Más adelante (idea, sin compromiso)
- **Aislamiento de la fuente para quien instala**: que quien recibe acceso para
  instalar tremen-sdd **no** pueda leer el árbol de fuentes. Nace el 2026-07-27
  al retirarse de CE-1 de EPIC-004: el humano eligió publicar en una rama del
  repo fuente (ADR-010), y GitHub concede lectura por repositorio, no por rama.
  Sube el día que haya audiencia externa —donde deja de ser higiene y pasa a ser
  requisito— o si un equipo interno necesita instalar sin ver el método por
  dentro. El mecanismo que lo resolvería (repo de distribución dedicado, 100%
  generado) está descrito y descartado en ADR-010: retomarlo es barato porque el
  análisis ya está hecho.
- **Bolsa de mejoras menores sin épica** (destino de follow-ups que se anotaron
  contra un "EPIC-MEJORA" que nunca existió). Hoy contiene: **F-SPEC-008-1** —
  `tieneConfig()` solo mira la raíz del proyecto, así que una config de linter
  heredada de un monorepo padre o en subdirectorio se trata como "sin config"
  (fail-safe silencioso, comportamiento deseado hoy). Sube a épica el día que un
  proyecto usuario lo necesite de verdad, no antes.
- **Distribución pública / a terceros**: registro público, comercialización y
  soporte externo. La visión deja la puerta abierta explícitamente ("puerta
  abierta, no compromiso adquirido") y EPIC-004 la deja **fuera de alcance** a
  propósito. Sube el día que haya un tercero concreto pidiéndolo, no antes.

## Criterios de corte
<!-- Qué haría subir o bajar una épica de sección. -->
