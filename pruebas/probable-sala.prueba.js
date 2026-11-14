import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearPareja, unirse as unirsePareja } from '../js/nucleo/pareja.js';
import {
  crearSala, salaPendiente, unirse, cancelarSala, ErrorSalaAjena, cancelarSiSigueEsperando, votar, leerVotos, intentarAvanzar, cerrarSala, leerVistas,
  escucharSala, latir, listarPropias, crearPropia, borrarPropia, rutaSala, rutaVoto, rutaUso,
} from '../js/modulos/probable/sala.js';

const esperar = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const frases = (n) => Array.from({ length: n }, (_, i) => ({ id: `div-${String(i + 1).padStart(3, '0')}`, texto: `frase ${i + 1}` }));

async function dosCelulares() {
  const mundo = crearMundoFalso();
  const { codigo } = await crearPareja(mundo.nube('u1'), almacenEnMemoria(), { nombre: 'Carlos' });
  await unirsePareja(mundo.nube('u2'), almacenEnMemoria(), { codigo, nombre: 'Sofi' });
  return {
    mundo,
    a: { nube: mundo.nube('u1'), pareja: { codigo, lugar: 'a' } },
    b: { nube: mundo.nube('u2'), pareja: { codigo, lugar: 'b' } },
  };
}
const leer = (cel, id) => cel.nube.leer(rutaSala(cel.pareja.codigo, id));

prueba('probable-sala: rutas', () => {
  igual(rutaSala('K7PQ2M', 'q-abcd'), 'parejas/K7PQ2M/probable/q-abcd');
  igual(rutaVoto('K7PQ2M', 'q-abcd', 3, 'b'), 'parejas/K7PQ2M/probable/q-abcd/votos/3_b');
  igual(rutaUso('K7PQ2M'), 'parejas/K7PQ2M/estado/uso');
});

prueba('probable-sala: crear, encontrarla y unirse', async () => {
  const { a, b } = await dosCelulares();
  const id = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: frases(5) });
  verdadero(/^q-[a-z0-9]{4,30}$/.test(id), id);
  const s = await leer(a, id);
  igual([s.anfitrion, s.estado, s.tema, s.indice, s.ronda, s.votaron, s.frases.length], ['a', 'esperando', 'divertidas', 0, 0, {}, 5]);
  const p = await salaPendiente(b.nube, b.pareja);
  igual([p.id, p.estado], [id, 'esperando']);
  await unirse(b.nube, b.pareja, id);
  igual((await leer(a, id)).estado, 'jugando');
});

prueba('probable-sala: la sala cancelada o sin puntero no queda pendiente', async () => {
  const { a, b } = await dosCelulares();
  igual(await salaPendiente(b.nube, b.pareja), null);
  const id = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: frases(5) });
  await cancelarSala(a.nube, a.pareja, id);
  igual(await salaPendiente(b.nube, b.pareja), null);
});

prueba('probable-sala: votar los dos y leerVotos devuelve ambos', async () => {
  const { a, b } = await dosCelulares();
  const id = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: frases(5) });
  await unirse(b.nube, b.pareja, id);
  await votar(a.nube, a.pareja, id, { indice: 0, voto: 'b' });
  await votar(b.nube, b.pareja, id, { indice: 0, voto: 'todos' });
  igual(await leerVotos(a.nube, a.pareja, id, 0), { a: 'b', b: 'todos' });
  const s = await leer(a, id);
  igual(s.votaron, { 0: { a: true, b: true } });
  igual(s.votaron[0].a === true, true);
});

prueba('probable-sala: votar dos veces deja el primer voto', async () => {
  const { a, b } = await dosCelulares();
  const id = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: frases(5) });
  await unirse(b.nube, b.pareja, id);
  await votar(a.nube, a.pareja, id, { indice: 1, voto: 'a' });
  await votar(a.nube, a.pareja, id, { indice: 1, voto: 'b' });
  igual((await leerVotos(a.nube, a.pareja, id, 1)).a, 'a');
  igual((await leer(b, id)).votaron[1].a, true);
});

prueba('probable-sala: votar si el voto ya existía solo asegura votaron', async () => {
  const { a } = await dosCelulares();
  const id = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: frases(5) });
  await a.nube.escribir(rutaVoto(a.pareja.codigo, id, 0, 'a'), { voto: 'a' });
  await votar(a.nube, a.pareja, id, { indice: 0, voto: 'b' });
  igual((await leerVotos(a.nube, a.pareja, id, 0)).a, 'a');
  igual((await leer(a, id)).votaron[0].a, true);
});

