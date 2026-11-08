// Módulo "Trivia": partidas en vivo de cultura general, cada uno en su celular.
import { cargarTrivia } from './banco.js';
import { cargarPreguntasDiario } from './conoces.js';
import { crearPantallasTrivia } from './pantallas.js';

// Las preguntas del diario sirven para "¿Cuánto me conoces?"; si no cargan, la trivia sigue sin ellas.
let datos = null;
const cargar = () => (datos ??= Promise.all([cargarTrivia(), cargarPreguntasDiario().catch(() => [])])
  .then(([trivia, diario]) => ({ ...trivia, diario }))
  .catch((e) => { datos = null; throw e; }));
const pantallas = crearPantallasTrivia({ cargar });

export default {
  id: 'trivia',
  nombre: 'Trivia',
  precalentar: () => cargar().catch(() => {}),
  accesoJuntos: { ruta: 'trivia', nombre: 'Trivia en vivo', icono: '✦' },
  rutas: {
    '': pantallas.sala,
    'jugar/:id': pantallas.juego,
  },
};
