import { prueba, igual, verdadero } from './corredor.js';
import { cargarTrivia, validarBancos, problemaDePreguntaTrivia, TEMAS_BANCO } from '../js/modulos/trivia/banco.js';

const MINIMO_POR_TEMA = 40;
const trivia = await cargarTrivia();
const TEMAS = new Set(trivia.temas.map((t) => t.id));

prueba('trivia contenido: temas en el orden acordado', () => {
  igual(trivia.temas.map((t) => t.id), ['arte', 'historia', 'ciencia', 'matematicas', 'deportes', 'canserbero', 'lana', 'ingles']);
  verdadero(trivia.temas.every((t) => t.nombre && t.icono && /^#[0-9a-f]{6}$/i.test(t.color)), 'cada tema con nombre, ícono y color');
});

prueba('trivia contenido: bancos válidos', () => {
  igual(validarBancos(trivia.bancos, trivia.temas), []);
});

prueba(`trivia contenido: al menos ${MINIMO_POR_TEMA} preguntas por tema de banco`, () => {
  for (const tema of TEMAS_BANCO) {
    const n = trivia.bancos[tema]?.length || 0;
    verdadero(n >= MINIMO_POR_TEMA, `${tema} tiene ${n}`);
  }
});

const base = { id: 'art-900', tema: 'arte', tipo: 'vf', texto: '¿Algo?', respuesta: true, dato: 'Porque sí.', ref: 'https://es.wikipedia.org' };
const opciones = { ...base, tipo: 'opciones', opciones: ['A', 'B', 'C', 'D'], respuesta: 2 };

prueba('trivia: problemaDePreguntaTrivia acepta formas buenas y detecta las malas', () => {
  igual(problemaDePreguntaTrivia(base, TEMAS), null);
  igual(problemaDePreguntaTrivia(opciones, TEMAS), null);
  const malas = [
    { ...base, opciones: ['A', 'B'] },
    { ...base, respuesta: 'sí' },
    { ...opciones, opciones: ['A', 'B', 'C'] },
    { ...opciones, opciones: ['A', 'B', 'B', 'D'] },
    { ...opciones, respuesta: 4 },
    { ...base, dato: '  ' },
    { ...base, texto: '' },
    { ...base, tema: 'astrologia' },
    { ...base, tipo: 'abierta' },
  ];
  for (const m of malas) verdadero(problemaDePreguntaTrivia(m, TEMAS), JSON.stringify(m));
});

prueba('trivia: validarBancos detecta ids repetidos, prefijos, falta de ref y balance V/F roto', () => {
  const temas = [{ id: 'arte' }];
  const vf = (i, respuesta) => ({ ...base, id: `art-${String(i).padStart(3, '0')}`, respuesta });
  const errores = validarBancos({
    arte: [
      ...Array.from({ length: 10 }, (_, i) => vf(i + 1, true)),
      { ...base, id: 'art-001' },
      { ...base, id: 'his-001' },
      { ...base, id: 'art-099', ref: '' },
    ],
  }, temas).join('\n');
  for (const pista of ['art-001', 'his-001', 'art-099', 'arte: V/F']) verdadero(errores.includes(pista), `falta "${pista}" en:\n${errores}`);
});
