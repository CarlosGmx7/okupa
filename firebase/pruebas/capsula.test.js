// Reglas de la cápsula del tiempo (parejas/{c}/capsulas/{id} y contenido/texto). Correr con `npm test` desde firebase/.
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

const CODIGO = 'K7PQ2M';
const RUTA = `parejas/${CODIGO}`;
const DIA = 86400000;
let entorno;

const db = (uid) => entorno.authenticatedContext(uid).firestore();
const d = (uid, ruta) => doc(db(uid), `${RUTA}/${ruta}`);
async function sembrar(datos) {
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    for (const [ruta, valor] of Object.entries(datos)) await setDoc(doc(ctx.firestore(), ruta), valor);
  });
}
const completa = { lugares: { a: 'u1', b: 'u2' }, nombres: { a: 'Carlos', b: 'Yuli' } };
// Carta válida escrita por 'a' (u1), que abre dentro de 30 días.
const meta = () => ({ de: 'a', abreEl: '2030-01-01', abreMs: Date.now() + 30 * DIA, creadaMs: Date.now() });
const metaPasada = () => ({ de: 'a', abreEl: '2020-01-01', abreMs: Date.now() - DIA, creadaMs: Date.now() - 30 * DIA });
const CARTA = 'capsulas/c-abc12';
const TEXTO = `${CARTA}/contenido/texto`;

before(async () => {
  entorno = await initializeTestEnvironment({
    // Proyecto propio: node --test corre los archivos en paralelo contra el mismo emulador.
    projectId: 'demo-okupa-capsula',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 },
  });
});
after(async () => { await entorno.cleanup(); });
beforeEach(async () => {
  await entorno.clearFirestore();
  await sembrar({ [RUTA]: completa });
});

describe('capsulas: metadatos', () => {
  it('un miembro crea metadatos válidos con su lugar; los dos los leen y listan; un extraño nada', async () => {
    await assertSucceeds(setDoc(d('u1', CARTA), meta()));
    await assertSucceeds(setDoc(d('u2', 'capsulas/c-yuli9'), { ...meta(), de: 'b' }));
    await assertSucceeds(getDoc(d('u2', CARTA)));
    await assertSucceeds(getDocs(collection(db('u1'), `${RUTA}/capsulas`)));
    await assertFails(getDoc(d('u9', CARTA)));
    await assertFails(getDocs(collection(db('u9'), `${RUTA}/capsulas`)));
    await assertFails(setDoc(d('u9', 'capsulas/c-zzzz1'), meta()));
  });
  it('rechaza cada condición mala por separado', async () => {
    const malos = [
      [CARTA, { ...meta(), de: 'b' }], // de ajeno
      [CARTA, { ...meta(), abreMs: Date.now() - DIA }], // abre en el pasado
      [CARTA, { ...meta(), abreMs: Date.now() + 3654 * DIA }], // más de 10 años
      [CARTA, { ...meta(), extra: 1 }], // clave extra
      [CARTA, { de: 'a', abreEl: '2030-01-01', abreMs: Date.now() + DIA }], // falta creadaMs
      [CARTA, { ...meta(), abreEl: '2030-1-1' }], // fecha mal escrita
      [CARTA, { ...meta(), abreMs: 'pronto' }], // abreMs no es número
      [CARTA, { ...meta(), creadaMs: 'hoy' }], // creadaMs no es número
      ['capsulas/abc12', meta()], // id sin c-
      ['capsulas/c-ab', meta()], // id muy corto
      ['capsulas/c-ABC12', meta()], // id con mayúsculas
      ['capsulas/c-' + 'a'.repeat(31), meta()], // id muy largo
    ];
    for (const [ruta, valor] of malos) await assertFails(setDoc(d('u1', ruta), valor));
    // Los bordes válidos sí pasan.
    await assertSucceeds(setDoc(d('u1', CARTA), { ...meta(), abreMs: Date.now() + 3650 * DIA }));
    await assertSucceeds(setDoc(d('u1', 'capsulas/c-' + 'a'.repeat(30)), meta()));
  });
  it('no se puede actualizar; cualquier miembro la borra; un extraño no', async () => {
    await sembrar({ [`${RUTA}/${CARTA}`]: meta() });
    await assertFails(setDoc(d('u1', CARTA), { ...meta(), abreEl: '2031-01-01' }));
    await assertFails(setDoc(d('u2', CARTA), meta()));
    await assertFails(deleteDoc(d('u9', CARTA)));
    await assertSucceeds(deleteDoc(d('u2', CARTA)));
  });
});

