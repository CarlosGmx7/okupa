# Estado de Okupa — 2026-11-21
## Objetivo
App para parejas (PWA y APK Android): Preguntas, Trivia, ¿Quién es más probable?, Diario, Match, Mapa, Fechas, Cápsula, Ruleta de citas y Ajustes. Publicada en https://carlosgmx7.github.io/okupa/ (repo público CarlosGmx7/okupa, rama `main`). Meta: aguantar muchas parejas y, más adelante, grupos de 3 o más.
## Decisiones tomadas
- HTML/CSS/JS con módulos ES, sin compilación (módulos activos en `modulos.json`) — se publica fácil en GitHub Pages.
- Español colombiano con tuteo. A Carlos se le pregunta con opciones (AskUserQuestion) y espacio para "otra cosa".
- Firebase gratis (Firestore, acceso anónimo, FCM), sin Blaze — a Carlos le falla el pago. La privacidad la garantizan las reglas.
- Avisos: notas en `parejas/{c}/avisos`; GitHub Actions (`servidor/notificaciones/`) las manda cada 5 min; recordatorios del Diario y de fechas por franjas de 15 min. «X aceptó tu juego» solo si el anfitrión no está ya en la sala.
- Cada versión en su rama y worktree (`../okupa-vNN`). Carlos permite commits, servidores, subagentes y push de la rama sin preguntar; publicar (merge+push a `main`) y pegar reglas: con su visto bueno.
- Reglas nuevas que solo agregan permisos: Carlos las pega ANTES de publicar.
- Cambio de celular: solicitud en `parejas/{c}/solicitudes/{a|b}`; solo el celular viejo aprueba; sin él entra a los 7 días si nadie rechaza; freno de 24 h tras un rechazo; rechazadas se limpian a las 25 h.
- App Check exigido con reCAPTCHA Enterprise (Fraud Defense; el v3 clásico ya no se deja guardar). Clave del sitio `6Lfb8SQu…` en `js/nucleo/nube-config.js`; token de 1 día; gratis hasta 10.000 verificaciones/mes. Si algo falla: Firebase → App Check → APIs → Cloud Firestore → «Dejar de exigir».
- Inicio con 3 interfaces (Moderna por defecto, Simple, Clásica).
- APK: TWA con Bubblewrap, GitHub Releases. `io.github.carlosgmx7.okupa`, versión 1.0.0 (versionCode 1). Los cambios web llegan solos; solo se reconstruye para cambiar ícono, nombre o algo de Android.
## Estado actual
- Antes de la v25 estaba publicada la v24 (`sw.js` = `okupa-v24`, `main` = `01c121a`), con las reglas de v24 pegadas y App Check exigido. Incluye v22 (cambio de celular con aprobación), v23 (Ruleta de citas, 255 planes, sin nube) y v24 (rondas guardadas de Probable, aviso «aceptó tu juego», franja «hay una APK nueva», 1.000 frases de Probable con picantes directas a pedido de Carlos). Verificado: `pruebas.html` 782/0, reglas+servidor 229/0, Pages sirve okupa-v24 con las 1.000 frases y `data/apk.json` (versión 1).
- v26 LISTA en rama `v26-ubicacion` (worktree `../okupa-v26`), SIN publicar: arreglo del mapa. Carlos reportó que `Actualizar` se quedaba en «Buscando tu ubicación…» o decía «No se pudo leer». Causa: el cambio del 2026-11-16 (`6b16e25`) exigía una lectura fresca de GPS (`maximumAge 0`, alta precisión, hasta 25 s y luego 10 s por redes) y no tenía tope total; bajo techo el GPS no responde. Arreglo (`buscarUbicacion` en `js/modulos/mapa/ubicacion.js`): primero la lectura rápida de antes (baja precisión, `maximumAge` 60 s, 12 s); si es peor que 30 m, el GPS afina hasta 8 s; tope total 30 s. `pruebas.html` 803/0. Sin comprobar en celular (el navegador de Claude no tiene permiso de ubicación).
- Carlos hizo sus pendientes: APK 1.0.0 en Releases, `android.keystore` en Drive, pruebas en los dos celulares.
- Sin comprobar en celular: que Ajustes muestre «App instalada: versión 1» dentro de la APK (si no, la franja de APK nueva nunca saldría).
- Notificaciones (2026-11-20): solo llegaban las del Diario. Causa: GitHub corrió el cron 3-4 veces al día (27 corridas del 13 al 20 nov), y las invitaciones de Trivia/Probable/«aceptó» vencen a los 30 min y se botaban. Arreglo elegido por Carlos: cron-job.org dispara `workflow_dispatch` cada 5 min (`docs/guia-cron-job.md`). HECHO el 2026-11-21: Carlos creó el token `okupa-cron` y el cronjob (timeout 30 s); comprobado: corridas `workflow_dispatch` 05:01, 05:05, 05:10, 05:15, 05:20 UTC, ~20 s cada una.
- v25 PUBLICADA el 2026-11-21 (`main` = `7ae2b33`, Pages sirve `okupa-v25`): invitaciones al instante. Al crear sala de Trivia/Probable o aceptar, `avisar()` despierta un relevo de Cloudflare (`servidor/relevo/relevo.js`) que dispara `workflow_dispatch` (~30 s). La notificación lleva la sala: `#/trivia|probable/unirme/<id>` entra solo (`js/nucleo/entrar-sala.js`); «aceptó» → `jugar/<id>`. Verificado: `pruebas.html` 801/0, reglas+servidor 230/0, relevo 9/9; revisión final hecha (corregidos: freno ante ráfagas y no saltar a la partida si la persona ya se fue).
  - Relevo subido por Carlos el 2026-11-21: https://okupa-relevo.okupa-app.workers.dev/ (subdominio cambiado para no mostrar su correo), token `okupa-relevo`; ya en `RELEVO`. Probado: GET 405, otro origen 403, origen bueno 204 y corrida `workflow_dispatch` en GitHub. Desde la app publicada, el navegador despertó al relevo y GitHub corrió al instante. Falta: probar en los dos celulares que la invitación llega en ~30 s y entra directo. No hubo reglas nuevas.
  - Decisiones: el mensaje de sala que ya no está sale en la pantalla `unirme` con botón al juego; el relevo solo se protege con Origin + freno por instancia (repo público: minutos gratis; si alguien abusa, agregar regla de límite en Cloudflare o validar App Check en el Worker).
  - Menores aparcados v25: un error de permisos en `unirme` muestra «Se perdió la conexión» (Reintentar no sirve); una invitación de hace días abre una sala que quedó `jugando` sin terminar; con la app abierta, tocar la notificación puede reemplazar la entrada del historial (de antes).
