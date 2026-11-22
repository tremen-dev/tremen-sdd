# Mejoras propuestas desde proyectos

> Observaciones recogidas al usar tremen-sdd en proyectos reales. Cada entrada
> dice qué proyecto la aporta y cuándo. Son propuestas sin triar: pasan al
> roadmap del estándar solo tras evaluarlas.

## artica — 2026-10-13

Proyecto: recepción digital para Clínica Ártica (`D:\src\tremen-dev\artica`),
tremen-sdd 0.5.0. Observadas en una sesión del orquestador que definió
EPIC-002 y EPIC-003, especificó SPEC-006 con ADR-010, implementó una primera
ronda y la verificó en parcial mientras un CA manual (alta en Meta) quedaba
bloqueado.

1. **Verificación parcial.** El verificador solo sabe dar un veredicto final y
   pasar la spec a `hecho`. Para verificar una ronda que cubría parte de los CA
   hubo que pedirle expresamente que no cambiase el estado. Falta un modo de
   verificar solo algunos CA, con veredicto parcial y sin tocar el estado.

2. **Dependencias de cada CA.** Un CA manual (CA-1, comprobaciones con Meta
   real) bloqueaba todo el código de los CA siguientes. Relajar la puerta para
   adelantar en paralelo los CA automáticos obligó a volver al arquitecto para
   reescribir texto de la spec. Ayudaría poder declarar por CA de qué depende
   (por ejemplo `depende-de: CA-1` o `[manual]`), para que el orquestador sepa
   qué se puede implementar en paralelo sin editar la spec.

3. **Estado o campo de bloqueo.** «Esperando a que el humano tenga cuenta de
   Meta» solo quedó en texto libre del ledger y del roadmap. Un estado
   `bloqueada`, o un campo `bloqueada-por:` en el frontmatter, lo haría visible
   en el tablero y en `sdd-como-vamos`.

4. **Semántica de la salvedad aceptada.** Con una salvedad aceptada por el
   humano, el verificador deja el CA en ⚠️ («una salvedad nunca es ✅») y aun
   así da el veredicto en verde. Conviene un estado explícito, por ejemplo
   «✅ con salvedad aceptada por X el AAAA-MM-DD», y aclarar si cuenta para
   cerrar la spec.

5. **Traspaso entre sesiones del orquestador.** «Cómo retomar» del ledger es del
   implementador, el roadmap es de sdd-producto y `docs/fundacion/contexto.md`
   no tiene dueño claro. Para dejar el estado al cerrar la sesión hubo que
   escribir en los tres. Propuesta: que el orquestador sea dueño de una sección
   o fichero de traspaso.

6. **Quién hace commit de los documentos.** El arquitecto y el verificador dejan
   sus cambios sin commit, el implementador sí hace commit, y al final los
   commits de documentos los hace el orquestador, aunque su rol dice que no
   edita documentos. Hay que definir quién hace commit de qué.

7. **Retomar subagentes.** El rol del orquestador dice que el implementador
   anterior «ya no existe, no recuerda nada». En Claude Code un subagente se
   puede retomar con su contexto (SendMessage), y para ajustes pequeños del
   arquitecto eso ahorra mucho: se usó dos veces en esta sesión. Propuesta:
   permitir retomar a los autores (arquitecto, implementador) y prohibirlo
   explícitamente para el verificador, que debe juzgar con ojos frescos.

8. **Renombrar épicas o specs.** `scaffold.mjs` no permite cambiar el título de
   una épica ya creada: hubo que borrar el directorio y volver a crearla.
   Falta un `scaffold rename` o una opción `--titulo`.

9. **Variables de entorno nuevas.** Cuando una spec añade claves a
   `.env.example`, el implementador (o el orquestador al aprobar la spec) podría
   crearlas vacías y comentadas en `.env`, para que el humano solo rellene
   valores. En artica es una preferencia del usuario guardada en memoria; podría
   ser una opción de `.sdd.json`.

10. **Saltos de línea en Windows.** Los scripts escriben con saltos LF y git
    avisa en cada commit («LF will be replaced by CRLF»). `sdd-init` podría
    generar un `.gitattributes` (p. ej. `*.md text eol=lf`).

## artica — 2026-10-18

Proyecto: recepción digital para Clínica Ártica (`D:\src\tremen-dev\artica`),
tremen-sdd 0.5.0. Observada al cerrar SPEC-006: el verificador pasó la spec de
`en-progreso` a `en-revision` y luego a `hecho` con `estado.mjs`.

11. **`estado.mjs` rompe las notas del historial que llevan comas.** Al
    reescribir el frontmatter, la entrada de historial
    `{estado: en-progreso, …, nota: "refinación acotada tras CA-1 (b) refutada; CA-10, CA-11 y CA-12 nuevo; …"}`
    se cortó en la primera coma de dentro de las comillas y quedó una comilla
    sin cerrar. El verificador devolvió la línea a mano antes del commit.
    Causa, en `core/lib/frontmatter.mjs`:
    - `parseValue` (l. 34) parte el objeto inline con `split(',')` sin tener en
      cuenta las comillas;
    - `inline` (l. 61) vuelve a escribir los valores sin comillas, así que una
      `nota` con comas o dos puntos tampoco sobreviviría a la vuelta.

    Propuesta: un tokenizador que respete las comillas en `parseValue`, que
    `inline` entrecomille los valores con `,`, `:`, `{` o `}`, y un test de ida
    y vuelta con una `nota` así. `valida.mjs` podría detectar comillas
    desparejadas en el frontmatter.

## tremen-sdd — 2026-10-25

