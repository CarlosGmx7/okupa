import { prueba, igual, verdadero } from './corredor.js';
import { crearAlmacen } from '../js/nucleo/almacen.js';
import {
  PRESUPUESTOS, LUGARES, CLAVE_RULETA, ELECCION_INICIAL,
  validarPlan, cargarPlanes, leerEleccion, guardarEleccion, crearRacha,
} from '../js/modulos/ruleta/logica.js';

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

// Generador determinista (LCG)
const semilla = (s) => () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
const TEXTO = 'Cocinen juntos algo que nunca hayan hecho.';
const plan = (id, presupuesto, lugar) => ({ id, presupuesto, lugar, texto: TEXTO, tipo: 'cocina' });
const banco = () => [
  ...Array.from({ length: 5 }, (_, i) => plan(`n${i}`, 'nulo', 'casa')),
  ...Array.from({ length: 2 }, (_, i) => plan(`g${i}`, 'grande', 'salir')),
];

prueba('ruleta: constantes', () => {
  igual(PRESUPUESTOS.map((p) => p.id), ['nulo', 'medio', 'grande']);
  igual(PRESUPUESTOS.map((p) => p.nombre), ['Sin plata', 'Algo medio', 'Darnos un gusto']);
  igual(PRESUPUESTOS.map((p) => p.ayuda), [
    '$0 · con lo que ya hay',
    'Hasta unos $80.000 para los dos',
    'Más de $80.000 para los dos',
  ]);
  igual(LUGARES, [{ id: 'casa', nombre: 'En casa' }, { id: 'salir', nombre: 'Salir' }]);
  igual(CLAVE_RULETA, 'okupa:ruleta');
  igual(ELECCION_INICIAL, { presupuesto: 'medio', lugar: 'salir' });
});

prueba('ruleta: validarPlan acepta uno bueno y rechaza los malos', () => {
  verdadero(validarPlan(plan('a', 'medio', 'casa')));
  verdadero(!validarPlan(plan('a', 'caro', 'casa')), 'presupuesto desconocido');
  verdadero(!validarPlan(plan('a', 'medio', 'playa')), 'lugar desconocido');
  verdadero(!validarPlan({ ...plan('a', 'medio', 'casa'), texto: 'a'.repeat(19) }), '19 caracteres');
  verdadero(validarPlan({ ...plan('a', 'medio', 'casa'), texto: 'a'.repeat(20) }), '20 caracteres');
  verdadero(validarPlan({ ...plan('a', 'medio', 'casa'), texto: 'a'.repeat(160) }), '160 caracteres');
  verdadero(!validarPlan({ ...plan('a', 'medio', 'casa'), texto: 'a'.repeat(161) }), '161 caracteres');
  verdadero(!validarPlan({ ...plan('a', 'medio', 'casa'), tipo: '' }), 'tipo vacío');
  verdadero(!validarPlan({ ...plan('a', 'medio', 'casa'), id: 7 }), 'id no string');
  verdadero(!validarPlan(null));
  verdadero(!validarPlan('texto'));
});

prueba('ruleta: leerEleccion vuelve a la inicial con datos raros', () => {
  const alm = crearAlmacen(storageFalso());
  igual(leerEleccion(alm), ELECCION_INICIAL);
  alm.escribir(CLAVE_RULETA, { presupuesto: 'x', lugar: 'casa' });
  igual(leerEleccion(alm), ELECCION_INICIAL);
  alm.escribir(CLAVE_RULETA, { presupuesto: 'nulo', lugar: 'x' });
  igual(leerEleccion(alm), ELECCION_INICIAL);
  alm.escribir(CLAVE_RULETA, 'texto');
  igual(leerEleccion(alm), ELECCION_INICIAL);
  alm.escribir(CLAVE_RULETA, null);
  igual(leerEleccion(alm), ELECCION_INICIAL);
});

prueba('ruleta: guardar y leer devuelve lo guardado', () => {
  const alm = crearAlmacen(storageFalso());
  guardarEleccion(alm, { presupuesto: 'nulo', lugar: 'casa' });
  igual(leerEleccion(alm), { presupuesto: 'nulo', lugar: 'casa' });
  igual(alm.leer(CLAVE_RULETA), { presupuesto: 'nulo', lugar: 'casa' });
});

prueba('ruleta: la racha entrega todos sin repetir y rebaraja sin repetir el último', () => {
  const racha = crearRacha(banco(), semilla(7));
  const ids = Array.from({ length: 5 }, () => racha.siguiente('nulo', 'casa').id);
  igual(new Set(ids).size, 5);
  igual([...ids].sort(), ['n0', 'n1', 'n2', 'n3', 'n4']);
  const sexto = racha.siguiente('nulo', 'casa');
  verdadero(sexto.id !== ids[4], 'el 6.º repite al 5.º');
});

prueba('ruleta: al rebarajar el primero nunca es el último, con cualquier azar', () => {
  for (let s = 1; s <= 30; s++) {
    const racha = crearRacha(banco(), semilla(s));
    let ultimo = null;
    for (let i = 0; i < 40; i++) {
      const p = racha.siguiente('nulo', 'casa');
      verdadero(p.id !== ultimo, `repetido en semilla ${s}, giro ${i}`);
      ultimo = p.id;
    }
  }
  // Con un azar que siempre deja el mismo orden también debe cambiar.
  const racha = crearRacha(banco(), () => 0);
  let ultimo = null;
  for (let i = 0; i < 12; i++) {
    const p = racha.siguiente('nulo', 'casa');
    verdadero(p.id !== ultimo, 'repetido con azar fijo');
    ultimo = p.id;
  }
});