- Límites: GitHub corre el cron «cuando puede» y lo apaga si el repo pasa 60 días sin cambios (Actions → Notificaciones → Enable workflow). La franja de APK no sale si la app se abrió desde una notificación.
- Menores aparcados:
  - v22: «Cancelar solicitud» tras el aviso no explica que sigue hasta 24 h; el aviso inicial puede repetirse si falla un envío; Rechazar sobre una solicitud que ya no existe dice «Revisa la conexión»; la espera repinta por sondeo de 60 s.
  - v23 Ruleta: 32 planes atados a una hora del día; mucho alcohol en casa·grande; sin respaldo de `svh`; un giro abandonado cuenta el plan como visto.
  - v24: frases con ideas temáticas parecidas y masculino genérico; borrar una ronda guardada no quita la marca en la nube; las rondas guardadas piden tener pareja; «Descargar» abre `releases/latest`; las pantallas de Trivia/Probable entran a una sala ya cancelada.
## Archivos clave
- `js/nucleo/pareja.js` + `pantallas-pareja.js` + `solicitudes-ui.js`: pareja, cambio de celular y su franja.
- `js/nucleo/nube.js` + `nube-config.js`: Firebase y App Check (`EMULADORES` siempre `null` al terminar).
- `js/nucleo/inicio.js`: las 3 interfaces del inicio; `js/nucleo/apk.js` + `data/apk.json`: aviso de APK nueva.
- `js/modulos/probable/` + `data/probable/frases.json`: ¿Quién es más probable? y rondas guardadas.
- `js/modulos/ruleta/` + `data/ruleta/planes.json`: la Ruleta de citas.
- `firebase/firestore.rules` + `firebase/pruebas/`: reglas y sus pruebas.
- `servidor/notificaciones/` + `.github/workflows/notificaciones.yml`: envío de avisos; `servidor/relevo/`: Worker de Cloudflare (pegar en el panel; un solo export).
- `js/nucleo/avisos.js` (`usarRelevo`) y `js/nucleo/entrar-sala.js`: relevo y entrar a sala desde la notificación.
- `sw.js` (`CACHE`, `PRECACHE`; `data/apk.json` siempre a la red), `privacidad.html`.
- `docs/guia-app-check.md`, `docs/guia-apk-nueva.md`, `docs/guia-cron-job.md`, `docs/guia-relevo.md`, `docs/superpowers/specs|plans/`.
- `../okupa-apk/` y `C:\bubblewrap\`: APK (`android.keystore` nunca a git).
## Próximo paso
Que Carlos pruebe en los dos celulares la v25 (invitación en ~30 s y entra directo; abrir y cerrar la app una vez para tomar okupa-v25). Si algo falla: mirar corridas `workflow_dispatch` en la API pública de Actions y los Logs del Worker en Cloudflare. Luego, una v26 de pulido con los menores aparcados.
## Cómo verificar
- App: en la carpeta de la rama, `python herramientas/servidor.py <puerto>`; abrir http://127.0.0.1:<puerto>/pruebas.html → «0 fallaron» (803). Servidor local de la v25: preview `okupa-v25` (puerto 8125, en `Reverso/.claude/launch.json`).
- Reglas: en `firebase/`, `node emuladores.mjs exec "node --test pruebas/ ../servidor/notificaciones/pasada.test.mjs ../servidor/notificaciones/logica.test.mjs"` (230) y cerrar el java del puerto 8085.
- Relevo: en `servidor/relevo/`, `node --test relevo.test.mjs` (9).
- Publicado: `https://carlosgmx7.github.io/okupa/sw.js` muestra la `CACHE` actual.
## Cuidado con
- En cada cambio: subir `CACHE`, archivos nuevos en `PRECACHE` y `pruebas/pwa.prueba.js`, pruebas nuevas en `pruebas.html`.
- `append` nativo con `null` muestra «null»: usar `el()`. Letras en rem; no usar `--acento`.
- Bash falla (fork): usar PowerShell. Archivos sin BOM (salvo `.ps1`). Commits con `git commit -F`. Nunca `git clean -fdx` (node_modules son uniones). En local: desregistrar el service worker y usar 127.0.0.1.
- reCAPTCHA: cada «crear clave» hace una llave nueva; la buena es `6Lfb8SQu…`. Nunca agregar localhost a sus dominios. Nunca aceptar ni subir la clave secreta.
- APK nueva: misma llave, subir `appVersionCode`/`appVersion`, `startUrl` con `?apk=N`, y al final la versión en `data/apk.json` (ver guía). Gradle no corre en el sandbox de Claude.
