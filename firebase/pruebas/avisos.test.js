// Reglas de dispositivos/{id} (registro para notificaciones) y parejas/{c}/avisos/{id} (bandeja).
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const CODIGO = 'K7PQ2M';
const RUTA = `parejas/${CODIGO}`;
let entorno;

const db = (uid) => (uid ? entorno.authenticatedContext(uid) : entorno.unauthenticatedContext()).firestore();
async function sembrar(datos) {
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    for (const [ruta, valor] of Object.entries(datos)) await setDoc(doc(ctx.firestore(), ruta), valor);
  });
}
const completa = { lugares: { a: 'u1', b: 'u2' }, nombres: { a: 'Carlos', b: 'Sofi' } };
const registro = (extra = {}) => ({
  uid: 'u1', pareja: CODIGO, lugar: 'a', token: 'tok-123',
  avisos: { diario: true, trivia: true, mapa: true, recordatorio: true },
  hora: '20:00', zona: 'America/Bogota', franja: '01:00', actualizado: serverTimestamp(), ...extra,
});
const disp = (uid, id = 'd1') => doc(db(uid), `dispositivos/${id}`);
const aviso = (uid, id, datos) => setDoc(doc(db(uid), `${RUTA}/avisos/${id}`), datos);
const nota = (extra = {}) => ({ tipo: 'diario', de: 'a', creado: serverTimestamp(), ...extra });

before(async () => {
  entorno = await initializeTestEnvironment({
    // Proyecto propio: node --test corre los archivos en paralelo contra el mismo emulador.
    projectId: 'demo-okupa-avisos',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 },
  });
});
after(async () => { await entorno.cleanup(); });
beforeEach(async () => { await entorno.clearFirestore(); await sembrar({ [RUTA]: completa }); });

describe('dispositivos', () => {
  it('u1 registra el suyo con su lugar', async () => {
    await assertSucceeds(setDoc(disp('u1'), registro()));
  });
  it('con uid, lugar o pareja ajenos, o campo extra, falla', async () => {
    await assertFails(setDoc(disp('u1'), registro({ uid: 'u2' })));
    await assertFails(setDoc(disp('u1'), registro({ lugar: 'b' })));
    await sembrar({ 'parejas/ZZZZZZ': { lugares: { a: 'u7', b: 'u8' }, nombres: { a: 'X', b: 'Y' } } });
    await assertFails(setDoc(disp('u1'), registro({ pareja: 'ZZZZZZ' })));
    await assertFails(setDoc(disp('u1'), registro({ ultimoRecordatorio: '2026-11-13' })));
    await assertFails(setDoc(disp('u1'), registro({ otro: 1 })));
  });
  it('hora, franja o avisos con formato malo falla', async () => {
    await assertFails(setDoc(disp('u1'), registro({ hora: '8pm' })));
    await assertFails(setDoc(disp('u1'), registro({ franja: '01:07' })));
    await assertFails(setDoc(disp('u1'), registro({ avisos: { diario: 'si', trivia: true, mapa: true, recordatorio: true } })));
    await assertFails(setDoc(disp('u1'), registro({ token: '' })));
  });
  it('u2 no lee ni borra el de u1; nadie lista', async () => {
    await sembrar({ 'dispositivos/d1': registro({ actualizado: 1 }) });
    await assertSucceeds(getDoc(disp('u1')));
    await assertFails(getDoc(disp('u2')));
    await assertFails(deleteDoc(disp('u2')));
    await assertFails(getDocs(collection(db('u1'), 'dispositivos')));
    await assertSucceeds(deleteDoc(disp('u1')));
  });
  it('u1 actualiza franja y token del suyo, aunque ya tenga ultimoRecordatorio', async () => {
    await sembrar({ 'dispositivos/d1': registro({ actualizado: 1, ultimoRecordatorio: '2026-11-12' }) });
    await assertSucceeds(setDoc(disp('u1'), { franja: '02:00', token: 'tok-9', actualizado: serverTimestamp() }, { merge: true }));
  });
  it('u1 no cambia ni borra ultimoRecordatorio', async () => {
    await sembrar({ 'dispositivos/d1': registro({ actualizado: 1, ultimoRecordatorio: '2026-11-12' }) });
    await assertFails(setDoc(disp('u1'), { ultimoRecordatorio: '2026-11-13' }, { merge: true }));
    await assertFails(updateDoc(disp('u1'), { ultimoRecordatorio: deleteField() }));
  });
  it('acepta registro viejo sin fechas ni franjaFechas', async () => {
    await assertSucceeds(setDoc(disp('u1'), registro()));
    await sembrar({ 'dispositivos/d2': registro({ actualizado: 1 }) });
    await assertSucceeds(setDoc(disp('u1', 'd2'), { token: 'tok-2', actualizado: serverTimestamp() }, { merge: true }));
  });
  it('acepta avisos.fechas bool y franjaFechas 13:00', async () => {
    const avisos = { diario: true, trivia: true, mapa: true, recordatorio: true, fechas: false };
    await assertSucceeds(setDoc(disp('u1'), registro({ avisos, franjaFechas: '13:00' })));
    await assertFails(setDoc(disp('u1'), registro({ avisos: { ...avisos, fechas: 'si' } })));
  });
  it('rechaza franjaFechas 13:07', async () => {
    await assertFails(setDoc(disp('u1'), registro({ franjaFechas: '13:07' })));
  });
  it('el dueño no puede poner ni cambiar ultimoFechas', async () => {
    await assertFails(setDoc(disp('u1'), registro({ ultimoFechas: '2026-11-13' })));
    await sembrar({ 'dispositivos/d1': registro({ actualizado: 1, ultimoFechas: '2026-11-12' }) });
    await assertFails(setDoc(disp('u1'), { ultimoFechas: '2026-11-13' }, { merge: true }));
    await assertFails(updateDoc(disp('u1'), { ultimoFechas: deleteField() }));
    await assertSucceeds(setDoc(disp('u1'), { franjaFechas: '13:15', actualizado: serverTimestamp() }, { merge: true }));
  });
  it('u2 no se apropia del registro de u1', async () => {
    await sembrar({ 'dispositivos/d1': registro({ actualizado: 1 }) });
    await assertFails(setDoc(disp('u2'), registro({ uid: 'u2', lugar: 'b' })));
  });
});

