# Okupa · Etapa 1: Nube y pareja · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que los dos celulares se enlacen como pareja con un código de 6 caracteres sobre Firebase, con reglas de seguridad probadas, dejando la base que usarán Trivia y Diario.

**Architecture:** `js/nucleo/nube.js` es la única puerta a Firebase (Auth anónima + Firestore, SDK cargado por `import()` desde gstatic solo cuando se necesita). `pruebas/nube-falsa.js` implementa la misma interfaz en memoria para las pruebas del navegador. `js/nucleo/pareja.js` tiene la lógica de enlazar sobre esa interfaz, y `js/nucleo/pantallas-pareja.js` la pantalla `#/pareja`. Las reglas viven en `firebase/` y se prueban con el emulador desde Node.

**Tech Stack:** HTML/CSS/JS con módulos ES sin compilación; Firebase JS SDK modular (CDN gstatic); Firebase Emulator Suite + `@firebase/rules-unit-testing` + `node:test` (solo para probar reglas); corredor propio `pruebas.html`.

**Spec:** `docs/superpowers/specs/2026-11-04-okupa-trivia-diario-design.md` (secciones 4.1, 6.1, 6.2, 6.3, 6.6, 6.7, 8, 9 y etapa 1 de la 10).

## Global Constraints

- Sin paso de compilación: la app se sirve tal cual (`python herramientas/servidor.py`, http://127.0.0.1:8080).
- Todo texto de datos o del usuario se pinta con `el()` de `js/nucleo/ui.js` (textContent), nunca `innerHTML`.
- Todo acceso a `localStorage` pasa por `js/nucleo/almacen.js`; claves con prefijo `okupa:<modulo>:`. Esta etapa usa `okupa:pareja:actual`.
- Español colombiano con tuteo en todo texto visible.
- Código de pareja: 6 caracteres del alfabeto de 31 sin ambiguos `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (sin I, L, O, 0, 1); se muestra como `K7P-Q2M`; regex `^[A-HJKMNP-Z2-9]{6}$`.
- Nombres: recortados, 1 a 30 caracteres.
- Lugares de la pareja: `a` (quien crea) y `b` (quien se une). Máximo 2.
- Firestore: documento `parejas/{codigo}` = `{ lugares: { a: uid|null, b: uid|null }, nombres: { a: string|null, b: string|null }, creada }`.
- El SDK de Firebase se fija a una sola versión en la constante `VERSION_FIREBASE` de `nube.js`.
- Al cambiar archivos que precachea `sw.js`, subir `CACHE` (esta etapa: `okupa-v3`).
- Commits pequeños, mensaje en español en una línea, terminando con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. En este equipo PowerShell maltrata comillas en `-m`: escribir el mensaje en un archivo y usar `git commit -F`.
- La suite del navegador debe terminar en "0 fallaron".

## Review Focus

1. Código escrito con minúsculas, espacios, guion o con `O`/`0`, `I`/`1` confundidos → se normaliza o se rechaza con "Ese código no existe", nunca un error técnico. (Prueba en Task 2.)
2. Los dos tocan "Unirme" al mismo tiempo con el mismo código cuando solo queda un lugar → uno entra y el otro recibe `llena`, nunca ambos en `b`. (Prueba en Task 2 con transacciones concurrentes de la nube falsa.)
3. El lugar se reclama desde otro celular mientras este tiene abierta la pantalla → este celular muestra "Tu lugar se abrió en otro celular" y olvida la pareja local. (Pruebas en Task 2 y Task 5.)
4. Sin internet, o Firebase sin configurar, al abrir `#/pareja` → mensaje amable con reintentar; el resto de Okupa sigue funcionando. (Prueba en Task 5.)
5. Un usuario intenta ocupar los dos lugares, o un extraño cambia el nombre del otro sin reclamar → las reglas lo rechazan. (Pruebas en Task 3.)

---

### Task 1: Interfaz de la nube y nube falsa en memoria

**Files:**
- Create: `pruebas/nube-falsa.js`
- Create: `pruebas/nube-falsa.prueba.js`
- Modify: `pruebas.html` (agregar `./pruebas/nube-falsa.prueba.js` a `archivos`)

**Interfaces:**
- Produces (contrato que también cumple `nube.js` en Task 4). Rutas como texto con segmentos alternos colección/documento, p. ej. `'parejas/K7PQ2M/perfiles/a'`:
  - `iniciar(): Promise<{ uid: string }>`
  - `leer(ruta): Promise<object|null>`
  - `escuchar(ruta, fn: (datos: object|null) => void): () => void` (devuelve cancelar; llama `fn` una vez con el valor actual y luego en cada cambio)
  - `escribir(ruta, datos, { combinar = false } = {}): Promise<void>` (combinar = merge superficial por campo de primer nivel, y por subcampo en mapas)
  - `borrar(ruta): Promise<void>`
  - `listar(rutaColeccion): Promise<Array<{ id, datos }>>`
  - `transaccion(fn: (tx) => Promise<T>): Promise<T>` con `tx.leer(ruta)` y `tx.escribir(ruta, datos, { combinar })`
  - `horaServidor(): unknown` (valor centinela; en la falsa devuelve `Date.now()`)
  - Errores: `class ErrorNube extends Error { codigo }` con `codigo` ∈ `'sin-config' | 'sin-conexion' | 'permiso' | 'desconocido'`. Se exporta desde `js/nucleo/nube.js` (Task 4); en esta task se crea ya `js/nucleo/nube.js` **solo** con `export class ErrorNube` para que la falsa la importe.
- `pruebas/nube-falsa.js` exporta `crearMundoFalso()` → `{ nube(uid: string): Nube, desconectar(), reconectar(), datos: Map }`. Dos `nube(uid)` del mismo mundo comparten datos (dos celulares). Mientras está desconectado, todos los métodos rechazan con `ErrorNube('sin-conexion')`.

- [ ] **Step 1: Escribir pruebas que fallan** en `pruebas/nube-falsa.prueba.js`:
  - `nube falsa: escribir y leer; leer lo que no existe da null`
  - `nube falsa: combinar mezcla campos y subcampos de mapas` — escribir `{ lugares: { a: 'u1', b: null }, nombres: { a: 'C' } }`, luego combinar `{ lugares: { b: 'u2' } }` → `lugares` = `{ a: 'u1', b: 'u2' }` y `nombres` intacto.
  - `nube falsa: dos celulares ven los mismos datos y escuchar avisa cambios` — `m.nube('u1')` escribe, `m.nube('u2')` escuchando recibe primero `null` y luego el valor; tras cancelar no recibe más.
  - `nube falsa: listar devuelve los documentos directos de una colección` (no los de subcolecciones).
  - `nube falsa: transacciones concurrentes no pisan lo leído` — dos `transaccion` lanzadas sin `await` que leen un contador y escriben `+1` → valor final 2.
  - `nube falsa: desconectada rechaza con sin-conexion` (comprobar `e instanceof ErrorNube && e.codigo === 'sin-conexion'`).
  - `nube falsa: devuelve copias, no referencias` — mutar lo leído no cambia lo guardado.

- [ ] **Step 2: Correr la suite y ver que fallan**
  Abrir http://127.0.0.1:8080/pruebas.html. Esperado: falla la carga de `nube-falsa.prueba.js` (módulo inexistente).

- [ ] **Step 3: Implementar `js/nucleo/nube.js` (solo `ErrorNube`) y `pruebas/nube-falsa.js`**
  Concurrencia de `transaccion` (lo que las pruebas no fijan del todo): cada documento guarda un número de versión; `tx.leer` hace `await` (cede el turno) y anota la versión leída; al terminar `fn`, si alguna versión leída cambió, se descartan las escrituras y se repite `fn` (máximo 5 intentos, luego `ErrorNube('desconocido')`); si no, se aplican todas juntas. `escuchar` notifica en una microtarea después de cada escritura.

- [ ] **Step 4: Correr la suite**: esperado "0 fallaron".

- [ ] **Step 5: Commit** — `Nube falsa en memoria con la interfaz de la nube`.

---

### Task 2: Lógica de pareja

**Files:**
- Create: `js/nucleo/pareja.js`
- Create: `pruebas/pareja.prueba.js`
- Modify: `pruebas.html` (agregar `./pruebas/pareja.prueba.js`)

**Interfaces:**
- Consumes: interfaz `Nube` y `ErrorNube` (Task 1); `crearAlmacen` de `js/nucleo/almacen.js`.
- Produces (las usan Task 5 y las etapas 2–4):
  - `ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'`
  - `generarCodigo(rnd = Math.random): string` — 6 caracteres de `ALFABETO`.
  - `formatearCodigo(codigo): string` — `'K7PQ2M'` → `'K7P-Q2M'`.
  - `normalizarCodigo(texto): string|null` — mayúsculas, quita espacios y guiones; devuelve `null` si tras limpiar no cumple la regex de Global Constraints (no adivina ambiguos: `O`, `I`, `L`, `0`, `1` simplemente no son válidos).
  - `limpiarNombre(texto): string|null` — recortado, 1–30 caracteres, o `null`.
  - `miPareja(almacen): { codigo, lugar } | null` — lee `okupa:pareja:actual`.
  - `async crearPareja(nube, almacen, { nombre, rnd }) → { codigo, lugar: 'a' }` — en transacción: genera código, si ya existe prueba otro (máx. 5), crea el documento con `lugares: { a: uid, b: null }`, `nombres: { a: nombre, b: null }`, `creada: nube.horaServidor()`; guarda en el almacén.
  - `async unirse(nube, almacen, { codigo, nombre }) → { codigo, lugar: 'b' }` — en transacción; lanza `ErrorPareja('no-existe')` si el código es inválido o no existe, `ErrorPareja('llena')` si `b` ya está ocupado por otro uid. Si el uid ya ocupa un lugar, devuelve ese lugar sin cambiar nada.
  - `async lugaresDe(nube, codigo) → { nombres: { a, b }, ocupados: { a: boolean, b: boolean } }` — para "¿Quién eres?".
  - `async reclamar(nube, almacen, { codigo, lugar }) → { codigo, lugar }` — pone el propio uid en ese lugar (combinar), guarda en el almacén.
  - `vigilarLugar(nube, almacen, alPerder: (motivo: 'reclamado'|'borrada') => void): () => void` — escucha `parejas/{codigo}`; si `lugares[lugar]` deja de ser el propio uid (`'reclamado'`) o el documento desaparece (`'borrada'`), borra `okupa:pareja:actual` y llama `alPerder` una sola vez.
  - `async cambiarNombre(nube, almacen, nombre)` — combina `nombres.{lugar}`; lanza `ErrorPareja('nombre')` si `limpiarNombre` da `null`.
  - `salir(almacen)` — borra `okupa:pareja:actual`.
  - `async borrarTodo(nube, almacen)` — lista y borra los documentos de `perfiles`, `partidas`, `estado` y `dias` (y de cada `dias/{f}/respuestas`), luego `parejas/{codigo}`, luego `salir`.
  - `class ErrorPareja extends Error { codigo }` con `'no-existe' | 'llena' | 'nombre' | 'sin-pareja'`.

- [ ] **Step 1: Escribir pruebas que fallan** en `pruebas/pareja.prueba.js` (usar `crearMundoFalso` y un almacén en memoria como en `pruebas/editor.prueba.js`; helper local `async function rechaza(promesa, codigo)`):
  - `pareja: generarCodigo usa solo el alfabeto y mide 6` (1.000 códigos, todos cumplen la regex).
  - `pareja: normalizarCodigo acepta minúsculas, espacios y guion; rechaza ambiguos` — `' k7p-q2m '` → `'K7PQ2M'`; `'K7PQ2'`, `'K7PQ2MM'`, `'O7PQ2M'`, `'I7PQ2M'`, `'17PQ2M'` → `null`.
  - `pareja: formatearCodigo` — `'K7PQ2M'` → `'K7P-Q2M'`.
  - `pareja: crear y unirse enlaza a los dos con sus nombres` — u1 crea con `'  Carlos '`, u2 se une con `'Sofi'`; `leer('parejas/'+codigo)` da `lugares {a:'u1', b:'u2'}` y `nombres {a:'Carlos', b:'Sofi'}`; `miPareja` de cada almacén da su lugar.
  - `pareja: crear reintenta si el código ya existe` — `rnd` que produce primero un código ya ocupado y luego otro → éxito con el segundo.
  - `pareja: unirse con código inexistente o mal escrito da no-existe`.
  - `pareja: tercer celular recibe llena y puede reclamar` — u3 `unirse` → `llena`; `lugaresDe` muestra nombres y ambos ocupados; `reclamar` lugar `a` → documento con `a:'u3'`.
  - `pareja: dos uniéndose a la vez, solo uno entra` — u2 y u3 `unirse` concurrentes (Promise.allSettled) → exactamente un `fulfilled` y un `llena`.
  - `pareja: el celular reclamado se entera y olvida la pareja` — u1 `vigilarLugar`; u3 reclama `a`; esperar una microtarea → `alPerder` llamado una vez con `'reclamado'` y `miPareja(almacenU1)` es `null`.
  - `pareja: si el otro borra todo, el celular se entera` — u2 `vigilarLugar`; u1 `borrarTodo` → `alPerder('borrada')` y `miPareja(almacenU2)` es `null`.
  - `pareja: unirse otra vez con el mismo celular no cambia nada` (u2 ya en `b` → devuelve `b`).
  - `pareja: cambiarNombre valida y guarda; nombre vacío o de 31 da error nombre`.
  - `pareja: borrarTodo deja la nube sin nada de la pareja` — sembrar docs en `perfiles/a`, `partidas/p1`, `estado/uso`, `dias/2026-11-04`, `dias/2026-11-04/respuestas/gustos_a`; después todos `null` y `miPareja` `null`.
  - `pareja: sin conexión se propaga sin-conexion` — `desconectar()` y `crearPareja` rechaza con `ErrorNube` `sin-conexion`.

- [ ] **Step 2: Correr la suite y ver que fallan** (falla la carga del módulo).

- [ ] **Step 3: Implementar `js/nucleo/pareja.js`** con las firmas de arriba. `unirse` y `reclamar` usan `nube.iniciar()` para obtener el uid.

- [ ] **Step 4: Correr la suite**: "0 fallaron".

- [ ] **Step 5: Commit** — `Lógica para crear, unir y reclamar la pareja`.

---

### Task 3: Reglas de Firestore probadas con el emulador

**Files:**
- Create: `firebase/firebase.json` — emuladores `auth` en el puerto 9099 y `firestore` en el **8085** (el 8080 lo usa el servidor de la app); `firestore.rules` apunta a `firestore.rules`.
- Create: `firebase/firestore.rules`
- Create: `firebase/package.json` — `"private": true`, `"type": "module"`, devDependencies `firebase-tools`, `@firebase/rules-unit-testing`, `firebase` (versiones fijas, las actuales de `npm view`), script `"test": "firebase emulators:exec --only firestore --project demo-okupa \"node --test pruebas/\""`.
- Create: `firebase/pruebas/reglas.test.js`
- Modify: `.gitignore` — agregar `firebase/node_modules/`, `firebase/*.log`.

**Interfaces:**
- Consumes: forma del documento de pareja (Global Constraints).
- Produces: `firebase/firestore.rules`, que la etapa 3 ampliará con `dias/{fecha}/respuestas/{doc}`. En esta etapa **no** existe regla para `respuestas` (queda denegado).

Reglas (exactas, por ser lo crítico de seguridad):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function autenticado() { return request.auth != null; }
    function nombreValido(n) { return n is string && n.size() >= 1 && n.size() <= 30; }
    function datosPareja(codigo) { return get(/databases/$(db)/documents/parejas/$(codigo)).data; }
    function esMiembro(codigo) {
      let l = datosPareja(codigo).lugares;
      return autenticado() && (l.a == request.auth.uid || l.b == request.auth.uid);
    }
    function soloCambia(antes, despues, claves) { return despues.diff(antes).affectedKeys().hasOnly(claves); }
    function tomaLugar(x) {
      let antes = resource.data;
      let despues = request.resource.data;
      return soloCambia(antes, despues, ['lugares', 'nombres'])
        && soloCambia(antes.lugares, despues.lugares, [x])
        && soloCambia(antes.nombres, despues.nombres, [x])
        && despues.lugares[x] == request.auth.uid
        && despues.lugares.a != despues.lugares.b
        && nombreValido(despues.nombres[x]);
    }
    function cambiaSuNombre(x) {
      return resource.data.lugares[x] == request.auth.uid
        && soloCambia(resource.data, request.resource.data, ['nombres'])
        && soloCambia(resource.data.nombres, request.resource.data.nombres, [x])
        && nombreValido(request.resource.data.nombres[x]);
    }

    match /parejas/{codigo} {
      allow get: if autenticado();
      allow list: if false;
      allow create: if autenticado()
        && codigo.matches('^[A-HJKMNP-Z2-9]{6}$')
        && request.resource.data.keys().hasOnly(['lugares', 'nombres', 'creada'])
        && request.resource.data.lugares == { 'a': request.auth.uid, 'b': null }
        && request.resource.data.nombres.keys().hasOnly(['a', 'b'])
        && nombreValido(request.resource.data.nombres.a)
        && request.resource.data.nombres.b == null;
      allow update: if autenticado()
        && (tomaLugar('a') || tomaLugar('b') || cambiaSuNombre('a') || cambiaSuNombre('b'));
      allow delete: if esMiembro(codigo);

      match /perfiles/{lugar} { allow read, write: if esMiembro(codigo); }
      match /partidas/{id} { allow read, write: if esMiembro(codigo); }
      match /estado/{doc} { allow read, write: if esMiembro(codigo); }
      match /dias/{fecha} { allow read, write: if esMiembro(codigo); }
    }
  }
}
```

- [ ] **Step 1: Instalar dependencias**
  Run (PowerShell, desde `firebase/`): `npm install` — esperado: sin errores; existe `firebase/node_modules`.

- [ ] **Step 2: Escribir pruebas que fallan** en `firebase/pruebas/reglas.test.js` con `initializeTestEnvironment({ projectId: 'demo-okupa', firestore: { rules, host: '127.0.0.1', port: 8085 } })`, `assertSucceeds`/`assertFails`, y `withSecurityRulesDisabled` para sembrar. Usuarios: `u1` (a), `u2` (b), `u3` (extraño). Pareja sembrada: `parejas/K7PQ2M` con `lugares {a:'u1', b:null}`, `nombres {a:'Carlos', b:null}`.
  - `sin sesión no se lee la pareja`; `un extraño con sesión sí la lee (para unirse)`
  - `nadie puede listar parejas`
  - `crear: válido`; `crear con código con I/L/O o de 5 caracteres falla`; `crear con lugares.a de otro uid falla`; `crear con nombre vacío o de 31 falla`
  - `u2 toma el lugar b con su nombre`; `u2 no puede tomar b poniendo el uid de otro`; `u2 no puede cambiar a la vez nombres.a`
  - `u1 no puede ocupar también el lugar b` (Review Focus 5)
  - `u3 reclama a con su nombre y desde ahí u1 ya no lee perfiles` (con la pareja completa)
  - `un miembro cambia su nombre; no puede cambiar el del otro` (Review Focus 5)
  - `miembros leen y escriben perfiles, partidas, estado y dias; un extraño no`
  - `respuestas está cerrado en esta etapa` (`dias/2026-11-04/respuestas/gustos_a` falla incluso para miembros)
  - `solo un miembro puede borrar la pareja`

- [ ] **Step 3: Correr las pruebas sin reglas y ver que fallan**
  Con `firestore.rules` conteniendo solo `allow read, write: if false;` → Run: `npm test` (en `firebase/`). Esperado: fallan las pruebas `assertSucceeds`.

- [ ] **Step 4: Escribir `firebase/firestore.rules`** con el bloque de arriba.

- [ ] **Step 5: Correr `npm test`** — esperado: todas pasan (`# fail 0`).