prueba('probable-sala: dos avances con la misma ronda avanzan una sola frase', async () => {
  const { a, b } = await dosCelulares();
  const id = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: frases(5) });
  await unirse(b.nube, b.pareja, id);
  const r = await Promise.all([intentarAvanzar(a.nube, a.pareja, id, { ronda: 0 }), intentarAvanzar(b.nube, b.pareja, id, { ronda: 0 })]);
  igual(r.filter(Boolean).length, 1);
  const s = await leer(a, id);
  igual([s.indice, s.ronda, s.estado], [1, 1, 'jugando']);
});

prueba('probable-sala: avanzar no funciona en espera y la última frase termina', async () => {
  const { a, b } = await dosCelulares();
  const id = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: frases(2) });
  igual(await intentarAvanzar(a.nube, a.pareja, id, { ronda: 0 }), false);
  await unirse(b.nube, b.pareja, id);
  igual(await intentarAvanzar(a.nube, a.pareja, id, { ronda: 0 }), true);
  igual(await intentarAvanzar(b.nube, b.pareja, id, { ronda: 1 }), true);
  const s = await leer(a, id);
  igual([s.estado, s.indice, s.ronda], ['terminada', 1, 2]);
  igual(await intentarAvanzar(a.nube, a.pareja, id, { ronda: 2 }), false);
});

prueba('probable-sala: cerrarSala cuenta una sola vez y solo las frases reveladas', async () => {
  const { a, b } = await dosCelulares();
  const fs = frases(5);
  const id = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: fs });
  await unirse(b.nube, b.pareja, id);
  for (const i of [0, 1]) {
    await votar(a.nube, a.pareja, id, { indice: i, voto: 'a' });
    await votar(b.nube, b.pareja, id, { indice: i, voto: 'b' });
  }
  await votar(a.nube, a.pareja, id, { indice: 2, voto: 'a' }); // solo uno votó la tercera
  await cancelarSala(a.nube, a.pareja, id);
  const sala = { id, ...(await leer(a, id)) };
  const todas = fs.map((f) => f.id);
  const r1 = await cerrarSala(a.nube, a.pareja, sala, todas);
  const r2 = await cerrarSala(b.nube, b.pareja, sala, todas);
  igual([r1, r2], [true, false]);
  igual(await leerVistas(a.nube, a.pareja), { divertidas: ['div-001', 'div-002'] });
  igual(await salaPendiente(b.nube, b.pareja), null);
  verdadero(await leer(b, id), 'cerrarSala no borra la sala');
  const uso = await a.nube.leer(rutaUso(a.pareja.codigo));
  igual(uso.probableContadas, [id]);
  verdadero(!('probableAbierta' in uso), 'borra el puntero');
});

prueba('probable-sala: cerrarSala en paralelo desde los dos cuenta una vez', async () => {
  const { a, b } = await dosCelulares();
  const fs = frases(3);
  const id = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: fs });
  await unirse(b.nube, b.pareja, id);
  for (let i = 0; i < 3; i++) {
    await votar(a.nube, a.pareja, id, { indice: i, voto: 'a' });
    await votar(b.nube, b.pareja, id, { indice: i, voto: 'a' });
  }
  const sala = { id, ...(await leer(a, id)) };
  const r = await Promise.all([cerrarSala(a.nube, a.pareja, sala, fs.map((f) => f.id)), cerrarSala(b.nube, b.pareja, sala, fs.map((f) => f.id))]);
  igual(r.filter(Boolean).length, 1);
  // Revelaron todo el tema: el ciclo de vistas se reinicia.
  igual((await leerVistas(a.nube, a.pareja)).divertidas, []);
});

prueba('probable-sala: leerVistas sin datos es vacío', async () => {
  const { a } = await dosCelulares();
  igual(await leerVistas(a.nube, a.pareja), {});
});

prueba('probable-sala: escucharSala avisa los cambios con el id', async () => {
  const { a, b } = await dosCelulares();
  const id = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: frases(5) });
  const estados = [];
  const parar = escucharSala(a.nube, a.pareja, id, (s) => estados.push(s && `${s.id}:${s.estado}`));
  await esperar();
  await unirse(b.nube, b.pareja, id);
  await esperar();
  parar();
  igual(estados, [`${id}:esperando`, `${id}:jugando`]);
});

