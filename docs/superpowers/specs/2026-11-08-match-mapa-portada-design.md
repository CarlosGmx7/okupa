# Okupa · Match de deseos, Mapa con lugares y foto de inicio

Fecha: 2026-11-08 · Estado: pendiente de revisión · Rama base: `trivia-diario`

## Propósito

Hacer Okupa más dinámica sin perder el foco de conocerse: descubrir qué quiere de verdad el
otro sin exponerse (Match), guardar los lugares soñados y vividos (Mapa) y dejar que cada
celular tenga su propia foto de portada.

## Decisiones del usuario

| Tema | Decisión |
|---|---|
| Mapa | Un solo mapa (el de ubicación actual) que además guarda **deseos y recuerdos** |
| Estilo del mapa | OpenFreeMap **Liberty** (vectorial) |
| Tarjetas del Match | ~150 incluidas + creadas por la pareja (sin autor visible) |
| Mazo de intimidad | Siempre activo, mezclado con los demás |
| Después de un match | Plan sugerido cada semana (más una lista mínima de matches con "¡Lo hicimos!") |
| Fotos de recuerdos | Comprimidas en Firestore (sin Storage, sin tarjeta) |
| Foto de inicio | Elegida de la galería, solo en ese celular, con opción de volver a la original |

## 1. Match de deseos (módulo `match`)

**Mazos incluidos** (`data/match/tarjetas.json`, ~150): `citas`, `viajes`, `finde`, `aprender`,
`retos`, `intimidad`. Cada tarjeta: `{ id: "mat-NNN", mazo, texto }`. Texto en tuteo
colombiano, concreto y realizable ("Cocinar juntos un plato de otro país que ninguno haya probado").

**Votar:** pila de cartas con deslizar (reutiliza `habilitarDeslizar`) y tres botones:
- derecha / "Me encantaría" → `si`
- arriba / "Solo si tú quieres" → `quizas`
- izquierda / "No" → `no`

**Match:** `si+si` o `si+quizas`. `quizas+quizas` no es match.

**Privacidad garantizada por reglas, no solo por la pantalla:**
- `parejas/{c}/match_privado/{lugar}` → `{ votos: { [idTarjeta]: 'si'|'quizas'|'no' } }`;
  solo lo lee y escribe su dueño. Aquí vive el "no" y sirve para saber qué cartas faltan.
- `parejas/{c}/match_si/{idTarjeta}_{lugar}` → `{ voto: 'si'|'quizas' }`; solo existe si el voto
  fue positivo. Cada uno crea/borra solo los suyos. **Leer el del otro para una tarjeta solo se
  permite si existe el propio positivo de esa tarjeta.** Así un "no" del otro es indistinguible de
  "aún no votó".
- `parejas/{c}/match_matches/{idTarjeta}` → `{ creado, hecho: false }`; lo crea quien completa el
  match y las reglas exigen que existan los dos `match_si` y que al menos uno sea `si`. Ambos lo
  listan. Solo se puede cambiar `hecho`.
- `parejas/{c}/match_tarjetas/{id}` → tarjetas creadas por la pareja: `{ mazo, texto, creada }`
  (sin autor). Ambos las leen; quien la crea queda con voto `si` automático.

**Flujo al votar positivo:** escribir privado + `match_si` → leer `match_si` del otro → si hay
match: crear `match_matches/{id}` y mostrar animación "¡Match!". El otro lo ve al abrir la lista.

**Pantallas:** Mazo (cartas pendientes, con filtro de mazos), Matches (lista; "¡Lo hicimos!"),
Crear tarjeta. Tarjeta de inicio: "Match · N cartas nuevas" y el **plan de la semana**.

**Plan de la semana:** semana ISO actual (hora Colombia) → hash → índice sobre los matches con
`hecho: false` ordenados por id. Igual en los dos celulares. Sin matches pendientes: invita a votar.

## 2. Mapa con deseos y recuerdos (módulo `mapa`, ampliado)

**MapLibre GL + OpenFreeMap Liberty** reemplazan Leaflet y el fondo de OpenStreetMap:
- Librería `maplibre-gl` (versión fija) desde cdnjs, cacheada por el service worker como hoy Leaflet.
- Estilo `https://tiles.openfreemap.org/styles/liberty`; etiquetas en español con
  `coalesce(name:es, name)` en las capas de texto.
- Se conserva todo lo actual: avatares, hora, ubicación aproximada, ruta roja, km y minutos en moto.

**Capas con interruptores:** "Nosotros" (ubicaciones + ruta) y "Lugares" (deseos ★ dorado,
recuerdos ♥ vino).

**Agregar un lugar:** botón "+ Lugar" → buscar por nombre (Photon, `photon.komoot.io`, gratis,
sin clave, con sesgo a Colombia) o mantener presionado el mapa → formulario: nombre, tipo
(deseo/recuerdo), nota corta, fecha (recuerdos).

**Ficha de un lugar** (al tocar el pin):
- Deseo: nota, "¡Fuimos!" (pasa a recuerdo con la fecha), borrar.
- Recuerdo: fecha, **versión de cada uno** (la del otro se revela cuando escribiste la tuya, como el
  Diario), **fotos** (hasta 6, de la galería, comprimidas), borrar.

**Datos:**
- `parejas/{c}/lugares/{id}` → `{ nombre, lat, lng, tipo: 'deseo'|'recuerdo', nota, fecha?, creado }`; ambos leen/escriben.
- `parejas/{c}/lugares/{id}/versiones/{a|b}` → `{ texto }` (≤ 1000 car.); crear/editar solo la propia;
  leer la del otro solo si existe la propia.
- `parejas/{c}/lugares/{id}/fotos/{fid}` → `{ datos: 'data:image/jpeg;base64,…', ancho, alto, creada }`;
  ambos; las reglas limitan `datos` a 400 000 caracteres.

**Compresión:** canvas a 1200 px el lado mayor, JPEG calidad 0.75, bajando hasta caber (~150 KB).

## 3. Foto de inicio personalizable (núcleo)

- Tocar la portada → hoja con "Elegir de la galería" (`<input type=file accept="image/*">`) y
  "Volver a la foto original".
- Recorte: vista circular, arrastrar para mover, deslizador (y pellizco) para zoom.
- Se guarda como JPEG 512×512 en `localStorage` (`okupa:portada`, vía `almacen`); no sale del celular.
- Si falla guardar (almacenamiento lleno) se avisa y se mantiene la anterior.
- El ícono instalado no cambia (limitación de las apps web).

## Errores

- Sin internet: el mapa y el Match muestran "Se necesita conexión" con "Reintentar"; lo demás sigue offline.
- Photon caído: se puede agregar el lugar tocando el mapa.
- Foto que no se puede leer: mensaje y nada cambia.

## Verificación

- Pruebas en `pruebas.html` para: lógica de match y plan semanal, privacidad (con nube falsa),
  validación de tarjetas, compresión de fotos, revelado de versiones, recorte de portada.
- Pruebas de reglas en `firebase/` (emuladores) para `match_*`, `lugares/*`.
- Prueba manual en el navegador a tamaño de celular.

## Fuera de alcance

Notificaciones push, fotos en tamaño completo, mapas sin internet, cambiar el ícono instalado.
