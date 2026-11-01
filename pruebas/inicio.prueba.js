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

prueba('acerca: pinta las secciones de los módulos como elementos', () => {
  const div = document.createElement('div');
  pantallaAcerca(div, {}, ctx([{ id: 'a', acerca: () => el('section', { clase: 's' }, 'Fuentes') }, { id: 'b' }]));
  verdadero(div.querySelector('.s'), 'la sección es un elemento');
  verdadero(!div.textContent.includes('[object'), div.textContent);
  verdadero(!div.textContent.includes('null') && !div.textContent.includes('undefined'), div.textContent);
});
