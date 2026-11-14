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

// --- Avisos de fechas ---
const AHORA_F = new Date('2026-03-10T13:05:00Z'); // 8:05 en Bogotá; franja 13:00
const dispF = (uid, lugar, extra = {}) => disp(uid, lugar, { franjaFechas: '13:00', franja: '09:00', ...extra });
const otra = { tipo: 'otra', fecha: '2020-03-10', nombre: 'Mudanza' };
const base = { 'sistema/notificaciones': { ultimaFranja: '2026-03-10T12:45:00.000Z' } };

test('fechas: manda las fechas del día a los dos y marca ultimoFechas', async () => {
  await sembrar({ ...base, 'parejas/K7PQ2M': pareja, 'dispositivos/da': dispF('u1', 'a'), 'dispositivos/db': dispF('u2', 'b'),
    'parejas/K7PQ2M/fechas/otra_1': otra });
  const m = mandador();
  const r = await pasada({ db, mandar: m.mandar, ahora: AHORA_F });
  assert.equal(m.enviados.length, 2);
  for (const e of m.enviados) {
    assert.equal(e.data.tipo, 'fechas');
    assert.equal(e.data.ruta, '#/fechas');
    assert.equal(e.data.titulo, 'Hoy: Mudanza');
  }
  assert.equal(r.fechas, 2);
  for (const id of ['da', 'db']) assert.equal((await db.doc(`dispositivos/${id}`).get()).data().ultimoFechas, '2026-03-10');
});

test('fechas: no repite si ultimoFechas ya es hoy', async () => {
  await sembrar({ ...base, 'parejas/K7PQ2M': pareja, 'dispositivos/da': dispF('u1', 'a', { ultimoFechas: '2026-03-10' }),
    'parejas/K7PQ2M/fechas/otra_1': otra });
  const m = mandador();
  await pasada({ db, mandar: m.mandar, ahora: AHORA_F });
  assert.deepEqual(m.enviados, []);
});

test('fechas: respeta avisos.fechas false y registros sin franjaFechas', async () => {
  await sembrar({ ...base, 'parejas/K7PQ2M': pareja,
    'dispositivos/da': dispF('u1', 'a', { avisos: { ...avisosOn, fechas: false } }),
    'dispositivos/db': disp('u2', 'b'),
    'parejas/K7PQ2M/fechas/otra_1': otra });
  const m = mandador();
  await pasada({ db, mandar: m.mandar, ahora: AHORA_F });
  assert.deepEqual(m.enviados, []);
});

test('fechas: sin nada que avisar no escribe ultimoFechas', async () => {
  await sembrar({ ...base, 'parejas/K7PQ2M': pareja, 'dispositivos/da': dispF('u1', 'a') });
  const m = mandador();
  await pasada({ db, mandar: m.mandar, ahora: AHORA_F });
  assert.deepEqual(m.enviados, []);
  assert.equal((await db.doc('dispositivos/da').get()).data().ultimoFechas, undefined);
});

test('fechas: semana antes del cumple solo al otro', async () => {
  await sembrar({ 'sistema/notificaciones': { ultimaFranja: '2026-03-03T12:45:00.000Z' }, 'parejas/K7PQ2M': pareja,
    'dispositivos/da': dispF('u1', 'a'), 'dispositivos/db': dispF('u2', 'b'),
    'parejas/K7PQ2M/fechas/cumple_a': { tipo: 'cumple', de: 'a', fecha: '1995-03-10' } });
  const m = mandador();
  await pasada({ db, mandar: m.mandar, ahora: new Date('2026-03-03T13:05:00Z') });
  assert.equal(m.enviados.length, 1);
  assert.equal(m.enviados[0].token, 't-b');
  assert.equal(m.enviados[0].data.titulo, 'En una semana: cumpleaños de Carlos');
});