import { prueba, igual, verdadero } from './corredor.js';
import { crearAlmacen } from '../js/nucleo/almacen.js';
import { crearPropio, validarPreguntaPropia } from '../js/modulos/preguntas/propio.js';

function almacenFalso() {
  const m = new Map();
  return crearAlmacen({
    getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; },
  });
}

// Almacenamiento que funciona pero se llena justo al guardar el contenido propio.
function almacenLleno() {
  const m = new Map();
  return crearAlmacen({
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (k === 'okupa:preguntas:propio') throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; },
  });
}

const CATS = new Set(['celos', 'fidelidad']);

prueba('propio: si el celular no deja guardar, avisa y no se queda con el cambio a medias', () => {
  const propio = crearPropio(almacenLleno(), () => CATS);
  const r = propio.guardarPregunta(base);
  igual(r.ok, false);
  verdadero(typeof r.error === 'string' && r.error.length > 0, 'trae mensaje');
  igual(propio.obtener().preguntas, []);
  igual(propio.guardarCategoria({ nombre: 'Viajes' }).ok, false);
  igual(propio.guardarSesion({ nombre: 'S', preguntas: ['a'] }).ok, false);
  igual(propio.ocultar('fid-001').ok, false);
  igual(propio.obtener(), { preguntas: [], categorias: [], sesiones: [], ocultas: [] });
});

prueba('propio: sin almacenamiento del todo sigue funcionando en memoria', () => {
  const falla = () => { throw new Error('x'); };
  const propio = crearPropio(crearAlmacen({ getItem: falla, setItem: falla, removeItem: falla, key: falla, get length() { return falla(); } }), () => CATS);
  verdadero(propio.guardarPregunta(base).ok);
  igual(propio.obtener().preguntas.length, 1);
});
const base = { categoria: 'celos', formato: 'abierta', profundidad: 2, texto: '¿Qué te molesta?' };

prueba('propio: guardar pregunta válida le asigna id n- y persiste', () => {
  const alm = almacenFalso();
  const r = crearPropio(alm, () => CATS).guardarPregunta({ ...base, texto: '  ¿Qué te molesta?  ' });
  verdadero(r.ok, r.error);
  verdadero(r.pregunta.id.startsWith('n-'), r.pregunta.id);
  igual(r.pregunta.texto, '¿Qué te molesta?');
  igual(crearPropio(alm, () => CATS).obtener().preguntas.map((p) => p.id), [r.pregunta.id]);
});

prueba('propio: editar una pregunta conserva su id', () => {
  const propio = crearPropio(almacenFalso(), () => CATS);
  const { pregunta } = propio.guardarPregunta(base);
  propio.guardarPregunta({ ...pregunta, texto: 'Otra' });
  igual(propio.obtener().preguntas.map((p) => [p.id, p.texto]), [[pregunta.id, 'Otra']]);
});

prueba('propio: rechaza texto vacío, muy largo o categoría inexistente', () => {
  const propio = crearPropio(almacenFalso(), () => CATS);
  for (const malo of [{ ...base, texto: '   ' }, { ...base, texto: 'x'.repeat(501) }, { ...base, categoria: 'nada' }]) {
    const r = propio.guardarPregunta(malo);
    igual(r.ok, false);
    verdadero(typeof r.error === 'string' && r.error.length > 0);
  }
  igual(propio.obtener().preguntas, []);
});

prueba('propio: corta exige dos opciones cortas con texto', () => {
  igual(validarPreguntaPropia({ ...base, formato: 'corta', subtipo: 'si_no', opciones: ['Sí', ''] }, CATS) !== null, true);
  igual(validarPreguntaPropia({ ...base, formato: 'corta', subtipo: 'si_no', opciones: ['Sí', 'x'.repeat(81)] }, CATS) !== null, true);
  igual(validarPreguntaPropia({ ...base, formato: 'corta', subtipo: 'si_no', opciones: ['Sí', 'No'] }, CATS), null);
});

prueba('propio: borrar pregunta la quita de las sesiones propias', () => {
  const propio = crearPropio(almacenFalso(), () => CATS);
  const a = propio.guardarPregunta(base).pregunta;
  const b = propio.guardarPregunta({ ...base, texto: 'Dos' }).pregunta;
  const s = propio.guardarSesion({ nombre: 'Nuestra', preguntas: [a.id, 'fid-001', b.id] });
  verdadero(s.ok, s.error);
  propio.borrarPregunta(a.id);
  igual(propio.obtener().sesiones[0].bloques[0].preguntas, ['fid-001', b.id]);
});

prueba('propio: categorías propias y no se borra una con preguntas', () => {
  let cats = new Set(CATS);
  const propio = crearPropio(almacenFalso(), () => cats);
  const c = propio.guardarCategoria({ nombre: '  Viajes  ', icono: '✈' });
  verdadero(c.ok, c.error);
  igual(c.categoria.nombre, 'Viajes');
  verdadero(c.categoria.id.startsWith('n-'));
  cats = new Set([...CATS, c.categoria.id]);
  verdadero(propio.guardarPregunta({ ...base, categoria: c.categoria.id }).ok);
  igual(propio.borrarCategoria(c.categoria.id).ok, false);
  igual(propio.guardarCategoria({ nombre: ' ' }).ok, false);
});

prueba('propio: ids únicos aunque se creen muchos seguidos', () => {
  const propio = crearPropio(almacenFalso(), () => CATS);
  for (let i = 0; i < 400; i++) propio.guardarCategoria({ nombre: `C${i}` });
  const ids = propio.obtener().categorias.map((c) => c.id);
  igual(ids.length, 400);
  igual(new Set(ids).size, 400);
});

prueba('propio: datos guardados dañados se leen como listas vacías', () => {
  const alm = almacenFalso();
  alm.escribir('okupa:preguntas:propio', { preguntas: 5, categorias: 'x', sesiones: null });
  const d = crearPropio(alm, () => CATS).obtener();
  igual([d.preguntas, d.categorias, d.sesiones, d.ocultas], [[], [], [], []]);
});

prueba('propio: ocultar y restaurar sin duplicados', () => {
  const propio = crearPropio(almacenFalso(), () => CATS);
  propio.ocultar('fid-001');
  propio.ocultar('fid-001');
  igual(propio.obtener().ocultas, ['fid-001']);
  propio.restaurar('fid-001');
  igual(propio.obtener().ocultas, []);
});

prueba('propio: sesión necesita nombre y al menos una pregunta', () => {
  const propio = crearPropio(almacenFalso(), () => CATS);
  igual(propio.guardarSesion({ nombre: '', preguntas: ['a'] }).ok, false);
  igual(propio.guardarSesion({ nombre: 'S', preguntas: [] }).ok, false);
  const s = propio.guardarSesion({ nombre: 'S', preguntas: ['a'] });
  verdadero(s.sesion.id.startsWith('n-'));
  propio.borrarSesion(s.sesion.id);
  igual(propio.obtener().sesiones, []);
});
