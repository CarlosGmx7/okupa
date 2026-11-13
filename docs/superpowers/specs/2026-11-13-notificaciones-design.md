# Notificaciones (v17) — diseño

Fecha: 2026-11-13. Entrega: v17 (caché `okupa-v17`). Parte de la v16 (Ajustes ya existe).

## Intención

Que Okupa avise sin tener la app abierta: un recordatorio diario para responder el Diario y avisos cuando la
pareja hizo algo que te involucra. Carlos quiere además que Okupa pueda crecer: muchas parejas usándola y,
más adelante, grupos de más de dos personas. Esta versión no crea grupos, pero las notificaciones quedan
listas para ellos.

## Metas

1. Recordatorio del Diario a la hora que cada quien elige, **solo si todavía no respondió** el de ese día.
2. Avisos de lo que hizo la pareja: **respondió el Diario**, **te invitó a la Trivia**, **algo nuevo en el mapa** (lugar o recuerdo nuevo, o escribió su versión).
3. En Ajustes, sección **Notificaciones**: interruptor general, uno por tipo de aviso y la hora del recordatorio.
4. Gratis y sin tarjeta: GitHub Actions cada 15 min + Firebase Cloud Messaging (FCM).
5. Que el que manda (GitHub) se pueda cambiar después por Firebase Functions sin tocar la app.

## No metas

- Avisos de Match (Carlos no los quiere).
- Grupos de 3+ personas en la app (proyecto aparte; aquí solo se deja todo dirigido a "los demás del grupo").
- Avisos instantáneos: el retraso normal es de 5 a 30 min (GitHub demora sus tareas programadas cuando está ocupado).
- iPhone: funciona solo con Okupa instalada en la pantalla de inicio (iOS 16.4+). Ellos usan Android; no se prueba en iPhone.

## Anti-metas

- Que una falla de avisos (sin internet, sin permiso, Firebase caído) impida guardar el Diario, abrir la Trivia o guardar un lugar.
- Mostrar en la pantalla bloqueada qué respondió alguien o el contenido de un recuerdo.
- Que un celular pueda leer la bandeja de avisos o los datos de los celulares de otros.
- Recordar a alguien el Diario que ya respondió, o avisar dos veces lo mismo.
- Que el costo (lecturas de Firebase, minutos de GitHub) crezca con el número total de parejas en vez de con lo que de verdad hay que avisar.

## Restricciones

- App: HTML/CSS/JS con módulos ES, sin compilación; Firebase web 13.1.0 desde gstatic (como hoy en `js/nucleo/nube.js`).
- Español colombiano con tuteo. Avisos "qué pasó, sin detalles".
- Archivos nuevos a `PRECACHE` (`sw.js`) y a `pruebas/pwa.prueba.js`; pruebas nuevas en `pruebas.html`; `CACHE = 'okupa-v17'`.
- Reglas nuevas con pruebas en el emulador (`firebase/pruebas`); Carlos debe pegarlas en Firebase antes de publicar la app.
- La llave de GitHub con permisos mínimos (no la de administrador).

## Enfoques considerados

- **Bandeja de avisos (elegido):** el celular que hace algo deja una nota en `parejas/{codigo}/avisos`; GitHub lee solo esas notas, las manda y las borra. Lo que se lee crece con los avisos, no con las parejas. Cambiar GitHub por Functions es cambiar quién vacía la bandeja.
- **GitHub vigila todos los datos:** sin tocar la app, pero lee todo de todas las parejas en cada pasada; se sale del límite gratis al crecer. Descartado.
- **Grupos primero:** rehacer pareja/Diario/Match/reglas para N personas antes; demora mucho las notificaciones. Descartado por ahora (Carlos eligió avisos listos para grupos y grupos después).
- **Periodic Background Sync (sin servidor):** sin hora fija, solo Android instalada. Descartado en la v16.

## Diseño

### 1. Piezas

```
Celular (app)                         Firebase                         GitHub Actions (cada 15 min)
─────────────                         ────────                         ────────────────────────────
Ajustes → activar ─token FCM──▶ dispositivos/{id}  ◀──── lee por franja ── recordatorios
Diario/Trivia/Mapa ─nota──────▶ parejas/{c}/avisos/{id} ◀── lee y borra ── avisos de pareja
sw.js ◀──────────────── push FCM ◀──────────────────────────────────────── envía (firebase-admin)
```

### 2. Datos en Firestore

**`dispositivos/{idDispositivo}`** (colección raíz; un documento por instalación de Okupa; `idDispositivo` es aleatorio y se guarda en el celular en `okupa:dispositivo`):