- [ ] **Step 6: Commit** — `Reglas de Firestore para la pareja, probadas con el emulador` (sin `node_modules`).

---

### Task 4: Adaptador real de Firebase

**Files:**
- Modify: `js/nucleo/nube.js` (ya tiene `ErrorNube`)
- Create: `js/nucleo/nube-config.js`
- Create: `pruebas-nube.html` (prueba de humo contra los emuladores; no entra en `pruebas.html` ni en `PRECACHE`)
- Modify: `firebase/package.json` — script `"emuladores": "firebase emulators:start --only auth,firestore --project demo-okupa"`.

**Interfaces:**
- Consumes: contrato `Nube` de Task 1.
- Produces:
  - `nube-config.js` exporta `CONFIG_FIREBASE = null` (se reemplaza por el objeto de Firebase al configurar) y `EMULADORES = null` (o `{ auth: 'http://127.0.0.1:9099', firestore: { host: '127.0.0.1', puerto: 8085 } }`).
  - `nube.js` exporta `VERSION_FIREBASE` (la de `npm view firebase version`, la misma de `firebase/package.json`), `crearNube({ config, emuladores, nombreApp = '[DEFAULT]', cargarSdk }) → Nube` y `obtenerNube(): Promise<Nube>` (instancia única con `nube-config.js`; si `CONFIG_FIREBASE` es `null` rechaza con `ErrorNube('sin-config')`).
  - `cargarSdk` por defecto importa `https://www.gstatic.com/firebasejs/${VERSION_FIREBASE}/firebase-app.js`, `firebase-auth.js` y `firebase-firestore.js`; si el `import()` falla → `ErrorNube('sin-conexion')`.

