# v21 — ¿Quién es más probable?

Fecha: 2026-11-14 · Caché: `okupa-v21` · Rama `v21-probable` (sale de `v20-capsula`) · Carpeta `../okupa-v21`

## Para qué
Un juego en vivo para reírse y conversar: sale una frase («¿Quién es más probable que se quede dormido en una película?»), cada uno vota a escondidas y, cuando votaron todos, se revela quién votó qué y si coincidieron. Es la v21 de la hoja de ruta («votan a la vez, se revela al final, pensado también para grupos»).

## Lo que decidió Carlos
1. **En vivo, como Trivia**: uno abre una sala, al otro le llega un aviso y se une; avanzan frase por frase juntos.
2. **Opciones de voto: los nombres + «Los dos»**. Con grupos saldrían todos los nombres y «Todos»; nada más cambia.
3. **Al revelar**: quién votó qué y si coincidieron; al final un resumen sin ganador («Coincidieron en 7 de 10 · A Carlos lo eligieron 9 veces»). Sin puntos ni historial.
4. **Frases**: banco por temas escrito por Claude + frases propias de la pareja (como las tarjetas del Match). No se repiten hasta agotar el tema.
5. **Largo**: lo escoge quien abre la sala: 5, 10 o 20 frases.
6. **Votos ocultos por reglas de Firebase** (no solo por la pantalla): módulo nuevo con su propia sala, copiada de la de Trivia; cada voto es un documento aparte que el otro solo puede leer cuando ya votó esa frase.

## Decisiones que tomé por Carlos (revisar)
1. **Temas**: Divertidas, Románticas, Picantes (sugerentes, no explícitas), Futuro y Costumbres, ~30 frases cada uno (~150), más «Nuestras frases» (las propias). *Alternativa:* otros temas.
2. **Las frases propias van todas a «Nuestras frases»** (no se elige tema al escribirlas). Texto de 5 a 120 caracteres, se escribe sin «¿Quién es más probable que…?» (la app lo pone). Se pueden borrar, no editar. Máximo 200.
3. **El voto no se cambia** una vez enviado (como las respuestas del Diario).
4. **Cualquiera toca «Siguiente»** después de la revelación y los dos avanzan (como Trivia, con guarda de ronda para no saltar dos).
5. **Coincidieron** = todos votaron exactamente lo mismo. «Los dos» cuenta como una elección para cada uno en el «más elegido».
6. Si un tema tiene menos frases que el largo pedido (p. ej. 3 propias y piden 10), la ronda usa las que hay; si hay 0, ese tema sale deshabilitado.
7. Módulo `probable`, ruta `#/probable`, fila en la sección «Jugar juntos» del nuevo inicio (Parte 2).
8. **Aviso** al abrir la sala: «Carlos te invita a jugar ¿Quién es más probable? 🤔», con el mismo interruptor que Trivia (juegos). Sin aviso al terminar.
9. **No se puede «cambiar» el voto borrándolo y recreándolo**: un voto solo se borra si su sala ya está `terminada` o `cancelada` (o ya no existe). «Borrar todo» marca cada sala `cancelada` antes de borrar sus votos.
10. **Frases vistas = las que llegaron a revelarse**, aunque la sala se cancele o alguien se salga a mitad. La sala guarda `reveladas` (cuántas se revelaron); el cierre (transacción con lista de salas contadas) lo hace el primer celular que termina, cancela o sale, y marca solo esas.
11. **«Otra ronda» vuelve a `#/probable`** para escoger tema y largo (abre una sala nueva, con su aviso). En el diseño, «ronda» de la sala es solo el contador de guarda para avanzar.
12. **Las salas y votos viejos no se limpian solos**; solo con «Borrar todo». Pesan poco (un voto es un campo).

## Parte 2 — Nuevo inicio (lo pidió Carlos al revisar este diseño)

### Para qué
Hoy el inicio tiene todo seguido y con el mismo peso: el bloque «Nuestra pareja» con 6 botones dorados (serían 7 con este juego), la «Pregunta de hoy», 4 tarjetas grandes de Preguntas y el aviso de instalar. Cansa la vista. Carlos quiere que se ordene por categorías, que se sienta fluido y que no cueste encontrar nada.

