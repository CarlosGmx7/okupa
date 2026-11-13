# Ajustes, tema Grafito, animaciones y sonidos (v16) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pantalla de Ajustes con engranaje, tema "Grafito y rosa" elegible, animación de resorte única para todo lo tocable, y sonidos/vibración apagables.

**Architecture:** Los ajustes viven en `okupa:ajustes` (almacén del celular). El tema es `data-tema` en `<html>`, que redefine variables CSS; un script en línea lo aplica antes de pintar. Íconos de línea en SVG conviven con los glifos y el CSS muestra unos u otros según el tema. Sonidos sintetizados con Web Audio.

**Tech Stack:** HTML/CSS/JS con módulos ES, sin compilación; pruebas propias en `pruebas.html` (`prueba`, `igual`, `verdadero` de `pruebas/corredor.js`).

**Spec:** `docs/superpowers/specs/2026-11-13-ajustes-temas-animaciones-design.md`

## Global Constraints

- Sin librerías nuevas, todo local; debe funcionar sin internet.
- Español colombiano con tuteo en todo texto visible.
- Crear nodos con `el()` de `js/nucleo/ui.js`.
- El tema vino no cambia en nada visible, salvo el engranaje, la animación unificada y el lápiz de la portada.
- Contraste en Grafito: texto ≥ 4,5:1, bordes de controles ≥ 3:1.
- Respetar `prefers-reduced-motion`.
- `CACHE` en `sw.js` = `okupa-v16`; todo archivo nuevo en `PRECACHE` y en `ESPERADOS` de `pruebas/pwa.prueba.js`; todo archivo de prueba nuevo en la lista de `pruebas.html`.
- `--acento` YA existe (color por categoría en `ui.js` → `crearCarta`): no reutilizar ese nombre para el tema; usar `--resalte` y `--sobre-resalte`.
- Bash falla en esta máquina: usar PowerShell para git y comandos.
- Servidor: `python herramientas/servidor.py` → http://127.0.0.1:8080/pruebas.html debe decir "0 fallaron".

## Review Focus

- `localStorage` con `okupa:ajustes` corrupto (`"{"`, `null`, `[]`, `{tema:'rojo'}`) → la app abre en vino con sonidos y vibración activos, sin error en consola.
- "Borrar datos de este celular" estando en Grafito → tras recargar queda en vino.
- Cambiar de tema con una pantalla abierta (p. ej. Match con carta) → los íconos cambian sin recargar, porque los dos están en el DOM.
- Navegador sin `AudioContext` ni `navigator.vibrate` (iPhone) → `sonar()` y `vibrar()` no lanzan; el interruptor de vibración muestra "En iPhone no está disponible".
- Arrastrar la carta del Match → no recibe el resorte (`.carta.arrastrando` sigue sin transición).

---

### Task 1: Ajustes guardados

**Files:**
- Create: `js/nucleo/ajustes.js`
- Test: `pruebas/ajustes.prueba.js` (agregar a `pruebas.html`)

**Interfaces:**
- Produces:
  - `AJUSTES_DEFECTO = { tema: 'vino', sonidos: true, vibracion: true }`
  - `TEMAS = ['vino', 'grafito']`
  - `leerAjustes(almacen) → { tema, sonidos, vibracion }` (siempre válido; campo inválido → defecto de ese campo)
  - `cambiarAjuste(almacen, clave, valor) → { tema, sonidos, vibracion }` (ignora claves/valores inválidos; guarda y avisa)
  - `alCambiarAjustes(fn) → () => void` (suscribe; devuelve función para desuscribir). Aviso con `window.dispatchEvent(new CustomEvent('okupa:ajustes', { detail: ajustes }))`.

- [ ] **Step 1: Escribir las pruebas** (usar `almacenEnMemoria` de `pruebas/pareja.prueba.js`)
  - `ajustes: sin nada guardado da los valores por defecto` → `igual(leerAjustes(a), { tema: 'vino', sonidos: true, vibracion: true })`
  - `ajustes: datos dañados vuelven al defecto` → con `null`, `[]`, `'x'` y `{ tema: 'rojo', sonidos: 'si' }` guardados, `igual(leerAjustes(a), AJUSTES_DEFECTO)`
  - `ajustes: conserva los campos válidos` → `{ tema: 'grafito', sonidos: 7 }` → `{ tema: 'grafito', sonidos: true, vibracion: true }`
  - `ajustes: cambiarAjuste guarda y avisa` → `cambiarAjuste(a,'tema','grafito')`; `igual(a.leer('okupa:ajustes').tema, 'grafito')`; el suscriptor recibió `tema: 'grafito'`
  - `ajustes: cambiarAjuste ignora valores inválidos` → `cambiarAjuste(a,'tema','rojo')` y `cambiarAjuste(a,'nada',1)` dejan `leerAjustes(a)` igual al defecto
