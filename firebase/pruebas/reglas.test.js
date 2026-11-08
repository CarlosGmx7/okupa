// Pruebas de firestore.rules contra el emulador. Correr con `npm test` desde firebase/.
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

const CODIGO = 'K7PQ2M';
const RUTA = `parejas/${CODIGO}`;
let entorno;

const db = (uid) => (uid ? entorno.authenticatedContext(uid) : entorno.unauthenticatedContext()).firestore();
const pareja = (uid) => doc(db(uid), RUTA);
const combinar = (uid, datos, ruta = RUTA) => setDoc(doc(db(uid), ruta), datos, { merge: true });

async function sembrar(datos) {
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    for (const [ruta, valor] of Object.entries(datos)) await setDoc(doc(ctx.firestore(), ruta), valor);
  });
}
const soloA = { lugares: { a: 'u1', b: null }, nombres: { a: 'Carlos', b: null } };
const completa = { lugares: { a: 'u1', b: 'u2' }, nombres: { a: 'Carlos', b: 'Sofi' } };

before(async () => {
  entorno = await initializeTestEnvironment({
    projectId: 'demo-okupa',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 },
  });
});
after(async () => { await entorno.cleanup(); });
beforeEach(async () => { await entorno.clearFirestore(); });

describe('leer y listar parejas', () => {
  it('sin sesión no se lee la pareja', async () => {
    await sembrar({ [RUTA]: soloA });
    await assertFails(getDoc(pareja(null)));
  });
  it('un extraño con sesión sí la lee (para unirse)', async () => {
    await sembrar({ [RUTA]: soloA });
    await assertSucceeds(getDoc(pareja('u3')));
  });
  it('nadie puede listar parejas', async () => {
    await sembrar({ [RUTA]: completa });
    await assertFails(getDocs(collection(db('u1'), 'parejas')));
  });
});

describe('crear', () => {
  it('válido', async () => {
    await assertSucceeds(setDoc(pareja('u1'), soloA));
  });
  it('con código con I, L u O o de 5 caracteres falla', async () => {
    for (const codigo of ['K7PQ2I', 'K7PQ2L', 'K7PQ2O', 'K7PQ2']) {
      await assertFails(setDoc(doc(db('u1'), `parejas/${codigo}`), soloA));
    }
  });
  it('con lugares.a de otro uid falla', async () => {
    await assertFails(setDoc(pareja('u1'), { ...soloA, lugares: { a: 'u9', b: null } }));
  });
  it('con nombre vacío o de 31 falla', async () => {
    await assertFails(setDoc(pareja('u1'), { ...soloA, nombres: { a: '', b: null } }));
    await assertFails(setDoc(pareja('u1'), { ...soloA, nombres: { a: 'x'.repeat(31), b: null } }));
  });
  it('con b ya ocupado o campos extra falla', async () => {
    await assertFails(setDoc(pareja('u1'), { ...soloA, lugares: { a: 'u1', b: 'u2' } }));
    await assertFails(setDoc(pareja('u1'), { ...soloA, extra: true }));
  });
});

describe('unirse y reclamar', () => {
  it('u2 toma el lugar b con su nombre', async () => {
    await sembrar({ [RUTA]: soloA });
    await assertSucceeds(combinar('u2', { lugares: { b: 'u2' }, nombres: { b: 'Sofi' } }));
  });
  it('u2 no puede tomar b poniendo el uid de otro', async () => {
    await sembrar({ [RUTA]: soloA });
    await assertFails(combinar('u2', { lugares: { b: 'u9' }, nombres: { b: 'Sofi' } }));
  });
  it('u2 no puede cambiar a la vez nombres.a', async () => {
    await sembrar({ [RUTA]: soloA });
    await assertFails(combinar('u2', { lugares: { b: 'u2' }, nombres: { a: 'Otro', b: 'Sofi' } }));
  });
  it('u1 no puede ocupar también el lugar b', async () => {
    await sembrar({ [RUTA]: soloA });
    await assertFails(combinar('u1', { lugares: { b: 'u1' }, nombres: { b: 'Carlos 2' } }));
  });
  it('u3 reclama a y desde ahí u1 ya no lee perfiles', async () => {
    await sembrar({ [RUTA]: completa, [`${RUTA}/perfiles/a`]: { x: 1 } });
    await assertSucceeds(getDoc(doc(db('u1'), `${RUTA}/perfiles/a`)));
    await assertSucceeds(combinar('u3', { lugares: { a: 'u3' } }));
    await assertFails(getDoc(doc(db('u1'), `${RUTA}/perfiles/a`)));
    await assertSucceeds(getDoc(doc(db('u3'), `${RUTA}/perfiles/a`)));
  });
});

describe('nombres', () => {
  it('un miembro cambia su nombre; no puede cambiar el del otro', async () => {
    await sembrar({ [RUTA]: completa });
    await assertSucceeds(combinar('u2', { nombres: { b: 'Sofía' } }));
    await assertFails(combinar('u2', { nombres: { a: 'Carlitos' } }));
    await assertFails(combinar('u2', { nombres: { b: '' } }));
  });
  it('un extraño no cambia nombres sin reclamar', async () => {
    await sembrar({ [RUTA]: completa });
    await assertFails(combinar('u3', { nombres: { a: 'Intruso' } }));
  });
});

