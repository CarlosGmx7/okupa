import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { idAviso, avisar, usarRelevo, relevoDesde } from '../js/nucleo/avisos.js';
import { crearSala } from '../js/modulos/trivia/sala.js';
import { crearSala as crearSalaProbable } from '../js/modulos/probable/sala.js';
import { crearLugar, guardarVersion } from '../js/modulos/mapa/lugares.js';
import { enviar } from '../js/modulos/diario/dia.js';

const PAREJA = { codigo: 'K7PQ2M', lugar: 'a' };
const BANDEJA = 'parejas/K7PQ2M/avisos/';
const notas = (mundo) => [...mundo.datos.keys()].filter((r) => r.startsWith(BANDEJA)).map((r) => r.slice(BANDEJA.length)).sort();

// Nube que falla solo al escribir en la bandeja.
function sinBandeja(nube) {
  return { ...nube, escribir: (ruta, ...resto) => (ruta.includes('/avisos/') ? Promise.reject(new Error('sin permiso')) : nube.escribir(ruta, ...resto)) };
}

prueba('avisos: ids con el formato de las reglas', () => {
  igual(idAviso('diario', { fecha: '2026-11-13', lugar: 'a' }), 'diario_2026-11-13_a');
  igual(idAviso('trivia', { idPartida: 'p-abc1' }), 'trivia_p-abc1');
  igual(idAviso('probable', { idSala: 'q-abcd' }), 'probable_q-abcd');
  igual(idAviso('mapa', { idLugar: 'l-x9', lugar: 'b', clase: 'version' }), 'mapa_l-x9_b_version');
  igual(idAviso('match', { idPartida: 'x' }), null);
});

prueba('avisos: avisar escribe la nota', async () => {
  const mundo = crearMundoFalso();
  igual(await avisar(mundo.nube('u1'), PAREJA, 'diario', 'diario_2026-11-13_a'), true);
  const nota = mundo.datos.get(`${BANDEJA}diario_2026-11-13_a`).valor;
  igual([nota.tipo, nota.de, typeof nota.creado], ['diario', 'a', 'number']);
});

prueba('avisos: avisar nunca rechaza', async () => {
  const nube = { escribir: () => Promise.reject(new Error('caída')) };
  igual(await avisar(nube, PAREJA, 'diario', 'diario_2026-11-13_a'), false);
  igual(await avisar(null, PAREJA, 'diario', 'x'), false);
});

prueba('avisos: crear sala deja nota de trivia', async () => {
  const mundo = crearMundoFalso();
  const id = await crearSala(mundo.nube('u1'), PAREJA, { preguntas: [], id: 'p-abc1' });
  igual(id, 'p-abc1');
  igual(notas(mundo), ['trivia_p-abc1']);
});

prueba('avisos: crear sala de probable deja nota de probable', async () => {
  const mundo = crearMundoFalso();
  const id = await crearSalaProbable(mundo.nube('u1'), PAREJA, { tema: 'divertidas', frases: [], id: 'q-abcd' });
  igual(id, 'q-abcd');
  igual(notas(mundo), ['probable_q-abcd']);
  igual(mundo.datos.get(`${BANDEJA}probable_q-abcd`).valor.tipo, 'probable');
});

prueba('avisos: crear lugar y guardar versión dejan notas de mapa', async () => {
  const mundo = crearMundoFalso();
  const nube = mundo.nube('u1');
  const r = await crearLugar(nube, PAREJA, { nombre: 'Monserrate', lat: 4.6, lng: -74.05, tipo: 'deseo', nota: '' });
  verdadero(r.ok, JSON.stringify(r));
  igual(notas(mundo), [`mapa_${r.id}_a_nuevo`]);
  await guardarVersion(nube, PAREJA, r.id, 'Fue lindo');
  igual(notas(mundo), [`mapa_${r.id}_a_nuevo`, `mapa_${r.id}_a_version`]);
});

prueba('avisos: enviar gustos deja nota de diario una sola vez', async () => {
  const mundo = crearMundoFalso();
  const nube = mundo.nube('u1');
  igual(await enviar(nube, PAREJA, '2026-11-13', 'gustos', { items: [] }), true);
  igual(notas(mundo), ['diario_2026-11-13_a']);
  mundo.datos.delete(`${BANDEJA}diario_2026-11-13_a`);
  igual(await enviar(nube, PAREJA, '2026-11-13', 'gustos', { items: [] }), false);
  await enviar(nube, PAREJA, '2026-11-13', 'ingles', { items: [] });
  igual(notas(mundo), []);
});

