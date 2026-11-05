// Módulo "Diario": 3 preguntas al día iguales para los dos y un reto de inglés; se revelan cuando ambos responden.
import { cargarDiario } from './contenido.js';
import { crearPantallasDiario, detalleInicio } from './pantallas.js';

let datos = null;
const cargar = () => (datos ??= cargarDiario().catch((e) => { datos = null; throw e; }));
const pantallas = crearPantallasDiario({ cargar });

export default {
  id: 'diario',
  nombre: 'Diario',
  accesoJuntos: { ruta: 'diario', nombre: 'Diario', icono: '☼', detalle: (ctx) => detalleInicio(ctx.almacen) },
  rutas: {
    '': pantallas.hoy,
    'dia/:fecha': pantallas.dia,
    perfil: pantallas.perfil,
    pendientes: pantallas.pendientes,
    historial: pantallas.historial,
  },
};
