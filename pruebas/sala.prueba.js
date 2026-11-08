import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearPareja, unirse as unirsePareja } from '../js/nucleo/pareja.js';
import {
  crearSala, partidaPendiente, cancelarSala, unirse, enviarRespuesta, intentarAvanzar, escucharPartida, latir,
  cerrarPartida, leerUso,
} from '../js/modulos/trivia/sala.js';

const esperar = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const vf = (i) => ({ id: `art-${String(i).padStart(3, '0')}`, tema: 'arte', tipo: 'vf', texto: `t${i}`, respuesta: true, dato: 'd' });
const PREGUNTAS = Array.from({ length: 10 }, (_, i) => vf(i + 1));

async function dosCelulares() {
  const mundo = crearMundoFalso();
  const { codigo } = await crearPareja(mundo.nube('u1'), almacenEnMemoria(), { nombre: 'Carlos' });
  await unirsePareja(mundo.nube('u2'), almacenEnMemoria(), { codigo, nombre: 'Sofi' });
  return {
    a: { nube: mundo.nube('u1'), pareja: { codigo, lugar: 'a' } },
    b: { nube: mundo.nube('u2'), pareja: { codigo, lugar: 'b' } },
  };
}
const leer = (cel, id) => cel.nube.leer(`parejas/${cel.pareja.codigo}/partidas/${id}`);

prueba('sala: crear, unirse y jugar una pregunta', async () => {
  const { a, b } = await dosCelulares();
  const id = await crearSala(a.nube, a.pareja, { preguntas: PREGUNTAS });
  const pendiente = await partidaPendiente(b.nube, b.pareja);
  igual([pendiente.id, pendiente.estado, pendiente.anfitrion], [id, 'esperando', 'a']);
  await unirse(b.nube, b.pareja, id);
  igual((await leer(a, id)).estado, 'jugando');
  await enviarRespuesta(a.nube, a.pareja, id, { indice: 0, opcion: true, ms: 1000 });
  await enviarRespuesta(b.nube, b.pareja, id, { indice: 0, opcion: false, ms: 2000 });
  igual(await intentarAvanzar(a.nube, a.pareja, id, { ronda: 0 }), true);
  const p = await leer(b, id);
  igual([p.indice, p.ronda, p.respuestas.a[0], p.respuestas.b[0]], [1, 1, { opcion: true, ms: 1000 }, { opcion: false, ms: 2000 }]);
});

prueba('sala: dos avances a la vez avanzan una sola pregunta', async () => {
  const { a, b } = await dosCelulares();
  const id = await crearSala(a.nube, a.pareja, { preguntas: PREGUNTAS });
  await unirse(b.nube, b.pareja, id);
  const r = await Promise.all([intentarAvanzar(a.nube, a.pareja, id, { ronda: 0 }), intentarAvanzar(b.nube, b.pareja, id, { ronda: 0 })]);
  igual(r.filter(Boolean).length, 1);
  igual((await leer(a, id)).indice, 1);
});

prueba('sala: doble toque no cambia la respuesta', async () => {
  const { a, b } = await dosCelulares();
  const id = await crearSala(a.nube, a.pareja, { preguntas: PREGUNTAS });
  await unirse(b.nube, b.pareja, id);
  await Promise.all([
    enviarRespuesta(b.nube, b.pareja, id, { indice: 0, opcion: true, ms: 500 }),
    enviarRespuesta(b.nube, b.pareja, id, { indice: 0, opcion: false, ms: 600 }),
  ]);
  const r = (await leer(a, id)).respuestas.b[0];
  verdadero(r && (r.ms === 500 || r.ms === 600), JSON.stringify(r));
  await enviarRespuesta(b.nube, b.pareja, id, { indice: 0, opcion: !r.opcion, ms: 900 });
  igual((await leer(a, id)).respuestas.b[0], r);
});

prueba('sala: sin respuesta del otro se puede avanzar por tiempo', async () => {
  const { a, b } = await dosCelulares();
  const id = await crearSala(a.nube, a.pareja, { preguntas: PREGUNTAS });
  await unirse(b.nube, b.pareja, id);
  await enviarRespuesta(a.nube, a.pareja, id, { indice: 0, opcion: true, ms: 1000 });
  igual(await intentarAvanzar(b.nube, b.pareja, id, { ronda: 0 }), true);
  const p = await leer(a, id);
  igual([p.indice, p.respuestas.b[0]], [1, undefined]);
});

prueba('sala: buscar la partida pendiente no lista todas las partidas', async () => {
  const { a, b } = await dosCelulares();
  const id = await crearSala(a.nube, a.pareja, { preguntas: PREGUNTAS });
  let listados = 0;
  const contando = { ...b.nube, listar: async (...x) => { listados++; return b.nube.listar(...x); } };
  igual((await partidaPendiente(contando, b.pareja)).id, id);
  igual(listados, 0);
});

prueba('sala: la partida cancelada ya no queda pendiente', async () => {
  const { a, b } = await dosCelulares();
  const id = await crearSala(a.nube, a.pareja, { preguntas: PREGUNTAS });
  await cancelarSala(a.nube, a.pareja, id);
  igual(await partidaPendiente(b.nube, b.pareja), null);
});

prueba('sala: escucharPartida avisa los cambios con el id', async () => {
  const { a, b } = await dosCelulares();
  const id = await crearSala(a.nube, a.pareja, { preguntas: PREGUNTAS });
  const estados = [];
  const cancelar = escucharPartida(a.nube, a.pareja, id, (p) => estados.push(p && `${p.id}:${p.estado}`));
  await esperar();
  await unirse(b.nube, b.pareja, id);
  await esperar();
  cancelar();
  igual(estados, [`${id}:esperando`, `${id}:jugando`]);
});

prueba('sala: cerrar la partida suma la victoria y las vistas una sola vez', async () => {
  const { a, b } = await dosCelulares();
  const id = await crearSala(a.nube, a.pareja, { preguntas: PREGUNTAS });
  await unirse(b.nube, b.pareja, id);
  await enviarRespuesta(b.nube, b.pareja, id, { indice: 0, opcion: true, ms: 0 });
  await enviarRespuesta(a.nube, a.pareja, id, { indice: 0, opcion: false, ms: 0 });
  const partida = { id, ...(await leer(a, id)) };
  await Promise.all([cerrarPartida(a.nube, a.pareja, partida), cerrarPartida(b.nube, b.pareja, partida)]);
  const uso = await leerUso(a.nube, a.pareja);
  igual(uso.victorias, { a: 0, b: 1 });
  igual(uso.vistasTrivia.arte.length, 10);
  verdadero(uso.fallidas.includes('art-001'), 'anota la que alguien falló');
});

prueba('sala: leerUso sin datos da valores vacíos', async () => {
  const { a } = await dosCelulares();
  igual(await leerUso(a.nube, a.pareja), { victorias: { a: 0, b: 0 }, vistasTrivia: {}, fallidas: [] });
});

prueba('sala: latir escribe la señal de este lugar y detener la apaga', async () => {
  const { a, b } = await dosCelulares();
  const id = await crearSala(a.nube, a.pareja, { preguntas: PREGUNTAS });
  const detener = latir(b.nube, b.pareja, id, { cadaMs: 20 });
  await esperar(70);
  detener();
  const primera = (await leer(a, id)).senal?.b;
  verdadero(primera, 'no escribió la señal');
  await esperar(60);
  igual((await leer(a, id)).senal.b, primera, 'siguió latiendo después de detener');
});
