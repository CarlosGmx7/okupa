import { prueba, igual, verdadero } from './corredor.js';
import { pantallaInicio, pantallaAcerca } from '../js/nucleo/inicio.js';
import { el } from '../js/nucleo/ui.js';
import { almacenEnMemoria } from './pareja.prueba.js';

const ctx = (modulos, almacen = almacenEnMemoria()) => ({ modulos, almacen, ir() {}, refrescar() {} });

prueba('inicio: sin pareja, una tarjeta destacada arriba invita a enlazar', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, ctx([{ id: 'a', tarjetasInicio: () => [el('p', { clase: 't' }, 'Tarjeta A')] }]));
  const tarjeta = div.querySelector('.juntos .juntos-principal');
  verdadero(tarjeta, 'falta la tarjeta de pareja');
  igual(tarjeta.getAttribute('href'), '#/pareja');
  verdadero(tarjeta.textContent.includes('Jueguen juntos') && tarjeta.textContent.includes('Enlazar'), tarjeta.textContent);
  verdadero(tarjeta.compareDocumentPosition(div.querySelector('.t')) & Node.DOCUMENT_POSITION_FOLLOWING, 'va antes de las tarjetas de los módulos');
  verdadero(!div.querySelector('.inicio-pie a[href="#/pareja"]'), 'ya no está escondida en el pie');
});

prueba('inicio: sin pareja también se ven las secciones para jugar juntos', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, ctx([{ id: 'diario', accesoJuntos: { ruta: 'diario', nombre: 'Diario', icono: '☼' } }]));
  const enlace = [...div.querySelectorAll('.juntos a')].find((x) => x.textContent.includes('Diario'));
  verdadero(enlace, div.querySelector('.juntos')?.outerHTML);
  igual(enlace.getAttribute('href'), '#/diario');
  verdadero(div.querySelector('.juntos').textContent.includes('Enlazar'), 'sigue invitando a enlazar');
});

prueba('inicio: con pareja, la tarjeta dice que los celulares están enlazados', () => {
  const almacen = almacenEnMemoria();
  almacen.escribir('okupa:pareja:actual', { codigo: 'K7PQ2M', lugar: 'a' });
  const div = document.createElement('div');
  pantallaInicio(div, {}, ctx([], almacen));
  verdadero(div.querySelector('.juntos').textContent.includes('Celulares enlazados'), div.querySelector('.juntos').textContent);
  igual(div.querySelector('.juntos-principal').getAttribute('href'), '#/pareja');
});

prueba('inicio: pinta las tarjetas de cada módulo y omite el que falla', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, ctx([
    { id: 'a', tarjetasInicio: () => [el('p', { clase: 't' }, 'Tarjeta A')] },
    { id: 'b', tarjetasInicio: () => { throw new Error('roto'); } },
  ]));
  igual([...div.querySelectorAll('.t')].map((x) => x.textContent), ['Tarjeta A']);
  verdadero(div.querySelector('.logo').textContent === 'Okupa');
});

function instalacionFalsa(estado) {
  const llamadas = [];
  return { llamadas, estado: () => estado, instalar: async () => { llamadas.push('instalar'); } };
}

prueba('inicio: muestra el botón de instalar cuando el navegador lo permite', () => {
  const instalacion = instalacionFalsa({ puedeInstalar: true, esIOS: false, instalada: false });
  const div = document.createElement('div');
  pantallaInicio(div, {}, { ...ctx([]), instalacion });
  const boton = [...div.querySelectorAll('button')].find((b) => b.textContent.includes('Instalar como app'));
  verdadero(boton, 'falta el botón');
  boton.click();
  igual(instalacion.llamadas, ['instalar']);
});

prueba('inicio: en iPhone explica cómo añadirla a la pantalla de inicio', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, { ...ctx([]), instalacion: instalacionFalsa({ puedeInstalar: false, esIOS: true, instalada: false }) });
  verdadero(div.textContent.includes('Añadir a pantalla de inicio'), div.textContent);
});

prueba('inicio: sin aviso del navegador indica dónde está la opción en el menú', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, { ...ctx([]), instalacion: instalacionFalsa({ puedeInstalar: false, esIOS: false, instalada: false }) });
  verdadero(div.textContent.includes('Instalar app'), div.textContent);
});

prueba('inicio: ya instalada no muestra nada de instalación', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, { ...ctx([]), instalacion: instalacionFalsa({ puedeInstalar: true, esIOS: true, instalada: true }) });
  verdadero(!div.textContent.includes('Instalar') && !div.textContent.includes('Añadir a pantalla'), div.textContent);
});

prueba('acerca: pinta las secciones de los módulos como elementos', () => {
  const div = document.createElement('div');
  pantallaAcerca(div, {}, ctx([{ id: 'a', acerca: () => el('section', { clase: 's' }, 'Fuentes') }, { id: 'b' }]));
  verdadero(div.querySelector('.s'), 'la sección es un elemento');
  verdadero(!div.textContent.includes('[object'), div.textContent);
  verdadero(!div.textContent.includes('null') && !div.textContent.includes('undefined'), div.textContent);
});
