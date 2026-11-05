# Okupa · Etapa 3: Diario · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada día la pareja reciba las mismas 3 preguntas de gustos y posturas y un reto de inglés de 3, que cada uno responda en su celular sin ver lo del otro, y que al responder los dos se revelen lado a lado; con perfil inicial, pendientes e historial.

**Architecture:** Módulo nuevo `js/modulos/diario/` registrado en `modulos.json`. Lógica pura en `seleccion.js` (las 3 del día y el reto), `revelar.js` (qué se puede ver, coincidencias, adivinanzas, racha) y `perfil.js` (perfil inicial: forma, valores por defecto). La nube va en `dia.js` (crear el día en transacción, enviar respuestas, leer lo revelado) sobre la interfaz `Nube`. La interfaz en `pantallas.js`. El reto de inglés reutiliza `js/compartido/ingles.js`. Las reglas de Firestore abren `respuestas` con la condición "solo ves la del otro si ya enviaste la tuya".

**Tech Stack:** HTML/CSS/JS con módulos ES sin compilación; Firestore vía `js/nucleo/nube.js`; pruebas en `pruebas.html` con la nube falsa; reglas probadas con el emulador (`firebase/`: `npm test`).

**Spec:** `docs/superpowers/specs/2026-11-04-okupa-trivia-diario-design.md` (secciones 2, 3.2, 4.3, 5 en lo que toca al perfil inicial, 6.3, 6.4, 6.6, 7, 8, 9 y etapa 3 de la 10). Rasgos, plantillas, seguimientos, "Lo que Okupa sabe de mí" y "¿Cuánto me conoces?" son de la etapa 4: aquí las preguntas ya declaran sus `rasgos` (se validan) pero todavía no se aprende de ellos.

## Global Constraints

- Las de las etapas 1 y 2: sin compilación, `el()` para todo texto, `almacen.js` para localStorage (`okupa:diario:*`), tuteo colombiano, commits con `git commit -F` y la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, suite en "0 fallaron".
- **Fecha del día**: `AAAA-MM-DD` en hora de Colombia (`America/Bogota`), con `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' })`.
- **Pregunta del diario**: `{ id: 'dia-0001', tema, intensidad: 1|2|3, texto, tipo: 'opciones'|'escala', adivinar?: true, opciones?: [{ texto, rasgos?: { [rasgo]: ±n } }] (2–4, textos distintos), extremos?: [izquierda, derecha], rasgo?: { id, signo: 1|-1 } }`. `escala` va de 1 a 10 y no lleva `opciones`. Ids `dia-` + 4 cifras.
- **Temas del diario** (ids fijos, `data/diario/temas.json`): `musica`, `futuro_solo`, `futuro_pareja`, `dilema`, `postura`, `vida_diaria`, `recuerdos`, `gustos`.
- **Rasgos** (`data/diario/rasgos.json`): `[{ id, izquierda, derecha }]` bipolares: `aventura` (aventura ↔ rutina), `ciudad` (ciudad ↔ naturaleza), `ahorro` (ahorro ↔ disfrute), `social` (social ↔ casero), `independencia` (independencia ↔ unión), `tradicion` (tradición ↔ cambio), `hijos` (quiere hijos ↔ no quiere hijos), `celos` (celoso ↔ tranquilo), `planificacion` (planifica ↔ improvisa). Valor positivo = extremo izquierdo.
- **Día en Firestore** `parejas/{c}/dias/{fecha}`: `{ fecha, gustos: [3 ids], adivinar: 0|1|2, ingles: [3 preguntas generadas], hechos: { gustos_a?, gustos_b?, ingles_a?, ingles_b?: true }, creado }`. Lo crea el primero que lo abre, en transacción.
- **Respuestas** `…/dias/{fecha}/respuestas/{gustos_a|gustos_b|ingles_a|ingles_b}`:
  - gustos: `{ items: [{ opcion?: 0–3, valor?: 1–10, comentario: string (≤ 280), adivina?: opcion|valor }], enviada }`
  - inglés: `{ items: [índice elegido ×3], aciertos: 0–3, enviada }`
  - Se crean una sola vez (en transacción junto con `hechos`) y no se pueden cambiar.
