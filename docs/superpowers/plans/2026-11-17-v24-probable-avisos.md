# Okupa v24 — Rondas guardadas, «ya aceptaron», APK nueva y 200 frases — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guardar rondas de Probable con la marca de si el otro la guardó, avisar al anfitrión cuando aceptan su juego, avisar en la APK cuando hay una nueva y subir Probable a 200 frases por tema.

**Architecture:** Cada pieza en su propio archivo o bloque: avisos «aceptó» por la bandeja `parejas/{c}/avisos` que ya existe (cliente + reglas + servidor + cron), rondas guardadas en `js/modulos/probable/guardadas.js` (copia en `ctx.almacen` + marca en `parejas/{c}/probable_guardadas/{salaId}`), aviso de APK en `js/nucleo/apk.js` con `data/apk.json` estático, y el banco en `data/probable/frases.json`.

**Tech Stack:** JS con módulos ES sin compilación, Firestore + reglas probadas con `@firebase/rules-unit-testing`, servidor Node en GitHub Actions, TWA de Bubblewrap.

**Spec:** `docs/superpowers/specs/2026-11-17-v24-probable-avisos-design.md`

## Global Constraints

- Español colombiano con tuteo en la interfaz. Nodos con `el()` (`js/nucleo/ui.js`), nunca `append`/`replaceChildren` nativo con `null`. Letras en rem; no usar `--acento`.
- Archivos sin BOM. Comandos en PowerShell (Bash falla). Commits con `git commit -F`, terminando en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Nunca `git clean -fdx` (los `node_modules` son uniones). Nunca push.
- `CACHE = 'okupa-v24'` (Task 1 la sube); cada archivo nuevo de la app en `PRECACHE` y en `pruebas/pwa.prueba.js` (excepto `data/apk.json`, que nunca se cachea); cada prueba nueva en `pruebas.html`.
- Reglas: cambios en `firebase/firestore.rules` con pruebas en `firebase/pruebas/`. Carlos las pega al publicar.
- Texto del aviso: título `Okupa`, cuerpo `${nombre} aceptó tu juego. ¡Entra ya!`, ruta `#/trivia` o `#/probable`, vigencia 30 min, interruptor de Trivia.
- Rondas: clave `okupa:probable:guardadas`, máximo 100, viaja en el respaldo (no es clave «de este celular»).
- APK: `data/apk.json` = `{ "versionCode": 1, "version": "1.0.0", "url": "https://github.com/CarlosGmx7/okupa/releases/latest" }`; detección por `document.referrer` que empieza con `android-app://io.github.carlosgmx7.okupa` (→ versión 1) o `?apk=N`; descartada en `okupa:apk:descartada`.
- Frases: 200 por tema (divertidas `div`, románticas `rom`, picantes `pic`, futuro `fut`, costumbres `cos`), conservando las 155 actuales; 5–120 caracteres; sin «¿» al inicio ni «más probable»; picantes pueden ser directas sobre sexo, sin vulgaridad ni humillación ni nada no consentido.
- Correr pruebas: app `python herramientas/servidor.py 8124` (launch `okupa-v24`) → `http://127.0.0.1:8124/correr-una.html?f=<nombre>` y `/pruebas.html` «0 fallaron» (734 antes); reglas y servidor en `firebase/`: `node emuladores.mjs exec "node --test pruebas/ ../servidor/notificaciones/pasada.test.mjs ../servidor/notificaciones/logica.test.mjs"` (209 antes) y luego cerrar el java del puerto 8085.

## Review Focus

1. El aviso «aceptó» nunca le llega a quien entró, solo al anfitrión (prueba en Task 1).
2. Unirse a una sala ya cancelada o ya en juego no manda «aceptó» (prueba en Task 1).
3. Guardar dos veces la misma ronda deja una sola; una ronda con votos «Los dos» y frases sin revelar se guarda y se pinta bien (prueba en Task 2).
4. Sin internet o con `apk.json` roto, no sale franja ni error; en Chrome (sin referrer ni `?apk`) nunca sale (prueba en Task 3).
5. «Ahora no» oculta la franja para esa versión, pero vuelve a salir si se publica otra mayor (prueba en Task 3).

---

### Task 1: Aviso «ya aceptaron tu juego» y avisos cada 5 min

**Files:**
- Modify: `js/modulos/trivia/sala.js`, `js/modulos/probable/sala.js` (`unirse`), las pantallas que llaman `unirse`, `js/nucleo/avisos.js` (si hace falta aceptar el id `acepto_…`)
- Modify: `firebase/firestore.rules` (bloque `avisos`), `firebase/pruebas/` (archivo de avisos)
- Modify: `servidor/notificaciones/logica.mjs` (`TEXTOS`, vigencia, `PREFERENCIA`), `servidor/notificaciones/logica.test.mjs`, `servidor/notificaciones/pasada.test.mjs`
- Modify: `.github/workflows/notificaciones.yml` (cron `*/5 * * * *` y su comentario)
- Modify: `sw.js` y `pruebas/pwa.prueba.js` (`CACHE = 'okupa-v24'`)
- Test: `pruebas/sala.prueba.js`, `pruebas/probable-sala.prueba.js`

