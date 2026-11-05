# Okupa · Etapa 2: Trivia en vivo · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la pareja juegue en vivo, cada uno en su celular, partidas de 10 preguntas de cultura general con 20 s por pregunta, revelado, marcador e historial de victorias.

**Architecture:** Módulo nuevo `js/modulos/trivia/` registrado en `modulos.json`. La lógica pura (bancos, selección, matemáticas generadas, puntaje y avance de la partida) está separada de la nube (`sala.js`, que usa la interfaz `Nube` de la etapa 1) y de la interfaz (`pantallas.js`). El inglés se genera en `js/compartido/ingles.js` porque lo reutiliza el Diario. Los bancos viven en `data/trivia/` y `data/ingles/`.

**Tech Stack:** HTML/CSS/JS con módulos ES sin compilación; Firestore vía `js/nucleo/nube.js`; pruebas en `pruebas.html` con la nube falsa; emuladores de Firebase para la prueba manual.

**Spec:** `docs/superpowers/specs/2026-11-04-okupa-trivia-diario-design.md` (secciones 2, 3.1–3.4, 4.2, 6.3, 6.5, 7, 8, 9 y etapa 2 de la 10).

## Global Constraints

- Las mismas de la etapa 1 (`docs/superpowers/plans/2026-11-04-okupa-etapa1-nube-pareja.md`): sin compilación, `el()` para todo texto, `almacen.js` para localStorage, tuteo colombiano, commits con `git commit -F` y la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, suite en "0 fallaron".
- Partida: **10 preguntas**, **20 s** cada una (20000 ms), avance forzado a los **22 s** (2 s de gracia), siguiente automática **5 s** después del revelado.
- Puntos: acierto = `100 + Math.round(50 * (20000 - ms) / 20000)` con `ms` acotado a [0, 20000]; fallo o sin respuesta = 0.
- Temas (ids fijos): `arte`, `historia`, `ciencia`, `matematicas`, `deportes`, `canserbero`, `lana`, `ingles`. (`conoces` llega en la etapa 4.)
- Prefijos de id: `art-`, `his-`, `cie-`, `dep-`, `can-`, `lan-` + 3 cifras; inglés `en-` + 4 cifras; matemáticas generadas `mat-` + plantilla + parámetros.
- Pregunta de trivia (forma única para bancos y generadores): `{ id, tema, tipo: 'vf'|'opciones', texto, respuesta, opciones?, dato, ref? }`. En `vf`, `respuesta` es `true|false` y no hay `opciones`. En `opciones`, `opciones` son 4 textos distintos y `respuesta` es el índice 0–3.
- Datos de trivia verificados en una fuente (`ref`: URL o referencia bibliográfica); V/F con 40–60 % de verdaderos por tema; nada sobre los detalles de la muerte de Canserbero.
- Nube: partidas en `parejas/{codigo}/partidas/{id}`, uso en `parejas/{codigo}/estado/uso`. Las reglas actuales ya permiten a los miembros leer y escribir ahí.
- Al cambiar archivos precacheados: `CACHE` de `sw.js` pasa a `okupa-v5`; agregar los archivos nuevos a `PRECACHE` y a `ESPERADOS` de `pruebas/pwa.prueba.js`.

## Review Focus

1. Uno de los dos cierra la app o pierde señal a mitad de pregunta → el otro ve "Se desconectó, esperando…", la partida avanza igual por tiempo, y al volver sigue en la pregunta actual. (Prueba en Task 6.)
2. Los dos celulares intentan avanzar a la vez → la partida avanza exactamente una pregunta. (Prueba en Task 6.)
3. Alguien toca dos veces o cambia de opción → cuenta solo la primera respuesta. (Prueba en Task 5 y Task 6.)
4. Se acaba un banco de un tema → la partida sigue armándose con 10 preguntas sin repetir dentro de la partida. (Prueba en Task 4.)
5. El reloj de un celular está adelantado → no le quita ni le da puntos al otro (cada uno mide su propio tiempo). (Prueba en Task 5.)

