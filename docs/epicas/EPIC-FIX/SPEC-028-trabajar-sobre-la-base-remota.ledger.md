---
id: SPEC-028
tipo: ledger
epica: EPIC-FIX
---
# Ledger — SPEC-028 Trabajar sobre la base remota

## Resumen
- Fase: <!-- refleja el estado de la spec; la fuente de verdad es el frontmatter de la spec -->
- Rama: `ft/SPEC-028-trabajar-sobre-la-base-remota`

## Matriz de criterios de aceptación
<!-- Escritores: sdd-implementador rellena Implementado y Test; sdd-verificador rellena Verif. y Estado. Nunca al revés. -->
<!-- Estados por CA: ✅ cerrado · ⚠️ parcial/con salvedad · 🚧 en curso · ❌ sin empezar · n-a -->
<!-- Un CA está ✅ solo cuando Implementado + Test + Verif. aplicables están en verde. Una salvedad se marca ⚠️, nunca ✅. -->
| CA | Implementado (fichero) | Test (fichero/caso) | Verif. | Estado |
|---|---|---|---|---|
| CA-1 | `core/roles/es/sdd-orquestador.md` (sección "Sincronizar con el remoto (antes de nada)", pasos 1-6; Flujo 4-5 con rama y commit base) | `tools/tests/prosa-gates.test.mjs`: "SPEC-028 CA-1: el rol fija las condiciones de la sincronización", "SPEC-028 CA-1: el rol conserva la precondición .sdd.json y la prohibición de editar" | | ❌ |
| CA-2 | `tools/checks/prosa-gates.mjs` (`REGLAS_ORQUESTADOR`, `checkProsaOrquestador`; CLI con `--raiz <dir>`) | `tools/tests/prosa-gates.test.mjs`: "SPEC-028 CA-2: los cuatro marcadores…", "CA-2.1", "CA-2.2" ×4 (fixture sin cada marcador: función y CLI con exit≠0 que lo nombra) y "CA-2.2: … copia intacta sale con 0"; CA-2.3 vía `npm run check`; CA-2.4 ver F-SPEC-028-5 | | ❌ |
| CA-3 | `core/lib/refs-git.mjs` (`leeRefs`); `core/scripts/scaffold.mjs` (`decideId`, `asignaId`, CLI); `core/mensajes/es/mensajes.json` (`scaffold.base-atrasada`) | `core/tests/scaffold-refs.test.mjs`: "SPEC-028 CA-3 (a) spec", "(b) ADR", "(c) épica numerada" | | ❌ |
| CA-4 | `core/scripts/scaffold.mjs` (`decideId`, `idsEnRutas`); `core/lib/refs-git.mjs` (refs remotos y locales, sin `*/HEAD` ni la rama actual); mensajes `scaffold.ids-saltados`, `scaffold.id-saltado` | `core/tests/scaffold-refs.test.mjs`: "SPEC-028 CA-4 (a)", "(b)", "(c)", "CA-4.5" (ver F-SPEC-028-1) | | ❌ |
| CA-5 | `core/lib/refs-git.mjs` (estados degradados; solo subcomandos de lectura); CLI de `scaffold.mjs` (consulta tras `exigirProyectoSdd`, nota de una línea); mensajes `scaffold.nota-*` | `core/tests/scaffold-refs.test.mjs`: "SPEC-028 CA-5 (a)" … "(f)", tres "CA-5 (e)" (con `GIT_TRACE` sin contacto remoto y allowlist de subcomandos), "CA-5.5" | | ❌ |
| CA-6 | `core/scripts/scaffold.mjs` (`decideId` pura y exportada; `createArtifact` con `refs`/`avisa` opcionales, sin ellos igual que antes; `--id` no consulta git); `core/lib/refs-git.mjs` solo importa `node:*` | `core/tests/scaffold.test.mjs`: tests previos sin cambios + seis "SPEC-028 CA-6.2"; `core/tests/scaffold-refs.test.mjs`: "SPEC-028 CA-6.3"; `nucleo-aislado` en `npm run check` | | ❌ |
| CA-7 | `core/mensajes/es/mensajes.json` (7 claves `scaffold.*` nuevas; scaffold sin literales nuevos) | `npm test` (591/591) y `npm run check` en verde; goldens de scaffold sin cambios | | ❌ |