- [ ] **Step 1: Escribir la prueba de humo** `pruebas-nube.html`: módulo que crea dos nubes con `crearNube({ config: { apiKey: 'demo', projectId: 'demo-okupa', authDomain: 'demo-okupa.firebaseapp.com' }, emuladores: {...}, nombreApp: 'celular-a' | 'celular-b' })`, corre con ellas el flujo de `pareja.js` (u-a crea, u-b se une, `vigilarLugar` en u-a, una tercera app `celular-c` reclama `a` y u-a recibe `alPerder`), comprueba que `celular-c` sin pareja no puede `leer('parejas/X/perfiles/a')` (`ErrorNube('permiso')`), y pinta `OK` o el error en `#resultado`.

- [ ] **Step 2: Ver que falla**: con los emuladores corriendo (`npm run emuladores` en `firebase/`, en segundo plano) abrir http://127.0.0.1:8080/pruebas-nube.html → error porque `crearNube` no existe.

- [ ] **Step 3: Implementar `crearNube` y `obtenerNube`**
  `initializeApp(config, nombreApp)`, `getAuth` + `signInAnonymously` en `iniciar` (con espera máxima de 10 s → `sin-conexion`), `getFirestore`; con `emuladores` llamar `connectAuthEmulator` y `connectFirestoreEmulator` antes de usarlos. Traducir códigos de Firebase: `permission-denied` → `permiso`, `unavailable`/`failed-precondition` por red → `sin-conexion`, resto → `desconocido`. `escribir` usa `setDoc(ref, datos, { merge: combinar })`. `transaccion` envuelve `runTransaction` exponiendo `tx.leer`/`tx.escribir` con rutas. `horaServidor` → `serverTimestamp()`. `listar` → `getDocs(collection(...))`.

