import { prueba, igual, verdadero } from './corredor.js';
import { el, transicion, crearCarta } from '../js/nucleo/ui.js';

const categoria = { id: 'fidelidad', nombre: 'Fidelidad y confianza', icono: '⚭', color: '#d4566f' };
const fuente = { id: 'perel', nombre: 'Inspirada en Esther Perel' };

prueba('carta: abierta muestra texto, profundidad, categoría y fuente', () => {
  const c = crearCarta({ id: 'fid-002', formato: 'abierta', profundidad: 2, texto: '¿Dónde empieza?' }, { categoria, fuente });
  igual(c.querySelector('.carta-texto').textContent, '¿Dónde empieza?');
  igual(c.querySelector('.carta-profundidad').getAttribute('aria-label'), 'Profundidad 2 de 3');
  igual(c.querySelector('.carta-profundidad').textContent, '●●○');
  verdadero(c.querySelector('.carta-categoria').textContent.includes('Fidelidad y confianza'));
  igual(c.querySelector('.carta-fuente').textContent, 'Inspirada en Esther Perel');
  igual(c.querySelector('.boton-321'), null);
});

prueba('carta: el texto con HTML se muestra literal', () => {
  const c = crearCarta({ id: 'n-1', formato: 'abierta', profundidad: 1, texto: '<b>x</b><script>1</script>' }, { categoria, fuente });
  igual(c.querySelector('.carta-texto').textContent, '<b>x</b><script>1</script>');
  igual(c.querySelector('b'), null);
  igual(c.querySelector('script'), null);
});

prueba('carta: corta esto o aquello tiene 2 opciones y botón 3-2-1', () => {
  const c = crearCarta({ id: 'cel-001', formato: 'corta', subtipo: 'esto_o_aquello', opciones: ['A', 'B'], profundidad: 1, texto: '¿Qué prefieres?' }, { categoria, fuente });
  igual([...c.querySelectorAll('.opcion')].map((o) => o.textContent), ['A', 'B']);
  verdadero(c.querySelector('.boton-321'));
});

prueba('carta: escala muestra los extremos del 1 al 10', () => {
  const c = crearCarta({ id: 'x', formato: 'corta', subtipo: 'escala', opciones: ['Nada', 'Mucho'], profundidad: 2, texto: '¿Cuánto?' }, { categoria, fuente });
  igual([...c.querySelectorAll('.opcion')].map((o) => o.textContent), ['1 · Nada', '10 · Mucho']);
});

prueba('carta: etiqueta de formato legible', () => {
  const c = crearCarta({ id: 'x', formato: 'dilema', profundidad: 3, texto: 't' }, { categoria, fuente });
  igual(c.querySelector('.carta-formato').textContent, '¿Qué harías si…?');
});

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