- **Uso** `parejas/{c}/estado/uso`: se agregan `vistasDiario: [ids]` y `vistasIngles: [ids de entrada]` (el más antiguo primero, máximo 2000).
- **Perfil** `parejas/{c}/perfiles/{lugar}`: `{ inicial: { generos: [ids], artistas: [≤ 3 textos], cancion, pelis, plan, vivir, hijos, matrimonio, mascotas, masTemas: [temas], evitarTemas: [temas], intensidad: 1|2|3 }, actualizado }`. Sin perfil del otro: intensidad 2 y nada que evitar.
- **Revelado**: una parte (gustos o inglés) se revela solo cuando existen las dos respuestas de esa parte. Coincidencia: opciones iguales → "¡Coincidieron!"; distintas → "Aquí hay debate"; escala: igual → "¡Coincidieron!", diferencia 1–3 → "Parecido", ≥ 4 → "Aquí hay debate". Adivinanza acertada: misma opción, o escala a ±1.
- Al cambiar archivos precacheados: `CACHE` de `sw.js` pasa a `okupa-v6`; agregar los archivos nuevos a `PRECACHE` y a `ESPERADOS` de `pruebas/pwa.prueba.js`.

## Review Focus

1. Ninguno puede ver la respuesta del otro (ni su comentario ni su puntaje de inglés) antes de enviar la suya: lo garantizan las reglas y la pantalla no la pide antes. (Pruebas en Task 3, Task 4 y Task 6.)
2. Los dos abren el día a la vez → los dos ven exactamente las mismas 3 preguntas y el mismo reto. (Prueba en Task 4.)
3. Una respuesta no se puede cambiar después de enviada, y si el envío falla la pantalla no la da por enviada. (Pruebas en Task 3, Task 4 y Task 6.)
4. A medianoche de Colombia cambia el día para los dos, aunque un celular esté en otra zona horaria. (Prueba en Task 1.)
5. Se agota el banco del diario → siguen saliendo 3 preguntas, primero las vistas hace más tiempo. (Prueba en Task 2.)

---

### Task 1: Contenido del diario, perfil inicial y fecha

**Files:**
- Create: `data/diario/temas.json`, `data/diario/rasgos.json`, `data/diario/preguntas.json` (≥ 90, ≥ 8 por tema, ≥ 30 con `adivinar`), `data/diario/perfil-inicial.json`
- Create: `js/modulos/diario/contenido.js`, `js/modulos/diario/perfil.js`
- Create: `pruebas/diario-contenido.prueba.js`
- Modify: `pruebas.html`

**Interfaces:**
- `async cargarDiario(fetchFn) → { temas, rasgos, preguntas, perfilInicial, vocabulario }`
- `problemaDePreguntaDiario(p, { temas: Set, rasgos: Set }) → string|null`, `validarDiario({ temas, rasgos, preguntas }) → string[]`
- `fechaBogota(d = new Date()) → 'AAAA-MM-DD'`, `fechaLegible('AAAA-MM-DD') → 'miércoles 5 de noviembre'`
- `perfil-inicial.json`: `[{ id, tipo: 'varias'|'una'|'texto'|'textos'|'intensidad'|'temas', texto, opciones?: [{ id, texto }], max? }]` con los campos de `inicial`.
- `normalizarPerfil(inicial) → inicial completo con valores por defecto`, `problemaDePerfil(inicial, perfilInicial) → string|null`, `preferenciasDe(perfiles) → { intensidad: mínima, evitar: Set, mas: Map<tema, n> }`.

- [ ] **Step 1: Pruebas que fallan:** `diario contenido: válido y suficiente`; `diario: problemaDePreguntaDiario detecta formas malas` (escala con opciones, opciones repetidas o 1 sola, rasgo inexistente, intensidad 4, tema inexistente); `diario: fechaBogota cambia a medianoche de Colombia` (`2026-11-05T04:59:00Z` → `2026-11-04`; `05:00Z` → `2026-11-05`); `diario: preferenciasDe usa la intensidad menor y une lo evitado` (y sin perfil del otro: 2).
- [ ] **Step 2: Ver que fallan.** **Step 3: Implementar y escribir el contenido** (nada genérico: cada pregunta obliga a escoger y da pie a discutir). **Step 4: Suite verde.** **Step 5: Commit** — `Contenido y perfil inicial del diario`.

---

### Task 2: Las 3 del día y el reto de inglés

**Files:**
- Create: `js/modulos/diario/seleccion.js`, `pruebas/diario-seleccion.prueba.js`
- Modify: `pruebas.html`

**Interfaces:**
- `elegirDia({ preguntas, perfiles, vistas = [], recientes = [], rnd }) → { gustos: [3 ids], adivinar: 0–2 }` — candidatas no vistas con intensidad ≤ la menor, sin temas evitados y sin `requiere`; puntaje 1 + 1 por cada uno que pidió ese tema − 0,7 si el tema salió en los 2 días anteriores (`recientes`); 3 al azar ponderado de temas distintos (si no alcanzan, se permite repetir tema); al menos una con `adivinar` (y `adivinar` apunta a una de ellas). Si no alcanzan las no vistas, entran las vistas de la más antigua a la más nueva.
- `elegirReto({ vocabulario, vistas = [], rnd }) → [3 preguntas]` con `generarPreguntaIngles`, entradas distintas, primero no vistas.
- `agregarVistas(vistas, ids, max = 2000) → vistas` (sin duplicar, lo nuevo al final).

