// Cambio de celular de punta a punta: el código real de js/nucleo/pareja.js contra las reglas.
// u1 = Carlos (lugar a), u2 = Yuli (lugar b), u3 = el celular nuevo. Correr con `npm test` desde firebase/.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import * as fs from 'firebase/firestore';
import { ErrorNube } from '../../js/nucleo/nube.js';
import {
  pedirLugar, miSolicitud, completarEntrada, entrarVencida, cancelarSolicitud, solicitudesDe,
  aprobarSolicitud, rechazarSolicitud, miPareja,
} from '../../js/nucleo/pareja.js';

const CODIGO = 'K7PQ2M';
const RUTA = `parejas/${CODIGO}`;
const SOL_A = `${RUTA}/solicitudes/a`;
const DIA = 86400000;
let entorno;

// La misma forma que js/nucleo/nube.js (incluida la traducción de «sin permiso»), sobre el Firestore
// de pruebas de cada usuario.
function nubeDe(uid) {
  const db = entorno.authenticatedContext(uid).firestore();
  const datosDe = (foto) => (foto.exists() ? foto.data() : null);
  const traducir = (e) => { throw e?.code === 'permission-denied' ? new ErrorNube('permiso', e.message) : e; };
  return {
    iniciar: async () => ({ uid }),
    leer: (ruta) => fs.getDoc(fs.doc(db, ruta)).then(datosDe, traducir),
    escribir: (ruta, datos, { combinar = false } = {}) => fs.setDoc(fs.doc(db, ruta), datos, { merge: combinar }).catch(traducir),
    borrar: (ruta) => fs.deleteDoc(fs.doc(db, ruta)).catch(traducir),
    transaccion: (fn) => fs.runTransaction(db, (t) => fn({
      leer: async (ruta) => datosDe(await t.get(fs.doc(db, ruta))),
      escribir: (ruta, datos, { combinar = false } = {}) => { t.set(fs.doc(db, ruta), datos, { merge: combinar }); },
    })).catch(traducir),
    horaServidor: () => fs.serverTimestamp(),
  };
}

function almacenEnMemoria(inicial = {}) {
  const m = new Map(Object.entries(inicial));
  return {
    leer: (k, defecto) => (m.has(k) ? structuredClone(m.get(k)) : defecto),
    escribir: (k, v) => { m.set(k, structuredClone(v)); },
    borrar: (k) => { m.delete(k); },
  };
}
const almacenDe = (lugar) => almacenEnMemoria({ 'okupa:pareja:actual': { codigo: CODIGO, lugar } });
const almacenQuePidio = (lugar) => almacenEnMemoria({ 'okupa:solicitud': { codigo: CODIGO, lugar } });

async function sembrar(datos) {
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    for (const [ruta, valor] of Object.entries(datos)) await fs.setDoc(fs.doc(ctx.firestore(), ruta), valor);
  });
}
async function leerSinReglas(ruta) {
  let datos;
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    const foto = await fs.getDoc(fs.doc(ctx.firestore(), ruta));
    datos = foto.exists() ? foto.data() : null;
  });
  return datos;
}
const hace = (ms) => fs.Timestamp.fromMillis(Date.now() - ms);
const conCodigo = (codigo) => (e) => e.codigo === codigo;

before(async () => {
  entorno = await initializeTestEnvironment({
    projectId: 'demo-okupa-solicitudes-flujo',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 },
  });
});
after(async () => { await entorno.cleanup(); });
beforeEach(async () => {
  await entorno.clearFirestore();
  await sembrar({
    [RUTA]: { lugares: { a: 'u1', b: 'u2' }, nombres: { a: 'Carlos', b: 'Yuli' } },
    [`${RUTA}/perfiles/a`]: { x: 1 },
  });
});

