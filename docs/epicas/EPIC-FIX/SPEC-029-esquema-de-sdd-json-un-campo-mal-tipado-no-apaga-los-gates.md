---
id: SPEC-029
tipo: spec
epica: EPIC-FIX
estado: borrador
aprobada-por:
historial:
  - {estado: borrador, fecha: 2026-10-27, por: sdd-arquitecto}
---
# SPEC-029 — Esquema de sdd-json: un campo mal tipado no apaga los gates

## Problema

SPEC-027 (aprobada) cierra los gates cuando `.sdd.json` no se puede leer o no es un
objeto JSON. Un objeto con campos mal tipados sigue pasando como `valida`, y entonces:
- **`rutasVigiladas` no es array** (`"src/"`) o tiene elementos que no son strings:
  - require-spec lanza dentro de su `try` y el `catch` deja pasar (fail-open);
  - el pre-commit bloquea, pero con un "Error inesperado en el gate" que no nombra el
    campo.
- **`linter` desconocido o no string** (`"biome"`, `1`): `calidad` no encuentra comando y
  no lintea, sin avisar. Es fail-open.
- **`gates` o sus interruptores mal tipados** (`"requireSpec": "false"`): el gate sigue
  activo, al contrario de lo que el fichero declara, y nadie lo dice.
- **`idioma` no string** (`42`): el resolutor de ADR-016 da `es` sin avisar.

El primero viola RN-01 en el carril que debería guardarlo. Es el follow-up que SPEC-027
dejó fuera de alcance, y el humano pidió esta spec en su gate del 2026-10-27. Aplica
**ADR-019**, que amplía el estado `ilegible` de **ADR-017**.

## Usuarios / roles afectados

- **Quien edita `.sdd.json` a mano** en cualquiera de los cuatro harness: un error de
  tipo deja de apagar gates en silencio, y el mensaje nombra el campo.
- **sdd-implementador**: implementa los CA con TDD en `ft/SPEC-029-…`.
- **sdd-verificador**: verifica cada CA contra tests y fixtures.

## Criterios de aceptación

Convenciones de los tests:
- Directorios temporales, nunca el árbol real. Se reutilizan los fixtures y la forma de
  ejecutar hooks y plugin de SPEC-027.
- "El lector" es la función de `core/lib/` de SPEC-027 CA-1. "El texto de CA-4" es el
  mensaje accionable de SPEC-027 CA-4.

### CA-1 — El lector aplica el esquema de ADR-019 §1
- **Given**: el lector, sobre una raíz temporal con cada `.sdd.json` de esta tabla.
- **When**: se llama.
- **Then**:

  | Caso | Contenido | Estado |
  |---|---|---|
  | (a) | la plantilla `core/templates/sdd.json` | `valida` |
  | (b) | `{}` | `valida`: todos los campos toman su valor por defecto |
  | (c) | `{"rutasVigiladas":[]}` | `valida` |
  | (d) | `{"idioma":"zz"}` (string no soportado) | `valida`: el soporte es de ADR-016, no del esquema |
  | (e) | `{"otraClave":1,"gates":{"futuro":true}}` | `valida`: las claves desconocidas se aceptan |
  | (f) | `{"rutasVigiladas":"src/"}` | `ilegible` |
  | (g) | `{"rutasVigiladas":["src/",3]}` y `{"rutasVigiladas":[""]}` | `ilegible` |
  | (h) | `{"linter":"biome"}` y `{"linter":1}` | `ilegible` |
  | (i) | `{"gates":"off"}`, `{"gates":[]}` y `{"gates":{"requireSpec":"false"}}` | `ilegible` |
  | (j) | `{"idioma":42}` | `ilegible` |
  | (k) | cualquiera de los cuatro campos con valor `null` | `ilegible` |

  Los casos con dos o tres variantes se prueban por separado. Para los cinco valores
  válidos de `linter` (`auto`, `none`, `ruff`, `eslint`, `dart`) devuelve `valida`.

