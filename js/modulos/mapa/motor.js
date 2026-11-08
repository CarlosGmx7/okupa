// Motor del mapa: MapLibre GL con el estilo Liberty de OpenFreeMap (gratis, sin clave), nombres en
// español y ayudas para marcadores, rutas y encuadre. Las coordenadas de la app son { lat, lng } o
// [lat, lng]; MapLibre usa [lng, lat].

export const MAPLIBRE = 'https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1';
export const ESTILO_LIBERTY = 'https://tiles.openfreemap.org/styles/liberty';
const ESPANOL = ['coalesce', ['get', 'name:es'], ['get', 'name']];

export const aLngLat = ([lat, lng]) => [lng, lat];

// [[sur-oeste], [nor-este]] en [lng, lat] para fitBounds.
export function limites(puntos) {
  const lats = puntos.map((p) => p[0]);
  const lngs = puntos.map((p) => p[1]);
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
}

// Cambia las etiquetas de nombres (lugares, agua, vías…) a español con el nombre local de respaldo.
// Las que no son nombres (número de la vía, de la casa) se dejan igual.
export function etiquetasEnEspanol(estilo) {
  const copia = structuredClone(estilo);
  for (const capa of copia.layers || []) {
    const campo = capa.layout?.['text-field'];
    if (campo === undefined) continue;
    if (/\bname/.test(JSON.stringify(campo))) capa.layout['text-field'] = ESPANOL;
  }
  return copia;
}

let cargando = null;
// MapLibre se descarga solo al entrar al mapa (y queda guardado en el celular por el service worker).
export function cargarMapLibre() {
  if (globalThis.maplibregl) return Promise.resolve(globalThis.maplibregl);
  return (cargando ??= new Promise((listo, fallo) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${MAPLIBRE}/maplibre-gl.min.css`;
    document.head.append(css);
    const js = document.createElement('script');
    js.src = `${MAPLIBRE}/maplibre-gl.min.js`;
    js.onload = () => listo(globalThis.maplibregl);
    js.onerror = () => { cargando = null; fallo(new Error('No se pudo descargar el mapa')); };
    document.head.append(js);
  }));
}

let estiloGuardado = null;
async function estiloLiberty() {
  estiloGuardado ??= fetch(ESTILO_LIBERTY).then((r) => {
    if (!r.ok) throw new Error(`Estilo del mapa: ${r.status}`);
    return r.json();
  }).then(etiquetasEnEspanol).catch((e) => { estiloGuardado = null; throw e; });
  return estiloGuardado;
}

// Crea el mapa y espera a que el estilo esté cargado.
export async function crearMapa(lienzo, { centro = [4.6, -74.1], zoom = 5 } = {}) {
  const [gl, estilo] = await Promise.all([cargarMapLibre(), estiloLiberty()]);
  const mapa = new gl.Map({
    container: lienzo,
    style: estilo,
    center: aLngLat(centro),
    zoom,
    attributionControl: { compact: true },
    dragRotate: false,
    pitchWithRotate: false,
  });
  mapa.touchZoomRotate.disableRotation();
  mapa.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right');
  await new Promise((listo, fallo) => {
    mapa.once('load', listo);
    mapa.once('error', (e) => { if (!mapa.loaded()) fallo(e.error || new Error('El mapa no cargó')); });
  });
  return { gl, mapa };
}

export function marcador(gl, mapa, elemento, { lat, lng }, anchor = 'bottom') {
  return new gl.Marker({ element: elemento, anchor }).setLngLat([lng, lat]).addTo(mapa);
}

export function dibujarLinea(mapa, id, linea, { color, ancho = 5, punteada = false }) {
  const datos = { type: 'Feature', geometry: { type: 'LineString', coordinates: linea.map(aLngLat) } };
  if (mapa.getSource(id)) { mapa.getSource(id).setData(datos); return; }
  mapa.addSource(id, { type: 'geojson', data: datos });
  mapa.addLayer({
    id, type: 'line', source: id,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': color, 'line-width': ancho, 'line-opacity': 0.9, ...(punteada ? { 'line-dasharray': [2, 2] } : {}) },
  });
}

export function encuadrar(mapa, puntos, { relleno = 60, zoomUnico = 14 } = {}) {
  if (!puntos.length) return;
  if (puntos.length === 1) { mapa.jumpTo({ center: aLngLat(puntos[0]), zoom: zoomUnico }); return; }
  mapa.fitBounds(limites(puntos), { padding: relleno, maxZoom: 15, duration: 0 });
}