- [ ] **Step 2: Correr `pruebas.html`** → fallan las 5 (módulo inexistente).
- [ ] **Step 3: Implementar `js/nucleo/ajustes.js`** con la interfaz de arriba.
- [ ] **Step 4: Correr `pruebas.html`** → 0 fallaron.
- [ ] **Step 5: Commit** `feat: ajustes guardados por celular (tema, sonidos, vibración)`

### Task 2: Tema Grafito y rosa (+ lápiz de la portada)

**Files:**
- Create: `js/nucleo/tema.js`
- Modify: `css/base.css` (tokens por papel + bloque `[data-tema="grafito"]`), `css/componentes.css` (usar tokens por papel; lápiz), `index.html` (script en línea en `<head>`, después de la línea 17), `js/nucleo/app.js` (aplicar tema al arrancar y al cambiar ajustes)
- Test: `pruebas/tema.prueba.js`

**Interfaces:**
- Consumes: `leerAjustes`, `alCambiarAjustes` (Task 1)
- Produces:
  - `COLOR_BARRA = { vino: '#140a0e', grafito: '#0E0E11' }`
  - `aplicarTema(tema, doc = document) → void`: pone `doc.documentElement.dataset.tema` y el `content` de `meta[name="theme-color"]`; tema desconocido → `'vino'`.

- [ ] **Step 1: Escribir las pruebas**
  - `tema: aplicarTema pone data-tema y el color de la barra` → con un documento de prueba (`document.implementation.createHTMLDocument()` + `<meta name="theme-color">`): `aplicarTema('grafito', d)` → `igual(d.documentElement.dataset.tema, 'grafito')`, `igual(meta.content, '#0E0E11')`; `aplicarTema('rojo', d)` → `'vino'` y `'#140a0e'`.
  - `tema: el script de index.html tolera ajustes dañados` → leer `index.html`, extraer el `<script>` que contiene `okupa:ajustes`, ejecutarlo con `new Function('localStorage','document', código)` pasando un `localStorage` falso con `'{'` y un documento de prueba → `data-tema` = `'vino'`, sin excepción; con `'{"tema":"grafito"}'` → `'grafito'`.
  - `tema: Grafito define todas las variables por papel` → con `CSSStyleSheet` de `css/base.css` (patrón de `estilos.prueba.js`): la regla `[data-tema="grafito"]` define `--fondo`, `--superficie`, `--superficie-alta`, `--crema`, `--tenue`, `--resalte`, `--sobre-resalte`, `--borde`, `--peligro`, `--serif`, `--radio`, `--radio-chico`.
  - `tema: el lápiz de la portada mide 20px` → la regla `.inicio-portada-boton::after` de `componentes.css` tiene `width: 20px`, `height: 20px`, `font-size: 10px`.
- [ ] **Step 2: Correr** → fallan.
- [ ] **Step 3: Tokens por papel en `css/base.css`.** En `:root` agregar `--resalte`, `--sobre-resalte`, `--borde`, `--peligro` con los valores que hoy cumplen esos papeles en vino (salen de recorrer los 192 usos de `--vino`/`--vino-claro`/`--dorado`/`--dorado-suave` en `componentes.css`). Reemplazar en `componentes.css` solo donde el papel no coincide con el color en Grafito (fondo de botón principal, texto sobre botón, bordes, peligro). Comprobar a ojo en el navegador que vino se ve idéntico (captura antes/después de inicio, Match y Ajustes).
- [ ] **Step 4: Bloque `[data-tema="grafito"]`** con la tabla del spec: fondo `#0E0E11`, superficie `#18181C`, superficie-alta `#232329`, crema `#F4F4F5`, tenue `#A1A1AA`, resalte `#F472B6`, sobre-resalte `#1A0B12`, borde `rgba(255,255,255,.08)`, peligro `#F87171`; `--serif: var(--sans)`; `--radio: 20px`; `--radio-chico: 14px`; `body::before, body::after { display: none }`; títulos con peso 600 y `letter-spacing: -0.02em`; sombras mínimas. Los `rgba(...)` fijos de vino en `componentes.css` (p. ej. sombras de la portada) se neutralizan en Grafito.
- [ ] **Step 5: Lápiz** en `.inicio-portada-boton::after`: 20 px, glifo 10 px, un poco más hacia el borde (`right: -2px`, `bottom: 12px`); fondo `var(--resalte)` y color `var(--sobre-resalte)`.
- [ ] **Step 6: Script en línea en `index.html`** que lee `localStorage.getItem('okupa:ajustes')` con `JSON.parse` dentro de `try`, valida `tema ∈ {vino, grafito}` y aplica `data-tema` y `theme-color` (misma lógica que `aplicarTema`; duplicada a propósito para evitar el destello). En `app.js`: `aplicarTema(leerAjustes(almacen).tema)` al inicio y `alCambiarAjustes((a) => aplicarTema(a.tema))`.
- [ ] **Step 7: Correr** → 0 fallaron. Revisar contraste en Grafito (botón principal, texto tenue sobre superficie, borde de campos).
- [ ] **Step 8: Commit** `feat: tema Grafito y rosa elegible; lápiz de portada más pequeño`

