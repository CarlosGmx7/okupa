import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearPareja, unirse } from '../js/nucleo/pareja.js';
import {
  redondearAproximada, distanciaKm, minutosMoto, minutosSinRuta, formatearDistancia, haceCuanto, avatarDe,
  guardarUbicacion, leerUbicaciones, buscarUbicacion, textoPrecision, ESPERA_GPS_MS, LIMITE_GPS_MS,
} from '../js/modulos/mapa/ubicacion.js';
import { calcularRuta } from '../js/modulos/mapa/ruta.js';

const BOGOTA = { lat: 4.711, lng: -74.0721 };
const MEDELLIN = { lat: 6.2442, lng: -75.5812 };

prueba('mapa: la ubicación aproximada se redondea a unos 500 m', () => {
  const r = redondearAproximada({ lat: 4.71234, lng: -74.07287 });
  igual(r, { lat: 4.71, lng: -74.075 });
  verdadero(distanciaKm(r, { lat: 4.71234, lng: -74.07287 }) < 0.6);
});

prueba('mapa: distancia en línea recta entre Bogotá y Medellín ≈ 240 km', () => {
  const km = distanciaKm(BOGOTA, MEDELLIN);
  verdadero(km > 230 && km < 250, String(km));
  igual(distanciaKm(BOGOTA, BOGOTA), 0);
});

prueba('mapa: minutos en moto a partir del carro y sin ruta', () => {
  igual(minutosMoto(1200), 17); // 20 min en carro → ≈ 17 en moto
  igual(minutosMoto(10), 1, 'nunca menos de 1 minuto');
  igual(minutosSinRuta(15), 30); // a 30 km/h promedio en ciudad
});

prueba('mapa: formatos de distancia y de hace cuánto', () => {
  igual(formatearDistancia(12.43), '12,4 km');
  igual(formatearDistancia(0.85), '850 m');
  igual(formatearDistancia(240.4), '240 km');
  const ahora = Date.UTC(2026, 10, 8, 12);
  igual(haceCuanto(ahora - 20 * 1000, ahora), 'hace un momento');
  igual(haceCuanto(ahora - 5 * 60000, ahora), 'hace 5 min');
  igual(haceCuanto(ahora - 3 * 3600000, ahora), 'hace 3 h');
  igual(haceCuanto(ahora - 2 * 86400000, ahora), 'hace 2 días');
});

prueba('mapa: cada nombre tiene su muñequito y los demás uno genérico', () => {
  igual(avatarDe('Carlos'), 'iconos/mapa/carlos.png');
  igual(avatarDe('  yuli '), 'iconos/mapa/yuli.png');
  igual(avatarDe('Yuli Andrea'), 'iconos/mapa/yuli.png');
  igual(avatarDe('Sofi'), null);
  igual(avatarDe(null), null);
});

prueba('mapa: la ruta por las vías usa OSRM y da km y minutos', async () => {
  const pedidos = [];
  const fetchFn = async (url) => { pedidos.push(url); return { ok: true, json: async () => ({ routes: [{ distance: 12430, duration: 1200, geometry: { coordinates: [[-74.07, 4.71], [-74.06, 4.72], [-74.05, 4.73]] } }] }) }; };
  const r = await calcularRuta(BOGOTA, { lat: 4.73, lng: -74.05 }, { fetchFn });
  igual([r.porVias, r.km, r.minutos, r.linea.length], [true, 12.43, 17, 3]);
  igual(r.linea[0], [4.71, -74.07], 'Leaflet usa [lat, lng]');
  verdadero(pedidos[0].includes('/route/v1/driving/-74.0721,4.711;-74.05,4.73'), pedidos[0]);
});

prueba('mapa: si la ruta falla, línea recta con distancia directa', async () => {
  const r = await calcularRuta(BOGOTA, MEDELLIN, { fetchFn: async () => { throw new Error('sin red'); } });
  igual(r.porVias, false);
  igual(r.linea, [[BOGOTA.lat, BOGOTA.lng], [MEDELLIN.lat, MEDELLIN.lng]]);
  igual(r.minutos, minutosSinRuta(r.km));
});

prueba('mapa: cada uno guarda su ubicación y ve la del otro; aproximada se redondea', async () => {
  const mundo = crearMundoFalso();
  const { codigo } = await crearPareja(mundo.nube('u1'), almacenEnMemoria(), { nombre: 'Carlos' });
  await unirse(mundo.nube('u2'), almacenEnMemoria(), { codigo, nombre: 'Yuli' });
  await guardarUbicacion(mundo.nube('u1'), { codigo, lugar: 'a' }, { lat: 4.71234, lng: -74.07287 }, { aproximada: true });
  await guardarUbicacion(mundo.nube('u2'), { codigo, lugar: 'b' }, MEDELLIN);
  const u = await leerUbicaciones(mundo.nube('u2'), { codigo, lugar: 'b' });
  igual([u.a.lat, u.a.lng, u.a.aproximada], [4.71, -74.075, true]);
  igual([u.b.lat, u.b.lng, u.b.aproximada], [MEDELLIN.lat, MEDELLIN.lng, false]);
  verdadero(typeof u.a.horaMs === 'number');
});

// ---- Buscar la ubicación con GPS: precisa, sin posiciones viejas y con plan B ----

