# Invitaciones al instante (v25) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que crear una sala de Trivia o Probable le llegue a la pareja en ~30 s y que tocar la notificación entre directo a la sala.

**Architecture:** El celular, tras dejar el aviso en la bandeja, despierta un Worker de Cloudflare que dispara el workflow «Notificaciones» (`workflow_dispatch`). El servidor pone en la notificación una ruta con el id de la sala; rutas nuevas `trivia/unirme/:id` y `probable/unirme/:id` entran solas.

**Tech Stack:** JS con módulos ES sin compilación; node:test + emulador para el servidor; `pruebas.html` para el navegador; Cloudflare Workers (módulo ES).

**Spec:** `docs/superpowers/specs/2026-11-21-invitaciones-al-instante-design.md`

## Global Constraints
- Español colombiano con tuteo en todo texto visible.
- `avisar()` nunca rechaza ni espera al relevo; una falla del relevo no estorba crear ni entrar a una sala.
- `RELEVO = null` en `nube-config.js` hasta que Carlos suba el Worker; `EMULADORES` siempre `null` al terminar.
- Origen permitido del relevo: exactamente `https://carlosgmx7.github.io`. Freno: 15 000 ms.
- Archivos sin BOM; letras en rem; usar `el()` (nunca `append` con `null`).
- `CACHE` → `okupa-v25`; archivos nuevos en `PRECACHE` y `pruebas/pwa.prueba.js`; pruebas nuevas en `pruebas.html`.
- Commits con `git commit -F`; nada a `main` sin visto bueno de Carlos.

## Review Focus
1. Tocar una invitación vieja (sala cancelada, terminada o borrada) → mensaje «Esa partida ya terminó o se canceló.» con botón al juego; nunca una pantalla colgada. (Tarea 3)
2. Volver atrás después de entrar → no rebota a `unirme` (se reemplaza la entrada del historial). (Tarea 3)
3. Tocar la invitación cuando ya entró (sala `jugando`, otro toque o desde la app) → entra a la partida, no dice «ya terminó». (Tarea 3)
4. Relevo caído, lento o sin internet → la sala se crea igual y el aviso queda para el cron. (Tarea 2)
5. Pedidos al relevo desde otro origen o en ráfaga → 403 / no dispara de más. (Tarea 1)

---

### Task 1: Relevo de Cloudflare

**Files:**
- Create: `servidor/relevo/relevo.js`, `servidor/relevo/relevo.test.mjs`, `docs/guia-relevo.md`

**Interfaces:**
- Produces: `crearRelevo({ ahora = () => Date.now(), buscar = fetch } = {}) → (request, env) => Promise<Response>`; `export default { fetch(request, env) }` que usa una instancia de `crearRelevo()`.

- [ ] **Step 1: Pruebas** (`node --test servidor/relevo/relevo.test.mjs`), con `buscar` falso que registra llamadas:
  - `GET` → 405 y 0 llamadas.
  - `POST` con `Origin: https://otro.com` o sin Origin → 403 y 0 llamadas.
  - `POST` con el origen bueno → 204; 1 llamada a `https://api.github.com/repos/CarlosGmx7/okupa/actions/workflows/notificaciones.yml/dispatches`, método `POST`, cuerpo `{"ref":"main"}`, cabeceras `Authorization: Bearer <env.GITHUB_TOKEN>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`, `User-Agent: okupa-relevo`.
  - Dos `POST` buenos a 5 s → el segundo 204 sin llamar; a 16 s → llama otra vez.
  - GitHub responde 401 → el relevo responde 502; y el freno no se arma (el siguiente intenta).
  - Sin `env.GITHUB_TOKEN` → 500 y 0 llamadas.
- [ ] **Step 2:** Correr → fallan.
- [ ] **Step 3:** Implementar `crearRelevo` (estado del freno dentro del cierre).
- [ ] **Step 4:** Correr → pasan.
- [ ] **Step 5:** `docs/guia-relevo.md`: crear cuenta Cloudflare, Workers → Create → «Hello World» → Edit code → pegar `relevo.js` → Deploy; Settings → Variables and Secrets → Secret `GITHUB_TOKEN` (token fino `okupa-relevo`, Actions Read and write, solo `okupa`); copiar la URL `https://okupa-relevo.<cuenta>.workers.dev`; prueba con la consola del navegador desde la app publicada; qué hacer si vence el token.
- [ ] **Step 6:** Commit.

### Task 2: El celular despierta al relevo

**Files:**
- Modify: `js/nucleo/avisos.js`, `js/nucleo/nube-config.js`, `js/nucleo/app.js`
- Test: `pruebas/avisos.prueba.js`

**Interfaces:**
- Produces: `usarRelevo(fn | null)`; `relevoDesde(url, buscar = globalThis.fetch) → (() => Promise) | null` (null si `url` es falsy; si no, llama `buscar(url, { method: 'POST', mode: 'no-cors', keepalive: true })`); `RELEVO` en `nube-config.js`.

- [ ] **Step 1: Pruebas** (limpiar con `usarRelevo(null)` al final de cada una):
  - `avisar` de `trivia`, `probable`, `trivia-acepto`, `probable-acepto` → llama al relevo una vez cada uno; `diario` y `mapa` → 0.
  - Si escribir el aviso falla → no llama al relevo.
  - Relevo que lanza o rechaza → `avisar` igual devuelve `true`; relevo que nunca resuelve → `avisar` resuelve igual.
  - `relevoDesde(null)` → `null`; `relevoDesde('https://x', buscarFalso)()` llama con `('https://x', { method: 'POST', mode: 'no-cors', keepalive: true })`.
  - `crearSala` de Trivia con relevo puesto → 1 llamada.
