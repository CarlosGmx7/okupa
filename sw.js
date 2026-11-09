// Guarda Okupa en el dispositivo para que funcione sin internet.
// Al cambiar cualquier archivo, sube la versión (okupa-v12 → okupa-v13) para que los celulares la actualicen.
const CACHE = 'okupa-v12';

const PRECACHE = [
  "./",
  "index.html",
  "modulos.json",
  "manifest.webmanifest",
  "css/base.css",
  "css/componentes.css",
  "js/nucleo/app.js",
  "js/nucleo/almacen.js",
  "js/nucleo/rutas.js",
  "js/nucleo/ui.js",
  "js/nucleo/inicio.js",
  "js/nucleo/instalacion.js",
  "js/nucleo/nube.js",
  "js/nucleo/nube-config.js",
  "js/nucleo/pareja.js",
  "js/nucleo/pantallas-pareja.js",
  "js/nucleo/precalentar.js",
  "js/compartido/ingles.js",
  "js/modulos/mapa/modulo.js",
  "js/modulos/mapa/pantallas.js",
  "js/modulos/mapa/ubicacion.js",
  "js/modulos/mapa/ruta.js",
  "js/modulos/mapa/motor.js",
  "js/modulos/mapa/lugares.js",
  "js/modulos/mapa/lugares-ui.js",
  "js/nucleo/portada.js",
  "js/modulos/match/modulo.js",
  "js/modulos/match/logica.js",
  "js/modulos/match/pantallas.js",
  "data/match/tarjetas.json",
  "js/modulos/diario/archivo.js",
  "iconos/mapa/carlos.png",
  "iconos/mapa/yuli.png",
  "js/modulos/trivia/modulo.js",
  "js/modulos/trivia/pantallas.js",
  "js/modulos/trivia/banco.js",
  "js/modulos/trivia/matematicas.js",
  "js/modulos/trivia/partida.js",
  "js/modulos/trivia/sala.js",
  "data/trivia/temas.json",
  "data/trivia/arte.json",
  "data/trivia/historia.json",
  "data/trivia/ciencia.json",
  "data/trivia/deportes.json",
  "data/trivia/canserbero.json",
  "data/trivia/lana.json",
  "data/ingles/vocabulario.json",
  "js/modulos/diario/modulo.js",
  "js/modulos/diario/pantallas.js",
  "js/modulos/diario/contenido.js",
  "js/modulos/diario/perfil.js",
  "js/modulos/diario/seleccion.js",
  "js/modulos/diario/dia.js",
  "js/modulos/diario/revelar.js",
  "js/modulos/diario/aprender.js",
  "js/modulos/trivia/conoces.js",
  "data/diario/temas.json",
  "data/diario/rasgos.json",
  "data/diario/preguntas.json",
  "data/diario/perfil-inicial.json",
  "js/modulos/preguntas/modulo.js",
  "js/modulos/preguntas/datos.js",
  "js/modulos/preguntas/progreso.js",
  "js/modulos/preguntas/propio.js",
  "js/modulos/preguntas/pantallas.js",
  "js/modulos/preguntas/editor.js",
  "data/preguntas/categorias.json",
  "data/preguntas/fuentes.json",
  "data/preguntas/preguntas.json",
  "data/preguntas/sesiones.json",
  "fuentes-tipograficas/fraunces.woff2",
  "fuentes-tipograficas/fraunces-italica.woff2",
  "fuentes-tipograficas/inter.woff2",
  "iconos/icono-192.png",
  "iconos/icono-512.png",
  "iconos/icono-maskable-512.png",
  "iconos/apple-touch-180.png",
  "iconos/favicon-48.png",
  "iconos/portada-circular.png"
];

// En el computador de desarrollo se pide primero a la red para ver siempre lo último.
const DESARROLLO = ['localhost', '127.0.0.1'].includes(self.location.hostname);

self.addEventListener('install', (e) => {
  // cache: 'reload' evita guardar copias viejas que tenga la caché HTTP (GitHub Pages cachea 10 min).
  const pedidos = PRECACHE.map((url) => new Request(url, { cache: 'reload' }));
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(pedidos)).then(() => self.skipWaiting()));
});

// Otras apps del mismo dominio (p. ej. Reverso en usuario.github.io) comparten las cachés:
// solo se borran las versiones viejas de Okupa.
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves
      .filter((k) => k.startsWith('okupa-') && k !== CACHE && k !== CACHE_LIBRERIAS)
      .map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function desdeCache(req) {
  const guardada = await caches.match(req, { ignoreSearch: true, cacheName: CACHE });
  if (guardada) return guardada;
  if (req.mode === 'navigate') {
    const inicio = await caches.match('index.html', { cacheName: CACHE });
    if (inicio) return inicio;
  }
  return null;
}

// Librerías externas con la versión en la dirección (Firebase, MapLibre): nunca cambian, así que se
// guardan la primera vez y después salen del celular, sin esperar la red.
const CACHE_LIBRERIAS = 'okupa-libs';
const LIBRERIAS = [/^https:\/\/www\.gstatic\.com\/firebasejs\/\d+\.\d+\.\d+\//, /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/maplibre-gl\/\d+\.\d+\.\d+\//];

async function libreria(req) {
  const guardada = await caches.match(req, { cacheName: CACHE_LIBRERIAS });
  if (guardada) return guardada;
  const respuesta = await fetch(req);
  if (respuesta.ok) {
    const copia = respuesta.clone();
    caches.open(CACHE_LIBRERIAS).then((c) => c.put(req, copia)).catch(() => {});
  }
  return respuesta;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (LIBRERIAS.some((r) => r.test(req.url))) { e.respondWith(libreria(req)); return; }
  if (new URL(req.url).origin !== self.location.origin) return;
  if (DESARROLLO) {
    e.respondWith(fetch(req).catch(async () => (await desdeCache(req)) || Response.error()));
    return;
  }
  e.respondWith(desdeCache(req).then((r) => r || fetch(req)));
});