- [ ] **Step 1: Pruebas que fallan:** `selección diario: 3 de temas distintos, una para adivinar`; `respeta intensidad y temas evitados`; `prefiere temas pedidos y evita los recientes` (en 300 sorteos); `banco agotado reabre las más antiguas` (Review Focus 5); `reto: 3 preguntas de entradas distintas, primero no vistas`.
- [ ] **Step 2–5:** ver fallar, implementar, suite verde, commit — `Selección de las preguntas del día`.

---

### Task 3: Reglas de las respuestas

**Files:**
- Modify: `firebase/firestore.rules`, `firebase/pruebas/reglas.test.js`

- `match /dias/{fecha}/respuestas/{parte}`: `parte` cumple `^(gustos|ingles)_(a|b)$`; `create` si es miembro y el lugar de la parte es el suyo; `update` nunca; `delete` si es miembro (para "Borrar todos nuestros datos"); `get` la propia siempre, la del otro solo si existe la propia de esa misma parte; `list` nunca.
- [ ] **Step 1:** cambiar la prueba "respuestas está cerrado" por: `cada uno crea solo la suya`; `no se puede cambiar una respuesta enviada`; `no se lee la del otro sin haber enviado la propia de esa parte` (Review Focus 1); `enviar gustos no destapa el inglés del otro`; `un extraño no lee respuestas`; `no se listan respuestas`. **Step 2:** `npm test` → fallan. **Step 3:** reglas. **Step 4:** `npm test` verde. **Step 5: Commit** — `Reglas de las respuestas del diario`.

---

### Task 4: El día en la nube

**Files:**
- Create: `js/modulos/diario/dia.js`, `js/modulos/diario/revelar.js`, `pruebas/diario-dia.prueba.js`
- Modify: `pruebas.html`

**Interfaces:**
- `revelar.js` (puro): `coincidencia(pregunta, ra, rb) → 'coinciden'|'parecido'|'debate'`, `adivino(pregunta, adivina, respuestaOtro) → boolean`, `estadoDia(dia, lugar) → { gustos: 'responder'|'esperando'|'revelado', ingles: … }`, `rachaAmbos(dias, parte, hoy) → número de días seguidos hasta hoy (o ayer) con la parte revelada`, `porcentajeAdivinanzas(revelados) → 0–100|null`.
- `dia.js`: `rutaDias(codigo)`, `async abrirDia(nube, pareja, { fecha, datos, rnd }) → dia` (transacción: si existe lo devuelve; si no, lo crea con `elegirDia` y `elegirReto` usando los dos perfiles, `uso.vistasDiario`, `uso.vistasIngles` y los temas de los 2 días anteriores, y guarda las vistas); `async leerDia(nube, pareja, fecha) → dia|null`; `async enviar(nube, pareja, fecha, parte, datos)` (transacción: si la propia ya existe no hace nada; si no, la crea y marca `hechos`); `async leerPropia(nube, pareja, fecha, parte)`; `async leerAmbas(nube, pareja, fecha, parte) → { a, b }|null` (lee la del otro solo si la propia existe y `hechos` dice que la del otro también); `escucharDia(nube, pareja, fecha, fn)`; `async listarDias(nube, pareja) → dias ordenados`; `async guardarPerfil(nube, pareja, inicial)`, `async leerPerfiles(nube, pareja) → { a, b }`.
- [ ] **Step 1: Pruebas que fallan** (dos celulares con `crearMundoFalso`): `diario día: los dos abren a la vez y ven lo mismo` (Review Focus 2); `enviar dos veces deja la primera` (Review Focus 3); `leerAmbas es null hasta que los dos enviaron` (Review Focus 1); `gustos e inglés se revelan por separado`; `coincidencia y adivino`; `rachaAmbos cuenta días seguidos`; `abrir el día guarda las vistas una sola vez`.
- [ ] **Step 2–5:** ver fallar, implementar, suite verde, commit — `El día del diario en la nube`.

---

### Task 5: Pantalla del perfil inicial

**Files:**
- Create: `js/modulos/diario/modulo.js`, `js/modulos/diario/pantallas.js` (perfil), `pruebas/diario-pantallas.prueba.js`
- Modify: `modulos.json` (`["preguntas", "trivia", "diario"]`), `css/componentes.css`, `pruebas.html`

