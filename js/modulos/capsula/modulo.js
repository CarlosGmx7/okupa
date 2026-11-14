// Módulo "Cápsula del tiempo": cartas que solo se pueden abrir desde una fecha escogida.
import { crearPantallasCapsula, detalleInicio } from './pantallas.js';
import { miPareja } from '../../nucleo/pareja.js';
import { refrescarCopia } from './datos.js';

const pantallas = crearPantallasCapsula();

// Renueva en segundo plano la copia local de las cartas; nunca lanza ni rechaza.
async function precalentar(ctx) {
  try {
    const pareja = ctx?.almacen && miPareja(ctx.almacen);
    if (!pareja) return;
    const nube = await ctx.nube();
    await refrescarCopia(nube, pareja, ctx.almacen);
  } catch { /* sin conexión o sin permiso: queda la copia anterior */ }
}

export default {
  id: 'capsula',
  nombre: 'Cápsula',
  precalentar,
  accesoJuntos: { ruta: 'capsula', nombre: 'Cápsula', icono: '✉', detalle: (ctx) => detalleInicio(ctx.almacen) },
  rutas: {
    '': pantallas.lista,
    nueva: pantallas.nueva,
    ':id': pantallas.ver,
  },
};