## Veredicto del verificador
<!-- GREEN/RED + fecha + resumen. Lo escribe SOLO sdd-verificador. -->

## Evidencia visual
<!-- Tabla CA → captura en _qa/SPEC-028/. Informe HTML opcional: _qa/SPEC-028/informe.html -->

## Salvedades / follow-ups
<!-- IDs F-SPEC-028-1, F-SPEC-028-2… con destino (spec futura o EPIC-MEJORA). -->
- **F-SPEC-028-1 (pregunta para el humano)**: CA-4.4 pide stderr con los ids saltados "en los tres casos", pero en (c) el candidato ya es SPEC-005 (max local + 1, con SPEC-004 en el árbol) y no hay nada que saltar; CA-4.5 manda silencio en ese caso. Implementado: (c) crea SPEC-005, sale con 0 y deja stderr vacío. Si se quiere otro comportamiento (p. ej. informar también de reservas por debajo del candidato), lo decide el arquitecto. Destino: gate humano / sdd-arquitecto.
- **F-SPEC-028-2**: coste. Sobre este repo (46 refs) `leeRefs` tarda ~3 s en Windows (un `ls-tree` por ref, ADR-018 "Coste"). Destino: EPIC-MEJORA si llega a notarse (acotar refs o un solo proceso git).
- **F-SPEC-028-3**: dependencia blanda con SPEC-026. Cuando `prosa-gates` pase a ser por idioma, `REGLAS_ORQUESTADOR` y `DOC_ORQUESTADOR` (hoy fijos a `core/roles/es/`) deben seguir esa regla, y el cambio del rol propagarse o resellarse en los demás idiomas. Destino: SPEC-026.
- **F-SPEC-028-4 (decisiones de detalle no fijadas por spec/ADR, a revisar)**: (i) "sin remotos" = ningún ref bajo `refs/remotes/` (un remoto configurado pero nunca descargado cuenta como sin remoto); (ii) en (a), (b) y (f) se emite una nota de una línea (el CA permite "como mucho una"); (iii) si tras saltar el siguiente candidato está en la rama por defecto, se niega; (iv) la copia remota de la rama actual (`origin/<rama actual>`) sí cuenta como otra rama; (v) la validación de `--epica` se adelanta a la numeración para que un error de argumentos no consulte git (goldens intactos); (vi) `prosa-gates.mjs` acepta `--raiz <dir>` para los fixtures de CA-2.2.
- **F-SPEC-028-5**: CA-2.4 no tiene test automático (compara contra la base); evidencia: `git diff --exit-code e277c34 -- core/roles/es/_descripciones.json` sale con 0.

## Cómo retomar (handoff)
<!-- Estado real del trabajo para la siguiente sesión: qué está hecho, qué falta, dónde seguir. -->
- Rama `ft/SPEC-028-trabajar-sobre-la-base-remota`, base `e277c34` (origin/main). CA-1..CA-7 implementados; spec en `en-revision`. Sin push ni PR.
- Mecánica: `core/lib/refs-git.mjs` (lectura de refs locales, nunca el remoto) + `decideId`/`idsEnRutas`/`idsLocales` en `core/scripts/scaffold.mjs`; el CLI consulta git tras `exigirProyectoSdd`. Prosa: sección "Sincronizar con el remoto" de `core/roles/es/sdd-orquestador.md`, vigilada por `checkProsaOrquestador` en `tools/checks/prosa-gates.mjs`.
- Verificar: `npm test`, `npm run check`, `node --test core/tests/scaffold-refs.test.mjs` (bare + clones en tmp, git aislado de la config global y de sistema), `git diff --exit-code e277c34 -- core/roles/es/_descripciones.json`.
- Pendiente: veredicto del verificador y respuesta del humano a F-SPEC-028-1.