Proyecto: el propio estándar (`D:\src\tremen-sdd`). Observada al evaluar si
[ponytail](https://github.com/dietrichgebert/ponytail) (v5.3.2, MIT) encaja en
algún proceso del método. Conclusión: no como dependencia; sí como idea para un
rol.

12. **Escalera de implementación mínima en el implementador.** El rol
    `sdd-implementador` dice «nada fuera de los CA», pero no dice nada sobre
    cuánto código debe costar un CA que sí toca. Ponytail cubre ese hueco con
    un prompt de ~30 líneas (`skills/ponytail/SKILL.md`, o su versión
    agnóstica `AGENTS.md`): antes de escribir, parar en el primer peldaño que
    aguante — ¿hace falta?, ¿ya existe en el repo?, ¿lo hace la stdlib o la
    plataforma?, ¿una dependencia ya instalada?, ¿cabe en una línea legible?,
    y solo entonces el mínimo que funcione; nunca recortar validación en
    fronteras de confianza, manejo de errores, seguridad ni accesibilidad; y
    cada lógica con rama, bucle o parser deja un test pequeño. Es compatible
    con TDD y con el ledger.

    Propuesta: una spec pequeña que añada a `core/roles/es/sdd-implementador.md`
    una versión en español de la escalera (~6 líneas). Antes, un experimento
    sin spec: instalar ponytail en ámbito de usuario (no en el proyecto) y pasar
    `/ponytail-review branch` sobre la rama de una spec ya verificada; si
    encuentra algo que el verificador dejó pasar, hay señal.

    Qué NO adoptar, y por qué:
    - El plugin como dependencia del estándar: es un plugin de Claude Code
      (con adaptadores propios para Kimi Code y OpenCode), y el núcleo no se
      acopla a ningún harness (FOUNDATION, no-negociable 2).
    - Su hook `SubagentStart` inyecta el prompt en TODOS los subagentes salvo
      que el usuario defina `PONYTAIL_SUBAGENT_MATCHER`; haría «perezosos» al
      arquitecto, a producto y al verificador. Quien lo instale para uso
      personal con proyectos SDD debe fijar `PONYTAIL_SUBAGENT_MATCHER=implementador`.
    - El nivel `ultra` cuestiona la petición antes de construir: con D-1 la
      petición ya está cerrada en la spec aprobada; sería renegociar scope
      fuera del gate humano.
    - `/ponytail-review` como parte del verificador: es una revisión de código
      genérica (bugs, seguridad, carga, tests, «lean»); el verificador juzga
      cumplimiento de CA. Mezclarlos cambia el contrato del gate.
    - La «band» de telemetría (CSV en el home, webhook opcional) y tres hooks
      con timeout de 15 s en cada arranque y cada spawn: coste sin aporte al
      método.

    Decisión pendiente si se adopta: ponytail marca atajos con comentarios
    `shortcut: <límite>, <cuándo subir>` en el código y los recoge con
    `/ponytail-debt`; el ledger ya tiene «Salvedades / follow-ups»
    (F-SPEC-NNN-x). Serían dos libros de deuda: elegir uno, o exigir que todo
    `shortcut:` tenga su F-SPEC.

## xana-pensa — 2026-11-19

Proyecto: app Faladore/Pensa (`D:\src\xana\xana-pensa`), tremen-sdd 0.5.0.
Observadas en una sesión del orquestador que creó EPIC-018 con ADR-022,
especificó seis specs de tres épicas (EPIC-018, EPIC-MANT y EPIC-FIX) y llevó
cinco a GREEN en worktrees paralelos y ramas apiladas, sin el humano delante
durante la mayor parte del tiempo, con cinco PR fusionados uno tras otro.

13. **Numeración de specs entre ramas sin fusionar.** `scaffold.mjs` toma el
    siguiente número del árbol local. SPEC-042 existía en otra rama aún sin
    fusionar, y el siguiente scaffold habría vuelto a dar 042. Se evitó con un
    fichero de reserva sin seguimiento. Propuesta: que `scaffold.mjs` mire
    también las ramas remotas (`git ls-tree -r --name-only` sobre
    `refs/remotes/*`) o acepte `--desde <n>`, y avise si el número ya existe
    en alguna rama.

14. **`docs/tablero.md` choca en cada PR apilado.** El tablero es generado,
    pero va en el commit de cada spec, así que con cuatro PR en cola cada
    fusión dejó al siguiente en conflicto en ese fichero y solo en ese. Hubo
    que fusionar `main` y regenerar el tablero cuatro veces seguidas.
    Propuesta, de menos a más: documentar la receta (fusionar `main`,
    `tablero.mjs`, commit); un driver de merge en `.gitattributes` que
    regenere el tablero; o no hacer commit del tablero en las ramas de spec y
    regenerarlo solo en `main` (CI o el documentalista tras el merge).

15. **Orden de fusión e integración de specs paralelas.** Dos specs
    paralelas aprobadas por separado (SPEC-043 y SPEC-044) chocaban: una
    prueba de la segunda usaba un parámetro que la primera eliminaba. El hook
    `require-spec` no deja tocar código bajo una spec en `hecho`, así que el
    arreglo tuvo que ir en el commit de integración de una tercera spec
    (SPEC-047), y el PR de la 044 quedó absorbido por el de la 047. Propuesta:
    - que el orquestador, al planificar una ola, corra `git merge-tree` entre
      las ramas y declare el orden de fusión y la rama base de cada spec;
    - un campo `base:` (rama de la que parte) junto a `depende-de:` en el
      frontmatter, que el tablero muestre;
    - una vía prevista para el commit de integración (una spec «de
      integración» mínima, o permitir al orquestador un commit de merge con
      `Refs:` a las dos specs).

16. **Recursos compartidos entre agentes paralelos.** Dos verificadores
    corrieron a la vez la suite completa de Flutter (~3650 pruebas) en dos
    worktrees y la máquina se quedó sin memoria: el harness mató a uno a mitad.
    Otros dos agentes escribieron el mismo fichero temporal en el scratchpad
    compartido. Propuesta: una clave en `.sdd.json`
    (p. ej. `suites-pesadas-en-paralelo: 1`) que el orquestador respete
    encolando implementadores y verificadores, y una regla en los roles:
    cada agente escribe su salida de pruebas dentro de su propio worktree.

17. **Mandato autónomo del humano.** Antes de irse, el owner dejó por escrito
    lo que el orquestador podía hacer solo: push y PR al quedar en GREEN, qué
    specs de la ola siguiente aprobaba, que se podía desinstalar la app del
    móvil de pruebas y, tras tres RED seguidos, «parar esa spec y sus
    dependientes». Eso vivió solo en la conversación. Propuesta: un bloque de
    «mandato» en el fichero de traspaso del orquestador (ver la mejora 5), con
    fecha, alcance y reglas de parada; el orquestador lo consulta antes de
    cada acción hacia fuera, y «sus dependientes» se calcula con `depende-de:`.

18. **Pasos humanos después del merge.** Las cinco specs dejaron trabajo
    operativo para después del merge: scripts de borrado en staging y
    producción, despliegue de reglas solo tras publicar la versión en la
    tienda, enlazar consolas, una semana de métricas antes de exigir App
    Check, activar una limpieza programada. Todo queda repartido en cinco
    ledgers, con dependencias entre sí, y la spec ya está en `hecho`.
    Propuesta: una sección estándar del ledger, «Pendiente del humano tras el
    merge», con casillas y de qué depende cada paso. `sdd-como-vamos` las
    agrega en una lista ordenada, y el tablero marca «hecho, con pasos
    humanos abiertos».

19. **Pruebas que tocan entornos reales.** Durante la verificación, una
    prueba de Cloud Functions encontró credenciales en el entorno y escribió
    un documento en el Firestore de staging (incidente F-SPEC-044-1). Desde
    entonces las pruebas se corrieron sin credenciales. Propuesta: una regla
    en los roles del implementador y del verificador: las suites se corren
    sin credenciales de entornos reales; si el proyecto las necesita, la spec
    lo declara como CA manual. El verificador comprueba esa regla igual que
    el lint.

20. **Modelo de cada subagente.** Los agentes del plugin no fijan `model`,
    así que heredan el de la sesión. En este proyecto hubo que recordar en
    cada lanzamiento que el arquitecto, el implementador y el verificador van
    con el modelo grande y el documentalista con el barato. Propuesta: fijar
    `model` en el frontmatter de cada agente del adaptador de Claude Code, o
    leerlo de `.sdd.json` (`modelos: {verificador: …}`).

## xana-pensa — 2026-11-19 (segunda sesión)

Proyecto: app Faladore/Pensa (`D:\src\xana\xana-pensa`), tremen-sdd 0.5.0.
Observadas en una sesión que empezó como conversación de diseño (rediseño del
tablero del afinador, con maqueta HTML), pasó al orquestador y llevó SPEC-052
de borrador a PR en un worktree, con tres rondas de preguntas al dueño y un
CA manual en un móvil real.

Confirman mejoras anteriores:
- **13 (numeración entre ramas)** volvió a ocurrir: `scaffold.mjs` numeró 049
  porque SPEC-049…051 vivían en otra rama sin fusionar. El arquitecto renombró
  a mano a 052. Mientras tanto, `main` recibió otra SPEC-049 distinta, así que
  hubo dos SPEC-049 a la vez y la otra rama tuvo que renumerarse. `scaffold.mjs`
  tampoco acepta `--id` para specs.
- **14 (tablero en conflicto)**: el PR chocó solo en `docs/tablero.md`; se
  resolvió fusionando `main` y regenerando el tablero.

21. **El consentimiento del humano no llega a un subagente.** El dueño autorizó
    desinstalar la app de Play del móvil de pruebas para el CA manual. El
    orquestador se lo pasó al verificador, pero el harness bloqueó el
    `adb uninstall` por destructivo, porque un mensaje de otro agente no cuenta
    como permiso del humano. Hizo falta que el humano corriera el comando en su
    sesión y relanzar el verificador. Propuesta: que la spec declare en cada CA
    manual sus **precondiciones humanas** (p. ej. «app de la tienda
    desinstalada», «cuenta con la feature X») y que el orquestador las pida y
    confirme *antes* de lanzar al verificador. El verificador, si encuentra una
    acción destructiva sin precondición cumplida, devuelve el comando exacto
    para el humano en vez de intentarla.

22. **La receta del dispositivo no tiene dueño.** El brief del verificador
    llevaba datos del dispositivo sacados de la memoria de la sesión («el
    release se firma con la clave debug»), y ya no eran ciertos: un intento de
    build en vano. Propuesta: un documento del proyecto con la receta para
    ejecutar CA manuales (dispositivos, firma, cuentas de prueba, cómo instalar
    una rama), referenciado desde `.sdd.json` y mantenido por el verificador
    cuando lo encuentre desfasado, en lugar de que viaje en cada brief.

23. **Aprobación con respuestas que cambian la spec.** El dueño respondió a
    P-1…P-5 y en el mismo mensaje dijo «Aprobada», pero eligió una opción
    distinta de la recomendada (P-1) y abrió un tema nuevo que acabó en D-h y
    CA-14. El orquestador tuvo que decidir si eso era aprobación del texto
    final. Propuesta: definir que la aprobación se registra sobre el texto ya
    rehecho. Si el humano aprueba con respuestas, el arquitecto las incorpora,
    el orquestador resume el diff y registra `aprobada` con una nota
    («aprobada con las respuestas P-1…P-6 del AAAA-MM-DD»). Opcional: que
    `estado.mjs` guarde un hash del cuerpo de la spec al aprobar y `valida.mjs`
    avise si cambia después sin pasar por el gate.

24. **Entregar sin dejar procesos vivos.** El implementador entregó su
    informe con trabajo propio aún en segundo plano. El verificador ya estaba
    lanzado sobre el mismo worktree con la suite completa (riesgo de quedarse
    sin memoria, ver la mejora 16). Hubo que pedirle al implementador que
    parase. Propuesta: una regla en todos los roles: antes de entregar, termina
    o para tus procesos de fondo (pruebas, builds, watchers, daemons). Y otra
    en el orquestador: no lanzar el siguiente rol pesado mientras el anterior
    tenga trabajo de fondo vivo.

25. **Partes del ledger que quedan viejas tras GREEN.** Con la spec ya en
    `hecho`, «Cómo retomar» decía aún «CA-M1 pendiente, suite +3768 −6», y
    «Resumen — Fase:» seguía vacío. El documentalista lo detectó, pero no es
    suyo arreglarlo, y arreglarlo después cuesta otro commit y otra pasada de
    CI. Propuesta: que el verificador, al dar GREEN, reescriba «Cómo retomar»
    como «cerrada: nada que retomar» (o la sección desaparezca en `hecho`), y
    que `valida.mjs` avise de campos plantilla vacíos en specs `hecho`.

26. **Artefactos de diseño previos a la spec.** El diseño se decidió con el
    dueño sobre una maqueta HTML (varias versiones, descartes explícitos:
    degradado verde→amarillo, zona plana) antes de entrar en el orquestador. A
    la spec solo llegó como URL y prosa en el brief del arquitecto. El
    verificador no la usó para comparar. Propuesta: un campo `diseño:` en el
    frontmatter (o una sección «Referencias de diseño») con los enlaces y qué
    variante se eligió y cuáles se descartaron. Que el verificador compare las
    capturas del CA manual con esa referencia.

## xana-pensa — 2026-11-19 (tercera sesión)

Proyecto: app Faladore/Pensa (`D:\src\xana\xana-pensa`), tremen-sdd 0.5.0.
Observadas en una sesión que empezó como investigación (de dónde venía un
corpus de partituras y bajo qué licencia), siguió con el orquestador
(SPEC-053 con tres ADR, en un worktree, GREEN en la segunda ronda, PR
fusionado) y terminó guiando y ejecutando los tres CA manuales del dueño en
staging y producción, en un PR aparte solo de documentación.

Confirman mejoras anteriores:
- **13 (numeración entre ramas)**, por tercera vez y peor: la spec nació como
  SPEC-049, chocó con una SPEC-049 recién fusionada en `main` (PR #107), se
  renumeró a 052 y chocó otra vez con un PR abierto (#108) que ya usaba 052.
  Acabó en 053. Cada renumeración obligó a renombrar spec, ledger y `_qa/`,
  sustituir todas las referencias con `sed`, cerrar el PR y abrir otro (la
  rama lleva el número) y borrar las ramas remotas viejas. Además de lo ya
  propuesto: que `scaffold.mjs` consulte también los PR abiertos
  (`gh pr list --json headRefName,files`) y los borradores de otros worktrees
  (`git worktree list`), y un script `renumera.mjs <viejo> <nuevo>` que haga el
  renombrado y las sustituciones de forma segura y deje una nota en el ledger.
- **14 (tablero en conflicto)**: el PR volvió a chocar solo en
  `docs/tablero.md`.
- **18 (pasos humanos tras el merge)**: la spec quedó en `hecho` con CA-M1,
  CA-M2 y CA-M3 en `n-a` («pendiente del propietario»); uno era urgente
  (cerrar un bucket público). Su evidencia llegó horas después, en otro PR,
  editando el ledger de una spec ya cerrada.

27. **Un CA «del humano» casi nunca necesita sus manos.** Los tres CA manuales
    estaban marcados «(propietario)». En la práctica, el agente hizo casi todo
    con las credenciales locales del dueño: escribir documentos de acceso,
    lanzar el plan y el `--apply`, instalar el APK, recorrer la app por `adb`,
    capturas, comprobaciones por REST. El dueño solo tuvo que hacer tres cosas:
    un despliegue a producción, un permiso IAM y un ajuste en un panel web sin
    acceso. Empezamos dándole una guía paso a paso, hasta que él preguntó «¿por
    qué no lo haces tú?». Propuesta: en cada CA manual, la spec separa
    - lo que exige **consentimiento** del humano (el agente lo ejecuta tras un
      «sí»: escribir en producción, desinstalar una app);
    - lo que exige **sus manos o sus secretos** (su contraseña, un panel sin
      acceso, un cambio de IAM en producción).

    El orquestador ofrece ejecutar lo primero y solo deja lo segundo como
    tarea del humano. Se relaciona con la mejora 21 (precondiciones humanas).

28. **Cada paso manual necesita una comprobación del resultado, no del
    comando.** En producción el despliegue de reglas terminó con «Deploy
    complete!», pero la CLI no era interactiva y se saltó en silencio una
    pregunta («Grant the new role?») que en staging sí apareció. Faltaba un
    permiso IAM, y el fallo solo apareció porque el agente comprobó el
    servidor por REST con dos cuentas (403 donde se esperaba 200). Propuesta:
    que la plantilla de CA manual pida, por cada paso, la **comprobación
    observable** que demuestra que funcionó (p. ej. «una cuenta con el
    feature descarga la oculta: 200; una sin él: 403»), y que el verificador
    o el orquestador no den el paso por bueno solo porque el comando terminó
    sin error. Si el mismo paso se repite en varios entornos (staging,
    producción), la comprobación se repite en cada uno: lo que salió bien en
    uno no prueba el otro.

29. **Desviaciones del guion en un CA manual.** El CA-M2 decía «con la cuenta
    del dueño», pero el agente no tenía su contraseña. Lo resolvió dando el
    feature a una cuenta de prueba que hizo de dueño. El resultado es
    equivalente, pero no es lo que pide el texto, y quedó anotado a mano en el
    ledger. Propuesta: una columna o marca estándar en la matriz para «✅ con
    desviación», que diga en qué se apartó la ejecución del texto del CA y por
    qué. Junto con la receta de dispositivos y cuentas (mejora 22), la spec
    puede nombrar roles («cuenta con el feature», «cuenta sin él») en vez de
    personas concretas.

## xana-pensa — 2026-11-20

Proyecto: app Faladore/Pensa (`D:\src\xana\xana-pensa`), tremen-sdd 0.5.0.
Observadas en una sesión del orquestador que especificó SPEC-055 (traducción
del módulo de partituras) con ADR-027, la implementó, cerró dos CA manuales
(revisión de idioma y recorrido en dispositivo, este hecho por la propia sesión
por adb) y la llevó a GREEN y a PR, con otra sesión trabajando en paralelo en
el mismo árbol.

Confirman mejoras anteriores:
- **13 (numeración entre ramas)**, una vez más y ahora también con ADR: el
  arquitecto obtuvo SPEC-054 y ADR-026, ya usados en una rama remota sin
  fusionar (iOS). Lo detectó él mismo, borró lo creado y repitió el scaffold.
  Que `scaffold.mjs` mire ramas remotas debe valer para ADR igual que para specs.
- **20 (modelo de cada subagente)**: hubo que pasar `model: opus` en cada
  lanzamiento.
- **10 (saltos de línea)**: el único fallo de la suite raíz era un test que lee
  un YAML del repo, convertido a CRLF por `core.autocrlf=true`. El verificador
  tuvo que demostrar que no era regresión.

30. **Ordenar los CA manuales antes del verificador.** El verificador corrió la
    suite entera (~10 min) y devolvió «sin GREEN» solo porque faltaban dos CA
    manuales. Una vez hechos, hubo que lanzar otro verificador para revisar un
    diff que era solo de documentación. Propuesta: que el orquestador, al
    recibir al implementador, recoja primero los CA manuales que pueden hacerse
    ya (revisión de idioma, recorrido en dispositivo) y lance el verificador una
    sola vez con todo. Si algún manual tiene que esperar, el verificador da un
    veredicto «automáticos en verde, manuales pendientes» (enlaza con la 1) y la
    segunda pasada se limita a los manuales.

31. **CA manuales que ejecuta un modelo.** El dueño delegó la revisión del
    asturiano en «la sesión que orquesta», y la spec lo recogió así. Pero el rol
    del orquestador dice que no edita código ni documentos, y cumplir el CA
    obligó a corregir dos cadenas en un `.arb`, regenerar el código y anotar en
    el ledger. Lo mismo con el recorrido en dispositivo (mejora 27). Propuesta:
    que cada CA manual declare quién lo ejecuta (`ejecuta: humano | orquestador
    | implementador`) y qué puede tocar para cumplirlo. Si hay que corregir
    código, que lo haga el implementador; el orquestador solo deja la evidencia.

32. **Commits con rutas explícitas como regla del estándar.** En el árbol había
    ficheros sin seguimiento de otra sesión (un ADR y una spec en borrador) y
    ficheros que regenera `pub get`. Hubo que repetir en cada encargo «haz
    `git add` solo con rutas explícitas, no toques X». Propuesta: que los roles
    que hacen commit lo traigan de serie (nunca `git add -A` ni `.`) y que
    `tablero.mjs` y `valida.mjs` lean solo ficheros con seguimiento
    (`git ls-files`), o avisen de los que no lo tienen. Así un borrador sin
    commit de otra sesión no se cuela en el tablero.

33. **El drift en las instrucciones del harness no tiene dueño.** El
    documentalista detectó que `CLAUDE.md` no mencionaba los textos del paquete
    ni el puerto de errores nuevo, pero su rol solo reporta, y el orquestador
    no debe editar documentos. Al final lo editó el orquestador. Propuesta:
    nombrar un dueño para `CLAUDE.md`/`AGENTS.md`. Puede ser el documentalista,
    con permiso para tocar solo esos ficheros y con las líneas propuestas en su
    informe, o el implementador como último CA implícito de cada spec que añada
    una convención.

34. **Texto de la spec que queda viejo tras el gate.** Después de aprobarla y
    cerrarla, la spec seguía diciendo «ADR-027 (nuevo, borrador): hay que
    aprobarlo junto con la spec», y daba un nombre de rama escrito a mano que no
    coincidía con el real. Lo mismo en los ADR: «aprueba X (pendiente)» con
    `estado: aprobada`. Propuesta: que la spec no lleve el nombre de la rama
    (se deriva del id y el slug), y que `estado.mjs … aprobada` avise de
    palabras como «pendiente», «borrador» o «hay que aprobar» en el cuerpo del
    artefacto (y, en un ADR, que actualice la línea de deciders). Es la versión
    de la mejora 25 para la spec y el ADR.

35. **Hallazgos del recorrido manual sin sitio.** En el recorrido aparecieron
    tres cosas ajenas a la spec: una pantalla a la que no lleva ninguna ruta,
    una sección que no se rellena y un problema de contraste. Se anotaron como
    texto libre en el ledger. El dueño quiere retomarlas «más adelante», pero
    nada las lleva al roadmap ni a una épica. Propuesta: una sección estándar
    «Hallazgos fuera de alcance» en el ledger, con destino (EPIC-FIX,
    EPIC-MEJORA, spec futura), que `sdd-como-vamos` liste mientras no tengan
    spec.

## xana-pensa — 2026-11-20 (segunda sesión)

Proyecto: Pensa (`D:\src\xana\xana-pensa`), tremen-sdd 0.5.0. El orquestador
condujo SPEC-056 (versionado: número de compilación desde git) con ADR-028, de
la conversación de diseño a la PR, en un worktree propio mientras otra sesión
del orquestador cerraba SPEC-055 en el checkout principal. Un RED (solo de
documentación) y GREEN en la segunda ronda.

36. **El borrador de la spec se escribe en un checkout que puede ser de otro.**
    El arquitecto dejó la spec, el ledger y el ADR sin commit en el checkout
    principal, que en ese momento ya había pasado a la rama de otra sesión
    (SPEC-055). Hubo que crear el worktree después y mover a mano los ficheros
    sin seguimiento. Propuesta: que el orquestador fije el lugar de trabajo
    (rama y worktree) **antes** de lanzar al arquitecto, no después de la
    aprobación, y se lo pase en el brief; o que `scaffold.mjs` avise si la rama
    actual pertenece a otra spec.

37. **La condición de cierre de un CA manual no la comprueba nadie antes del
    verificador.** La spec decía que CA-M1 podía quedar en ⚠️ solo si estaba
    anotado en el ledger y en `docs/PENDING_MANUAL_TESTS.md`. El implementador
    no lo anotó y una ronda entera del verificador terminó en RED por eso.
    Propuesta: una clave opcional en `.sdd.json` (por ejemplo
    `registroManuales: "docs/PENDING_MANUAL_TESTS.md"`) y que
    `estado.mjs … en-revision` falle si un CA-M sigue pendiente y su id de spec
    no aparece en ese fichero. Es barato y ahorra una ronda. Complementa la 18 y
    la 30.

38. **Una ejecución pesada parada por memoria y nadie a quien dársela.** El
    harness cortó la suite completa del implementador por falta de memoria,
    porque la otra sesión corría su suite en otro worktree. El implementador
    hizo bien en no reintentar, pero la build Android obligatoria, la build
    web y la suite quedaron sin hacer. Las ejecutó el orquestador cuando la
    otra sesión quedó libre, y le pasó las salidas al implementador para que
    las anotase. Funcionó, pero nada en el estándar dice quién puede producir
    evidencia ni cómo se marca. Propuestas:
    - un cerrojo de máquina para ejecuciones pesadas (suite completa, builds),
      compartido entre worktrees y sesiones, por ejemplo `~/.sdd/pesado.lock`
      con pid, proyecto y spec; amplía la 16, que hablaba de agentes de una
      misma sesión;
    - en el ledger, un campo «ejecutado por» en cada evidencia, para que el
      verificador sepa que una salida no la generó el implementador.

39. **Recurrencias de esta sesión** (sin propuesta nueva; confirman las
    anteriores):
    - **13 (numeración entre ramas)** también afecta a los ADR. ADR-026 vivía
      solo en la rama de SPEC-054 y ADR-027 estaba sin commit en la otra
      sesión. El arquitecto tuvo que mirar ramas remotas a mano para elegir
      ADR-028 (y el documentalista avisó de un «hueco» que no lo era).
      `scaffold.mjs` debería consultar `origin/*` también para los ADR.
    - **14 (el tablero choca)**: al integrar `main` antes del push, el único
      conflicto fue `docs/tablero.md`. Se resolvió regenerándolo.
    - **7 (retomar subagentes)**: en el RED se retomó el mismo implementador
      con los hallazgos, y también el mismo verificador para la segunda ronda,
      en vez de lanzar agentes nuevos. Fue más rápido y barato, sin pérdida
      de independencia, porque el verificador nunca vio el relato del
      implementador.
    - **10 (saltos de línea en Windows)**: un test del proyecto que parsea un
      workflow con una regex solo-LF falla en local con `core.autocrlf=true`.
      Además, `flutter pub get` y las builds dejan ficheros generados
      cambiados solo en saltos de línea, que hubo que descartar varias veces
      antes de cada commit.
    - **25 (ledger viejo tras GREEN)**: el documentalista informó de que «Cómo
      retomar» seguía diciendo «en-revision → verificación» y que «Fase:»
      estaba vacío después de `hecho`.
    - **33 (cambios de documentos fuera de la lista de la spec)**: el dueño
      pidió arreglar `android/PRODUCTION_LAUNCH.md`, que estaba fuera de la
      lista de ficheros de la spec. Lo editó el orquestador en la rama de la
      spec y el implementador lo anotó. Hace falta una regla para «cambio
      pedido por el humano a mitad de la spec que no está en sus CA».

## xana-pensa — 2026-11-20 (tercera sesión)

Proyecto: Pensa (`D:\src\xana\xana-pensa`), tremen-sdd 0.5.0. El orquestador
condujo una spec de mantenimiento de EPIC-MANT (retirar la compilación y el
despliegue web del CI) con su ADR, de la pregunta del dueño a la PR, en el
checkout principal. GREEN a la primera. Mientras tanto, otra sesión fusionó en
`main` una spec y un ADR con los mismos números, y hubo que renumerar después
del GREEN, justo antes del push.

40. **Renumerar es un trabajo a mano sin herramienta.** La colisión (ver 13) se
    descubrió con la spec ya en `hecho`: SPEC-060/ADR-030 pasaron a
    SPEC-061/ADR-031. Eso supuso `sed` sobre 25 ficheros (docs, tests que
    afirman `contains('SPEC-060')`, workflow, ledger, IDs de hallazgos
    `F-SPEC-060-n`), `git mv` de la spec, el ledger y el ADR, y renombrar la
    rama, cuyo nombre lleva el ID. Lo hizo el orquestador, aunque su rol dice
    que no edita documentos. Propuesta: un `renumera.mjs <viejo> <nuevo>` que
    renombre ficheros, sustituya referencias en todo lo que la rama cambió
    respecto a `main`, apunte la renumeración en el historial y en el ledger, y
    diga cómo renombrar la rama. Además, que el orquestador compruebe que el ID
    está libre en `origin/main` y en las PR abiertas **antes** de lanzar al
    arquitecto, no solo antes del push.

41. **`estado.mjs` no acepta el ID.** `estado.mjs SPEC-060 aprobada --por X`
    falla con `ENOENT` y hay que pasar la ruta completa del fichero. Para los
    ADR pasa lo mismo. Propuesta: aceptar `SPEC-NNN` / `ADR-NNN` y resolver la
    ruta (fallando si hay más de una coincidencia).

42. **Sustitución parcial de un ADR sin forma estándar.** El nuevo ADR dejaba
    sin efecto la parte web de ADR-020 y de ADR-028. El arquitecto lo escribió
    en prosa («no se reescribe»). Fue el documentalista quien vio que ADR-020
    seguía afirmando algo falso, y hubo que volver al arquitecto para añadir
    las notas de sustitución. Propuesta: un campo de frontmatter
    `sustituye-parcialmente: [ADR-020, ADR-028]` que `valida.mjs` use para
    exigir la nota recíproca en los ADR sustituidos. Y un paso del arquitecto
    en la checklist: buscar en los ADR aprobados lo que la decisión retira.

43. **Guardas exactas frente a decisiones paralelas aprobadas.** La spec fijó
    en tests que `firebase.json` tiene *exactamente* los sitios `legal` y
    `account`, y la lista literal de `paths` del pipeline. Ese mismo día otra
    sesión había aprobado un ADR (panel de administración) que añadirá un
    sitio `admin` y un `paths` nuevo. El arquitecto no lo vio porque solo vivía
    en `origin/main`. No es un error: la spec siguiente ajustará la guarda,
    pero nadie lo avisó hasta la integración. Propuesta: que el brief del
    arquitecto incluya `git fetch` y una mirada a los ADR y specs aprobados en
    `origin/main` y en las PR abiertas que toquen los mismos ficheros, y que
    anote los solapes en la spec.

44. **La integración con `main` tras el GREEN no tiene dueño ni sitio.**
    Después del GREEN hubo que renumerar, fusionar `main`, regenerar el
    tablero y volver a pasar las guardas (`test/tool/`). Lo hizo el
    orquestador, que lo apuntó en una sección «Integración con main» que se
    inventó en el ledger. El verificador no volvió a mirar, porque `hecho` es
    terminal. Propuesta: definir ese paso (quién, qué se vuelve a ejecutar y
    cuándo una integración obliga a verificar de nuevo) y una sección
    estándar del ledger para él. Relacionado con 6, 15 y 25.

45. **El pie de atribución del commit lo dicta el brief.** El orquestador pidió
    al documentalista (Haiku) un `Co-Authored-By` con otro modelo, y el agente
    tuvo que decidir si obedecer o poner el suyo. Propuesta: que cada rol
    firme con su propio modelo y que el brief no lo fije.

46. **Recurrencias de esta sesión** (sin propuesta nueva):
    - **13 (numeración entre ramas)**: tercera vez, ahora con la spec y el ADR
      a la vez. Ver 40.
    - **14 (el tablero choca)**: único conflicto de la fusión con `main`. Se
      resolvió regenerándolo.
    - **10 (saltos de línea en Windows)**: dos tests del proyecto ya fallaban
      en local por CRLF con `core.autocrlf=true`, y el implementador los
      arregló fuera del alcance de la spec para poder cerrar el CA de la
      suite. El verificador lo aceptó como salvedad.
    - **16/38 (recursos compartidos)**: un test de rendimiento (≤ 10 ms por
      paso) falló una vez porque el verificador ejecutaba la suite mientras
      hacía `git grep`/`curl`, y pasó al repetirla. Las guardas de tiempo
      necesitan una máquina tranquila o un margen.

## god-pain (Pain Radar) — 2026-11-20

Proyecto: Pain Radar (`D:\src\tremen-dev\god-pain`), con tremen-sdd 0.5.0
instalado como plugin global. El proyecto **no usa tremen-sdd**: no tiene
`.sdd.json` y sigue un SDD propio anterior al plugin (`specs/epics/EPIC-XX/`,
estados en inglés `draft → approved → done`, comandos `/epic` y `/spec`, y sus
propios agentes `spec-implementer` y `spec-verifier` en `.claude/agents/`). La
única pieza de tremen-sdd es un ledger suelto (SPEC-1811). Ante una petición de
trabajo se disparó la skill `sdd-orquestador` y este lanzó `sdd-arquitecto`.
El humano tuvo que preguntar «¿este proyecto sigue tremen-sdd?». La decisión
fue no migrar.

47. **El orquestador se dispara en proyectos que no son tremen-sdd.** La
    descripción de la skill dice que dispare «al inicio de CUALQUIER
    petición» y el wrapper dice «si `.sdd.json` no existe, usa `es`»: falta
    el fichero y aun así sigue adelante. Propuesta: que la ausencia de
    `.sdd.json` sea una **parada**, no un valor por defecto. El wrapper de
    cada skill comprueba el fichero primero; si falta, no carga el rol y
    responde en una línea: «Este proyecto no está inicializado con
    tremen-sdd. ¿Seguir con su proceso propio o ejecutar `sdd-init`?». Lo
    mismo vale para todos los roles, no solo el orquestador.

48. **Detectar un SDD propio antes de actuar.** Aunque haya que preguntar,
    el orquestador puede dar contexto útil: si ve `specs/epics/`,
    `.claude/agents/spec-*.md`, comandos `/spec` o `/epic` propios, o
    plantillas en `specs/_templates/`, que lo diga («este repo tiene su
    propio flujo de specs con los agentes X e Y») y recomiende usarlo. Esa
    misma heurística le sirve a `sdd-init` para ofrecer una migración
    informada.

49. **Las descripciones de los subagentes compiten con los del proyecto.**
    `tremen-sdd:sdd-arquitecto`, `sdd-implementador` y `sdd-verificador`
    aparecen en la lista global de agentes con descripciones genéricas
    («implementa una spec aprobada») que encajan igual de bien que los
    agentes propios del proyecto (`spec-implementer`, `spec-verifier`).
    Propuesta: que sus descripciones digan de forma explícita «solo en
    proyectos con `.sdd.json`», para que el modelo elija el agente del
    proyecto cuando corresponda.

50. **Si un rol corre fuera de un proyecto tremen-sdd, que no imponga su
    layout.** Aquí el arquitecto escribió bien en `specs/epics/` porque el
    encargo se lo pidió de forma explícita, pero su rol asume `docs/epicas/`,
    `estado.mjs` y estados en español. Si se le invoca a propósito en un
    proyecto sin `.sdd.json`, su rol debería decir: «adopta las convenciones
    que encuentres (rutas, plantillas, vocabulario de estados) y no ejecutes
    los scripts del núcleo», en vez de depender de que el brief lo pida.

51. **Un modo de «convivencia» declarable.** Para proyectos que quieran
    usar solo algunas piezas (aquí se usó la plantilla del ledger) sin
    migrar, una opción mínima en `sdd-init`, por ejemplo
    `.sdd.json` con `{"modo": "parcial", "piezas": ["ledger"]}`, que diga a
    los roles qué pueden tocar y cuáles no deben dispararse.

## xana-pensa — 2026-11-21

Proyecto: Faladore / Pensa (`D:\src\xana\xana-pensa`), tremen-sdd 0.5.0.
Observadas en una sesión del orquestador que llevó SPEC-064 (promoción de
Google Play de internal a cerrada/abierta, con ADR-033 que enmienda ADR-029)
de la petición al merge: arquitecto con dos rondas de preguntas, implementador,
verificador reanudado cinco veces con evidencia nueva, documentalista y CA
manuales ejecutados por el orquestador a petición del propietario.

52. **`estado.mjs --help` no existe.** `node estado.mjs --help` trata `--help`
    como ruta de fichero y falla con `ENOENT`. Un `--help` (y un error claro con
    la sintaxis cuando faltan argumentos) evitaría tener que leer el script.

53. **Enmendar una ADR aprobada no tiene mecanismo.** ADR-033 enmienda el punto
    1 de ADR-029, que está `aprobada` y no se edita. La nota «punto 1 enmendado
    por ADR-033» hubo que añadirla a mano (vía el arquitecto, ida y vuelta solo
    para tres líneas). Propuesta: un campo `enmendada-por: [ADR-033]` en el
    frontmatter que escriba un script (`estado.mjs` o uno nuevo) y que el
    tablero y `valida.mjs` muestren, distinto de `sustituida`.

54. **CA por plataforma sin decir si bloquean `hecho`.** CA-17 pedía comprobar
    en macOS y Windows; la spec no decía si la mitad de macOS bloqueaba el
    cierre y el verificador tuvo que razonar por precedente (otra spec) y dejar
    el GREEN condicionado hasta que el propietario decidió saltarla. Propuesta:
    que la plantilla de spec obligue a marcar cada CA con `bloquea-hecho: sí|no`
    (los manuales ya lo hacen a veces en texto libre), y que el verificador lo
    lea en vez de interpretarlo.

55. **CA manuales «tras el merge» que se ejecutan antes.** Los CA-M1..M3 decían
    «en el PC Windows, tras el merge», pero el propietario pidió ejecutarlos ya,
    sobre la rama. El verificador lo aceptó dejando nota del commit. Propuesta:
    que la plantilla hable de «sobre el código de la spec (rama o main)» salvo
    que de verdad dependa del merge (p. ej. un deploy), y que el ledger tenga una
    columna «commit de la evidencia».

56. **El orquestador ejecuta CA manuales delegados por el humano.** RN-09 deja
    los CA manuales en ⚠️ aunque se ejecuten con éxito y con el humano viendo el
    resultado (aquí incluso con capturas de Play Console aportadas por él). Con
    la entrada 4 (salvedad aceptada) conviene un estado «✅ manual, ejecutado por
    X, confirmado por el humano el AAAA-MM-DD», y decir en el rol del
    orquestador que puede ejecutar un CA manual cuando el humano se lo pide
    explícitamente, dejando las salidas en `_qa/` y pasándolas al verificador.

57. **Reanudar al verificador para añadir evidencia es caro.** Cada salida nueva
    (CA-M1/M2, decisión sobre macOS, CA-M3, capturas) supuso reanudar al
    verificador con todo su contexto para tocar una fila del ledger. Encaja con
    la entrada 1: un modo ligero «registra evidencia de CA-X» (o un script que
    añada evidencia a una fila de la matriz sin cambiar el veredicto) ahorraría
    tokens.

58. **«Cómo retomar» se queda viejo cuando cambian los CA manuales.** Lo
    escribe el implementador; cuando el verificador actualiza filas de CA
    manuales no lo toca, y fue el documentalista quien detectó que seguía
    listando como pendientes CA ya hechos. Propuesta: que el verificador
    regenere (o al menos revise) «Cómo retomar» cada vez que cambia el estado de
    un CA, o que `valida.mjs` compare esa sección con la matriz.

59. **Merge sin esperar al CI cuando el humano lo pide.** El rol dice «el merge
    es siempre humano» y termina en el PR. Aquí el humano pidió «push, PR y
    merge sin esperar al CI», con la premisa de que solo cambiaba una skill
    (cambiaba también código de una herramienta, tests y `CLAUDE.md`).
    Propuesta: que el rol del orquestador diga qué hacer cuando el humano
    delega el merge explícitamente (hacerlo, pero antes contrastar la premisa
    con `git diff --stat` y decir qué rutas entran y qué gates locales pasaron),
    para que no dependa del criterio del modelo.

60. **Trailers de commit para los subagentes.** El orquestador tiene que copiar
    en cada encargo los trailers (`Co-Authored-By`, `Claude-Session`) y el
    documentalista vio una discrepancia entre lo que decía su arnés y lo que
    decía el encargo. Propuesta: un campo en `.sdd.json` (o una convención
    documentada) para los trailers, que los roles lean de ahí.
