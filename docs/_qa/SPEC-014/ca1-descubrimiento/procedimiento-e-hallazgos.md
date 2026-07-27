# CA-1 — Instalación y descubrimiento sin marketplace (opencode 1.18.5, 2026-07-27)

## Procedimiento de instalación EFECTIVO (input para la spec #5)

1. `npm run build:opencode` → artefacto autocontenido `dist/opencode/` (núcleo bajo `core/`).
2. En el proyecto destino (fixture con repo git propio):
   `cp -r dist/opencode/. <proyecto>/.opencode/`
   — TODO el artefacto va bajo `.opencode/`, **incluido `opencode.json`**, que queda
   en `.opencode/opencode.json`. opencode lo carga como config de proyecto (los logs
   de arranque muestran la cadena de carga: `~/.config/opencode/{config,opencode}.json*`
   → `<proyecto>/opencode.json` → `<proyecto>/.opencode/opencode.json(c)`).
   Colocarlo ahí (y no en la raíz) es lo que hace que la entrada
   `"plugin": ["./plugins/require-spec.mjs"]` resuelva, porque las rutas de `plugin`
   son relativas al fichero de config que las declara.
3. Overlay del proyecto (opcional, no normativo): `<proyecto>/opencode.json` en la
   raíz con decisiones de uso (aquí: `model`/`small_model` = `opencode/deepseek-v4-flash-free`).
4. Arrancar el CLI en el proyecto. Sin registro adicional: agentes, comandos y skills
   se auto-descubren.

## Resultado del descubrimiento (evidencia en este directorio)

- `agent-list.txt` (`opencode agent list`): los 7 agentes sdd presentes —
  `sdd-orquestador (primary)` y los seis `sdd-* (subagent)`.
- `debug-config-resumen.json` (`opencode debug config`): `command` incluye
  `sdd-init` y `sdd-tablero`; bloque `agent` con los 7 y sus `permission`;
  `permission` global fusionada; `plugin` resuelto a
  `file:///…/.opencode/plugins/require-spec.mjs`.
- `skills-sdd.json` (`opencode debug skill`): las 6 skills `sdd-*` descubiertas
  desde `.opencode/skills/<rol>/SKILL.md`.

## Respuesta a la incógnita literal de [H5]

opencode **auto-descubre** `.opencode/{agents,commands,skills}` del proyecto sin
registro explícito. **Excepción encontrada (lazo RED→GREEN de esta spec):** los
plugins solo se auto-descubren si son `*.ts` o `*.js` (fuente: skill built-in
`customize-opencode` del propio CLI 1.18.5: "Auto-discovered plugins (no config
entry needed): any `*.ts` or `*.js` file in `.opencode/plugin/` or
`.opencode/plugins/`"; confirmado empíricamente con dos plugins-sonda: el
marcador del `.js` se escribió, el del `.mjs` no). El plugin del adaptador es
`.mjs`, así que **no cargaba** con la instalación tal como estaba documentada.

**Arreglo (mínimo, en `adapters/opencode/opencode.json`):** registrar
`"plugin": ["./plugins/require-spec.mjs"]` en el manifiesto del artefacto — la
vía de registro explícito que ADR-007 [H5] ya preveía ("registra el plugin en
`opencode.json` con rutas al artefacto"). Registrado, el `.mjs` carga (sonda
`.mjs` registrada explícitamente → marcador escrito; config resuelta muestra el
plugin). Cubierto por test:
`adapters/opencode/tests/enforcement.test.mjs` — "SPEC-014 CA-1: el manifiesto
registra el plugin .mjs en `plugin`".

## Desviaciones CLI vs doc/estudio (finding de doc, no falla de CA)

- El banner ASCII del CLI sale por **stderr** (ruido en PowerShell; inocuo).
- `opencode run` existe como modo no interactivo con `--agent`, `--command`,
  `--format json`, `-s/--session` (conducción del piloto); el estudio no fijaba
  la mecánica de sesión — se registra aquí como comportamiento efectivo.
- El agente interno `title` usa el `small_model`; con el workspace Zen sin método
  de pago da `AI_APICallError: No payment method` (solo el título de sesión).
  Mitigación operativa: `small_model` = el mismo modelo free en el overlay.
