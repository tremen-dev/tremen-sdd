---
name: sdd-como-vamos
description: >
  Informe read-only del estado de un proyecto tremen-sdd: qué espera al humano, qué está en curso o bloqueado, y las specs "cerradas con residual" — "¿cómo vamos?", "¿qué queda?", "estado del proyecto", "what's left", "project status". No escribe nada: lee frontmatters, ledgers y roadmap, y reporta.
---
Primero lee `.sdd.json` en la raíz del proyecto y toma el campo `idioma`
(si el fichero o el campo no existen, usa `es`).
Después lee `../../core/roles/<idioma>/sdd-como-vamos.md` con la
herramienta de lectura de ficheros y sigue sus instrucciones al pie de la letra.

El fichero de rol es agnóstico al harness: nombra la raíz que contiene `core/` con
el placeholder neutro `${SDD_ROOT}`. En este plugin, `${SDD_ROOT}` es la raíz del
plugin (dos niveles por encima de este fichero, que vive en `skills/sdd-como-vamos/`).
Cuando el rol invoque un script del núcleo (p. ej. `${SDD_ROOT}/core/scripts/estado.mjs`;
también `scaffold.mjs`, `tablero.mjs`, `valida.mjs`, `informe-qa.mjs`), resuelve
`${SDD_ROOT}` a esa raíz y ejecútalo con node por ruta relativa (`../../core/scripts/<script>.mjs`).