describe('avisos (bandeja)', () => {
  it('u1 crea una nota de diario suya', async () => {
    await assertSucceeds(aviso('u1', 'diario_2026-11-13_a', nota()));
    await assertSucceeds(aviso('u1', 'trivia_p-abc1', nota({ tipo: 'trivia' })));
    await assertSucceeds(aviso('u1', 'mapa_l-x9_a_nuevo', nota({ tipo: 'mapa' })));
    await assertSucceeds(aviso('u1', 'mapa_l-x9_a_version', nota({ tipo: 'mapa' })));
  });
  it('notas con datos o id que no corresponden fallan', async () => {
    await assertFails(aviso('u1', 'diario_2026-11-13_a', nota({ de: 'b' })));
    await assertFails(aviso('u1', 'diario_2026-11-13_b', nota()));
    await assertFails(aviso('u1', 'diario_2026-11-13_a', nota({ tipo: 'match' })));
    await assertFails(aviso('u1', 'basura', nota()));
    await assertFails(aviso('u1', 'mapa_l-x9_b_nuevo', nota({ tipo: 'mapa' })));
    await assertFails(aviso('u1', 'trivia_p-abc1', nota()));
    await assertFails(aviso('u1', 'diario_2026-11-13_a', nota({ extra: 1 })));
    await assertFails(aviso('u1', 'diario_2026-11-13_a', nota({ creado: 5 })));
    await assertFails(aviso('u3', 'diario_2026-11-13_a', nota()));
  });
  it('nadie lee, lista, cambia ni borra la bandeja', async () => {
    await sembrar({ [`${RUTA}/avisos/diario_2026-11-13_a`]: { tipo: 'diario', de: 'a', creado: 1 } });
    for (const uid of ['u1', 'u2']) {
      await assertFails(getDoc(doc(db(uid), `${RUTA}/avisos/diario_2026-11-13_a`)));
      await assertFails(getDocs(collection(db(uid), `${RUTA}/avisos`)));
      await assertFails(deleteDoc(doc(db(uid), `${RUTA}/avisos/diario_2026-11-13_a`)));
    }
    await assertFails(aviso('u1', 'diario_2026-11-13_a', nota()));
  });
});
