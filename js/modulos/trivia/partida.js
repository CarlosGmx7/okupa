// Reglas de una partida de trivia, sin nube ni pantalla: turnos, respuestas y puntaje.
// Todas las funciones devuelven una partida nueva; ninguna muta la que recibe.

export const MS_PREGUNTA = 20000;
export const MS_GRACIA = 2000;
export const MS_REVELADO = 5000;
const LUGARES = ['a', 'b'];

// 100 por acertar y hasta 50 más por rapidez. Cada celular mide su propio tiempo.
export function puntos(acerto, ms) {
  if (!acerto) return 0;
  const t = Math.min(MS_PREGUNTA, Math.max(0, ms));
  return 100 + Math.round((50 * (MS_PREGUNTA - t)) / MS_PREGUNTA);
}

export const nuevaPartida = ({ id, anfitrion, preguntas }) => ({
  id, estado: 'esperando', anfitrion, preguntas, indice: 0, ronda: 0, respuestas: { a: {}, b: {} },
});

// Solo cuenta la primera respuesta de cada uno a la pregunta en curso.
export function responder(partida, lugar, { indice, opcion, ms }) {
  if (partida.estado !== 'jugando' || indice !== partida.indice) return partida;
  if (partida.respuestas[lugar]?.[indice] !== undefined) return partida;
  return {
    ...partida,
    respuestas: { ...partida.respuestas, [lugar]: { ...partida.respuestas[lugar], [indice]: { opcion, ms } } },
  };
}

export const ambosRespondieron = (partida) =>
  LUGARES.every((l) => partida.respuestas[l]?.[partida.indice] !== undefined);

export function avanzar(partida) {
  const ultima = partida.indice >= partida.preguntas.length - 1;
  return ultima
    ? { ...partida, estado: 'terminada', ronda: partida.ronda + 1 }
    : { ...partida, indice: partida.indice + 1, ronda: partida.ronda + 1 };
}

// La pregunta de un lugar: en "¿Cuánto me conoces?" cada uno tiene la suya.
export const preguntaDe = (partida, i, lugar) => {
  const p = partida.preguntas[i];
  return p.para ? p.para[lugar] : p;
};

export function resultadoPregunta(partida, i) {
  const de = (lugar) => {
    const r = partida.respuestas[lugar]?.[i];
    const correcta = preguntaDe(partida, i, lugar).respuesta;
    const acerto = r !== undefined && r.opcion === correcta;
    return { opcion: r === undefined ? null : r.opcion, acerto, puntos: acerto ? puntos(true, r.ms) : 0 };
  };
  return { correcta: preguntaDe(partida, i, 'a').respuesta, a: de('a'), b: de('b') };
}

export function puntaje(partida) {
  const total = { a: 0, b: 0 };
  partida.preguntas.forEach((_, i) => {
    const r = resultadoPregunta(partida, i);
    total.a += r.a.puntos;
    total.b += r.b.puntos;
  });
  return total;
}

export function ganador(partida) {
  const { a, b } = puntaje(partida);
  return a === b ? 'empate' : a > b ? 'a' : 'b';
}