- [ ] **Step 4: Ver que pasa**: la página muestra `OK`. Detener los emuladores.

- [ ] **Step 5: Correr `pruebas.html`**: sigue en "0 fallaron" (`nube-config.js` con `null` no rompe nada).

- [ ] **Step 6: Commit** — `Adaptador de Firebase con prueba de humo contra el emulador`.

---

### Task 5: Pantalla de pareja

**Files:**
- Create: `js/nucleo/pantallas-pareja.js`
- Create: `pruebas/pantallas-pareja.prueba.js`
- Modify: `js/nucleo/app.js` — `ctx.nube = obtenerNube` y `tabla.pareja = pantallaPareja`.
- Modify: `js/nucleo/inicio.js` — en el pie, enlace "Nuestra pareja" (`#/pareja`) junto a "Acerca de Okupa".
- Modify: `css/componentes.css` — estilos de `.codigo-pareja` (Fraunces, grande, espaciado, dorado) y del formulario de enlace.
- Modify: `pruebas.html` (agregar la prueba).

**Interfaces:**
- Consumes: `pareja.js` (Task 2), `ErrorNube` y `ctx.nube: () => Promise<Nube>` (Task 4), `el()` de `ui.js`.
- Produces:
  - `pantallaPareja(contenedor, params, ctx)` — ruta `#/pareja`.
  - `async exigirPareja(contenedor, ctx) → { nube, pareja: { codigo, lugar, nombres } } | null` — para las etapas 2–4: si falta conexión, configuración o pareja, pinta lo que corresponde en `contenedor` y devuelve `null`.