describe('datos de la pareja', () => {
  const rutas = ['perfiles/a', 'partidas/p1', 'estado/uso', 'dias/2026-11-04'];
  it('miembros leen y escriben perfiles, partidas, estado y dias', async () => {
    await sembrar({ [RUTA]: completa });
    for (const r of rutas) {
      await assertSucceeds(setDoc(doc(db('u1'), `${RUTA}/${r}`), { v: 1 }));
      await assertSucceeds(getDoc(doc(db('u2'), `${RUTA}/${r}`)));
    }
  });
  it('un extraño no lee ni escribe nada de adentro', async () => {
    await sembrar({ [RUTA]: completa, ...Object.fromEntries(rutas.map((r) => [`${RUTA}/${r}`, { v: 1 }])) });
    for (const r of rutas) {
      await assertFails(getDoc(doc(db('u3'), `${RUTA}/${r}`)));
      await assertFails(setDoc(doc(db('u3'), `${RUTA}/${r}`), { v: 2 }));
    }
  });
  it('solo un miembro puede borrar la pareja', async () => {
    await sembrar({ [RUTA]: completa });
    await assertFails(deleteDoc(pareja('u3')));
    await assertSucceeds(deleteDoc(pareja('u1')));
  });
});

describe('respuestas del diario', () => {
  const DIA = `${RUTA}/dias/2026-11-05`;
  const respuesta = (uid, parte) => doc(db(uid), `${DIA}/respuestas/${parte}`);
  const items = { items: [{ opcion: 1, comentario: '' }], enviada: 1 };

  it('cada uno crea solo la suya', async () => {
    await sembrar({ [RUTA]: completa });
    await assertSucceeds(setDoc(respuesta('u1', 'gustos_a'), items));
    await assertSucceeds(setDoc(respuesta('u2', 'ingles_b'), { items: [0, 1, 2], aciertos: 2 }));
    await assertFails(setDoc(respuesta('u1', 'gustos_b'), items));
    await assertFails(setDoc(respuesta('u3', 'gustos_a'), items));
    await assertFails(setDoc(respuesta('u1', 'secreto_a'), items));
  });
  it('no se puede cambiar una respuesta enviada', async () => {
    await sembrar({ [RUTA]: completa });
    await assertSucceeds(setDoc(respuesta('u1', 'gustos_a'), items));
    await assertFails(setDoc(respuesta('u1', 'gustos_a'), { items: [{ opcion: 0 }] }));
    await assertFails(setDoc(respuesta('u1', 'gustos_a'), { items: [{ opcion: 0 }] }, { merge: true }));
  });
  it('la propia se lee aunque todavía no exista', async () => {
    await sembrar({ [RUTA]: completa });
    await assertSucceeds(getDoc(respuesta('u1', 'gustos_a')));
  });
  it('no se lee la del otro sin haber enviado la propia de esa parte', async () => {
    await sembrar({ [RUTA]: completa, [`${DIA}/respuestas/gustos_b`]: items });
    await assertFails(getDoc(respuesta('u1', 'gustos_b')));
    await assertSucceeds(setDoc(respuesta('u1', 'gustos_a'), items));
    await assertSucceeds(getDoc(respuesta('u1', 'gustos_b')));
  });
  it('enviar los gustos no destapa el inglés del otro', async () => {
    await sembrar({ [RUTA]: completa, [`${DIA}/respuestas/gustos_a`]: items, [`${DIA}/respuestas/ingles_b`]: { items: [0, 0, 0], aciertos: 1 } });
    await assertFails(getDoc(respuesta('u1', 'ingles_b')));
  });
  it('un extraño no lee respuestas y nadie las lista', async () => {
    await sembrar({ [RUTA]: completa, [`${DIA}/respuestas/gustos_a`]: items });
    await assertFails(getDoc(respuesta('u3', 'gustos_a')));
    await assertFails(getDocs(collection(db('u1'), `${DIA}/respuestas`)));
  });
  it('un miembro puede borrarlas (borrar todos los datos)', async () => {
    await sembrar({ [RUTA]: completa, [`${DIA}/respuestas/gustos_b`]: items });
    await assertSucceeds(deleteDoc(respuesta('u1', 'gustos_b')));
    await assertFails(deleteDoc(respuesta('u3', 'gustos_a')));
  });
});

describe('ubicaciones', () => {
  const ruta = (l) => `${RUTA}/ubicaciones/${l}`;
  it('cada uno escribe la suya y los dos la leen', async () => {
    await sembrar({ [RUTA]: completa });
    await assertSucceeds(setDoc(doc(db('u1'), ruta('a')), { lat: 4.7, lng: -74 }));
    await assertSucceeds(getDoc(doc(db('u2'), ruta('a'))));
  });
  it('nadie escribe la ubicación del otro', async () => {
    await sembrar({ [RUTA]: completa });
    await assertFails(setDoc(doc(db('u1'), ruta('b')), { lat: 0, lng: 0 }));
  });
  it('un extraño no lee ni escribe ubicaciones', async () => {
    await sembrar({ [RUTA]: completa, [ruta('a')]: { lat: 4.7, lng: -74 } });
    await assertFails(getDoc(doc(db('u3'), ruta('a'))));
    await assertFails(setDoc(doc(db('u3'), ruta('a')), { lat: 0, lng: 0 }));
  });
});
