// Módulo «¿Quién es más probable?»: votar en secreto quién de los dos es más probable y ver si coinciden.
import { cargarFrases } from './logica.js';
import { crearPantallasProbable } from './pantallas.js';

let frases = null;
const cargar = () => (frases ??= cargarFrases().catch((e) => { frases = null; throw e; }));
const pantallas = crearPantallasProbable({ cargar });

export default {
  id: 'probable',
  nombre: '¿Quién es más probable?',
  precalentar: () => cargar().catch(() => {}),
  accesoJuntos: { ruta: 'probable', nombre: '¿Quién es más probable?', icono: '⚖', seccion: 'jugar', orden: 2 },
  rutas: {
    '': pantallas.inicio,
    'jugar/:id': pantallas.juego,
    frases: pantallas.frases,
  },
};