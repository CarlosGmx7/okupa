# v19 — Fechas especiales (días juntos y aniversarios)

Fecha: 2026-11-13 · Caché: `okupa-v19`

## Para qué
Que la pareja **no olvide sus fechas importantes**. Lo principal son los avisos a tiempo; el contador de días juntos es un acompañante en el inicio. (Carlos eligió esto sobre "detalle romántico" o "motivo para abrir la app".)

## Metas
- Una lista de fechas de la pareja, compartida: los dos la ven y la editan igual.
- Ya vienen puestas «Empezamos» (inicio de la relación) y el cumpleaños de cada uno, para completar. Además pueden agregar las que quieran (nombre + fecha), que se repiten cada año.
- A partir de «Empezamos» salen solas: las mensuales («1 año y 3 meses») y los hitos redondos de días.
- Avisos al celular: **una semana antes y el mismo día** a las 8:00 a. m. (hora del celular). Las mensuales avisan **solo el mismo día**. Llegan aunque nadie abra la app.
- En el cumpleaños de uno, el aviso de la semana antes le llega **solo al otro** (para planear la sorpresa); el del día, a los dos.
- En el inicio, en el acceso «Fechas» de la tarjeta de la pareja: «1.234 días · Cumple de Yuli en 5 d».

## No metas
- Fechas que no se repiten cada año (citas puntuales, recordatorios sueltos).
- Elegir la anticipación del aviso o la hora (fijas: 7 días y 8:00). Solo se puede apagar el tipo de aviso «Fechas» en Ajustes, como los demás.
- Grupos de 3+ (se deja el modelo listo: `de` es el lugar, no "el otro").

## Anti-metas (sería un fracaso aunque funcione)
- Que lleguen avisos repetidos el mismo día o que uno se quede sin aviso porque GitHub Actions se atrasó un rato.
- Que lleguen tantos avisos que los apaguen (por eso las mensuales solo avisan el día).
- Que la fecha del cumpleaños de uno "revele" la sorpresa: el aviso de la semana antes no le llega al cumpleañero.

## Restricciones
- Firebase gratis (50k lecturas / 20k escrituras al día). Sin Blaze ni Cloud Functions: los avisos los manda `servidor/notificaciones/` en GitHub Actions (cada 15 min).
- La privacidad y la validez las garantizan las reglas (`firebase/firestore.rules`) y se prueban con el emulador.
- HTML/CSS/JS con módulos ES sin compilar; textos en español colombiano con tuteo; letra en rem; usar `el()`; no usar `--acento` para el tema.
- Si cambian las reglas, Carlos las pega en Firebase antes de publicar.

## Enfoques considerados
1. **Servidor diario, una fecha por documento (elegido por Carlos).** GitHub Actions, a las 8:00 de cada celular, lee las fechas de su pareja y manda lo que toque. Cada fecha es `parejas/{c}/fechas/{id}`, con reglas que la validan una por una. Pocas lecturas por pareja al día; llega aunque nadie abra la app.
2. Servidor diario, todas las fechas en un solo documento. Menos lecturas, pero las reglas no validan bien una lista de largo libre y las ediciones simultáneas son delicadas.
3. Que la app programe los avisos en el celular. Descartado: los navegadores no permiten notificaciones programadas a futuro y sin abrir la app no llegaría nada.

## Datos
`parejas/{codigo}/fechas/{id}`:
| id | tipo | campos |
|---|---|---|
| `inicio` | `inicio` | `fecha` |
| `cumple_a`, `cumple_b` | `cumple` | `fecha`, `de` (`'a'`/`'b'`, igual a la letra del id) |
| `f-<base36>` | `otra` | `fecha`, `nombre` (1–40) |

Todas: `fecha` `'YYYY-MM-DD'`, `actualizadaMs` (número). Sin autor. Máximo 30 fechas `otra` (lo limita la app).

Reglas: los miembros leen, crean, cambian y borran; validan claves exactas, el tipo según el id y el formato de fecha. Un extraño no hace nada. `fechas` se agrega a `SUBCOLECCIONES` de `pareja.js` para que «Borrar todo» la borre.

`dispositivos/{id}` cambia:
- `avisos.fechas` (bool; los registros viejos sin él cuentan como `true`).
- `franjaFechas`: franja UTC de las 8:00 locales (`franjaUTC('08:00', zona)`), la escribe la app igual que `franja`.
- `ultimoFechas`: `'YYYY-MM-DD'` del día local del último envío; solo lo pone el servidor (misma protección que `ultimoRecordatorio`).