describe('cambio de celular: pedir, aprobar y entrar', () => {
  it('el nuevo pide, el viejo aprueba y el nuevo entra con todo lo de su lugar', async () => {
    const alm1 = almacenDe('a');
    const alm3 = almacenEnMemoria();
    const pedida = await pedirLugar(nubeDe('u3'), alm3, { codigo: CODIGO, lugar: 'a' });
    assert.ok(Math.abs(pedida.entraMs - (Date.now() + 7 * DIA)) < 60000, 'entra en 7 días');
    assert.equal((await miSolicitud(nubeDe('u3'), alm3)).estado, 'pendiente');
    await assert.rejects(nubeDe('u3').leer(`${RUTA}/perfiles/a`), conCodigo('permiso'), 'pedir no da acceso');

    assert.deepEqual(await solicitudesDe(nubeDe('u1'), miPareja(alm1)), [{ lugar: 'a', mia: true, entraMs: pedida.entraMs, nombre: 'Carlos' }]);
    assert.deepEqual(await solicitudesDe(nubeDe('u2'), { codigo: CODIGO, lugar: 'b' }), [{ lugar: 'a', mia: false, entraMs: pedida.entraMs, nombre: 'Carlos' }]);

    await aprobarSolicitud(nubeDe('u1'), alm1, 'a');
    assert.equal(miPareja(alm1), null);

    assert.equal((await miSolicitud(nubeDe('u3'), alm3)).estado, 'aprobada');
    assert.deepEqual(await completarEntrada(nubeDe('u3'), alm3), { codigo: CODIGO, lugar: 'a' });
    assert.deepEqual(miPareja(alm3), { codigo: CODIGO, lugar: 'a' });
    assert.deepEqual((await leerSinReglas(RUTA)).lugares, { a: 'u3', b: 'u2' });
    assert.equal(await leerSinReglas(SOL_A), null, 'la solicitud se borra al entrar');
    assert.deepEqual(await nubeDe('u3').leer(`${RUTA}/perfiles/a`), { x: 1 });
    await assert.rejects(nubeDe('u1').leer(`${RUTA}/perfiles/a`), conCodigo('permiso'), 'el celular viejo queda por fuera');
    assert.deepEqual(await solicitudesDe(nubeDe('u2'), { codigo: CODIGO, lugar: 'b' }), []);
  });

  it('la pareja no puede aprobar la solicitud del lugar del otro (Review Focus 2)', async () => {
    // Yuli pide el lugar de Carlos desde un segundo navegador (u4) y trata de aprobarse desde su celular.
    const alm4 = almacenEnMemoria();
    await pedirLugar(nubeDe('u4'), alm4, { codigo: CODIGO, lugar: 'a' });
    await assert.rejects(aprobarSolicitud(nubeDe('u2'), almacenDe('b'), 'a'), conCodigo('no-es-tu-lugar'));
    await assert.rejects(nubeDe('u2').escribir(RUTA, { lugares: { a: 'u4' } }, { combinar: true }), conCodigo('permiso'));
    await assert.rejects(entrarVencida(nubeDe('u4'), alm4), conCodigo('permiso'));
    assert.deepEqual((await leerSinReglas(RUTA)).lugares, { a: 'u1', b: 'u2' });
  });

  it('con una solicitud de otro celular en ese lugar, pedir da solicitud-ajena', async () => {
    await pedirLugar(nubeDe('u9'), almacenEnMemoria(), { codigo: CODIGO, lugar: 'a' });
    const alm3 = almacenEnMemoria();
    await assert.rejects(pedirLugar(nubeDe('u3'), alm3, { codigo: CODIGO, lugar: 'a' }), conCodigo('solicitud-ajena'));
    assert.equal((await leerSinReglas(SOL_A)).uid, 'u9');
    assert.equal(await miSolicitud(nubeDe('u3'), alm3), null);
  });

  it('cancelar borra la solicitud y deja pedir de nuevo', async () => {
    const alm3 = almacenEnMemoria();
    await pedirLugar(nubeDe('u3'), alm3, { codigo: CODIGO, lugar: 'a' });
    await cancelarSolicitud(nubeDe('u3'), alm3);
    assert.equal(await leerSinReglas(SOL_A), null);
    assert.equal(await miSolicitud(nubeDe('u3'), alm3), null);
    await pedirLugar(nubeDe('u3'), alm3, { codigo: CODIGO, lugar: 'a' });
    assert.equal((await miSolicitud(nubeDe('u3'), alm3)).estado, 'pendiente');
  });

  it('si un miembro la borra, el nuevo ve «borrada»', async () => {
    const alm3 = almacenEnMemoria();
    await pedirLugar(nubeDe('u3'), alm3, { codigo: CODIGO, lugar: 'a' });
    await nubeDe('u2').borrar(SOL_A);
    assert.equal((await miSolicitud(nubeDe('u3'), alm3)).estado, 'borrada');
    await cancelarSolicitud(nubeDe('u3'), alm3);
    assert.equal(await miSolicitud(nubeDe('u3'), alm3), null);
  });
});

