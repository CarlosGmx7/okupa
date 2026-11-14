# Estado de Okupa — 2026-11-13
## Objetivo
App web instalable (PWA) para parejas: preguntas para conocerse, Trivia, Diario, Match, Mapa, Ajustes con temas y notificaciones. Publicada en https://carlosgmx7.github.io/okupa/ (repo CarlosGmx7/okupa, rama `main`). Meta: app "de verdad" (APK) que aguante muchas parejas y, más adelante, grupos de 3+.
## Decisiones tomadas
- HTML/CSS/JS con módulos ES, sin compilación; módulos activos en `modulos.json` — simple de mantener y publicar en GitHub Pages.
- Español colombiano con tuteo; a Carlos se le pregunta con opciones para elegir (AskUserQuestion) y espacio para "otra cosa".
- Firebase gratis (Firestore + acceso anónimo + FCM), sin plan Blaze ni Google Cloud (pide método de pago y a Carlos le falla).
- La privacidad la garantizan las reglas de Firebase, no la pantalla.
- Temas por celular (`okupa:ajustes`): "Vino y dorado" (predeterminado) y "Grafito y rosa"; Grafito redefine las mismas variables CSS en `:root[data-tema="grafito"]`.
- Notificaciones: la app deja notas en `parejas/{c}/avisos`, cada celular se registra en `dispositivos/{id}`; GitHub Actions (`servidor/notificaciones/`) las manda cada 15 min con FCM. Avisos dirigidos a "todos menos quien lo hizo" (listos para grupos).
- APK: TWA con Bubblewrap (carga la web: se actualiza sola al publicar). `assetlinks.json` en un repo nuevo `carlosgmx7.github.io` (`/.well-known/`). Repartir gratis por GitHub Releases; Google Play cuesta 25 USD (no por ahora).
## Estado actual
- Publicado y verificado: v18 con caché `okupa-v18` (sw.js y privacidad.html en línea): bienvenida (#/bienvenida/:paso), política (`privacidad.html` + #/privacidad, contacto carlos57garavito00@gmail.com), copia de seguridad en Ajustes sin pareja/avisos, letra Normal/Grande/Muy grande (CSS en rem). pruebas.html 410 pasan; revisado a 375 px en Muy grande.
- A medias: confirmar con Carlos que llegó un aviso real entre los dos celulares.
- Límite a vigilar al crecer: Firebase gratis = 50k lecturas y 20k escrituras/día, 1 GB; las fotos de lugares (hasta 380 KB c/u en Firestore) lo llenarían primero.
- Lista sin publicar (rama `v19-fechas`, carpeta `../okupa-v19`): «Borrar todo» ya borra lugares, Match (votos del otro a ciegas) y fechas; avisos los descarta el servidor. v19 Fechas especiales (`js/modulos/fechas/`: `calendario.js` lógica pura que usa también el servidor, `datos.js`, `pantallas.js`; caché `okupa-v19`): lista compartida (inicio, cumpleaños, propias), mensuales e hitos (100…1.000 y cada 500; el día de inicio es el día 1), avisos 7 días antes y el día a las 8:00 locales (mensuales solo el día; la semana antes del cumple no le llega al cumpleañero). Revisión final hecha y corregida (fechas de este año avisan, copia atada a la pareja, «¡Feliz cumpleaños!» al cumpleañero). pruebas.html 468 pasan; emulador 85 pasan.
- Para publicar: Carlos pega `firebase/firestore.rules` en Firebase (cambiaron dos veces: Match borrable y `fechas`/`dispositivos`), unir `v19-fechas` a `main` y `git push`; comprobar `sw.js` = `okupa-v19` y Actions verde.
- Lista sin publicar (rama `v20-capsula`, sale de `v19-fechas`, carpeta `../okupa-v20`): v20 Cápsula del tiempo (`js/modulos/capsula/`, caché `okupa-v20`): cartas de uno al otro con fecha de apertura (mañana a 10 años), texto sellado por reglas en `capsulas/{id}/contenido/texto` (los metadatos no se pueden borrar mientras exista el texto, para que nadie recree la carta y la lea antes), aviso a las 8:00 del día de apertura junto con las fechas. Decisiones tomadas por Claude con permiso de Carlos: ver «Decisiones que tomé por Carlos» en `docs/superpowers/specs/2026-11-14-v20-capsula-design.md`. pruebas.html 497 pasan; emulador 101 pasan.
- Pendientes menores: la bienvenida le sale a quien solo cambió tema/foto o salió de la pareja sin usar Preguntas; recordatorio atrasado tras medianoche de Bogotá usa el día nuevo; ids trivia/mapa no atados a partida/lugar real; reglas `transition: none` de movimiento reducido sin efecto.
## Hoja de ruta acordada (una versión por chat, cada una con brainstorming → diseño → plan → construir)
1. v18 – Publicada (diseño y plan en `docs/superpowers/`).
2. v19 – Fechas especiales: construida, falta publicar (diseño y plan `2026-11-13-v19-fechas`).
3. v20 – Cápsula del tiempo: construida en `v20-capsula`, falta que Carlos revise las decisiones y publicar.
4. v21 – ¿Quién es más probable?: votan a la vez, se revela al final (pensado también para grupos).
5. v22 – Firebase App Check (reCAPTCHA v3, gratis), con pasos de Carlos en la consola.
6. APK (TWA + Bubblewrap) y repo `carlosgmx7.github.io` con `assetlinks.json`; guardar muy bien la keystore.
## Archivos clave
- `js/nucleo/`: `app.js` (rutas), `almacen.js`, `inicio.js`, `pantalla-ajustes.js`, `ajustes.js`, `tema.js`, `iconos.js`, `sonidos.js`, `notificaciones.js`, `avisos.js`, `pareja.js`, `nube.js`, `nube-config.js` (`CLAVE_VAPID`).
- `js/modulos/{preguntas,trivia,diario,match,mapa}/` y `data/`: secciones y contenido.
- `js/nucleo/bienvenida.js`, `respaldo.js` (copia; qué no viaja: `esDeEsteCelular` en `almacen.js`), `privacidad.js` + `privacidad.html`.
- `css/base.css` (variables y temas) y `css/componentes.css`.
- `firebase/firestore.rules` y `firebase/pruebas/`; `servidor/notificaciones/` + `.github/workflows/notificaciones.yml`.
- `sw.js` (`CACHE`, `PRECACHE`, push); `docs/superpowers/specs|plans/`: diseños y planes de cada versión.
## Próximo paso
Carlos revisa las decisiones de la v20. Publicar v19 y v20 juntas: pegar `firebase/firestore.rules` de `okupa-v20` (incluye todo), unir `v20-capsula` a `main` (trae v19) y `git push`; probar con los dos celulares un aviso a las 8:00 y una carta. Luego v21 (¿Quién es más probable?).
## Cómo verificar
- App: abrir http://127.0.0.1:8080/pruebas.html (servidor: preview "okupa" o `python herramientas/servidor.py`) → "0 fallaron". Si el panel está en segundo plano va lento; para una sola prueba: página 404 del servidor + `import('/pruebas/corredor.js')` y el archivo.
- Reglas y servidor: en `firebase/`, `npm install` (1ª vez) y `node emuladores.mjs exec "node --test pruebas/ ../servidor/notificaciones/pasada.test.mjs ../servidor/notificaciones/logica.test.mjs"`; luego cerrar el java del puerto 8085.
- Publicado: `https://carlosgmx7.github.io/okupa/sw.js` muestra la `CACHE` actual; Actions → Notificaciones en verde.
## Cuidado con
- Cada cambio: subir `CACHE` en `sw.js` (próxima `okupa-v20`), archivos nuevos a `PRECACHE` y `pruebas/pwa.prueba.js`, pruebas nuevas a `pruebas.html`.
- Si cambian las reglas, Carlos las pega en Firebase (Firestore → Reglas → Publicar) antes de publicar la app.
- `--acento` ya es el color de cada categoría: no usarlo para el tema. `append()` nativo convierte listas y `null` en texto: usar `el()`.
- Probar en local: desregistrar el service worker del navegador del panel; usar 127.0.0.1, no localhost.
- Bash falla con errores de fork: usar PowerShell. Scripts .ps1 con símbolos: guardar con BOM; no llamar `R` a una función.
- Archivos de prueba de reglas con `projectId` propio (node --test corre en paralelo contra el mismo emulador).
- Tamaños de letra siempre en rem; los vw de títulos van como calc(Nvw * var(--escala-letra)) (lo vigila estilos.prueba.js). En PowerShell no escribir "$nl:root" en cadenas: lo toma como variable.
- Para correr pocas pruebas: `correr-una.html?f=nombre1,nombre2` en la raíz (excluido en .git/info/exclude, no se sube).
