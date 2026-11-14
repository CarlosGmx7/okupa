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

prueba('editor: los puntos de color no pierden su color al escoger uno y tienen nombre', () => {
  const { ctx, editor } = montar();
  const div = document.createElement('div');
  editor.categoriaNueva(div, {}, ctx);
  const puntos = () => [...div.querySelector('.segmentado[aria-label="Color"]').querySelectorAll('button')];
  puntos()[2].click();
  verdadero(puntos().every((b) => b.style.color), 'algún punto quedó sin color');
  verdadero(puntos().every((b) => b.getAttribute('aria-label')), 'algún punto sin aria-label');
  igual(puntos().map((b) => b.getAttribute('aria-pressed')), ['false', 'false', 'true', 'false', 'false', 'false']);
});

prueba('editor: nueva pregunta desde una categoría la deja escogida', () => {
  const { estado, ctx, editor } = montar();
  const c = estado.propio.guardarCategoria({ nombre: 'Viajes' }).categoria;
  estado.contenido = unir(estado.incluido, estado.propio.obtener());
  const div = document.createElement('div');
  editor.preguntaNueva(div, { categoria: c.id }, ctx);
  igual(div.querySelectorAll('select')[0].value, c.id);
});

prueba('editor: sesión muestra el orden de las escogidas y deja subir y bajar', () => {
  const { estado, ctx, editor } = montar();
  const propia = estado.propio.guardarPregunta({ categoria: 'celos', formato: 'abierta', profundidad: 1, texto: 'Propia dos' }).pregunta;
  estado.contenido = unir(estado.incluido, estado.propio.obtener());
  const s = estado.propio.guardarSesion({ nombre: 'Domingo', preguntas: ['cel-001', propia.id] }).sesion;
  const div = document.createElement('div');
  editor.sesionEditar(div, { id: s.id }, ctx);
  const orden = () => [...div.querySelectorAll('.orden .fila-texto')].map((x) => x.textContent);
  igual(orden(), ['Incluida uno', 'Propia dos']);
  div.querySelector('.orden button[aria-label^="Bajar"]').click();
  igual(orden(), ['Propia dos', 'Incluida uno']);
  [...div.querySelectorAll('.orden button[aria-label^="Subir"]')].at(-1).click();
  igual(orden(), ['Incluida uno', 'Propia dos']);
  const caja = [...div.querySelectorAll('label.seleccionable')].find((l) => l.textContent.includes('Incluida uno')).querySelector('input');
  caja.checked = false;
  caja.dispatchEvent(new Event('change'));
  igual(orden(), ['Propia dos']);
  boton(div, 'Guardar').click();
  igual(estado.propio.obtener().sesiones[0].bloques[0].preguntas, [propia.id]);
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

prueba('editor: la copia de seguridad ahora está en Ajustes', () => {
  const { ctx, editor } = montar();
  const div = document.createElement('div');
  editor.respaldo(div, {}, ctx);
  igual(div.querySelector('input[type=file]'), null);
  const enlace = div.querySelector('a[href="#/ajustes"]');
  verdadero(enlace && enlace.textContent.includes('La copia de seguridad está en Ajustes'), div.textContent);
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
