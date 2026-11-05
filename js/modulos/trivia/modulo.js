// Módulo "Trivia": partidas en vivo de cultura general, cada uno en su celular.
import { cargarTrivia } from './banco.js';
import { crearPantallasTrivia } from './pantallas.js';

let datos = null;
const cargar = () => (datos ??= cargarTrivia().catch((e) => { datos = null; throw e; }));
const pantallas = crearPantallasTrivia({ cargar });

export default {
  id: 'trivia',
  nombre: 'Trivia',
  accesoJuntos: { ruta: 'trivia', nombre: 'Trivia en vivo', icono: '✦' },
  rutas: {
    '': pantallas.sala,
    'jugar/:id': pantallas.juego,
  },
};