---

### Task 1: Temas, forma de las preguntas y bancos iniciales

**Files:**
- Create: `data/trivia/temas.json`
- Create: `data/trivia/arte.json`, `historia.json`, `ciencia.json`, `deportes.json`, `canserbero.json`, `lana.json`
- Create: `js/modulos/trivia/banco.js` (solo carga y validación en esta task)
- Create: `pruebas/trivia-contenido.prueba.js`
- Modify: `pruebas.html`

**Interfaces:**
- Produces:
  - `TEMAS_BANCO = ['arte', 'historia', 'ciencia', 'deportes', 'canserbero', 'lana']`
  - `async cargarTrivia(fetchFn = (u) => fetch(u)) → { temas: Tema[], bancos: { [tema]: Pregunta[] } }` (Task 3 le agrega `vocabulario`).
  - `problemaDePreguntaTrivia(p, temasValidos: Set) → string|null`
  - `validarBancos(bancos, temas) → string[]` (errores: id repetido, prefijo incorrecto, forma inválida, `dato` vacío, falta `ref`, balance V/F fuera de 40–60 % en un tema con ≥ 10 V/F).
  - `temas.json`: `[{ id, nombre, icono, color }]` con, en este orden: Arte `✎` `#d4566f`; Historia `♜` `#c9a45c`; Ciencia `⚗` `#7fb7a8`; Matemáticas `∑` `#8f9fd6`; Deportes `◎` `#e39a6b`; Canserbero `♪` `#b07ad1`; Lana del Rey `☾` `#e8b4c8`; Inglés `Aa` `#9ccf8a`.

- [ ] **Step 1: Pruebas que fallan** en `pruebas/trivia-contenido.prueba.js`:
  - `trivia contenido: bancos válidos` — `validarBancos(...)` da `[]`.
  - `trivia contenido: al menos 12 preguntas por tema de banco` (sube a 40 en Task 9).
  - `trivia: problemaDePreguntaTrivia detecta formas malas` — vf con `opciones`; opciones con 3 elementos o repetidas; `respuesta` 4 en opciones; `dato` vacío; tema inexistente.
  - `trivia: validarBancos detecta balance V/F roto` — 10 V/F todas verdaderas → error que nombra el tema.
- [ ] **Step 2: Correr y ver que fallan.**
- [ ] **Step 3: Escribir `banco.js` (carga y validación) y los JSON** con 12 preguntas verificadas por tema (≈ 70 % V/F), cada una con `dato` de 1–2 líneas y `ref`.
- [ ] **Step 4: Suite en "0 fallaron".**
- [ ] **Step 5: Commit** — `Temas y bancos iniciales de la trivia`.

---

### Task 2: Matemáticas generadas

**Files:**
- Create: `js/modulos/trivia/matematicas.js`
- Create: `pruebas/matematicas.prueba.js`
- Modify: `pruebas.html`

**Interfaces:**
- Produces: `PLANTILLAS_MATE: Array<{ id, generar(rnd) → { texto, valor: number, params, dato } }>` y `generarMatematica(rnd = Math.random, plantilla?) → Pregunta` (tema `matematicas`, tipo `opciones`, 4 opciones numéricas como texto en formato `es-CO`, id `mat-<plantilla>-<params unidos con _>`).
- Plantillas (ids): `porcentaje` (x % de N), `descuento` (precio tras descuento), `regla3`, `ecuacion` (ax + b = c, solución entera), `potencia`, `raiz` (cuadrado perfecto), `probabilidad` (fracción simple → porcentaje entero), `combinatoria` (n·(n−1)/2 parejas), `sucesion` (aritmética o geométrica, siguiente término), `area` (rectángulo, triángulo o círculo con π≈3,14 → entero), `unidades` (km/h a m/s con resultados enteros, minutos a horas).
- Distractores: errores típicos de la plantilla (paso olvidado, operación cambiada, porcentaje invertido, ±1 en sucesiones) y, si faltan, valores cercanos; siempre 3 distintos entre sí y de la respuesta, todos positivos si la respuesta lo es.

