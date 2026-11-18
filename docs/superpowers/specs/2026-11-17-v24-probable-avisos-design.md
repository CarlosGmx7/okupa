# Okupa v24 — Rondas guardadas, «ya aceptaron», APK nueva y 200 frases (diseño)

Fecha: 2026-11-17. Rama `v24-probable`, worktree `../okupa-v24`. Una sola publicación.

## Intención

Cuatro pedidos de Carlos que llevaban pendientes:

1. **Rondas guardadas de «¿Quién es más probable?»**: el resumen del final hoy se pierde. Quieren guardarlo y verlo después, y saber si el otro también lo guardó.
2. **Aviso «ya aceptaron tu juego»**: quien abre una sala de Trivia o Probable no se entera si se fue de la pantalla y la pareja entró después.
3. **Aviso «hay una APK nueva»**: la APK (TWA) recibe sola los cambios web, pero cuando haya que reconstruirla nadie se entera.
4. **200 frases por tema en Probable**: hoy hay 31 por tema y se repiten rápido.

**Éxito:** guardan una ronda y la vuelven a leer días después, con la marca de si el otro la guardó; el anfitrión recibe «X aceptó tu juego» a tiempo para volver; en la APK vieja aparece la franja cuando se publique una nueva; y una pareja juega semanas sin ver frases repetidas ni genéricas.

## Lo decidido con Carlos

- Lo guardado muestra **frases y elecciones**: fecha, tema, «Coincidieron en X de N» y cada frase con a quién eligió cada uno.
- Los avisos pasan a revisarse **cada 5 minutos** (el repo es público: GitHub Actions no cobra).
- APK nueva: **franja en el inicio**, solo dentro de la APK, sin notificación.
- Picantes: **más atrevidas** — pueden hablar de sexo de forma directa (como la categoría «sexo» de Preguntas).
- Carlos dejó el cómo y el orden a Claude.

## Metas y diseño

### 1. Rondas guardadas
- En la pantalla final de Probable (`final()` en `js/modulos/probable/pantallas.js`), botón **«Guardar ronda»** (solo si la ronda terminó o tuvo al menos una frase revelada). Tras guardar: «Guardada ✓».
- La copia completa va **en el celular** (`ctx.almacen`, clave `okupa:probable:guardadas`): `[{ id: salaId, fecha, tema, frases: [{ texto, a: 'a'|'b'|null, b: 'a'|'b'|null }], coincidencias, total, nombres }]`, máximo 100 (las más viejas salen). Funciona sin internet y es privada de cada celular.
- En la nube solo una marca: `parejas/{c}/probable_guardadas/{salaId}` con `{ a?: true, b?: true }`; cada miembro solo puede poner su propia letra (`true`) y nunca quitar la del otro; ambos pueden leer y borrar. **Requiere pegar reglas nuevas.**
- Nueva pantalla **«Rondas guardadas»** en Probable (enlace desde la pantalla de inicio del modo): lista por fecha (tema, «Coincidieron en X de N», «✓ Yuli también la guardó» o nada) y detalle con cada frase y las dos elecciones. Borrar una guardada solo la quita de este celular.
- Las marcas del otro se leen al abrir «Rondas guardadas» (una lectura por ronda listada que no tenga ya la marca; sin escuchas permanentes).

### 2. «Ya aceptaron tu juego»
- Al **unirse** a una sala de Trivia o de Probable, el celular que entra escribe un aviso `tipo: 'trivia-acepto'` o `'probable-acepto'` en `parejas/{c}/avisos` (id fijo por sala: `acepto_<idSala>`), con `de` = su lugar. El servidor lo manda «a todos menos quien lo hizo» → al anfitrión.
- Texto: título `Okupa`, cuerpo `${nombre} aceptó tu juego. ¡Entra ya!`, ruta `#/trivia` o `#/probable`. Caduca a los 30 min como los otros avisos de juego. Respeta el interruptor de avisos de Trivia (igual que `probable`).
- Reglas: permitir los dos tipos nuevos en `avisos`. **Requiere pegar reglas nuevas** (las mismas de la parte 1).
- Cron de `.github/workflows/notificaciones.yml` a `*/5 * * * *`. Quien construye debe comprobar que la lógica de franjas del Diario y de fechas (`franjasPendientes`, `ultimaFranja`) no manda dos veces ni se salta recordatorios con pasadas cada 5 min.

### 3. APK nueva
- `data/apk.json` (precacheado no: debe leerse fresco, `cache: 'no-store'`): `{ "versionCode": 1, "version": "1.0.0", "url": "https://github.com/CarlosGmx7/okupa/releases/latest" }`.
- Detección de la APK: en el arranque, si `document.referrer` empieza por `android-app://io.github.carlosgmx7.okupa` **o** la URL trae `?apk=N`, se guarda en `sessionStorage` que corre en la APK y su `versionCode` (`N`, o `1` si solo vino el referrer: la APK 1.0.0 no lleva parámetro).
- Si `versionCode` instalado < el de `apk.json`: franja arriba del inicio (las tres interfaces) «Hay una versión nueva de la app» con «Descargar» (abre `url`) y «Ahora no» (oculta la franja para esa versión, guardado en `okupa:apk:descartada`).
- Para las próximas APK: `twa-manifest.json` usará `startUrl: "/okupa/?apk=<appVersionCode>"`; documentarlo en `docs/guia-apk-nueva.md` (pasos para Carlos: subir `appVersionCode`, construir, subir a Releases y luego subir `versionCode` en `data/apk.json`).
- Fuera de la APK (Chrome) nunca aparece.

