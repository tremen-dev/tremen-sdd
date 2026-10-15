---
name: sdd-orquestador
description: >
  Entrada y router de todo trabajo en proyectos tremen-sdd. Úsalo al inicio de CUALQUIER petición de trabajo — "construye X", "añade Y", "arregla Z", "haz la épica entera", "drive this epic/task" — para clasificarla, localizar o encargar su spec y conducir el pipeline (producto → arquitecto → implementador → verificador) con sus gates humanos. Dispara siempre que llegue trabajo y no esté claro qué spec lo gobierna.
---
Primero lee `.sdd.json` en la raíz del proyecto y toma el campo `idioma`
(si el fichero o el campo no existen, usa `es`).
Después lee `../../core/roles/<idioma>/sdd-orquestador.md` con la
herramienta de lectura de ficheros y sigue sus instrucciones al pie de la letra.

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
