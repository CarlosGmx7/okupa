// Ubicaciones de la pareja: guardar la propia, leer las dos, y cálculos de distancia y tiempo.

const PASO_APROXIMADO = 0.005; // ≈ 550 m de latitud: muestra el barrio, no la casa
const FACTOR_MOTO = 0.85; // en ciudad la moto suele tardar un poco menos que el carro
const KMH_SIN_RUTA = 30; // velocidad promedio en ciudad cuando no hay ruta por las vías
const AVATARES = ['carlos', 'yuli'];

export const rutaUbicaciones = (codigo) => `parejas/${codigo}/ubicaciones`;

const redondear = (n, paso) => Math.round(Math.round(n / paso) * paso * 1e6) / 1e6;
export const redondearAproximada = ({ lat, lng }) => ({ lat: redondear(lat, PASO_APROXIMADO), lng: redondear(lng, PASO_APROXIMADO) });

// Distancia en línea recta (fórmula del haversine), en km.
export function distanciaKm(a, b) {
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export const minutosMoto = (segundosCarro) => Math.max(1, Math.round((segundosCarro * FACTOR_MOTO) / 60));
export const minutosSinRuta = (km) => Math.max(1, Math.round((km / KMH_SIN_RUTA) * 60));

export function formatearDistancia(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toLocaleString('es-CO', { maximumFractionDigits: km < 100 ? 1 : 0 })} km`;
}

export function haceCuanto(ms, ahora = Date.now()) {
  const min = Math.floor((ahora - ms) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'hace 1 día' : `hace ${d} días`;
}

// El muñequito de cada uno según su nombre en la app (la primera palabra, sin tildes).
export function avatarDe(nombre) {
  const primera = (typeof nombre === 'string' ? nombre : '').trim().split(/\s+/)[0]
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return AVATARES.includes(primera) ? `iconos/mapa/${primera}.png` : null;
}

export async function guardarUbicacion(nube, pareja, { lat, lng }, { aproximada = false } = {}) {
  const punto = aproximada ? redondearAproximada({ lat, lng }) : { lat, lng };
  await nube.escribir(`${rutaUbicaciones(pareja.codigo)}/${pareja.lugar}`, {
    ...punto, aproximada, horaMs: Date.now(), hora: nube.horaServidor(),
  });
}

export async function leerUbicaciones(nube, pareja) {
  const [a, b] = await Promise.all(['a', 'b'].map((l) => nube.leer(`${rutaUbicaciones(pareja.codigo)}/${l}`)));
  return { a, b };
}