## Qué toca avisar (lógica pura, compartida)
Una función pura `avisosDelDia(fechas, hoy, lugar, nombres)` → lista de `{ titulo, texto }` para ese celular. Vive en un archivo que importan la app (para mostrar "próximas") y el servidor. Reglas:
- **Anuales** (inicio, cumple, otra): el día del aniversario y 7 días antes. Si la fecha es 29 de febrero, en años no bisiestos cuenta el 28.
- **Cumple de `de`**: el aviso de 7 días antes no va al celular de `de`.
- **Inicio** genera también:
  - **Mensuales**: el mismo día del mes desde «Empezamos» (si el mes no tiene ese día, el último del mes). Solo aviso del día. Cuando cae en un aniversario de años, cuenta solo el de años.
  - **Hitos de días**: 100, 200, … 1.000 y luego cada 500 (1.500, 2.000…). Aviso el día y 7 días antes.
- Si el mismo día tocan varias, se mandan **en una sola notificación** (título de la más importante: aniversario/cumple > otra > hito > mensual; el texto suma las demás).
- La fecha de inicio no puede ser futura; la primera mensual es al mes de empezar.

Textos (borrador, se pulen al construir): «Hoy es el cumpleaños de Yuli 🎂», «En una semana: cumpleaños de Yuli», «Hoy cumplen 2 años juntos», «Hoy cumplen 1 año y 3 meses», «Hoy cumplen 1.000 días juntos», «En una semana: Primer viaje». Ruta al tocar: `#/fechas`.

## Servidor
En `pasada.mjs`, un paso 3 que recorre las mismas franjas pendientes que el recordatorio: `dispositivos where franjaFechas == franja`; para cada uno, si `avisos.fechas !== false`, `ultimoFechas !==` hoy en su `zona` y el registro sigue vigente, lee las fechas de su pareja (en caché por pareja dentro de la pasada), calcula `avisosDelDia` y, si hay algo, manda una notificación y pone `ultimoFechas`. Si no hay nada, no escribe (cada franja se procesa una sola vez gracias a `ultimaFranja`, así que no se repite; `ultimoFechas` cubre pasadas que se crucen). Mi decisión: así no se gastan escrituras los días sin fechas.

## App
- Módulo nuevo `js/modulos/fechas/` (en `modulos.json`), ruta `#/fechas`:
  - Arriba: «Llevamos N días juntos» (o, sin inicio, un botón «¿Desde cuándo están juntos?»).
  - Lista de próximas, ordenadas por días que faltan, con «en N días» / «hoy». Incluye la próxima mensual y el próximo hito.
  - Tocar una fecha la edita; botón para agregar; borrar las `otra`. Inicio y cumpleaños se pueden vaciar pero no quitar de la lista.
- `accesoJuntos` del módulo: «Fechas» con detalle «N días · <próxima> en N d», leído de una copia local (`okupa:fechas`) que se refresca al entrar a `#/fechas` y al abrir la app con pareja. Esa copia no viaja en la copia de seguridad (`esDeEsteCelular`).
- Ajustes → Notificaciones: interruptor «Fechas especiales». `TIPOS` incluye `fechas`; el registro manda `franjaFechas`.
- Política de privacidad: agregar «Las fechas especiales (inicio, cumpleaños y las que agreguen)».

## Decisiones tras la revisión (mías, salvo donde se dice)
- **Cómo se cuentan los días (de Carlos)**: el día de «Empezamos» es el día 1. Días juntos = (hoy − inicio) + 1. El hito de N días cae en inicio + (N − 1) días (si empezaron el 1 de enero, 100 días = 9 de abril). Mensuales y aniversarios de años sí caen en la misma fecha del calendario (1 de febrero, 1 de enero del año siguiente).
- **Fecha vacía**: inicio o cumpleaños sin completar = el documento no existe; la app pinta la fila «Sin fecha · Agregar». Se crea solo al guardarla; «vaciarla» la borra. No hay documentos semilla ni carrera entre los dos celulares; las reglas siempre exigen `fecha` válida.
- **Qué día es "hoy"**: el día local (en `zona` del celular) del momento de la franja que se está procesando, no el de la hora en que corre la pasada. Las franjas atrasadas solo se recuperan hasta 2 h (como ya hace `franjasPendientes`); a las 8:00 eso no cruza la medianoche.
- **`franjaFechas`**: se recalcula y reescribe al abrir la app, igual que `franja` (mismo camino de código). Colombia no tiene horario de verano; en otro país, el aviso se corrige la próxima vez que se abra la app.
- **Registros viejos**: las reglas aceptan `avisos.fechas` y `franjaFechas` opcionales (los celulares con la versión vieja siguen registrándose). `ultimoFechas` queda protegido igual que `ultimoRecordatorio` (`d.get(...) == previo.get(...)`).
- **Envío fallido**: `ultimoFechas` se pone solo si llegó al menos una; no hay segunda ventana (igual que el recordatorio). Un token inválido borra el registro como hoy.

## Lo que decide quien construye
- Nombres exactos de archivos y funciones, diseño visual de la lista (siguiendo los componentes existentes).
- Cómo se refresca la copia local y los textos finales.
