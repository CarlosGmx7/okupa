import { prueba, igual, verdadero } from './corredor.js';
import { crearAlmacen, exportarRespaldo, importarRespaldo, esDeEsteCelular } from '../js/nucleo/almacen.js';
import { VALIDADORES_RESPALDO } from '../js/modulos/preguntas/propio.js';

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

prueba('respaldo: sobre bueno con contenido dañado se rechaza sin tocar nada', () => {
  const alm = crearAlmacen(storageFalso());
  alm.escribir('okupa:preguntas:vistas', ['a']);
  const malos = [
    { 'okupa:preguntas:propio': { preguntas: 5 } },
    { 'okupa:preguntas:propio': { preguntas: [{ texto: 'sin id' }] } },
    { 'okupa:preguntas:propio': 'texto' },
    { 'okupa:preguntas:vistas': 5 },
    { 'okupa:preguntas:sesiones': [] },
  ];
  for (const datos of malos) {
    const r = importarRespaldo(alm, { app: 'okupa', version: 1, fecha: '', datos }, 'reemplazar', VALIDADORES_RESPALDO);
    igual(r.ok, false, JSON.stringify(datos));
  }
  igual(alm.claves('okupa:'), ['okupa:preguntas:vistas']);
  igual(alm.leer('okupa:preguntas:vistas'), ['a']);
});

prueba('respaldo: si falla una escritura a mitad, se restaura lo anterior', () => {
  const s = storageFalso();
  const alm = crearAlmacen(s);
  alm.escribir('okupa:preguntas:vistas', ['a']);
  let escrituras = 0;
  const original = s.setItem;
  s.setItem = (k, v) => { if (++escrituras === 2) throw new Error('lleno'); original(k, v); };
  const r = importarRespaldo(alm, {
    app: 'okupa', version: 1, fecha: '',
    datos: { 'okupa:preguntas:sesiones': {}, 'okupa:preguntas:vistas': ['x', 'y'] },
  }, 'reemplazar');
  s.setItem = original;
  igual(r.ok, false);
  igual(alm.claves('okupa:'), ['okupa:preguntas:vistas']);
  igual(alm.leer('okupa:preguntas:vistas'), ['a']);
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

// v18: la copia no lleva la pareja, el registro de avisos ni la marca de bienvenida.
const DE_ESTE_CELULAR = ['okupa:pareja:actual', 'okupa:pareja:nombres', 'okupa:dispositivo', 'okupa:dispositivo:borrar', 'okupa:notificaciones', 'okupa:bienvenida'];

prueba('respaldo: esDeEsteCelular reconoce solo las claves del celular', () => {
  igual(DE_ESTE_CELULAR.map(esDeEsteCelular), DE_ESTE_CELULAR.map(() => true));
  igual(['okupa:preguntas:vistas', 'okupa:portada', 'okupa:ajustes', 'okupa:diario:estado'].map(esDeEsteCelular), [false, false, false, false]);
});

prueba('respaldo: no exporta lo de este celular', () => {
  const a = crearAlmacen(storageFalso());
  for (const clave of DE_ESTE_CELULAR) a.escribir(clave, { x: 1 });
  a.escribir('okupa:preguntas:vistas', ['p1']);
  igual(Object.keys(exportarRespaldo(a).datos), ['okupa:preguntas:vistas']);
});

prueba('respaldo: reemplazar conserva la pareja del celular e ignora la del archivo', () => {
  const a = crearAlmacen(storageFalso());
  a.escribir('okupa:pareja:actual', { codigo: 'AAAAAA', lugar: 'a' });
  a.escribir('okupa:dispositivo', 'mio');
  a.escribir('okupa:preguntas:vistas', ['viejo']);
  const copia = { app: 'okupa', version: 1, fecha: '2026-11-01T00:00:00Z', datos: {
    'okupa:pareja:actual': { codigo: 'BBBBBB', lugar: 'b' },
    'okupa:dispositivo': 'ajeno',
    'okupa:portada': 'data:image/jpeg;base64,AAAA',
  } };
  igual(importarRespaldo(a, copia, 'reemplazar').ok, true);
  igual(a.leer('okupa:pareja:actual'), { codigo: 'AAAAAA', lugar: 'a' });
  igual(a.leer('okupa:dispositivo'), 'mio');
  igual(a.leer('okupa:portada'), 'data:image/jpeg;base64,AAAA');
  igual(a.leer('okupa:preguntas:vistas', null), null);
});

prueba('respaldo: combinar también ignora la pareja del archivo', () => {
  const a = crearAlmacen(storageFalso());
  const copia = { app: 'okupa', version: 1, fecha: '2026-11-01T00:00:00Z', datos: {
    'okupa:pareja:actual': { codigo: 'BBBBBB', lugar: 'b' },
    'okupa:preguntas:vistas': ['p2'],
  } };
  igual(importarRespaldo(a, copia, 'combinar').ok, true);
  igual(a.leer('okupa:pareja:actual', null), null);
  igual(a.leer('okupa:preguntas:vistas'), ['p2']);
});