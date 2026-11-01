import { prueba, igual, verdadero } from './corredor.js';
import { resolverRuta, cargarModulos } from '../js/nucleo/rutas.js';

const h = () => {};
const otro = () => {};

prueba('rutas: resuelve parámetros', () => {
  const r = resolverRuta('#/preguntas/carta/fid-012', { 'preguntas/carta/:id': h });
  verdadero(r && r.handler === h, 'handler correcto');
  igual(r.params, { id: 'fid-012' });
});

prueba('rutas: hash vacío es inicio', () => {
  const tabla = { '': h, 'preguntas/azar': otro };
  verdadero(resolverRuta('', tabla).handler === h);
  verdadero(resolverRuta('#/', tabla).handler === h);
  verdadero(resolverRuta('#', tabla).handler === h);
});

prueba('rutas: ruta desconocida devuelve null', () => {
  igual(resolverRuta('#/nada', { '': h }), null);
  igual(resolverRuta('#/preguntas/carta', { 'preguntas/carta/:id': h }), null);
});

prueba('rutas: ignora barras finales y decodifica', () => {
  const r = resolverRuta('#/a/b%20c/', { 'a/:x': h });
  igual(r.params, { x: 'b c' });
});

prueba('rutas: un módulo que falla se omite', async () => {
  const original = console.warn;
  console.warn = () => {};
  try {
    const mods = await cargarModulos(['a', 'b'], (id) =>
      id === 'a' ? Promise.reject(new Error('roto')) : Promise.resolve({ default: { id: 'b' } }));
    igual(mods, [{ id: 'b' }]);
  } finally {
    console.warn = original;
  }
});
