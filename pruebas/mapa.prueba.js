import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearPareja, unirse } from '../js/nucleo/pareja.js';
import {
  redondearAproximada, distanciaKm, minutosMoto, minutosSinRuta, formatearDistancia, haceCuanto, avatarDe,
  guardarUbicacion, leerUbicaciones, buscarUbicacion, textoPrecision, AFINAR_MS, LIMITE_UBICACION_MS,
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

const ok = async (promesa) => promesa;
async function codigoDeError(promesa) {
  try { await promesa; return 'no falló'; } catch (e) { return e.code; }
}

prueba('mapa: primero pide la lectura rápida de siempre; si ya es precisa, no prende el GPS', async () => {
  const geo = geoFalsa();
  const promesa = buscarUbicacion(geo, relojFalso());
  igual(geo.opcionesUnaVez, { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 });
  geo.unaVez.ok(posicion(4.7112, -74.0722, 20.4));
  igual(await ok(promesa), { lat: 4.7112, lng: -74.0722, precision: 20 });
  igual(geo.opciones, null, 'no debe prender el GPS');
});

prueba('mapa: con una lectura rápida imprecisa, afina con el GPS y se queda con la mejor', async () => {
  const geo = geoFalsa();
  const reloj = relojFalso();
  const promesa = buscarUbicacion(geo, reloj);
  geo.unaVez.ok(posicion(4.70, -74.08, 800));
  igual([geo.opciones.enableHighAccuracy, geo.opciones.maximumAge], [true, 0]);
  geo.ok(posicion(4.7112, -74.0722, 45));
  geo.ok(posicion(4.72, -74.06, 300));
  reloj.saltar(AFINAR_MS);
  igual(await promesa, { lat: 4.7112, lng: -74.0722, precision: 45 });
  igual(geo.cortadas, [7], 'debe dejar de escuchar el GPS');
});

prueba('mapa: si el GPS da una lectura precisa al afinar, termina enseguida', async () => {
  const geo = geoFalsa();
  const promesa = buscarUbicacion(geo, relojFalso());
  geo.unaVez.ok(posicion(4.70, -74.08, 500));
  geo.ok(posicion(4.7112, -74.0722, 12));
  igual(await promesa, { lat: 4.7112, lng: -74.0722, precision: 12 });
  igual(geo.cortadas, [7]);
});

prueba('mapa: si el GPS falla al afinar, se queda con la lectura rápida', async () => {
  const geo = geoFalsa();
  const promesa = buscarUbicacion(geo, relojFalso());
  geo.unaVez.ok(posicion(4.70, -74.08, 500));
  geo.error({ code: 3 });
  igual(await promesa, { lat: 4.70, lng: -74.08, precision: 500 });
});

prueba('mapa: sin permiso de ubicación falla de una vez, sin prender el GPS', async () => {
  const geo = geoFalsa();
  const promesa = buscarUbicacion(geo, relojFalso());
  geo.unaVez.error({ code: 1 });
  igual(await codigoDeError(promesa), 1);
  igual(geo.opciones, null);
});

prueba('mapa: si la lectura rápida no responde, busca con el GPS y usa la mejor', async () => {
  const geo = geoFalsa();
  const reloj = relojFalso();
  const promesa = buscarUbicacion(geo, reloj);
  geo.unaVez.error({ code: 3 });
  igual(geo.opciones.enableHighAccuracy, true);
  geo.ok(posicion(4.7112, -74.0722, 150));
  reloj.saltar(AFINAR_MS);
  igual(await promesa, { lat: 4.7112, lng: -74.0722, precision: 150 });
});

prueba('mapa: sin lectura rápida ni GPS, falla con el error del GPS', async () => {
  const geo = geoFalsa();
  const promesa = buscarUbicacion(geo, relojFalso());
  geo.unaVez.error({ code: 2 });
  geo.error({ code: 2 });
  igual(await codigoDeError(promesa), 2);
});

prueba('mapa: nunca se queda buscando: al límite total usa lo que tenga o falla', async () => {
  // El celular nunca contesta nada.
  const mudo = geoFalsa();
  const reloj = relojFalso();
  const promesa = buscarUbicacion(mudo, reloj);
  reloj.saltar(LIMITE_UBICACION_MS);
  igual(await codigoDeError(promesa), 3);
  // Sin lectura rápida, el GPS dio una lectura tarde pero antes del límite.
  const geo = geoFalsa();
  const reloj2 = relojFalso();
  const promesa2 = buscarUbicacion(geo, reloj2);
  geo.unaVez.error({ code: 3 });
  reloj2.saltar(AFINAR_MS);
  geo.ok(posicion(4.7112, -74.0722, 400));
  reloj2.saltar(LIMITE_UBICACION_MS);
  igual(await promesa2, { lat: 4.7112, lng: -74.0722, precision: 400 });
});

prueba('mapa: una respuesta que llega después de terminar no cambia nada', async () => {
  const geo = geoFalsa();
  const reloj = relojFalso();
  const promesa = buscarUbicacion(geo, reloj);
  reloj.saltar(LIMITE_UBICACION_MS);
  igual(await codigoDeError(promesa), 3);
  geo.unaVez.ok(posicion(4.7, -74.0, 10)); // tarde: no debe lanzar ni prender el GPS
  igual(geo.opciones, null);
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