import { prueba, igual, verdadero } from './corredor.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { precalentar } from '../js/nucleo/precalentar.js';

const ctxCon = (almacen, llamadas) => ({
  almacen,
  nube: async () => { llamadas.push('nube'); return { leer: async (ruta) => { llamadas.push(`leer ${ruta}`); } }; },
  modulos: [{ id: 'a', precalentar: () => llamadas.push('a') }, { id: 'b' }, { id: 'c', precalentar: () => { throw new Error('x'); } }],
});

prueba('precalentar: sin pareja no conecta ni carga nada', async () => {
  const llamadas = [];
  await precalentar(ctxCon(almacenEnMemoria(), llamadas));
  igual(llamadas, []);
});

prueba('precalentar: con pareja conecta la nube y prepara los módulos aunque uno falle', async () => {
  const llamadas = [];
  const almacen = almacenEnMemoria();
  almacen.escribir('okupa:pareja:actual', { codigo: 'K7PQ2M', lugar: 'a' });
  await precalentar(ctxCon(almacen, llamadas));
  igual(llamadas.sort(), ['a', 'leer parejas/K7PQ2M', 'nube'], 'también abre la conexión leyendo la pareja');
});

prueba('precalentar: pasa ctx a los módulos', async () => {
  const almacen = almacenEnMemoria();
  almacen.escribir('okupa:pareja:actual', { codigo: 'K7PQ2M', lugar: 'a' });
  let recibido;
  const ctx = { ...ctxCon(almacen, []), modulos: [{ id: 'f', precalentar: (c) => { recibido = c; } }] };
  await precalentar(ctx);
  verdadero(recibido === ctx, 'el módulo debe recibir el ctx');
});

prueba('precalentar: si la nube falla no rompe nada', async () => {
  const almacen = almacenEnMemoria();
  almacen.escribir('okupa:pareja:actual', { codigo: 'K7PQ2M', lugar: 'a' });
  await precalentar({ almacen, nube: async () => { throw new Error('sin red'); }, modulos: [] });
});