### Task 3: Íconos de línea

**Files:**
- Create: `js/nucleo/iconos.js`
- Modify: `js/nucleo/inicio.js` (juntos `∞` y accesos), `js/nucleo/ui.js` (`carta-icono`), `js/modulos/match/pantallas.js` (líneas ~94, 156, 203, 226), `js/modulos/mapa/lugares-ui.js` (`ICONO`, líneas ~45, 148, 302), `js/modulos/preguntas/pantallas.js` (chip de tema, línea ~68), `css/componentes.css` (visibilidad por tema)
- Test: `pruebas/iconos.prueba.js`

**Interfaces:**
- Produces:
  - `ICONOS_LINEA`: objeto glifo → contenido SVG (paths) para `∞ ☼ ⌖ ♥ ★ ✦ ♡ ✈ ☀ ✎ ϟ ❦` y la clave `'ajustes'` (engranaje).
  - `icono(glifo) → HTMLSpanElement`: `<span class="ico" aria-hidden="true"><span class="ico-glifo">glifo</span><svg class="ico-linea" …></svg></span>`; glifo sin mapeo → solo `.ico-glifo`.
  - `iconoLinea(nombre) → SVGElement` (solo el SVG; para el engranaje, que se ve en ambos temas).
- CSS: `.ico-linea { display:none }`; en `[data-tema="grafito"]`: `.ico-linea { display:inline-block }` y `.ico-glifo { display:none }` (solo cuando el `.ico` tiene SVG). SVG 24×24 escalado a `1em`, `stroke: currentColor`, `stroke-width: 1.75`, `fill: none`.

- [ ] **Step 1: Pruebas**
  - `iconos: cada glifo mapeado trae glifo y SVG` → para cada clave de `ICONOS_LINEA` salvo `'ajustes'`: `icono(g)` tiene `.ico-glifo` con texto `g` y un `svg.ico-linea`.
  - `iconos: glifo desconocido se queda como texto` → `icono('Z')` sin `svg`, texto `'Z'`.
  - `iconos: el inicio usa íconos` → `pantallaInicio` con módulo `accesoJuntos: { icono: '☼' }` contiene `.juntos-acceso .ico svg`.
- [ ] **Step 2: Correr** → fallan.
- [ ] **Step 3: Implementar `iconos.js`** (trazos estilo Lucide, con comentario de licencia ISC arriba) y reemplazar los glifos en los archivos listados por `icono(...)`. En los textos armados con plantilla (`` `${m.icono} ${m.nombre}` ``), pasar a hijos `[icono(m.icono), ' ', m.nombre]`. Los pines del mapa (`pin-icono`) también.
- [ ] **Step 4: Correr** → 0 fallaron (ajustar pruebas viejas que comparan `textContent` con el glifo si hace falta, sin perder lo que prueban).
- [ ] **Step 5: Commit** `feat: íconos de línea para el tema Grafito`

### Task 4: Resorte, sonidos y vibración

**Files:**
- Create: `js/nucleo/sonidos.js`
- Modify: `css/base.css` (tokens de movimiento), `css/componentes.css` (regla única de presión; quitar las `transition: transform` dispersas de esos selectores), `js/nucleo/app.js` (instalar toque), `js/modulos/trivia/pantallas.js` y `js/modulos/diario/pantallas.js` (sus `vibrar` locales pasan a usar el de `sonidos.js`), `js/modulos/match/pantallas.js` (`festejar` → `sonar('match')`), `js/modulos/trivia/pantallas.js` línea ~315 (acierto → `sonar('acierto')`), `js/modulos/diario/pantallas.js` (al enviar la respuesta del día, antes de "Respondiste ✓" → `sonar('guardado')`), `js/modulos/mapa/lugares-ui.js` línea ~98 (lugar creado → `sonar('guardado')`)
- Test: `pruebas/sonidos.prueba.js`

