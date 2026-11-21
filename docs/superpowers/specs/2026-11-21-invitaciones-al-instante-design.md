# Invitaciones al instante (v25) — diseño corto

## Para qué
Carlos quiere que, en cada juego en línea, crear una sala le llegue a la pareja **enseguida** como
notificación, y que tocarla **entre directo a la sala**. Hoy la invitación espera al cron (hasta 5 min
con cron-job.org; antes, horas) y tocarla abre la pantalla del juego, donde falta tocar «Unirme».

## Alcance
- Juegos con sala en línea: **Trivia** y **¿Quién es más probable?** (Match es por turnos y la Ruleta no
  usa la nube). Avisos acelerados: la invitación (`trivia`, `probable`) y «aceptó tu juego»
  (`trivia-acepto`, `probable-acepto`).
- No metas: Diario, Mapa, fechas y solicitudes siguen con el cron cada 5 min. Grupos de 3+ no.
- Anti-meta: que la falla del relevo estorbe crear o entrar a una sala. El relevo nunca bloquea nada.

## Enfoques considerados
1. **Relevo en Cloudflare que despierta a GitHub (elegido por Carlos).** ~30-60 s. Poco código; el envío
   sigue en un solo lugar (`servidor/notificaciones/`).
2. cron-job.org cada minuto: 1-2 min, sin código, pero no es «enseguida».
3. Cloudflare manda la notificación él mismo: 1-3 s, pero duplica el envío (FCM, reglas de destinatarios)
   en otro lugar y es mucho más trabajo y riesgo.

## Diseño
**Relevo** (`servidor/relevo/relevo.js`, Cloudflare Worker gratis):
- `POST /` → llama a la API de GitHub `workflows/notificaciones.yml/dispatches` con `{"ref":"main"}` y
  responde 204. Otro método → 405.
- Solo acepta `Origin: https://carlosgmx7.github.io` (la web y la APK, que carga ese sitio). Otro origen → 403.
- Freno: como mucho un disparo cada 15 s por instancia; los de más responden 204 sin disparar. Aunque
  alguien lo abuse, lo peor es que GitHub corra seguido: el workflow ya tiene `concurrency` (una corriendo
  y una en cola), y una pasada solo manda lo que ya está en la bandeja.
- Secreto `GITHUB_TOKEN`: un token fino nuevo `okupa-relevo` (Actions: Read and write, solo `okupa`),
  aparte del de cron-job.org para poder revocar uno sin tumbar el otro. Lo crea y pega Carlos.

**Celular:**
- `RELEVO` (URL del Worker) en `js/nucleo/nube-config.js`; `null` = sin relevo (pruebas y local).
- `avisar()` en `js/nucleo/avisos.js`: después de escribir el aviso, si el tipo es de juego, hace
  `fetch(RELEVO, { method: 'POST', mode: 'no-cors', keepalive: true })` sin esperar y callando errores.
  `no-cors` sin cuerpo evita la consulta previa (preflight) y no necesita leer la respuesta.

**Servidor** (`servidor/notificaciones/`):
- La ruta del aviso lleva la sala, sacada del id del aviso (`trivia_<id>`, `probable_<id>`, `acepto_<id>`):
  - Invitado: `#/trivia/unirme/<id>`, `#/probable/unirme/<id>`.
  - Anfitrión («aceptó»): `#/trivia/jugar/<id>`, `#/probable/jugar/<id>`.
- Un id que no calza da la ruta de siempre (`#/trivia`, `#/probable`).

**Rutas nuevas** `trivia/unirme/:id` y `probable/unirme/:id` (pantalla breve «Entrando…»):
- Llama a `unirse(id)`. Si entró, o la sala ya está `jugando` y yo no soy el anfitrión → `jugar/<id>`.
- Si soy el anfitrión → `jugar/<id>`.
- Si la sala no existe, terminó o se canceló → pantalla del juego con el mensaje
  «Esa partida ya terminó o se canceló.»
- Sin conexión → el mensaje de error de siempre y la pantalla del juego.

**Respaldo:** si el relevo falla o no está, cron-job.org cada 5 min la manda igual.

## Lo que queda para el plan
- Cómo sube Carlos el Worker (editor del panel de Cloudflare, sin instalar nada) y la guía `docs/guia-relevo.md`.
- Pruebas: `logica.test.mjs` (rutas), `pasada.test.mjs` (la ruta llega en el mensaje), prueba de node del
  relevo (origen, método, freno, llamada a GitHub con fetch falso) y en `pruebas.html` (avisar dispara el
  relevo solo en juegos; rutas `unirme`).
- `CACHE` → `okupa-v25`, archivos nuevos en `PRECACHE` y `pruebas/pwa.prueba.js`.
- Publicar: el Worker primero (con la URL en `nube-config.js`), luego merge a `main` con el visto bueno de Carlos.
  No hay reglas nuevas de Firestore.
