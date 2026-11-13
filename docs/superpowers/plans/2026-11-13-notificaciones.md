# Notificaciones (v17) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recordatorio del Diario y avisos de pareja (Diario, Trivia, Mapa) como notificaciones push, enviadas por GitHub Actions cada 15 min con FCM, configurables en Ajustes.

**Architecture:** La app deja notas en `parejas/{c}/avisos` y registra cada celular en `dispositivos/{id}`. Un script Node (`servidor/notificaciones/`) que corre en GitHub Actions vacía la bandeja, manda recordatorios por franja de 15 min y envía con `firebase-admin`. `sw.js` muestra los push.

**Tech Stack:** App: ES modules sin compilación, Firebase web 13.1.0 (gstatic) incluido `firebase-messaging`. Servidor: Node 20, `firebase-admin`, `node --test`. Reglas: emulador con `@firebase/rules-unit-testing` (`firebase/`).

**Spec:** `docs/superpowers/specs/2026-11-13-notificaciones-design.md`

## Global Constraints

- Ningún fallo de avisos/notificaciones puede impedir la acción principal (guardar Diario, crear sala, guardar lugar/versión): todo en `try/catch` silencioso con `console.warn`.
- Textos exactos (spec §6): diario `{nombre} respondió el Diario` / `Entra a ver qué respondieron.` / `#/diario`; trivia `{nombre} te invitó a la Trivia` / `Te está esperando para jugar.` / `#/trivia`; mapa `{nombre} agregó algo al mapa` / `Entra a verlo.` / `#/mapa`; recordatorio `¿Ya respondiste el Diario?` / `Te falta tu parte de hoy.` / `#/diario`. Sin nombre → `Tu pareja`.
- Fecha del Diario = Bogotá (`America/Bogota`), igual que `fechaBogota` de `js/modulos/diario/contenido.js`.
- Preferencias por defecto: todas encendidas, hora `"20:00"`.
- Vencimiento: avisos de más de 24 h se descartan; trivia de más de 30 min se descarta.
- Hasta 500 notas por pasada; recuperar franjas perdidas hasta 2 h atrás.
- `CACHE = 'okupa-v17'`; archivos nuevos de la app en `PRECACHE` y `pruebas/pwa.prueba.js`; pruebas nuevas en `pruebas.html`.
- Bash falla aquí: PowerShell para git/npm. Pruebas de reglas: en `firebase/`, `npm install` (una vez) y `npm test` (deja un java en el puerto 8085: cerrarlo al final).
- La clave VAPID y el secreto de GitHub los pone Carlos; hasta entonces `CLAVE_VAPID = null` y la sección dice "Notificaciones aún no configuradas".

## Review Focus

- Un celular que salió de la pareja (o cuyo lugar reclamó otro) → no recibe avisos: la app borra su registro y el servidor comprueba `lugares[lugar] == uid`.
- Permiso de notificaciones negado o navegador sin `PushManager` → el interruptor vuelve a apagado y se ve el mensaje correcto; nada se guarda en la nube.
- GitHub corre con 40 min de retraso → los recordatorios de las franjas saltadas igual salen (una sola vez por día).
- Nota en la bandeja de una pareja ya borrada → se borra sin enviar ni fallar la pasada.
- Token FCM inválido → se borra ese registro y la pasada sigue con los demás.

---

### Task 1: Reglas de `dispositivos` y `avisos`

**Files:**
- Modify: `firebase/firestore.rules`
- Test: `firebase/pruebas/avisos.test.js` (mismo arranque que `reglas.test.js`)

**Interfaces:**
- Produces (para Tasks 2, 4, 5): esquema exacto de `dispositivos/{id}` = `{ uid, pareja, lugar, token, avisos: {diario, trivia, mapa, recordatorio}, hora, zona, franja, actualizado }` (cliente; `ultimoRecordatorio` solo servidor) y de `parejas/{c}/avisos/{id}` = `{ tipo, de, creado }` con `creado == request.time`; patrones de id del spec (Precisiones).

