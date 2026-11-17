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

const PRECISION_BUENA_M = 30; // con esto ya se distingue la cuadra: no hace falta esperar más
const PRECISION_VISIBLE_M = 100; // peor que esto se le cuenta a la pareja
export const ESPERA_GPS_MS = 10000; // cuánto se le da al GPS para afinar antes de usar la mejor lectura
export const LIMITE_GPS_MS = 25000; // sin ninguna lectura en este tiempo, se pasa a la ubicación por redes
const ESPERA_REDES_MS = 10000;
const SIN_PERMISO = 1;

// Busca la ubicación con GPS y sin posiciones viejas: escucha varias lecturas y se queda con la más
// precisa. Si el GPS no da nada (bajo techo, apagado), el plan B es la ubicación por redes.
export function buscarUbicacion(geo = globalThis.navigator?.geolocation, { poner = setTimeout, quitar = clearTimeout } = {}) {
  return new Promise((listo, fallo) => {
    if (!geo) { fallo(new Error('sin-geolocalizacion')); return; }
    const punto = (p) => ({ lat: p.coords.latitude, lng: p.coords.longitude, precision: Math.round(p.coords.accuracy) });
    let mejor = null;
    let cerrado = false;
    let esperoDeMas = false;
    const relojes = [];
    let escucha = null;
    const cerrar = () => {
      cerrado = true;
      relojes.forEach(quitar);
      if (escucha !== null) geo.clearWatch(escucha);
    };
    const terminar = () => { cerrar(); listo(mejor); };
    const porRedes = () => {
      cerrar();
      geo.getCurrentPosition((p) => listo(punto(p)), fallo,
        { enableHighAccuracy: false, timeout: ESPERA_REDES_MS, maximumAge: 300000 });
    };
    escucha = geo.watchPosition((p) => {
      if (cerrado) return;
      const nuevo = punto(p);
      if (!mejor || nuevo.precision < mejor.precision) mejor = nuevo;
      if (mejor.precision <= PRECISION_BUENA_M || esperoDeMas) terminar();
    }, (e) => {
      if (cerrado) return;
      if (e?.code === SIN_PERMISO) { cerrar(); fallo(e); return; }
      if (mejor) terminar(); else porRedes();
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: LIMITE_GPS_MS });
    if (cerrado) { geo.clearWatch(escucha); return; } // respondió antes de devolver el id
    relojes.push(poner(() => { if (cerrado) return; if (mejor) terminar(); else esperoDeMas = true; }, ESPERA_GPS_MS));
    relojes.push(poner(() => { if (!cerrado) porRedes(); }, LIMITE_GPS_MS));
  });
}

// Lo que se le cuenta a la pareja junto a la hora: solo si la ubicación es aproximada o salió imprecisa.
export function textoPrecision(ubicacion) {
  if (ubicacion?.aproximada) return ' · aprox.';
  const m = ubicacion?.precision;
  return typeof m === 'number' && m > PRECISION_VISIBLE_M ? ` · ±${formatearDistancia(m / 1000)}` : '';
}

export async function guardarUbicacion(nube, pareja, { lat, lng, precision }, { aproximada = false } = {}) {
  const punto = aproximada ? redondearAproximada({ lat, lng }) : { lat, lng };
  if (!aproximada && typeof precision === 'number') punto.precision = precision;
  await nube.escribir(`${rutaUbicaciones(pareja.codigo)}/${pareja.lugar}`, {
    ...punto, aproximada, horaMs: Date.now(), hora: nube.horaServidor(),
  });
}

export async function leerUbicaciones(nube, pareja) {
  const [a, b] = await Promise.all(['a', 'b'].map((l) => nube.leer(`${rutaUbicaciones(pareja.codigo)}/${l}`)));
  return { a, b };
}