### CA-2 — El motivo enumera todos los campos que fallan
- **Given**: `{"rutasVigiladas":"src/","linter":"biome","gates":{"calidad":"no"}}`.
- **When**: se llama al lector.
- **Then**:
  1. El estado es `ilegible`.
  2. El motivo nombra los tres campos (`rutasVigiladas`, `linter` y `gates.calidad`),
     cada uno con lo que se esperaba y lo que se encontró.
  3. No se queda en el primer error.

### CA-3 — Ningún campo mal tipado termina en fail-open
- **Given**: un proyecto temporal en la rama `main`, sin spec, con `.sdd.json`:
  - (a) `{"rutasVigiladas":"src/"}`;
  - (b) `{"rutasVigiladas":["src/"],"linter":"biome"}`.
- **When**:
  1. el gate require-spec de los cuatro adaptadores recibe una escritura sobre
     `src/app.js` y otra sobre el propio `.sdd.json`;
  2. se ejecuta el pre-commit con un fichero en el área de staging.
- **Then**:
  1. En los dos casos, la escritura sobre `src/app.js` se deniega con el formato de cada
     harness (como en SPEC-027 CA-3).
  2. La escritura sobre `.sdd.json` se permite.
  3. El pre-commit sale con código distinto de 0.
  4. El texto de la denegación y del bloqueo es el de CA-4, con el campo que falla como
     motivo. No aparece "Error inesperado".

### CA-4 — `valida.mjs` informa de los errores de esquema
- **Given**: el CLI de `valida.mjs` sobre un proyecto temporal con `.sdd.json`:
  - (a) el de CA-2;
  - (b) `{"idioma":"zz"}`;
  - (c) `{"idioma":42}`;
  - (d) `{"idioma":"zz","linter":"biome"}`.
- **When**: se ejecuta.
- **Then**:
  1. Los cuatro salen con código distinto de 0.
  2. (a) nombra los tres campos de CA-2.
  3. (b) da solo el error de `idioma` no soportado de SPEC-025 CA-6, sin cambios.
  4. (c) da el error de esquema de `idioma`, no el de idioma no soportado.
  5. (d) da los dos: el de esquema de `linter` y el de `idioma` no soportado.
  6. Su comprobación de `.sdd.json` usa el lector. Lo verifica un test de código fuente:
     no hay un segundo `JSON.parse` de `.sdd.json` en `valida.mjs` ni en el resolutor de
     idioma.

### CA-5 — El esquema cubre todo lo que el método lee
- **Given**: el esquema declarado como dato en el módulo del lector (ADR-019 §3).
- **When**: un test de `tools/tests/` busca los accesos a campos de la configuración
  (`cfg.<campo>` y `cfg.gates.<campo>`, con o sin `?.`) en:
  - `adapters/*/hooks/*.mjs` y `adapters/*/plugins/*.mjs`;
  - `tools/githooks/*.mjs`;
  - el código de `core/` que lee `.sdd.json`.
- **Then**:
  1. Cada campo encontrado está en el esquema. Si falta uno, el test falla y nombra el
     campo y el fichero.
  2. La plantilla `core/templates/sdd.json` y el `.sdd.json` de este repo dan `valida`.

### CA-6 — Sin regresión
- **Given**: el árbol tras el cambio.
- **When**: se ejecutan `npm test` y `npm run check`.
- **Then**:
  1. Los dos pasan en verde.
  2. Los tests de SPEC-027 (estados `ausente`, `ilegible` y `valida`, BOM incluido) pasan
     sin cambiar sus aserciones.
  3. `CHANGELOG.md` tiene una entrada que dice qué `.sdd.json` antes aceptados pasan a
     cerrar los gates, desde qué versión, y cómo se arreglan (CE-FIX-2).

### CA-7 — `sdd-init` avisa en migración de un esquema inválido antes de copiar plantillas
- **Given**: los comandos `sdd-init` de los tres adaptadores que lo tienen:
  `adapters/claude-code/commands/sdd-init.md`, `adapters/opencode/commands/sdd-init.md`
  y `adapters/antigravity/commands/sdd-init.md`. Kimi Code no tiene `sdd-init`.
- **When**: se inspecciona el Paso 2 (modo migración) de cada uno, y un test de
  `tools/tests/` lo comprueba sobre el texto de los tres.
