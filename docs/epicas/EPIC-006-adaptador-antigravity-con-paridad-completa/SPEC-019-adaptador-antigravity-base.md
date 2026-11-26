---
id: SPEC-019
tipo: spec
epica: EPIC-006
estado: hecho
aprobada-por: Alberto Fojo
historial:
  - {estado: borrador, fecha: 2026-10-14, por: sdd-arquitecto}
  - {estado: aprobada, fecha: 2026-10-14, por: Alberto Fojo}
  - {estado: en-progreso, fecha: 2026-10-14, por: sdd-implementador}
  - {estado: en-revision, fecha: 2026-10-14, por: sdd-verificador}
  - {estado: hecho, fecha: 2026-10-14, por: sdd-verificador}
---
# SPEC-019 — Adaptador Antigravity base

## Problema
EPIC-006 busca dar soporte de primera clase a Google Antigravity como cuarto harness
de tremen-sdd, y ADR-013 fija su encaje como plugin estándar basado en skills con
progressive disclosure y resolución interna del núcleo. Actualmente no existe la
superficie base del adaptador (`adapters/antigravity/`), ni su manifiesto `plugin.json`,
ni sus skills, ni su pipeline de build determinista en `tools/build-adapter.mjs`.

Esta spec entrega la **superficie base del adaptador Antigravity**, permitiendo construir
un artefacto autocontenido en `dist/antigravity/` que expone los 7 roles canónicos
y los comandos esenciales sin duplicar la prosa del núcleo (RN-06), respetando la
fuente única de descripciones (RN-11) y la regla de dependencia adaptador→núcleo (RN-02).

## Usuarios / roles afectados
- Desarrolladores que usan Antigravity IDE, 2.0 o CLI.
- Todos los roles de tremen-sdd (`sdd-orquestador`, `sdd-producto`, `sdd-arquitecto`,
  `sdd-implementador`, `sdd-verificador`, `sdd-documentalista`, `sdd-como-vamos`).

## Criterios de aceptación

- **CA-1 (Manifiesto de plugin)**:
  Dado el directorio `adapters/antigravity/`, cuando se inspecciona `plugin.json`,
  entonces es un JSON válido con `"name": "tremen-sdd"` y descripción del estándar.

- **CA-2 (7 Skills con descripción canónica — RN-11)**:
  Dado `adapters/antigravity/skills/`, cuando se enumeran las skills correspondientes
  a los 7 roles canónicos (`sdd-orquestador`, `sdd-producto`, `sdd-arquitecto`,
  `sdd-implementador`, `sdd-verificador`, `sdd-documentalista`, `sdd-como-vamos`),
  entonces cada `skills/<rol>/SKILL.md` contiene frontmatter YAML con `name: <rol>`
  y `description` idéntica a la forma `larga` de `core/roles/es/_descripciones.json`.

- **CA-3 (Bootstrap de rol sin duplicar prosa — RN-06)**:
  Dado el cuerpo de cada `skills/<rol>/SKILL.md`, cuando el agente lo lee,
  entonces encuentra instrucciones de bootstrap para leer `.sdd.json` (idioma) y
  cargar por ruta relativa interna `../core/roles/<idioma>/<rol>.md`, sin embeber
  el cuerpo del rol en el fichero de la skill.

- **CA-4 (Skills/Comandos de usuario)**:
  Dado `adapters/antigravity/skills/`, cuando se buscan las herramientas de ciclo de vida,
  entonces existen `sdd-init` y `sdd-tablero` para permitir la inicialización y
  actualización de artefactos desde Antigravity.

- **CA-5 (Build determinista del artefacto)**:
  Dado `node tools/build-adapter.mjs antigravity`, cuando se ejecuta,
  entonces genera `dist/antigravity/` autocontenido con:
  (a) la superficie del adaptador;
  (b) el subárbol completo `core/` copiado bajo `dist/antigravity/core/`;
  (c) el fichero `PROVENANCE.json` con los metadatos de commit y fecha UTC;
  (d) `plugin.json` sellado con la versión de `package.json`. Dos ejecuciones
  consecutivas producen un árbol idéntico.

- **CA-6 (Script de build en package.json)**:
  Dado `package.json`, cuando se revisa `scripts`, entonces incluye
  `"build:antigravity": "node tools/build-adapter.mjs antigravity"`.

## Entidades y reglas afectadas
- `RN-02`: Dependencia solo adaptador → núcleo.
- `RN-06`: Prosa de rol referenciada, no copiada.
- `RN-11`: Description de disparo con fuente canónica única.
- `ADR-001`, `ADR-004`, `ADR-010`, `ADR-013`.

## Fuera de alcance
- Implementación de los hooks L1 en `hooks/` (pertenece a SPEC-020).
- Actualización de los checks de invariantes del runner (pertenece a SPEC-021).
- Scaffolding de `AGENTS.md` (pertenece a SPEC-022).