- [ ] **Step 1: Pruebas que fallan:**
  - `matemáticas: cada plantilla genera 300 preguntas válidas` — con `rnd` sembrado (LCG de 32 bits en la prueba), `problemaDePreguntaTrivia` da `null`, 4 opciones distintas, la correcta en `respuesta`.
  - `matemáticas: la respuesta coincide con un cálculo independiente` — para cada plantilla, la prueba recalcula desde `params` con su propia fórmula y compara con `valor` y con la opción correcta.
  - `matemáticas: la respuesta no cae siempre en la misma posición` — en 400 preguntas, cada índice 0–3 aparece al menos 50 veces.
- [ ] **Step 2: Ver que fallan.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Suite verde.**
- [ ] **Step 5: Commit** — `Preguntas de matemáticas generadas`.

---

### Task 3: Inglés desde el vocabulario

**Files:**
- Create: `data/ingles/vocabulario.json` (≥ 150 entradas verificadas; Task 9 lo amplía)
- Create: `js/compartido/ingles.js`
- Create: `pruebas/ingles.prueba.js`
- Modify: `js/modulos/trivia/banco.js` (`cargarTrivia` también carga el vocabulario), `pruebas.html`

**Interfaces:**
- Entrada: `{ id: 'en-0001', es, en, tipo: 'palabra'|'phrasal'|'expresion'|'falso_amigo', ejemplo: 'I finally {gave up} smoking.', trampa?: 'texto que parece y no es' , distractores?: { en: string[], es: string[] } }`. En `ejemplo`, el término va entre llaves. `trampa` es obligatoria en `falso_amigo` (p. ej. `actually` → trampa `actualmente`).
- Produces: `TIPOS_PREGUNTA_INGLES = ['es_en', 'en_es', 'completar', 'falso_amigo']`, `generarPreguntaIngles(entrada, vocabulario, rnd = Math.random, tipo?) → Pregunta` (tema `ingles`, tipo `opciones`, id `${entrada.id}-${tipoPregunta}`), `validarVocabulario(vocabulario) → string[]`.
  - `es_en`: "¿Cómo se dice «{es}» en inglés?"; `en_es`: "¿Qué significa «{en}»?"; `completar`: el ejemplo con `____` en lugar del término, opciones en inglés; `falso_amigo` (solo entradas `falso_amigo`): "¿Qué significa «{en}»?" con `trampa` entre las opciones.
  - Distractores: los escritos a mano primero; si faltan, otras entradas del mismo `tipo` (sin repetir ni coincidir con la respuesta, sin distinguir mayúsculas).
  - `dato`: `«{en}» = {es}. Ej.: {ejemplo sin llaves}`.

- [ ] **Step 1: Pruebas que fallan:** `inglés: vocabulario válido` (`validarVocabulario` = `[]`, ≥ 150 entradas, ≥ 20 de cada tipo, ids únicos); `inglés: cada entrada genera cada tipo que le aplica con exactamente una opción correcta`; `inglés: falso amigo incluye la trampa`; `inglés: completar oculta el término del ejemplo`.
- [ ] **Step 2: Ver que fallan.**
- [ ] **Step 3: Implementar y escribir el vocabulario** (nivel B1–B2).
- [ ] **Step 4: Suite verde.**
- [ ] **Step 5: Commit** — `Preguntas de inglés generadas desde el vocabulario`.

---

### Task 4: Armar una partida sin repetir

