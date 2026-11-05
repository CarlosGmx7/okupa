import { prueba, igual, verdadero } from './corredor.js';
import {
  MS_PREGUNTA, MS_GRACIA, MS_REVELADO, puntos, nuevaPartida, responder, ambosRespondieron, avanzar,
  puntaje, resultadoPregunta, ganador,
} from '../js/modulos/trivia/partida.js';

const vf = (i, respuesta) => ({ id: `p${i}`, tema: 'arte', tipo: 'vf', texto: `t${i}`, respuesta, dato: 'd' });
const preguntas = Array.from({ length: 10 }, (_, i) => vf(i, i % 2 === 0));
const jugando = () => ({ ...nuevaPartida({ id: 'x', anfitrion: 'a', preguntas }), estado: 'jugando' });

prueba('partida: tiempos acordados', () => {
  igual([MS_PREGUNTA, MS_GRACIA, MS_REVELADO], [20000, 2000, 5000]);
});

prueba('partida: puntos por acierto y rapidez', () => {
  igual(puntos(true, 0), 150);
  igual(puntos(true, 10000), 125);
  igual(puntos(true, 20000), 100);
  igual(puntos(true, 25000), 100);
  igual(puntos(true, -5), 150);
  igual(puntos(false, 100), 0);
});

prueba('partida: nueva partida espera al otro y no muta las preguntas', () => {
  const p = nuevaPartida({ id: 'x', anfitrion: 'b', preguntas });
  igual([p.estado, p.anfitrion, p.indice, p.ronda, p.respuestas], ['esperando', 'b', 0, 0, { a: {}, b: {} }]);
});

prueba('partida: solo cuenta la primera respuesta', () => {
  let p = responder(jugando(), 'a', { indice: 0, opcion: true, ms: 3000 });
  p = responder(p, 'a', { indice: 0, opcion: false, ms: 100 });
  igual(p.respuestas.a[0], { opcion: true, ms: 3000 });
});

prueba('partida: se ignora la respuesta a otra pregunta o fuera de juego', () => {
  igual(responder(jugando(), 'a', { indice: 1, opcion: true, ms: 1 }).respuestas.a, {});
  const esperando = nuevaPartida({ id: 'x', anfitrion: 'a', preguntas });
  igual(responder(esperando, 'a', { indice: 0, opcion: true, ms: 1 }).respuestas.a, {});
});

prueba('partida: ambos respondieron y avanzar hasta terminar', () => {
  let p = responder(jugando(), 'a', { indice: 0, opcion: true, ms: 1 });
  igual(ambosRespondieron(p), false);
  p = responder(p, 'b', { indice: 0, opcion: false, ms: 1 });
  igual(ambosRespondieron(p), true);
  for (let i = 0; i < 9; i++) p = avanzar(p);
  igual([p.indice, p.ronda, p.estado], [9, 9, 'jugando']);
  p = avanzar(p);
  igual(p.estado, 'terminada');
});

prueba('partida: puntaje, resultado por pregunta y ganador', () => {
  let p = jugando();
  p = responder(p, 'a', { indice: 0, opcion: true, ms: 0 });
  p = responder(p, 'b', { indice: 0, opcion: false, ms: 0 });
  igual(resultadoPregunta(p, 0), { correcta: true, a: { opcion: true, acerto: true, puntos: 150 }, b: { opcion: false, acerto: false, puntos: 0 } });
  p = avanzar(p);
  p = responder(p, 'b', { indice: 1, opcion: false, ms: 20000 });
  igual(resultadoPregunta(p, 1).a, { opcion: null, acerto: false, puntos: 0 });
  igual(puntaje(p), { a: 150, b: 100 });
  igual(ganador(p), 'a');
  igual(ganador(jugando()), 'empate');
});

prueba('partida: cada uno gana según su propio tiempo, sin relojes compartidos', () => {
  let p = jugando();
  p = responder(p, 'a', { indice: 0, opcion: true, ms: 2000 });
  p = responder(p, 'b', { indice: 0, opcion: true, ms: 18000 });
  igual(puntaje(p), { a: puntos(true, 2000), b: puntos(true, 18000) });
  verdadero(puntaje(p).a > puntaje(p).b);
});
