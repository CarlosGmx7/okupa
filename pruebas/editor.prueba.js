import { prueba, igual, verdadero } from './corredor.js';
import { crearAlmacen } from '../js/nucleo/almacen.js';
import { crearPropio } from '../js/modulos/preguntas/propio.js';
import { crearEditor } from '../js/modulos/preguntas/editor.js';
import { unir } from '../js/modulos/preguntas/datos.js';

function almacenFalso({ roto = false, lleno = false } = {}) {
  const m = new Map();
  const falla = () => { throw new Error('x'); };
  return crearAlmacen(roto
    ? { getItem: falla, setItem: falla, removeItem: falla, key: falla, get length() { return falla(); } }
    : {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => { if (lleno && k === 'okupa:preguntas:propio') falla(); m.set(k, String(v)); },
      removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; },
    });
}

function montar(opciones) {
  const almacen = almacenFalso(opciones);
  const incluido = {
    categorias: [{ id: 'celos', nombre: 'Celos' }],
    fuentes: [{ id: 'f', nombre: 'F' }, { id: 'nuestra', nombre: 'Nuestra' }],
    preguntas: [{ id: 'cel-001', categoria: 'celos', formato: 'abierta', profundidad: 1, texto: 'Incluida uno', fuente: 'f' }],
    sesiones: [],
  };
  const estado = { incluido };
  const actualizar = () => { estado.contenido = unir(incluido, estado.propio.obtener()); };
  estado.propio = crearPropio(almacen, () => new Set(estado.contenido.categorias.map((c) => c.id)));
  actualizar();
  const rutas = [];
  const ctx = { almacen, ir: (r) => rutas.push(r), refrescar() {} };
  const editor = crearEditor(estado, { alCambiar: actualizar });
  return { estado, ctx, editor, rutas };
}

const boton = (div, texto) => [...div.querySelectorAll('button')].find((b) => b.textContent === texto);

prueba('editor: guardar pregunta vacía muestra error y no guarda', () => {
  const { estado, ctx, editor } = montar();
  const div = document.createElement('div');
  editor.preguntaNueva(div, {}, ctx);
  boton(div, 'Guardar').click();
  verdadero(div.querySelector('.error-formulario').textContent.length > 0, 'muestra error');
  igual(estado.propio.obtener().preguntas, []);
});

prueba('editor: guardar pregunta válida la agrega y vuelve a Mis preguntas', () => {
  const { estado, ctx, editor, rutas } = montar();
  const div = document.createElement('div');
  editor.preguntaNueva(div, {}, ctx);
  div.querySelector('textarea').value = '¿Qué canción es nuestra?';
  boton(div, 'Guardar').click();
  igual(estado.propio.obtener().preguntas.map((p) => p.texto), ['¿Qué canción es nuestra?']);
  igual(estado.contenido.preguntas.length, 2, 'el contenido se actualiza');
  igual(rutas, ['preguntas/mis']);
});

prueba('editor: si no se puede guardar, lo dice y no se va del formulario', () => {
  const { estado, ctx, editor, rutas } = montar({ lleno: true });
  const div = document.createElement('div');
  editor.preguntaNueva(div, {}, ctx);
  div.querySelector('textarea').value = '¿Qué canción es nuestra?';
  boton(div, 'Guardar').click();
  verdadero(div.querySelector('.error-formulario').textContent.includes('No se pudo guardar'), div.querySelector('.error-formulario').textContent);
  igual(rutas, []);
  igual(estado.propio.obtener().preguntas, []);
});

prueba('editor: ocultas no muestra ids de preguntas que ya no existen', () => {
  const { estado, ctx, editor } = montar();
  estado.propio.ocultar('cel-001');
  estado.propio.ocultar('n-borrada123');
  const div = document.createElement('div');
  editor.ocultas(div, {}, ctx);
  verdadero(!div.textContent.includes('n-borrada123'), div.textContent);
  igual(div.querySelectorAll('.lista li').length, 1);
  const mis = document.createElement('div');
  editor.mis(mis, {}, ctx);
  verdadero(mis.textContent.includes('1 oculta'), mis.textContent);
});

prueba('editor: ocultas lista y restaura', () => {
  const { estado, ctx, editor } = montar();
  estado.propio.ocultar('cel-001');
  const div = document.createElement('div');
  editor.ocultas(div, {}, ctx);
  verdadero(div.textContent.includes('Incluida uno'));
  boton(div, 'Restaurar').click();
  igual(estado.propio.obtener().ocultas, []);
});

prueba('editor: un archivo que no es copia de Okupa se rechaza de una', async () => {
  const { ctx, editor } = montar();
  const div = document.createElement('div');
  editor.respaldo(div, {}, ctx);
  const input = div.querySelector('input[type=file]');
  const dt = new DataTransfer();
  dt.items.add(new File(['{"hola": 1}'], 'x.json', { type: 'application/json' }));
  input.files = dt.files;
  input.dispatchEvent(new Event('change'));
  await new Promise((r) => setTimeout(r, 100));
  verdadero(div.querySelector('[role=status]').textContent.includes('no es una copia de Okupa'), div.querySelector('[role=status]').textContent);
  igual(boton(div, 'Reemplazar todo'), undefined);
});

prueba('editor: Mis preguntas no pinta "null" cuando sí se puede guardar', () => {
  const { ctx, editor } = montar();
  const div = document.createElement('div');
  editor.mis(div, {}, ctx);
  verdadero(!div.textContent.includes('null'), div.textContent.slice(0, 200));
});

prueba('editor: avisa cuando el navegador no deja guardar', () => {
  const { ctx, editor } = montar({ roto: true });
  const div = document.createElement('div');
  editor.mis(div, {}, ctx);
  verdadero(div.textContent.includes('Este navegador no deja guardar'), div.textContent);
});