Estados de la pantalla (textos exactos):
- Sin configurar: "Falta configurar la conexión" + "Sigue los pasos de «Conectar Firebase» en el LEEME."
- Sin conexión: "Necesitas internet para esta sección" + botón "Reintentar" (llama `ctx.refrescar()`).
- Sin pareja: título "Enlacen sus celulares", botones "Crear pareja" y "Tengo un código".
- Crear: campo "Tu nombre" → "Crear" → muestra `formatearCodigo(codigo)` en `.codigo-pareja`, botones "Copiar" (`navigator.clipboard.writeText`) y "Compartir" (`navigator.share`, solo si existe), texto "Pásale este código a tu pareja para que se una." y "Listo".
- Unirme: campos "Código" y "Tu nombre" → "Unirme". Errores bajo el formulario: `no-existe` → "Ese código no existe. Revísalo."; `nombre` → "Escribe tu nombre (máximo 30 letras)."; `llena` → pasa a "¿Quién eres?" con un botón por nombre ("Soy Carlos", "Soy Sofi") y la advertencia "El otro celular con ese nombre quedará desconectado."
- Enlazados: "Nuestra pareja", código, "Tú: {nombre}" y "{nombre del otro}" o "Esperando a que tu pareja se una…" (escuchando el documento), botones "Cambiar mi nombre", "Salir de este celular" (confirm) y "Borrar todos nuestros datos de la nube" (confirm con "Se borrará para los dos y no se puede deshacer.").
- Lugar perdido: `'reclamado'` → "Tu lugar se abrió en otro celular"; `'borrada'` → "Tu pareja borró sus datos de la nube"; ambos con "Volver a enlazar".
- Al salir de la pantalla (`hashchange`) se cancelan las escuchas.

