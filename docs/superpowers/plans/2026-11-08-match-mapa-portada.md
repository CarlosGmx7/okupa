# Match, Mapa con lugares y foto de inicio · Plan

> Ejecución: en esta sesión (native), TDD por tarea, revisión independiente al final.

**Spec:** `docs/superpowers/specs/2026-11-08-match-mapa-portada-design.md` · **Rama:** `match-mapa`

## Restricciones globales
- Vanilla ES modules, sin compilación; librerías externas solo con versión fija y cacheadas por `sw.js`.
- Texto de usuario/datos siempre con `textContent` (vía `el()`); `localStorage` solo vía `almacen`.
- Español colombiano con tuteo. Nada de lo que vote o escriba uno se revela si las reglas no lo permiten.
- Pruebas: `pruebas.html` en `0 fallaron`; reglas: `firebase/` con emuladores (`npm run pruebas`).
- Al terminar: subir `CACHE` en `sw.js`, actualizar `PRECACHE`, `LEEME.md` y las reglas.

## Tareas
1. **Foto de inicio** — `js/nucleo/portada.js` (`fuentePortada`, `guardarPortada`, `borrarPortada`,
   `rectFuente`, `recortarCuadrado`, `abrirEditorPortada`) + botón en `inicio.js` + estilos.
   Pruebas: `pruebas/portada.prueba.js`.
2. **MapLibre + Liberty** — `js/modulos/mapa/motor.js` (carga MapLibre fija, estilo Liberty, etiquetas
   en español, marcadores HTML, línea de ruta); `pantallas.js` migra de Leaflet; `sw.js` cachea MapLibre.
   Pruebas: etiquetas en español sobre un estilo de muestra; manual.
3. **Lugares del mapa** — `js/modulos/mapa/lugares.js` (CRUD, versiones con revelado, fotos comprimidas,
   búsqueda Photon), capas e interruptores, ficha del lugar. Pruebas con nube falsa + compresión.
4. **Match: contenido y lógica** — `data/match/tarjetas.json` (~150), `js/modulos/match/logica.js`
   (votar, match, pendientes, plan semanal). Pruebas de contenido y lógica con nube falsa.
5. **Match: pantallas y módulo** — mazo deslizable, "¡Match!", lista con "¡Lo hicimos!", crear tarjeta,
   tarjeta de inicio y acceso "Jugar juntos".
6. **Reglas de Firebase** — `match_*`, `lugares/*` + pruebas en emuladores.
7. **Cierre** — `sw.js` (versión y PRECACHE), `LEEME.md`, revisión independiente y arreglos.
