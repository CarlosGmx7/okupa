import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearPareja, unirse as unirsePareja } from '../js/nucleo/pareja.js';
import { crearSala, unirse, enviarRespuesta, leerUso } from '../js/modulos/trivia/sala.js';
import { crearPantallasTrivia } from '../js/modulos/trivia/pantallas.js';
import { pantallaInicio } from '../js/nucleo/inicio.js';

const esperar = (ms = 0) => new Promise((r) => setTimeout(r, ms));
async function hasta(cond, ms = 1500) {
  for (let t = 0; t < ms && !cond(); t += 20) await esperar(20);
  verdadero(cond(), 'no llegó a tiempo');
}
const boton = (div, texto) => [...div.querySelectorAll('button')].find((b) => b.textContent.includes(texto));

const TEMAS = [{ id: 'arte', nombre: 'Arte', icono: '✎', color: '#d4566f' }];
const vf = (i, texto = `Pregunta ${i}`) => ({ id: `art-${String(i).padStart(3, '0')}`, tema: 'arte', tipo: 'vf', texto, respuesta: true, dato: `Dato ${i}` });
const preguntas = (texto) => Array.from({ length: 10 }, (_, i) => vf(i + 1, i === 0 && texto ? texto : undefined));

// Pareja Carlos (u1, a) y Sofi (u2, b), cada uno con su ctx y sus pantallas.
async function pareja({ nombreB = 'Sofi' } = {}) {
  const mundo = crearMundoFalso();
  const almA = almacenEnMemoria();
  const almB = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), almA, { nombre: 'Carlos' });
  await unirsePareja(mundo.nube('u2'), almB, { codigo, nombre: nombreB });
  let t = 0;
  const reloj = { ahora: () => t, adelantar: (ms) => { t += ms; } };
  const celular = (uid, almacen, lugar) => {
    const div = document.createElement('div');
    const rutas = [];
    const pantallas = crearPantallasTrivia({
      cargar: async () => ({ temas: TEMAS, bancos: { arte: preguntas() }, vocabulario: [] }),
      ahora: reloj.ahora,
      ms: { ruleta: 0, cuenta: 0, revelado: 60000, revisar: 20, sondeo: 30 },
    });
    const ctx = { almacen, nube: async () => mundo.nube(uid), ir: (r) => rutas.push(r), refrescar: () => { div.replaceChildren(); return pantallas.sala(div, {}, ctx); } };
    return { div, ctx, rutas, pantallas, nube: mundo.nube(uid), pareja: { codigo, lugar } };
  };
  return { reloj, a: celular('u1', almA, 'a'), b: celular('u2', almB, 'b') };
}
const salir = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

prueba('trivia pantallas: sala ofrece nueva partida y muestra victorias', async () => {
  const { a } = await pareja();
  await a.pantallas.sala(a.div, {}, a.ctx);
  await hasta(() => boton(a.div, 'Nueva partida'));
  verdadero(a.div.textContent.includes('Victorias: Carlos 0 · Sofi 0'), a.div.textContent);
  boton(a.div, 'Nueva partida').click();
  await hasta(() => a.div.textContent.includes('Esperando a que Sofi se una'));
  salir();
});

prueba('trivia pantallas: el otro ve la invitación y se une', async () => {
  const { a, b } = await pareja();
  const id = await crearSala(a.nube, a.pareja, { preguntas: preguntas() });
  await b.pantallas.sala(b.div, {}, b.ctx);
  await hasta(() => b.div.textContent.includes('Carlos te invitó a jugar'));
  boton(b.div, 'Unirme').click();
  await hasta(() => b.rutas.length > 0);
  igual(b.rutas, [`trivia/jugar/${id}`]);
  salir();
});

async function enJuego({ texto, nombreB } = {}) {
  const p = await pareja({ nombreB });
  const id = await crearSala(p.a.nube, p.a.pareja, { preguntas: preguntas(texto) });
  await unirse(p.b.nube, p.b.pareja, id);
  await p.a.pantallas.juego(p.a.div, { id }, p.a.ctx);
  await hasta(() => p.a.div.querySelector('.opcion-juego'));
  return { ...p, id };
}

prueba('trivia pantallas: responder deja la opción marcada y espera al otro', async () => {
  const { a } = await enJuego();
  const verdaderoBtn = boton(a.div, 'Verdadero');
  verdaderoBtn.click();
  igual(verdaderoBtn.getAttribute('aria-pressed'), 'true');
  verdadero(boton(a.div, 'Falso').disabled, 'la otra opción queda deshabilitada');
  await hasta(() => a.div.textContent.includes('Esperando a Sofi'));
  salir();
});