- [ ] **Step 1: Escribir pruebas que fallan** en `pruebas/pantallas-pareja.prueba.js` (ctx con `almacen` en memoria, `ctx.nube = async () => mundo.nube('u1')`, `refrescar` que vuelve a pintar; esperar microtareas entre acciones):
  - `pantalla pareja: sin configurar lo explica` — `ctx.nube` rechaza `ErrorNube('sin-config')` → texto "Falta configurar la conexión".
  - `pantalla pareja: sin conexión ofrece reintentar` (Review Focus 4) — rechaza `sin-conexion` → botón "Reintentar"; tras `reconectar()` y clic, aparece "Enlacen sus celulares".
  - `pantalla pareja: crear muestra el código formateado`.
  - `pantalla pareja: código inexistente muestra el error junto al formulario`.
  - `pantalla pareja: pareja llena ofrece escoger quién eres y reclamar` — u3 en pantalla, pareja con u1 y u2; clic "Soy Carlos" → estado enlazado con `miPareja` lugar `a`.
  - `pantalla pareja: si reclaman el lugar avisa` (Review Focus 3) — u1 en pantalla enlazado; u3 reclama `a` → aparece "Tu lugar se abrió en otro celular".
  - `pantalla pareja: el nombre de la pareja se muestra como texto` — nombre `'<b>x</b>'` aparece literal y no hay elemento `b`.
  - `exigirPareja: devuelve null y pinta el enlace si no hay pareja; devuelve nube y pareja si la hay`.

