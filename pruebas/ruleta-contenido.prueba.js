import { prueba, igual, verdadero } from './corredor.js';
import { PRESUPUESTOS, LUGARES, validarPlan, cargarPlanes } from '../js/modulos/ruleta/logica.js';

const PREF_LUGAR = { casa: 'cas', salir: 'sal' };
const PREF_PRESUPUESTO = { nulo: 'nul', medio: 'med', grande: 'gra' };
const TIPOS = ['cocinar', 'juego', 'conversacion', 'aire-libre', 'cultura', 'aventura', 'romantico', 'picante'];
const GENERICAS = ['vean una pelicula', 'salgan a comer', 'vayan a cine', 'cocinen juntos'];

const normalizar = (t) => t.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.!¡]+$/g, '').trim();

async function crudos() {
  const r = await fetch(new URL('../data/ruleta/planes.json', import.meta.url).href);
  verdadero(r.ok, `planes.json no carga (${r.status})`);
  const lista = await r.json();
  verdadero(Array.isArray(lista), 'planes.json no es una lista');
  return lista;
}

const combinaciones = () => PRESUPUESTOS.flatMap((p) => LUGARES.map((l) => [p.id, l.id]));

prueba('ruleta contenido: todos los planes son válidos y con tipo conocido', async () => {
  const lista = await crudos();
  for (const p of lista) {
    verdadero(validarPlan(p), `${p && p.id} no pasa validarPlan`);
    verdadero(TIPOS.includes(p.tipo), `${p.id} tipo ${p.tipo}`);
  }
  igual((await cargarPlanes()).length, lista.length, 'cargarPlanes descarta planes');
});

prueba('ruleta contenido: ids únicos con el prefijo de su presupuesto y lugar', async () => {
  const lista = await crudos();
  igual(new Set(lista.map((p) => p.id)).size, lista.length, 'ids repetidos');
  for (const p of lista) {
    const re = new RegExp(`^${PREF_LUGAR[p.lugar]}-${PREF_PRESUPUESTO[p.presupuesto]}-\\d{3}$`);
    verdadero(re.test(p.id), p.id);
  }
});

prueba('ruleta contenido: cada una de las 6 combinaciones tiene ≥ 40 planes y ≥ 4 tipos', async () => {
  const lista = await crudos();
  const combos = combinaciones();
  igual(combos.length, 6);
  for (const [pres, lug] of combos) {
    const grupo = lista.filter((p) => p.presupuesto === pres && p.lugar === lug);
    verdadero(grupo.length >= 40, `${lug}/${pres} tiene ${grupo.length}`);
    const tipos = new Set(grupo.map((p) => p.tipo));
    verdadero(tipos.size >= 4, `${lug}/${pres} usa ${tipos.size} tipos`);
  }
});

prueba('ruleta contenido: ningún texto repetido (minúsculas, sin tildes)', async () => {
  const lista = await crudos();
  const vistos = new Map();
  for (const p of lista) {
    const n = normalizar(p.texto);
    verdadero(!vistos.has(n), `${p.id} repite a ${vistos.get(n)}`);
    vistos.set(n, p.id);
  }
});

prueba('ruleta contenido: ningún plan es una frase genérica', async () => {
  const lista = await crudos();
  for (const p of lista) {
    verdadero(!GENERICAS.includes(normalizar(p.texto)), `${p.id} es genérico: ${p.texto}`);
  }
});
