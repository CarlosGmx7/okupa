# Okupa · Trivia y Diario · Documento de diseño

Fecha: 2026-11-04 · Estado: pendiente de revisión

Amplía el diseño original (`2026-11-01-okupa-design.md`). Lo que ya existe (preguntas,
sesiones, Mis preguntas) no cambia y sigue funcionando sin internet.

## 1. Propósito

Dos secciones nuevas para que la pareja juegue y se conozca **cada uno desde su celular**:

1. **Trivia**: partidas en vivo de cultura general, tipo Preguntados, para competir.
2. **Diario**: cada día, 3 preguntas sobre gustos, futuro y posturas, más un reto de inglés.
   Cada uno responde por separado y, cuando ambos responden, ven lo que dijo el otro.
   La app va aprendiendo el perfil de cada uno con sus respuestas.

**Éxito:**
- Los dos juegan una partida de 10 preguntas al mismo tiempo, cada uno en su celular, y al
  final ven el marcador y las respuestas correctas.
- Cada día les llegan 3 preguntas que no se sienten genéricas, que hablan de sus gustos reales
  y dejan tema para debatir.
- Ninguno puede ver las respuestas del otro antes de responder las suyas.
- Las preguntas casi no se repiten durante meses de uso diario.

## 2. Decisiones de producto

| Tema | Decisión |
|---|---|
| Conexión | Servicio gratis en internet: **Firebase** (Google), plan gratuito Spark |
| Enlace de la pareja | **Código de pareja** de 6 caracteres; sin correo ni contraseña |
| Trivia | **En vivo**: misma pregunta a la vez en los dos celulares |
| Partida | **10 preguntas** mezclando temas |
| Puntaje trivia | 20 s por pregunta; acierto = 100 + hasta 50 por rapidez; fallo o tiempo agotado = 0 |
| Temas trivia | Arte, historia, ciencia, matemáticas, deportes, Canserbero, Lana del Rey, inglés, "¿Cuánto me conoces?" |
| Formatos trivia | Mayoría verdadero/falso; matemáticas e inglés con 4 opciones |
| Diario | **3 preguntas al día** iguales para los dos + **reto de inglés de 3** |
| Respuesta diario | Tocar opción o escala 1–10, comentario opcional; en 1 de las 3, adivinar al otro |
| Revelar | Cuando **ambos** respondieron (gustos e inglés se revelan por separado) |
| Cambio de día | Medianoche, hora de Colombia (America/Bogota), igual para los dos |
| Perfil | Cuestionario inicial corto + aprendizaje con cada respuesta revelada; sin IA |
| Inglés | Nivel intermedio (B1–B2): vocabulario, falsos amigos, phrasal verbs, expresiones |
| Repetición | Bancos grandes + generadores; no se repite nada hasta agotar el banco |
| Estilo | El de Okupa (oscuro, vino y dorado, Fraunces + Inter), con más movimiento en los juegos |

## 3. Contenido

### 3.1 Cantidades

| Banco | Cantidad | Formato |
|---|---|---|
| Arte, historia, ciencia, deportes | ~200 c/u (~800) | Mayoría V/F; algunas de 4 opciones |
| Canserbero | ~120 | V/F y 4 opciones |
| Lana del Rey | ~150 | V/F y 4 opciones |
| Matemáticas | Generadas al momento (ilimitadas) | 4 opciones numéricas |
| Inglés | Vocabulario de ~1.500 entradas → varios tipos de pregunta por entrada | 4 opciones |
| ¿Cuánto me conoces? | Se arma con las respuestas reveladas del diario | Según la pregunta original |
| Diario | ~600 preguntas + plantillas personalizadas + seguimientos | Opciones o escala |

Total escrito: ~2.000 preguntas más el vocabulario, ≈1 MB.

### 3.2 Reglas de calidad

- **Exactitud**: cada dato de trivia se verifica en una fuente antes de incluirlo; la fuente
  queda anotada en el archivo (`ref`, no se muestra en el juego). Si un dato no se puede
  verificar, no entra.
- **Dificultad media, nivel universitario**: ni preguntas de colegio obvias ni datos de
  especialista. Evitar fechas exactas poco conocidas como única dificultad.
- Cada pregunta de trivia trae un **dato** de una o dos líneas que explica la respuesta.
- **V/F bien hechos**: los falsos deben ser creíbles (cambiar un dato verosímil), no absurdos;
  balance aproximado 50/50 entre verdaderos y falsos dentro de cada tema.
