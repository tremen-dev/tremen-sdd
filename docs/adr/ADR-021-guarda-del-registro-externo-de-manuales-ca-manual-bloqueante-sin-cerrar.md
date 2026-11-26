---
id: ADR-021
tipo: adr
estado: aprobada
historial:
  - {estado: borrador, fecha: 2026-11-26, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-11-26, por: Alberto Fojo}
aprobada-por: Alberto Fojo
---
# ADR-021: Guarda del registro externo de manuales: CA manual bloqueante sin cerrar

- Deciders: propone sdd-arquitecto el 2026-11-26. Recoge tres decisiones que Alberto Fojo
  tomó ese día en el gate de SPEC-032 (sección «Decisiones del gate», puntos 1, 2 y 3).
  Falta que el humano apruebe este ADR.
- Specs relacionadas: **SPEC-032** (EPIC-008) lo materializa en su CA-9.
  - **Supersede parcialmente ADR-020 §9**, solo en la frase de la guarda de
    `registroManuales` («`estado.mjs … en-revision` falla cuando la spec tiene un CA
    manual bloqueante en `⏳` y su id no aparece en ese fichero»). El resto de ADR-020
    sigue vigente, §9 incluido: las dos claves, que sean strings no vacíos, su entrada en
    el esquema de ADR-019 y para qué sirve `recetaManuales`. ADR-020 queda como registro
    inmutable (RN-04) y no se edita, igual que ADR-001 con ADR-010 y ADR-013 con ADR-014.
  - Se apoya en ADR-017: ante la duda sobre la configuración, el gate se cierra.

## Contexto

ADR-020 §9 dice que, con `registroManuales` declarado, `en-revision` falla si la spec
tiene un CA manual bloqueante **en `⏳`** cuyo id no aparece en el registro. Leída al pie
de la letra, la guarda casi nunca actúa la primera vez que una spec entra en
`en-revision`. El Estado de la matriz lo escribe el verificador, y lo escribe después de
esa transición. Hasta entonces los manuales siguen como los deja la plantilla del ledger,
en `❌`, y no en `⏳`. La guarda solo actuaría en una vuelta posterior, cuando ya no evita
lo que quería evitar: llegar a revisión sin la prueba manual registrada.

La frase deja abiertas otras dos cosas: qué id tiene que aparecer en el registro (el del
CA solo choca entre specs) y qué pasa si el registro declarado no existe.

## Decisión

Con `registroManuales` declarado en `.sdd.json`, `estado.mjs … en-revision` se niega si la
spec es del modelo (ADR-020 §11) y alguno de sus CA manuales bloqueantes **no está
cerrado** y no tiene entrada en el registro.

1. **Sin cerrar** es cualquier Estado que no cierre según `estadoCierra`, el mismo lector
   que usa la guarda de `hecho` (ADR-020 §5):
   - cierran `✅` con calificadores válidos y `n-a`;
   - no cierran `❌`, `⚠️`, `🚧`, `⏳`, la celda vacía, la fila ausente de la matriz ni
     `✅` con calificadores inválidos.

   Los CA con `bloquea-hecho: no` no cuentan.
2. **Entrada del registro**: un CA tiene entrada cuando una misma línea del fichero
   contiene el id de la spec y el del CA, los dos como palabras completas (`CA-2` no casa
   con `CA-20`, y `SPEC-032` no casa con `SPEC-0321`). No hay formato fijo de línea.
3. **Registro declarado pero inexistente**: `en-revision` se niega. Es el lado seguro,
   como un `.sdd.json` ilegible en ADR-017.

Sin `registroManuales` declarado no cambia nada.

## Consecuencias
### Positivas
- La guarda actúa en la primera entrada a `en-revision`, que es cuando sirve.
- `en-revision` y `hecho` usan un solo criterio de «cerrado» (`estadoCierra`), y no dos
  que puedan divergir.
- Los proyectos pueden llevar el registro en el formato que ya usen, sin chocar entre
  specs.

### Negativas / follow-ups
- Es más estricta que la letra de ADR-020 §9: un CA manual bloqueante en `❌` también
  necesita su línea en el registro antes de `en-revision`. Es lo que se busca, pero el
  implementador tiene que registrar la prueba antes de pedir revisión, y no después.
- Un registro que falta bloquea `en-revision` aunque el fallo sea de configuración. El
  mensaje de error tiene que nombrar la ruta declarada.
- SPEC-032 describe esta decisión como «interpretación de §9» en su sección «Decisiones
  del gate». Está aprobada y no se edita aquí. Ver el informe al humano.

## Alternativas consideradas
- **Dejar la letra de §9 (solo `⏳`).** Rechazada: la guarda casi nunca actuaría la
  primera vez, por el orden en que se escribe el Estado (ver Contexto).
- **Mantenerla como interpretación de SPEC-032 sin ADR.** Rechazada: un ADR aceptado
  diría una cosa y el código haría otra, y la próxima spec que lea §9 lo reabriría.
- **Entrada con solo el id del CA.** Rechazada: `CA-2` existe en casi todas las specs.
- **Formato fijo de línea en el registro.** Rechazada: obliga a los proyectos a cambiar un
  registro que ya llevan, y no aporta nada a la guarda.
- **Registro inexistente = registro vacío, o la guarda no se aplica.** Rechazada: dejar
  pasar un gate por un fallo de configuración es fail-open (ADR-017).

<!-- REGLA: un ADR aceptado es INMUTABLE. Para cambiar la decisión, escribe otro ADR que lo supersede (estado del viejo -> bloqueada + nota "superseded por ADR-NNN"). -->