- [ ] **Step 1: Pruebas** (sembrar `completa` = lugares a:u1, b:u2):
  - `dispositivos: u1 registra el suyo con su lugar` → succeeds; `dispositivos: con uid ajeno, lugar ajeno, pareja ajena o campo extra (ultimoRecordatorio) falla`; `dispositivos: hora/franja con formato malo falla` (`"8pm"`); `dispositivos: u2 no lee ni borra el de u1`; `dispositivos: nadie lista la colección`; `dispositivos: u1 actualiza franja y token del suyo`; `dispositivos: u1 actualiza (merge) el suyo que ya tiene ultimoRecordatorio` → succeeds; `dispositivos: u1 cambia o borra ultimoRecordatorio` → falla.
  - `avisos: u1 crea diario_2026-11-13_a con de a y creado=serverTimestamp` → succeeds; fallan: `de: 'b'`, id `diario_2026-11-13_b` siendo u1, `tipo: 'match'`, id `basura`, campo extra, `creado` fijo, extraño u3; `avisos: nadie lee, lista, cambia ni borra` (u1 y u2); `avisos: crear el mismo id dos veces falla la segunda` (es update).
- [ ] **Step 2:** `cd firebase; npm install; npm test` → las nuevas fallan.
- [ ] **Step 3:** Escribir las reglas (funciones `registroValido()`, `avisoValido(id)`; `match /dispositivos/{id}` en la raíz y `match /avisos/{id}` dentro de `parejas/{codigo}`).
- [ ] **Step 4:** `npm test` → todas pasan (las 43 de antes + nuevas). Cerrar el java del 8085.
- [ ] **Step 5: Commit** `feat(reglas): registro de celulares y bandeja de avisos`

### Task 2: Notas en la bandeja desde la app

**Files:**
- Create: `js/nucleo/avisos.js`
- Modify: `js/modulos/diario/pantallas.js` (tras `await enviar(..., 'gustos', ...)`), `js/modulos/trivia/sala.js` (`crearSala`, después de escribir la sala), `js/modulos/mapa/lugares.js` (`crearLugar` y `guardarVersion`, después de escribir)
- Test: `pruebas/avisos.prueba.js` (+ `pruebas.html`)

**Interfaces:**
- Consumes: esquema de Task 1.
- Produces: `idAviso(tipo, datos) → string|null` con `datos` = `{fecha, lugar}` (diario) | `{idPartida}` (trivia) | `{idLugar, lugar, clase: 'nuevo'|'version'}` (mapa); `avisar(nube, pareja, tipo, id) → Promise<boolean>` (nunca rechaza; escribe `parejas/{codigo}/avisos/{id}` con `{ tipo, de: pareja.lugar, creado: nube.horaServidor() }`).

- [ ] **Step 1: Pruebas** (nube falsa de `pruebas/nube-falsa.js`):
  - `avisos: ids con el formato de las reglas` → `idAviso('diario', {fecha:'2026-11-13', lugar:'a'}) === 'diario_2026-11-13_a'`, `idAviso('trivia', {idPartida:'p-abc1'}) === 'trivia_p-abc1'`, `idAviso('mapa', {idLugar:'l-x9', lugar:'b', clase:'version'}) === 'mapa_l-x9_b_version'`, tipo desconocido → `null`.
  - `avisos: avisar escribe la nota` → ruta y datos `{tipo:'diario', de:'a', creado:<horaServidor>}`.
  - `avisos: avisar nunca rechaza` → con nube cuyo `escribir` lanza, resuelve `false`.
  - `avisos: crear sala deja nota de trivia` / `crear lugar deja nota mapa nuevo` / `guardar versión deja nota mapa version` / `enviar gustos deja nota de diario una vez` (si `enviar` devuelve `false` porque ya existía, no avisa).
  - `avisos: si la nota falla, la sala igual se crea` (nube que falla solo en rutas `/avisos/`).
- [ ] **Step 2:** `pruebas.html` → fallan.
- [ ] **Step 3:** Implementar y conectar (sin `await` bloqueante en la UI: `avisar(...)` después del éxito; en `crearSala`/`crearLugar`/`guardarVersion` se llama dentro y se espera, pero su fallo no cambia el resultado).
- [ ] **Step 4:** `pruebas.html` → 0 fallaron.
- [ ] **Step 5: Commit** `feat: la app deja avisos en la bandeja al jugar, responder o guardar`

### Task 3: Lógica pura del servidor

**Files:**
- Create: `servidor/notificaciones/package.json` (`"type": "module"`, dep `firebase-admin` 13.x, `"test": "node --test"`), `servidor/notificaciones/logica.mjs`
- Test: `servidor/notificaciones/logica.test.mjs`