- **Canserbero**: su música, álbumes, colaboraciones, letras y trayectoria. **No** se hacen
  preguntas sobre los detalles de su muerte.
- **Diario**: nada genérico; cada pregunta debe obligar a escoger y dar pie a discutir. Tipos:
  música, futuro en solitario, futuro en pareja, capciosas/dilemas, posturas polémicas, vida
  diaria, recuerdos de ellos. Con intensidad 1–3 como en el módulo de preguntas.
- Español colombiano con tuteo.

### 3.3 Matemáticas generadas

Plantillas con números aleatorios y respuesta calculada por código: porcentajes y descuentos,
regla de tres, ecuaciones lineales, potencias y raíces, probabilidad simple, combinatoria
básica, sucesiones, áreas y volúmenes, conversión de unidades, lógica numérica.
Distractores creíbles: errores típicos (olvidar un paso, sumar en vez de multiplicar,
porcentaje invertido), nunca repetidos ni iguales a la respuesta. Deben poder resolverse
mentalmente o con papel en 20 s.

### 3.4 Inglés generado desde el vocabulario

Cada entrada: `es`, `en`, `tipo` (`palabra`, `phrasal`, `expresion`, `falso_amigo`), una
frase de ejemplo en inglés con el término y, si aplica, distractores escritos a mano.
Tipos de pregunta:
- Español → inglés y inglés → español (4 opciones).
- Completar la frase de ejemplo (4 opciones).
- Falso amigo: "¿Qué significa *actually*?" con la trampa entre las opciones.
Distractores: los escritos a mano primero; si faltan, otras entradas del mismo tipo.

## 4. Pantallas y flujos

En el inicio aparecen dos tarjetas nuevas: **Trivia** ("Jugar en vivo") y **Diario**
(estado del día: "0 de 3 · esperando a ella", "¡Listo para revelar!").

### 4.1 Enlazar la pareja (primera vez, desde Trivia o Diario)

1. "Crear pareja": escribe su nombre → recibe un código `K7P-Q2M` con botón para copiarlo o
   compartirlo.
2. "Unirme": escribe el código y su nombre → quedan enlazados.
3. Máximo 2 personas. En un celular nuevo: código → "¿Quién eres?" con los dos nombres →
   toma ese lugar; el celular anterior ve "Tu lugar se abrió en otro celular" y queda fuera.
4. Ajustes de la pareja: ver código, cambiar nombre, "Salir de este celular" y
   "Borrar todos nuestros datos de la nube" (con confirmación).

### 4.2 Trivia en vivo

- **Sala**: "Nueva partida" → el otro ve "Carlos te invitó a jugar" al abrir Trivia → "Unirme".
  Si hay una partida en curso, se ofrece volver a ella.
- **Cada pregunta**: ruleta corta que cae en el tema → cuenta 3-2-1 → pregunta con anillo de
  20 s → cada uno toca su respuesta (queda bloqueada, "Esperando a ella…") → al responder
  ambos o acabarse el tiempo, revelado: correcta con ✓, incorrecta con ✗, iniciales de quién
  escogió qué, "+130" flotando, dato corto → siguiente automática a los 5 s o al tocar.
- **Final**: marcador y ganador con destellos dorados y vibración; repaso de las 10
  (deslizable) con correcta y lo de cada uno; historial de victorias acumuladas.
- **"¿Cuánto me conoces?"**: máximo 2 por partida, solo si hay ≥ 5 días revelados. Cada uno
  recibe una pregunta **sobre el otro** ("¿Qué respondió ella sobre…?", opciones de la
  pregunta original, correcta = lo que respondió). Son preguntas distintas para cada uno en
  ese turno; el revelado muestra ambas.
- **Desconexión**: si uno deja de dar señales 15 s, el otro ve "Se desconectó, esperando…" y
  puede esperar o terminar. Al volver, sigue en la pregunta actual.

### 4.3 Diario

- **Perfil inicial** (una vez, ~3 min, editable): música (géneros, artistas, canción del
  momento), pelis/series/libros, plan ideal, futuro (carrera, dónde vivir, hijos, matrimonio,
  mascotas), temas que quiere más y que prefiere evitar, intensidad máxima aceptada.
- **Hoy**: 3 cartas, una por pregunta. Opciones grandes o escala 1–10 en fila de botones,
  comentario opcional. En la que lo pide, después de responder: "¿Qué crees que respondió
  ella?". Luego "Respondiste ✓ · Esperando a ella".
- **Reto de inglés**: 3 preguntas de 4 opciones; se ve si acertó al instante; marcador y
  racha se revelan cuando ambos lo hacen.
