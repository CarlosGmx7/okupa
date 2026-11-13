// Pasada completa contra el emulador de Firestore. Correr con `npm run test:pasada`.
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

const PROYECTO = 'demo-okupa-pasada';
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8085';

const { initializeApp, deleteApp } = await import('firebase-admin/app');
const { getFirestore, Timestamp } = await import('firebase-admin/firestore');
const { pasada } = await import('./pasada.mjs');

let app;
let db;
const avisosOn = { diario: true, trivia: true, mapa: true, recordatorio: true };
const AHORA = new Date('2026-11-14T01:05:00Z'); // 20:05 en Bogotá del 13; franja 01:00

function mandador({ fallar = {} } = {}) {
  const enviados = [];
  const mandar = async (mensajes) => mensajes.map((m) => {
    enviados.push(m);
    return fallar[m.token] ? { ok: false, codigo: fallar[m.token] } : { ok: true };
  });
  return { enviados, mandar };
}
const sembrar = (datos) => Promise.all(Object.entries(datos).map(([ruta, v]) => db.doc(ruta).set(v)));
const existe = async (ruta) => (await db.doc(ruta).get()).exists;
const pareja = { lugares: { a: 'u1', b: 'u2' }, nombres: { a: 'Carlos', b: 'Yuli' } };
const disp = (uid, lugar, extra = {}) => ({ uid, pareja: 'K7PQ2M', lugar, token: `t-${lugar}`, avisos: avisosOn, hora: '20:00', zona: 'America/Bogota', franja: '01:00', ...extra });
const nota = (tipo, de, minutosAtras = 1) => ({ tipo, de, creado: Timestamp.fromMillis(AHORA.getTime() - minutosAtras * 60e3) });

before(() => { app = initializeApp({ projectId: PROYECTO }, 'pruebas-pasada'); db = getFirestore(app); });
after(async () => { await deleteApp(app); });
beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROYECTO}/databases/(default)/documents`, { method: 'DELETE' });
  // Sin recordatorios pendientes salvo que la prueba lo pida.
  await sembrar({ 'sistema/notificaciones': { ultimaFranja: '2026-11-14T01:00:00.000Z' } });
});

test('manda la nota de diario a b y la borra', async () => {
  await sembrar({ 'parejas/K7PQ2M': pareja, 'dispositivos/da': disp('u1', 'a'), 'dispositivos/db': disp('u2', 'b'),
    'parejas/K7PQ2M/avisos/diario_2026-11-13_a': nota('diario', 'a') });
  const m = mandador();
  const r = await pasada({ db, mandar: m.mandar, ahora: AHORA });
  assert.deepEqual(m.enviados, [{ token: 't-b', data: { titulo: 'Carlos respondió el Diario', texto: 'Entra a ver qué respondieron.', ruta: '#/diario', tipo: 'diario' } }]);
  assert.equal(r.enviados, 1);
  assert.equal(await existe('parejas/K7PQ2M/avisos/diario_2026-11-13_a'), false);
});

test('nota vencida o de pareja borrada se borra sin mandar', async () => {
  await sembrar({ 'parejas/K7PQ2M': pareja, 'dispositivos/db': disp('u2', 'b'),
    'parejas/K7PQ2M/avisos/trivia_p-1': nota('trivia', 'a', 45),
    'parejas/ZZZZZZ/avisos/diario_2026-11-13_a': nota('diario', 'a') });
  const m = mandador();
  const r = await pasada({ db, mandar: m.mandar, ahora: AHORA });
  assert.deepEqual(m.enviados, []);
  assert.equal(r.descartados, 2);
  assert.equal(await existe('parejas/K7PQ2M/avisos/trivia_p-1'), false);
  assert.equal(await existe('parejas/ZZZZZZ/avisos/diario_2026-11-13_a'), false);
});

test('token inválido borra el dispositivo y sigue con los demás', async () => {
  await sembrar({ 'parejas/K7PQ2M': pareja, 'dispositivos/db': disp('u2', 'b'), 'dispositivos/db2': disp('u2', 'b', { token: 't-b2' }),
    'parejas/K7PQ2M/avisos/mapa_l-1_a_nuevo': nota('mapa', 'a') });
  const m = mandador({ fallar: { 't-b': 'messaging/registration-token-not-registered' } });
  const r = await pasada({ db, mandar: m.mandar, ahora: AHORA });
  assert.equal(m.enviados.length, 2);
  assert.deepEqual([r.enviados, r.invalidos], [1, 1]);
  assert.equal(await existe('dispositivos/db'), false);
  assert.equal(await existe('dispositivos/db2'), true);
});

test('un error de formato (invalid-argument) no borra el registro', async () => {
  await sembrar({ 'parejas/K7PQ2M': pareja, 'dispositivos/db': disp('u2', 'b'),
    'parejas/K7PQ2M/avisos/diario_2026-11-13_a': nota('diario', 'a') });
  const m = mandador({ fallar: { 't-b': 'messaging/invalid-argument' } });
  const r = await pasada({ db, mandar: m.mandar, ahora: AHORA });
  assert.equal(r.invalidos, 0);
  assert.equal(await existe('dispositivos/db'), true);
});

test('no manda a un registro cuyo uid ya no es el del lugar', async () => {
  await sembrar({ 'parejas/K7PQ2M': pareja, 'dispositivos/viejo': disp('u9', 'b'),
    'parejas/K7PQ2M/avisos/diario_2026-11-13_a': nota('diario', 'a') });
  const m = mandador();
  await pasada({ db, mandar: m.mandar, ahora: AHORA });
  assert.deepEqual(m.enviados, []);
  assert.equal(await existe('dispositivos/viejo'), false);
});

test('recordatorio: a la franja, solo si no respondió hoy, y no repite', async () => {
  await sembrar({ 'parejas/K7PQ2M': pareja, 'dispositivos/da': disp('u1', 'a'), 'dispositivos/db': disp('u2', 'b'),
    'parejas/K7PQ2M/dias/2026-11-13/respuestas/gustos_b': { items: [] },
    'sistema/notificaciones': { ultimaFranja: '2026-11-14T00:45:00.000Z' } });
  const m = mandador();
  await pasada({ db, mandar: m.mandar, ahora: AHORA });
  assert.deepEqual(m.enviados, [{ token: 't-a', data: { titulo: '¿Ya respondiste el Diario?', texto: 'Te falta tu parte de hoy.', ruta: '#/diario', tipo: 'recordatorio' } }]);
  assert.equal((await db.doc('dispositivos/da').get()).data().ultimoRecordatorio, '2026-11-13');
  await sembrar({ 'sistema/notificaciones': { ultimaFranja: '2026-11-14T00:45:00.000Z' } });
  const m2 = mandador();
  await pasada({ db, mandar: m2.mandar, ahora: AHORA });
  assert.deepEqual(m2.enviados, []);
});

test('recordatorio de una franja saltada sale en la pasada siguiente', async () => {
  await sembrar({ 'parejas/K7PQ2M': pareja, 'dispositivos/da': disp('u1', 'a', { franja: '00:30' }),
    'sistema/notificaciones': { ultimaFranja: '2026-11-14T00:15:00.000Z' } });
  const m = mandador();
  await pasada({ db, mandar: m.mandar, ahora: AHORA });
  assert.equal(m.enviados.length, 1);
  assert.equal((await db.doc('sistema/notificaciones').get()).data().ultimaFranja, '2026-11-14T01:00:00.000Z');
});