**Interfaces:**
- Produces:
  - `fechaBogota(fecha: Date) → 'AAAA-MM-DD'`
  - `franjaDe(fecha: Date) → 'HH:MM'` (UTC, minutos redondeados hacia abajo a 0/15/30/45)
  - `franjasPendientes(ultima: string|null /* ISO */, ahora: Date) → { franjas: string[], nuevaUltima: string /* ISO del inicio de la franja actual */ }` — franjas posteriores a `ultima` hasta la actual inclusive, máx. 8 (2 h); `ultima` nula → solo la actual.
  - `textoDe(tipo, nombre) → { titulo, texto, ruta }` (textos de Global Constraints)
  - `vencido(tipo, creadoMs, ahoraMs) → boolean` (24 h; trivia 30 min)
  - `destinatarios(dispositivos /* [{id, datos}] */, parejaDoc, aviso /* {tipo, de} */) → { enviar: [{id, token}], invalidos: [id] }` — excluye `lugar == de`, tipo apagado; marca inválido si `parejaDoc.lugares[datos.lugar] !== datos.uid`.
  - `quiereRecordatorio(dispositivo, hoy, yaRespondio) → boolean`
- [ ] **Step 1: Pruebas** con valores fijos: `franjaDe(new Date('2026-11-13T01:07:00Z')) === '01:00'`; `franjasPendientes('2026-11-13T00:30:00Z', new Date('2026-11-13T01:20:00Z')).franjas` = `['00:45','01:00','01:15']`; con 5 h de atraso devuelve 8; `fechaBogota(new Date('2026-11-14T03:00:00Z')) === '2026-11-13'`; `textoDe('trivia','Yuli').titulo === 'Yuli te invitó a la Trivia'`, `textoDe('diario', null).titulo === 'Tu pareja respondió el Diario'`; `vencido('trivia', t, t + 31*60e3) === true`, `vencido('diario', t, t + 23*3600e3) === false`; `destinatarios` con dispositivos de a (u1), b (u2, mapa apagado) y b viejo (uid u9) → para aviso mapa de a: `enviar` vacío, `invalidos` = [viejo]; para diario de a: enviar = [b]; `quiereRecordatorio` falso si `ultimoRecordatorio === hoy`, si `yaRespondio`, o si `avisos.recordatorio === false`.
- [ ] **Step 2:** `cd servidor/notificaciones; npm install; npm test` → fallan.
- [ ] **Step 3:** Implementar `logica.mjs`.
- [ ] **Step 4:** `npm test` → pasan.
- [ ] **Step 5: Commit** `feat(servidor): lógica de franjas, destinatarios y textos de notificaciones`

### Task 4: Pasada del servidor y GitHub Actions

**Files:**
- Create: `servidor/notificaciones/pasada.mjs`, `servidor/notificaciones/enviar.mjs` (punto de entrada), `.github/workflows/notificaciones.yml`
- Test: `servidor/notificaciones/pasada.test.mjs` (contra el emulador de Firestore; `firebase-admin` con `FIRESTORE_EMULATOR_HOST=127.0.0.1:8085`)

**Interfaces:**
- Consumes: Task 3; esquema de Task 1.
- Produces: `pasada({ db, mandar, ahora = new Date() }) → { enviados, descartados, invalidos }` donde `mandar(mensajes /* [{token, data:{titulo,texto,ruta,tipo}}] */) → [{ ok: boolean, codigo?: string }]` (en producción `messaging.sendEach`, prioridad alta, solo `data`). `enviar.mjs` lee el secreto `FIREBASE_CUENTA_SERVICIO` (JSON), inicia `firebase-admin` y llama `pasada`.
- Estado: `sistema/notificaciones` = `{ ultimaFranja: ISO }` (solo servidor; las reglas niegan todo a clientes por defecto).

- [ ] **Step 1: Pruebas** (sembrar con admin; `mandar` falso que registra y puede devolver `messaging/registration-token-not-registered`):
  - `pasada: manda la nota de diario a b y la borra`; `pasada: nota vencida o de pareja borrada se borra sin mandar`; `pasada: token inválido borra el dispositivo y sigue`; `pasada: recordatorio a la franja, solo si no respondió hoy, marca ultimoRecordatorio y no repite en la siguiente pasada`; `pasada: con ultimaFranja de hace 45 min manda el recordatorio de una franja saltada`; `pasada: no manda a dispositivo con uid que ya no es el del lugar`.
