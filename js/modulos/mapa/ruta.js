// La ruta por las vías entre los dos (servicio público y gratuito de OSRM). Si falla, línea recta.
import { distanciaKm, minutosMoto, minutosSinRuta } from './ubicacion.js';

const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const ESPERA_MS = 8000;

export async function calcularRuta(a, b, { fetchFn = (url, op) => fetch(url, op) } = {}) {
  const recta = () => {
    const km = Math.round(distanciaKm(a, b) * 100) / 100;
    return { porVias: false, km, minutos: minutosSinRuta(km), linea: [[a.lat, a.lng], [b.lat, b.lng]] };
  };
  try {
    const control = typeof AbortController === 'function' ? new AbortController() : null;
    const reloj = setTimeout(() => control?.abort(), ESPERA_MS);
    const url = `${OSRM}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
    const r = await fetchFn(url, { signal: control?.signal }).finally(() => clearTimeout(reloj));
    if (!r.ok) return recta();
    const ruta = (await r.json()).routes?.[0];
    if (!ruta?.geometry?.coordinates?.length) return recta();
    return {
      porVias: true,
      km: Math.round(ruta.distance / 10) / 100,
      minutos: minutosMoto(ruta.duration),
      linea: ruta.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    };
  } catch {
    return recta();
  }
}
