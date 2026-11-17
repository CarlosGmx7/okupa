// Módulo «Ruleta de citas»: un plan al azar según presupuesto y lugar. Funciona sin pareja y sin nube.
import { crearPantallasRuleta } from './pantallas.js';
import { cargarPlanes } from './logica.js';

let planes = null;
const cargar = () => (planes ??= cargarPlanes().catch((e) => { planes = null; throw e; }));
const pantallas = crearPantallasRuleta({ cargar });

export default {
  id: 'ruleta',
  nombre: 'Ruleta',
  accesoJuntos: { ruta: 'ruleta', nombre: 'Ruleta', icono: '◎', seccion: 'nosotros', orden: 5 },
  rutas: {
    '': pantallas.principal,
  },
};