- [ ] **Step 2:** Correr con el emulador (`node ../../firebase/emuladores.mjs exec "node --test pasada.test.mjs"` desde `servidor/notificaciones`, o el mecanismo que use `emuladores.mjs`) → fallan.
- [ ] **Step 3:** Implementar `pasada.mjs` (collectionGroup `avisos` límite 500; lectura de la pareja una vez por código; dispositivos `where('pareja','==',c)`; recordatorios `where('franja','==',f)` y filtro en memoria de `avisos.recordatorio`) y `enviar.mjs`.
- [ ] **Step 4:** Pruebas pasan.
- [ ] **Step 5:** Workflow: `on: schedule: - cron: '*/15 * * * *'` + `workflow_dispatch`; `actions/checkout@v4`, `actions/setup-node@v4` (node 20, caché npm de `servidor/notificaciones/package-lock.json`), `npm ci`, `node enviar.mjs` con `env: FIREBASE_CUENTA_SERVICIO: ${{ secrets.FIREBASE_CUENTA_SERVICIO }}`; si el secreto falta, el script termina con mensaje claro y código 0 (no llena de correos de error antes de configurarlo); `concurrency: notificaciones` para no solaparse.
- [ ] **Step 6: Commit** `feat(servidor): pasada de notificaciones y GitHub Actions cada 15 min`

### Task 5: Registro del celular y push en `sw.js`

**Files:**
- Create: `js/nucleo/notificaciones.js`
- Modify: `js/nucleo/nube.js` (exponer la app de Firebase), `js/nucleo/nube-config.js` (`export const CLAVE_VAPID = null;`), `sw.js` (`push`, `notificationclick`), `js/nucleo/app.js` (refrescar al abrir), `js/nucleo/pareja.js` / `js/nucleo/pantallas-pareja.js` (olvidar registro al salir, perder lugar o borrar; registrar al enlazar si están activas)
- Test: `pruebas/notificaciones.prueba.js`

**Interfaces:**
- Consumes: esquema de Task 1; `miPareja` de `pareja.js`.
- Produces:
  - `PREF_DEFECTO = { activas: false, avisos: { diario: true, trivia: true, mapa: true, recordatorio: true }, hora: '20:00' }`; `leerPreferencias(almacen)`, `guardarPreferencias(almacen, cambios)` (clave `okupa:notificaciones`; datos dañados → defecto por campo).
  - `franjaUTC(hora, zona, ahora = new Date()) → 'HH:MM'` (`franjaUTC('20:00','America/Bogota') === '01:00'`; `'20:10'` → `'01:00'`).
  - `soporteNotificaciones(entorno = globalThis) → 'ok' | 'sin-soporte' | 'denegado'`.
  - `crearNotificaciones({ almacen, nube /* () => Promise<nube> */, obtenerToken /* async () => token */, borrarToken, pedirPermiso /* async () => 'granted'|'denied'|'default' */, zona /* () => IANA */ })` → `{ activar() → Promise<{ok, motivo?: 'sin-soporte'|'denegado'|'sin-pareja'|'sin-config'|'sin-conexion'}>, desactivar(), cambiar(cambios), refrescar(), olvidar() }`. `nube` falsa en pruebas. `idDispositivo` aleatorio guardado en `okupa:dispositivo`.
  - Instancia de la app: `notificaciones` con `obtenerToken` = `getToken(getMessaging(app), { vapidKey: CLAVE_VAPID, serviceWorkerRegistration: await navigator.serviceWorker.ready })` cargando `firebase-messaging.js` 13.1.0 de gstatic.
- [ ] **Step 1: Pruebas**
  - `notificaciones: preferencias por defecto y dañadas`; `notificaciones: franjaUTC` (casos de arriba y `'23:50'` Bogotá → `'04:45'`).
  - `notificaciones: activar sin pareja → sin-pareja y nada en la nube`; `permiso negado → denegado, activas sigue false`; `sin CLAVE_VAPID → sin-config`.
  - `notificaciones: activar escribe dispositivos/{id} con uid, pareja, lugar, token, avisos, hora, zona, franja` (comparar campos; `actualizado` = horaServidor).
  - Toda actualización del registro usa `escribir(..., { combinar: true })` (merge) para no tocar `ultimoRecordatorio`.
  - `notificaciones: cambiar la hora actualiza hora y franja`; `refrescar con token nuevo actualiza token`; `refrescar sin cambios no escribe`.
  - `notificaciones: olvidar borra el registro y lo guardado del celular`; `al salir de la pareja se olvida el registro` (llamada desde el flujo de `pantallas-pareja`/`vigilarLugar`).
  - `sw: maneja push y notificationclick` → leer `sw.js` como texto: contiene `addEventListener('push'` y `addEventListener('notificationclick'`; además probar la función pura `datosDeNotificacion(payload)` exportada desde `js/nucleo/notificaciones.js` y duplicada en `sw.js` (mismo cuerpo, comentario que lo diga): `{data:{titulo:'A',texto:'B',ruta:'#/diario',tipo:'diario'}}` → `{ titulo:'A', opciones:{ body:'B', tag:'diario', icon:'iconos/icono-192.png', badge:'iconos/favicon-48.png', data:{ ruta:'#/diario' } } }`; payload roto → `null`.
