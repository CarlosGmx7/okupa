import { prueba, igual } from './corredor.js';
import { crearAlmacen } from '../js/nucleo/almacen.js';
import { crearProgreso, posicionValida } from '../js/modulos/preguntas/progreso.js';

function almacenFalso() {
  const m = new Map();
  return crearAlmacen({
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  });
}

const almacenRoto = crearAlmacen({
  getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); },
  removeItem() { throw new Error('x'); }, key() { throw new Error('x'); },
  get length() { throw new Error('x'); },
});

prueba('progreso: marca y recuerda vistas entre instancias', () => {
  const alm = almacenFalso();
  const p = crearProgreso(alm);
  p.marcarVista('a');
  p.marcarVista('b');
  p.marcarVista('a');
  igual([...crearProgreso(alm).vistas()].sort(), ['a', 'b']);
});

prueba('progreso: reiniciarVistas con ids solo quita esos', () => {
  const p = crearProgreso(almacenFalso());
  ['a', 'b', 'c'].forEach((id) => p.marcarVista(id));
  p.reiniciarVistas(['a', 'c']);
  igual([...p.vistas()], ['b']);
  p.reiniciarVistas();
  igual([...p.vistas()], []);
});

prueba('progreso: guarda y termina el avance de una sesión', () => {
  const alm = almacenFalso();
  const p = crearProgreso(alm);
  igual(p.avance('las-36'), null);
  p.guardarAvance('las-36', { bloque: 1, indice: 4 });
  igual(crearProgreso(alm).avance('las-36'), { bloque: 1, indice: 4 });
  p.terminarSesion('las-36');
  igual(p.avance('las-36'), null);
});

prueba('progreso: reiniciar borra vistas y sesiones', () => {
  const p = crearProgreso(almacenFalso());
  p.marcarVista('a');
  p.guardarAvance('s', { bloque: 0, indice: 1 });
  p.reiniciar();
  igual([...p.vistas()], []);
  igual(p.avance('s'), null);
});

prueba('progreso: sin almacenamiento funciona en memoria', () => {
  const p = crearProgreso(almacenRoto);
  p.marcarVista('a');
  igual([...p.vistas()], ['a']);
  p.guardarAvance('s', { bloque: 0, indice: 2 });
  igual(p.avance('s'), { bloque: 0, indice: 2 });
});

const sesion = { bloques: [{ preguntas: ['a', 'x', 'b'] }, { preguntas: ['y', 'c'] }] };

prueba('progreso: posicionValida salta ids que ya no existen', () => {
  const existen = new Set(['a', 'b', 'c']);
  igual(posicionValida(sesion, { bloque: 0, indice: 1 }, existen), { bloque: 0, indice: 2 });
  igual(posicionValida(sesion, { bloque: 0, indice: 3 }, existen), { bloque: 1, indice: 1 });
  igual(posicionValida(sesion, null, existen), { bloque: 0, indice: 0 });
});

prueba('progreso: posicionValida devuelve null al final', () => {
  igual(posicionValida(sesion, { bloque: 1, indice: 2 }, new Set(['a'])), null);
  igual(posicionValida(sesion, { bloque: 0, indice: 1 }, new Set(['a'])), null);
});
