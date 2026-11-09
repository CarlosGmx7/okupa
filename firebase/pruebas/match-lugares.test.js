// Reglas de Lugares del mapa y del Match de deseos. Correr con `npm test` desde firebase/.
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

const CODIGO = 'K7PQ2M';
const RUTA = `parejas/${CODIGO}`;
let entorno;

const db = (uid) => entorno.authenticatedContext(uid).firestore();
const d = (uid, ruta) => doc(db(uid), `${RUTA}/${ruta}`);
async function sembrar(datos) {
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    for (const [ruta, valor] of Object.entries(datos)) await setDoc(doc(ctx.firestore(), ruta), valor);
  });
}
const completa = { lugares: { a: 'u1', b: 'u2' }, nombres: { a: 'Carlos', b: 'Yuli' } };
const lugar = { nombre: 'Cartagena', lat: 10.42, lng: -75.54, tipo: 'deseo', nota: '', creadoPor: 'a', creadoMs: 1 };

before(async () => {
  entorno = await initializeTestEnvironment({
    projectId: 'demo-okupa-match',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 },
  });
});
after(async () => { await entorno.cleanup(); });
beforeEach(async () => {
  await entorno.clearFirestore();
  await sembrar({ [RUTA]: completa });
});

describe('lugares', () => {
  it('los dos crean y leen lugares válidos; un extraño no', async () => {
    await assertSucceeds(setDoc(d('u1', 'lugares/x1'), lugar));
    await assertSucceeds(getDoc(d('u2', 'lugares/x1')));
    await assertFails(getDoc(d('u9', 'lugares/x1')));
    await assertFails(setDoc(d('u9', 'lugares/x2'), lugar));
  });
  it('rechaza nombre vacío, coordenadas o tipo inválidos y campos extra', async () => {
    for (const malo of [{ ...lugar, nombre: '' }, { ...lugar, lat: 91 }, { ...lugar, tipo: 'otro' }, { ...lugar, extra: 1 }, { ...lugar, fecha: 'ayer' }]) {
      await assertFails(setDoc(d('u1', 'lugares/x1'), malo));
    }
  });
  it('cada uno marca solo su propia versión como escrita', async () => {
    await sembrar({ [`${RUTA}/lugares/x1`]: { ...lugar, tipo: 'recuerdo' } });
    await assertSucceeds(setDoc(d('u1', 'lugares/x1'), { versiones: { a: true } }, { merge: true }));
    await assertFails(setDoc(d('u1', 'lugares/x1'), { versiones: { b: true } }, { merge: true }));
  });
  it('la versión del otro solo se lee si ya existe la propia', async () => {
    await sembrar({ [`${RUTA}/lugares/x1`]: { ...lugar, tipo: 'recuerdo' }, [`${RUTA}/lugares/x1/versiones/b`]: { texto: 'Lo de Yuli', horaMs: 1 } });
    await assertFails(getDoc(d('u1', 'lugares/x1/versiones/b')));
    await assertFails(getDocs(collection(db('u1'), `${RUTA}/lugares/x1/versiones`)));
    await assertSucceeds(setDoc(d('u1', 'lugares/x1/versiones/a'), { texto: 'Lo mío', horaMs: 2 }));
    await assertSucceeds(getDoc(d('u1', 'lugares/x1/versiones/b')));
  });
  it('nadie escribe la versión del otro ni una vacía o de más de 1000', async () => {
    await assertFails(setDoc(d('u1', 'lugares/x1/versiones/b'), { texto: 'Suplantado', horaMs: 1 }));
    await assertFails(setDoc(d('u1', 'lugares/x1/versiones/a'), { texto: '', horaMs: 1 }));
    await assertFails(setDoc(d('u1', 'lugares/x1/versiones/a'), { texto: 'x'.repeat(1001), horaMs: 1 }));
  });
  it('fotos: JPEG en base64 de hasta 400 000 caracteres; no otra cosa', async () => {
    const foto = (datos) => ({ datos, ancho: 10, alto: 10, por: 'a', creadaMs: 1 });
    await assertSucceeds(setDoc(d('u2', 'lugares/x1/fotos/f1'), foto('data:image/jpeg;base64,AAAA')));
    await assertFails(setDoc(d('u2', 'lugares/x1/fotos/f2'), foto('https://otro.sitio/x.jpg')));
    await assertFails(setDoc(d('u2', 'lugares/x1/fotos/f3'), foto(`data:image/jpeg;base64,${'A'.repeat(400001)}`)));
    await assertSucceeds(deleteDoc(d('u1', 'lugares/x1/fotos/f1')));
  });
});