### Lo que decidió Carlos
1. **Un solo inicio desplazable con secciones por categoría**. Cada parte es una fila limpia con ícono, nombre y `›`, y solo lleva un texto corto cuando importa:
   ```
   (foto)   Okupa                 ⚙
   Pregunta de hoy · ¿Qué significa para ti…?
   JUGAR JUNTOS
     ✦ Trivia en vivo                 ›
     ? ¿Quién es más probable?        ›
   CONOCERNOS
     ❖ Preguntas                      ›
     ☼ Diario         Te toca responder ›
   NOSOTROS
     ♥ Match                          ›
     ⌖ Mapa                           ›
     ✦ Fechas         Aniversario en 5 días ›
     ✉ Cápsula                        ›
   ```
2. **Preguntas tiene su propia pantalla** (`#/preguntas`) con Sesiones guiadas, Categorías, Al azar y Mis preguntas. La «Pregunta de hoy» se queda arriba en el inicio.
3. **Textos debajo, solo estos:**
   - **Fechas**: solo cuando falten 14 días o menos para una fecha («Aniversario en 5 días», «Tu cumpleaños hoy»). Fuera de esos 14 días no se muestra nada; tampoco «N días juntos» ni «Agreguen sus fechas».
   - **Diario**: solo si te toca («Te toca responder», «<nombre> ya respondió»); nada si ya está todo hecho.
   - **Trivia y ¿Quién es más probable?**: «<nombre> te está esperando» cuando el otro abrió una sala.
   - **Match y Cápsula: nunca** (se quita «Plan de la semana: …» y «Próxima carta en N días»; el plan de la semana sigue dentro de Match).
4. **«Nuestra pareja» pasa a Ajustes**. Si este celular no está enlazado, el inicio muestra arriba una tarjeta «Jueguen juntos · Enlacen sus celulares →»; las filas se siguen viendo (cada sección pide enlazar, como hoy).

### Cómo se construye (mi propuesta)
- Cada módulo declara en su `accesoJuntos` (o un campo nuevo `accesoInicio`) su `seccion` (`jugar` | `conocernos` | `nosotros`) y su `orden`; `inicio.js` agrupa y pinta. Así un módulo nuevo se ubica solo, sin tocar `inicio.js`. *Alternativa descartada:* una lista fija en `inicio.js` (rompe la idea de módulos que se activan en `modulos.json`).
- Preguntas deja de aportar `tarjetasInicio` con sus 4 accesos; aporta la «Pregunta de hoy» y su fila. Las 4 tarjetas pasan a `#/preguntas`.
- El texto de «te está esperando» se pinta sin internet, desde una copia local que `precalentar` refresca leyendo el puntero de sala abierta (`estado/uso`: `salaAbierta` y `probableAbierta`), con una lectura por apertura; solo se muestra si la sala sigue abierta y la abrió el otro.
- Estilo: filas dentro de una tarjeta por sección, con los colores actuales (vino y dorado). Los títulos de sección van en versalitas pequeñas. Se quitan los botones dorados grandes. El aviso de instalar y «Acerca de» quedan al final.

## No metas
Modo a ratos, puntos o ganador, historial de rondas, grupos de verdad (solo queda el modelo listo: lugares, «todos menos quien abre»), editar frases propias, elegir tema para las propias, cambiar el voto.

## Anti-metas
- Que se pueda ver el voto del otro antes de votar (por la app o leyendo la base de datos).
- Que los dos celulares avancen dos veces o se desincronicen.
- Que «Borrar todo» deje salas, votos o frases propias en la nube.
- Que se repitan frases mientras queden sin salir en el tema.

## Restricciones
Las de siempre: Firebase gratis sin Blaze (cuidar lecturas/escrituras); privacidad por reglas; HTML/CSS/JS con módulos ES sin compilar; español colombiano con tuteo; `el()`; tamaños en rem; caché nueva `okupa-v21`; archivos nuevos en `PRECACHE` y en `pruebas/pwa.prueba.js`; pruebas nuevas en `pruebas.html`; reglas nuevas que Carlos pega antes de publicar. No tocar Trivia.

## Enfoques considerados
1. **Votos ocultos por reglas, módulo propio (elegido)**: sala copiada de `trivia/sala.js`; votos en documentos aparte con regla «lo ves si ya votaste esa frase», igual que `dias/{fecha}/respuestas` del Diario. Seguro de verdad; ~1 escritura más por voto.
2. Votos dentro del documento de la sala (como Trivia): más simple, pero cualquiera con conocimientos vería el voto del otro antes. Va contra «la privacidad la garantizan las reglas».
3. Sala común para Trivia y este juego: mejor a futuro, pero toca Trivia, que funciona, con riesgo de dañarla.

