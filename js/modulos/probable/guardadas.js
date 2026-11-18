// Rondas guardadas de «¿Quién es más probable?»: la copia vive en este celular (y viaja en el respaldo);
// en la nube solo queda la marca de quién la guardó, para poder decir «tu pareja también la guardó».
import { votaronTodos, coincidieron } from './logica.js';

export const CLAVE_GUARDADAS = 'okupa:probable:guardadas';
export const MAX_GUARDADAS = 100;

const LUGARES = ['a', 'b'];
const rutaMarca = (codigo, id) => `parejas/${codigo}/probable_guardadas/${id}`;
const eleccion = (v) => (v === 'a' || v === 'b' || v === 'todos' ? v : null);
const esRonda = (r) => r !== null && typeof r === 'object' && typeof r.id === 'string' && Array.isArray(r.frases);

// `votos` es { [indice de la frase]: { a, b } }. Solo cuentan las frases que los dos ya votaron (reveladas).
export function rondaParaGuardar(sala, votos, nombres, ahoraMs) {
  const frases = [];
  const votosReveladas = [];
  (sala.frases || []).forEach((f, i) => {
    if (!votaronTodos(sala, i) || !votos?.[i]) return;
    frases.push({ texto: f.texto, a: eleccion(votos[i].a), b: eleccion(votos[i].b) });
    votosReveladas.push(votos[i]);
  });
  return {
    id: sala.id,
    fecha: ahoraMs,
    tema: sala.tema,
    nombres: { a: nombres?.a ?? null, b: nombres?.b ?? null },
    frases,
    coincidencias: votosReveladas.filter((v) => coincidieron(v)).length,
    total: frases.length,
  };
}

export function leerGuardadas(almacen) {
  const lista = almacen.leer(CLAVE_GUARDADAS, []);
  return Array.isArray(lista) ? lista.filter(esRonda) : [];
}

// Reemplaza la del mismo id, la más nueva va primero y se guardan a lo sumo MAX_GUARDADAS.
export function guardarRonda(almacen, ronda) {
  const resto = leerGuardadas(almacen).filter((r) => r.id !== ronda.id);
  almacen.escribir(CLAVE_GUARDADAS, [ronda, ...resto].slice(0, MAX_GUARDADAS));
}

export function borrarGuardada(almacen, id) {
  almacen.escribir(CLAVE_GUARDADAS, leerGuardadas(almacen).filter((r) => r.id !== id));
}

export const marcarGuardada = (nube, pareja, salaId) =>
  nube.escribir(rutaMarca(pareja.codigo, salaId), { [pareja.lugar]: true }, { combinar: true });

// Anota en cada ronda guardada las marcas ya vistas (`marcas: { a?, b? }`) sin cambiar su orden: las
// marcas nunca se quitan, así que no hace falta volver a leer una ronda que ya tiene las dos.
export function recordarMarcas(almacen, vistas) {
  const lista = leerGuardadas(almacen);
  let cambio = false;
  const nueva = lista.map((r) => {
    const nuevas = LUGARES.filter((l) => vistas[r.id]?.[l] === true && r.marcas?.[l] !== true);
    if (nuevas.length === 0) return r;
    cambio = true;
    return { ...r, marcas: { ...r.marcas, ...Object.fromEntries(nuevas.map((l) => [l, true])) } };
  });
  if (cambio) almacen.escribir(CLAVE_GUARDADAS, nueva);
}

// Un fallo al leer una marca se toma como «sin marcas» (la lista sigue sirviendo sin internet); si se pasa
// `fallidas` (un Set), ahí quedan los ids cuya lectura falló.
export async function leerMarcas(nube, pareja, ids, fallidas = new Set()) {
  const pares = await Promise.all(ids.map(async (id) => {
    const marca = await nube.leer(rutaMarca(pareja.codigo, id)).catch(() => { fallidas.add(id); return null; });
    return [id, Object.fromEntries(LUGARES.filter((l) => marca?.[l] === true).map((l) => [l, true]))];
  }));
  return Object.fromEntries(pares);
}
