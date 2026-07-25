# Changelog

Todas las versiones notables de tremen-sdd se documentan aquí.
El formato sigue el espíritu de [Keep a Changelog](https://keepachangelog.com/)
y el versionado es [SemVer](https://semver.org/lang/es/).

## [0.3.1] - 2026-07-25

### Corregido

- **El gate `protege-verdad` denegaba al DUEÑO legítimo de los documentos de
  verdad cuando corría como subagente de plugin.** Desde **0.3.0**, el
  arquitecto (`sdd-arquitecto`) y el Product Owner (`sdd-producto`) —los dueños
  de `FOUNDATION.md` y `docs/fundacion/*`— quedaban **DENEGADOS** al intentar
  editar sus propios documentos si actuaban como subagente de plugin.
  - **Síntoma:** al escribir un documento del que ERES dueño, el hook responde
    "es un documento de verdad (dueños: sdd-arquitecto, sdd-producto). Propón el
    cambio en tu informe en vez de escribirlo." — pese a ser justo uno de esos
    dueños.
  - **Causa raíz:** un subagente de plugin llega con la identidad de rol
    **prefijada por el plugin** (`agent_type === "tremen-sdd:sdd-arquitecto"`),
    y el gate comparaba ese `agent_type` **crudo, sin normalizar**, contra la
    lista de dueños (`['main','sdd-arquitecto','sdd-producto']`). El prefijo
    impedía la coincidencia, así que el dueño legítimo caía en la rama de deny.
  - **Corrección:** el gate ahora **normaliza** la identidad de rol quedándose
    con el segmento tras el último `:` antes de comparar (política de ADR-008,
    plugin-agnóstica; no-op para nombres sin prefijo, `main` y `undefined`).
    Los no-dueños (con o sin prefijo) siguen denegados; el resto de reglas
    (tablero generado, fail-open sin `.sdd.json`, `SDD_SKIP_GATE`) no cambia.

### Nota de actualización (léela si estás en 0.3.0)

Si en **0.3.0** eres arquitecto o Product Owner y el hook te deniega editar un
documento del que eres dueño (`FOUNDATION.md`, `docs/fundacion/*`), **eso es un
BUG, no una regla**. El mensaje "es un documento de verdad… propón el cambio en
tu informe" está pensado para roles NO dueños; a ti, como dueño, no debería
aplicarse.

- **Vía correcta:** **ACTUALIZA a 0.3.1**. El fix restablece tu permiso legítimo
  sin abrir ningún agujero.
- **NO lo rodees con `SDD_SKIP_GATE=1`.** Esa variable **desactiva el gate por
  completo** (para todos los roles y todos los documentos de verdad), no solo
  "tu" caso: convierte un bug acotado en un bypass total del enforcement, y es
  fácil que se quede puesta. Desaconsejado explícitamente. Actualiza en vez de
  saltártelo.

[0.3.1]: https://github.com/tremen-dev/tremen-sdd/releases/tag/v0.3.1