describe('match', () => {
  it('el registro privado (con los "no") solo lo ve su dueño', async () => {
    await assertSucceeds(setDoc(d('u1', 'match_privado/a'), { votos: { 'mat-001': 'no' } }));
    await assertFails(getDoc(d('u2', 'match_privado/a')));
    await assertFails(setDoc(d('u2', 'match_privado/a'), { votos: {} }));
  });
  it('cada uno escribe solo sus votos positivos', async () => {
    await assertSucceeds(setDoc(d('u1', 'match_si/mat-001_a'), { voto: 'si' }));
    await assertSucceeds(setDoc(d('u1', 'match_si/mat-002_a'), { voto: 'quizas' }));
    await assertFails(setDoc(d('u1', 'match_si/mat-003_a'), { voto: 'no' }));
    await assertFails(setDoc(d('u1', 'match_si/mat-001_b'), { voto: 'si' }));
  });
  it('el voto del otro solo se lee si ya votaste positivo esa tarjeta', async () => {
    await sembrar({ [`${RUTA}/match_si/mat-001_b`]: { voto: 'si' } });
    await assertFails(getDoc(d('u1', 'match_si/mat-001_b')));
    await assertFails(getDocs(collection(db('u1'), `${RUTA}/match_si`)));
    await assertSucceeds(setDoc(d('u1', 'match_si/mat-001_a'), { voto: 'quizas' }));
    await assertSucceeds(getDoc(d('u1', 'match_si/mat-001_b')));
  });
  it('el match solo se crea si los dos votaron positivo y al menos uno dijo que sí', async () => {
    const nuevo = { creadoMs: 1, hecho: false };
    await sembrar({ [`${RUTA}/match_si/mat-001_a`]: { voto: 'quizas' } });
    await assertFails(setDoc(d('u1', 'match_matches/mat-001'), nuevo));
    await sembrar({ [`${RUTA}/match_si/mat-001_b`]: { voto: 'quizas' } });
    await assertFails(setDoc(d('u1', 'match_matches/mat-001'), nuevo));
    await sembrar({ [`${RUTA}/match_si/mat-001_b`]: { voto: 'si' } });
    await assertSucceeds(setDoc(d('u1', 'match_matches/mat-001'), nuevo));
    await assertSucceeds(getDocs(collection(db('u2'), `${RUTA}/match_matches`)));
  });
  it('del match solo se cambia "hecho", y no se borra', async () => {
    await sembrar({ [`${RUTA}/match_matches/mat-001`]: { creadoMs: 1, hecho: false } });
    await assertSucceeds(setDoc(d('u2', 'match_matches/mat-001'), { hecho: true }, { merge: true }));
    await assertFails(setDoc(d('u2', 'match_matches/mat-001'), { creadoMs: 9 }, { merge: true }));
    await assertFails(deleteDoc(d('u1', 'match_matches/mat-001')));
  });
  it('tarjetas propias: sin autor, mazo válido y largo razonable', async () => {
    const t = { mazo: 'retos', texto: 'Bailar salsa a medianoche', creadaMs: 1 };
    await assertSucceeds(setDoc(d('u1', 'match_tarjetas/n-abc123'), t));
    await assertSucceeds(getDocs(collection(db('u2'), `${RUTA}/match_tarjetas`)));
    await assertFails(setDoc(d('u1', 'match_tarjetas/n-abc124'), { ...t, autor: 'a' }));
    await assertFails(setDoc(d('u1', 'match_tarjetas/n-abc125'), { ...t, mazo: 'otro' }));
    await assertFails(setDoc(d('u1', 'match_tarjetas/mat-999'), t));
    await assertFails(setDoc(d('u9', 'match_tarjetas/n-abc126'), t));
  });
});
