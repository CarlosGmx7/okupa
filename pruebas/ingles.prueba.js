import { prueba, igual, verdadero } from './corredor.js';
import { generarPreguntaIngles, tiposPara, validarVocabulario } from '../js/compartido/ingles.js';
import { cargarTrivia, problemaDePreguntaTrivia } from '../js/modulos/trivia/banco.js';
import { semilla } from './matematicas.prueba.js';

const { vocabulario } = await cargarTrivia();
const TEMAS = new Set(['ingles']);
const minus = (t) => t.trim().toLowerCase();
const termino = (e) => e.ejemplo.match(/\{([^}]+)\}/)[1];

prueba('inglés: vocabulario válido y suficiente', () => {
  igual(validarVocabulario(vocabulario), []);
  verdadero(vocabulario.length >= 1500, `hay ${vocabulario.length}`);
  // Los falsos amigos son menos: solo entran los verificados (la trampa no es traducción válida).
  const minimos = { palabra: 300, phrasal: 300, expresion: 300, falso_amigo: 180 };
  for (const [tipo, minimo] of Object.entries(minimos)) {
    const n = vocabulario.filter((e) => e.tipo === tipo).length;
    verdadero(n >= minimo, `${tipo}: ${n}`);
  }
});

prueba('inglés: cada entrada genera sus tipos con exactamente una opción correcta', () => {
  const rnd = semilla(7);
  const esperada = { es_en: (e) => e.en, en_es: (e) => e.es, completar: termino, falso_amigo: (e) => e.es };
  for (const e of vocabulario) {
    for (const tipo of tiposPara(e)) {
      const p = generarPreguntaIngles(e, vocabulario, rnd, tipo);
      const problema = problemaDePreguntaTrivia(p, TEMAS);
      verdadero(!problema, `${e.id} ${tipo}: ${problema} ${JSON.stringify(p.opciones)}`);
      igual(p.id, `${e.id}-${tipo}`);
      igual(minus(p.opciones[p.respuesta]), minus(esperada[tipo](e)), `${e.id} ${tipo}`);
      igual(p.opciones.filter((o) => minus(o) === minus(esperada[tipo](e))).length, 1, `${e.id} ${tipo}: correcta repetida`);
    }
  }
});

prueba('inglés: los falsos amigos ponen la trampa entre las opciones', () => {
  const amigos = vocabulario.filter((e) => e.tipo === 'falso_amigo');
  verdadero(amigos.length > 0);
  for (const e of amigos) {
    igual(tiposPara(e).includes('en_es'), false, `${e.id} no debe preguntarse como en_es`);
    const p = generarPreguntaIngles(e, vocabulario, semilla(3), 'falso_amigo');
    verdadero(p.opciones.includes(e.trampa), `${e.id}: falta la trampa "${e.trampa}"`);
  }
});

prueba('inglés: completar oculta el término y el dato da el ejemplo completo', () => {
  const e = vocabulario.find((x) => x.tipo === 'phrasal');
  const p = generarPreguntaIngles(e, vocabulario, semilla(5), 'completar');
  verdadero(p.texto.includes('____') && !p.texto.includes(`{${termino(e)}}`) && !p.texto.includes('{'), p.texto);
  verdadero(p.dato.includes(e.ejemplo.replace(/[{}]/g, '')), p.dato);
});

prueba('inglés: validarVocabulario detecta entradas malas', () => {
  const buena = { id: 'en-9001', es: 'rendirse', en: 'give up', tipo: 'phrasal', ejemplo: 'Never {give up}.' };
  const errores = validarVocabulario([
    buena,
    { ...buena },
    { ...buena, id: 'en-9002', es: 'otra', en: 'other', ejemplo: 'Sin llaves.' },
    { ...buena, id: 'en-9003', es: 'x', en: 'x', tipo: 'falso_amigo', ejemplo: 'An {x}.' },
    { ...buena, id: 'en-9004', es: 'y', en: 'y', tipo: 'jerga', ejemplo: 'A {y}.' },
    { ...buena, id: 'en-9005', en: 'give in', ejemplo: 'I {give in}.' },
  ]).join('\n');
  for (const pista of ['en-9001', 'en-9002', 'en-9003', 'en-9004', 'en-9005']) verdadero(errores.includes(pista), `falta ${pista}:\n${errores}`);
});
