---
id: ADR-008
tipo: adr
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-07-25, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-07-25, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# ADR-008: Politica del prefijo de plugin en la identidad de rol de protege-verdad

- Deciders: propone sdd-arquitecto; **la decisión de fondo ya la tomó el humano**
  (Alberto Fojo) — este ADR la deja argumentada por escrito, como exigió el gate
  ("decídelo y déjalo escrito, no solo en el commit"). Aprobación formal del ADR:
  pendiente, gate humano (RN-09).
- Specs relacionadas: **SPEC-012** (protege-verdad deniega al dueño con prefijo de
  plugin) lo materializa y lo cita como fuente de la política. **Complementa**
  ADR-002 (enforcement en capas L1/L2/L3) y ADR-006 (anatomía de un gate: atribución
  rol-vs-persona); **NO** los supersede. Origen: EPIC-FIX / SPEC-012.

## Contexto

El hook `protege-verdad` (RN-08: los documentos de verdad tienen dueño único) decide
si quien escribe `FOUNDATION.md` o `docs/fundacion/*` es dueño comparando la identidad
de rol contra `DUENOS_FUNDACION = ['main','sdd-arquitecto','sdd-producto']`.

Un subagente de plugin no llega con el nombre desnudo del rol, sino **prefijado por el
harness**: en Claude Code `payload.agent_type === "tremen-sdd:sdd-arquitecto"`. El
plugin publicado 0.3.0 comparaba el `agent_type` **crudo** contra la lista (ver
`~/.claude/plugins/cache/tremen-sdd/tremen-sdd/0.3.0/hooks/protege-verdad.mjs`, línea
18: `const rol = payload.agent_type ?? payload.agent_name ?? 'main';`), de modo que el
dueño legítimo `tremen-sdd:sdd-arquitecto` **no casaba** y era denegado. Como el
estándar manda que `sdd-arquitecto`/`sdd-producto` corran **como subagentes**, en la
práctica los documentos de verdad solo se podían tocar desde `main`, empujando a rodear
el gate con `SDD_SKIP_GATE=1` (ver SPEC-012 para el detalle del defecto y su reparación).

La reparación acordada es **normalizar** la identidad quitando el prefijo de plugin.
En la fuente 0.4.0 ya existe `normalizaRol()` en `adapters/claude-code/hooks/_comun.mjs`,
que hace `agentType.slice(agentType.lastIndexOf(':') + 1)` — se queda con **el segmento
tras el último `:`**, sea cual sea el prefijo. Eso abre una pregunta de política que hay
que fijar por escrito: **¿qué se hace con un prefijo AJENO** — p. ej. `foo:sdd-arquitecto`,
emitido por un plugin/harness distinto de `tremen-sdd`—**?** Con `lastIndexOf(':')` ese
`foo:sdd-arquitecto` normaliza a `sdd-arquitecto` y **pasaría** el gate como dueño.

Este ADR fija esa política. No cambia el comportamiento del gate más allá de la
normalización ya acordada; documenta la consecuencia y por qué se acepta.

## Decisión

**Se acepta CUALQUIER prefijo de plugin en la identidad de rol: la normalización se
queda con el nombre de rol desnudo tras el último `:`, venga del plugin que venga
(`lastIndexOf(':')`). NO se restringe la normalización a un prefijo `tremen-sdd:`
concreto.**

Consecuencia explícita asumida: una identidad `foo:sdd-arquitecto` — un plugin ajeno
llamado `foo` que exponga un agente llamado `sdd-arquitecto` corriendo en el mismo
proyecto — **normalizaría a `sdd-arquitecto` y sería tratada como dueño** por
`protege-verdad`.

Se acepta por tres motivos, en orden de peso:

1. **`protege-verdad` protege una convención LOCAL, no es una frontera de seguridad.**
   La garantía dura de "quién puede cambiar qué" no vive en un hook de harness, sino en
   git pre-commit (L2) + CI (L3), independientes del harness (ADR-002, RN-03). El hook
   es **higiene de proceso dentro de una sesión** (evitar que un rol se salte su carril
   y escriba en vez de proponer), no un control de acceso frente a un actor hostil. Un
   agente hostil no necesita disfrazar su `agent_type`: ya puede intentar
   `SDD_SKIP_GATE=1`, editar fuera de sesión, o hacer commit directo — y ahí es L2/L3
   quien decide, no este hook.

