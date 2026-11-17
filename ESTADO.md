# Estado de Okupa — 2026-11-17
## Objetivo
App para parejas (PWA y APK Android): Preguntas, Trivia, ¿Quién es más probable?, Diario, Match, Mapa, Fechas, Cápsula y Ajustes. Publicada en https://carlosgmx7.github.io/okupa/ (repo CarlosGmx7/okupa, rama `main`). Meta: aguantar muchas parejas y, más adelante, grupos de 3 o más.
## Decisiones tomadas
- HTML/CSS/JS con módulos ES, sin compilación (módulos activos en `modulos.json`) — se publica fácil en GitHub Pages.
- Español colombiano con tuteo. A Carlos se le pregunta con opciones (AskUserQuestion) y espacio para "otra cosa".
- Firebase gratis (Firestore, acceso anónimo, FCM), sin Blaze — a Carlos le falla el pago. La privacidad la garantizan las reglas.
- Avisos: notas en `parejas/{c}/avisos`; GitHub Actions (`servidor/notificaciones/`) las manda cada 15 min.
- Cada versión en su rama y worktree (`../okupa-vNN`). Carlos permite commits y push de la rama sin preguntar; publicar en Pages y pegar reglas siguen siendo suyos.
- Cambio de celular (v22): solicitud en `parejas/{c}/solicitudes/{a|b}`. Solo el celular viejo aprueba; sin él, entra a los 7 días si nadie rechaza; cualquiera de los dos rechaza; freno de 24 h tras un rechazo; quien pide no puede cancelar una ya avisada hasta 24 h después; el servidor avisa (texto distinto al dueño y a la pareja), recuerda el día 6 y limpia rechazadas a las 25 h.
- App Check con reCAPTCHA Enterprise (Google Cloud Fraud Defense) — la consola ya no deja guardar reCAPTCHA v3 clásico. Gratis hasta 10.000 verificaciones/mes. Clave del sitio `6Lfb8SQu…` en `js/nucleo/nube-config.js`, ya guardada en Firebase con token de 1 día. La clave secreta no se usa.
- Inicio con 3 interfaces (Moderna por defecto, Simple, Clásica); avisos bajo cada modo solo cuando importan.
- APK: TWA con Bubblewrap, gratis por GitHub Releases. `io.github.carlosgmx7.okupa`, minSdk 24.
## Estado actual
- Publicado: v21b (`sw.js` = `okupa-v21b`) con las reglas de v21.
- v22 lista en la rama `v22-seguridad` (worktree `../okupa-v22`), sin publicar. Verificado el 2026-11-17: `pruebas.html` 690 pasaron, 0 fallaron; reglas+servidor 209 pass, 0 fail; prueba a mano con emuladores (pedir, franja, rechazar, aprobar). Revisión final de toda la rama hecha y arreglada.
- Pasos de Carlos para publicar, en orden:
  1. Aprobar el merge de `v22-seguridad` a `main` y el push (publica en Pages).
  2. Pegar en Firebase las reglas de `firebase/firestore.rules` justo después (si no, el celular nuevo ve «Ya hay una solicitud de otro celular»).
  3. Abrir la app en los dos celulares y en la APK; en Firebase → App Check mirar que casi todas las solicitudes salgan «verificadas».
  4. Registrar el token de depuración del computador (sale en la consola del navegador en 127.0.0.1) y luego tocar «Exigir» en Firestore. Si algo falla: «Dejar de exigir». Guía: `docs/guia-app-check.md`.
- Pendiente de Carlos de antes: subir la APK 1.0.0 a Releases (tag `v1.0.0`), guardar `android.keystore` en Drive, probar en los dos celulares una ronda de Probable, un aviso de las 8:00 y una carta.
- Menores aparcados para la próxima versión: «Cancelar solicitud» tras el aviso no explica que sigue hasta 24 h; el aviso inicial puede repetirse si falla un envío; Rechazar sobre una solicitud que ya no existe dice «Revisa la conexión»; la espera repinta solo por sondeo de 60 s; spec de v22 aún dice v3 y 8 días.
## Archivos clave
- `js/nucleo/pareja.js`: pareja, solicitudes, aprobar/rechazar/entrar.
- `js/nucleo/pantallas-pareja.js`: «¿Quién eres?», pantalla de espera, «Nuestra pareja».
- `js/nucleo/solicitudes-ui.js`: franja Aprobar/Rechazar (inicio y Nuestra pareja).
- `js/nucleo/nube.js` + `nube-config.js`: Firebase y App Check (`EMULADORES` siempre `null` al terminar).
- `js/nucleo/inicio.js`: las 3 interfaces del inicio.
- `firebase/firestore.rules` + `firebase/pruebas/`: reglas y sus pruebas.
- `servidor/notificaciones/`: envío de avisos (`logica.mjs`, `pasada.mjs`).
- `sw.js` (`CACHE` = `okupa-v22`, `PRECACHE`), `privacidad.html`, `docs/guia-app-check.md`.
- `docs/superpowers/specs|plans/`: diseño y plan de cada versión.
- `../okupa-apk/` y `C:\bubblewrap\`: APK (`android.keystore` nunca a git).
## Próximo paso
Con el visto bueno de Carlos: merge de `v22-seguridad` a `main`, push (publica) y guiarlo en pegar reglas → verificar → Exigir. Después, cada uno con su brainstorming: resumen de una ronda guardado en el celular; aviso «ya aceptaron tu juego»; 200 frases por tema en Probable; «Ruleta de citas» con presupuesto; aviso «hay una APK nueva».
## Cómo verificar
- App: en la carpeta de la rama, `python herramientas/servidor.py 8122`; abrir http://127.0.0.1:8122/pruebas.html → «0 fallaron» (690).
- Reglas: en `firebase/`, `node emuladores.mjs exec "node --test pruebas/ ../servidor/notificaciones/pasada.test.mjs ../servidor/notificaciones/logica.test.mjs"` (209) y cerrar el java del puerto 8085.
- Publicado: `https://carlosgmx7.github.io/okupa/sw.js` muestra la `CACHE` actual.
## Cuidado con
- En cada cambio: subir `CACHE`, archivos nuevos en `PRECACHE` y `pruebas/pwa.prueba.js`, pruebas nuevas en `pruebas.html`. Si cambian las reglas, Carlos las pega al publicar.
- `append` nativo con `null` muestra «null»: usar `el()`. Letras en rem; no usar `--acento`.
- Bash falla (fork): usar PowerShell. Archivos sin BOM (salvo `.ps1`). Commits con `git commit -F`. Nunca `git clean -fdx` (node_modules son uniones). En local: desregistrar el service worker y usar 127.0.0.1.
- reCAPTCHA: cada «crear clave» hace una llave nueva; la buena es `6Lfb8SQu…`. Nunca agregar localhost a sus dominios. Nunca subir la clave secreta.
- APK: misma llave y subir `appVersionCode`; Gradle no corre en el sandbox de Claude; AppData/npm global virtualizados (todo en `C:\bubblewrap`).