- [ ] **Step 2: Correr la suite y ver que fallan.**

- [ ] **Step 3: Implementar `pantallas-pareja.js`, la ruta en `app.js`, el enlace en `inicio.js` y los estilos.**

- [ ] **Step 4: Correr la suite**: "0 fallaron".

- [ ] **Step 5: Verificar en el navegador** con los emuladores corriendo y `EMULADORES` puesto temporalmente en `nube-config.js` (no se commitea): dos pestañas a tamaño de celular (`resize_window` mobile), una crea y otra se une; captura de pantalla de ambas enlazadas. Revertir `nube-config.js`.

- [ ] **Step 6: Commit** — `Pantalla para enlazar la pareja`.

---

### Task 6: Caché, guía de configuración y cierre de la etapa

**Files:**
- Modify: `sw.js` — agregar a `PRECACHE` `js/nucleo/nube.js`, `js/nucleo/nube-config.js`, `js/nucleo/pareja.js`, `js/nucleo/pantallas-pareja.js`; `CACHE = 'okupa-v3'`.
- Modify: `pruebas/pwa.prueba.js` — agregar esos cuatro a `ESPERADOS`.
- Modify: `LEEME.md` — sección "Conectar Firebase (una vez)" y filas nuevas en la tabla de carpetas (`firebase/`, `pruebas-nube.html`).