2. **El escenario del prefijo ajeno es remotísimo.** Requiere que en el MISMO proyecto
   corra un plugin/harness DISTINTO que **además** exponga un agente **llamado
   exactamente** `sdd-arquitecto`/`sdd-producto`/`main` (los nombres de rol de este
   estándar). No es un vector que ocurra por accidente; y si ocurriera a propósito, cae
   en el punto 1 (no es aquí donde se detiene a un actor que ya controla la sesión).

3. **La simplicidad gana.** `lastIndexOf(':')` es una línea, sin estado ni
   configuración del nombre de plugin, y es idéntica en los tres adaptadores
   (`normalizaRol` en claude-code, `sinPrefijo` en kimi-code; opencode no compara
   identidad de rol, ADR-007 [H3]). Anclar la comparación a un prefijo `tremen-sdd:`
   literal acoplaría el hook al nombre de empaquetado del plugin (que ya varía por
   harness y podría variar por fork), introduciría un caso "prefijo reconocido vs no
   reconocido" que hoy no existe, y **no compraría seguridad real** (punto 1).

**Retrocompatibilidad e identidades sin prefijo.** La normalización es un no-op para el
nombre desnudo (`sdd-arquitecto` → `sdd-arquitecto`), para `main` y para `undefined`
(fail-open cuando el harness no aporta identidad, como Kimi — ADR-003, ADR-007 [H3]).
Los dueños ya reconocidos siguen reconocidos.

## Consecuencias
### Positivas
- **El dueño legítimo deja de ser bloqueado** cuando corre como subagente de plugin
  (`tremen-sdd:sdd-arquitecto` → dueño), que es el defecto que SPEC-012 repara.
- **Regla única y uniforme entre adaptadores**: misma semántica `lastIndexOf(':')` sin
  configurar el nombre del plugin; menos superficie y menos divergencia.
- **Sin acoplar el hook al nombre de empaquetado** (`tremen-sdd`), que varía por harness
  y por fork.

### Negativas / follow-ups
- **Un `foo:sdd-arquitecto` de un plugin ajeno pasaría el gate** (consecuencia asumida
  arriba). Aceptada por los tres motivos; mitigada por L2/L3, que es donde vive la
  garantía dura (ADR-002).
- Si algún día un harness usara `:` DENTRO del nombre de rol, `lastIndexOf(':')` se
  quedaría con el último segmento; hoy ningún rol del estándar contiene `:` (los roles
  son `sdd-*` y `main`), así que no aplica. Queda anotado por si un harness futuro lo
  introdujera.

## Alternativas consideradas
<!-- Cada una con el motivo de rechazo. -->
- **Restringir la normalización a un prefijo `tremen-sdd:` literal** (solo se pela el
  prefijo si es el del propio plugin; cualquier otro prefijo NO se reconoce como dueño).
  RECHAZADA: acopla el hook al nombre de empaquetado (varía por harness/fork), añade un
  caso "prefijo ajeno = no dueño" que hoy no existe, y **no compra seguridad real**
  porque el hook no es la frontera (la frontera es git/CI, ADR-002). El escenario que
  protegería (plugin ajeno con un agente llamado `sdd-arquitecto` en el mismo proyecto)
  es remotísimo y, si es hostil, ya lo cubre L2/L3.
- **Mantener el prefijo y ampliar `DUENOS_FUNDACION` con las variantes prefijadas**
  (`tremen-sdd:sdd-arquitecto`, …). RECHAZADA: la lista tendría que enumerar cada
  combinación harness×rol y crecería con cada adaptador; es exactamente el acoplamiento
  que la normalización elimina.
- **No hacer nada y documentar `SDD_SKIP_GATE=1` como vía del dueño.** RECHAZADA de
  plano: convierte un agujero (saltarse TODOS los gates de verdad) en procedimiento, y
  no distingue al dueño legítimo del intruso. Es justo lo que el defecto empujaba a
  hacer y lo que SPEC-012 elimina.

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