prueba('trivia pantallas: revelado marca ✓ y ✗ con texto, no solo color', async () => {
  const { a, b, id } = await enJuego();
  boton(a.div, 'Falso').click();
  await enviarRespuesta(b.nube, b.pareja, id, { indice: 0, opcion: true, ms: 1000 });
  await hasta(() => a.div.querySelector('.revelado'));
  verdadero(boton(a.div, 'Verdadero').textContent.includes('✓'), boton(a.div, 'Verdadero').textContent);
  verdadero(boton(a.div, 'Falso').textContent.includes('✗'), boton(a.div, 'Falso').textContent);
  verdadero(a.div.textContent.includes('Dato 1'), 'muestra el dato');
  salir();
});

prueba('trivia pantallas: el otro desconectado muestra el aviso', async () => {
  const { a, reloj } = await enJuego();
  reloj.adelantar(16000);
  await hasta(() => a.div.textContent.includes('Sofi se desconectó, esperando…'));
  verdadero(boton(a.div, 'Terminar partida'), 'ofrece terminar');
  salir();
});

prueba('trivia pantallas: el texto de preguntas y nombres se pinta literal', async () => {
  const { a } = await enJuego({ texto: '<b>x</b>', nombreB: '<i>y</i>' });
  verdadero(a.div.textContent.includes('<b>x</b>'), a.div.textContent);
  igual([a.div.querySelector('b'), a.div.querySelector('i')], [null, null]);
  salir();
});

prueba('trivia pantallas: al terminar muestra el ganador y suma la victoria', async () => {
  const { a, b, id } = await enJuego();
  await a.nube.escribir(`parejas/${a.pareja.codigo}/partidas/${id}`, { respuestas: { b: { 0: { opcion: true, ms: 0 } } }, estado: 'terminada' }, { combinar: true });
  await hasta(() => a.div.textContent.includes('¡Ganó Sofi!'));
  await hasta(() => a.div.querySelectorAll('.repaso li').length === 10);
  let victorias;
  for (let i = 0; i < 50 && victorias?.b !== 1; i++) { victorias = (await leerUso(b.nube, b.pareja)).victorias; await esperar(20); }
  igual(victorias, { a: 0, b: 1 });
  salir();
});

prueba('inicio: con pareja la tarjeta ofrece las secciones para jugar juntos', () => {
  const almacen = almacenEnMemoria();
  almacen.escribir('okupa:pareja:actual', { codigo: 'K7PQ2M', lugar: 'a' });
  const div = document.createElement('div');
  pantallaInicio(div, {}, { almacen, modulos: [{ id: 'trivia', accesoJuntos: { ruta: 'trivia', nombre: 'Trivia', icono: '✦' } }], ir() {}, refrescar() {} });
  const enlace = [...div.querySelectorAll('.juntos a')].find((x) => x.textContent.includes('Trivia'));
  verdadero(enlace, div.querySelector('.juntos')?.outerHTML);
  igual(enlace.getAttribute('href'), '#/trivia');
});

prueba('trivia pantallas: con 5 días del diario, la partida trae 2 de «¿Cuánto me conoces?»', async () => {
  const { a } = await pareja();
  const diario = [{ id: 'dia-0087', tema: 'gustos', intensidad: 1, tipo: 'opciones', texto: '¿Playa o montaña?', opciones: [{ texto: 'Playa' }, { texto: 'Montaña' }] },
    { id: 'dia-0088', tema: 'gustos', intensidad: 1, tipo: 'escala', texto: '¿Terror?', extremos: ['No', 'Sí'] }];
  const dias = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'];
  for (const l of ['a', 'b']) {
    await a.nube.escribir(`parejas/${a.pareja.codigo}/perfiles/${l}`, { aprendidos: dias, respuestas: { 'dia-0087': 1, 'dia-0088': 9 } });
  }
  const pantallas = crearPantallasTrivia({
    cargar: async () => ({ temas: TEMAS, bancos: { arte: preguntas() }, vocabulario: [], diario }),
    ms: { ruleta: 0, cuenta: 0, revelado: 60000, revisar: 20, sondeo: 30 },
  });
  await pantallas.sala(a.div, {}, a.ctx);
  await hasta(() => boton(a.div, 'Nueva partida'));
  boton(a.div, 'Nueva partida').click();
  await hasta(() => a.div.textContent.includes('Esperando a que Sofi se una'));
  const [{ datos: partida }] = await a.nube.listar(`parejas/${a.pareja.codigo}/partidas`);
  const conoces = partida.preguntas.filter((p) => p.para);
  igual(conoces.length, 2);
  verdadero(conoces.every((p) => p.para.a.texto.includes('Sofi') && p.para.b.texto.includes('Carlos')), JSON.stringify(conoces));
  salir();
});