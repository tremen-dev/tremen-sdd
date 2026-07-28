# tremen-sdd — rama `release` (artefacto publicado)

**Este ref es GENERADO. No se edita a mano.** Lo escribe `tools/publica.mjs`
desde el árbol de fuentes; cualquier cambio hecho aquí se pierde en la siguiente
publicación y rompe la contrastabilidad de `PROVENANCE.json`.

- **version**: `0.5.0`
- **commit de fuente**: `36cdd88372b9b1a62028f0f9d783d7d0cd475266`
- **fecha (UTC)**: `2026-07-28T09:43:27.000Z`

Esta rama es **huérfana**: no comparte historia con `main` y nunca se mezcla con
ella. Avanza con un commit por publicación, sin reescribir historia. El código
fuente, las specs y el método viven en `main`; aquí solo vive lo instalable.

## Qué hay aquí

| Ruta | Qué es |
|---|---|
| `.claude-plugin/marketplace.json` | catálogo de Claude Code; apunta a `./claude-code` |
| `claude-code/` | plugin autocontenido para Claude Code |
| `kimi-code/` | árbol autocontenido para Kimi Code |
| `opencode/` | árbol autocontenido para opencode |
| `PROVENANCE.json` | versión, commit de fuente y fecha de esta publicación |

Cada árbol lleva **su propio `PROVENANCE.json`** dentro, así que una instalación
puede responder "¿qué versión tengo?" sin salir de su cache.

## Cómo se instala

**Claude Code** (el `#ref` es obligatorio: sin él se apunta a `main`, cuyo
catálogo referencia una ruta de build que no existe en un clon):

```
claude plugin marketplace add https://github.com/tremen-dev/tremen-sdd.git#v0.5.0
claude plugin install tremen-sdd@tremen-sdd
```

**Kimi Code y opencode** (sin marketplace: se obtiene el ref por git plano y se
copia el árbol a su destino nativo, ADR-003 §6 y ADR-007):

```
git clone --depth 1 --single-branch --branch v0.5.0 \
  https://github.com/tremen-dev/tremen-sdd.git <tmp>
cp -r <tmp>/opencode/. <proyecto>/.opencode/
```

No hace falta `npm install` ni `npm run build` en ningún punto: lo que se
descarga ya está construido.

## Comparar bytes con el build de origen

Los árboles de este ref son byte-idénticos a los que produce
`npm run build:all` en el commit de fuente de arriba. Para **comprobarlo** en
Windows hay que desactivar la conversión de finales de línea al obtener el ref
—`core.autocrlf` viene a `true` en la instalación estándar de Git para Windows
y reescribiría los ficheros al checkout—:

```
git -c core.autocrlf=false clone --depth 1 --single-branch --branch v0.5.0 …
```

Sin esa opción la instalación **funciona igual** (nada de lo publicado depende
del final de línea), pero la comparación byte a byte no cuadra.