- **Then**: el Paso 2 de los tres ordena, en este orden:
  1. si el proyecto ya tiene un `.sdd.json`, comprobar su esquema **antes de copiar
     plantillas o mover ficheros**, ejecutando el CLI de `valida.mjs` y mirando sus errores
     de `.sdd.json` (salen antes que los de artefactos, en el orden de SPEC-025 CA-6);
  2. si hay errores de esquema, enseñarle al humano los campos que fallan, tal como los
     da `valida.mjs`, y no copiar ni mover nada hasta que el `.sdd.json` se corrija o el
     humano decida otra cosa de forma explícita;
  3. no sobrescribir el `.sdd.json` existente con la plantilla para salir del error.

  Además:
  - ninguno de los tres repite en prosa la tabla de tipos de ADR-019 §1: el esquema
    tiene una sola fuente, que es el lector;
  - se mantiene lo que exigen SPEC-024 CA-3.3 (estampar `.sdd.json` antes de llamar a
    los scripts cuando no existe) y SPEC-025 CA-7(c) (avisar de un `idioma` no
    soportado);
  - el test falla, nombrando el fichero, si a alguno de los tres le falta la
    comprobación previa a la copia o la parada ante errores;
  - `checkPrecondicionSdd`, `referencias` y `manifiestos` siguen en verde.

## Entidades y reglas afectadas

- **RN-01**: un campo mal tipado deja de abrir un hueco en el carril de la spec.
- **RN-02**: el esquema y el lector viven en `core/lib/` y solo importan `node:*`.
- **RN-03**: L2 y L3 ven los mismos errores que L1 (CA-3, CA-4).
- **RN-04**: ADR-019 es nuevo. No supersede ADR-016 ni ADR-017.
- **RN-09**: la spec y ADR-019 quedan en `borrador`.
- **RN-10**: el trabajo va en `ft/SPEC-029-…` (`core/lib/` es una ruta vigilada).
- **ADR-002** (matizado por ADR-017), **ADR-016** §2 (`idioma` no soportado),
  **ADR-017** (lector y comportamiento por capa), **ADR-019** (esta decisión).
- Términos de `docs/fundacion/dominio.md`: rutas vigiladas, hook, gate.

## Fuera de alcance

- **La semántica de las rutas**: rutas absolutas, con `..` o que no existen en disco. El
  esquema solo mira tipos.
- **Validar que un `linter` explícito esté instalado**. Hoy ya degrada fail-open, por
  diseño de `calidad` (README).
- **Traducir los mensajes**: entran por el catálogo de SPEC-025 y SPEC-026.

## Notas para el gate humano

1. **Orden**: va **después de SPEC-027**, y por tanto de SPEC-025, que va antes que
   SPEC-027:
   - necesita el lector de SPEC-027 CA-1 y su mensaje de CA-4;
   - CA-4 cambia la comprobación de `.sdd.json` que SPEC-025 añade a `valida.mjs`.

   Su rama se crea desde `origin/main` con SPEC-025 y SPEC-027 dentro. Con SPEC-026 y
   SPEC-028 no hay conflicto de ficheros, salvo la clave nueva en el catálogo si SPEC-026
   ya exige paridad.
2. **Decisiones del humano (Alberto Fojo, 2026-10-27)**, ya incorporadas:
   - **Salida uniforme**: un `linter` mal escrito bloquea igual que cualquier otro campo
     (ADR-019 §2).
   - **`linter` es una lista cerrada**: `"biome"` bloquea.
   - **`sdd-init` avisa en migración** de un esquema inválido antes de copiar
     plantillas (CA-7, ADR-019 §5).
   - **Proyectos ya existentes**: basta con avisarlo en el CHANGELOG (CA-6.3, CE-FIX-2).
3. **Sigue abierto a revisión**: que un esquema inválido sea `ilegible` y no un cuarto
   estado (ADR-019 §2).
4. **CA-7 se verifica sobre prosa**: `sdd-init` lo ejecuta un modelo. El test comprueba
   que la instrucción está escrita; no comprueba que el modelo la siga.
