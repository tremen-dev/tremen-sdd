---
id: EPIC-003
tipo: epica
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-07-22, por: sdd-producto}
  - {estado: aprobada, fecha: 2026-07-22, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# EPIC-003 — Adaptador opencode con paridad completa

## Objetivo
Dar soporte de primera clase a **opencode** como tercer harness de tremen-sdd,
para que un equipo interno de tremen.dev que ya trabaja (o va a trabajar) con
opencode pueda operar SDD con la misma disciplina que en Claude Code, sin
reimplementar el método.

Por qué ahora: hay una **necesidad interna real** —un equipo esperando usarlo—,
no un ejercicio de portabilidad. Sube por encima de la Distribución (comprometida
para "Después") porque tiene un usuario concreto empujando. Va *después* de
EPIC-002 (higiene del proceso) para no construir el tercer adaptador sobre un
pipeline que aún tiene defectos de proceso conocidos, y porque EPIC-001 sigue
bloqueada por una dependencia externa (cuenta/plan de Kimi), no por trabajo
pendiente aquí.

Este es, además, el primer test real de la promesa CE-5 de EPIC-001 ("añadir un
harness nuevo es una lista cerrada de piezas de adaptador, sin tocar el núcleo").
Si añadir opencode obliga a tocar el núcleo, esta épica lo destapará.

## Criterios de éxito
<!-- Medibles. Cómo sabremos que la épica cumplió su promesa. -->
- **CE-1 (pipeline completo en opencode)**: un mismo proyecto SDD se opera de
  principio a fin desde opencode —init → épica → spec → implementación →
  verificación— apoyándose en el mismo núcleo agnóstico, sin caminos que pasen
  por Claude Code ni Kimi. Se mide ejerciendo el flujo real contra el CLI de
  opencode, no solo en teoría.
- **CE-2 (paridad de roles y comandos)**: los cinco roles (producto, arquitecto,
  implementador, verificador, documentalista) y sus comandos están disponibles y
  operativos en opencode, consumiendo la MISMA fuente única de prosa de `roles/`
  —sin copiarla— igual que hacen los otros adaptadores.
- **CE-3 (enforcement real, no degradado)**: la garantía "nada se codea sin spec
  aprobada" se sostiene desde opencode con la misma dureza que en Claude Code:
  gate en el flujo del harness cuando opencode lo permita, y en todo caso el
  cinturón de seguridad de git pre-commit + CI (require-spec, valida, calidad).
  Se mide con un intento real de codear sin spec que queda bloqueado.
- **CE-4 (coste de adaptador acotado y documentado)**: todo lo nuevo vive bajo
  `adapters/opencode/`; el núcleo no gana ni una dependencia hacia opencode
  (mismo check de CI de aislamiento que EPIC-001 CE-1 sigue en verde). El coste
  real se compara contra la *Guía añadir un harness* y cualquier desviación se
  registra como corrección de esa guía.

## Alcance
- Dentro:
  - Adaptador `adapters/opencode/`: manifiesto/config del harness, definición de
    los cinco agentes/roles y sus comandos, y el cableado de hooks o su
    equivalente en opencode.
  - Enforcement duro operativo desde opencode (gate en flujo si el harness lo
    soporta + git pre-commit + CI como red que no depende del harness).
  - Ejercer el pipeline completo contra el CLI real de opencode como evidencia de
    CE-1.
  - Actualizar la *Guía añadir un harness* con lo aprendido y con opencode como
    segundo caso trabajado.
- Fuera (aparcado a propósito, no por descuido):
  - Adaptadores para Gemini CLI, Cursor y Codex: siguen fuera; opencode no los
    arrastra.
  - Distribución del artefacto a runtime de usuarios finales: es su propia épica
    (comprometida en "Después"), no entra aquí.
  - Soporte multi-idioma de roles: sigue siendo solo `es`.
  - Reescribir la lógica de scripts, `lib` o la máquina de estados: se reutilizan
    tal cual; si opencode exige tocarlos es un hallazgo a elevar, no alcance.
  - Elegir modelo/plan de facturación de opencode: es decisión de uso del equipo,
    no de la herramienta.

## Specs
<!-- El estado por spec vive en el frontmatter de cada spec; el tablero agregado se regenera con /sdd-tablero (docs/tablero.md). No mantengas listas de specs a mano aquí. -->
Desglose orientativo (lo autora sdd-arquitecto, no es vinculante):

| # | Spec candidata | Entrega |
|---|---|---|
| 1 | Estudio de capacidades de opencode | Mapa de lo que opencode ofrece (agentes, comandos, hooks/MCP, config) contra lo que el adaptador necesita; alimenta el ADR de cómo encaja el enforcement. |
| 2 | Adaptador opencode: roles y comandos | Los cinco roles y sus comandos operativos en opencode, apuntando a la prosa de `roles/`; sin duplicar system prompt. |
| 3 | Enforcement desde opencode | Gate en flujo si opencode lo soporta; en todo caso require-spec/valida/calidad garantizados por git + CI también para este harness. |
| 4 | Ejercicio del pipeline real | Correr init→épica→spec→impl→verificación contra el CLI de opencode; evidencia de CE-1. |
| 5 | Guía "añadir un harness", 2ª pasada | Corregir/ampliar la guía con opencode como caso trabajado y medir el coste real de CE-4. |

> Decisión técnica pendiente de ADR (sdd-arquitecto): cómo modela opencode los
> hooks/gate del flujo y si su enforcement en-harness llega a la dureza del de
> Claude Code o si toda la garantía recae en git + CI. El estudio (#1) precede al
> resto.
>
> **Restricción de método (indispensable)**: el estudio de capacidades y todo el
> diseño del adaptador se basan en documentación **real y vigente** de opencode
> (docs oficiales, changelog, config real del CLI), no en conocimiento del modelo.
> opencode evoluciona rápido: cualquier afirmación sobre sus hooks/agentes/config
> se cita con su fuente y su fecha, o se marca como hipótesis a verificar contra
> el CLI.

## Riesgos
- **Modelo de enforcement de opencode desconocido**: si opencode no ofrece hooks
  equivalentes, la garantía en-harness se degrada y todo el peso cae en git + CI.
  Mitiga: CE-3 acepta explícitamente git + CI como red suficiente; el estudio #1
  lo aclara antes de comprometer diseño.
- **Fuga de acoplamiento al núcleo**: que un detalle de opencode se cuele en el
  núcleo "por comodidad". Mitiga: el check de aislamiento de CI (EPIC-001 CE-1)
  sigue vigilando; CE-4 lo exige explícito.
- **La Guía añadir un harness no sobrevive al contacto**: puede que la guía de
  EPIC-001 no baste para opencode. No es fallo: es precisamente lo que esta épica
  mide y corrige (CE-4, spec #5).
- **Necesidad interna sin fecha firme**: si el equipo que la pide no la ejerce, el
  CE-1 (pipeline real) se queda sin quien lo valide de verdad. Mitiga: confirmar
  un usuario/proyecto piloto concreto antes de cerrar la épica.
- **Dependencia de CLI externo para la evidencia**: como con Kimi, ejercer el CLI
  real puede requerir cuenta/instalación; a diferencia de Kimi, opencode es
  open-source y de instalación libre, lo que reduce (no elimina) el riesgo de
  bloqueo.
