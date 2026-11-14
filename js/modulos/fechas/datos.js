// Fechas de la pareja: se guardan en la nube (parejas/{c}/fechas/{id}) y cada celular
// guarda una copia local para que los avisos y la pantalla funcionen sin conexión.

export const MAX_OTRAS = 30;
export const CLAVE_COPIA = 'okupa:fechas';

const REGEX_DIA = /^\d{4}-\d{2}-\d{2}$/;
const ERROR_NOMBRE = 'Escribe un nombre de 1 a 40 letras.';
const ruta = (pareja) => `parejas/${pareja.codigo}/fechas`;

const pad = (n) => String(n).padStart(2, '0');
export function hoyLocal(ahora = new Date()) {
  return `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;
}

function diaValido(texto) {
  if (typeof texto !== 'string' || !REGEX_DIA.test(texto)) return false;
  const [a, m, d] = texto.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

export function validarFecha({ tipo, fecha, nombre, de }, hoy) {
  if (!['inicio', 'cumple', 'otra'].includes(tipo)) return 'Tipo de fecha desconocido.';
  if (!diaValido(fecha)) return 'Escoge una fecha válida.';
  if (tipo === 'inicio' && fecha > hoy) return 'La fecha de inicio no puede ser futura.';
  if (tipo === 'cumple' && de !== 'a' && de !== 'b') return 'Escoge de quién es el cumpleaños.';
  if (tipo === 'cumple' && fecha > hoy) return 'La fecha de cumpleaños no puede ser futura.';
  if (tipo === 'otra') {
    const n = typeof nombre === 'string' ? nombre.trim() : '';
    if (n.length < 1 || n.length > 40) return ERROR_NOMBRE;
  }
  return null;
}

export async function listarFechas(nube, pareja) {
  const filas = await nube.listar(ruta(pareja));
  return filas.map(({ id, datos }) => {
    const f = { id, tipo: datos.tipo, fecha: datos.fecha };
    if (datos.de !== undefined) f.de = datos.de;
    if (datos.nombre !== undefined) f.nombre = datos.nombre;
    return f;
  });
}

export async function guardarFecha(nube, pareja, datos, hoy = hoyLocal()) {
  const error = validarFecha(datos, hoy);
  if (error) return { ok: false, error };
  const base = ruta(pareja);
  const ahora = Date.now();
  let id;
  let doc;
  if (datos.tipo === 'inicio') {
    id = 'inicio';
    doc = { tipo: 'inicio', fecha: datos.fecha, actualizadaMs: ahora };
  } else if (datos.tipo === 'cumple') {
    id = `cumple_${datos.de}`;
    doc = { tipo: 'cumple', fecha: datos.fecha, de: datos.de, actualizadaMs: ahora };
  } else {
    const existentes = await nube.listar(base);
    id = datos.id && /^f-[a-z0-9]{4,30}$/.test(datos.id) ? datos.id : null;
    if (!id || !existentes.some((f) => f.id === id)) {
      if (existentes.filter((f) => f.datos?.tipo === 'otra').length >= MAX_OTRAS) {
        return { ok: false, error: `Ya tienen ${MAX_OTRAS} fechas propias. Borren alguna para agregar otra.` };
      }
    }
    id ||= `f-${ahora.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    doc = { tipo: 'otra', fecha: datos.fecha, nombre: datos.nombre.trim(), actualizadaMs: ahora };
  }
  await nube.escribir(`${base}/${id}`, doc);
  return { ok: true, id };
}

export async function borrarFecha(nube, pareja, id) {
  await nube.borrar(`${ruta(pareja)}/${id}`);
}

// La copia se ata al código de la pareja para no mostrar fechas de una pareja anterior.
export function guardarCopia(almacen, fechas, nombres, codigo) {
  almacen.escribir(CLAVE_COPIA, { codigo, fechas, nombres });
}

export function leerCopia(almacen, codigo) {
  const c = almacen.leer(CLAVE_COPIA, null);
  if (!c || !codigo || c.codigo !== codigo || !Array.isArray(c.fechas)) return null;
  const n = c.nombres || {};
  return { fechas: c.fechas, nombres: { a: n.a ?? null, b: n.b ?? null } };
}

export async function refrescarCopia(nube, pareja, almacen) {
  const fechas = await listarFechas(nube, pareja);
  const doc = await nube.leer(`parejas/${pareja.codigo}`);
  const nombres = { a: doc?.nombres?.a ?? null, b: doc?.nombres?.b ?? null };
  guardarCopia(almacen, fechas, nombres, pareja.codigo);
  return fechas;
}