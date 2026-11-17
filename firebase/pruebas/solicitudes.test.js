// Reglas del cambio de celular (v22): solicitudes en parejas/{codigo}/solicitudes/{lugar}.
// u1 tiene el lugar a, u2 el b, u3 es el celular nuevo y u9 un extraño.
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  Timestamp, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore';

const CODIGO = 'K7PQ2M';
const RUTA = `parejas/${CODIGO}`;
const SOL_A = `${RUTA}/solicitudes/a`;
const DIA = 86400000;
const HORA = 3600000;
let entorno;

const db = (uid) => (uid ? entorno.authenticatedContext(uid) : entorno.unauthenticatedContext()).firestore();
const pareja = (uid) => doc(db(uid), RUTA);
const solicitud = (uid, lugar = 'a') => doc(db(uid), `${RUTA}/solicitudes/${lugar}`);
const hace = (ms) => Timestamp.fromMillis(Date.now() - ms);
const nueva = (uid) => ({ uid, creada: serverTimestamp() });

async function sembrar(datos) {
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    for (const [ruta, valor] of Object.entries(datos)) await setDoc(doc(ctx.firestore(), ruta), valor);
  });
}
const soloA = { lugares: { a: 'u1', b: null }, nombres: { a: 'Carlos', b: null } };
const completa = { lugares: { a: 'u1', b: 'u2' }, nombres: { a: 'Carlos', b: 'Sofi' } };
const pendiente = (antiguedadMs = HORA) => ({ uid: 'u3', creada: hace(antiguedadMs) });
const rechazada = (antiguedadMs, rechazoMs) => ({ ...pendiente(antiguedadMs), rechazada: hace(rechazoMs) });

before(async () => {
  entorno = await initializeTestEnvironment({
    projectId: 'demo-okupa-solicitudes',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 },
  });
});
after(async () => { await entorno.cleanup(); });
beforeEach(async () => { await entorno.clearFirestore(); });

describe('crear una solicitud', () => {
  beforeEach(() => sembrar({ [RUTA]: completa }));

  it('el celular nuevo la crea con su uid y la hora del servidor', async () => {
    await assertSucceeds(setDoc(solicitud('u3'), nueva('u3')));
  });
  it('con el uid de otro falla', async () => {
    await assertFails(setDoc(solicitud('u3'), nueva('u9')));
  });
  it('con una clave extra falla', async () => {
    await assertFails(setDoc(solicitud('u3'), { ...nueva('u3'), avisada: true }));
  });
  it('con una fecha que no es la del servidor falla (no se puede adelantar la espera)', async () => {
    await assertFails(setDoc(solicitud('u3'), { uid: 'u3', creada: hace(8 * DIA) }));
  });
  it('sin la fecha falla', async () => {
    await assertFails(setDoc(solicitud('u3'), { uid: 'u3' }));
  });
  it('sin sesión falla', async () => {
    await assertFails(setDoc(solicitud(null), nueva('u3')));
  });
  it('un miembro no puede pedir el lugar del otro', async () => {
    await assertFails(setDoc(solicitud('u2'), nueva('u2')));
  });
  it('sobre una solicitud que ya existe falla', async () => {
    await sembrar({ [SOL_A]: pendiente() });
    await assertFails(setDoc(solicitud('u9'), nueva('u9')));
  });
  it('quien la creó no puede reescribirla para renovar la fecha', async () => {
    await sembrar({ [SOL_A]: rechazada(2 * HORA, HORA) });
    await assertFails(setDoc(solicitud('u3'), nueva('u3')));
  });
  it('para un lugar que no es a ni b falla', async () => {
    await assertFails(setDoc(solicitud('u3', 'c'), nueva('u3')));
  });
  it('en una pareja que no existe falla', async () => {
    await assertFails(setDoc(doc(db('u3'), 'parejas/ZZZZZZ/solicitudes/a'), nueva('u3')));
  });
});

describe('crear una solicitud para un lugar vacío', () => {
  it('falla: un lugar vacío se ocupa, no se pide', async () => {
    await sembrar({ [RUTA]: soloA });
    await assertFails(setDoc(solicitud('u3', 'b'), nueva('u3')));
  });
});

describe('leer solicitudes', () => {
  beforeEach(() => sembrar({ [RUTA]: completa, [SOL_A]: pendiente() }));

  it('la leen los dos miembros y quien la creó', async () => {
    for (const uid of ['u1', 'u2', 'u3']) await assertSucceeds(getDoc(solicitud(uid)));
  });
  it('un extraño no la lee', async () => {
    await assertFails(getDoc(solicitud('u9')));
  });
  it('sin sesión no se lee', async () => {
    await assertFails(getDoc(solicitud(null)));
  });
  it('nadie las lista, ni un miembro', async () => {
    await assertFails(getDocs(collection(db('u1'), `${RUTA}/solicitudes`)));
    await assertFails(getDocs(collection(db('u3'), `${RUTA}/solicitudes`)));
  });
  it('quien pidió puede ver que su solicitud ya no existe', async () => {
    await assertSucceeds(getDoc(solicitud('u3', 'b')));
  });
});