**Files:**
- Modify: `js/modulos/trivia/banco.js`
- Create: `pruebas/trivia-seleccion.prueba.js`
- Modify: `pruebas.html`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: `elegirPartida({ bancos, vocabulario, vistas, fallidas = [], rnd = Math.random }) → Pregunta[10]` donde `vistas: { [tema]: string[] }` (ids en orden de antigüedad).
  - Reparto: 10 casillas; cada tema de banco aporta 1 (6), más 1 de matemáticas, 1 de inglés y 2 de temas al azar entre los 8 sin que ningún tema pase de 2. Orden final barajado.
  - Por tema: primero no vistas; si no quedan, las vistas más antiguas y las que estén en `fallidas` primero. Nunca dos veces el mismo id en una partida.
  - Inglés: entradas no vistas (por `entrada.id`) y tipo de pregunta al azar entre los que aplican.
- `marcarVistas(vistas, preguntas) → vistas nuevas` (sin mutar; los ids de matemáticas no se guardan).

- [ ] **Step 1: Pruebas que fallan:** `selección: 10 preguntas, sin repetir, ≤ 2 por tema, al menos 1 de cada tema de banco`; `selección: prefiere no vistas`; `selección: banco agotado reabre las más antiguas y las falladas primero` (Review Focus 4); `selección: marcarVistas no guarda matemáticas`.
- [ ] **Step 2–5:** ver fallar, implementar, suite verde, commit — `Selección de preguntas para cada partida`.

---

### Task 5: Lógica pura de la partida

**Files:**
- Create: `js/modulos/trivia/partida.js`
- Create: `pruebas/partida.prueba.js`
- Modify: `pruebas.html`

**Interfaces:**
- Produces (todas puras, sin mutar):
  - `MS_PREGUNTA = 20000`, `MS_GRACIA = 2000`, `MS_REVELADO = 5000`.
  - `puntos(acerto: boolean, ms: number) → number`.
  - `nuevaPartida({ id, anfitrion, preguntas }) → Partida` = `{ id, estado: 'esperando', anfitrion, preguntas, indice: 0, ronda: 0, respuestas: { a: {}, b: {} } }`.
  - `responder(partida, lugar, { indice, opcion, ms }) → Partida` — ignora si `indice !== partida.indice`, si ya respondió esa pregunta o si la partida no está `jugando` (Review Focus 3). `opcion`: `true|false` o índice.
  - `ambosRespondieron(partida) → boolean`.
  - `avanzar(partida) → Partida` — `indice + 1` y `ronda + 1`; en la última pasa a `estado: 'terminada'`.
  - `puntaje(partida) → { a, b }` y `resultadoPregunta(partida, i) → { correcta, a: { opcion, acerto, puntos }, b: {…} }`.
  - `ganador(partida) → 'a'|'b'|'empate'`.

- [ ] **Step 1: Pruebas que fallan:** `partida: puntos` (0 ms → 150, 20000 → 100, 25000 → 100, −5 → 150, fallo → 0); `partida: solo cuenta la primera respuesta`; `partida: respuesta a otra pregunta se ignora`; `partida: avanzar hasta terminar`; `partida: puntaje y ganador`; `partida: el tiempo es el que mide cada celular` (Review Focus 5: dos respuestas con `ms` distintos dan puntos según su propio `ms`, sin usar relojes).
- [ ] **Step 2–5:** ver fallar, implementar, suite verde, commit — `Puntaje y turnos de la partida`.

---

### Task 6: La partida en la nube

**Files:**
- Create: `js/modulos/trivia/sala.js`
- Create: `pruebas/sala.prueba.js`
- Modify: `pruebas.html`

