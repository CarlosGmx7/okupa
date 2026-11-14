# v20 — Cápsula del tiempo

Fecha: 2026-11-14 · Caché: `okupa-v20` · Rama `v20-capsula` (sale de `v19-fechas`)

## Para qué
Que uno le deje al otro una carta que **solo se puede abrir en una fecha** (un aniversario, un cumpleaños, "dentro de un año"), y que el día de abrirla le llegue un aviso. Es la v20 de la hoja de ruta: «cartas que se abren en una fecha, con aviso».

## Decisiones que tomé por Carlos (revisar)
Carlos dejó que eligiera lo recomendado mientras dormía. Cada una con su alternativa:
1. **El contenido está sellado de verdad**: las reglas de Firebase no dejan leer el texto antes de la fecha (no solo la pantalla). *Alternativa:* ocultarlo solo en la app (más simple, pero cualquiera con conocimientos lo leería antes).
2. **El otro sí ve que hay una carta** y cuándo se abre («Carta de Carlos · se abre en 92 días»), para la ilusión. *Alternativa:* que sea sorpresa total hasta el día.
3. **No se puede editar después de enviarla** (queda sellada). Se puede borrar. *Alternativa:* editable hasta la fecha.
4. **Fecha de apertura:** desde mañana hasta 10 años. *Alternativa:* sin límite.
5. **Texto de 1 a 2.000 caracteres, sin fotos** (las fotos llenarían Firebase gratis, ver ESTADO). *Alternativa:* una foto comprimida.
6. **Aviso** al que la recibe el día de apertura a las 8:00 de su celular, junto con los avisos de fechas (mismo interruptor «Fechas especiales»), con título «Hoy puedes abrir la carta de Carlos 💌». Sin aviso al crearla. *Alternativas:* interruptor propio; aviso también al crearla.
7. **Cualquiera de los dos puede borrar cualquier carta** (también la que aún no se abre), porque «Borrar todo» lo necesita y así funcionó Match. *Alternativa:* solo el autor borra antes de abrir (y «Borrar todo» quedaría incompleto).
8. **Máximo 50 cartas** por pareja (lo limita la app).
9. Sección nueva **«Cápsula»** en el inicio, con detalle «Próxima carta en N días» / «Tienes una carta para abrir» / «Escríbanse una carta».

## No metas
Fotos, audio, cartas para "los dos" o grupales (el modelo usa `de` = lugar y "para todos menos `de`", listo para grupos más adelante), editar después de enviar, aviso al crearla.

## Anti-metas
- Que se pueda leer antes de la fecha (por la app o por la base de datos).
- Que el aviso llegue a quien la escribió o llegue repetido.
- Que «Borrar todo» deje cartas en la nube.

## Restricciones
Las de siempre: Firebase gratis sin Blaze; privacidad por reglas; HTML/CSS/JS sin compilar; español con tuteo; `el()`; rem; caché nueva; reglas que Carlos pega antes de publicar.

## Enfoques considerados
1. **Dos documentos por carta (elegido):** `capsulas/{id}` con lo público (de, fecha) y `capsulas/{id}/contenido/texto` con el texto; la regla del texto compara la hora del servidor con `abreMs`. Sellado real.
2. Un solo documento y ocultar el texto en la app: no protege nada (las reglas no pueden ocultar campos de un documento).
3. Cifrar el texto con una clave que se publica el día: complejo y necesita servidor que publique claves.

## Datos y reglas
- `parejas/{c}/capsulas/{id}`, id `^c-[a-z0-9]{4,30}$`: `{ de: 'a'|'b', abreEl: 'YYYY-MM-DD', abreMs: number, creadaMs: number }`. Leen los miembros; crea un miembro con `de == miLugar`, `abreMs` > ahora y < ahora + 10 años; no se actualiza; borra cualquier miembro.
- `parejas/{c}/capsulas/{id}/contenido/texto`: `{ texto: 1..2000 }`. `get`: miembro y (es el autor o `request.time` ≥ `abreMs`). Sin `list`. Lo crea solo el autor (`de == miLugar`), una vez; no se actualiza; borra cualquier miembro.
- `abreMs` = medianoche local de `abreEl` en el celular de quien la escribe.
- «Borrar todo»: `capsulas` entra a `SUBCOLECCIONES` borrando antes `contenido/texto` de cada una.
- Copia local `okupa:capsulas` (con `codigo`, como `okupa:fechas`) para el detalle del inicio; no viaja en la copia de seguridad.

## Servidor
En el paso de fechas (franja de las 8:00): además de `notificacionDelDia`, lee las cápsulas de la pareja (una vez por pasada) y suma «Hoy puedes abrir la carta de <nombre> 💌» para cada carta con `abreEl == hoy` y `de != lugar`. Si hay fechas y cartas, una sola notificación (la carta va de título; lo demás al texto). Ruta: `#/capsula` si hay carta, si no `#/fechas`.

## App
- `#/capsula`: lista «Para ti» (cartas del otro: cerradas con «se abre el …, en N días» o «Abrir carta»), «Las que escribiste» (puedes releerlas) y botón «Escribir una carta».
- `#/capsula/nueva`: fecha (mín. mañana, máx. 10 años) con atajos opcionales a sus fechas especiales (próximo aniversario / cumpleaños del otro), texto con contador 2.000, «Sellar y enviar» con confirmación («Ya no la podrás cambiar»).
- `#/capsula/:id`: lee el texto si se puede; si no, «Esta carta se abre el …».
- Borrar con confirmación.
- Política de privacidad: agregar las cartas.

## Lo que decide quien construye
Nombres de archivos y funciones, estilos (siguiendo los componentes de Fechas), textos finales menores.