**Interfaces:**
- Produces: `unirse(...)` de Trivia y de Probable devuelve `Promise<boolean>` (`true` solo si esta llamada pasó la sala de `esperando` a `jugando`). Tipos de aviso `'trivia-acepto'` y `'probable-acepto'`, id `acepto_<idSala>`.

- [ ] **Step 1: Pruebas** (fallan): `unirse` devuelve `true` y deja un aviso `acepto_<id>` con `tipo` correcto y `de` = lugar de quien entra; sobre una sala cancelada o ya `jugando` devuelve `false` y no deja aviso (Review Focus 2). Reglas: un miembro crea `avisos/acepto_<id>` con tipo `trivia-acepto` y `probable-acepto` ✔; tipo desconocido ✘; no miembro ✘. Servidor: `textoDe('probable-acepto', 'Yuli')` → cuerpo `Yuli aceptó tu juego. ¡Entra ya!` y ruta `#/probable` (y Trivia → `#/trivia`); vence a los 30 min; `destinatarios` no incluye al lugar `de` (Review Focus 1); con el interruptor de Trivia apagado no se manda; con pasadas cada 5 min dentro de la misma franja de 15 min, `franjasPendientes` no repite recordatorios del Diario ni de fechas.
- [ ] **Step 2:** Correr las pruebas de app y de reglas+servidor → fallan las nuevas.
- [ ] **Step 3: Implementar** (cliente, reglas, servidor, cron, `CACHE`).
- [ ] **Step 4:** Todo en verde (app «0 fallaron», reglas+servidor `fail 0`).
- [ ] **Step 5: Commit** `feat(avisos): avisar al anfitrión cuando aceptan su juego`.

### Task 2: Rondas guardadas de Probable

**Files:**
- Create: `js/modulos/probable/guardadas.js`, `pruebas/probable-guardadas.prueba.js` (registrar en `pruebas.html`; archivo en `PRECACHE` y `pwa.prueba.js`)
- Modify: `js/modulos/probable/pantallas.js` (botón en `final()`, rutas nuevas), `js/modulos/probable/modulo.js` (rutas `guardadas` y `guardadas/:id`), `firebase/firestore.rules` (bloque `probable_guardadas`), `firebase/pruebas/` (pruebas del bloque), `privacidad.html` (una línea: la ronda guardada queda en el celular; en la nube solo la marca de quién la guardó)

**Interfaces:**
- Consumes: `resumen`/`coincidieron` de `js/modulos/probable/logica.js` tal como están.
- Produces (exportadas de `guardadas.js`):
  - `CLAVE_GUARDADAS = 'okupa:probable:guardadas'`, `MAX_GUARDADAS = 100`
  - `rondaParaGuardar(sala, votos, nombres, ahoraMs) → Ronda` con `Ronda = { id, fecha, tema, nombres: { a, b }, frases: [{ texto, a, b }], coincidencias, total }`; cada elección `'a' | 'b' | 'todos' | null`; solo cuentan las frases reveladas; se guarda el texto (también en «nuestras»).
  - `guardarRonda(almacen, ronda) → void` (reemplaza la del mismo `id`, más nueva primero, recorta a 100), `leerGuardadas(almacen) → Ronda[]` (tolera valores corruptos → `[]`), `borrarGuardada(almacen, id) → void`
  - `marcarGuardada(nube, pareja, salaId) → Promise<void>` (escribe `{ [pareja.lugar]: true }` con merge en `parejas/{c}/probable_guardadas/{salaId}`)
  - `leerMarcas(nube, pareja, ids) → Promise<Record<id, { a?: true, b?: true }>>` (una lectura por id; errores → marca vacía)

- [ ] **Step 1: Pruebas** (fallan): `rondaParaGuardar` con votos `a`, `b`, `todos` y una frase sin revelar → la sin revelar no entra y `coincidencias` coincide con `resumen()` (Review Focus 3); guardar dos veces el mismo id deja una (Review Focus 3); 101 guardadas → 100 y sale la más vieja; valor corrupto → `[]`; `borrarGuardada`. Pantalla: al final de una ronda terminada aparece «Guardar ronda»; tocarlo → «Guardada ✓», la ronda está en el almacén y la marca en la nube falsa; con la nube rechazando la marca, igual «Guardada ✓» y la copia queda; «Rondas guardadas» lista tema y «Coincidieron en X de N», muestra «✓ {nombre} también la guardó» cuando la marca del otro existe, y el detalle muestra cada frase con las dos elecciones («Carlos», «Yuli» o «Los dos»); borrar quita solo la copia local. Reglas: cada miembro pone solo su letra en `true` ✔; poner la del otro ✘; quitar la del otro ✘; claves fuera de `a`/`b` ✘; leer y borrar miembros ✔; no miembro ✘.
- [ ] **Step 2:** Correr → fallan.
- [ ] **Step 3: Implementar.** La marca se reintenta al abrir «Rondas guardadas» para las rondas propias sin marca propia.
- [ ] **Step 4:** Todo en verde.
- [ ] **Step 5: Commit** `feat(probable): guardar rondas y ver si el otro también la guardó`.

