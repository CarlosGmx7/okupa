import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearPareja, unirse } from '../js/nucleo/pareja.js';
import {
  redondearAproximada, distanciaKm, minutosMoto, minutosSinRuta, formatearDistancia, haceCuanto, avatarDe,
  guardarUbicacion, leerUbicaciones,
} from '../js/modulos/mapa/ubicacion.js';
import { calcularRuta } from '../js/modulos/mapa/ruta.js';
import { colorPixel, PALETA } from '../js/modulos/mapa/pixeles.js';

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

prueba('mapa: los colores del mapa real pasan a la paleta tipo Minecraft', () => {
  igual(colorPixel(170, 211, 223), PALETA.agua);
  igual(colorPixel(200, 250, 204), PALETA.pasto);
  igual(colorPixel(173, 209, 158), PALETA.pasto);
  igual(colorPixel(255, 255, 255), PALETA.via);
  igual(colorPixel(242, 239, 233), PALETA.suelo);
  igual(colorPixel(217, 208, 201), PALETA.edificio);
  igual(colorPixel(40, 40, 40), PALETA.texto);
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