| Campo | Qué es |
|---|---|
| `uid` | uid anónimo de Firebase de quien lo registró |
| `pareja`, `lugar` | código de la pareja y lugar de esta persona (hoy `a`/`b`; mañana el id de miembro del grupo) |
| `token` | token FCM de este celular |
| `avisos` | `{ diario, trivia, mapa, recordatorio }` booleanos |
| `hora` | hora local del recordatorio `"HH:MM"` (por defecto `"20:00"`) |
| `zona` | zona horaria IANA del celular (p. ej. `America/Bogota`) |
| `franja` | hora del recordatorio en UTC redondeada a 15 min, `"HH:MM"` (la calcula la app al guardar) |
| `ultimoRecordatorio` | fecha (`AAAA-MM-DD`, Bogotá) del último recordatorio enviado — la escribe solo GitHub |
| `actualizado` | hora del servidor |

Varios celulares de una misma persona son varios documentos (todos reciben).

**`parejas/{codigo}/avisos/{idAviso}`** — la bandeja:

| Campo | Qué es |
|---|---|
| `tipo` | `diario` \| `trivia` \| `mapa` |
| `de` | lugar de quien lo hizo |
| `creado` | hora del servidor |

`idAviso` es fijo por evento para no repetir: `diario_{fecha}_{lugar}`, `trivia_{idPartida}`, `mapa_{idLugar}_{lugar}_{nuevo|version}`.
Destinatarios = todos los lugares de la pareja menos `de` (así funciona igual con grupos).

### 3. Reglas

- `dispositivos/{id}`: crear/actualizar solo si `uid == request.auth.uid`, la persona es miembro de `pareja` y `lugar` es su propio lugar; campos y tipos limitados a los de la tabla (sin `ultimoRecordatorio`, que es de GitHub); leer y borrar solo el propio; nadie lista.
- `parejas/{c}/avisos/{id}`: solo **crear**, siendo miembro, con `de == miLugar`, `tipo` válido, campos `tipo/de/creado`. Nadie lee, cambia ni borra desde la app (solo GitHub, que no pasa por reglas).
- Pruebas de reglas en `firebase/pruebas` para todo lo anterior, incluidos los intentos prohibidos.
- `borrarTodo` de la pareja también borra sus avisos pendientes si los hubiera (no puede listarlos: se ignora; GitHub descarta los de parejas que ya no existen).

### 4. App

- **`js/nucleo/notificaciones.js`**: ver si el navegador puede (`Notification`, `serviceWorker`, `PushManager`); `activar()` pide permiso **dentro del toque** del interruptor, carga `firebase-messaging` 13.1.0 desde gstatic, obtiene el token con la clave pública VAPID y el registro de `sw.js`, y guarda `dispositivos/{id}`; `desactivar()` borra el token y el documento; al abrir la app, si están activas, renueva el token si cambió. `nube.js` expone lo mínimo para obtener la app de Firebase (sin romper su interfaz actual).
- **`js/nucleo/avisos.js`**: `avisar(nube, pareja, tipo, idEvento)` crea la nota en la bandeja. Siempre silencioso: nunca lanza, nunca bloquea; si falla, solo `console.warn`.
- Se llama después de que lo principal salió bien:
  - Diario: al enviar la parte `gustos` del día (`js/modulos/diario`), una vez por día y persona.
  - Trivia: al crear la sala (`crearSala` en `js/modulos/trivia/sala.js`).
  - Mapa: al crear un lugar (`crearLugar`) y al guardar una versión (`guardarVersion`).
- **`sw.js`**: evento `push` → muestra la notificación con título, texto, ícono de Okupa, `tag` por tipo (se reemplazan, no se amontonan) y la ruta a abrir; `notificationclick` → enfoca Okupa si está abierta o la abre en esa ruta.
- **`nube-config.js`**: agrega `CLAVE_VAPID` (pública, la da Carlos desde Firebase).

### 5. Ajustes → Notificaciones

```
NOTIFICACIONES
┌────────────────────────────────────────┐
│ Notificaciones                   [●══] │ ← activa permiso y registra el celular
├────────────────────────────────────────┤
│ Tu pareja respondió el Diario    [●══] │
│ Invitación a la Trivia           [●══] │
│ Novedades del mapa               [●══] │
│ Recordatorio del Diario          [●══] │
│ Hora del recordatorio          20:00 › │ ← input type=time
└────────────────────────────────────────┘
```

- Los interruptores por tipo solo se ven con el general encendido; por defecto todos encendidos y 20:00.
- Mensajes de estado (en la misma sección): sin pareja enlazada → "Enlaza tu pareja para recibir avisos" con enlace a `#/pareja`; navegador sin soporte → "Este navegador no puede recibir notificaciones"; permiso negado → cómo habilitarlo en Chrome (Configuración del sitio → Notificaciones); sin internet → "No se pudo activar. Revisa la conexión" y el interruptor vuelve a apagado.
- Lo elegido se guarda en el celular (para pintar Ajustes sin internet) y en `dispositivos/{id}`.

### 6. Textos ("qué pasó, sin detalles")