### Task 3: Aviso «hay una APK nueva»

**Files:**
- Create: `js/nucleo/apk.js`, `data/apk.json`, `pruebas/apk.prueba.js` (registrar en `pruebas.html`; `apk.js` en `PRECACHE` y `pwa.prueba.js`; `data/apk.json` NO), `docs/guia-apk-nueva.md`
- Modify: `js/nucleo/app.js` (detectar al arrancar, antes de cambiar de ruta), `js/nucleo/inicio.js` (franja arriba en las tres interfaces), `js/nucleo/pantalla-ajustes.js` (línea «App instalada: versión N» solo en la APK), `sw.js` (`data/apk.json` siempre a la red, nunca a la caché), `css/componentes.css` (estilo de la franja, reutilizando el de `.franja-solicitud` si sirve)

**Interfaces:**
- Produces (exportadas de `apk.js`):
  - `detectarApk({ referrer, url, sesion }) → { enApk: boolean, versionCode: number | null }` — guarda el resultado en `sesion` (sessionStorage) con clave `okupa:apk` y, en llamadas siguientes sin referrer, lo devuelve desde ahí.
  - `leerUltimaApk(fetchFn = fetch) → Promise<{ versionCode, version, url } | null>` (`cache: 'no-store'`; cualquier error → `null`).
  - `debeAvisar(instalada, ultima, descartada) → boolean` (`true` si `instalada.enApk` y `ultima.versionCode > instalada.versionCode` y `ultima.versionCode !== descartada`).
  - `montarAvisoApk(contenedor, ctx, { detectado, leer = leerUltimaApk } = {}) → void` — franja «Hay una versión nueva de la app» con «Descargar» (abre `url`) y «Ahora no» (guarda `versionCode` en `okupa:apk:descartada` y quita la franja).

- [ ] **Step 1: Pruebas** (fallan): referrer `android-app://io.github.carlosgmx7.okupa/` → `{ enApk: true, versionCode: 1 }`; `?apk=3` → versión 3; Chrome sin nada → `enApk: false` y nunca franja (Review Focus 4); segunda llamada sin referrer en la misma sesión → mismo resultado; `leerUltimaApk` con fetch que falla o JSON roto → `null` y sin franja (Review Focus 4); instalada 1 y última 2 → franja; «Ahora no» la quita y no vuelve con la última 2, pero sí con 3 (Review Focus 5); instalada igual a la última → nada. Ajustes muestra «App instalada: versión 1» solo en la APK. `pwa.prueba.js`: `data/apk.json` no está en `PRECACHE`.
- [ ] **Step 2:** Correr → fallan.
- [ ] **Step 3: Implementar** y escribir `docs/guia-apk-nueva.md` para Carlos en pasos numerados: en `../okupa-apk/twa-manifest.json` subir `appVersionCode` y `appVersionName` y poner `startUrl` = `/okupa/?apk=<appVersionCode>`; construir con `construir.ps1` y la misma llave; subir el `.apk` a GitHub Releases; por último subir `versionCode`/`version` en `data/apk.json` y publicar. Incluir el límite de 60 días de los cron y cómo reactivarlos (Actions → Notificaciones → Enable workflow).
- [ ] **Step 4:** Todo en verde.
- [ ] **Step 5: Commit** `feat(apk): avisar en la APK cuando hay una versión nueva`.

### Task 4: 200 frases por tema

**Files:**
- Modify: `pruebas/probable-contenido.prueba.js`, `data/probable/frases.json`

**Interfaces:**
- Consumes: `TEMAS`, `validarFrase`, `cargarFrases` de `js/modulos/probable/logica.js`.

- [ ] **Step 1: Prueba** (falla): cada tema del banco tiene ≥200; las 155 frases actuales siguen con su mismo `id` y `texto`; ids consecutivos `<prefijo>-001`…`-200`; ningún texto repetido comparando sin tildes, mayúsculas ni puntuación; ningún nombre propio (palabra con mayúscula inicial fuera del comienzo del texto).
- [ ] **Step 2:** Correr `correr-una.html?f=probable-contenido` → falla.
- [ ] **Step 3: Investigar** (búsquedas web en Reddit —r/relationships, r/AskReddit, r/dating, r/Colombia— y en juegos de pareja de TikTok/Instagram) qué situaciones reales cuentan las parejas, y **escribir** tema por tema las 169 que faltan de cada uno (845 en total), reescritas, nunca copiadas, concretas y reconocibles, en español colombiano; picantes directas sobre sexo según Global Constraints.
- [ ] **Step 4:** `correr-una.html?f=probable-contenido` y `pruebas.html` → «0 fallaron».
- [ ] **Step 5: Commit** `feat(probable): 200 frases por tema` (solo el banco y su prueba, para que Carlos lo lea aparte).
