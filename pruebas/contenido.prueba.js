import { prueba, igual, verdadero } from './corredor.js';
import { cargarIncluido, validarContenido, filtrar } from '../js/modulos/preguntas/datos.js';

const contenido = await cargarIncluido();

prueba('contenido: es válido', () => {
  igual(validarContenido(contenido), []);
});

prueba('contenido: al menos 280 preguntas y 20 por categoría', () => {
  verdadero(contenido.preguntas.length >= 280, `hay ${contenido.preguntas.length}`);
  for (const c of contenido.categorias) {
    const n = filtrar(contenido.preguntas, { categoria: c.id }).length;
    verdadero(n >= 20, `${c.id} tiene ${n}`);
  }
});

prueba('contenido: cada categoría tiene preguntas suaves', () => {
  for (const c of contenido.categorias) {
    verdadero(filtrar(contenido.preguntas, { categoria: c.id, profundidadMax: 1 }).length >= 1, c.id);
  }
});

prueba('contenido: los ids usan el prefijo de su categoría', () => {
  const prefijos = Object.fromEntries(contenido.categorias.map((c) => [c.id, c.prefijo]));
  for (const q of contenido.preguntas) {
    verdadero(new RegExp(`^${prefijos[q.categoria]}-\\d{3}$`).test(q.id), q.id);
  }
});

prueba('contenido: Las 36 tiene 3 bloques de 12 y cierre de 4 minutos', () => {
  const s = contenido.sesiones.find((x) => x.id === 'las-36');
  igual(s.bloques.map((b) => b.preguntas.length), [12, 12, 12]);
  igual(s.cierre.tipo, 'mirada');
  igual(s.cierre.segundos, 240);
});

prueba('contenido: existen las 5 sesiones guiadas', () => {
  igual(contenido.sesiones.map((s) => s.id).sort(),
    ['las-36', 'lo-que-nunca-hablamos', 'mapa-del-amor', 'noche-de-deseo', 'plata-familia-futuro']);
});