**Interfaces:**
- Consumes: `leerAjustes` (Task 1)
- Produces:
  - `crearSonidos({ almacen, crearContexto = () => new (AudioContext||webkitAudioContext)(), vibrador = navigator.vibrate?.bind(navigator) })` → `{ sonar(nombre), vibrar(patron), instalarToque(doc = document) }`
  - `sonar(nombre)`: `'match' | 'acierto' | 'guardado'`; no hace nada si `sonidos` está apagado, si el nombre no existe o si no hay `AudioContext`; nunca lanza. Volumen ≤ 0,15, duración ≤ 400 ms.
  - `vibrar(patron)`: respeta `vibracion`; nunca lanza.
  - `instalarToque(doc)`: registra `touchstart` pasivo vacío (para `:active` en iOS) y `pointerdown` delegado que llama `vibrar(8)` si el objetivo está dentro de `SELECTOR_TOCABLE`; reanuda el `AudioContext` en el primer toque.
  - `SELECTOR_TOCABLE = '.boton, .acceso, .juntos-principal, .juntos-acceso, .opcion-juego, .opcion-diario, .punto-escala, .chip, .burbuja, .voto, .engranaje, .fila-ajuste, .tema-opcion, button'`
  - Instancia compartida exportada: `sonidos` (creada con el `almacen` real) con atajos `sonar`, `vibrar`.
- CSS de movimiento en `:root`: `--presion-escala: .96`, `--presion-tiempo: 90ms`, `--resorte-tiempo: 420ms`, `--resorte: cubic-bezier(.34, 1.56, .64, 1)`; con `@supports (transition-timing-function: linear(0, 1))` usar una curva `linear()` con rebote ~4 %. Regla: los selectores tocables en reposo `transition: transform var(--resorte-tiempo) var(--resorte)`; en `:active` `transform: scale(var(--presion-escala)); transition-duration: var(--presion-tiempo); transition-timing-function: ease-out`. Excluir `.carta`, `.carta.arrastrando` y `[disabled]`. En `prefers-reduced-motion`: sin escala, `opacity: .85` en `:active`.

- [ ] **Step 1: Pruebas** (contexto de audio falso que cuenta osciladores creados; vibrador falso que guarda patrones)
  - `sonidos: suena con el ajuste activo` → `sonar('match')` crea ≥ 1 oscilador.
  - `sonidos: calla con el ajuste apagado` → tras `cambiarAjuste(a,'sonidos',false)`, 0 osciladores.
  - `sonidos: sin AudioContext no falla` → `crearContexto` que lanza; `sonar('match')` no lanza.
  - `sonidos: nombre desconocido no hace nada` → 0 osciladores.
  - `sonidos: vibrar respeta el ajuste` → activo: guarda `8`; apagado: nada; sin vibrador: no lanza.
  - `sonidos: tocar un botón vibra` → `instalarToque(doc)` sobre un documento de prueba; `pointerdown` en `<button>` → vibrador recibió `8`; en un `<p>` → nada.
  - `estilos: la carta del Match no recibe el resorte` → en `componentes.css`, `.carta.arrastrando` sigue con `transition: none`.
- [ ] **Step 2: Correr** → fallan.
- [ ] **Step 3: Implementar `sonidos.js`**: `match` = dos notas ascendentes (p. ej. 523 Hz → 784 Hz, onda seno, 0,18 s c/u); `acierto` = una nota de 880 Hz de 0,15 s; `guardado` = tic de 1200 Hz de 0,05 s con caída rápida. Un solo `AudioContext` perezoso.
- [ ] **Step 4: CSS de resorte** y limpieza de las transiciones dispersas de `transform` en esos selectores (líneas 111, 162, 217, 288, 297, 331, 425, 490, 701 y `.voto`).
- [ ] **Step 5: Conectar** `instalarToque()` en `app.js` y los `sonar()` en los cuatro puntos; reemplazar los `vibrar` locales de trivia y diario por el compartido.
- [ ] **Step 6: Correr** → 0 fallaron. En el navegador: presionar y soltar un botón se ve hundirse y rebotar.
- [ ] **Step 7: Commit** `feat: animación de resorte en todo lo tocable, sonidos y vibración apagables`

### Task 5: Pantalla de Ajustes y engranaje