| Tipo | Título | Texto | Abre |
|---|---|---|---|
| diario | `{nombre} respondió el Diario` | `Entra a ver qué respondieron.` | `#/diario` |
| trivia | `{nombre} te invitó a la Trivia` | `Te está esperando para jugar.` | `#/trivia` |
| mapa | `{nombre} agregó algo al mapa` | `Entra a verlo.` | `#/mapa` |
| recordatorio | `¿Ya respondiste el Diario?` | `Te falta tu parte de hoy.` | `#/diario` |

`{nombre}` sale de `parejas/{c}.nombres[de]`; si no hay, "Tu pareja".

### 7. GitHub Actions (`servidor/notificaciones/`)

- Node 20 + `firebase-admin`; `.github/workflows/notificaciones.yml` con `cron: '*/15 * * * *'` y `workflow_dispatch` (para probar a mano). Secreto `FIREBASE_CUENTA_SERVICIO` con el JSON de la cuenta de servicio.
- **Avisos:** lee `collectionGroup('avisos')` (máx. 500 por pasada). Por cada nota: si la pareja no existe o la nota tiene más de 24 h (trivia: más de 30 min), la borra sin enviar; si no, busca `dispositivos` con esa `pareja`, quita los de `lugar == de` y los que tienen ese tipo apagado, envía y borra la nota.
- **Recordatorios:** calcula las franjas de 15 min desde la última pasada (guardada en `sistema/notificaciones.ultimaFranja`, máx. 2 h hacia atrás para no perder ninguna cuando GitHub se retrasa); por cada franja busca `dispositivos` con `franja` igual y `avisos.recordatorio == true`; salta los que ya tienen `ultimoRecordatorio` de hoy o ya respondieron hoy (`parejas/{c}/dias/{fechaBogota}/respuestas/gustos_{lugar}` existe); envía y marca `ultimoRecordatorio`.
- Tokens inválidos (`registration-token-not-registered`, `invalid-argument`) → borra ese `dispositivos/{id}`.
- Mensajes FCM solo de datos (`data: { titulo, texto, ruta, tipo }`), con prioridad alta, para que `sw.js` decida cómo mostrarlos.
- Lógica pura separada (franjas, destinatarios, textos, vencimiento) con pruebas `node --test`.

### 8. Lo que hace Carlos (guía paso a paso al final)

1. Firebase → Configuración del proyecto → Cloud Messaging → Certificados web push → **Generar par de claves**, y pasarme la clave pública (no es secreta).
2. Google Cloud → IAM → Cuentas de servicio → crear `okupa-avisos` con solo los roles **Cloud Datastore User** y **Firebase Cloud Messaging API Admin** → crear llave JSON.
3. GitHub → repo `okupa` → Settings → Secrets and variables → Actions → nuevo secreto `FIREBASE_CUENTA_SERVICIO` con el JSON (y borrar el archivo del computador).
4. Firebase → Firestore → Reglas → pegar las nuevas → Publicar.

## Precisiones (revisión del constructor)

- **Fecha del Diario:** el Diario usa siempre la fecha de Bogotá (`fechaBogota` en `js/modulos/diario/contenido.js`), sin importar la zona del celular. GitHub usa esa misma fecha para "ya respondió hoy" y para `ultimoRecordatorio`. Solo la hora del recordatorio es local (`hora` + `zona`).
- **Ciclo de vida del celular registrado (mi decisión):** al salir de la pareja, perder el lugar (`reclamado`/`borrada`) o borrar los datos de la pareja, la app borra su `dispositivos/{id}`. Al enlazarse o unirse de nuevo con las notificaciones encendidas, se vuelve a registrar. Además, GitHub solo envía a un celular si `parejas/{pareja}.lugares[lugar] == dispositivo.uid`, y borra el registro cuando no coincide. Así un celular viejo nunca recibe avisos de una pareja que ya no es suya.
- **Franja al día (mi decisión):** cada vez que se abre la app con las notificaciones encendidas, se recalcula `franja` y se actualiza el registro si cambió (cambio de zona u horario de verano). Las reglas lo permiten porque el dueño puede actualizar su registro.
- **Bandeja con formato fijo (mi decisión):** las reglas exigen `creado == request.time` y que `idAviso` siga el patrón de su tipo (`^diario_\d{4}-\d{2}-\d{2}_[a-z0-9]+$`, `^trivia_[A-Za-z0-9-]+$`, `^mapa_[A-Za-z0-9-]+_[a-z0-9]+_(nuevo|version)$`) y que el lugar del id sea el de quien escribe. Así nadie puede llenar la bandeja con basura de otro tipo.
- **Mapa sin repetir (mi decisión):** un mismo lugar avisa una vez al crearse y una vez por cada persona que escribe su versión. Si alguien corrige su versión después, no se avisa de nuevo (se acepta).
- **Nombres:** si `nombres[de]` falta, el texto dice "Tu pareja".

## Queda a criterio del constructor

- Nombres internos de funciones y la forma exacta de exponer la app de Firebase desde `nube.js`.
- Ícono pequeño (badge) de la notificación: puede salir de los íconos actuales.
- Cómo se ve el selector de hora dentro del estilo de Ajustes de la v16.
