# Estado de Okupa — 2026-11-14
## Objetivo
App web instalable (PWA) para parejas: Preguntas, Trivia, ¿Quién es más probable?, Diario, Match, Mapa, Fechas, Cápsula, Ajustes con temas y notificaciones. Publicada en https://carlosgmx7.github.io/okupa/ (repo CarlosGmx7/okupa, rama `main`). Meta: APK que aguante muchas parejas y, más adelante, grupos de 3+.
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
- Construido y revisado, sin publicar: **v21** (rama `v21-probable`, sale de la v20, carpeta `../okupa-v21`, caché `okupa-v21`). Trae «¿Quién es más probable?», un juego en vivo con votos ocultos por reglas, banco de 155 frases y frases propias. Trae también el **nuevo inicio** por secciones (Jugar juntos / Conocernos / Nosotros), con Preguntas en `#/preguntas` y textos solo cuando importan. pruebas.html 582 pasan; emulador 133 pasan. Diseño y plan: `docs/superpowers/*/2026-11-14-v21-probable*`.
- Para publicar v19+v20+v21: Carlos pega `firebase/firestore.rules` de **`okupa-v21`** en Firebase (sin eso el juego nuevo no lee ni escribe nada), aprueba unir `v21-probable` a `main` y hacer `git push`. Después hay que probar en los dos celulares un aviso de las 8:00, una carta y una ronda de «¿Quién es más probable?».
- Límite conocido (v22): con el código, alguien puede «reclamar» el lugar del otro y leer lo de ese lugar (cartas antes de tiempo, «no» del Match, Diario). Dicho en la política.
- Vigilar: Firebase gratis = 50k lecturas / 20k escrituras al día, 1 GB; las fotos de lugares lo llenarían primero.
- Pendientes menores: bienvenida a quien solo cambió tema/foto; recordatorio atrasado tras medianoche usa el día nuevo; `transition: none` de movimiento reducido sin efecto; en Fechas falta timeout al guardar sin conexión.
## Hoja de ruta (cada versión: brainstorming → diseño → plan → construir con agentes + revisión)
1. v22 Seguridad: App Check (reCAPTCHA v3, pasos de Carlos en la consola) y cambio de celular que no deje leer lo del otro.
2. APK (TWA + Bubblewrap) y `assetlinks.json`; guardar muy bien la keystore.
## Archivos clave
- `js/nucleo/`: `app.js` (rutas), `almacen.js` (`esDeEsteCelular`), `pareja.js` (`borrarTodo`), `notificaciones.js`, `pantalla-ajustes.js`, `nube.js`, `ui.js` (`el()`).
- `js/modulos/{preguntas,trivia,probable,diario,match,mapa,fechas,capsula}/` y `data/` (`data/probable/frases.json`).
- Inicio: `js/nucleo/inicio.js` agrupa los `accesoJuntos` de cada módulo por `seccion` (`jugar`|`conocernos`|`nosotros`) y `orden`. `detalle` es el texto bajo la fila. `js/nucleo/esperando.js` guarda la copia «<nombre> te está esperando» (caduca a los 30 min) y `precalentar.js` repinta el inicio si cambian los textos.
- `firebase/firestore.rules` + `firebase/pruebas/`; `servidor/notificaciones/pasada.mjs` + `.github/workflows/notificaciones.yml`.
- `sw.js` (`CACHE`, `PRECACHE`); `privacidad.html`; `docs/superpowers/specs|plans/` (diseño y plan de cada versión).
## Próximo paso
Carlos revisa la v21 en local (servidor `okupa-v21` del navegador, puerto 8098) y decide si publicar v19+v20+v21. Después sigue la v22 de seguridad, con brainstorming. Se crea la rama `v22-…` desde `v21-probable` en un worktree `../okupa-v22`, con uniones de `node_modules` y copia de `correr-una.html`.
## Cómo verificar
- App: `python herramientas/servidor.py <puerto libre>` desde la carpeta de la rama → http://127.0.0.1:<puerto>/pruebas.html → "0 fallaron"; pocas pruebas: `correr-una.html?f=a,b` (no se sube).
- Reglas y servidor: en `firebase/`, `node emuladores.mjs exec "node --test pruebas/ ../servidor/notificaciones/pasada.test.mjs ../servidor/notificaciones/logica.test.mjs"`; luego cerrar el java del puerto 8085.
- Publicado: `https://carlosgmx7.github.io/okupa/sw.js` muestra la `CACHE` actual; Actions → Notificaciones en verde.
## Cuidado con
- Cada cambio: subir `CACHE` (próxima `okupa-v22`), archivos nuevos a `PRECACHE` y `pruebas/pwa.prueba.js`, pruebas nuevas a `pruebas.html`. Si cambian las reglas, Carlos las pega antes de publicar.
- `append`/`replaceChildren` nativos con `null` muestran «null»: envolver en `el('div', {}, …)`. No usar `--acento` para el tema. Letra en rem.
- Reglas: probar ataques (borrar y recrear, reclamar lugar); pruebas negativas con todos los demás campos válidos; `projectId` propio por archivo.
- Bash falla (fork): PowerShell. Escribir archivos sin BOM (Set-Content/-Encoding utf8 de PS 5.1 pone BOM y daña tildes al releer); commits con `git commit -F` de un archivo sin BOM.
- Worktrees: los `node_modules` son uniones a `okupa-app`: nunca `git clean -fdx`. Puertos 8080/8090 suelen estar ocupados.
- Tareas programadas nocturnas se detienen pidiendo permisos: ponerlas en modo automático antes de dejarlas.
- Probar en local con el service worker desregistrado y 127.0.0.1, no localhost.