**Interfaces:**
- Consumes: `Nube` (etapa 1), `partida.js` (Task 5), `elegirPartida`/`marcarVistas` (Task 4).
- Produces:
  - `rutaPartidas(codigo)`, `rutaUso(codigo)`.
  - `async crearSala(nube, pareja, { preguntas, id = nuevoId() }) → id` — escribe `nuevaPartida` con `creada: horaServidor()`.
  - `async partidaPendiente(nube, pareja) → Partida|null` — la más reciente en `esperando` o `jugando` (por `listar` de partidas, sin terminar).
  - `async unirse(nube, pareja, id)` — en transacción: `esperando` → `jugando` (si ya está jugando, no cambia nada).
  - `async enviarRespuesta(nube, pareja, id, { indice, opcion, ms })` — en transacción con `responder`.
  - `async intentarAvanzar(nube, pareja, id, { ronda }) → boolean` — en transacción: avanza solo si `partida.ronda === ronda` (así dos celulares no avanzan dos veces, Review Focus 2).
  - `escucharPartida(nube, pareja, id, fn) → cancelar`.
  - `latir(nube, pareja, id) → detener` — cada 5 s combina `senal: { [lugar]: horaServidor() }`.
  - `async cerrarPartida(nube, pareja, partida)` — al terminar: suma la victoria en `uso.victorias` y las vistas con `marcarVistas` en `uso.vistasTrivia` (una sola vez: guarda `uso.partidasContadas` con el id).
  - `async leerUso(nube, pareja) → { victorias: { a, b }, vistasTrivia, fallidas }`.

- [ ] **Step 1: Pruebas que fallan** (dos celulares con `crearMundoFalso`, pareja ya enlazada):
  - `sala: crear, unirse y jugar una pregunta` — a crea, b ve `partidaPendiente`, se une, ambos responden, `intentarAvanzar` → `indice 1`.
  - `sala: dos avances a la vez avanzan una sola pregunta` — `Promise.all` de dos `intentarAvanzar` con la misma ronda → `indice 1`, uno devuelve `false`.
  - `sala: doble toque no cambia la respuesta` — dos `enviarRespuesta` seguidos con opciones distintas → queda la primera.
  - `sala: sin respuesta del otro se puede avanzar por tiempo` — solo a responde, `intentarAvanzar` (el llamador decide el tiempo) → avanza y b queda sin puntos en esa pregunta.
  - `sala: cerrar la partida suma la victoria y las vistas una sola vez` — `cerrarPartida` dos veces → victorias +1, vistas sin duplicar.
  - `sala: latir escribe la señal de este lugar` (y `detener` deja de hacerlo).
- [ ] **Step 2–5:** ver fallar, implementar, suite verde, commit — `Partidas de trivia en la nube`.

---

### Task 7: Pantallas de la trivia

**Files:**
- Create: `js/modulos/trivia/modulo.js`, `js/modulos/trivia/pantallas.js`
- Create: `pruebas/trivia-pantallas.prueba.js`
- Modify: `modulos.json` (`["preguntas", "trivia"]`), `js/nucleo/inicio.js` (la tarjeta "Jueguen juntos" ofrece "Trivia" cuando hay pareja), `css/componentes.css`, `pruebas.html`

**Interfaces:**
- Consumes: `exigirPareja` (etapa 1), Tasks 4–6, `el()`, `temporizador`-like anillo propio.
- Produces: módulo `{ id: 'trivia', nombre: 'Trivia', rutas: { '': sala, 'jugar/:id': juego }, tarjetasInicio }`.