Pantalla `#/diario/perfil`: título "Cuéntanos de ti", subtítulo "Son 3 minutos. Con esto escogemos preguntas que sí les digan algo. Lo puedes cambiar cuando quieras."; cada campo de `perfil-inicial.json` (chips para `varias`/`temas`, botones para `una`, entradas para `texto`/`textos`, 1–3 para `intensidad`); "Guardar" → `guardarPerfil` → `#/diario`. Si ya hay perfil, viene lleno.
- [ ] **Step 1: Pruebas que fallan:** `diario pantallas: sin perfil, Hoy lleva a llenarlo`; `perfil: guardar escribe el perfil y vuelve`; `perfil: abre lleno con lo guardado`.
- [ ] **Step 2–5:** ver fallar, implementar, suite verde, commit — `Perfil inicial del diario`.

---

### Task 6: Hoy, revelado y reto de inglés

**Files:**
- Modify: `js/modulos/diario/pantallas.js`, `js/modulos/diario/modulo.js`, `css/componentes.css`, `pruebas/diario-pantallas.prueba.js`

Pantalla `#/diario` (y `#/diario/dia/:fecha` para días anteriores, sin crear días nuevos):
- Cabecera "Diario" y la fecha legible. Enlaces: "Pendientes (n)", "Historial", "Mi perfil".
- **Gustos**: 3 cartas con chip de tema, texto, opciones grandes (`min-height: 56px`) o fila de 10 botones con los extremos debajo; comentario opcional (`textarea`, 280). En la que tiene `adivinar`, al escoger aparece "¿Qué crees que respondió {otro}?" con las mismas opciones. "Enviar" se habilita con todo respondido; mientras envía dice "Enviando…"; si falla: "No se pudo enviar. Revisa la conexión e intenta otra vez." y nada se da por enviado. Luego "Respondiste ✓ · Esperando a {otro}".
- **Revelado**: por pregunta, las dos respuestas lado a lado con nombre, comentarios, la etiqueta de coincidencia y, en la de adivinar, "{nombre} adivinó ✓" / "no adivinó ✗".
- **Reto de inglés**: 3 preguntas de 4 opciones; al tocar se ve ✓/✗ y el dato; tras las 3 se envía solo. Revelado: "Inglés: {a} {n}/3 · {b} {m}/3" y "Racha: N días los dos".
- Escucha el día: cuando el otro termina, se revela sin recargar. Al salir de la ruta se cancela la escucha.
- Inicio: el acceso "Diario" muestra el último estado conocido guardado en `okupa:diario:estado` (`{ fecha, texto }`, solo si es de hoy): "0 de 3 · esperando a {otro}", "Te toca responder", "¡Listo para revelar!".
- [ ] **Step 1: Pruebas que fallan:** `diario pantallas: responder y esperar` (no aparece nada del otro); `al responder los dos se revela con coincidencia y adivinanza`; `si el envío falla no se da por enviado`; `reto de inglés marca ✓/✗ y revela el marcador`; `el texto de preguntas, comentarios y nombres se pinta literal`; `inicio: el acceso del diario muestra el último estado de hoy`.
- [ ] **Step 2–5:** ver fallar, implementar, suite verde, commit — `Hoy, revelado y reto de inglés del diario`.

---

### Task 7: Pendientes e historial

**Files:**
- Modify: `js/modulos/diario/pantallas.js`, `js/modulos/diario/modulo.js`, `css/componentes.css`, `pruebas/diario-pantallas.prueba.js`

- `#/diario/pendientes`: días anteriores con algo por responder de mi parte (gustos o inglés), del más antiguo al más nuevo → `#/diario/dia/:fecha`. Vacío: "Estás al día ✓".
- `#/diario/historial`: "Qué tanto se conocen: N % de adivinanzas" (o "Todavía no hay adivinanzas reveladas"), "Racha: N días con los dos al día", y la lista de días (más reciente primero) con estado ("Revelado", "Esperando a {otro}", "Te toca") → `#/diario/dia/:fecha`.
- [ ] **Step 1: Pruebas que fallan:** `pendientes lista solo lo que me falta`; `historial muestra porcentaje y racha`.
- [ ] **Step 2–5:** ver fallar, implementar, suite verde, commit — `Pendientes e historial del diario`.

---

### Task 8: Caché, guía y verificación

**Files:**
- Modify: `sw.js` (`okupa-v6` y archivos nuevos), `pruebas/pwa.prueba.js`, `LEEME.md` (sección "Diario": cómo se escogen las preguntas, forma de una pregunta del diario y cómo agregar más).

- [ ] **Step 1:** ampliar `ESPERADOS` → ver fallar. **Step 2:** `sw.js` → verde. **Step 3:** LEEME. **Step 4:** verificación: suite completa, `npm test` de reglas, y en el navegador con emuladores dos orígenes (127.0.0.1 y localhost) como dos personas en tamaño celular: perfil, día completo, revelado y reto. **Step 5: Commit** — `Caché okupa-v6 y guía del diario`.