- **Revelado**: las dos respuestas lado a lado (las cartas se voltean), comentarios, si
  adivinaron, y "¡Coincidieron!" o "Aquí hay debate" (opciones distintas o escala con
  diferencia ≥ 4).
- **Pendientes**: días anteriores sin responder se pueden responder después; se revelan
  cuando ambos lo hacen. No hay límite de antigüedad.
- **Historial**: días anteriores con las dos respuestas; "qué tanto se conocen" (% de
  adivinanzas correctas) y racha de días con ambos al día.
- **"Lo que Okupa sabe de mí"**: rasgos y favoritos aprendidos en palabras simples, con
  opción de corregir o borrar cada uno. El otro también puede verlo.

## 5. Perfil que aprende

- Cada opción de una pregunta del diario puede declarar qué rasgos mueve:
  `"rasgos": { "aventura": 1, "rutina": -1 }`. Las escalas mueven un rasgo en proporción.
- **Rasgos** definidos en `data/diario/rasgos.json`, cada uno bipolar con nombre para los dos
  extremos (p. ej. aventura ↔ rutina, ciudad ↔ naturaleza, ahorro ↔ disfrute, social ↔
  casero, independencia ↔ unión, tradición ↔ cambio, ganas de hijos, celos, planificación ↔
  espontaneidad).
- Valor de un rasgo = suma de aportes; se muestra solo cuando hay ≥ 3 respuestas que lo
  tocan (una respuesta no define a nadie).
- **Se aprende al revelar**, no al responder: así el perfil (que el otro puede ver) nunca
  delata una respuesta todavía oculta. Cada celular actualiza solo el perfil de su dueño la
  primera vez que ve un día revelado, y anota la fecha en `aprendidos` para no contarla dos
  veces.
- **Favoritos**: artistas, canciones, pelis del perfil inicial y los que se agreguen en
  "Lo que Okupa sabe de mí". Los comentarios libres no se interpretan.
- **Usos**:
  1. Selección del diario (sección 6.4).
  2. Plantillas: `{nombre_otro}`, `{artista_fav_mio}`, `{artista_fav_otro}`, `{cancion_otro}`…
     Si falta el dato, la plantilla no se usa ese día.
  3. Seguimientos: una pregunta puede tener `requiere` (rasgo sobre un umbral, favorito
     presente, o respuesta dada a otra pregunta) y solo es elegible si se cumple.
  4. Trivia "¿Cuánto me conoces?" (sección 4.2).

## 6. Arquitectura

### 6.1 Archivos nuevos

```
js/nucleo/
  nube.js            ← interfaz única con Firebase (carga perezosa del SDK)
  nube-config.js     ← configuración del proyecto Firebase (vacía hasta configurarla)
  pareja.js          ← crear/unirse/reclamar lugar, sesión anónima, nombres
  pantallas-pareja.js← enlazar y ajustes de la pareja
js/modulos/trivia/
  modulo.js, pantallas.js
  partida.js         ← estado de la partida, turnos, puntaje (lógica pura)
  banco.js           ← carga de bancos, selección sin repetir
  matematicas.js     ← generadores
  conoces.js         ← preguntas de "¿Cuánto me conoces?"
js/modulos/diario/
  modulo.js, pantallas.js
  seleccion.js       ← escoger las 3 del día (lógica pura)
  perfil.js          ← rasgos, favoritos, plantillas (lógica pura)
  revelar.js         ← reglas de revelado, coincidencias (lógica pura)
js/compartido/
  ingles.js          ← generador de preguntas de inglés (lo usan trivia y diario)
data/trivia/temas.json, arte.json, historia.json, ciencia.json, deportes.json,
            canserbero.json, lana.json
data/ingles/vocabulario.json
data/diario/preguntas.json, perfil-inicial.json, rasgos.json
firebase/firestore.rules, firebase.json   ← reglas y emulador (no se publican en la app)
```

Lógica pura (puntaje, selección, perfil, revelado, generadores) separada de la nube y de la
interfaz, para probarla en `pruebas.html` sin conexión.

### 6.2 Firebase

- **Servicios**: Authentication anónima + Cloud Firestore. SDK modular cargado desde
  `https://www.gstatic.com/firebasejs/<versión fija>/…` con `import()` solo al entrar a
  Trivia o Diario. Sin paso de compilación.
- `nube.js` expone una interfaz pequeña (`iniciar`, `leer`, `escuchar`, `escribir`,
  `transaccion`, `horaServidor`). Existe una **nube falsa en memoria** con la misma
  interfaz para las pruebas y para simular dos celulares en una misma página.
