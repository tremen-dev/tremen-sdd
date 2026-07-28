# Fundación (fragmento) — rutas fragmento, no ancladas

El núcleo se organiza en `lib/` (frontmatter), `scripts/` y `templates/`; el
adaptador aporta `agents/` y `skills/`. La transición la ejecuta `estado.mjs`.

Ninguna de estas rutas es resoluble por sí sola: son relativas al enunciado que
las contiene, y M1 las ignora POR DISEÑO (ADR-012 §2).
