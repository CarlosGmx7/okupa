import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { ErrorNube } from '../js/nucleo/nube.js';

const microtareas = () => new Promise((r) => setTimeout(r, 0));

prueba('nube falsa: escribir y leer; leer lo que no existe da null', async () => {
  const nube = crearMundoFalso().nube('u1');
  igual(await nube.leer('parejas/X'), null);
  await nube.escribir('parejas/X', { a: 1 });
  igual(await nube.leer('parejas/X'), { a: 1 });
});

prueba('nube falsa: combinar mezcla campos y subcampos de mapas', async () => {
  const nube = crearMundoFalso().nube('u1');
  await nube.escribir('parejas/X', { lugares: { a: 'u1', b: null }, nombres: { a: 'C' } });
  await nube.escribir('parejas/X', { lugares: { b: 'u2' } }, { combinar: true });
  igual(await nube.leer('parejas/X'), { lugares: { a: 'u1', b: 'u2' }, nombres: { a: 'C' } });
});

prueba('nube falsa: dos celulares ven los mismos datos y escuchar avisa cambios', async () => {
  const mundo = crearMundoFalso();
  const recibidos = [];
  const cancelar = mundo.nube('u2').escuchar('parejas/X', (d) => recibidos.push(d));
  await microtareas();
  await mundo.nube('u1').escribir('parejas/X', { v: 1 });
  await microtareas();
  cancelar();
  await mundo.nube('u1').escribir('parejas/X', { v: 2 });
  await microtareas();
  igual(recibidos, [null, { v: 1 }]);
});

prueba('nube falsa: listar devuelve los documentos directos de una colección', async () => {
  const nube = crearMundoFalso().nube('u1');
  await nube.escribir('parejas/X/dias/d1', { n: 1 });
  await nube.escribir('parejas/X/dias/d2', { n: 2 });
  await nube.escribir('parejas/X/dias/d1/respuestas/gustos_a', { n: 3 });
  const lista = await nube.listar('parejas/X/dias');
  igual(lista.map((d) => d.id).sort(), ['d1', 'd2']);
  igual(lista.find((d) => d.id === 'd2').datos, { n: 2 });
});

prueba('nube falsa: transacciones concurrentes no pisan lo leído', async () => {
  const nube = crearMundoFalso().nube('u1');
  await nube.escribir('c/x', { n: 0 });
  const sumar = () => nube.transaccion(async (tx) => {
    const d = await tx.leer('c/x');
    tx.escribir('c/x', { n: d.n + 1 });
  });
  await Promise.all([sumar(), sumar()]);
  igual(await nube.leer('c/x'), { n: 2 });
});

prueba('nube falsa: desconectada rechaza con sin-conexion', async () => {
  const mundo = crearMundoFalso();
  const nube = mundo.nube('u1');
  mundo.desconectar();
  let error = null;
  try { await nube.leer('parejas/X'); } catch (e) { error = e; }
  verdadero(error instanceof ErrorNube && error.codigo === 'sin-conexion', String(error));
  mundo.reconectar();
  igual(await nube.leer('parejas/X'), null);
});

prueba('nube falsa: devuelve copias, no referencias', async () => {
  const nube = crearMundoFalso().nube('u1');
  await nube.escribir('parejas/X', { lista: [1] });
  const leido = await nube.leer('parejas/X');
  leido.lista.push(2);
  igual(await nube.leer('parejas/X'), { lista: [1] });
});

prueba('nube falsa: iniciar devuelve el uid del celular', async () => {
  igual(await crearMundoFalso().nube('u7').iniciar(), { uid: 'u7' });
});
