// Módulo «¿Quién es más probable?»: votar en secreto quién de los dos es más probable y ver si coinciden.
import { cargarFrases } from './logica.js';
import { crearPantallasProbable } from './pantallas.js';
import { salaPendiente } from './sala.js';
import { miPareja } from '../../nucleo/pareja.js';
import { refrescarEsperando, textoEsperando } from '../../nucleo/esperando.js';

let frases = null;
const cargar = () => (frases ??= cargarFrases().catch((e) => { frases = null; throw e; }));
const pantallas = crearPantallasProbable({ cargar });

export default {
  id: 'probable',
  nombre: '¿Quién es más probable?',
  // Las frases y la sala que el otro abrió; nunca lanza ni rechaza.
  precalentar: async (ctx) => {
    const pareja = ctx?.almacen && miPareja(ctx.almacen);
    await Promise.allSettled([
      cargar(),
      pareja ? refrescarEsperando(ctx, 'probable', pareja, salaPendiente) : null,
    ]);
  },
  accesoJuntos: { ruta: 'probable', nombre: '¿Quién es más probable?', icono: '⚖', seccion: 'jugar', orden: 2, detalle: (ctx) => textoEsperando(ctx.almacen, miPareja(ctx.almacen), 'probable') },
  rutas: {
    '': pantallas.inicio,
    'jugar/:id': pantallas.juego,
    frases: pantallas.frases,
    guardadas: pantallas.guardadas,
    'guardadas/:id': pantallas.guardadaDetalle,
  },
};