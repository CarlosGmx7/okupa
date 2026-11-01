import { prueba, igual, verdadero } from './corredor.js';
import { crearAlmacen, exportarRespaldo, importarRespaldo } from '../js/nucleo/almacen.js';

function storageFalso() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}

const storageQueLanza = {
  getItem() { throw new Error('bloqueado'); },
  setItem() { throw new Error('bloqueado'); },
  removeItem() { throw new Error('bloqueado'); },
  key() { throw new Error('bloqueado'); },
  get length() { throw new Error('bloqueado'); },
};

prueba('almacen: escribir y leer devuelve el mismo objeto', () => {
  const alm = crearAlmacen(storageFalso());
  verdadero(alm.escribir('okupa:x:a', { b: [1, 2] }));
  igual(alm.leer('okupa:x:a'), { b: [1, 2] });
});

prueba('almacen: con storage que lanza usa el defecto y no revienta', () => {
  const alm = crearAlmacen(storageQueLanza);
  igual(alm.leer('k', 7), 7);
  igual(alm.escribir('k', 1), false);
  igual(alm.disponible(), false);
  igual(alm.claves('okupa:'), []);
  alm.borrar('k');
});

prueba('almacen: valor que no es JSON devuelve el defecto', () => {
  const s = storageFalso();
  s.setItem('okupa:x:roto', '{no es json');
  igual(crearAlmacen(s).leer('okupa:x:roto', 'def'), 'def');
});

prueba('almacen: claves filtra por prefijo', () => {
  const alm = crearAlmacen(storageFalso());
  alm.escribir('okupa:a', 1);
  alm.escribir('otra:b', 2);
  igual(alm.claves('okupa:'), ['okupa:a']);
});

prueba('respaldo: exportar e importar reproduce las claves', () => {
  const origen = crearAlmacen(storageFalso());
  origen.escribir('okupa:preguntas:vistas', ['a', 'b']);
  origen.escribir('okupa:preguntas:propio', { preguntas: [{ id: 'n-1' }], ocultas: ['x'] });
  origen.escribir('ajena', 1);
  const respaldo = exportarRespaldo(origen);
  igual(respaldo.app, 'okupa');
  igual(respaldo.version, 1);
  const destino = crearAlmacen(storageFalso());
  igual(importarRespaldo(destino, JSON.parse(JSON.stringify(respaldo)), 'reemplazar'), { ok: true });
  igual(destino.claves('okupa:').sort(), ['okupa:preguntas:propio', 'okupa:preguntas:vistas']);
  igual(destino.leer('okupa:preguntas:vistas'), ['a', 'b']);
});

prueba('respaldo: importar algo inválido no toca nada', () => {
  const alm = crearAlmacen(storageFalso());
  alm.escribir('okupa:preguntas:vistas', ['a']);
  for (const malo of [null, { app: 'otra' }, { app: 'okupa', version: 99, datos: {} }, { app: 'okupa', version: 1, datos: { 'ajena': 1 } }, 'texto']) {
    const r = importarRespaldo(alm, malo, 'reemplazar');
    igual(r.ok, false, JSON.stringify(malo));
    verdadero(typeof r.error === 'string' && r.error.length > 0, 'trae mensaje');
  }
  igual(alm.leer('okupa:preguntas:vistas'), ['a']);
  igual(alm.claves('okupa:'), ['okupa:preguntas:vistas']);
});

prueba('respaldo: reemplazar borra lo que no viene en la copia', () => {
  const alm = crearAlmacen(storageFalso());
  alm.escribir('okupa:preguntas:vistas', ['a']);
  importarRespaldo(alm, { app: 'okupa', version: 1, fecha: '', datos: { 'okupa:preguntas:sesiones': {} } }, 'reemplazar');
  igual(alm.claves('okupa:'), ['okupa:preguntas:sesiones']);
});

prueba('respaldo: combinar une listas por id y gana lo importado', () => {
  const alm = crearAlmacen(storageFalso());
  alm.escribir('okupa:preguntas:propio', {
    preguntas: [{ id: 'n-1', texto: 'vieja' }, { id: 'n-2', texto: 'local' }],
    ocultas: ['a'],
  });
  importarRespaldo(alm, {
    app: 'okupa', version: 1, fecha: '',
    datos: { 'okupa:preguntas:propio': { preguntas: [{ id: 'n-1', texto: 'nueva' }, { id: 'n-3', texto: 'otra' }], ocultas: ['a', 'b'] } },
  }, 'combinar');
  const p = alm.leer('okupa:preguntas:propio');
  igual(p.preguntas.map((x) => `${x.id}:${x.texto}`).sort(), ['n-1:nueva', 'n-2:local', 'n-3:otra']);
  igual(p.ocultas.sort(), ['a', 'b']);
});
