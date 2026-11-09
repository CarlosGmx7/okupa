import { prueba, igual, verdadero } from './corredor.js';

const ESPERADOS = [
  './', 'index.html', 'modulos.json', 'manifest.webmanifest',
  'css/base.css', 'css/componentes.css',
  'js/nucleo/app.js', 'js/nucleo/almacen.js', 'js/nucleo/rutas.js', 'js/nucleo/ui.js', 'js/nucleo/inicio.js',
  'js/nucleo/nube.js', 'js/nucleo/nube-config.js', 'js/nucleo/pareja.js', 'js/nucleo/pantallas-pareja.js', 'js/nucleo/precalentar.js',
  'js/compartido/ingles.js',
  'js/modulos/mapa/modulo.js', 'js/modulos/mapa/pantallas.js', 'js/modulos/mapa/ubicacion.js', 'js/modulos/mapa/ruta.js', 'js/modulos/mapa/motor.js', 'js/modulos/mapa/lugares.js', 'js/modulos/mapa/lugares-ui.js',
  'js/nucleo/portada.js', 'js/modulos/match/modulo.js', 'js/modulos/match/logica.js', 'js/modulos/match/pantallas.js',
  'data/match/tarjetas.json',
  'js/modulos/diario/archivo.js', 'iconos/mapa/carlos.png', 'iconos/mapa/yuli.png',
  'js/modulos/trivia/modulo.js', 'js/modulos/trivia/pantallas.js', 'js/modulos/trivia/banco.js',
  'js/modulos/trivia/matematicas.js', 'js/modulos/trivia/partida.js', 'js/modulos/trivia/sala.js',
  'data/trivia/temas.json', 'data/trivia/arte.json', 'data/trivia/historia.json', 'data/trivia/ciencia.json',
  'data/trivia/deportes.json', 'data/trivia/canserbero.json', 'data/trivia/lana.json', 'data/ingles/vocabulario.json', 'js/nucleo/instalacion.js',
  'js/modulos/diario/modulo.js', 'js/modulos/diario/pantallas.js', 'js/modulos/diario/contenido.js', 'js/modulos/diario/perfil.js',
  'js/modulos/diario/seleccion.js', 'js/modulos/diario/dia.js', 'js/modulos/diario/revelar.js',
  'js/modulos/diario/aprender.js', 'js/modulos/trivia/conoces.js',
  'data/diario/temas.json', 'data/diario/rasgos.json', 'data/diario/preguntas.json', 'data/diario/perfil-inicial.json',
  'js/modulos/preguntas/modulo.js', 'js/modulos/preguntas/datos.js', 'js/modulos/preguntas/progreso.js',
  'js/modulos/preguntas/propio.js', 'js/modulos/preguntas/pantallas.js', 'js/modulos/preguntas/editor.js',
  'data/preguntas/categorias.json', 'data/preguntas/fuentes.json', 'data/preguntas/preguntas.json', 'data/preguntas/sesiones.json',
  'fuentes-tipograficas/fraunces.woff2', 'fuentes-tipograficas/fraunces-italica.woff2', 'fuentes-tipograficas/inter.woff2',
  'iconos/icono-192.png', 'iconos/icono-512.png', 'iconos/icono-maskable-512.png', 'iconos/apple-touch-180.png',
  'iconos/favicon-48.png', 'iconos/portada-circular.png',
];

async function listaPrecache() {
  const texto = await (await fetch('sw.js')).text();
  const m = texto.match(/const PRECACHE = (\[[\s\S]*?\]);/);
  if (!m) throw new Error('sw.js no define PRECACHE');
  return JSON.parse(m[1]);
}

prueba('pwa: PRECACHE incluye todos los archivos de la app', async () => {
  const lista = await listaPrecache();
  const faltan = ESPERADOS.filter((r) => !lista.includes(r));
  igual(faltan, []);
});

prueba('pwa: cada archivo de PRECACHE existe', async () => {
  const lista = await listaPrecache();
  const rotos = [];
  for (const ruta of lista) {
    const r = await fetch(ruta, { cache: 'no-store' });
    if (!r.ok) rotos.push(`${ruta} (${r.status})`);
  }
  igual(rotos, []);
});

