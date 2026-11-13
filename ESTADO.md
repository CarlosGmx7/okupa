# Estado de Okupa — 2026-11-13
## Objetivo
App web instalable (PWA) para Carlos y su pareja: preguntas para conocerse, Trivia, Diario, Match de deseos y Mapa con lugares. Publicada en https://carlosgmx7.github.io/okupa/ (repo CarlosGmx7/okupa, rama `main`).
## Decisiones tomadas
- HTML/CSS/JS con módulos ES, sin compilación; módulos activos en `modulos.json` — simple de mantener y publicar en GitHub Pages.
- Español colombiano con tuteo; estilo oscuro vino/dorado — pedido de Carlos.
- Firebase (Firestore + acceso anónimo) solo para lo de pareja; lo demás funciona sin internet.
- La privacidad la garantizan las reglas de Firebase, no la pantalla: en el Match nadie lee el voto del otro (el match lo valida la regla al crear `match_matches`); en el mapa la versión del otro se ve solo tras escribir la propia.
- Mapa: MapLibre 4.7.1 + estilo Liberty de OpenFreeMap con nombres en español — pedido explícito de Carlos.
- Fotos de lugares comprimidas (1200 px) en Firestore, máx. 6 por lugar — sin Firebase Storage (pide tarjeta).
- Foto de inicio: elegida de la galería, guardada solo en ese celular.
## Estado actual
- Funciona y está verificado: todo publicado con caché `okupa-v15` (pruebas.html: 318 pasan; reglas: 43 pasan en el emulador; GitHub Pages sirve la versión).
- Últimos cambios: subir varias fotos a la vez, ficha del lugar que abre al instante, Match que pasa de carta sin esperar a la red.
- A medias: — (sin probar en un celular real: toque largo en el mapa, galería, Liberty dentro de la pantalla con pareja).
- Pendientes menores: fotos se descargan completas la primera vez; la foto de inicio entra en la copia de seguridad; algunas preguntas usan masculino genérico.
## Archivos clave
- `js/nucleo/`: navegación, almacenamiento, inicio, portada, pareja/nube (Firebase).
- `js/modulos/match/`: lógica de votos, pantallas; tarjetas en `data/match/tarjetas.json`.
- `js/modulos/mapa/`: `motor.js` (MapLibre/Liberty), `lugares.js` y `lugares-ui.js` (deseos/recuerdos, fotos).
- `js/modulos/{preguntas,trivia,diario}/` y `data/`: el resto de secciones y su contenido.
- `firebase/firestore.rules` y `firebase/pruebas/`: reglas y sus pruebas.
- `sw.js`: caché sin internet (`CACHE` y lista `PRECACHE`).
- `pruebas.html` + `pruebas/`: pruebas en el navegador.
- `LEEME.md`: cómo publicar, conectar Firebase y agregar contenido.
## Próximo paso
Esperar lo que Carlos pida tras probar la v15 en el celular (sin tarea pendiente asignada).
## Cómo verificar
- App: `python herramientas/servidor.py` y abrir http://127.0.0.1:8080/pruebas.html → debe decir "0 fallaron".
- Reglas: en `firebase/`, `npm install` (la primera vez; `node_modules` se borró para ahorrar espacio) y luego `npm test` (Node + Java); al terminar cerrar el java que queda en el puerto 8085.
- Publicado: `https://carlosgmx7.github.io/okupa/sw.js` debe mostrar la `CACHE` actual.
## Cuidado con
- Cada cambio: subir `CACHE` en `sw.js` (próxima `okupa-v16`) y agregar archivos nuevos a `PRECACHE` y a `pruebas/pwa.prueba.js`.
- Si cambian las reglas, Carlos debe pegarlas en Firebase (Firestore → Reglas → Publicar) antes de publicar la app.
- `append()` nativo convierte listas y `null` en texto ("[object …]"): pasar hijos por `el()` o filtrar.
- Usar http://127.0.0.1:8080 (no `localhost`, que tarda); el navegador del panel no pinta mapas si la ventana está oculta.
- En Windows el emulador de Firebase queda abierto tras `npm test` y ocupa el puerto 8085.
- El Bash de Git falla con errores de fork: usar PowerShell para git.