describe('capsulas: texto', () => {
  it('el autor crea el texto una sola vez y lo lee aunque esté cerrada', async () => {
    await sembrar({ [`${RUTA}/${CARTA}`]: meta() });
    await assertSucceeds(setDoc(d('u1', TEXTO), { texto: 'Te quiero' }));
    await assertSucceeds(getDoc(d('u1', TEXTO)));
    await assertFails(setDoc(d('u1', TEXTO), { texto: 'Otra vez' })); // sin update
  });
  it('rechaza texto vacío, de más de 2000, no string, claves extra y otro nombre de documento', async () => {
    await sembrar({ [`${RUTA}/${CARTA}`]: meta() });
    await assertFails(setDoc(d('u1', TEXTO), { texto: '' }));
    await assertFails(setDoc(d('u1', TEXTO), { texto: 'x'.repeat(2001) }));
    await assertFails(setDoc(d('u1', TEXTO), { texto: 5 }));
    await assertFails(setDoc(d('u1', TEXTO), { texto: 'Hola', extra: 1 }));
    await assertFails(setDoc(d('u1', TEXTO), {}));
    await assertFails(setDoc(d('u1', `${CARTA}/contenido/otro`), { texto: 'Hola' }));
    await assertSucceeds(setDoc(d('u1', TEXTO), { texto: 'x'.repeat(2000) }));
  });
  it('el otro no puede crear el texto; un extraño tampoco; sin metadatos tampoco', async () => {
    await sembrar({ [`${RUTA}/${CARTA}`]: meta() });
    await assertFails(setDoc(d('u2', TEXTO), { texto: 'Me hago pasar' }));
    await assertFails(setDoc(d('u9', TEXTO), { texto: 'Extraño' }));
    await assertFails(setDoc(d('u1', `capsulas/c-sinmeta/contenido/texto`), { texto: 'Huérfano' }));
  });
  it('el otro NO lee el texto de una carta cerrada y SÍ lo lee cuando ya abrió', async () => {
    await sembrar({ [`${RUTA}/${CARTA}/contenido/texto`]: { texto: 'Secreto' }, [`${RUTA}/${CARTA}`]: meta() });
    await assertFails(getDoc(d('u2', TEXTO)));
    await assertSucceeds(getDoc(d('u1', TEXTO)));
    await sembrar({ [`${RUTA}/${CARTA}`]: metaPasada() });
    await assertSucceeds(getDoc(d('u2', TEXTO)));
    await assertFails(getDoc(d('u9', TEXTO))); // el extraño nunca
  });
  it('nadie actualiza el texto ni lo lista; cualquier miembro lo borra', async () => {
    await sembrar({ [`${RUTA}/${CARTA}`]: metaPasada(), [`${RUTA}/${TEXTO}`]: { texto: 'Hola' } });
    await assertFails(setDoc(d('u1', TEXTO), { texto: 'Cambiado' }));
    await assertFails(setDoc(d('u2', TEXTO), { texto: 'Cambiado' }));
    await assertFails(getDocs(collection(db('u1'), `${RUTA}/${CARTA}/contenido`)));
    await assertFails(getDocs(collection(db('u2'), `${RUTA}/${CARTA}/contenido`)));
    await assertFails(deleteDoc(d('u9', TEXTO)));
    await assertSucceeds(deleteDoc(d('u2', TEXTO)));
  });
});
