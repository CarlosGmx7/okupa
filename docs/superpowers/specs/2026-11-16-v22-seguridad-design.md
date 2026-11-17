# Okupa v22 — Seguridad: cambio de celular con aprobación y App Check

Fecha: 2026-11-16. Rama `v22-seguridad`, worktree `../okupa-v22`.

## Para qué

Hoy quien tenga el código de la pareja puede «reclamar» un lugar desde cualquier navegador y leer lo
privado de ese lugar: las cartas de la Cápsula antes de su fecha, los «no» del Match y las respuestas
del Diario. Eso incluye a la propia pareja, que siempre tiene el código. La v22 cierra ese hueco y
además hace que solo la app real pueda hablar con el Firebase de Okupa.

## Metas

1. Nadie entra a un lugar ocupado sin que lo apruebe **el celular que hoy tiene ese lugar**.
2. Si ese celular ya no existe, el nuevo entra **solo a los 7 días**, y solo si nadie rechazó la solicitud.
3. Los dos miembros se enteran de cada solicitud (dentro de la app y por notificación) y cualquiera
   de los dos puede rechazarla. La pareja la ve, pero no puede aprobarla ni acelerarla.
4. App Check con reCAPTCHA v3, **exigido desde el primer día** en Firestore.
5. Todo lo hacen cumplir las reglas de Firestore. Sin Blaze, sin Cloud Functions, sin cuentas.

## Fuera de alcance

- Entrar con Google, claves personales o códigos de recuperación (Carlos los descartó para esta versión).
- App Check para Authentication (pide Identity Platform) y para la APK aparte: la APK es la misma web.
- Cambiar cómo se une el segundo miembro a un lugar vacío: sigue igual, con el código.

## Lo que NO debe pasar

- Que la pareja pueda entrar al lugar del otro aprobándose a sí misma.
- Que una solicitud deje por fuera al celular viejo antes de ser aprobada o de cumplir los 7 días.
- Que alguien con el código llene de solicitudes a la pareja sin freno.
- Que un miembro actual pierda acceso por publicar la v22 (nadie tiene que volver a enlazarse).

## Enfoques considerados

- **A. Solicitud con aprobación (elegido por Carlos).** El celular nuevo deja una solicitud; el viejo
  aprueba; sin él, 7 días. La app sigue anónima y todo cabe en las reglas.
- **B. Código de traspaso generado en el celular viejo.** Nadie de afuera puede pedir un lugar, pero
  sin celular viejo no hay salida: habría que sumarle la solicitud de 7 días. Más trabajo, mismo resultado.
- **C. Entrar con Google.** Sin esperas aunque se pierda el celular, pero la app deja de ser anónima,
  cambia la política y el inicio de sesión dentro de la APK es frágil. Queda como posible mejora futura.

## Costo que Carlos debe conocer

Borrar los datos de Chrome, o desinstalar y reinstalar el navegador, crea una identidad nueva: para
la app ese es un «celular nuevo sin celular viejo». Hoy eso se arregla al instante reclamando el
lugar; **con la v22 serán 7 días de espera**. Es el precio de proteger lo privado también de la pareja.
La pantalla de Ajustes lo advertirá junto al código.

## Diseño

### Datos

`parejas/{codigo}/solicitudes/{lugar}` — a lo sumo una por lugar (`a` o `b`):

| Campo | Quién lo pone | Qué es |
|---|---|---|
| `uid` | el celular nuevo | su identidad anónima |
| `creada` | el celular nuevo | hora del servidor (`request.time`) |
| `rechazada` | un miembro | hora del servidor al rechazar; ausente mientras está pendiente |
| `avisada`, `recordada` | el servidor | marcas para no notificar dos veces |

### Reglas (`firebase/firestore.rules`)

Documento de la pareja — se parte el actual `tomaLugar` en tres caminos:

- **Ocupar un lugar vacío** (unirse): el lugar estaba en `null` y queda con mi uid. Como hoy.
- **Entregar** (aprobar): yo tengo hoy el lugar `x` y lo cambio por el `uid` de `solicitudes/x`,
  que existe y no está rechazada. Solo cambia `lugares.x`.
- **Tomar una solicitud vencida**: `solicitudes/x.uid` es mi uid, no está rechazada y
  `request.time >= creada + 7 días`. Solo cambia `lugares.x`, que queda con mi uid.

Reclamar un lugar ocupado sin solicitud deja de estar permitido. Se mantiene `lugares.a != lugares.b`.

Solicitudes:

- **Crear**: autenticado, no es miembro de esa pareja, el lugar está ocupado, no hay otra solicitud
  para ese lugar, solo las claves `uid` (el propio) y `creada` (`request.time`).
- **Leer** (`get`): los miembros y quien la creó. Nadie las lista.
- **Rechazar** (`update`): un miembro, solo agrega `rechazada == request.time`, una sola vez.
- **Borrar**: un miembro en cualquier momento (limpiar o permitir otra solicitud); quien la creó, si
  está pendiente (cancelar) o si fue rechazada hace más de 24 horas (freno contra el abuso).

### Aplicación

