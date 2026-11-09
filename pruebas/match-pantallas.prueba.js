import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearPareja, unirse as unirsePareja } from '../js/nucleo/pareja.js';
import { crearMatch } from '../js/modulos/match/logica.js';
import { crearPantallasMatch } from '../js/modulos/match/pantallas.js';
import { esperar, hasta, boton, salir } from './diario-pantallas.prueba.js';

const TARJETAS = [
  { id: 'mat-001', mazo: 'citas', texto: 'Picnic en el parque' },
  { id: 'mat-002', mazo: 'viajes', texto: 'Ir a Cartagena' },
  { id: 'mat-003', mazo: 'retos', texto: 'Correr 10 km' },
];

async function parejaMatch() {
  const mundo = crearMundoFalso();
  const almA = almacenEnMemoria();
  const almB = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), almA, { nombre: 'Carlos' });
  await unirsePareja(mundo.nube('u2'), almB, { codigo, nombre: 'Yuli' });
  const celular = (uid, almacen, lugar) => {
    const div = document.createElement('div');
    const rutas = [];
    const pantallas = crearPantallasMatch({ cargar: async () => TARJETAS, ordenar: (l) => l, hoy: () => '2026-11-09' });
    const ctx = { almacen, nube: async () => mundo.nube(uid), ir: (r) => rutas.push(r), refrescar: () => {} };
    return { div, ctx, rutas, pantallas, logica: crearMatch(mundo.nube(uid), { codigo, lugar }) };
  };
  return { a: celular('u1', almA, 'a'), b: celular('u2', almB, 'b') };
}

const textoCarta = (div) => div.querySelector('.carta-match .carta-texto')?.textContent;

prueba('match pantallas: muestra la primera carta y votar pasa a la siguiente', async () => {
  const { a } = await parejaMatch();
  await a.pantallas.mazo(a.div, {}, a.ctx);
  await hasta(() => textoCarta(a.div));
  igual(textoCarta(a.div), 'Picnic en el parque');
  verdadero(a.div.textContent.includes('3 por votar'), a.div.textContent.slice(0, 300));
  boton(a.div, 'No').click();
  await hasta(() => textoCarta(a.div) === 'Ir a Cartagena');
  verdadero(a.div.textContent.includes('2 por votar'));
  igual(await a.logica.misVotos(), { 'mat-001': 'no' });
  salir();
});

prueba('match pantallas: al completar un match aparece "¡Match!" con la tarjeta', async () => {
  const { a, b } = await parejaMatch();
  await b.logica.votar('mat-001', 'si');
  await a.pantallas.mazo(a.div, {}, a.ctx);
  await hasta(() => textoCarta(a.div));
  boton(a.div, 'Solo si tú quieres').click();
  await hasta(() => document.querySelector('.festejo-match'));
  verdadero(document.querySelector('.festejo-match').textContent.includes('Picnic en el parque'));
  document.querySelector('.festejo-match button').click();
  igual(document.querySelector('.festejo-match'), null);
  salir();
});

prueba('match pantallas: sin cartas pendientes invita a crear o ver los matches', async () => {
  const { a } = await parejaMatch();
  for (const t of TARJETAS) await a.logica.votar(t.id, 'no');
  await a.pantallas.mazo(a.div, {}, a.ctx);
  await hasta(() => a.div.textContent.includes('Ya votaste todas'));
  verdadero(a.div.querySelector('a[href="#/match/nueva"]'));
  salir();
});

prueba('match pantallas: la lista muestra los matches y marca "¡Lo hicimos!"', async () => {
  const { a, b } = await parejaMatch();
  await a.logica.votar('mat-002', 'si');
  await b.logica.votar('mat-002', 'si');
  await a.pantallas.matches(a.div, {}, a.ctx);
  await hasta(() => a.div.textContent.includes('Ir a Cartagena'));
  verdadero(a.div.textContent.includes('Plan de la semana'), 'destaca el plan');
  boton(a.div, '¡Lo hicimos!').click();
  await hasta(async () => true);
  await esperar(50);
  igual((await b.logica.listarMatches())[0].hecho, true);
  salir();
});

prueba('match pantallas: crear una tarjeta la guarda y vuelve al mazo', async () => {
  const { a, b } = await parejaMatch();
  await a.pantallas.nueva(a.div, {}, a.ctx);
  await hasta(() => a.div.querySelector('textarea'));
  a.div.querySelector('textarea').value = 'Ver el amanecer en Monserrate';
  boton(a.div, 'Guardar').click();
  await hasta(() => a.rutas.includes('match'));
  igual((await b.logica.tarjetasPropias()).map((t) => t.texto), ['Ver el amanecer en Monserrate']);
  salir();
});
