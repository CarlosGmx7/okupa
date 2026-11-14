// Reglas de «¿Quién es más probable?» (parejas/{c}/probable, votos y probable_frases). Correr con `npm test` desde firebase/.
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

const CODIGO = 'K7PQ2M';
const RUTA = `parejas/${CODIGO}`;
const SALA = 'probable/q-abcd1';
let entorno;

const db = (uid) => entorno.authenticatedContext(uid).firestore();
const d = (uid, ruta) => doc(db(uid), `${RUTA}/${ruta}`);
async function sembrar(datos) {
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    for (const [ruta, valor] of Object.entries(datos)) await setDoc(doc(ctx.firestore(), ruta), valor);
  });
}
const completa = { lugares: { a: 'u1', b: 'u2' }, nombres: { a: 'Carlos', b: 'Yuli' } };
const sala = (estado = 'jugando', extra = {}) => ({ estado, tema: 'divertidas', largo: 5, creadaMs: 1, ...extra });
const salaEn = (estado) => sembrar({ [`${RUTA}/${SALA}`]: sala(estado) });
const voto = (v = 'a') => ({ voto: v });
const V = (clave) => `${SALA}/votos/${clave}`;

before(async () => {
  entorno = await initializeTestEnvironment({
    // Proyecto propio: node --test corre los archivos en paralelo contra el mismo emulador.
    projectId: 'demo-okupa-probable',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 },
  });
});
after(async () => { await entorno.cleanup(); });
beforeEach(async () => {
  await entorno.clearFirestore();
  await sembrar({ [RUTA]: completa });
});

describe('probable: sala', () => {
  it('un miembro crea una sala con id válido; los dos la leen; un extraño nada', async () => {
    await assertSucceeds(setDoc(d('u1', SALA), sala('esperando')));
    await assertSucceeds(getDoc(d('u2', SALA)));
    await assertSucceeds(getDoc(d('u1', SALA)));
    await assertFails(getDoc(d('u9', SALA)));
    await assertFails(setDoc(d('u9', 'probable/q-zzzz1'), sala()));
  });
  it('rechaza ids malos', async () => {
    for (const id of ['abcd1', 'q-ab', 'q-ABCD1', 'q-' + 'a'.repeat(31), 'p-abcd1'])
      await assertFails(setDoc(d('u1', `probable/${id}`), sala('esperando')));
    await assertSucceeds(setDoc(d('u1', 'probable/q-' + 'a'.repeat(30)), sala('esperando')));
  });
  it('durante el juego los dos actualizan la sala', async () => {
    await salaEn('esperando');
    await assertSucceeds(updateDoc(d('u2', SALA), { estado: 'jugando' }));
    await assertSucceeds(updateDoc(d('u1', SALA), { indice: 1 }));
    await assertFails(updateDoc(d('u9', SALA), { indice: 2 }));
  });
  it('una sala cerrada no se reabre, pero acepta el mismo estado y otros campos', async () => {
    for (const cerrada of ['cancelada', 'terminada']) {
      await salaEn(cerrada);
      await assertFails(updateDoc(d('u1', SALA), { estado: 'jugando' }));
      await assertFails(updateDoc(d('u2', SALA), { estado: 'esperando' }));
      await assertFails(updateDoc(d('u1', SALA), { estado: cerrada === 'cancelada' ? 'terminada' : 'cancelada' }));
      await assertSucceeds(updateDoc(d('u1', SALA), { estado: cerrada }));
      await assertSucceeds(updateDoc(d('u2', SALA), { indice: 3 }));
    }
  });
  it('poner cancelada y volver a jugando se rechaza', async () => {
    await salaEn('jugando');
    await assertSucceeds(updateDoc(d('u1', SALA), { estado: 'cancelada' }));
    await assertFails(updateDoc(d('u1', SALA), { estado: 'jugando' }));
    await assertFails(updateDoc(d('u2', SALA), { estado: 'esperando' }));
  });
});

