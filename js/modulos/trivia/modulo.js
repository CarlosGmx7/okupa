// Módulo "Trivia": partidas en vivo de cultura general, cada uno en su celular.
import { cargarTrivia } from './banco.js';
import { cargarPreguntasDiario } from './conoces.js';
import { crearPantallasTrivia } from './pantallas.js';
import { partidaPendiente } from './sala.js';
import { miPareja } from '../../nucleo/pareja.js';
import { refrescarEsperando, textoEsperando } from '../../nucleo/esperando.js';

// Las preguntas del diario sirven para "¿Cuánto me conoces?"; si no cargan, la trivia sigue sin ellas.
let datos = null;
const cargar = () => (datos ??= Promise.all([cargarTrivia(), cargarPreguntasDiario().catch(() => [])])
  .then(([trivia, diario]) => ({ ...trivia, diario }))
  .catch((e) => { datos = null; throw e; }));
const pantallas = crearPantallasTrivia({ cargar });

export default {
  id: 'trivia',
  nombre: 'Trivia',
  // Las preguntas y la sala que el otro abrió; nunca lanza ni rechaza.
  precalentar: async (ctx) => {
    const pareja = ctx?.almacen && miPareja(ctx.almacen);
    await Promise.allSettled([
      cargar(),
      pareja ? refrescarEsperando(ctx, 'trivia', pareja, partidaPendiente) : null,
    ]);
  },
  accesoJuntos: { ruta: 'trivia', nombre: 'Trivia en vivo', icono: '✦', seccion: 'jugar', orden: 1, detalle: (ctx) => textoEsperando(ctx.almacen, miPareja(ctx.almacen), 'trivia') },
  rutas: {
    '': pantallas.sala,
    'jugar/:id': pantallas.juego,
  },
};