Pantallas (textos exactos):
- Sala `#/trivia`: `exigirPareja`; título "Trivia"; si hay partida pendiente creada por el otro: "{nombre} te invitó a jugar" + "Unirme"; si es propia: "Esperando a que {nombre} se una…" + "Cancelar"; si no hay: "Nueva partida". Debajo: "Victorias: {a} {n} · {b} {m}".
- Juego `#/trivia/jugar/:id`:
  - Ruleta corta con el icono y nombre del tema (400 ms; sin animación con `prefers-reduced-motion`), luego "3, 2, 1" (cuenta propia de 1 s por número; sin ella con movimiento reducido).
  - Pregunta: encabezado "Pregunta {i} de 10" con anillo SVG de 20 s (dorado; últimos 5 s en `--vino-claro` y pulso), segundos en texto `aria-live="off"` con `role="timer"`.
  - V/F: dos botones "Verdadero" y "Falso" a media pantalla (`min-height: 120px`). Opciones: cuadrícula 2×2 (`min-height: 64px`).
  - Al tocar: botón marcado (`aria-pressed`), los demás deshabilitados, `navigator.vibrate?.(15)`, texto "Esperando a {nombre}…".
  - Revelado (cuando ambos respondieron o pasaron 22 s): correcta con "✓", la escogida incorrecta con "✗", iniciales de cada uno sobre su opción, "+{puntos}" flotando, dato. "Siguiente" o automático a los 5 s (cualquiera de los dos dispara `intentarAvanzar`).
  - Si la señal del otro no cambia en 15 s (medidos con el reloj local desde el último cambio visto): banda "{nombre} se desconectó, esperando…" con "Terminar partida".
  - Final: "¡Ganó {nombre}!" o "¡Empate!", marcador, vibración `[30, 40, 60]`, destellos dorados (CSS, sin movimiento reducido), repaso de las 10 (lista con pregunta, correcta y lo de cada uno), "Otra partida" e "Inicio". Al mostrar el final se llama `cerrarPartida`.
  - Al salir de la ruta: se cancelan escucha, latido y relojes.

- [ ] **Step 1: Pruebas que fallan** (nube falsa, dos celulares, relojes reales cortos o inyectados):
  - `trivia pantallas: sala ofrece nueva partida y muestra victorias`.
  - `trivia pantallas: el otro ve la invitación y se une`.
  - `trivia pantallas: responder deja la opción marcada y espera al otro`.
  - `trivia pantallas: revelado marca ✓ y ✗ con texto, no solo color`.
  - `trivia pantallas: el otro desconectado muestra el aviso` (Review Focus 1, con reloj inyectado).
  - `trivia pantallas: el texto de preguntas y nombres se pinta literal` (sin elementos HTML inyectados).
  - `inicio: con pareja la tarjeta ofrece la trivia`.
- [ ] **Step 2–4:** ver fallar, implementar, suite verde.
- [ ] **Step 5: Verificar en el navegador** con emuladores y dos orígenes (127.0.0.1 y localhost, `EMULADORES` temporal): partida completa de 10, captura del revelado y del final en tamaño celular; revertir `nube-config.js`.
- [ ] **Step 6: Commit** — `Pantallas de la trivia en vivo`.

---

### Task 8: Caché y cierre de la etapa

**Files:**
- Modify: `sw.js` (`okupa-v5`; agregar todos los archivos nuevos de `js/modulos/trivia/`, `js/compartido/ingles.js`, `data/trivia/*.json`, `data/ingles/vocabulario.json`), `pruebas/pwa.prueba.js`, `LEEME.md` (sección "Agregar preguntas de trivia": forma de una pregunta, prefijos y reglas de verificación).

- [ ] **Step 1:** ampliar `ESPERADOS` → ver fallar. **Step 2:** actualizar `sw.js` → verde. **Step 3:** LEEME. **Step 4:** verificación final (suite, `npm run pruebas` con emuladores, inicio sin pedidos a gstatic). **Step 5: Commit** — `Caché okupa-v5 y guía de la trivia`.

---

### Task 9: Bancos de la etapa 2 completos

**Files:**
- Modify: `data/trivia/{arte,historia,ciencia,deportes,canserbero,lana}.json`, `data/ingles/vocabulario.json`, `pruebas/trivia-contenido.prueba.js`

- [ ] **Step 1:** subir el mínimo de la prueba a **40 por tema** → ver fallar.
- [ ] **Step 2:** escribir y verificar en fuentes las preguntas que faltan (dificultad media, nivel universitario, V/F creíbles, `dato` y `ref` en cada una).
- [ ] **Step 3:** suite verde. **Step 4: Commit** — `Bancos de trivia de 40 preguntas por tema`.

Esta task solo toca archivos de `data/` y su prueba: puede hacerse en paralelo a las Tasks 2–8 una vez exista la forma de la Task 1.