describe('probable: votos ocultos', () => {
  it('b no lee 0_a sin haber votado 0; tras votar 0_b sí lo lee', async () => {
    await salaEn('jugando');
    await sembrar({ [`${RUTA}/${V('0_a')}`]: voto('a') });
    await assertFails(getDoc(d('u2', V('0_a'))));
    await assertSucceeds(setDoc(d('u2', V('0_b')), voto('b')));
    await assertSucceeds(getDoc(d('u2', V('0_a'))));
    await assertSucceeds(getDoc(d('u1', V('0_a')))); // el propio siempre
    await assertSucceeds(getDoc(d('u1', V('0_b')))); // u1 ya votó 0 y lo ve
  });
  it('b no lee 1_a aunque votó 0', async () => {
    await salaEn('jugando');
    await sembrar({ [`${RUTA}/${V('0_a')}`]: voto(), [`${RUTA}/${V('0_b')}`]: voto(), [`${RUTA}/${V('1_a')}`]: voto() });
    await assertSucceeds(getDoc(d('u2', V('0_a'))));
    await assertFails(getDoc(d('u2', V('1_a'))));
  });
  it('un extraño no lee ni crea votos', async () => {
    await salaEn('jugando');
    await sembrar({ [`${RUTA}/${V('0_a')}`]: voto(), [`${RUTA}/${V('0_b')}`]: voto() });
    await assertFails(getDoc(d('u9', V('0_a'))));
    await assertFails(setDoc(d('u9', V('1_a')), voto()));
  });
  it('b no crea 0_a (voto del otro); cada uno crea el suyo', async () => {
    await salaEn('jugando');
    await assertFails(setDoc(d('u2', V('0_a')), voto()));
    await assertFails(setDoc(d('u1', V('0_b')), voto()));
    await assertSucceeds(setDoc(d('u1', V('0_a')), voto('todos')));
    await assertSucceeds(setDoc(d('u2', V('19_b')), voto('a')));
  });
  it('voto inválido, clave extra o clave de documento mala se rechazan', async () => {
    await salaEn('jugando');
    await assertFails(setDoc(d('u1', V('0_a')), voto('c')));
    await assertFails(setDoc(d('u1', V('0_a')), { voto: 1 }));
    await assertFails(setDoc(d('u1', V('0_a')), { voto: 'a', extra: 1 }));
    await assertFails(setDoc(d('u1', V('0_a')), {}));
    await assertFails(setDoc(d('u1', V('20_a')), voto()));
    await assertFails(setDoc(d('u1', V('x_a')), voto()));
    await assertFails(setDoc(d('u1', V('0_c')), voto()));
    await assertFails(setDoc(d('u1', V('0_a_a')), voto()));
    await assertFails(setDoc(d('u1', V('00_a')), voto()));
  });
  it('crear voto solo con la sala jugando (no esperando, cerrada ni inexistente)', async () => {
    await salaEn('esperando');
    await assertFails(setDoc(d('u1', V('0_a')), voto()));
    await salaEn('terminada');
    await assertFails(setDoc(d('u1', V('0_a')), voto()));
    await salaEn('cancelada');
    await assertFails(setDoc(d('u1', V('0_a')), voto()));
    await entorno.clearFirestore();
    await sembrar({ [RUTA]: completa });
    await assertFails(setDoc(d('u1', V('0_a')), voto()));
  });
  it('no se cambia el voto: update y sobrescribir fallan', async () => {
    await salaEn('jugando');
    await sembrar({ [`${RUTA}/${V('0_a')}`]: voto('a') });
    await assertFails(updateDoc(d('u1', V('0_a')), { voto: 'b' }));
    await assertFails(setDoc(d('u1', V('0_a')), voto('b')));
    await assertFails(setDoc(d('u1', V('0_a')), voto('a'), { merge: true }));
  });
  it('borrar y recrear el propio voto durante el juego se rechaza', async () => {
    await salaEn('jugando');
    await sembrar({ [`${RUTA}/${V('0_a')}`]: voto('a') });
    await assertFails(deleteDoc(d('u1', V('0_a'))));
    await assertFails(deleteDoc(d('u2', V('0_a'))));
    await assertFails(deleteDoc(d('u9', V('0_a'))));
  });
  it('con la sala cancelada o terminada los miembros borran votos; un extraño no', async () => {
    for (const cerrada of ['cancelada', 'terminada']) {
      await salaEn(cerrada);
      await sembrar({ [`${RUTA}/${V('0_a')}`]: voto(), [`${RUTA}/${V('0_b')}`]: voto() });
      await assertFails(deleteDoc(d('u9', V('0_a'))));
      await assertSucceeds(deleteDoc(d('u2', V('0_a'))));
      await assertSucceeds(deleteDoc(d('u1', V('0_b'))));
    }
  });
  it('nadie lista los votos', async () => {
    await salaEn('jugando');
    await sembrar({ [`${RUTA}/${V('0_a')}`]: voto(), [`${RUTA}/${V('0_b')}`]: voto() });
    await assertFails(getDocs(collection(db('u1'), `${RUTA}/${SALA}/votos`)));
    await assertFails(getDocs(collection(db('u2'), `${RUTA}/${SALA}/votos`)));
  });
});