describe('aprobar (entregar el lugar)', () => {
  beforeEach(() => sembrar({ [RUTA]: completa, [SOL_A]: pendiente(), [`${RUTA}/perfiles/a`]: { x: 1 } }));

  it('el celular que tiene el lugar lo entrega y deja de leer lo de la pareja', async () => {
    await assertSucceeds(updateDoc(pareja('u1'), { 'lugares.a': 'u3' }));
    await assertFails(getDoc(doc(db('u1'), `${RUTA}/perfiles/a`)));
    await assertSucceeds(getDoc(doc(db('u3'), `${RUTA}/perfiles/a`)));
  });
  it('la pareja no puede aprobar el lugar del otro', async () => {
    await assertFails(updateDoc(pareja('u2'), { 'lugares.a': 'u3' }));
  });
  it('quien pidió no puede aprobarse', async () => {
    await assertFails(updateDoc(pareja('u3'), { 'lugares.a': 'u3' }));
  });
  it('no se entrega a un uid distinto al de la solicitud', async () => {
    await assertFails(updateDoc(pareja('u1'), { 'lugares.a': 'u9' }));
  });
  it('no se entrega el lugar dejándolo vacío', async () => {
    await assertFails(updateDoc(pareja('u1'), { 'lugares.a': null }));
  });
  it('no se aprueba una solicitud rechazada', async () => {
    await sembrar({ [SOL_A]: rechazada(2 * HORA, HORA) });
    await assertFails(updateDoc(pareja('u1'), { 'lugares.a': 'u3' }));
  });
  it('no se entrega sin solicitud', async () => {
    await entorno.withSecurityRulesDisabled((ctx) => deleteDoc(doc(ctx.firestore(), SOL_A)));
    await assertFails(updateDoc(pareja('u1'), { 'lugares.a': 'u3' }));
  });
  it('al aprobar no se puede cambiar además el nombre ni otro campo', async () => {
    await assertFails(updateDoc(pareja('u1'), { 'lugares.a': 'u3', 'nombres.a': 'Otro' }));
    await assertFails(updateDoc(pareja('u1'), { 'lugares.a': 'u3', extra: true }));
  });
  it('con la solicitud del lugar a no se entrega el lugar b', async () => {
    await assertFails(updateDoc(pareja('u2'), { 'lugares.b': 'u3' }));
  });
});

describe('tomar el lugar cuando la solicitud venció', () => {
  it('a los 8 días quien pidió toma el lugar', async () => {
    await sembrar({ [RUTA]: completa, [SOL_A]: pendiente(8 * DIA) });
    await assertSucceeds(updateDoc(pareja('u3'), { 'lugares.a': 'u3' }));
  });
  it('a los 6 días todavía no', async () => {
    await sembrar({ [RUTA]: completa, [SOL_A]: pendiente(6 * DIA) });
    await assertFails(updateDoc(pareja('u3'), { 'lugares.a': 'u3' }));
  });
  it('una rechazada no se toma aunque tenga 8 días', async () => {
    await sembrar({ [RUTA]: completa, [SOL_A]: rechazada(8 * DIA, 2 * DIA) });
    await assertFails(updateDoc(pareja('u3'), { 'lugares.a': 'u3' }));
  });
  it('sin solicitud nadie reclama un lugar ocupado', async () => {
    await sembrar({ [RUTA]: completa });
    await assertFails(updateDoc(pareja('u9'), { 'lugares.a': 'u9' }));
    await assertFails(setDoc(pareja('u9'), { lugares: { a: 'u9' }, nombres: { a: 'Intruso' } }, { merge: true }));
  });
  it('un extraño no aprovecha la solicitud vencida de otro', async () => {
    await sembrar({ [RUTA]: completa, [SOL_A]: pendiente(8 * DIA) });
    await assertFails(updateDoc(pareja('u9'), { 'lugares.a': 'u9' }));
  });
  it('con la solicitud vencida del lugar a no se toma el lugar b', async () => {
    await sembrar({ [RUTA]: completa, [SOL_A]: pendiente(8 * DIA) });
    await assertFails(updateDoc(pareja('u3'), { 'lugares.b': 'u3' }));
  });
  it('al tomarlo no se puede cambiar además el nombre', async () => {
    await sembrar({ [RUTA]: completa, [SOL_A]: pendiente(8 * DIA) });
    await assertFails(updateDoc(pareja('u3'), { 'lugares.a': 'u3', 'nombres.a': 'Otro' }));
  });
  it('la pareja no se queda con los dos lugares usando una solicitud vieja', async () => {
    // u2 pidió el lugar a antes de unirse como b: sigue sin poder tomarlo.
    await sembrar({ [RUTA]: completa, [SOL_A]: { uid: 'u2', creada: hace(8 * DIA) } });
    await assertFails(updateDoc(pareja('u2'), { 'lugares.a': 'u2' }));
  });
});