// Ejecuta sw.js con un `self` y un `caches` falsos y devuelve sus manejadores de eventos.
async function cargarSW({ claves = [], red = async () => new Response('red') } = {}) {
  const codigo = await (await fetch('sw.js', { cache: 'no-store' })).text();
  const manejadores = {};
  const guardado = new Map(); // `${cache}|${url}` → Response
  const registro = { borradas: [], agregadas: null, pedidosRed: [], guardado };
  const cache = (nombre) => ({
    addAll: async (reqs) => { registro.agregadas = reqs; },
    put: async (req, res) => { guardado.set(`${nombre}|${req.url || req}`, res); },
    match: async (req) => guardado.get(`${nombre}|${req.url || req}`),
  });
  const cachesFalsas = {
    keys: async () => claves,
    delete: async (k) => { registro.borradas.push(k); return true; },
    open: async (nombre) => cache(nombre),
    match: async (req, { cacheName } = {}) => (cacheName ? guardado.get(`${cacheName}|${req.url || req}`) : undefined),
  };
  const fetchFalso = async (req) => { registro.pedidosRed.push(req.url || req); return red(req); };
  const selfFalso = {
    location: new URL('https://ejemplo.github.io/okupa/sw.js'),
    addEventListener: (tipo, fn) => { manejadores[tipo] = fn; },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  new Function('self', 'caches', 'fetch', codigo)(selfFalso, cachesFalsas, fetchFalso);
  const disparar = async (tipo) => {
    let espera = Promise.resolve();
    manejadores[tipo]({ waitUntil: (p) => { espera = p; } });
    await espera;
  };
  // Simula un pedido de la app y devuelve lo que respondió el service worker (o null si no intervino).
  const pedir = async (url) => {
    let respuesta = null;
    manejadores.fetch({ request: new Request(url), respondWith: (p) => { respuesta = p; }, waitUntil: () => {} });
    return respuesta ? await respuesta : null;
  };
  return { disparar, pedir, registro };
}

prueba('pwa: las librerías externas con versión fija se guardan y no se vuelven a descargar', async () => {
  const { pedir, registro } = await cargarSW();
  const url = 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
  igual(await (await pedir(url)).text(), 'red');
  await new Promise((r) => setTimeout(r, 0));
  await pedir(url);
  igual(registro.pedidosRed, [url], 'la segunda vez debe salir de la caché');
  igual(await pedir('https://otra.com/algo.js'), null, 'no intercepta otros dominios');
});

prueba('pwa: al activar no borra la caché de librerías', async () => {
  const { disparar, registro } = await cargarSW({ claves: ['okupa-libs', 'okupa-v0'] });
  await disparar('activate');
  igual(registro.borradas, ['okupa-v0']);
});

prueba('pwa: al activar solo borra cachés viejas de Okupa, no las de otras apps', async () => {
  const texto = await (await fetch('sw.js', { cache: 'no-store' })).text();
  const actual = texto.match(/const CACHE = '([^']+)'/)[1];
  const { disparar, registro } = await cargarSW({ claves: ['okupa-v0', 'reverso-v1', actual, 'otra'] });
  await disparar('activate');
  igual(registro.borradas, ['okupa-v0']);
});

prueba('pwa: las fuentes tipográficas traen su licencia OFL', async () => {
  const r = await fetch('fuentes-tipograficas/OFL.txt', { cache: 'no-store' });
  verdadero(r.ok, `OFL.txt (${r.status})`);
  const texto = await r.text();
  for (const pista of ['SIL OPEN FONT LICENSE Version 1.1', 'Fraunces Project Authors', 'Inter Project Authors']) {
    verdadero(texto.includes(pista), `falta "${pista}"`);
  }
});

prueba('pwa: al instalar pide los archivos saltándose la caché HTTP', async () => {
  const { disparar, registro } = await cargarSW();
  await disparar('install');
  verdadero(registro.agregadas?.length > 0, 'no precacheó nada');
  verdadero(registro.agregadas.every((r) => r instanceof Request && r.cache === 'reload'), 'debe usar cache: reload');
});

prueba('pwa: manifest con nombre, colores e íconos', async () => {
  const m = await (await fetch('manifest.webmanifest')).json();
  igual([m.name, m.short_name, m.lang, m.display, m.start_url, m.theme_color, m.background_color],
    ['Okupa', 'Okupa', 'es-CO', 'standalone', './', '#140a0e', '#140a0e']);
  verdadero(m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'), 'falta ícono maskable');
  verdadero(m.icons.some((i) => i.sizes === '192x192'), 'falta 192');
});
