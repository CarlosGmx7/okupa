// Módulo "Mapa": dónde está cada uno (la última vez que abrió el mapa) y la ruta entre los dos.
import { crearPantallasMapa, cargarMapLibre } from './pantallas.js';

const pantallas = crearPantallasMapa();

export default {
  id: 'mapa',
  nombre: 'Mapa',
  precalentar: () => cargarMapLibre().catch(() => {}),
  accesoJuntos: { ruta: 'mapa', nombre: 'Mapa', icono: '⌖' },
  rutas: { '': pantallas.mapa },
};