### 4. 200 frases por tema
- `data/probable/frases.json`: 200 por cada uno de los 5 temas (divertidas, románticas, picantes, futuro, costumbres) = 1.000. Se conservan las 155 actuales (mismos ids) y se agregan las que faltan con ids consecutivos (`div-032` … `div-200`).
- Inspiradas en lo que parejas cuentan en Reddit (r/relationships, r/AskReddit, r/dating, r/Colombia) y redes (TikTok/Instagram de juegos de pareja), **reescritas**, nunca copiadas; en español colombiano natural, sin nombres propios ni marcas, aplicables a cualquiera de los dos.
- No genéricas: situaciones concretas y reconocibles («se coma lo último de la nevera y deje el recipiente vacío adentro»), no rasgos vagos («sea más divertido»).
- Picantes: pueden ser directas sobre sexo, sin ser vulgares ni humillantes y sin nada no consentido.
- Formato y reglas actuales (`validarFrase`: 5–120 caracteres, sin «¿» al inicio, sin «más probable»); la prueba de contenido sube a ≥200 por tema y agrega: sin textos casi iguales (comparando sin tildes ni mayúsculas) y sin nombres propios.

## No metas

- No se guarda nada de Trivia (solo Probable).
- El resumen guardado no se sincroniza entre celulares: cada uno guarda su copia.
- No hay notificación push de APK nueva.
- No se cambian los temas de Probable ni «Nuestras frases».

## Anti-metas

- Que el aviso «aceptó» le llegue a quien entró (debe ir solo al anfitrión).
- Que la franja de APK aparezca en Chrome o se quede pegada después de actualizar.
- Frases de relleno o casi repetidas para llegar a 200.
- Que pasar el cron a 5 min duplique recordatorios del Diario o de fechas.

## Restricciones

- Las de siempre: español colombiano con tuteo, `el()`, rem, sin `--acento`, archivos sin BOM, PowerShell, `git commit -F`.
- `CACHE = 'okupa-v24'`; archivos nuevos en `PRECACHE` (salvo `data/apk.json`) y en `pruebas/pwa.prueba.js`; pruebas nuevas en `pruebas.html`.
- Las reglas nuevas las pega Carlos al publicar; las pruebas de reglas en `firebase/pruebas/` deben cubrir `probable_guardadas` y los tipos nuevos de `avisos`.
- Firebase gratis: las lecturas nuevas son pocas (marcas al abrir «Rondas guardadas», `apk.json` es un archivo estático).

## Enfoques considerados

- Resumen: **copia en el celular + marca en la nube (elegido)** / todo el resumen en la nube (más lecturas, innecesario) / solo en el celular sin marca (no cumple «si el otro también lo guardó»).
- Aceptaron: **aviso por la bandeja + cron a 5 min (elegido)** / aviso con cron de 15 min (llega tarde) / push directo desde el celular (imposible sin servidor propio).
- APK: **referrer + parámetro `?apk=N` + `data/apk.json` (elegido)** / consultar la API de GitHub Releases desde la app (límite de 60 consultas/hora por IP y más lento) / pedir a Carlos que avise a mano.
- Frases: **conservar las 155 y agregar 845 (elegido)** / reescribir todo (perdería el historial de frases vistas).

## Decisiones de Claude tras la revisión del diseño (Carlos puede corregirlas)

- **Votos «Los dos»:** en lo guardado cada elección es `'a' | 'b' | 'todos' | null`, y «Coincidieron en X de N» se calcula con la misma `coincidieron()` de hoy.
- **Frases de «Nuestras frases»:** se guarda el texto, no el id (pueden borrarse después).
- **«Aceptó» solo si de verdad entró:** `unirse()` (Trivia y Probable) devuelve si la unión ocurrió; el aviso se escribe solo en ese caso.
- **Reglas a medio publicar:** si la nube rechaza la marca de «guardada», la copia del celular igual queda y se muestra «Guardada ✓»; la marca se reintenta al abrir «Rondas guardadas». Si rechaza el aviso «aceptó», se ignora en silencio (como hoy `avisar()`).
- **Respaldo:** `okupa:probable:guardadas` viaja en el respaldo (al cambiar de celular no se pierden las rondas); no se agrega a las claves «de este celular».
- **APK y notificaciones:** cuando la app se abre tocando una notificación no llega el referrer, así que en esa sesión la franja no sale; aparece la siguiente vez que abran la APK normal. Para comprobar en el celular que la detección funciona, Ajustes muestra una línea discreta «App instalada: versión N» solo dentro de la APK.
- **Cron cada 5 min:** la lógica de franjas ya ignora pasadas dentro de la misma franja de 15 min (se agrega una prueba). GitHub corre los cron «cuando puede», así que 5 min es lo normal pero no está garantizado. **Límite conocido:** GitHub apaga los cron de un repo público tras 60 días sin actividad en el repo; va en ESTADO.md y en la guía con cómo reactivarlo (Actions → Notificaciones → Enable).

## Lo que queda para quien construye

- Diseño visual de «Rondas guardadas» y de la franja de APK dentro del estilo actual.
- Nombre exacto de funciones y archivos nuevos.
- Cómo se reparte el trabajo de las frases por tema.