- [ ] **Step 2:** `pruebas.html` → fallan.
- [ ] **Step 3:** Implementar. `sw.js`: `push` → `datosDeNotificacion(e.data?.json())` → `showNotification`; `notificationclick` → cerrar, buscar cliente de Okupa (`clients.matchAll({type:'window', includeUncontrolled:true})`), `navigate` a `./${ruta}` y `focus`, o `clients.openWindow('./' + ruta)`.
- [ ] **Step 4:** `pruebas.html` → 0 fallaron.
- [ ] **Step 5: Commit** `feat: registro del celular para notificaciones y push en el service worker`

### Task 6: Ajustes → Notificaciones

**Files:**
- Modify: `js/nucleo/pantalla-ajustes.js`, `css/componentes.css`
- Test: `pruebas/pantalla-ajustes.prueba.js`

**Interfaces:**
- Consumes: `notificaciones` (Task 5) inyectable como `ctx.notificaciones`; `leerPreferencias`.
- Copy exacto: grupo `Notificaciones`; filas `Notificaciones`, `Tu pareja respondió el Diario`, `Invitación a la Trivia`, `Novedades del mapa`, `Recordatorio del Diario`, `Hora del recordatorio`; mensajes `Enlaza tu pareja para recibir avisos` (enlace `#/pareja`), `Este navegador no puede recibir notificaciones`, `Las notificaciones están bloqueadas. En Chrome: toca el candado junto a la dirección → Notificaciones → Permitir.`, `No se pudo activar. Revisa la conexión.`, `Notificaciones aún no configuradas.`
- El grupo va entre "Sonidos y vibración" y "Datos".

- [ ] **Step 1: Pruebas**
  - `ajustes: notificaciones apagadas muestran solo el interruptor general`.
  - `ajustes: activar con éxito muestra los 4 tipos y la hora 20:00` (notificaciones falsa que resuelve `{ok:true}`).
  - `ajustes: activar con motivo denegado deja el interruptor apagado y muestra el mensaje de bloqueo` (uno por motivo: `sin-pareja`, `sin-soporte`, `sin-conexion`, `sin-config`).
  - `ajustes: apagar un tipo llama cambiar({avisos:{...}})`; `cambiar la hora llama cambiar({hora:'21:30'})`.
- [ ] **Step 2:** fallan. **Step 3:** implementar (reusar `interruptor` y estilos de la v16; `input type="time"` con `step=900`). **Step 4:** 0 fallaron.
- [ ] **Step 5: Commit** `feat: sección Notificaciones en Ajustes`

### Task 7: Caché v17, guía para Carlos, revisión y publicación

**Files:**
- Modify: `sw.js` (`okupa-v17`, `PRECACHE` + `js/nucleo/avisos.js`, `js/nucleo/notificaciones.js`), `pruebas/pwa.prueba.js`, `LEEME.md` (sección "Notificaciones": los 4 pasos del spec §8 con detalle de clics), `ESTADO.md`

- [ ] **Step 1:** Caché y `PRECACHE`; `pruebas.html` → 0 fallaron; `npm test` en `firebase/` y en `servidor/notificaciones` → pasan.
- [ ] **Step 2:** Verificación visual de Ajustes → Notificaciones en el navegador del panel a 375 px (ambos temas), con `CLAVE_VAPID = null` (mensaje "aún no configuradas").
- [ ] **Step 3:** Revisión final de la rama (revisor nuevo, modelo más capaz).
- [ ] **Step 4:** Guiar a Carlos en los 4 pasos; poner `CLAVE_VAPID`; que pegue las reglas; publicar (merge a `main` + push) con su visto bueno; disparar el workflow a mano (`workflow_dispatch`) y comprobar en la pestaña Actions que corre sin error.
- [ ] **Step 5:** `ESTADO.md` (v17) y commit.
