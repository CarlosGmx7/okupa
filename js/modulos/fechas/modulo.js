// Módulo "Fechas": aniversario, cumpleaños y fechas propias de la pareja, con avisos y cuenta de días juntos.
import { crearPantallasFechas, detalleInicio } from './pantallas.js';
import { miPareja } from '../../nucleo/pareja.js';
import { refrescarCopia } from './datos.js';

const pantallas = crearPantallasFechas();

// Renueva en segundo plano la copia local de las fechas; nunca lanza ni rechaza.
async function precalentar(ctx) {
  try {
    const pareja = ctx?.almacen && miPareja(ctx.almacen);
    if (!pareja) return;
    const nube = await ctx.nube();
    await refrescarCopia(nube, pareja, ctx.almacen);
  } catch { /* sin conexión o sin permiso: queda la copia anterior */ }
}

export default {
  id: 'fechas',
  nombre: 'Fechas',
  precalentar,
  accesoJuntos: { ruta: 'fechas', nombre: 'Fechas', icono: '✦', detalle: (ctx) => detalleInicio(ctx.almacen) },
  rutas: {
    '': pantallas.lista,
    'editar/:id': pantallas.editar,
    nueva: pantallas.nueva,
  },
};