- `nube-config.js` vacío ⇒ las secciones muestran "Falta configurar la conexión" con
  instrucciones; el resto de la app no se afecta.
- La configuración de Firebase no es secreta; la seguridad la dan las reglas.

### 6.3 Datos en Firestore

```
parejas/{codigo}                       ← el id del documento es el código de pareja
  { lugares: { a: uid|null, b: uid|null },
    nombres: { a: "Carlos", b: "…" }, creada }
parejas/{codigo}/perfiles/{a|b}
  { inicial: {…}, favoritos: {…}, rasgos: { aventura: 3, … }, correcciones: {…},
    aprendidos: [fechas ya contadas] }
parejas/{codigo}/dias/{AAAA-MM-DD}
  { gustos: [ids o plantillas resueltas], ingles: [preguntas generadas], creado }
parejas/{codigo}/dias/{fecha}/respuestas/{gustos_a|gustos_b|ingles_a|ingles_b}
  gustos: { items: [{ opcion|valor, comentario, adivina }] }
  ingles: { items: [indices] }
parejas/{codigo}/partidas/{id}
  { estado: esperando|jugando|terminada, anfitrion,
    preguntas: [10]   ← cada una es una pregunta, o { para: { a: …, b: … } } en
                        "¿Cuánto me conoces?" (una distinta para cada uno),
    indice, inicioPregunta, respuestas: { a: [...], b: [...] },
    puntos: { a, b }, senal: { a: t, b: t } }
parejas/{codigo}/estado/uso
  { vistasTrivia: { tema: [ids] }, vistasDiario: [ids], vistasIngles: [ids],
    victorias: { a, b }, ingles: { a, b, racha } }
```

- **Día del diario**: el primero que abre el día lo crea en una transacción (si ya existe,
  usa el existente). Así los dos tienen las mismas preguntas aunque sus perfiles cambien.
- **Partida**: cualquiera de los dos puede avanzar de pregunta cuando ambos respondieron o
  pasaron 20 s + 2 s de gracia desde `inicioPregunta`; el avance va en transacción para que
  no ocurra dos veces. `senal` se actualiza cada 5 s para detectar desconexión.
- **Rapidez**: cada celular mide desde que pinta la pregunta hasta el toque; se envía el
  tiempo junto con la respuesta. Puntos = 100 + redondeo(50 × (20 − t) / 20) si acierta.
- Ideas aceptadas: el documento de la partida trae las respuestas correctas (alguien con
  herramientas de desarrollador podría verlas); para una pareja no vale la complejidad de
  ocultarlas.

### 6.4 Selección de las 3 preguntas del día

Candidatas = preguntas del diario no vistas, con intensidad ≤ la menor aceptada por los dos,
sin temas que alguno quiera evitar, y con `requiere` cumplido. Puntaje de cada candidata:
- + seguimientos recién habilitados;
- + rasgos donde los dos están en extremos opuestos (más debate);
- + temas que alguno marcó como favoritos;
- − tema usado en los 2 días anteriores.
Se escogen 3 al azar ponderado por puntaje, de temas distintos, y al menos una que permita
adivinar al otro. Si el banco se agota, vuelven las vistas hace más tiempo.

### 6.5 Sin repetir

El estado `uso` guarda los ids vistos por la pareja. Trivia y reto de inglés eligen primero
lo no visto; al agotarse un tema, reabren primero lo más antiguo y lo que fallaron.
Matemáticas generadas no se guardan (no se repiten en la práctica).

### 6.6 Reglas de seguridad (resumen)

- Solo usuarios con sesión anónima.
- `parejas/{codigo}`: `get` permitido a cualquier usuario con sesión (necesario para unirse
  y escoger lugar); `list` prohibido (no se pueden enumerar códigos). Actualizar `lugares`
  solo para ocupar un lugar vacío o reclamar uno con el propio uid; nadie puede borrar el
  lugar de otro salvo reclamándolo.
- Todo lo de adentro (`perfiles`, `dias`, `partidas`, `estado`): solo los dos uid de
  `lugares`.
- `respuestas/{parte}_{lugar}`: cada uno escribe solo las suyas y no puede cambiarlas una
  vez enviadas; **leer la del otro en una parte solo si ya existe la propia de esa misma
  parte**. Gustos e inglés van en documentos separados para que terminar una parte no
  destape la otra. Así el "no ver antes de responder" lo garantiza el servidor, no solo la
  pantalla.
