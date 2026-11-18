# Estado de Okupa — 2026-11-17
## Objetivo
App para parejas (PWA y APK Android): Preguntas, Trivia, ¿Quién es más probable?, Diario, Match, Mapa, Fechas, Cápsula, Ruleta de citas y Ajustes. Publicada en https://carlosgmx7.github.io/okupa/ (repo CarlosGmx7/okupa, rama `main`). Meta: aguantar muchas parejas y, más adelante, grupos de 3 o más.
## Decisiones tomadas
- HTML/CSS/JS con módulos ES, sin compilación (módulos activos en `modulos.json`) — se publica fácil en GitHub Pages.
- Español colombiano con tuteo. A Carlos se le pregunta con opciones (AskUserQuestion) y espacio para "otra cosa".
- Firebase gratis (Firestore, acceso anónimo, FCM), sin Blaze — a Carlos le falla el pago. La privacidad la garantizan las reglas.
- Avisos: notas en `parejas/{c}/avisos`; GitHub Actions (`servidor/notificaciones/`) las manda cada 5 min (los recordatorios del Diario y de fechas siguen por franjas de 15 min).
- Cada versión en su rama y worktree (`../okupa-vNN`). Carlos permite commits y push de la rama sin preguntar; publicar en Pages y pegar reglas siguen siendo suyos.
- Cambio de celular (v22): solicitud en `parejas/{c}/solicitudes/{a|b}`. Solo el celular viejo aprueba; sin él, entra a los 7 días si nadie rechaza; cualquiera de los dos rechaza; freno de 24 h tras un rechazo; quien pide no puede cancelar una ya avisada hasta 24 h después; el servidor avisa (texto distinto al dueño y a la pareja), recuerda el día 6 y limpia rechazadas a las 25 h.
- App Check con reCAPTCHA Enterprise (Google Cloud Fraud Defense) — la consola ya no deja guardar reCAPTCHA v3 clásico. Gratis hasta 10.000 verificaciones/mes. Clave del sitio `6Lfb8SQu…` en `js/nucleo/nube-config.js`, ya guardada en Firebase con token de 1 día. La clave secreta no se usa.
- Inicio con 3 interfaces (Moderna por defecto, Simple, Clásica); avisos bajo cada modo solo cuando importan.
- APK: TWA con Bubblewrap, gratis por GitHub Releases. `io.github.carlosgmx7.okupa`, minSdk 24.
## Estado actual
- Publicado y funcionando (2026-11-17): v22 (`sw.js` = `okupa-v22`, `main` = `13ecda2`). Carlos pegó las reglas de v22, los dos celulares quedaron en v22 (ven el aviso bajo el código en «Nuestra pareja») y App Check está **exigido** en Cloud Firestore. Verificado: `pruebas.html` 690/0, reglas+servidor 209/0, y en la app publicada `exchangeRecaptchaEnterpriseToken` responde 200. Si algo falla con App Check: Firebase → App Check → APIs → Cloud Firestore → «Dejar de exigir».
- No hace falta token de depuración: el computador usa la app publicada; las pruebas locales usan emuladores (App Check apagado).
- Publicado (2026-11-17): v23 «Ruleta de citas» (`sw.js` = `okupa-v23`), con el visto bueno de Carlos. En un solo celular, sin nube: presupuesto (Sin plata / Algo medio hasta ~$80.000 / Darnos un gusto) + En casa / Salir → plan de un banco de 255 (`data/ruleta/planes.json`); recuerda en `okupa:ruleta` la elección y los planes ya vistos por combinación. Verificado: `pruebas.html` 734/0, prueba a mano en las 3 interfaces, 6 combinaciones, 375 px y 360×640.
- Menores aparcados de la Ruleta: planes atados a una hora del día (32), mucho alcohol en casa·grande, sin respaldo de `svh` para WebViews viejos, un giro abandonado cuenta el plan como visto, solapes cas-gra-002≈001 y cas-gra-038≈032.
- v24 lista en la rama `v24-probable` (worktree `../okupa-v24`): rondas guardadas de Probable (copia en el celular `okupa:probable:guardadas` + marca en `parejas/{c}/probable_guardadas`), aviso «X aceptó tu juego. ¡Entra ya!» (solo si el anfitrión no está ya en la sala), avisos cada 5 min, franja «hay una APK nueva» (solo en la APK; `data/apk.json`; guía `docs/guia-apk-nueva.md`) y 200 frases por tema en Probable (picantes directas, pedido de Carlos). Verificado el 2026-11-17: `pruebas.html` 782/0, reglas+servidor 229/0. Orden para publicar: **Carlos pega las reglas primero** (son aditivas), luego merge+push.
- Límites conocidos: GitHub corre el cron «cuando puede» y lo apaga si el repo pasa 60 días sin cambios (Actions → Notificaciones → Enable workflow). La franja de APK no sale si la app se abrió desde una notificación; Ajustes muestra «App instalada: versión N» dentro de la APK para comprobar la detección.
- Menores aparcados de la v24: ideas temáticas parecidas en algunas frases, masculino genérico en frases, borrar una ronda guardada no quita la marca en la nube, las rondas guardadas piden tener pareja, «Descargar» abre `releases/latest` (no el archivo directo).
- Carlos hizo sus pendientes (2026-11-17): APK 1.0.0 en Releases, `android.keystore` en Drive y pruebas en los dos celulares.
- Menores aparcados para la próxima versión: «Cancelar solicitud» tras el aviso no explica que sigue hasta 24 h; el aviso inicial puede repetirse si falla un envío; Rechazar sobre una solicitud que ya no existe dice «Revisa la conexión»; la espera repinta solo por sondeo de 60 s; spec de v22 aún dice v3 y 8 días.
## Archivos clave
- `js/nucleo/pareja.js`: pareja, solicitudes, aprobar/rechazar/entrar.
- `js/nucleo/pantallas-pareja.js`: «¿Quién eres?», pantalla de espera, «Nuestra pareja».
- `js/nucleo/solicitudes-ui.js`: franja Aprobar/Rechazar (inicio y Nuestra pareja).
- `js/nucleo/nube.js` + `nube-config.js`: Firebase y App Check (`EMULADORES` siempre `null` al terminar).
- `js/nucleo/inicio.js`: las 3 interfaces del inicio.
- `firebase/firestore.rules` + `firebase/pruebas/`: reglas y sus pruebas.
- `servidor/notificaciones/`: envío de avisos (`logica.mjs`, `pasada.mjs`).
- `sw.js` (`CACHE` = `okupa-v24`, `PRECACHE`; `data/apk.json` siempre a la red), `privacidad.html`, `docs/guia-app-check.md`, `docs/guia-apk-nueva.md`.
- `js/modulos/probable/guardadas.js`, `js/nucleo/apk.js`, `data/probable/frases.json` (1.000 frases).
- `js/modulos/ruleta/` + `data/ruleta/planes.json`: la Ruleta de citas.
- `docs/superpowers/specs|plans/`: diseño y plan de cada versión.
- `../okupa-apk/` y `C:\bubblewrap\`: APK (`android.keystore` nunca a git).
## Próximo paso
Publicar la v24: Carlos pega `firebase/firestore.rules` en Firebase, luego merge de `v24-probable` a `main` y push, y comprobar que Pages sirva `okupa-v24`. No queda ningún pedido de Carlos pendiente; lo siguiente lo decide él (ideas: los menores aparcados de cada versión).
## Cómo verificar
- App: en la carpeta de la rama, `python herramientas/servidor.py 8124` (launch `okupa-v24`); abrir http://127.0.0.1:8124/pruebas.html → «0 fallaron» (782).
- Reglas: en `firebase/`, `node emuladores.mjs exec "node --test pruebas/ ../servidor/notificaciones/pasada.test.mjs ../servidor/notificaciones/logica.test.mjs"` (229) y cerrar el java del puerto 8085.
- Publicado: `https://carlosgmx7.github.io/okupa/sw.js` muestra la `CACHE` actual.
## Cuidado con
- En cada cambio: subir `CACHE`, archivos nuevos en `PRECACHE` y `pruebas/pwa.prueba.js`, pruebas nuevas en `pruebas.html`. Si cambian las reglas, Carlos las pega al publicar.
- `append` nativo con `null` muestra «null»: usar `el()`. Letras en rem; no usar `--acento`.
- Bash falla (fork): usar PowerShell. Archivos sin BOM (salvo `.ps1`). Commits con `git commit -F`. Nunca `git clean -fdx` (node_modules son uniones). En local: desregistrar el service worker y usar 127.0.0.1.
- reCAPTCHA: cada «crear clave» hace una llave nueva; la buena es `6Lfb8SQu…`. Nunca agregar localhost a sus dominios. Nunca subir la clave secreta.
- APK: misma llave y subir `appVersionCode`; Gradle no corre en el sandbox de Claude; AppData/npm global virtualizados (todo en `C:\bubblewrap`).