function geoFalsa() {
  const g = {
    opciones: null, opcionesUnaVez: null, cortadas: [], ok: null, error: null, unaVez: null,
    watchPosition(ok, error, opciones) { g.ok = ok; g.error = error; g.opciones = opciones; return 7; },
    clearWatch(id) { g.cortadas.push(id); },
    getCurrentPosition(ok, error, opciones) { g.unaVez = { ok, error }; g.opcionesUnaVez = opciones; },
  };
  return g;
}
function relojFalso() {
  const pendientes = [];
  return {
    poner: (fn, ms) => { pendientes.push({ fn, ms, vivo: true }); return pendientes.length - 1; },
    quitar: (id) => { if (pendientes[id]) pendientes[id].vivo = false; },
    saltar: (ms) => pendientes.filter((p) => p.vivo && p.ms === ms).forEach((p) => { p.vivo = false; p.fn(); }),
  };
}
const posicion = (lat, lng, accuracy) => ({ coords: { latitude: lat, longitude: lng, accuracy } });

prueba('mapa: pide GPS sin posiciones viejas y se queda con la primera lectura precisa', async () => {
  const geo = geoFalsa();
  const reloj = relojFalso();
  const promesa = buscarUbicacion(geo, reloj);
  igual([geo.opciones.enableHighAccuracy, geo.opciones.maximumAge], [true, 0]);
  geo.ok(posicion(4.7112, -74.0722, 12.4));
  igual(await promesa, { lat: 4.7112, lng: -74.0722, precision: 12 });
  igual(geo.cortadas, [7], 'debe dejar de escuchar el GPS');
});

prueba('mapa: si no llega una lectura precisa, tras la espera usa la mejor que tenga', async () => {
  const geo = geoFalsa();
  const reloj = relojFalso();
  const promesa = buscarUbicacion(geo, reloj);
  geo.ok(posicion(4.70, -74.08, 800));
  geo.ok(posicion(4.7112, -74.0722, 45));
  geo.ok(posicion(4.72, -74.06, 300));
  reloj.saltar(ESPERA_GPS_MS);
  igual(await promesa, { lat: 4.7112, lng: -74.0722, precision: 45 });
  igual(geo.cortadas, [7]);
});

prueba('mapa: sin ninguna lectura en la espera, sigue buscando y acepta la primera que llegue', async () => {
  const geo = geoFalsa();
  const reloj = relojFalso();
  const promesa = buscarUbicacion(geo, reloj);
  reloj.saltar(ESPERA_GPS_MS);
  geo.ok(posicion(4.7112, -74.0722, 150));
  igual(await promesa, { lat: 4.7112, lng: -74.0722, precision: 150 });
});

prueba('mapa: sin permiso de ubicación falla de una vez, sin plan B', async () => {
  const geo = geoFalsa();
  const promesa = buscarUbicacion(geo, relojFalso());
  geo.error({ code: 1 });
  let codigo = null;
  try { await promesa; } catch (e) { codigo = e.code; }
  igual(codigo, 1);
  igual(geo.unaVez, null);
  igual(geo.cortadas, [7]);
});

prueba('mapa: si el GPS no responde, el plan B es la ubicación por redes', async () => {
  const geo = geoFalsa();
  const promesa = buscarUbicacion(geo, relojFalso());
  geo.error({ code: 3 });
  igual(geo.opcionesUnaVez.enableHighAccuracy, false);
  geo.unaVez.ok(posicion(4.71, -74.07, 1200));
  igual(await promesa, { lat: 4.71, lng: -74.07, precision: 1200 });
});

prueba('mapa: si el GPS se corta con una lectura ya recibida, usa esa', async () => {
  const geo = geoFalsa();
  const promesa = buscarUbicacion(geo, relojFalso());
  geo.ok(posicion(4.7112, -74.0722, 90));
  geo.error({ code: 2 });
  igual(await promesa, { lat: 4.7112, lng: -74.0722, precision: 90 });
  igual(geo.unaVez, null);
});

prueba('mapa: sin GPS ni redes, falla con el error del plan B', async () => {
  const geo = geoFalsa();
  const reloj = relojFalso();
  const promesa = buscarUbicacion(geo, reloj);
  reloj.saltar(ESPERA_GPS_MS);
  reloj.saltar(LIMITE_GPS_MS);
  geo.unaVez.error({ code: 2 });
  let codigo = null;
  try { await promesa; } catch (e) { codigo = e.code; }
  igual(codigo, 2);
});

prueba('mapa: sin geolocalización en el navegador, falla', async () => {
  let mensaje = null;
  try { await buscarUbicacion(null); } catch (e) { mensaje = e.message; }
  igual(mensaje, 'sin-geolocalizacion');
});

prueba('mapa: la precisión se guarda con la ubicación exacta y no con la aproximada', async () => {
  const mundo = crearMundoFalso();
  const { codigo } = await crearPareja(mundo.nube('u1'), almacenEnMemoria(), { nombre: 'Carlos' });
  await unirse(mundo.nube('u2'), almacenEnMemoria(), { codigo, nombre: 'Yuli' });
  await guardarUbicacion(mundo.nube('u1'), { codigo, lugar: 'a' }, { lat: 4.71234, lng: -74.07287, precision: 18 });
  await guardarUbicacion(mundo.nube('u2'), { codigo, lugar: 'b' }, { ...MEDELLIN, precision: 18 }, { aproximada: true });
  const u = await leerUbicaciones(mundo.nube('u2'), { codigo, lugar: 'b' });
  igual(u.a.precision, 18);
  igual('precision' in u.b, false);
});

prueba('mapa: la precisión solo se menciona cuando es mala', () => {
  igual(textoPrecision({ precision: 18 }), '');
  igual(textoPrecision({ precision: 240 }), ' · ±240 m');
  igual(textoPrecision({ precision: 2600 }), ' · ±2,6 km');
  igual(textoPrecision({ aproximada: true, precision: 900 }), ' · aprox.');
  igual(textoPrecision({}), '');
});
