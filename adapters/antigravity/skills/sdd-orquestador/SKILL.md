---
name: sdd-orquestador
description: >
  Entrada y router de todo trabajo en proyectos tremen-sdd. Úsalo al inicio de CUALQUIER petición de trabajo — "construye X", "añade Y", "arregla Z", "haz la épica entera", "drive this epic/task" — para clasificarla, localizar o encargar su spec y conducir el pipeline (producto → arquitecto → implementador → verificador) con sus gates humanos. Dispara siempre que llegue trabajo y no esté claro qué spec lo gobierna.
---
Primero comprueba si existe `.sdd.json` en la raíz del proyecto:
- Si `.sdd.json` NO existe: `tremen-sdd` no está activo en este repositorio.
  PARA inmediatamente:
  - Si esta skill se activó automáticamente ante una petición genérica (p. ej.
    "arregla este bug", "añade X"), sal del flujo `tremen-sdd` y atiende la
    petición de forma estándar sin mencionar ni aplicar `tremen-sdd`.
  - Si el usuario invocó explícitamente un rol o comando de `tremen-sdd`, informa
    de que no existe `.sdd.json` (`tremen-sdd` no está activado) y sugiere
    ejecutar `/sdd-init`.
  No leas el rol, no ejecutes scripts ni lances subagentes.
- Si `.sdd.json` SÍ existe: toma el campo `idioma` (si no está definido en
  `.sdd.json`, usa `es`). Después lee
  `../../core/roles/<idioma>/sdd-orquestador.md` con la herramienta de lectura
  de ficheros y sigue sus instrucciones al pie de la letra.

El fichero de rol es agnóstico al harness: nombra la raíz que contiene `core/` con
el placeholder neutro `${SDD_ROOT}`. En este plugin, `${SDD_ROOT}` es la raíz del
plugin (dos niveles por encima de este fichero, que vive en `skills/sdd-orquestador/`).
Cuando el rol invoque un script del núcleo (p. ej. `${SDD_ROOT}/core/scripts/estado.mjs`;
también `scaffold.mjs`, `tablero.mjs`, `valida.mjs`, `informe-qa.mjs`), resuelve
`${SDD_ROOT}` a esa raíz y ejecútalo con node por ruta relativa (`../../core/scripts/<script>.mjs`).

En Google Antigravity, la delegación de los roles pesados (`sdd-arquitecto`, `sdd-implementador`,
`sdd-verificador`, `sdd-documentalista`) se realiza EXCLUSIVAMENTE mediante la herramienta
`invoke_subagent` con `TypeName: "self"`:

    invoke_subagent({
      "Subagents": [{
        "TypeName": "self",
        "Role": "sdd-<rol>",
        "Prompt": "<encargo exhaustivo y autosuficiente: id de spec, rama, ficheros, expectativas>"
      }]
    })

Espera el informe final del subagente mediante `send_message` antes de avanzar al siguiente
paso del pipeline. Los roles dialógicos directos (`sdd-producto`, `sdd-como-vamos`) corren
en este contexto principal.
