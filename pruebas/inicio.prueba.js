import { prueba, igual, verdadero } from './corredor.js';
import { pantallaInicio, pantallaAcerca } from '../js/nucleo/inicio.js';
import { el } from '../js/nucleo/ui.js';

const ctx = (modulos) => ({ modulos, almacen: { claves: () => [], borrar() {} }, ir() {}, refrescar() {} });

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
