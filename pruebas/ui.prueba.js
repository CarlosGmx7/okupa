import { prueba, igual, verdadero } from './corredor.js';
import { el, transicion } from '../js/nucleo/ui.js';

prueba('transicion: ejecuta la función y espera a que termine', async () => {
  let hecho = false;
  await transicion(async () => { await Promise.resolve(); hecho = true; });
  verdadero(hecho);
});

prueba('el: crea elemento con clase, atributos y texto literal', () => {
  const nodo = el('p', { clase: 'nota', 'data-x': '1' }, 'hola ', '<b>no</b>');
  igual(nodo.tagName, 'P');
  igual(nodo.className, 'nota');
  igual(nodo.getAttribute('data-x'), '1');
  igual(nodo.textContent, 'hola <b>no</b>');
  igual(nodo.querySelector('b'), null);
});

prueba('el: on* registra listeners y acepta hijos nodo, null y arrays', () => {
  let clics = 0;
  const hijo = el('span', {}, 'a');
  const boton = el('button', { onclick: () => clics++ }, hijo, null, false, ['b', 'c']);
  boton.click();
  igual(clics, 1);
  igual(boton.textContent, 'abc');
  verdadero(boton.firstChild === hijo);
});
