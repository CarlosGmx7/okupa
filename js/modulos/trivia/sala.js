// La partida de trivia en la nube: crear, unirse, responder y avanzar sin pisarse entre los dos celulares.
import { nuevaPartida, responder, avanzar, ganador, resultadoPregunta } from './partida.js';
import { marcarVistas } from './banco.js';
import { avisar, idAviso } from '../../nucleo/avisos.js';

const MAX_FALLIDAS = 200;
const MAX_CONTADAS = 50;

export const rutaPartidas = (codigo) => `parejas/${codigo}/partidas`;
export const rutaUso = (codigo) => `parejas/${codigo}/estado/uso`;
const rutaPartida = (pareja, id) => `${rutaPartidas(pareja.codigo)}/${id}`;
const nuevoId = () => `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function crearSala(nube, pareja, { preguntas, id = nuevoId() }) {
  await nube.escribir(rutaPartida(pareja, id), {
    ...nuevaPartida({ id, anfitrion: pareja.lugar, preguntas }),
    creada: nube.horaServidor(),
    creadaMs: Date.now(),
  });
  // Puntero a la última sala: buscar la pendiente es una lectura, no listar todas las partidas.
  await nube.escribir(rutaUso(pareja.codigo), { salaAbierta: id }, { combinar: true });
  await avisar(nube, pareja, 'trivia', idAviso('trivia', { idPartida: id }));
  return id;
}

const abierta = (p) => p?.estado === 'esperando' || p?.estado === 'jugando';

// La partida más reciente que no ha terminado ni se canceló.
export async function partidaPendiente(nube, pareja) {
  const uso = await nube.leer(rutaUso(pareja.codigo));
  if (uso?.salaAbierta) {
    const p = await nube.leer(rutaPartida(pareja, uso.salaAbierta));
    return abierta(p) ? { ...p, id: uso.salaAbierta } : null;
  }
  // Datos de antes del puntero: se busca como antes.
  const abiertas = (await nube.listar(rutaPartidas(pareja.codigo)))
    .map(({ id, datos }) => ({ ...datos, id }))
    .filter(abierta)
    .sort((x, y) => (y.creadaMs || 0) - (x.creadaMs || 0));
  return abiertas[0] || null;
}

export const cancelarSala = (nube, pareja, id) =>
  nube.escribir(rutaPartida(pareja, id), { estado: 'cancelada' }, { combinar: true });

export async function unirse(nube, pareja, id) {
  await nube.transaccion(async (tx) => {
    const p = await tx.leer(rutaPartida(pareja, id));
    if (p?.estado === 'esperando') tx.escribir(rutaPartida(pareja, id), { estado: 'jugando' }, { combinar: true });
  });
}

// Solo cuenta la primera respuesta: la transacción lee y decide con `responder`.
export async function enviarRespuesta(nube, pareja, id, { indice, opcion, ms }) {
  await nube.transaccion(async (tx) => {
    const p = await tx.leer(rutaPartida(pareja, id));
    if (!p || responder(p, pareja.lugar, { indice, opcion, ms }) === p) return;
    tx.escribir(rutaPartida(pareja, id), { respuestas: { [pareja.lugar]: { [indice]: { opcion, ms } } } }, { combinar: true });
  });
}

// Avanza solo si la partida sigue en la ronda que vio este celular: dos celulares no avanzan dos veces.
export function intentarAvanzar(nube, pareja, id, { ronda }) {
  return nube.transaccion(async (tx) => {
    const p = await tx.leer(rutaPartida(pareja, id));
    if (!p || p.estado !== 'jugando' || p.ronda !== ronda) return false;
    const { indice, estado } = avanzar(p);
    tx.escribir(rutaPartida(pareja, id), { indice, estado, ronda: ronda + 1 }, { combinar: true });
    return true;
  });
}

export const escucharPartida = (nube, pareja, id, fn) =>
  nube.escuchar(rutaPartida(pareja, id), (datos) => fn(datos ? { ...datos, id } : null));

// Señal de vida para que el otro sepa si este celular sigue en la partida.
export function latir(nube, pareja, id, { cadaMs = 5000 } = {}) {
  const pulso = () => nube.escribir(rutaPartida(pareja, id), { senal: { [pareja.lugar]: nube.horaServidor() } }, { combinar: true })
    .catch(() => {});
  pulso();
  const reloj = setInterval(pulso, cadaMs);
  return () => clearInterval(reloj);
}

export async function leerUso(nube, pareja) {
  const uso = (await nube.leer(rutaUso(pareja.codigo))) || {};
  return {
    victorias: { a: uso.victorias?.a || 0, b: uso.victorias?.b || 0 },
    vistasTrivia: uso.vistasTrivia || {},
    fallidas: uso.fallidas || [],
  };
}

const idDeVista = (p) => (p.tema === 'ingles' ? p.entrada : p.id);

// Suma la victoria y lo que salió, una sola vez aunque los dos celulares la cierren.
export function cerrarPartida(nube, pareja, partida) {
  return nube.transaccion(async (tx) => {
    const uso = (await tx.leer(rutaUso(pareja.codigo))) || {};
    const contadas = uso.partidasContadas || [];
    if (contadas.includes(partida.id)) return false;
    const g = ganador(partida);
    const victorias = { a: uso.victorias?.a || 0, b: uso.victorias?.b || 0 };
    if (g !== 'empate') victorias[g] += 1;
    const normales = partida.preguntas.filter((p) => !p.para);
    const falladas = partida.preguntas
      .map((p, i) => ({ p, r: resultadoPregunta(partida, i) }))
      .filter(({ p, r }) => !p.para && p.tema !== 'matematicas' && (!r.a.acerto || !r.b.acerto))
      .map(({ p }) => idDeVista(p));
    tx.escribir(rutaUso(pareja.codigo), {
      ...uso,
      victorias,
      vistasTrivia: marcarVistas(uso.vistasTrivia || {}, normales),
      fallidas: [...(uso.fallidas || []).filter((id) => !falladas.includes(id)), ...falladas].slice(-MAX_FALLIDAS),
      partidasContadas: [...contadas, partida.id].slice(-MAX_CONTADAS),
    });
    return true;
  });
}