**Interfaces:**
- Consumes: archivos de Tasks 1–5.

Contenido de "Conectar Firebase (una vez)" en el LEEME (pasos para el usuario, tuteo):
1. https://console.firebase.google.com → "Crear un proyecto" → nombre `okupa` → sin Google Analytics.
2. Compilación → **Authentication** → Comenzar → Métodos de acceso → **Anónimo** → Habilitar.
3. Compilación → **Firestore Database** → Crear base de datos → ubicación `us-east1` → modo producción.
4. Configuración del proyecto (⚙️) → Tus apps → **Web** (`</>`) → apodo `okupa` → copiar el objeto `firebaseConfig`.
5. Pegarlo en `js/nucleo/nube-config.js` como valor de `CONFIG_FIREBASE`.
6. Publicar las reglas: desde `firebase/`, `npx firebase login` y `npx firebase deploy --only firestore:rules --project <id-del-proyecto>`.
7. Subir la versión de `CACHE` en `sw.js` y publicar con `git push`.
Más una nota: "La configuración de Firebase no es secreta; lo que protege sus datos son las reglas del paso 6. No compartan el código de pareja."

- [ ] **Step 1: Agregar los cuatro archivos a `ESPERADOS` en `pruebas/pwa.prueba.js`** y correr la suite — esperado: falla `pwa: PRECACHE incluye todos los archivos de la app`.
- [ ] **Step 2: Actualizar `sw.js`** (lista y `okupa-v3`) — suite en "0 fallaron".
- [ ] **Step 3: Escribir la sección del LEEME.**
- [ ] **Step 4: Verificación final** — `pruebas.html` "0 fallaron"; `npm test` en `firebase/` sin fallas; la app abierta en http://127.0.0.1:8080 sin errores de consola, y las secciones viejas funcionan sin internet (desconectar red en el navegador y navegar por Categorías).
- [ ] **Step 5: Commit** — `Caché okupa-v3 y guía para conectar Firebase`.
