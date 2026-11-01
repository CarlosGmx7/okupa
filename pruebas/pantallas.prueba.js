import { prueba, igual, verdadero } from './corredor.js';
import { siguienteAlAzar, barajar, avanceCategoria, crearPantallas } from '../js/modulos/preguntas/pantallas.js';
import { crearAlmacen } from '../js/nucleo/almacen.js';
import { crearProgreso } from '../js/modulos/preguntas/progreso.js';

function estadoDePrueba(lista) {
  const m = new Map();
  const almacen = crearAlmacen({
    getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; },
  });
  const categorias = [{ id: 'x', nombre: 'Equis' }];
  const fuentes = [{ id: 'f', nombre: 'Fuente' }];
  const estado = {
    contenido: { categorias, fuentes, preguntas: lista, sesiones: [] },
    porId: new Map(lista.map((q) => [q.id, q])),
    categoriaPorId: new Map(categorias.map((c) => [c.id, c])),
    fuentePorId: new Map(fuentes.map((f) => [f.id, f])),
    progreso: crearProgreso(almacen),
  };
  const ctx = { almacen, ir() {}, refrescar() {} };
  return { estado, ctx };
}

const preguntaX = (id) => ({ id, categoria: 'x', formato: 'abierta', profundidad: 1, texto: `Pregunta ${id}`, fuente: 'f' });

prueba('pantallas: la carta de una categoría no pinta "null"', () => {
  const { estado, ctx } = estadoDePrueba([preguntaX('x-001'), preguntaX('x-002')]);
  const div = document.createElement('div');
  crearPantallas(estado).categoria(div, { id: 'x' }, ctx);
  verdadero(div.querySelector('.carta'), 'hay carta');
  verdadero(!div.textContent.includes('null'), div.textContent);
});

prueba('pantallas: categoría con todo visto ofrece reiniciar vistas', () => {
  const { estado, ctx } = estadoDePrueba([preguntaX('x-001')]);
  estado.progreso.marcarVista('x-001');
  const div = document.createElement('div');
  crearPantallas(estado).categoria(div, { id: 'x' }, ctx);
  verdadero(div.textContent.includes('Ya conversaron todas estas'));
  [...div.querySelectorAll('button')].find((b) => b.textContent === 'Reiniciar vistas').click();
  igual([...estado.progreso.vistas()], []);
});

prueba('pantallas: categoría sin preguntas muestra "No quedan preguntas aquí"', () => {
  const { estado, ctx } = estadoDePrueba([]);
  const div = document.createElement('div');
  crearPantallas(estado).categoria(div, { id: 'x' }, ctx);
  verdadero(div.textContent.includes('No quedan preguntas aquí'));
});

const preguntas = ['a', 'b', 'c', 'd'].map((id) => ({ id, categoria: id < 'c' ? 'x' : 'y' }));

prueba('pantallas: siguienteAlAzar nunca devuelve vistas', () => {
  const vistas = new Set(['a', 'b', 'c']);
  for (let i = 0; i < 20; i++) igual(siguienteAlAzar(preguntas, vistas).id, 'd');
});

prueba('pantallas: siguienteAlAzar usa rnd y devuelve null si todas están vistas', () => {
  igual(siguienteAlAzar(preguntas, new Set(), () => 0).id, 'a');
  igual(siguienteAlAzar(preguntas, new Set(), () => 0.99).id, 'd');
  igual(siguienteAlAzar(preguntas, new Set(['a', 'b', 'c', 'd'])), null);
  igual(siguienteAlAzar([], new Set()), null);
});

prueba('pantallas: barajar conserva elementos y no muta', () => {
  const original = [1, 2, 3, 4, 5];
  const copia = [...original];
  const r = barajar(original, () => 0.3);
  igual(original, copia);
  igual([...r].sort(), copia);
  verdadero(r !== original);
});

prueba('pantallas: avanceCategoria cuenta vistas de esa categoría', () => {
  igual(avanceCategoria(preguntas, new Set(['a', 'c']), 'x'), { vistas: 1, total: 2 });
  igual(avanceCategoria(preguntas, new Set(), 'z'), { vistas: 0, total: 0 });
});
