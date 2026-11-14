import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearPareja, unirse as unirsePareja } from '../js/nucleo/pareja.js';
import { crearPantallasFechas, detalleInicio } from '../js/modulos/fechas/pantallas.js';
import { listarFechas, guardarFecha, guardarCopia, leerCopia } from '../js/modulos/fechas/datos.js';
import { esperar, hasta, boton, salir } from './diario-pantallas.prueba.js';

const HOY = '2026-11-13';

async function parejaFechas() {
  const mundo = crearMundoFalso();
  const almA = almacenEnMemoria();
  const almB = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), almA, { nombre: 'Carlos' });
  await unirsePareja(mundo.nube('u2'), almB, { codigo, nombre: 'Yuli' });
  const nube = mundo.nube('u1');
  const div = document.createElement('div');
  const rutas = [];
  const pantallas = crearPantallasFechas({ hoy: () => HOY });
  const ctx = { almacen: almA, nube: async () => nube, ir: (r) => rutas.push(r), refrescar: () => {} };
  return { div, ctx, rutas, pantallas, nube, pareja: { codigo, lugar: 'a' }, almacen: almA };
}

// Sustituye window.confirm durante n; devuelve las preguntas que se hicieron.
async function conConfirm(respuesta, fn) {
  const original = window.confirm;
  const preguntas = [];
  window.confirm = (q) => { preguntas.push(q); return respuesta; };
  try { await fn(); } finally { window.confirm = original; }
  return preguntas;
}

const COD = 'K7PQ2M';
function almacenConPareja(lugar = 'a') {
  const alm = almacenEnMemoria();
  alm.escribir('okupa:pareja:actual', { codigo: COD, lugar });
  return alm;
}

const textoDe = (div) => div.textContent.replace(/\s+/g, ' ');

prueba('fechas: sin inicio pide la fecha', async () => {
  const { div, ctx, pantallas } = await parejaFechas();
  await pantallas.lista(div, {}, ctx);
  await hasta(() => div.querySelector('a[href="#/fechas/editar/inicio"]'));
  verdadero(textoDe(div).includes('¿Desde cuándo están juntos?'), textoDe(div));
  verdadero(!textoDe(div).includes('Llevamos'));
  verdadero(div.querySelector('a[href="#/fechas/nueva"]'), 'falta Agregar fecha');
  salir();
});

prueba('fechas: con inicio muestra los días y las próximas en orden', async () => {
  const { div, ctx, pantallas, nube, pareja } = await parejaFechas();
  await guardarFecha(nube, pareja, { tipo: 'inicio', fecha: '2025-11-14' }, HOY);
  await guardarFecha(nube, pareja, { tipo: 'otra', fecha: '2025-11-20', nombre: 'Primer viaje' }, HOY);
  await guardarFecha(nube, pareja, { tipo: 'cumple', fecha: '1995-12-01', de: 'b' }, HOY);
  await pantallas.lista(div, {}, ctx);
  await hasta(() => textoDe(div).includes('Llevamos'));
  const t = textoDe(div);
  verdadero(t.includes('Llevamos 365 días juntos'), t);
  const aniv = t.indexOf('1 año juntos');
  const viaje = t.indexOf('Primer viaje');
  const cumple = t.indexOf('Cumpleaños de Yuli');
  verdadero(aniv > 0 && aniv < viaje && viaje < cumple, `orden: ${aniv} ${viaje} ${cumple}`);
  verdadero(t.includes('mañana') && t.includes('en 7 días'), t);
  // «Nuestras fechas»: inicio, cumples (el de Carlos vacío) y la propia.
  verdadero(t.includes('Nuestras fechas') && t.includes('Sin fecha · Agregar'), t);
  verdadero(div.querySelector('a[href="#/fechas/editar/inicio"]'));
  verdadero(div.querySelector('a[href="#/fechas/editar/cumple_a"]'));
  verdadero(div.querySelector('a[href="#/fechas/editar/cumple_b"]'));
  salir();
});

prueba('fechas: guardar una fecha nueva la lista y actualiza la copia', async () => {
  const { div, ctx, rutas, pantallas, nube, pareja, almacen } = await parejaFechas();
  await pantallas.nueva(div, {}, ctx);
  await hasta(() => div.querySelector('input[type="date"]'));
  div.querySelector('input[type="date"]').value = '2025-12-24';
  div.querySelector('input[type="text"]').value = 'Primer viaje';
  boton(div, 'Guardar').click();
  await hasta(() => rutas.includes('fechas'));
  const filas = await listarFechas(nube, pareja);
  igual(filas.length, 1);
  igual(filas[0].nombre, 'Primer viaje');
  igual(leerCopia(almacen, pareja.codigo).fechas.length, 1, 'la copia local se actualizó');
  const lista = document.createElement('div');
  await pantallas.lista(lista, {}, ctx);
  await hasta(() => textoDe(lista).includes('Primer viaje'));
  const fila = lista.querySelector('a[href^="#/fechas/editar/f-"]');
  verdadero(fila, 'tocar la fecha abre editar/:id');
  salir();
});

