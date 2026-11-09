// Módulo "Match": votar en secreto planes y deseos; solo se revela lo que los dos quieren.
import { cargarTarjetas } from './logica.js';
import { crearPantallasMatch, detalleInicio } from './pantallas.js';

let tarjetas = null;
const cargar = () => (tarjetas ??= cargarTarjetas().catch((e) => { tarjetas = null; throw e; }));
const pantallas = crearPantallasMatch({ cargar });

export default {
  id: 'match',
  nombre: 'Match',
  precalentar: () => cargar().catch(() => {}),
  accesoJuntos: { ruta: 'match', nombre: 'Match', icono: '♥', detalle: (ctx) => detalleInicio(ctx.almacen) },
  rutas: {
    '': pantallas.mazo,
    matches: pantallas.matches,
    nueva: pantallas.nueva,
  },
};