- `js/nucleo/pareja.js`: `reclamar` desaparece. Entran `pedirLugar`, `solicitudPendiente` (la mía,
  guardada también en el celular para retomar la espera), `cancelarSolicitud`, `entrarVencida`,
  `solicitudesDe` (las de mi pareja, para los avisos), `aprobar` y `rechazar`. Al entrar, el celular
  nuevo borra su solicitud.
- `js/nucleo/pantallas-pareja.js`:
  - «¿Quién eres?» ya no reclama: crea la solicitud y pasa a la pantalla de espera.
  - **Espera (celular nuevo):** «Abre Okupa en tu celular anterior y toca Aprobar. Si ya no lo
    tienes, podrás entrar el *fecha* si nadie la rechaza.» Escucha el documento de la pareja y entra
    sola en cuanto la aprueban. Pasados los 7 días muestra «Entrar». Si la rechazan, lo dice y
    explica que puede volver a pedirla en 24 horas. Tiene «Cancelar solicitud».
  - **Nuestra pareja (miembros):** advertencia fija bajo el código sobre los 7 días.
- **Aviso de solicitud (miembros):** franja arriba del inicio y en «Nuestra pareja», visible mientras
  haya una solicitud pendiente.
  - En el celular del mismo lugar: «Alguien pide entrar como *tu nombre* desde otro celular. ¿Eres
    tú?» con **Aprobar** y **Rechazar**. Aprobar pide confirmar: «Este celular quedará por fuera».
  - En el celular de la pareja: «*Nombre* pidió entrar desde otro celular. Entrará el *fecha* si
    nadie lo rechaza.» con **Rechazar**.
  - Se consulta al abrir la app y al volver a ella (dos lecturas), no con una escucha permanente.
- Tras aprobar, el celular viejo pierde su lugar como hoy y ve «Pasaste tu lugar a tu celular nuevo».

### Notificaciones (`servidor/notificaciones/`)

En cada pasada se leen las solicitudes (`collectionGroup('solicitudes')`):

- Pendiente sin `avisada`: notificación a los dos miembros («Alguien pide entrar como *nombre*…») y se marca.
- Pendiente con más de 6 días y sin `recordada`: recordatorio a los dos («Mañana entra si nadie lo rechaza») y se marca.
- Solicitud cuyo `uid` ya es el del lugar, o rechazada hace más de 8 días: se borra.

Estas notificaciones no se pueden apagar desde Ajustes: son de seguridad.

### App Check

- `js/nucleo/nube.js` carga `firebase-app-check.js` e inicia App Check con `ReCaptchaV3Provider`
  antes de usar Auth o Firestore, con renovación automática. La clave del sitio va en `nube-config.js`
  (no es secreta). Con emuladores no se inicia. En `127.0.0.1` se usa un token de depuración.
- El servidor de notificaciones usa la cuenta de servicio y no pasa por App Check.
- **Pasos de Carlos** (se entregan escritos, con capturas de dónde tocar): crear la clave reCAPTCHA v3
  para `carlosgmx7.github.io`; registrarla en Firebase → App Check; publicar; comprobar en la consola
  que las solicitudes llegan «verificadas»; tocar **Exigir** en Firestore; registrar el token de
  depuración del computador.
- Consecuencia aceptada por Carlos: un celular con la versión vieja guardada falla hasta que se
  actualice. La app nueva se instala sola al abrirla con internet.

### Orden de publicación

1. Carlos crea la clave reCAPTCHA y la registra en App Check (sin exigir).
2. Se publica la v22 (`CACHE = okupa-v22`).
3. Carlos pega las reglas nuevas y, con las solicitudes ya verificadas, exige App Check.

Las reglas nuevas se pegan **después** de publicar la app: con la app vieja y las reglas nuevas, solo
dejaría de funcionar «reclamar», que es justo lo que se quiere cerrar.

### Privacidad

`privacidad.html`: se quita la advertencia de que el código permite entrar al lugar del otro, se
explica la aprobación y los 7 días, y se menciona reCAPTCHA (Google) como servicio de App Check.

## Pruebas

- Reglas (emulador): cada camino permitido y cada ataque — reclamar sin solicitud; aprobarse siendo
  la pareja; tomar antes de 7 días; tomar una rechazada; crear una segunda solicitud; un extraño
  leyendo o rechazando; volver a pedir antes de 24 horas.
- Flujo completo con el código real de `pareja.js` contra las reglas (como `probable-flujo.test.js`).
- App (`pruebas.html`): lógica de `pareja.js` con la nube falsa, pantallas de espera y de aviso.
- Servidor: avisar una vez, recordar al día 6, limpiar.

## Decisiones mías (Carlos puede cambiarlas)

- Rechazo con 24 horas de freno antes de poder pedir de nuevo.
- Recordatorio el día 6 además del aviso inicial.
- El aviso de solicitud se consulta al abrir la app, sin escucha permanente, para cuidar las lecturas gratis.
- Las notificaciones de solicitud no se pueden silenciar.
- App Check solo para Firestore.

## Queda para quien lo construya

Nombres exactos de funciones y clases CSS, el texto fino de cada pantalla (tuteo colombiano), y cómo
simular el paso de 7 días en las pruebas de reglas.
