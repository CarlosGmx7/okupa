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

const PRECISION_BUENA_M = 30; // con esto ya se distingue la cuadra: no hace falta afinar más
const PRECISION_VISIBLE_M = 100; // peor que esto se le cuenta a la pareja
// La lectura rápida de siempre (la que funcionaba): por redes o GPS, la que el celular tenga, de hasta 1 min atrás.
const RAPIDA = { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 };
export const AFINAR_MS = 8000; // cuánto se le da al GPS para mejorar la lectura
export const LIMITE_UBICACION_MS = 30000; // nunca se busca más que esto, conteste o no el celular
const SIN_PERMISO = 1;
const SIN_RESPUESTA = 3;

// Busca la ubicación en dos pasos: primero la lectura rápida; si no es precisa (o no llega), el GPS la
// afina unos segundos y se usa la mejor. Con un tope total: nunca se queda «buscando» para siempre.
export function buscarUbicacion(geo = globalThis.navigator?.geolocation, { poner = setTimeout, quitar = clearTimeout } = {}) {
  return new Promise((listo, fallo) => {
    if (!geo) { fallo(new Error('sin-geolocalizacion')); return; }
    const punto = (p) => ({ lat: p.coords.latitude, lng: p.coords.longitude, precision: Math.round(p.coords.accuracy) });
    let mejor = null;
    let cerrado = false;
    let escucha = null;
    const relojes = [];
    const cerrar = () => {
      cerrado = true;
      relojes.forEach(quitar);
      if (escucha !== null) geo.clearWatch(escucha);
    };
    const terminar = (error) => {
      if (cerrado) return;
      cerrar();
      if (mejor) listo(mejor); else fallo(error ?? Object.assign(new Error('sin-respuesta'), { code: SIN_RESPUESTA }));
    };
    const anotar = (p) => {
      const nuevo = punto(p);
      if (!mejor || nuevo.precision < mejor.precision) mejor = nuevo;
    };
    // Paso 2: escuchar el GPS unos segundos. Sin lectura al terminar, se sigue esperando hasta el tope total.
    const afinar = () => {
      escucha = geo.watchPosition((p) => {
        if (cerrado) return;
        anotar(p);
        if (mejor.precision <= PRECISION_BUENA_M || afinado) terminar();
      }, (e) => { if (!cerrado) terminar(e); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: LIMITE_UBICACION_MS });
      if (cerrado) { geo.clearWatch(escucha); return; } // respondió antes de devolver el id
      relojes.push(poner(() => { if (mejor) terminar(); else afinado = true; }, AFINAR_MS));
    };
    let afinado = false;
    relojes.push(poner(() => terminar(), LIMITE_UBICACION_MS));
    // Paso 1: la lectura rápida.
    geo.getCurrentPosition((p) => {
      if (cerrado) return;
      anotar(p);
      if (mejor.precision <= PRECISION_BUENA_M) terminar(); else afinar();
    }, (e) => {
      if (cerrado) return;
      if (e?.code === SIN_PERMISO) { cerrar(); fallo(e); return; }
      afinar();
    }, RAPIDA);
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
