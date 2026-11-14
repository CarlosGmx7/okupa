# Estado de Okupa — 2026-11-13 (v18 en rama)
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
- Publicado y verificado: v17 con caché `okupa-v17`.
- Lista en la rama `v18` sin publicar: bienvenida (#/bienvenida/:paso), política (`privacidad.html` + #/privacidad, contacto carlos57garavito00@gmail.com), copia de seguridad en Ajustes sin pareja/avisos, letra Normal/Grande/Muy grande (CSS en rem). pruebas.html 410 pasan; revisado a 375 px en Muy grande. Falta: unir a `main` y publicar.
- A medias: confirmar con Carlos que llegó un aviso real entre los dos celulares.
- Límite a vigilar al crecer: Firebase gratis = 50k lecturas y 20k escrituras/día, 1 GB; las fotos de lugares (hasta 380 KB c/u en Firestore) lo llenarían primero.
- Pendiente importante: «Borrar todo» (`borrarTodo` en `pareja.js`) no borra `lugares` (con fotos), `match_*` ni `avisos`, y las reglas impiden borrar `match_matches`. La política lo dice y ofrece borrarlo por correo; arreglarlo pide cambiar reglas.
- Pendientes menores: la bienvenida le sale a quien solo cambió tema/foto o salió de la pareja sin usar Preguntas; recordatorio atrasado tras medianoche de Bogotá usa el día nuevo; ids trivia/mapa no atados a partida/lugar real; reglas `transition: none` de movimiento reducido sin efecto.
## Hoja de ruta acordada (una versión por chat, cada una con brainstorming → diseño → plan → construir)
1. v18 – Hecha en la rama `v18` (diseño y plan en `docs/superpowers/`).
2. v19 – Días juntos y aniversarios: contador en el inicio + avisos en días especiales.
3. v20 – Cápsula del tiempo: cartas que se abren en una fecha, con aviso.
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
Unir `v18` a `main`, publicar (`git push`) y comprobar que `sw.js` publicado dice `okupa-v18` y que `privacidad.html` abre. Luego v19 (días juntos y aniversarios) con brainstorming.
## Cómo verificar
- App: abrir http://127.0.0.1:8080/pruebas.html (servidor: preview "okupa" o `python herramientas/servidor.py`) → "0 fallaron". Si el panel está en segundo plano va lento; para una sola prueba: página 404 del servidor + `import('/pruebas/corredor.js')` y el archivo.
- Reglas y servidor: en `firebase/`, `npm install` (1ª vez) y `node emuladores.mjs exec "node --test pruebas/ ../servidor/notificaciones/pasada.test.mjs ../servidor/notificaciones/logica.test.mjs"`; luego cerrar el java del puerto 8085.
- Publicado: `https://carlosgmx7.github.io/okupa/sw.js` muestra la `CACHE` actual; Actions → Notificaciones en verde.
## Cuidado con
- Cada cambio: subir `CACHE` en `sw.js` (próxima `okupa-v19`), archivos nuevos a `PRECACHE` y `pruebas/pwa.prueba.js`, pruebas nuevas a `pruebas.html`.
- Si cambian las reglas, Carlos las pega en Firebase (Firestore → Reglas → Publicar) antes de publicar la app.
- `--acento` ya es el color de cada categoría: no usarlo para el tema. `append()` nativo convierte listas y `null` en texto: usar `el()`.
- Probar en local: desregistrar el service worker del navegador del panel; usar 127.0.0.1, no localhost.
- Bash falla con errores de fork: usar PowerShell. Scripts .ps1 con símbolos: guardar con BOM; no llamar `R` a una función.
- Archivos de prueba de reglas con `projectId` propio (node --test corre en paralelo contra el mismo emulador).
- Tamaños de letra siempre en rem; los vw de títulos van como calc(Nvw * var(--escala-letra)) (lo vigila estilos.prueba.js). En PowerShell no escribir "$nl:root" en cadenas: lo toma como variable.
- Para correr pocas pruebas: `correr-una.html?f=nombre1,nombre2` en la raíz (excluido en .git/info/exclude, no se sube).
