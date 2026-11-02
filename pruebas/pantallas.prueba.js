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
const boton = (div, texto) => [...div.querySelectorAll('button')].find((b) => b.textContent === texto);

prueba('pantallas: al retomar una sesión hay un solo contador, con la posición real', () => {
  const lista = ['x-001', 'x-002', 'x-003', 'x-004', 'x-005'].map(preguntaX);
  const { estado, ctx } = estadoDePrueba(lista);
  estado.contenido.sesiones = [{ id: 's1', nombre: 'S', bloques: [
    { nombre: 'Uno', preguntas: ['x-001', 'x-002'] }, { nombre: 'Dos', preguntas: ['x-003', 'x-004', 'x-005'] }] }];
  estado.progreso.guardarAvance('s1', { bloque: 1, indice: 1 });
  const div = document.createElement('div');
  crearPantallas(estado).sesion(div, { id: 's1' }, ctx);
  boton(div, 'Continuar donde íbamos').click();
  igual(div.textContent.match(/\d+ de \d+/g), ['4 de 5']);
  verdadero(div.textContent.includes('Dos'), 'muestra el bloque');
  boton(div, 'Siguiente →').click();
  igual(div.textContent.match(/\d+ de \d+/g), ['5 de 5']);
});

prueba('pantallas: el reloj del cierre se detiene al salir de la sesión', () => {
  const { estado, ctx } = estadoDePrueba([preguntaX('x-001')]);
  estado.contenido.sesiones = [{ id: 's1', nombre: 'S', bloques: [{ nombre: 'Uno', preguntas: ['x-001'] }],
    cierre: { tipo: 'mirada', texto: 'Mírense', segundos: 240 } }];
  const div = document.createElement('div');
  crearPantallas(estado).sesion(div, { id: 's1' }, ctx);
  boton(div, 'Empezar').click();
  boton(div, 'Siguiente →').click();
  const { setInterval: poner, clearInterval: quitar } = window;
  const puestos = [];
  const quitados = [];
  window.setInterval = (...a) => { const id = poner(...a); puestos.push(id); return id; };
  window.clearInterval = (id) => { quitados.push(id); quitar(id); };
  try {
    boton(div, 'Empezar los 4 minutos').click();
    igual(puestos.length, 1, 'arrancó el reloj');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    verdadero(quitados.includes(puestos[0]), 'el reloj sigue corriendo');
  } finally {
    window.setInterval = poner;
    window.clearInterval = quitar;
    puestos.forEach(quitar);
  }
});

prueba('pantallas: la intensidad de Al azar se recuerda aunque no se pueda guardar', () => {
  const lista = [preguntaX('x-001'), { ...preguntaX('x-002'), profundidad: 3 }];
  const { estado } = estadoDePrueba(lista);
  const falla = () => { throw new Error('x'); };
  const roto = crearAlmacen({ getItem: falla, setItem: falla, removeItem: falla, key: falla, get length() { return falla(); } });
  const div = document.createElement('div');
  const pantallas = crearPantallas(estado);
  const ctx = { almacen: roto, ir() {}, refrescar: () => { div.replaceChildren(); pantallas.azar(div, {}, ctx); } };
  pantallas.azar(div, {}, ctx);
  boton(div, 'Suave').click();
  igual(boton(div, 'Suave').getAttribute('aria-pressed'), 'true');
  igual(boton(div, 'Intensa').getAttribute('aria-pressed'), 'false');
});

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

prueba('pantallas: al ocultar una pregunta sale otra distinta', () => {
  const { estado, ctx } = estadoDePrueba([preguntaX('x-001'), preguntaX('x-002'), preguntaX('x-003')]);
  const ocultadas = [];
  const div = document.createElement('div');
  const original = window.confirm;
  window.confirm = () => true;
  try {
    crearPantallas(estado, { alOcultar: (p) => ocultadas.push(p.id) }).categoria(div, { id: 'x' }, ctx);
    const primera = div.querySelector('.carta').dataset.id;
    [...div.querySelectorAll('button')].find((b) => b.textContent.includes('ocultar')).click();
    igual(ocultadas, [primera]);
    const segunda = div.querySelector('.carta').dataset.id;
    verdadero(segunda !== primera, `volvió a salir ${primera}`);
    igual(div.querySelector('.contador').textContent, '1 de 2');
  } finally {
    window.confirm = original;
  }
});

prueba('pantallas: Acerca de ofrece reiniciar solo el progreso', () => {
  const { estado, ctx } = estadoDePrueba([preguntaX('x-001')]);
  estado.progreso.marcarVista('x-001');
  estado.progreso.guardarAvance('s', { bloque: 0, indice: 1 });
  const original = window.confirm;
  window.confirm = () => true;
  try {
    const seccion = crearPantallas(estado).acerca(ctx);
    [...seccion.querySelectorAll('button')].find((b) => b.textContent === 'Reiniciar progreso').click();
  } finally {
    window.confirm = original;
  }
  igual([...estado.progreso.vistas()], []);
  igual(estado.progreso.avance('s'), null);
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
