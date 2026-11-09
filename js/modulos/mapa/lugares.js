// Lugares de la pareja en el mapa: deseos (a donde quieren ir) y recuerdos (donde ya estuvieron),
// con la versión de cada uno (la del otro se ve al escribir la propia) y fotos comprimidas.

export const MAX_FOTOS = 6;
const MAX_NOMBRE = 80;
const MAX_NOTA = 300;
const MAX_VERSION = 1000;
const MAX_LADO_FOTO = 1200;
export const MAX_CARACTERES_FOTO = 380000; // las reglas permiten 400 000
const PHOTON = 'https://photon.komoot.io/api/';

const ruta = (codigo) => `parejas/${codigo}/lugares`;
const otroDe = (lugar) => (lugar === 'a' ? 'b' : 'a');
const limpiar = (t) => (typeof t === 'string' ? t.trim() : '');

let contador = 0;
function nuevoId() {
  contador = (contador + 1) % 1296;
  return `${Date.now().toString(36)}${contador.toString(36).padStart(2, '0')}${Math.floor(Math.random() * 1296).toString(36).padStart(2, '0')}`;
}

export function validarLugar({ nombre, lat, lng, tipo, nota = '', fecha }) {
  const n = limpiar(nombre);
  if (!n) return 'Ponle un nombre al lugar.';
  if (n.length > MAX_NOMBRE) return `El nombre puede tener máximo ${MAX_NOMBRE} caracteres.`;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) return 'Ese punto del mapa no es válido.';
  if (!['deseo', 'recuerdo'].includes(tipo)) return 'Escoge si es un deseo o un recuerdo.';
  if (limpiar(nota).length > MAX_NOTA) return `La nota puede tener máximo ${MAX_NOTA} caracteres.`;
  if (fecha !== undefined && fecha !== null && fecha !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return 'La fecha no es válida.';
  return null;
}

export async function crearLugar(nube, pareja, datos) {
  const error = validarLugar(datos);
  if (error) return { ok: false, error };
  const id = nuevoId();
  await nube.escribir(`${ruta(pareja.codigo)}/${id}`, {
    nombre: limpiar(datos.nombre),
    lat: datos.lat,
    lng: datos.lng,
    tipo: datos.tipo,
    nota: limpiar(datos.nota),
    ...(datos.tipo === 'recuerdo' && datos.fecha ? { fecha: datos.fecha } : {}),
    creadoPor: pareja.lugar,
    creadoMs: Date.now(),
  });
  return { ok: true, id };
}

export async function listarLugares(nube, pareja) {
  const lista = await nube.listar(ruta(pareja.codigo));
  return lista.map(({ id, datos }) => ({ id, ...datos })).sort((x, y) => (x.creadoMs || 0) - (y.creadoMs || 0));
}

export async function marcarFuimos(nube, pareja, id, fecha) {
  await nube.escribir(`${ruta(pareja.codigo)}/${id}`, { tipo: 'recuerdo', fecha }, { combinar: true });
}

export async function borrarLugar(nube, pareja, id) {
  const base = `${ruta(pareja.codigo)}/${id}`;
  const fotos = await nube.listar(`${base}/fotos`);
  await Promise.all(fotos.map((f) => nube.borrar(`${base}/fotos/${f.id}`)));
  await Promise.all(['a', 'b'].map((l) => nube.borrar(`${base}/versiones/${l}`)));
  await nube.borrar(base);
}

export async function guardarVersion(nube, pareja, id, texto) {
  const t = limpiar(texto);
  if (!t) return { ok: false, error: 'Escribe tu versión.' };
  if (t.length > MAX_VERSION) return { ok: false, error: `Máximo ${MAX_VERSION} caracteres.` };
  await nube.escribir(`${ruta(pareja.codigo)}/${id}/versiones/${pareja.lugar}`, { texto: t, horaMs: Date.now() });
  // Marca visible para los dos (solo "ya escribió", nunca el texto).
  await nube.escribir(`${ruta(pareja.codigo)}/${id}`, { versiones: { [pareja.lugar]: true } }, { combinar: true });
  return { ok: true };
}