describe('probable: «Borrar todo»', () => {
  it('sala jugando con votos: cancelada, votos y sala, todo permitido', async () => {
    await salaEn('jugando');
    await sembrar({ [`${RUTA}/${V('0_a')}`]: voto(), [`${RUTA}/${V('0_b')}`]: voto(), [`${RUTA}/${V('1_a')}`]: voto() });
    await assertFails(deleteDoc(d('u2', V('0_b')))); // antes de cancelar no se puede
    await assertSucceeds(updateDoc(d('u2', SALA), { estado: 'cancelada' }));
    await assertSucceeds(deleteDoc(d('u2', V('0_a'))));
    await assertSucceeds(deleteDoc(d('u2', V('0_b'))));
    await assertSucceeds(deleteDoc(d('u2', V('1_a'))));
    await assertSucceeds(deleteDoc(d('u2', SALA)));
    await assertSucceeds(deleteDoc(d('u2', V('3_b')))); // sin sala, borrar a ciegas sigue bien
  });
  it('sala terminada con votos: votos y sala sin tocar el estado', async () => {
    await salaEn('terminada');
    await sembrar({ [`${RUTA}/${V('0_a')}`]: voto(), [`${RUTA}/${V('0_b')}`]: voto() });
    await assertSucceeds(deleteDoc(d('u1', V('0_a'))));
    await assertSucceeds(deleteDoc(d('u1', V('0_b'))));
    await assertSucceeds(deleteDoc(d('u1', SALA)));
  });
  it('un extraño no borra la sala', async () => {
    await salaEn('terminada');
    await assertFails(deleteDoc(d('u9', SALA)));
  });
});

describe('probable_frases', () => {
  const FRASE = 'probable_frases/f-abc12';
  const frase = (extra = {}) => ({ texto: 'dejar la ropa tirada', creadaMs: 1, ...extra });
  it('un miembro crea; los dos leen; un extraño nada', async () => {
    await assertSucceeds(setDoc(d('u1', FRASE), frase()));
    await assertSucceeds(getDoc(d('u2', FRASE)));
    await assertSucceeds(getDocs(collection(db('u2'), `${RUTA}/probable_frases`)));
    await assertFails(getDoc(d('u9', FRASE)));
    await assertFails(setDoc(d('u9', 'probable_frases/f-zzzz1'), frase()));
  });
  it('texto de 4 o 121 caracteres, no string o clave extra se rechazan; 5 y 120 pasan', async () => {
    await assertFails(setDoc(d('u1', FRASE), frase({ texto: 'abcd' })));
    await assertFails(setDoc(d('u1', FRASE), frase({ texto: 'x'.repeat(121) })));
    await assertFails(setDoc(d('u1', FRASE), frase({ texto: 12345 })));
    await assertFails(setDoc(d('u1', FRASE), frase({ extra: 1 })));
    await assertSucceeds(setDoc(d('u1', FRASE), frase({ texto: 'abcde' })));
    await assertSucceeds(setDoc(d('u1', 'probable_frases/f-largo1'), frase({ texto: 'x'.repeat(120) })));
  });
  it('rechaza ids malos', async () => {
    for (const id of ['abc12', 'f-', 'f-ABC', 'g-abc12', 'f-ab_c'])
      await assertFails(setDoc(d('u1', `probable_frases/${id}`), frase()));
  });
  it('no se actualiza; cualquier miembro la borra; un extraño no', async () => {
    await sembrar({ [`${RUTA}/${FRASE}`]: frase() });
    await assertFails(setDoc(d('u1', FRASE), frase({ texto: 'otra cosa distinta' })));
    await assertFails(updateDoc(d('u2', FRASE), { texto: 'otra cosa distinta' }));
    await assertFails(deleteDoc(d('u9', FRASE)));
    await assertSucceeds(deleteDoc(d('u2', FRASE)));
  });
});
