# Estado de Okupa — 2026-11-14
## Objetivo
App web instalable (PWA) para parejas: Preguntas, Trivia, Diario, Match, Mapa, Fechas, Cápsula, Ajustes con temas y notificaciones. Publicada en https://carlosgmx7.github.io/okupa/ (repo CarlosGmx7/okupa, rama `main`). Meta: APK que aguante muchas parejas y, más adelante, grupos de 3+.
## Decisiones tomadas
- HTML/CSS/JS con módulos ES, sin compilación; módulos activos en `modulos.json` — simple de publicar en GitHub Pages.
- Español colombiano con tuteo; a Carlos se le pregunta con opciones (AskUserQuestion) y espacio para "otra cosa".
- Firebase gratis (Firestore + acceso anónimo + FCM), sin Blaze ni Google Cloud — a Carlos le falla el método de pago.
- La privacidad la garantizan las reglas de Firebase, no la pantalla.
- Notificaciones: notas en `parejas/{c}/avisos` + registro en `dispositivos/{id}`; GitHub Actions (`servidor/notificaciones/`) manda cada 15 min. A las 8:00 locales (`franjaFechas`) manda fechas y cartas en un solo aviso. Avisos "a todos menos quien lo hizo" (listo para grupos).
- Lógica pura compartida app/servidor en `js/modulos/{fechas,capsula}/` (con `package.json` `type: module` para Node 20).
- Cada versión en su rama y worktree (`../okupa-vNN`), sin push hasta que Carlos lo apruebe.
- APK: TWA con Bubblewrap; `assetlinks.json` en repo `carlosgmx7.github.io`; reparto por GitHub Releases.
## Estado actual
- Publicado: v18 (caché `okupa-v18`). `main` también tiene, sin publicar, el arreglo de «Borrar todo» (lugares y Match).
- Construido y revisado, sin publicar: v19 Fechas especiales (rama `v19-fechas`) y v20 Cápsula del tiempo (rama `v20-capsula`, sale de la v19, carpeta `../okupa-v20`, caché `okupa-v20`). pruebas.html 498 pasan; emulador (reglas + servidor) 101 pasan. Resumen y decisiones que Claude tomó por Carlos: `RESUMEN-NOCHE.md` (sin commit) y la sección «Decisiones que tomé por Carlos» de `docs/superpowers/specs/2026-11-14-v20-capsula-design.md`.
- Para publicar v19+v20: Carlos pega `firebase/firestore.rules` de `okupa-v20` en Firebase, aprueba unir `v20-capsula` a `main` y `git push`; luego probar en los dos celulares un aviso de las 8:00 y una carta.
- Límite conocido (v22): con el código, alguien puede «reclamar» el lugar del otro y leer lo de ese lugar (cartas antes de tiempo, «no» del Match, Diario). Dicho en la política.
- Vigilar: Firebase gratis = 50k lecturas / 20k escrituras al día, 1 GB; las fotos de lugares lo llenarían primero.
- Pendientes menores: bienvenida a quien solo cambió tema/foto; recordatorio atrasado tras medianoche usa el día nuevo; `transition: none` de movimiento reducido sin efecto; en Fechas falta timeout al guardar sin conexión.
## Hoja de ruta (cada versión: brainstorming → diseño → plan → construir con agentes + revisión)
1. v21 ¿Quién es más probable?: votan a la vez, se revela al final (pensado también para grupos).
2. v22 Seguridad: App Check (reCAPTCHA v3, pasos de Carlos en la consola) y cambio de celular que no deje leer lo del otro.
3. APK (TWA + Bubblewrap) y `assetlinks.json`; guardar muy bien la keystore.
## Archivos clave
- `js/nucleo/`: `app.js` (rutas), `almacen.js` (`esDeEsteCelular`), `pareja.js` (`borrarTodo`), `notificaciones.js`, `pantalla-ajustes.js`, `nube.js`, `ui.js` (`el()`).
- `js/modulos/{preguntas,trivia,diario,match,mapa,fechas,capsula}/` y `data/`.
- `firebase/firestore.rules` + `firebase/pruebas/`; `servidor/notificaciones/pasada.mjs` + `.github/workflows/notificaciones.yml`.
- `sw.js` (`CACHE`, `PRECACHE`); `privacidad.html`; `docs/superpowers/specs|plans/` (diseño y plan de cada versión).
## Próximo paso
v21 «¿Quién es más probable?» con brainstorming junto a Carlos (preguntas con opciones): rama `v21-probable` creada desde `v20-capsula` en un worktree `../okupa-v21` (uniones de `node_modules` de `firebase/` y `servidor/notificaciones/` hacia `okupa-app`, y copiar `correr-una.html`).
## Cómo verificar
- App: `python herramientas/servidor.py <puerto libre>` desde la carpeta de la rama → http://127.0.0.1:<puerto>/pruebas.html → "0 fallaron"; pocas pruebas: `correr-una.html?f=a,b` (no se sube).
- Reglas y servidor: en `firebase/`, `node emuladores.mjs exec "node --test pruebas/ ../servidor/notificaciones/pasada.test.mjs ../servidor/notificaciones/logica.test.mjs"`; luego cerrar el java del puerto 8085.
- Publicado: `https://carlosgmx7.github.io/okupa/sw.js` muestra la `CACHE` actual; Actions → Notificaciones en verde.
## Cuidado con
- Cada cambio: subir `CACHE` (próxima `okupa-v21`), archivos nuevos a `PRECACHE` y `pruebas/pwa.prueba.js`, pruebas nuevas a `pruebas.html`. Si cambian las reglas, Carlos las pega antes de publicar.
- `append`/`replaceChildren` nativos con `null` muestran «null»: envolver en `el('div', {}, …)`. No usar `--acento` para el tema. Letra en rem.
- Reglas: probar ataques (borrar y recrear, reclamar lugar); pruebas negativas con todos los demás campos válidos; `projectId` propio por archivo.
- Bash falla (fork): PowerShell. Escribir archivos sin BOM (Set-Content/-Encoding utf8 de PS 5.1 pone BOM y daña tildes al releer); commits con `git commit -F` de un archivo sin BOM.
- Worktrees: los `node_modules` son uniones a `okupa-app`: nunca `git clean -fdx`. Puertos 8080/8090 suelen estar ocupados.
- Tareas programadas nocturnas se detienen pidiendo permisos: ponerlas en modo automático antes de dejarlas.
- Probar en local con el service worker desregistrado y 127.0.0.1, no localhost.