prueba('avisos: corregir la versión propia no vuelve a avisar', async () => {
  const mundo = crearMundoFalso();
  const nube = mundo.nube('u1');
  const r = await crearLugar(nube, PAREJA, { nombre: 'Lago', lat: 4.6, lng: -74.05, tipo: 'recuerdo', nota: '' });
  await guardarVersion(nube, PAREJA, r.id, 'Primera');
  // El servidor ya mandó y borró las notas:
  for (const id of notas(mundo)) mundo.datos.delete(`${BANDEJA}${id}`);
  igual((await guardarVersion(nube, PAREJA, r.id, 'Corregida')).ok, true);
  igual(notas(mundo), []);
});

prueba('avisos: si la nota falla, lo principal igual se guarda', async () => {
  const mundo = crearMundoFalso();
  const nube = sinBandeja(mundo.nube('u1'));
  igual(await crearSala(nube, PAREJA, { preguntas: [], id: 'p-z' }), 'p-z');
  verdadero(mundo.datos.has('parejas/K7PQ2M/partidas/p-z'));
  const r = await crearLugar(nube, PAREJA, { nombre: 'Parque', lat: 4.6, lng: -74.05, tipo: 'deseo', nota: '' });
  verdadero(r.ok);
  igual((await guardarVersion(nube, PAREJA, r.id, 'Hola')).ok, true);
  igual(await enviar(nube, PAREJA, '2026-11-13', 'gustos', { items: [] }), true);
  igual(notas(mundo), []);
});

// Relevo: despierta al servidor para que las invitaciones de juego lleguen en segundos.
async function conRelevo(fn, relevo) {
  const llamadas = [];
  usarRelevo(relevo ?? (() => { llamadas.push(1); return Promise.resolve(); }));
  try { await fn(llamadas); } finally { usarRelevo(null); }
}

prueba('avisos: los avisos de juego despiertan al relevo; diario y mapa no', () => conRelevo(async (llamadas) => {
  const nube = crearMundoFalso().nube('u1');
  for (const tipo of ['trivia', 'probable', 'trivia-acepto', 'probable-acepto']) await avisar(nube, PAREJA, tipo, `${tipo}_x`);
  igual(llamadas.length, 4);
  await avisar(nube, PAREJA, 'diario', 'diario_2026-11-13_a');
  await avisar(nube, PAREJA, 'mapa', 'mapa_l_a_nuevo');
  igual(llamadas.length, 4);
}));

prueba('avisos: si la nota no se pudo escribir, no despierta al relevo', () => conRelevo(async (llamadas) => {
  const nube = sinBandeja(crearMundoFalso().nube('u1'));
  igual(await avisar(nube, PAREJA, 'trivia', 'trivia_p-1'), false);
  igual(llamadas.length, 0);
}));

prueba('avisos: un relevo que lanza, rechaza o nunca responde no estorba', async () => {
  const nube = crearMundoFalso().nube('u1');
  await conRelevo(async () => igual(await avisar(nube, PAREJA, 'trivia', 'trivia_p-1'), true), () => { throw new Error('mal'); });
  await conRelevo(async () => igual(await avisar(nube, PAREJA, 'trivia', 'trivia_p-2'), true), () => Promise.reject(new Error('sin red')));
  await conRelevo(async () => igual(await avisar(nube, PAREJA, 'trivia', 'trivia_p-3'), true), () => new Promise(() => {}));
});

prueba('avisos: relevoDesde arma el pedido sin cuerpo y sin esperar respuesta', async () => {
  igual(relevoDesde(null), null);
  igual(relevoDesde(''), null);
  const pedidos = [];
  await relevoDesde('https://x.workers.dev', async (...a) => { pedidos.push(a); })();
  igual(pedidos, [['https://x.workers.dev', { method: 'POST', mode: 'no-cors', keepalive: true }]]);
});

prueba('avisos: crear una sala de Trivia despierta al relevo una vez', () => conRelevo(async (llamadas) => {
  const mundo = crearMundoFalso();
  await crearSala(mundo.nube('u1'), PAREJA, { preguntas: [], id: 'p-rel' });
  igual(llamadas.length, 1);
}));