prueba('probable-sala: latir escribe la señal y detener la apaga', async () => {
  const { a, b } = await dosCelulares();
  const id = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: frases(5) });
  const detener = latir(b.nube, b.pareja, id, { cadaMs: 20 });
  await esperar(70);
  detener();
  const primera = (await leer(a, id)).senal?.b;
  verdadero(primera, 'no escribió la señal');
  await esperar(60);
  igual((await leer(a, id)).senal.b, primera);
});

prueba('probable-sala: frases propias, más recientes primero, y se pueden borrar', async () => {
  const { a, b } = await dosCelulares();
  const r1 = await crearPropia(a.nube, a.pareja, '  Se queda dormido en el cine  ');
  await esperar(3);
  const r2 = await crearPropia(b.nube, b.pareja, 'Se pierde con el mapa en la mano');
  verdadero(r1.ok && r2.ok && /^f-[a-z0-9]+$/.test(r1.id));
  const lista = await listarPropias(a.nube, a.pareja);
  igual(lista.map((f) => f.id), [r2.id, r1.id]);
  igual(lista[1].texto, 'Se queda dormido en el cine');
  await borrarPropia(a.nube, a.pareja, r2.id);
  igual((await listarPropias(b.nube, b.pareja)).map((f) => f.id), [r1.id]);
});

prueba('probable-sala: frase inválida rechazada y la 201 también', async () => {
  const { a } = await dosCelulares();
  const mala = await crearPropia(a.nube, a.pareja, 'hola');
  igual(mala.ok, false);
  verdadero(/mínimo 5/.test(mala.error), mala.error);
  for (let i = 0; i < 200; i++) await a.nube.escribir(`parejas/${a.pareja.codigo}/probable_frases/f-x${i}`, { texto: `frase número ${i}`, creadaMs: i });
  const r = await crearPropia(a.nube, a.pareja, 'Una frase más para pasarnos');
  igual(r, { ok: false, error: 'Ya tienen 200 frases; borra alguna.' });
  igual((await listarPropias(a.nube, a.pareja)).length, 200);
});

// ---- Ronda final: dos «Abrir sala» a la vez, cancelar la vencida ----
prueba('probable-sala: si el otro ya tiene una sala abierta no se crea otra y se avisa cuál es', async () => {
  const { a, b } = await dosCelulares();
  const idA = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: frases(5) });
  let error;
  try { await crearSala(b.nube, b.pareja, { tema: 'divertidas', frases: frases(5), id: 'q-deb0001' }); } catch (e) { error = e; }
  verdadero(error instanceof ErrorSalaAjena, String(error));
  igual(error.existente, idA);
  igual(await leer(b, 'q-deb0001'), null);
  igual((await a.nube.leer(rutaUso(a.pareja.codigo))).probableAbierta, idA);
  // También cuando ya están jugando.
  await unirse(b.nube, b.pareja, idA);
  let otro;
  try { await crearSala(b.nube, b.pareja, { tema: 'divertidas', frases: frases(5), id: 'q-deb0002' }); } catch (e) { otro = e; }
  verdadero(otro instanceof ErrorSalaAjena);
});

prueba('probable-sala: se puede crear si la del otro se cerró o venció, o si la abierta es propia', async () => {
  const { a, b } = await dosCelulares();
  const idA = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: frases(5) });
  await a.nube.escribir(rutaSala(a.pareja.codigo, idA), { creadaMs: Date.now() - 31 * 60 * 1000 }, { combinar: true });
  const idB = await crearSala(b.nube, b.pareja, { tema: 'divertidas', frases: frases(5) }); // la de A venció
  igual((await a.nube.leer(rutaUso(a.pareja.codigo))).probableAbierta, idB);
  await cancelarSala(b.nube, b.pareja, idB);
  const idA2 = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: frases(5) }); // la de B se cerró
  const idA3 = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: frases(5) }); // la abierta es de A
  verdadero(idA2 !== idA3);
});

prueba('probable-sala: cancelarSiSigueEsperando no toca una sala a la que el otro ya se unió', async () => {
  const { a, b } = await dosCelulares();
  const id = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: frases(5) });
  await unirse(b.nube, b.pareja, id);
  igual(await cancelarSiSigueEsperando(a.nube, a.pareja, id), false);
  igual((await leer(a, id)).estado, 'jugando');
});