## Datos
- **Sala** `parejas/{c}/probable/{id}`, id `^q-[a-z0-9]{4,30}$`:
  `{ anfitrion: lugar, estado: 'esperando'|'jugando'|'terminada'|'cancelada', tema, frases: [{ id, texto }], indice, ronda, reveladas, votaron: { [indice]: { [lugar]: true } }, senal: { [lugar]: hora }, creada, creadaMs }`.
  `votaron` solo dice *que* alguien votó, no *qué*. Reglas: leen y escriben los miembros (como `partidas`), con `id` válido.
- **Votos** `parejas/{c}/probable/{id}/votos/{indice}_{lugar}`: `{ voto: 'a'|'b'|'todos' }` (en grupos, cualquier lugar válido o `todos`).
  `get`: miembro y (es el suyo o ya existe `{indice}_{miLugar}`). `list`: no. `create`: miembro, el lugar del nombre es `miLugar`, `indice` numérico, solo la clave `voto` con valor válido. `update`: no. `delete`: cualquier miembro, solo si la sala no existe o está `terminada`/`cancelada`.
- **Frases propias** `parejas/{c}/probable_frases/{id}`, id `^f-[a-z0-9]+$`: `{ texto: 5..120, creadaMs }`. Leen, crean y borran los miembros; no se actualizan.
- **Uso** en `parejas/{c}/estado/uso` (ya existe): `probableAbierta: id` (puntero, como `salaAbierta` de Trivia) y `vistasProbable: { [tema]: [ids] }` (se vacía el tema cuando se agota).
- **Banco** `data/probable/frases.json`: `[{ id, tema, texto }]`, ids estables (p. ej. `div-001`).
- **Aviso**: tipo `probable`, id `probable_{idSala}`; la regla de `avisos` lo acepta; el servidor lo manda «a todos menos quien lo hizo».

## Cómo se juega (flujo)
1. `#/probable`: si hay sala abierta del otro → «Unirme». Si no: escoger tema (con cuántas frases quedan sin salir) y largo (5/10/20) → «Abrir sala». Enlace a «Nuestras frases» para escribir/borrar las propias.
2. Quien abre espera («Esperando a <nombre>…», con «Cancelar»). El otro se une → `jugando`.
3. Cada frase: «¿Quién es más probable que…?» + botones con los nombres y «Los dos». Al votar: se crea el documento del voto y se marca `votaron[indice][lugar]`. Se muestra «Esperando a <nombre>…».
4. Cuando `votaron[indice]` tiene a todos los lugares de la pareja, cada celular lee los votos de los demás (permitido porque ya votó) y muestra la revelación: cada nombre con su voto y «¡Coincidieron!» o «No coincidieron».
5. «Siguiente» (cualquiera) avanza con transacción y guarda de `ronda`. En la última, `terminada`.
6. Resumen: coincidencias X de N y cuántas veces eligieron a cada uno; botón «Otra ronda». Al cerrar se marcan las frases como vistas una sola vez (transacción con lista de salas contadas, como `cerrarPartida`).
7. Señal de vida como Trivia (`latir`); si el otro se va, «<nombre> se salió» con opción de salir.

## Borrar todo
Agregar `probable` (marcando cada sala `cancelada` y borrando antes `votos/{i}_{lugar}` por nombre fijo, para i en 0..frases-1 y cada lugar, porque los votos no se pueden listar) y `probable_frases`.

## Servidor
`servidor/notificaciones/`: texto del aviso `probable` y ruta `#/probable`, con el mismo interruptor que Trivia.

## Otros
- Política de privacidad: agregar el juego (los votos solo los ve el otro cuando ya votó).
- Pruebas: lógica pura (coincidencia, resumen, escoger frases sin repetir), sala con nube falsa, reglas en el emulador con ataques (leer voto ajeno sin haber votado, crear voto a nombre del otro, cambiar voto, listar votos).

## Lo que decide quien construye
Nombres de archivos y funciones internas, estilos (siguiendo los componentes de Trivia y Match), textos finales menores, redacción de las ~150 frases dentro de los temas fijados.
