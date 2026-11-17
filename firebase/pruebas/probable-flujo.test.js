// Ronda completa de «¿Quién es más probable?» con el código real de sala.js contra las reglas:
// abrir, unirse, votar, avanzar hasta el resumen y cerrar. Correr con `npm test` desde firebase/.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import * as fs from 'firebase/firestore';
import {
  crearSala, unirse, votar, leerVotos, intentarAvanzar, cerrarSala, rutaSala, latir,
} from '../../js/modulos/probable/sala.js';
import { votaronTodos, resumen } from '../../js/modulos/probable/logica.js';

const CODIGO = 'K7PQ2M';
let entorno;

// La misma forma que js/nucleo/nube.js, sobre el Firestore de pruebas de cada usuario.
function nubeDe(uid) {
  const db = entorno.authenticatedContext(uid).firestore();
  const datosDe = (foto) => (foto.exists() ? foto.data() : null);
  return {
    leer: async (ruta) => datosDe(await fs.getDoc(fs.doc(db, ruta))),
    escribir: (ruta, datos, { combinar = false } = {}) => fs.setDoc(fs.doc(db, ruta), datos, { merge: combinar }),
    borrar: (ruta) => fs.deleteDoc(fs.doc(db, ruta)),
    listar: async (col) => (await fs.getDocs(fs.collection(db, col))).docs.map((d) => ({ id: d.id, datos: d.data() })),
    transaccion: (fn) => fs.runTransaction(db, (t) => fn({
      leer: async (ruta) => datosDe(await t.get(fs.doc(db, ruta))),
      escribir: (ruta, datos, { combinar = false } = {}) => { t.set(fs.doc(db, ruta), datos, { merge: combinar }); },
    })),
    horaServidor: () => fs.serverTimestamp(),
  };
}

before(async () => {
  entorno = await initializeTestEnvironment({
    projectId: 'demo-okupa-probable-flujo',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 },
  });
});
after(async () => { await entorno.cleanup(); });
beforeEach(async () => {
  await entorno.clearFirestore();
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    await fs.setDoc(fs.doc(ctx.firestore(), `parejas/${CODIGO}`), { lugares: { a: 'u1', b: 'u2' }, nombres: { a: 'Carlos', b: 'Yuli' } });
  });
});

const frasesDe = (n) => Array.from({ length: n }, (_, i) => ({ id: `div-${String(i + 1).padStart(3, '0')}`, texto: `frase ${i + 1}` }));

// Lo que hace la pantalla al llegar al final: leer la sala, cerrarla y leer los votos revelados.
async function verResumen(nube, pareja, id) {
  const fresca = { ...(await nube.leer(rutaSala(pareja.codigo, id))), id };
  await cerrarSala(nube, pareja, fresca, fresca.frases.map((f) => f.id));
  const votos = [];
  for (let i = 0; i < fresca.frases.length; i++) if (votaronTodos(fresca, i)) votos.push(await leerVotos(nube, pareja, id, i));
  return resumen(votos, ['a', 'b']);
}

for (const largo of [5, 10, 20]) {
  describe(`probable: ronda completa de ${largo}`, () => {
    it('los dos votan todo, uno toca «Ver resumen» y los dos ven el resumen', async () => {
      const a = { nube: nubeDe('u1'), pareja: { codigo: CODIGO, lugar: 'a' } };
      const b = { nube: nubeDe('u2'), pareja: { codigo: CODIGO, lugar: 'b' } };
      const id = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: frasesDe(largo) });
      await unirse(b.nube, b.pareja, id);
      const parar = [latir(a.nube, a.pareja, id, { cadaMs: 200 }), latir(b.nube, b.pareja, id, { cadaMs: 200 })];
      try {
        for (let i = 0; i < largo; i++) {
          await votar(a.nube, a.pareja, id, { indice: i, voto: 'a' });
          await votar(b.nube, b.pareja, id, { indice: i, voto: i % 2 ? 'a' : 'todos' });
          const sala = await a.nube.leer(rutaSala(CODIGO, id));
          assert.equal(sala.indice, i);
          assert.equal(await intentarAvanzar(i % 2 ? b.nube : a.nube, a.pareja, id, { ronda: sala.ronda }), true, `avanzar en la frase ${i}`);
        }
      } finally { parar.forEach((p) => p()); }
      assert.equal((await b.nube.leer(rutaSala(CODIGO, id))).estado, 'terminada');
      const resA = await verResumen(a.nube, a.pareja, id);
      const resB = await verResumen(b.nube, b.pareja, id);
      assert.equal(resA.total, largo);
      assert.deepEqual(resB, resA);
    });
  });
}