export async function leerLugar(nube, pareja, id) {
  const datos = await nube.leer(`${ruta(pareja.codigo)}/${id}`);
  return datos ? { id, ...datos } : null;
}

// La del otro solo se pide si ya existe la propia (las reglas también lo exigen).
export async function leerVersiones(nube, pareja, id) {
  const base = `${ruta(pareja.codigo)}/${id}/versiones`;
  const mia = await nube.leer(`${base}/${pareja.lugar}`);
  if (!mia) return { mia: null, otra: null, otraEscrita: null };
  const otra = await nube.leer(`${base}/${otroDe(pareja.lugar)}`);
  return { mia: mia.texto, otra: otra?.texto ?? null, otraEscrita: Boolean(otra) };
}

// Reduce la foto a 1200 px de lado mayor y baja la calidad hasta que quepa en Firestore.
export function comprimirFoto(fuente) {
  const ancho0 = fuente.naturalWidth || fuente.width;
  const alto0 = fuente.naturalHeight || fuente.height;
  let escala = Math.min(1, MAX_LADO_FOTO / Math.max(ancho0, alto0));
  for (;;) {
    const ancho = Math.max(1, Math.round(ancho0 * escala));
    const alto = Math.max(1, Math.round(alto0 * escala));
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    lienzo.getContext('2d').drawImage(fuente, 0, 0, ancho, alto);
    for (const calidad of [0.75, 0.6, 0.45]) {
      const datos = lienzo.toDataURL('image/jpeg', calidad);
      if (datos.length <= MAX_CARACTERES_FOTO) return { datos, ancho, alto };
    }
    escala *= 0.8;
  }
}

export async function agregarFoto(nube, pareja, id, { datos, ancho, alto }) {
  if (typeof datos !== 'string' || !datos.startsWith('data:image/jpeg;base64,') || datos.length > MAX_CARACTERES_FOTO) {
    return { ok: false, error: 'Esa foto no se pudo preparar.' };
  }
  const base = `${ruta(pareja.codigo)}/${id}/fotos`;
  if ((await nube.listar(base)).length >= MAX_FOTOS) return { ok: false, error: `Máximo ${MAX_FOTOS} fotos por lugar.` };
  await nube.escribir(`${base}/${nuevoId()}`, { datos, ancho, alto, por: pareja.lugar, creadaMs: Date.now() });
  return { ok: true };
}

export async function listarFotos(nube, pareja, id) {
  const lista = await nube.listar(`${ruta(pareja.codigo)}/${id}/fotos`);
  return lista.map(({ id: fid, datos }) => ({ id: fid, ...datos })).sort((x, y) => (x.creadaMs || 0) - (y.creadaMs || 0));
}

export async function borrarFoto(nube, pareja, id, fotoId) {
  await nube.borrar(`${ruta(pareja.codigo)}/${id}/fotos/${fotoId}`);
}

// Busca lugares por nombre en Photon (gratis, sin clave), con preferencia por Colombia.
export async function buscarLugares(texto, fetchFn = (u) => fetch(u)) {
  const q = limpiar(texto);
  if (!q) return [];
  const r = await fetchFn(`${PHOTON}?q=${encodeURIComponent(q)}&limit=6&lat=4.6&lon=-74.1`);
  if (!r.ok) throw new Error(`Búsqueda: ${r.status}`);
  const { features = [] } = await r.json();
  return features
    .filter((f) => f?.properties?.name && Array.isArray(f?.geometry?.coordinates))
    .map(({ properties: p, geometry: { coordinates: [lng, lat] } }) => ({
      nombre: p.name,
      detalle: [p.city !== p.name ? p.city : null, p.state, p.country].filter(Boolean).join(', '),
      lat,
      lng,
    }));
}
