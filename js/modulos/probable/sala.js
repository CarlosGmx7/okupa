// «¿Quién es más probable?» en la nube: sala, votos, vistas y frases propias de la pareja.
import { marcarVistas, reveladas, validarFrase, MAX_PROPIAS } from './logica.js';
import { avisar, idAviso } from '../../nucleo/avisos.js';

const MAX_CONTADAS = 50;
const LUGARES = ['a', 'b'];

export const rutaSala = (codigo, id) => `parejas/${codigo}/probable/${id}`;
export const rutaVoto = (codigo, id, indice, lugar) => `${rutaSala(codigo, id)}/votos/${indice}_${lugar}`;
export const rutaUso = (codigo) => `parejas/${codigo}/estado/uso`;
const rutaFrases = (codigo) => `parejas/${codigo}/probable_frases`;
const nuevoId = () => `q-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const nuevoIdFrase = () => `f-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function crearSala(nube, pareja, { tema, frases, id = nuevoId() }) {
  // Las reglas exigen crearla `esperando` y con el anfitrión que la crea.
  await nube.escribir(rutaSala(pareja.codigo, id), {
    anfitrion: pareja.lugar,
    estado: 'esperando',
    tema,
    frases,
    indice: 0,
    ronda: 0,
    votaron: {},
    creada: nube.horaServidor(),
    creadaMs: Date.now(),
  });
  await nube.escribir(rutaUso(pareja.codigo), { probableAbierta: id }, { combinar: true });
  await avisar(nube, pareja, 'probable', idAviso('probable', { idSala: id }));
  return id;
}

const abierta = (s) => s?.estado === 'esperando' || s?.estado === 'jugando';

export async function salaPendiente(nube, pareja) {
  const uso = await nube.leer(rutaUso(pareja.codigo));
  if (!uso?.probableAbierta) return null;
  const s = await nube.leer(rutaSala(pareja.codigo, uso.probableAbierta));
  return abierta(s) ? { ...s, id: uso.probableAbierta } : null;
}

export async function unirse(nube, pareja, id) {
  await nube.transaccion(async (tx) => {
    const s = await tx.leer(rutaSala(pareja.codigo, id));
    if (s?.estado === 'esperando') tx.escribir(rutaSala(pareja.codigo, id), { estado: 'jugando' }, { combinar: true });
  });
}

export const cancelarSala = (nube, pareja, id) =>
  nube.escribir(rutaSala(pareja.codigo, id), { estado: 'cancelada' }, { combinar: true });

// El voto se crea una sola vez y nunca se cambia (las reglas lo exigen). Si ya existía, no se toca.
export async function votar(nube, pareja, id, { indice, voto }) {
  const ruta = rutaVoto(pareja.codigo, id, indice, pareja.lugar);
  try {
    await nube.transaccion(async (tx) => {
      if (!(await tx.leer(ruta))) tx.escribir(ruta, { voto });
    });
  } catch (e) {
    // Si lo rechazaron porque ya estaba creado, es un voto repetido: no es un error.
    if (!(await nube.leer(ruta))) throw e;
  }
  await nube.escribir(rutaSala(pareja.codigo, id), { votaron: { [indice]: { [pareja.lugar]: true } } }, { combinar: true });
}

export async function leerVotos(nube, pareja, id, indice, lugares = LUGARES) {
  const votos = {};
  for (const l of lugares) {
    const v = await nube.leer(rutaVoto(pareja.codigo, id, indice, l));
    if (v) votos[l] = v.voto;
  }
  return votos;
}

// Avanza solo si la sala sigue en la ronda que vio este celular: dos toques no avanzan dos frases.
export function intentarAvanzar(nube, pareja, id, { ronda }) {
  return nube.transaccion(async (tx) => {
    const s = await tx.leer(rutaSala(pareja.codigo, id));
    if (!s || s.estado !== 'jugando' || s.ronda !== ronda) return false;
    const ultima = s.indice >= s.frases.length - 1;
    tx.escribir(rutaSala(pareja.codigo, id), {
      indice: ultima ? s.indice : s.indice + 1,
      estado: ultima ? 'terminada' : 'jugando',
      ronda: ronda + 1,
    }, { combinar: true });
    return true;
  });
}

export async function leerVistas(nube, pareja) {
  return ((await nube.leer(rutaUso(pareja.codigo))) || {}).vistasProbable || {};
}

// Anota como vistas solo las frases reveladas, una sola vez aunque los dos celulares cierren.
// No borra la sala: el otro celular puede seguir leyéndola.
export function cerrarSala(nube, pareja, sala, idsDelTema) {
  return nube.transaccion(async (tx) => {
    const uso = (await tx.leer(rutaUso(pareja.codigo))) || {};
    const contadas = uso.probableContadas || [];
    if (contadas.includes(sala.id)) return false;
    const ids = sala.frases.slice(0, reveladas(sala)).map((f) => f.id);
    const nuevo = {
      ...uso,
      vistasProbable: { ...(uso.vistasProbable || {}), [sala.tema]: marcarVistas((uso.vistasProbable || {})[sala.tema], ids, idsDelTema) },
      probableContadas: [...contadas, sala.id].slice(-MAX_CONTADAS),
    };
    if (uso.probableAbierta === sala.id) delete nuevo.probableAbierta;
    tx.escribir(rutaUso(pareja.codigo), nuevo);
    return true;
  });
}

export const escucharSala = (nube, pareja, id, fn) =>
  nube.escuchar(rutaSala(pareja.codigo, id), (datos) => fn(datos ? { ...datos, id } : null));

export function latir(nube, pareja, id, { cadaMs = 5000 } = {}) {
  const pulso = () => nube.escribir(rutaSala(pareja.codigo, id), { senal: { [pareja.lugar]: nube.horaServidor() } }, { combinar: true })
    .catch(() => {});
  pulso();
  const reloj = setInterval(pulso, cadaMs);
  return () => clearInterval(reloj);
}

export async function listarPropias(nube, pareja) {
  return (await nube.listar(rutaFrases(pareja.codigo)))
    .map(({ id, datos }) => ({ ...datos, id }))
    .sort((x, y) => (y.creadaMs || 0) - (x.creadaMs || 0));
}

export async function crearPropia(nube, pareja, texto) {
  const error = validarFrase(texto);
  if (error) return { ok: false, error };
  if ((await nube.listar(rutaFrases(pareja.codigo))).length >= MAX_PROPIAS) {
    return { ok: false, error: `Ya tienen ${MAX_PROPIAS} frases; borra alguna.` };
  }
  const id = nuevoIdFrase();
  await nube.escribir(`${rutaFrases(pareja.codigo)}/${id}`, { texto: texto.trim(), creadaMs: Date.now() });
  return { ok: true, id };
}

export const borrarPropia = (nube, pareja, id) => nube.borrar(`${rutaFrases(pareja.codigo)}/${id}`);