**Files:**
- Create: `js/nucleo/pantalla-ajustes.js`
- Modify: `js/nucleo/inicio.js` (engranaje en la cabecera; quitar "Empezar de cero" de `pantallaAcerca`), `js/nucleo/app.js` (`tabla.ajustes = pantallaAjustes`), `css/componentes.css` (engranaje, lista agrupada, interruptor, tarjetas de tema)
- Test: `pruebas/pantalla-ajustes.prueba.js`; ajustar `pruebas/inicio.prueba.js` si probaba "Reiniciar todo" en Acerca.

**Interfaces:**
- Consumes: `leerAjustes`, `cambiarAjuste` (Task 1); `abrirEditorPortada`, `fuentePortada` (`portada.js`); `iconoLinea('ajustes')` (Task 3)
- Produces: `pantallaAjustes(contenedor, params, ctx)`; clases `.engranaje`, `.grupo-ajustes`, `.fila-ajuste`, `.interruptor`, `.tema-opcion`.

Copy exacto (del spec): título "Ajustes"; grupos "Tema", "Foto", "Sonidos y vibración", "Datos"; la tarjeta "Vino y dorado" lleva la etiqueta "Predeterminado"; filas "Foto de inicio", "Sonidos", "Vibración al tocar", "Datos de la pareja", "Borrar datos de este celular", enlace "Acerca de Okupa"; nota de vibración sin soporte: "En iPhone no está disponible"; tarjetas de tema "Vino y dorado" y "Grafito y rosa". Confirmación de borrar = el mismo texto de hoy: "¿Seguro? Se borrará todo lo guardado en este celular, incluidas sus preguntas propias."

- [ ] **Step 1: Pruebas**
  - `inicio: el engranaje lleva a Ajustes` → `.engranaje` es `a[href="#/ajustes"]` con `aria-label="Ajustes"` y un `svg`.
  - `ajustes: se pinta con los grupos y filas` → los cuatro títulos de grupo y las filas del copy exacto.
  - `ajustes: sin nada guardado está marcado Vino y dorado (Predeterminado)` → `.tema-opcion[data-tema="vino"]` con `aria-checked="true"` y texto "Predeterminado".
  - `ajustes: tocar Grafito cambia el tema al instante` → click en `.tema-opcion[data-tema="grafito"]` → `leerAjustes(a).tema === 'grafito'` y esa opción tiene `aria-checked="true"`.
  - `ajustes: los interruptores cambian el ajuste` → `.interruptor` de Sonidos tiene `role="switch"`, `aria-checked="true"`; click → `false` y `leerAjustes(a).sonidos === false`.
  - `ajustes: sin vibración en el celular se avisa` → con `navigator.vibrate` ausente (inyectar `ctx.puedeVibrar = false` o parámetro equivalente) aparece "En iPhone no está disponible".
  - `ajustes: borrar datos usa la confirmación de siempre` → con `confirm` falso que devuelve `false`, no borra nada; que devuelve `true`, borra todas las `okupa:*` (inyectar `ctx.confirmar` y `ctx.recargar` para no recargar la página de pruebas).
  - `acerca: ya no trae "Reiniciar todo"`.
- [ ] **Step 2: Correr** → fallan.
- [ ] **Step 3: Implementar** la pantalla (lista agrupada como en el boceto del spec, filas ≥ 44 px, interruptor con `role="switch"`), el engranaje 44×44 arriba a la derecha de `.inicio-cabecera` respetando `env(safe-area-inset-top)`, y la ruta.
- [ ] **Step 4: Correr** → 0 fallaron.
- [ ] **Step 5: Commit** `feat: pantalla de Ajustes con engranaje en el inicio`

### Task 6: Caché v16, verificación y publicación

**Files:**
- Modify: `sw.js` (`CACHE = 'okupa-v16'`; `PRECACHE` + `js/nucleo/ajustes.js`, `js/nucleo/tema.js`, `js/nucleo/iconos.js`, `js/nucleo/sonidos.js`, `js/nucleo/pantalla-ajustes.js`), `pruebas/pwa.prueba.js` (mismos en `ESPERADOS`), `ESTADO.md`

- [ ] **Step 1:** Actualizar `sw.js` y `pwa.prueba.js`; correr `pruebas.html` → 0 fallaron.
- [ ] **Step 2: Verificación visual** en el navegador del panel a 375 px: inicio, Ajustes, Match, Trivia, Diario y Mapa en vino y en Grafito; abrir con `okupa:ajustes` = `{"tema":"grafito"}` y recargar sin destello vino; consola sin errores.
- [ ] **Step 3:** Actualizar `ESTADO.md` (v16, próximo paso: v17 notificaciones).
- [ ] **Step 4: Commit y push a `main`** (GitHub Pages publica). Comprobar que `https://carlosgmx7.github.io/okupa/sw.js` muestra `okupa-v16`.