prueba('fechas: editar y borrar una fecha propia', async () => {
  const { div, ctx, rutas, pantallas, nube, pareja, almacen } = await parejaFechas();
  const r = await guardarFecha(nube, pareja, { tipo: 'otra', fecha: '2025-12-24', nombre: 'Viaje' }, HOY);
  await pantallas.editar(div, { id: r.id }, ctx);
  await hasta(() => div.querySelector('input[type="date"]')?.value === '2025-12-24');
  igual(div.querySelector('input[type="text"]').value, 'Viaje');
  div.querySelector('input[type="text"]').value = 'Viaje a Cartagena';
  boton(div, 'Guardar').click();
  await hasta(() => rutas.includes('fechas'));
  const filas = await listarFechas(nube, pareja);
  igual(filas.length, 1);
  igual(filas[0].nombre, 'Viaje a Cartagena');
  const div2 = document.createElement('div');
  await pantallas.editar(div2, { id: r.id }, ctx);
  await hasta(() => boton(div2, 'Borrar'));
  const preguntas = await conConfirm(true, async () => {
    boton(div2, 'Borrar').click();
    await hasta(() => rutas.length === 2);
  });
  igual(preguntas, ['¿Borrar esta fecha para los dos?']);
  igual((await listarFechas(nube, pareja)).length, 0);
  igual(leerCopia(almacen, pareja.codigo).fechas.length, 0);
  salir();
});

prueba('fechas: editar inicio con fecha futura muestra el error', async () => {
  const { div, ctx, rutas, pantallas, nube, pareja } = await parejaFechas();
  await pantallas.editar(div, { id: 'inicio' }, ctx);
  await hasta(() => div.querySelector('input[type="date"]'));
  verdadero(!boton(div, 'Quitar fecha'), 'sin fecha guardada no hay qué quitar');
  div.querySelector('input[type="date"]').value = '2027-01-01';
  boton(div, 'Guardar').click();
  await hasta(() => div.querySelector('.aviso')?.textContent);
  igual(div.querySelector('.aviso').textContent, 'La fecha de inicio no puede ser futura.');
  igual(rutas, []);
  igual((await listarFechas(nube, pareja)).length, 0);
  salir();
});

prueba('fechas: quitar el inicio guardado', async () => {
  const { div, ctx, rutas, pantallas, nube, pareja } = await parejaFechas();
  await guardarFecha(nube, pareja, { tipo: 'inicio', fecha: '2025-11-14' }, HOY);
  await pantallas.editar(div, { id: 'inicio' }, ctx);
  await hasta(() => boton(div, 'Quitar fecha'));
  const preguntas = await conConfirm(true, async () => {
    boton(div, 'Quitar fecha').click();
    await hasta(() => rutas.includes('fechas'));
  });
  igual(preguntas, ['¿Quitar esta fecha para los dos?']);
  igual((await listarFechas(nube, pareja)).length, 0);
  salir();
});

prueba('fechas: detalleInicio sin copia', () => {
  igual(detalleInicio(almacenEnMemoria(), HOY), 'Agreguen sus fechas');
});

prueba('fechas: detalleInicio con inicio muestra los días y la próxima', () => {
  const almacen = almacenConPareja();
  guardarCopia(almacen, [
    { id: 'inicio', tipo: 'inicio', fecha: '2025-11-14' },
    { id: 'cumple_b', tipo: 'cumple', fecha: '1995-11-20', de: 'b' },
  ], { a: 'Carlos', b: 'Yuli' }, COD);
  igual(detalleInicio(almacen, HOY), '365 días · 1 año juntos en 1 d');
});

prueba('fechas: detalleInicio con próxima hoy', () => {
  const almacen = almacenConPareja();
  guardarCopia(almacen, [{ id: 'cumple_b', tipo: 'cumple', fecha: '1995-11-13', de: 'b' }], { a: 'Carlos', b: 'Yuli' }, COD);
  igual(detalleInicio(almacen, HOY), 'Cumpleaños de Yuli hoy');
  const con = almacenConPareja();
  guardarCopia(con, [{ id: 'inicio', tipo: 'inicio', fecha: '2025-10-01' }, { id: 'cumple_b', tipo: 'cumple', fecha: '1995-11-13', de: 'b' }], { a: 'Carlos', b: 'Yuli' }, COD);
  igual(detalleInicio(con, HOY), '409 días · Cumpleaños de Yuli hoy');
});