- [ ] **Step 2:** Correr en `pruebas.html` → fallan.
- [ ] **Step 3:** Implementar en `avisos.js` (sin `await` al relevo; errores callados con `console.warn`). `export const RELEVO = null;` con comentario en `nube-config.js`. En `app.js`: `usarRelevo(relevoDesde(RELEVO));` junto a las notificaciones.
- [ ] **Step 4:** Correr → pasan, y el total sigue en 0 fallas.
- [ ] **Step 5:** Commit.

### Task 3: La notificación entra directo a la sala

**Files:**
- Modify: `servidor/notificaciones/logica.mjs`, `servidor/notificaciones/pasada.mjs`, sus pruebas `logica.test.mjs` y `pasada.test.mjs`
- Create: `js/nucleo/entrar-sala.js`, `pruebas/entrar-sala.prueba.js`
- Modify: `js/modulos/trivia/{sala,pantallas,modulo}.js`, `js/modulos/probable/{sala,pantallas,modulo}.js`, `js/nucleo/app.js`, `pruebas/trivia-pantallas.prueba.js`, `pruebas/probable-pantallas.prueba.js`, `pruebas.html`

**Interfaces:**
- Produces (servidor): `rutaDe(tipo, idAviso) → string | null`.
- Produces (celular): `entrarASala({ leer, unirse, yo, caduca = false, ahora = Date.now() }) → Promise<'jugar' | 'ya-no'>`; `leerPartida(nube, pareja, id)` (trivia), `leerSala(nube, pareja, id)` (probable); `ctx.reemplazar(ruta)` en `app.js` (`history.replaceState` a `#/<ruta>` + `pintar()`); pantallas `unirme(contenedor, { id }, ctx)` en ambos juegos.

- [ ] **Step 1: Pruebas del servidor:**
  - `rutaDe('trivia','trivia_p-abc1')` → `'#/trivia/unirme/p-abc1'`; `rutaDe('probable','probable_q-abcd')` → `'#/probable/unirme/q-abcd'`; `rutaDe('trivia-acepto','acepto_p-abc1')` → `'#/trivia/jugar/p-abc1'`; `rutaDe('probable-acepto','acepto_q-abcd')` → `'#/probable/jugar/q-abcd'`; `rutaDe('diario','diario_x')` y `rutaDe('trivia','raro')` → `null`; ids se pasan por `encodeURIComponent`.
  - `pasada.test.mjs`: actualizar la invitación de probable a `ruta: '#/probable/unirme/q-abcd'` y los «aceptó» a `'#/probable/jugar/q-abcd'` y `'#/trivia/jugar/p-abc1'`; diario sigue `'#/diario'`.
- [ ] **Step 2: Pruebas de `entrarASala`:** sala inexistente → `'ya-no'`; `terminada`/`cancelada` → `'ya-no'`; `jugando` → `'jugar'` sin llamar `unirse`; `esperando` y `unirse` → true → `'jugar'`; `esperando`, `unirse` → false y relectura `jugando` → `'jugar'`, relectura `cancelada` → `'ya-no'`; `caduca: true` con `creadaMs` de hace 31 min → `'ya-no'` sin llamar `unirse`; `caduca: false` con 31 min → une; `leer` que rechaza → rechaza.
- [ ] **Step 3: Pruebas de pantalla** (en los archivos de pruebas de pantallas de cada juego, con la nube falsa): `unirme` a una sala `esperando` de la pareja → la sala queda `jugando` y se llama `ctx.reemplazar('trivia/jugar/<id>')` (`'probable/jugar/<id>'`); a una sala cancelada → texto «Esa partida ya terminó o se canceló.» y enlace a `#/trivia` (`#/probable`), sin `reemplazar`.
- [ ] **Step 4:** Correr → fallan.
- [ ] **Step 5:** Implementar: `rutaDe` en `logica.mjs` y en `pasada.mjs` `ruta: rutaDe(aviso.tipo, n.id) ?? texto.ruta`; `entrar-sala.js` (usa `sigueEsperando` de `esperando.js` cuando `caduca`); `leerPartida`/`leerSala`; pantallas `unirme` (muestra «Entrando a la partida…», usa `preparar`; si `'jugar'` → `guardarEsperando(..., null)` y `ctx.reemplazar`; si falla la red → el «Se perdió la conexión / Reintentar» de siempre); rutas `'unirme/:id'` en ambos `modulo.js` (Probable con `caduca: true`); `ctx.reemplazar` en `app.js`.
- [ ] **Step 6:** Correr servidor (`firebase/`: `node emuladores.mjs exec "node --test pruebas/ ../servidor/notificaciones/pasada.test.mjs ../servidor/notificaciones/logica.test.mjs"`) y `pruebas.html` → 0 fallas.
- [ ] **Step 7:** Commit.

### Task 4: Versión v25 y cierre

**Files:** `sw.js`, `pruebas/pwa.prueba.js`, `ESTADO.md`

- [ ] **Step 1:** `CACHE` → `okupa-v25`; `js/nucleo/entrar-sala.js` en `PRECACHE` y en la lista de `pwa.prueba.js`.
- [ ] **Step 2:** Todas las pruebas: `pruebas.html` 0 fallas; servidor 0 fallas; `node --test servidor/relevo/relevo.test.mjs`.
- [ ] **Step 3:** Probar en el navegador local (127.0.0.1, service worker desregistrado): abrir `#/trivia/unirme/<id>` de una sala inexistente → mensaje; sin errores en consola.
- [ ] **Step 4:** ESTADO.md al día (v25 lista, pasos de Carlos: Worker + token + pegar la URL en `RELEVO` antes de publicar).
- [ ] **Step 5:** Commit y push de la rama (no a `main`).
