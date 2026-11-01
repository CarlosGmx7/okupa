// Guarda Okupa en el dispositivo para que funcione sin internet.
// Al cambiar cualquier archivo, sube la versión (okupa-v1 → okupa-v2) para que los celulares la actualicen.
const CACHE = 'okupa-v1';

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
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function desdeCache(req) {
  const guardada = await caches.match(req, { ignoreSearch: true });
  if (guardada) return guardada;
  if (req.mode === 'navigate') {
    const inicio = await caches.match('index.html');
    if (inicio) return inicio;
  }
  return null;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (DESARROLLO) {
    e.respondWith(fetch(req).catch(async () => (await desdeCache(req)) || Response.error()));
    return;
  }
  e.respondWith(desdeCache(req).then((r) => r || fetch(req)));
});