prueba('fechas: detalleInicio con copia vacía invita a agregar', () => {
  const almacen = almacenConPareja();
  guardarCopia(almacen, [], { a: null, b: null }, COD);
  igual(detalleInicio(almacen, HOY), 'Agreguen sus fechas');
});

prueba('fechas: detalleInicio ignora la copia de otra pareja o sin pareja', () => {
  const fechas = [{ id: 'inicio', tipo: 'inicio', fecha: '2025-11-14' }];
  const otra = almacenConPareja();
  guardarCopia(otra, fechas, { a: 'C', b: 'Y' }, 'ZZZZZZ');
  igual(detalleInicio(otra, HOY), 'Agreguen sus fechas');
  const sin = almacenEnMemoria();
  guardarCopia(sin, fechas, { a: 'C', b: 'Y' }, COD);
  igual(detalleInicio(sin, HOY), 'Agreguen sus fechas');
});

prueba('fechas: detalleInicio titula «Tu cumpleaños» el de este celular', () => {
  const fechas = [{ id: 'cumple_b', tipo: 'cumple', fecha: '1995-11-13', de: 'b' }];
  const b = almacenConPareja('b');
  guardarCopia(b, fechas, { a: null, b: null }, COD);
  igual(detalleInicio(b, HOY), 'Tu cumpleaños hoy');
  const nombrado = almacenConPareja('b');
  guardarCopia(nombrado, fechas, { a: 'Carlos', b: 'Yuli' }, COD);
  igual(detalleInicio(nombrado, HOY), 'Tu cumpleaños hoy');
});

prueba('fechas: cancelar la confirmación no borra nada', async () => {
  const { div, ctx, rutas, pantallas, nube, pareja } = await parejaFechas();
  const r = await guardarFecha(nube, pareja, { tipo: 'otra', fecha: '2025-12-24', nombre: 'Viaje' }, HOY);
  await pantallas.editar(div, { id: r.id }, ctx);
  await hasta(() => boton(div, 'Borrar'));
  const preguntas = await conConfirm(false, async () => { boton(div, 'Borrar').click(); await esperar(100); });
  igual(preguntas.length, 1);
  igual(rutas, []);
  igual((await listarFechas(nube, pareja)).length, 1);
  salir();
});

prueba('fechas: la lista sin fechas y el formulario del inicio no escriben «null»', async () => {
  const { div, ctx, pantallas } = await parejaFechas();
  await pantallas.lista(div, {}, ctx);
  await hasta(() => div.querySelector('a[href="#/fechas/nueva"]'));
  verdadero(!textoDe(div).includes('null'), textoDe(div));
  const form = document.createElement('div');
  await pantallas.editar(form, { id: 'inicio' }, ctx);
  await hasta(() => form.querySelector('input[type="date"]'));
  verdadero(!textoDe(form).includes('null'), textoDe(form));
  salir();
});

prueba('fechas: sin nombre, el cumpleaños propio dice «Tu cumpleaños» y el otro «de tu pareja»', async () => {
  const { div, ctx, pantallas, nube, pareja } = await parejaFechas();
  await nube.escribir(`parejas/${pareja.codigo}`, { nombres: { a: null, b: null } }, { combinar: true });
  await pantallas.lista(div, {}, ctx);
  await hasta(() => div.querySelector('a[href="#/fechas/nueva"]'));
  const t = textoDe(div);
  verdadero(t.includes('Tu cumpleaños') && t.includes('Cumpleaños de tu pareja'), t);
  verdadero(!t.includes('Tú'), t);
  salir();
});
prueba('fechas: detalleInicio sin nombre dice «Cumpleaños de tu pareja»', () => {
  const almacen = almacenConPareja();
  guardarCopia(almacen, [{ id: 'cumple_b', tipo: 'cumple', fecha: '1995-11-13', de: 'b' }], { a: null, b: null }, COD);
  igual(detalleInicio(almacen, HOY), 'Cumpleaños de tu pareja hoy');
});

prueba('fechas: el formulario del cumpleaños no deja escoger fechas futuras', async () => {
  const { div, ctx, pantallas } = await parejaFechas();
  await pantallas.editar(div, { id: 'cumple_b' }, ctx);
  await hasta(() => div.querySelector('input[type="date"]'));
  igual(div.querySelector('input[type="date"]').max, HOY);
  div.querySelector('input[type="date"]').value = '2027-01-01';
  boton(div, 'Guardar').click();
  await hasta(() => div.querySelector('.aviso')?.textContent);
  igual(div.querySelector('.aviso').textContent, 'La fecha de cumpleaños no puede ser futura.');
  salir();
});