describe('rechazar', () => {
  beforeEach(() => sembrar({ [RUTA]: completa, [SOL_A]: pendiente() }));

  it('cualquiera de los dos miembros la rechaza', async () => {
    await assertSucceeds(updateDoc(solicitud('u2'), { rechazada: serverTimestamp() }));
    await sembrar({ [SOL_A]: pendiente() });
    await assertSucceeds(updateDoc(solicitud('u1'), { rechazada: serverTimestamp() }));
  });
  it('quien pidió no la rechaza', async () => {
    await assertFails(updateDoc(solicitud('u3'), { rechazada: serverTimestamp() }));
  });
  it('un extraño no la rechaza', async () => {
    await assertFails(updateDoc(solicitud('u9'), { rechazada: serverTimestamp() }));
  });
  it('no se rechaza dos veces', async () => {
    await assertSucceeds(updateDoc(solicitud('u1'), { rechazada: serverTimestamp() }));
    await assertFails(updateDoc(solicitud('u2'), { rechazada: serverTimestamp() }));
  });
  it('al rechazar no se cambia el uid ni la fecha', async () => {
    await assertFails(updateDoc(solicitud('u1'), { rechazada: serverTimestamp(), uid: 'u1' }));
    await assertFails(updateDoc(solicitud('u1'), { rechazada: serverTimestamp(), creada: hace(8 * DIA) }));
  });
  it('la hora del rechazo es la del servidor', async () => {
    await assertFails(updateDoc(solicitud('u1'), { rechazada: hace(2 * DIA) }));
  });
  it('un miembro no puede cambiarle el uid ni adelantarle la fecha', async () => {
    await assertFails(updateDoc(solicitud('u2'), { uid: 'u9' }));
    await assertFails(updateDoc(solicitud('u2'), { creada: hace(8 * DIA) }));
  });
});

describe('borrar', () => {
  beforeEach(() => sembrar({ [RUTA]: completa, [SOL_A]: pendiente() }));

  it('los miembros la borran cuando quieran', async () => {
    await assertSucceeds(deleteDoc(solicitud('u1')));
    await sembrar({ [SOL_A]: rechazada(2 * HORA, HORA) });
    await assertSucceeds(deleteDoc(solicitud('u2')));
  });
  it('quien pidió cancela la suya si está pendiente', async () => {
    await assertSucceeds(deleteDoc(solicitud('u3')));
  });
  it('quien pidió no borra una rechazada hace 1 hora (freno de 24 h)', async () => {
    await sembrar({ [SOL_A]: rechazada(2 * HORA, HORA) });
    await assertFails(deleteDoc(solicitud('u3')));
  });
  it('quien pidió sí borra una rechazada hace 25 horas', async () => {
    await sembrar({ [SOL_A]: rechazada(2 * DIA, 25 * HORA) });
    await assertSucceeds(deleteDoc(solicitud('u3')));
  });
  it('quien pidió no cancela una pendiente que el servidor ya avisó (freno contra pedir y cancelar)', async () => {
    await sembrar({ [SOL_A]: { ...pendiente(2 * HORA), avisada: hace(HORA) } });
    await assertFails(deleteDoc(solicitud('u3')));
  });
  it('quien pidió sí cancela una pendiente avisada cuando pasaron 24 h desde que la creó', async () => {
    await sembrar({ [SOL_A]: { ...pendiente(25 * HORA), avisada: hace(20 * HORA) } });
    await assertSucceeds(deleteDoc(solicitud('u3')));
  });
  it('los miembros borran una pendiente avisada cuando quieran', async () => {
    await sembrar({ [SOL_A]: { ...pendiente(2 * HORA), avisada: hace(HORA) } });
    await assertSucceeds(deleteDoc(solicitud('u1')));
  });
  it('un extraño no la borra', async () => {
    await assertFails(deleteDoc(solicitud('u9')));
  });
});

describe('unirse a un lugar vacío', () => {
  it('sigue funcionando con el código, sin solicitud', async () => {
    await sembrar({ [RUTA]: soloA });
    await assertSucceeds(setDoc(pareja('u2'), { lugares: { b: 'u2' }, nombres: { b: 'Sofi' } }, { merge: true }));
  });
});
