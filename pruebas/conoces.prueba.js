import { prueba, igual, verdadero } from './corredor.js';
import { semilla } from './matematicas.prueba.js';
import { preguntasConoces, insertarConoces, MIN_DIAS } from '../js/modulos/trivia/conoces.js';

const PREGUNTAS = [
  { id: 'dia-0087', tema: 'gustos', intensidad: 1, tipo: 'opciones', texto: '¿Playa o montaña?', opciones: [{ texto: 'Playa' }, { texto: 'Montaña' }, { texto: 'Las dos' }, { texto: 'Ninguna' }] },
  { id: 'dia-0002', tema: 'musica', intensidad: 1, tipo: 'escala', texto: '¿Qué tanto te importa?', extremos: ['Nada', 'Mucho'] },
  { id: 'dia-0076', tema: 'recuerdos', intensidad: 1, tipo: 'opciones', espejo: [0, 1], texto: '¿Quién dijo «te amo» primero?', opciones: [{ texto: 'Yo' }, { texto: 'Tú' }, { texto: 'Al tiempo' }] },
  { id: 'dia-0097', tema: 'musica', intensidad: 1, tipo: 'escala', texto: '¿Qué tanto te gusta {artista_fav_otro}?', extremos: ['Nada', 'Mucho'] },
];
const NOMBRES = { a: 'Carlos', b: 'Sofi' };
const dias = (n) => Array.from({ length: n }, (_, i) => `2026-11-0${i + 1}`);
const perfil = (respuestas, n = MIN_DIAS) => ({ aprendidos: dias(n), respuestas });

prueba('conoces: sin 5 días aprendidos de cada uno no hay', () => {
  const perfiles = { a: perfil({ 'dia-0087': 1 }), b: perfil({ 'dia-0087': 0 }, MIN_DIAS - 1) };
  igual(preguntasConoces({ perfiles, preguntas: PREGUNTAS, nombres: NOMBRES, rnd: semilla(1) }), []);
});

prueba('conoces: cada uno recibe una pregunta sobre el otro con la respuesta que dio', () => {
  const perfiles = { a: perfil({ 'dia-0087': 1 }), b: perfil({ 'dia-0087': 0 }) };
  const [primera, ...resto] = preguntasConoces({ perfiles, preguntas: PREGUNTAS, nombres: NOMBRES, rnd: semilla(2) });
  igual(resto, [], 'solo hay una pregunta posible por persona');
  const { a, b } = primera.para;
  verdadero(a.texto.includes('Sofi') && a.texto.includes('¿Playa o montaña?'), a.texto);
  igual([a.opciones[a.respuesta], b.opciones[b.respuesta]], ['Playa', 'Montaña']);
  verdadero(b.texto.includes('Carlos'), b.texto);
  igual([a.tema, a.tipo, b.tema], ['conoces', 'opciones', 'conoces']);
  verdadero(a.dato && b.dato, 'traen dato');
});

prueba('conoces: la escala se pregunta por rangos', () => {
  const perfiles = { a: perfil({ 'dia-0002': 2 }), b: perfil({ 'dia-0002': 8 }) };
  const [{ para }] = preguntasConoces({ perfiles, preguntas: PREGUNTAS, nombres: NOMBRES, rnd: semilla(3) });
  igual(para.a.opciones, ['De 1 a 3', 'De 4 a 5', 'De 6 a 7', 'De 8 a 10']);
  igual([para.a.respuesta, para.b.respuesta], [3, 0]);
  verdadero(para.a.texto.includes('1 = Nada') && para.a.texto.includes('10 = Mucho'), para.a.texto);
});

prueba('conoces: no usa preguntas espejo ni plantillas, y no pasa de 2', () => {
  igual(preguntasConoces({ perfiles: { a: perfil({ 'dia-0076': 0, 'dia-0097': 5 }), b: perfil({ 'dia-0076': 1, 'dia-0097': 9 }) }, preguntas: PREGUNTAS, nombres: NOMBRES, rnd: semilla(4) }), []);
  const todas = { 'dia-0087': 0, 'dia-0002': 4 };
  const varias = preguntasConoces({ perfiles: { a: perfil(todas), b: perfil(todas) }, preguntas: PREGUNTAS, nombres: NOMBRES, rnd: semilla(5) });
  igual(varias.length, 2);
  verdadero(varias[0].para.a.id !== varias[1].para.a.id, 'sin repetir dentro de la partida');
});

prueba('conoces: insertarlas deja la partida en 10', () => {
  const diez = Array.from({ length: 10 }, (_, i) => ({ id: `art-00${i}`, tema: 'arte' }));
  const conoces = [{ para: { a: { id: 'x' }, b: { id: 'y' } } }, { para: { a: { id: 'z' }, b: { id: 'w' } } }];
  const partida = insertarConoces(diez, conoces, semilla(6));
  igual(partida.length, 10);
  igual(partida.filter((p) => p.para).length, 2);
  igual(diez.filter((p) => p.para).length, 0, 'no muta');
  igual(insertarConoces(diez, [], semilla(6)), diez);
});
