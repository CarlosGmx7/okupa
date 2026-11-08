// Pantalla del mapa: la última ubicación de cada uno sobre un mapa claro y detallado, unidos por la ruta.
import { el } from '../../nucleo/ui.js';
import { exigirPareja } from '../../nucleo/pantallas-pareja.js';
import { guardarUbicacion, leerUbicaciones, formatearDistancia, haceCuanto, avatarDe } from './ubicacion.js';
import { calcularRuta } from './ruta.js';

const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4';
const CLAVE_APROXIMADA = 'okupa:mapa:aproximada';
const CENTRO_COLOMBIA = [4.6, -74.1];
const ROJO_RUTA = '#e0292f';
const COLOR_LUGAR = { a: '#c9a45c', b: '#a8344f' };

let leaflet = null;
// Leaflet se descarga solo al entrar al mapa (y queda guardado en el celular por el service worker).
export function cargarLeaflet() {
  if (globalThis.L) return Promise.resolve(globalThis.L);
  return (leaflet ??= new Promise((listo, fallo) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${LEAFLET}/leaflet.min.css`;
    document.head.append(css);
    const js = document.createElement('script');
    js.src = `${LEAFLET}/leaflet.min.js`;
    js.onload = () => listo(globalThis.L);
    js.onerror = () => { leaflet = null; fallo(new Error('No se pudo descargar el mapa')); };
    document.head.append(js);
  }));
}

function miUbicacion() {
  return new Promise((listo, fallo) => {
    if (!navigator.geolocation) { fallo(new Error('sin-geolocalizacion')); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => listo({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => fallo(e),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
    );
  });
}

// Fondo claro y detallado: el mapa de OpenStreetMap (gratis y sin clave), con calles, pueblos,
// barrios y lugares con sus nombres; los colores se suavizan con CSS (.capa-fondo).
function capaFondo(L) {
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    minZoom: 3,
    className: 'capa-fondo',
    attribution: '© colaboradores de OpenStreetMap',
  });
}

function marcador(L, { nombre, lugar, ubicacion }) {
  const avatar = avatarDe(nombre);
  const figura = avatar
    ? el('img', { clase: 'avatar-pixel', src: avatar, alt: '' })
    : el('span', { clase: 'avatar-pixel avatar-generico', 'aria-hidden': 'true' }, (nombre || '?')[0].toUpperCase());
  if (!avatar) figura.style.setProperty('--color', COLOR_LUGAR[lugar]);
  const contenido = el('div', { clase: 'marcador-pareja' },
    el('span', { clase: 'marcador-nombre' }, nombre || 'Tu pareja'),
    figura,
    el('span', { clase: 'marcador-hora' }, `${haceCuanto(ubicacion.horaMs)}${ubicacion.aproximada ? ' · aprox.' : ''}`));
  contenido.style.setProperty('--color', COLOR_LUGAR[lugar]);
  return L.marker([ubicacion.lat, ubicacion.lng], {
    icon: L.divIcon({ className: 'marcador-contenedor', html: contenido, iconSize: [72, 96], iconAnchor: [36, 90] }),
    title: nombre || 'Tu pareja',
    keyboard: false,
  });
}

export function crearPantallasMapa() {
  async function mapa(contenedor, _params, ctx) {
    const zona = el('div', { clase: 'mapa-pantalla' });
    contenedor.append(el('a', { clase: 'volver', href: '#/' }, '← Inicio'), zona);
    const cargandoMapa = cargarLeaflet();
    cargandoMapa.catch(() => {});
    const r = await exigirPareja(zona, ctx);
    if (!r) return;
    const { nube, pareja } = r;
    const yo = pareja.lugar;
    const otro = yo === 'a' ? 'b' : 'a';
    const nombre = (l) => pareja.nombres[l] || 'Tu pareja';

    const estado = el('p', { clase: 'estado-mapa', role: 'status' }, 'Buscando tu ubicación…');
    const lienzo = el('div', { clase: 'mapa-lienzo', role: 'img', 'aria-label': 'Mapa con la ubicación de los dos' });
    const distancia = el('p', { clase: 'distancia-mapa' });
    const detalle = el('p', { clase: 'campo-ayuda' });
    const aproximada = el('input', { type: 'checkbox', id: 'mapa-aproximada', checked: Boolean(ctx.almacen.leer(CLAVE_APROXIMADA, false)) });
    aproximada.addEventListener('change', () => { ctx.almacen.escribir(CLAVE_APROXIMADA, aproximada.checked); ctx.refrescar(); });
    zona.replaceChildren(
      el('h1', { clase: 'titulo-pantalla' }, 'Mapa'),
      estado, lienzo,
      el('section', { clase: 'panel-mapa' }, distancia, detalle,
        el('label', { clase: 'interruptor-mapa', for: 'mapa-aproximada' }, aproximada, ' Compartir mi ubicación aproximada (el barrio, unos 500 m)'),
        el('p', { clase: 'campo-ayuda' }, 'Tu ubicación se guarda cada vez que abres el mapa. Solo ustedes dos la ven.'),
        el('button', { clase: 'boton', type: 'button', onclick: () => ctx.refrescar() }, 'Actualizar')));

    // 1) La mía (si da permiso), 2) las dos guardadas, 3) el mapa y la ruta.
    try {
      const punto = await miUbicacion();
      await guardarUbicacion(nube, pareja, punto, { aproximada: aproximada.checked });
      estado.textContent = '';
    } catch (e) {
      estado.textContent = e?.code === 1
        ? 'No diste permiso de ubicación: se muestra la última que quedó guardada.'
        : 'No se pudo leer tu ubicación ahora: se muestra la última que quedó guardada.';
    }
    let ubicaciones;
    let L;
    try {
      [ubicaciones, L] = await Promise.all([leerUbicaciones(nube, pareja), cargandoMapa]);
    } catch (e) {
      console.warn('Okupa: el mapa no cargó', e);
      lienzo.replaceChildren(el('p', { clase: 'vacio' }, 'No se pudo cargar el mapa. Revisa la conexión.'));
      return;
    }

    const mapaL = L.map(lienzo, { zoomControl: true, attributionControl: true }).setView(CENTRO_COLOMBIA, 5);
    capaFondo(L).addTo(mapaL);
    window.addEventListener('hashchange', () => mapaL.remove(), { once: true });
    const puntos = [];
    for (const l of [yo, otro]) {
      const u = ubicaciones[l];
      if (!u) continue;
      marcador(L, { nombre: nombre(l), lugar: l, ubicacion: u }).addTo(mapaL);
      puntos.push([u.lat, u.lng]);
    }
    if (!ubicaciones[otro]) detalle.textContent = `${nombre(otro)} todavía no ha abierto el mapa.`;
    if (puntos.length === 1) mapaL.setView(puntos[0], 14);
    if (puntos.length < 2) { distancia.textContent = ''; return; }

    mapaL.fitBounds(puntos, { padding: [60, 60] });
    distancia.textContent = 'Calculando la ruta…';
    const ruta = await calcularRuta(ubicaciones[yo], ubicaciones[otro]);
    L.polyline(ruta.linea, { color: ROJO_RUTA, weight: 5, opacity: 0.9, dashArray: ruta.porVias ? null : '10 10' }).addTo(mapaL);
    mapaL.fitBounds(L.latLngBounds([...ruta.linea, ...puntos]), { padding: [60, 60] });
    distancia.textContent = `${formatearDistancia(ruta.km)} · ≈ ${ruta.minutos} min en moto`;
    detalle.textContent = ruta.porVias
      ? 'Por las vías. El tiempo en moto es un estimado a partir de la ruta en carro.'
      : 'En línea recta (no se pudo calcular la ruta por las vías).';
  }

  return { mapa };
}