describe('cambio de celular: rechazar', () => {
  it('tras el rechazo el nuevo no entra, no puede borrarla ni volver a pedir', async () => {
    const alm3 = almacenEnMemoria();
    await pedirLugar(nubeDe('u3'), alm3, { codigo: CODIGO, lugar: 'a' });
    await rechazarSolicitud(nubeDe('u2'), { codigo: CODIGO, lugar: 'b' }, 'a');

    const mia = await miSolicitud(nubeDe('u3'), alm3);
    assert.equal(mia.estado, 'rechazada');
    assert.ok(Math.abs(mia.reintentoMs - (Date.now() + DIA)) < 60000, 'reintento en 24 h');
    await assert.rejects(nubeDe('u3').borrar(SOL_A), conCodigo('permiso'));
    const rechazada = await leerSinReglas(SOL_A);

    await pedirLugar(nubeDe('u3'), alm3, { codigo: CODIGO, lugar: 'a' });
    assert.deepEqual(await leerSinReglas(SOL_A), rechazada, 'volver a pedir no la renueva');
    // Aunque el celular crea que ya pasó el freno, las reglas no lo dejan renovar.
    await assert.rejects(pedirLugar(nubeDe('u3'), alm3, { codigo: CODIGO, lugar: 'a', ahoraMs: Date.now() + 2 * DIA }), conCodigo('permiso'));
    assert.deepEqual(await leerSinReglas(SOL_A), rechazada);

    await assert.rejects(aprobarSolicitud(nubeDe('u1'), almacenDe('a'), 'a'), conCodigo('sin-solicitud'));
    assert.deepEqual(await solicitudesDe(nubeDe('u1'), { codigo: CODIGO, lugar: 'a' }), []);

    await cancelarSolicitud(nubeDe('u3'), alm3);
    assert.deepEqual(await leerSinReglas(SOL_A), rechazada, 'cancelar no quita el freno');
    assert.deepEqual((await leerSinReglas(RUTA)).lugares, { a: 'u1', b: 'u2' });
  });

  it('pasadas 24 h del rechazo, el nuevo puede pedir otra vez', async () => {
    await sembrar({ [SOL_A]: { uid: 'u3', creada: hace(2 * DIA), rechazada: hace(25 * 3600000) } });
    const alm3 = almacenQuePidio('a');
    const pedida = await pedirLugar(nubeDe('u3'), alm3, { codigo: CODIGO, lugar: 'a' });
    assert.ok(Math.abs(pedida.entraMs - (Date.now() + 7 * DIA)) < 60000, 'la espera empieza de nuevo');
    assert.equal((await miSolicitud(nubeDe('u3'), alm3)).estado, 'pendiente');
  });
});

describe('cambio de celular: sin el celular viejo', () => {
  it('con la solicitud de 8 días, el nuevo entra solo', async () => {
    await sembrar({ [SOL_A]: { uid: 'u3', creada: hace(8 * DIA) } });
    const alm3 = almacenQuePidio('a');
    assert.equal((await miSolicitud(nubeDe('u3'), alm3)).estado, 'vencida');
    assert.deepEqual(await entrarVencida(nubeDe('u3'), alm3), { codigo: CODIGO, lugar: 'a' });
    assert.deepEqual(miPareja(alm3), { codigo: CODIGO, lugar: 'a' });
    const doc = await leerSinReglas(RUTA);
    assert.deepEqual([doc.lugares, doc.nombres], [{ a: 'u3', b: 'u2' }, { a: 'Carlos', b: 'Yuli' }]);
    assert.equal(await leerSinReglas(SOL_A), null);
    assert.deepEqual(await nubeDe('u3').leer(`${RUTA}/perfiles/a`), { x: 1 });
  });

  it('con la solicitud de 6 días, las reglas no lo dejan entrar', async () => {
    await sembrar({ [SOL_A]: { uid: 'u3', creada: hace(6 * DIA) } });
    const alm3 = almacenQuePidio('a');
    assert.equal((await miSolicitud(nubeDe('u3'), alm3)).estado, 'pendiente');
    await assert.rejects(entrarVencida(nubeDe('u3'), alm3), conCodigo('permiso'));
    assert.equal(miPareja(alm3), null);
    assert.deepEqual((await leerSinReglas(RUTA)).lugares, { a: 'u1', b: 'u2' });
    assert.deepEqual(alm3.leer('okupa:solicitud', null), { codigo: CODIGO, lugar: 'a' }, 'sigue esperando');
  });
});
