// Reglas de las fechas de la pareja (parejas/{c}/fechas/{id}). Correr con `npm test` desde firebase/.
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

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
const inicio = { tipo: 'inicio', fecha: '2024-02-14', actualizadaMs: 1 };
const cumpleB = { tipo: 'cumple', fecha: '1995-03-10', de: 'b', actualizadaMs: 1 };
const otra = { tipo: 'otra', fecha: '2025-06-01', nombre: 'Primer viaje', actualizadaMs: 1 };

before(async () => {
  entorno = await initializeTestEnvironment({
    // Proyecto propio: node --test corre los archivos en paralelo contra el mismo emulador.
    projectId: 'demo-okupa-fechas',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 },
  });
});
after(async () => { await entorno.cleanup(); });
beforeEach(async () => {
  await entorno.clearFirestore();
  await sembrar({ [RUTA]: completa });
});

describe('fechas', () => {
  it('los dos crean, leen, cambian y borran fechas válidas; un extraño nada', async () => {
    await assertSucceeds(setDoc(d('u1', 'fechas/inicio'), inicio));
    await assertSucceeds(setDoc(d('u1', 'fechas/cumple_b'), cumpleB));
    await assertSucceeds(setDoc(d('u1', 'fechas/f-abc12'), otra));
    await assertSucceeds(getDoc(d('u2', 'fechas/inicio')));
    await assertSucceeds(setDoc(d('u2', 'fechas/inicio'), { ...inicio, fecha: '2024-02-15', actualizadaMs: 2 }));
    await assertSucceeds(setDoc(d('u2', 'fechas/cumple_a'), { ...cumpleB, de: 'a' }));
    await assertSucceeds(deleteDoc(d('u2', 'fechas/f-abc12')));
    await assertFails(getDoc(d('u9', 'fechas/inicio')));
    await assertFails(setDoc(d('u9', 'fechas/f-zzzz1'), otra));
    await assertFails(deleteDoc(d('u9', 'fechas/inicio')));
  });
  it('rechaza: id y tipo que no cuadran, fecha mal escrita, nombre malo y claves extra', async () => {
    const malos = [
      ['fechas/cumple_a', cumpleB],
      ['fechas/inicio', { ...inicio, tipo: 'otra', nombre: 'X' }],
      ['fechas/inicio', { ...inicio, tipo: 'cumple', de: 'a' }],
      ['fechas/f-abc12', { ...otra, tipo: 'inicio', nombre: undefined }],
      ['fechas/inicio', { ...inicio, fecha: '2024-1-1' }],
      ['fechas/f-abc12', { ...otra, nombre: '' }],
      ['fechas/f-abc12', { ...otra, nombre: 'x'.repeat(41) }],
      ['fechas/f-abc12', { tipo: 'otra', fecha: '2025-06-01', actualizadaMs: 1 }],
      ['fechas/inicio', { ...inicio, extra: 1 }],
      ['fechas/inicio', { ...inicio, nombre: 'No va' }],
      ['fechas/cumple_b', { ...cumpleB, nombre: 'No va' }],
      ['fechas/inicio', { ...inicio, actualizadaMs: 'hoy' }],
      ['fechas/f-ab', otra],
      ['fechas/cualquiera', otra],
    ];
    for (const [ruta, valor] of malos) {
      const limpio = Object.fromEntries(Object.entries(valor).filter(([, v]) => v !== undefined));
      await assertFails(setDoc(d('u1', ruta), limpio));
    }
    await assertSucceeds(setDoc(d('u1', 'fechas/f-abc12'), { ...otra, nombre: 'x'.repeat(40) }));
  });
});