- Códigos de 6 caracteres de un alfabeto de 31 sin ambiguos (≈ 887 millones de
  combinaciones).

### 6.7 Sin internet y caché

- Los archivos nuevos (código y datos) entran al `PRECACHE` de `sw.js`; versión `okupa-v3`.
- El SDK de Firebase (otro dominio) no se precachea; sin conexión, Trivia y Diario muestran
  "Necesitas internet para esta sección" con botón reintentar.
- Firestore no usa su caché sin conexión (se desactiva la persistencia local) para evitar
  estados a medias.

## 7. Diseño visual e interacción

Se mantiene la identidad (tokens de `base.css`). Reglas aplicadas (ui-ux-pro-max):
- Botones táctiles ≥ 44 px (opciones de juego ≥ 56 px), separación ≥ 8 px.
- V/F: dos botones grandes a pantalla media. 4 opciones: cuadrícula 2 × 2.
- Temporizador: anillo dorado (SVG) que se vacía; últimos 5 s en vino con pulso suave;
  segundos también en texto para lectores de pantalla.
- Cada tema con color e ícono propios (glifos tipográficos como en las categorías actuales).
- Retroalimentación inmediata al tocar (hundimiento 120 ms + vibración corta solo al
  responder y al ganar). Nada se comunica solo con color: ✓/✗ y textos.
- Animaciones de 150–300 ms con `transform`/`opacity`; todas desactivables con
  `prefers-reduced-motion`.
- Escala 1–10 como fila de botones, no deslizador.
- Pantallas de espera con el nombre del otro y estado claro; nunca un spinner sin texto.

## 8. Manejo de errores

- Sin conexión o Firebase sin configurar: mensaje y reintentar; lo demás de Okupa sigue.
- Código inválido o pareja llena: explicación clara al unirse.
- Lugar reclamado en otro celular: este celular sale de la pareja y lo explica.
- Escritura fallida (respuesta, avance): reintento automático y aviso si persiste; la
  respuesta del diario no se da por enviada hasta confirmar.
- Partida abandonada (ninguna señal en 10 min): queda como terminada.
- Banco de un tema agotado: reabre lo antiguo (sección 6.5), nunca se queda sin preguntas.
- Plantilla sin datos del perfil: se descarta ese día.

## 9. Verificación

- `pruebas.html` (sin conexión, con la nube falsa):
  - Contenido: ids únicos; esquema válido por banco; V/F balanceados por tema; cada pregunta
    con `dato` y `ref`; opciones sin repetir; cantidades mínimas por banco.
  - Matemáticas: miles de ejercicios generados con respuesta correcta verificada por un
    cálculo independiente y distractores distintos de la respuesta.
  - Inglés: preguntas generadas con exactamente una opción correcta.
  - Puntaje y bonus; avance de partida (ambos respondieron / tiempo agotado / doble avance).
  - Selección del diario: respeta intensidad, temas evitados, `requiere`, sin repetir,
    al menos una de adivinar.
  - Perfil: aprendizaje solo al revelar, umbral de 3, correcciones.
  - Revelado: no se revela con un solo lado; coincidencias y debate.
  - Partida completa y día completo simulados con dos celulares falsos.
- Reglas de seguridad probadas con el emulador de Firestore (`@firebase/rules-unit-testing`):
  un extraño no lee nada; nadie lee la respuesta del otro sin haber respondido; no se
  enumeran parejas; no se puede quitar el lugar de otro sin reclamarlo.
- Prueba en el navegador con tamaño de celular y dos pestañas como dos personas.
- Prueba final de la pareja en sus celulares reales.

## 10. Etapas de construcción

Cada etapa termina con la suite en verde y se puede usar:

1. **Nube y pareja**: `nube.js`, nube falsa, enlazar, reglas + emulador, guía de configuración.
2. **Trivia** con bancos iniciales (~40 por tema), matemáticas e inglés generados.
3. **Diario**: perfil inicial, 3 del día, reto de inglés, revelado, pendientes, historial.
4. **Aprendizaje**: rasgos, plantillas, seguimientos, "Lo que Okupa sabe de mí",
   "¿Cuánto me conoces?".
5. **Bancos completos**: llevar cada banco a la cantidad de la sección 3.1, verificados.

## 11. Fuera de alcance

Notificaciones push, preguntas generadas con IA, chat, más de dos personas, cuentas con
correo, sincronizar las secciones viejas (preguntas, Mis preguntas) entre celulares,
respaldo local de los datos de la nube (viven en Firebase).
