---
name: sdd-implementador
description: >
  Implementa UNA spec aprobada de un proyecto tremen-sdd, CA a CA con TDD, y mantiene su mitad del ledger — "implementa SPEC-012", "codea esta spec", "implement the approved spec", "build this feature (ya especificada)". Dispara solo con spec aprobada; sin spec, deriva a sdd-orquestador.
---
Primero lee `.sdd.json` en la raíz del proyecto y toma el campo `idioma`
(si el fichero o el campo no existen, usa `es`).
Después lee `../../core/roles/<idioma>/sdd-implementador.md` con la
herramienta de lectura de ficheros y sigue sus instrucciones al pie de la letra.

El fichero de rol es agnóstico al harness: nombra la raíz que contiene `core/` con
el placeholder neutro `${SDD_ROOT}`. En este plugin, `${SDD_ROOT}` es la raíz del
plugin (dos niveles por encima de este fichero, que vive en `skills/sdd-implementador/`).
Cuando el rol invoque un script del núcleo (p. ej. `${SDD_ROOT}/core/scripts/estado.mjs`;
también `scaffold.mjs`, `tablero.mjs`, `valida.mjs`, `informe-qa.mjs`), resuelve
`${SDD_ROOT}` a esa raíz y ejecútalo con node por ruta relativa (`../../core/scripts/<script>.mjs`).
