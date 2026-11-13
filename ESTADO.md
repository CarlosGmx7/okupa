# Estado de Okupa — 2026-11-13
## Objetivo
App web instalable (PWA) para Carlos y su pareja: preguntas para conocerse, Trivia, Diario, Match de deseos y Mapa con lugares. Publicada en https://carlosgmx7.github.io/okupa/ (repo CarlosGmx7/okupa, rama `main`).
## Decisiones tomadas
- HTML/CSS/JS con módulos ES, sin compilación; módulos activos en `modulos.json` — simple de mantener y publicar en GitHub Pages.
- Español colombiano con tuteo; Carlos prefiere que le pregunten con opciones para elegir (y espacio para escribir otra cosa).
- Firebase (Firestore + acceso anónimo) solo para lo de pareja; lo demás funciona sin internet.
- La privacidad la garantizan las reglas de Firebase, no la pantalla (Match y versiones del mapa).
- Mapa: MapLibre 4.7.1 + estilo Liberty de OpenFreeMap con nombres en español — pedido de Carlos.
- Fotos de lugares comprimidas en Firestore, máx. 6 — sin Firebase Storage (pide tarjeta).
- Dos temas por celular (`okupa:ajustes`): "Vino y dorado" (predeterminado, el original) y "Grafito y rosa" (limpio, solo Inter, íconos de línea). Grafito redefine las mismas variables CSS (`--dorado`, `--vino`, `*-rgb`…) en `:root[data-tema="grafito"]`.
- Botones: un solo "resorte" con la propiedad `scale` (no `transform`). Sonidos sintetizados (Web Audio) solo en match, acierto de Trivia y guardados; vibración corta al tocar (en `click`).
- Notificaciones (v17): GitHub Actions cada 15 min + Firebase Cloud Messaging (gratis, sin plan Blaze); recordatorio del Diario a la hora elegida y avisos de pareja.
## Estado actual
- Funciona y está verificado en local: v16 en la rama `v16-ajustes` (pruebas.html: 350 pasan; revisión final hecha y arreglada). Caché `okupa-v16`.
- A medias: falta unir `v16-ajustes` a `main` y publicar (esperando el visto bueno de Carlos); sin probar en un celular real (sonido en iPhone, vibración, resorte).
- Pendientes menores: reglas `transition: none` de movimiento reducido en componentes.css quedaron sin efecto; el `:is(... button)` del resorte gana a transiciones de botones declaradas antes; fotos de lugares se descargan completas la primera vez.
## Archivos clave
- `js/nucleo/ajustes.js`, `tema.js`, `iconos.js`, `sonidos.js`, `pantalla-ajustes.js`: lo nuevo de la v16.
- `js/nucleo/`: navegación (`app.js`), almacenamiento, inicio, portada, pareja/nube (Firebase).
- `js/modulos/{preguntas,trivia,diario,match,mapa}/` y `data/`: secciones y su contenido.
- `css/base.css` (variables y temas) y `css/componentes.css` (al final: Grafito, íconos, resorte, Ajustes).
- `firebase/firestore.rules` y `firebase/pruebas/`: reglas y sus pruebas.
- `sw.js`: caché sin internet (`CACHE` y `PRECACHE`).
- `docs/superpowers/specs|plans/2026-11-13-ajustes-temas-animaciones*`: diseño y plan de la v16.
## Próximo paso
Tras publicar la v16 y que Carlos la pruebe: diseñar la v17 (notificaciones) con brainstorming, partiendo del resumen al final del spec de la v16.
## Cómo verificar
- App: `python herramientas/servidor.py` y abrir http://127.0.0.1:8080/pruebas.html → debe decir "0 fallaron".
- Reglas: en `firebase/`, `npm install` (la primera vez) y luego `npm test`; al terminar cerrar el java del puerto 8085.
- Publicado: `https://carlosgmx7.github.io/okupa/sw.js` debe mostrar la `CACHE` actual.
## Cuidado con
- Cada cambio: subir `CACHE` en `sw.js` (próxima `okupa-v17`) y agregar archivos nuevos a `PRECACHE` y a `pruebas/pwa.prueba.js`; pruebas nuevas a la lista de `pruebas.html`.
- `--acento` ya es el color de cada categoría en las cartas: no usarlo para el tema.
- Probar en local: el service worker sirve la caché vieja; desregistrarlo en el navegador del panel antes de mirar cambios.
- `append()` nativo convierte listas y `null` en texto: pasar hijos por `el()`.
- Usar http://127.0.0.1:8080 (no `localhost`); el navegador del panel no pinta mapas si la ventana está oculta.
- Bash falla con errores de fork: usar PowerShell. En scripts .ps1 con símbolos (✦, ∞) guardar con BOM, y no llamar `R` a una función (es un alias de PowerShell).
- Si cambian las reglas, Carlos debe pegarlas en Firebase (Firestore → Reglas → Publicar) antes de publicar la app.