prueba('ruleta: con un solo plan en la combinación se repite sin romper', () => {
  const racha = crearRacha([plan('solo', 'medio', 'casa')], semilla(1));
  igual(racha.siguiente('medio', 'casa').id, 'solo');
  igual(racha.siguiente('medio', 'casa').id, 'solo');
});

prueba('ruleta: cada combinación lleva su propia racha', () => {
  const racha = crearRacha(banco(), semilla(3));
  for (let i = 0; i < 6; i++) {
    const a = racha.siguiente('nulo', 'casa');
    verdadero(a.presupuesto === 'nulo' && a.lugar === 'casa', 'mezcló nulo/casa');
    const b = racha.siguiente('grande', 'salir');
    verdadero(b.presupuesto === 'grande' && b.lugar === 'salir', 'mezcló grande/salir');
  }
  // Alternar no consume la racha de la otra: 5 giros en nulo/casa siguen dando los 5 ids.
  const r2 = crearRacha(banco(), semilla(3));
  const ids = [];
  for (let i = 0; i < 5; i++) {
    ids.push(r2.siguiente('nulo', 'casa').id);
    r2.siguiente('grande', 'salir');
  }
  igual(new Set(ids).size, 5);
});

prueba('ruleta: combinación sin planes → null', () => {
  const racha = crearRacha(banco(), semilla(1));
  igual(racha.siguiente('medio', 'salir'), null);
  igual(crearRacha([], semilla(1)).siguiente('nulo', 'casa'), null);
});

prueba('ruleta: con azar fijo el orden es determinista', () => {
  const orden = (s) => {
    const r = crearRacha(banco(), semilla(s));
    return Array.from({ length: 8 }, () => r.siguiente('nulo', 'casa').id);
  };
  igual(orden(11), orden(11));
});

prueba('ruleta: cargarPlanes descarta los inválidos', async () => {
  const lista = [plan('a', 'nulo', 'casa'), { id: 'malo', presupuesto: 'x' }, plan('b', 'grande', 'salir')];
  let url = '';
  const fetchFalso = async (u) => { url = String(u); return { ok: true, status: 200, json: async () => lista }; };
  const r = await cargarPlanes(fetchFalso);
  igual(r.map((p) => p.id), ['a', 'b']);
  verdadero(url.endsWith('data/ruleta/planes.json'), url);
});

prueba('ruleta: cargarPlanes falla si la respuesta no es ok', async () => {
  let fallo = false;
  try { await cargarPlanes(async () => ({ ok: false, status: 404, json: async () => [] })); } catch { fallo = true; }
  verdadero(fallo, 'debería lanzar');
});

prueba('ruleta: la racha guarda lo ya mostrado y en otra visita sigue sin repetir', () => {
  const alm = crearAlmacen(storageFalso());
  const primera = crearRacha(banco(), semilla(5), alm);
  const a = [primera.siguiente('nulo', 'casa').id, primera.siguiente('nulo', 'casa').id];
  igual(alm.leer(CLAVE_RULETA, null).vistos['nulo|casa'], a);
  const segunda = crearRacha(banco(), semilla(99), alm); // otra visita: racha nueva, mismo almacén
  const b = Array.from({ length: 3 }, () => segunda.siguiente('nulo', 'casa').id);
  igual([...a, ...b].sort(), ['n0', 'n1', 'n2', 'n3', 'n4']);
  const sexto = segunda.siguiente('nulo', 'casa'); // agotada: rebaraja sin empezar por el último
  verdadero(sexto.id !== b[2], 'el primero tras rebarajar repite al último');
  igual(alm.leer(CLAVE_RULETA, null).vistos['nulo|casa'], [sexto.id]);
});

prueba('ruleta: guardar la elección conserva lo ya mostrado y el valor viejo sigue valiendo', () => {
  const alm = crearAlmacen(storageFalso());
  alm.escribir(CLAVE_RULETA, { presupuesto: 'nulo', lugar: 'casa' }); // formato anterior, sin vistos
  const racha = crearRacha(banco(), semilla(2), alm);
  const primero = racha.siguiente('nulo', 'casa').id;
  guardarEleccion(alm, { presupuesto: 'grande', lugar: 'salir' });
  igual(leerEleccion(alm), { presupuesto: 'grande', lugar: 'salir' });
  igual(alm.leer(CLAVE_RULETA, null).vistos, { 'nulo|casa': [primero] });
});

prueba('ruleta: vistos corruptos o con ids desconocidos se ignoran', () => {
  for (const vistos of ['texto', 7, null, [], { 'nulo|casa': 'n1' }, { 'nulo|casa': [5, null] }]) {
    const alm = crearAlmacen(storageFalso());
    alm.escribir(CLAVE_RULETA, { presupuesto: 'nulo', lugar: 'casa', vistos });
    igual(leerEleccion(alm), { presupuesto: 'nulo', lugar: 'casa' });
    const ids = Array.from({ length: 5 }, () => crearRacha(banco(), semilla(4), alm).siguiente('nulo', 'casa').id);
    verdadero(ids.every((id) => /^n\d$/.test(id)), 'dio algo raro');
  }
  const alm = crearAlmacen(storageFalso());
  alm.escribir(CLAVE_RULETA, { presupuesto: 'nulo', lugar: 'casa', vistos: { 'nulo|casa': ['fantasma', 'n0', 'n1', 'n2', 'n3'] } });
  igual(crearRacha(banco(), semilla(4), alm).siguiente('nulo', 'casa').id, 'n4', 'ignora el id desconocido y sigue con el que falta');
});
