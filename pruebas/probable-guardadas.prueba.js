import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearPareja, unirse as unirsePareja } from '../js/nucleo/pareja.js';
import { crearPantallasProbable } from '../js/modulos/probable/pantallas.js';
import { crearSala, unirse, votar, rutaSala } from '../js/modulos/probable/sala.js';
import { resumen } from '../js/modulos/probable/logica.js';
import { exportarRespaldo, esDeEsteCelular } from '../js/nucleo/almacen.js';
import {
  CLAVE_GUARDADAS, MAX_GUARDADAS, rondaParaGuardar, guardarRonda, leerGuardadas, borrarGuardada, marcarGuardada, leerMarcas,
} from '../js/modulos/probable/guardadas.js';

const esperar = (ms = 0) => new Promise((r) => setTimeout(r, ms));
async function hasta(cond, ms = 2000) {
  for (let t = 0; t < ms && !cond(); t += 20) await esperar(20);
  verdadero(cond(), 'no llegó a tiempo');
}
const boton = (div, texto) => [...div.querySelectorAll('button')].find((b) => b.textContent.trim() === texto);
const salir = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
const sinFeos = (div) => verdadero(!/null|undefined/.test(div.textContent), div.textContent);
const NOMBRES = { a: 'Carlos', b: 'Yuli' };
const FRASES = [0, 1, 2, 3].map((i) => ({ id: `div-00${i + 1}`, texto: `hace algo raro ${i + 1}` }));
// Frases 0, 1 y 2 reveladas; la 3 solo la votó a.
const SALA = {
  id: 'q-abc12', estado: 'terminada', tema: 'divertidas', frases: FRASES,
  votaron: { 0: { a: true, b: true }, 1: { a: true, b: true }, 2: { a: true, b: true }, 3: { a: true } },
};
const VOTOS = { 0: { a: 'a', b: 'a' }, 1: { a: 'todos', b: 'b' }, 2: { a: 'b', b: 'b' } };

const ronda = (id, fecha = 1) => ({ id, fecha, tema: 'divertidas', nombres: NOMBRES, frases: [{ texto: 'hola mundo', a: 'a', b: 'b' }], coincidencias: 0, total: 1 });

prueba('probable guardadas: la ronda guarda solo las reveladas y coincide con resumen()', () => {
  const r = rondaParaGuardar(SALA, VOTOS, NOMBRES, 1234);
  igual(r.id, 'q-abc12');
  igual(r.fecha, 1234);
  igual(r.tema, 'divertidas');
  igual(r.nombres, NOMBRES);
  igual(r.frases, [
    { texto: 'hace algo raro 1', a: 'a', b: 'a' },
    { texto: 'hace algo raro 2', a: 'todos', b: 'b' },
    { texto: 'hace algo raro 3', a: 'b', b: 'b' },
  ]);
  const res = resumen(Object.values(VOTOS), ['a', 'b']);
  igual([r.coincidencias, r.total], [res.coincidencias, res.total]);
  igual([r.coincidencias, r.total], [2, 3]);
});

prueba('probable guardadas: una frase propia («nuestras») guarda su texto', () => {
  const sala = { id: 'q-zzz99', tema: 'nuestras', frases: [{ id: 'f-1', texto: 'se queda dormido viendo series' }], votaron: { 0: { a: true, b: true } } };
  const r = rondaParaGuardar(sala, { 0: { a: 'a', b: 'b' } }, NOMBRES, 5);
  igual(r.frases, [{ texto: 'se queda dormido viendo series', a: 'a', b: 'b' }]);
});

prueba('probable guardadas: guardar dos veces la misma ronda deja una; la más nueva va primero', () => {
  const alm = almacenEnMemoria();
  igual(CLAVE_GUARDADAS, 'okupa:probable:guardadas');
  guardarRonda(alm, ronda('q-uno11', 1));
  guardarRonda(alm, ronda('q-dos22', 2));
  guardarRonda(alm, { ...ronda('q-uno11', 3), coincidencias: 1 });
  const lista = leerGuardadas(alm);
  igual(lista.map((r) => r.id), ['q-uno11', 'q-dos22']);
  igual(lista[0].coincidencias, 1);
});

prueba('probable guardadas: máximo 100, sale la más vieja', () => {
  const alm = almacenEnMemoria();
  igual(MAX_GUARDADAS, 100);
  for (let i = 1; i <= 101; i++) guardarRonda(alm, ronda(`q-r${i}`, i));
  const lista = leerGuardadas(alm);
  igual(lista.length, 100);
  igual(lista[0].id, 'q-r101');
  verdadero(!lista.some((r) => r.id === 'q-r1'), 'la más vieja salió');
});

prueba('probable guardadas: un valor corrupto da lista vacía', () => {
  const alm = almacenEnMemoria();
  for (const malo of ['hola', 5, { a: 1 }, null]) {
    alm.escribir(CLAVE_GUARDADAS, malo);
    igual(leerGuardadas(alm), []);
  }
  alm.escribir(CLAVE_GUARDADAS, [ronda('q-uno11'), 7, null, { id: 3 }]);
  igual(leerGuardadas(alm).map((r) => r.id), ['q-uno11']);
  // Guardar sobre algo corrupto no se rompe.
  alm.escribir(CLAVE_GUARDADAS, 'basura');
  guardarRonda(alm, ronda('q-dos22'));
  igual(leerGuardadas(alm).map((r) => r.id), ['q-dos22']);
});

prueba('probable guardadas: una ronda con frases mal formadas se descarta (no rompe el detalle)', () => {
  const alm = almacenEnMemoria();
  const mala = (frases) => ({ ...ronda('q-mala11'), frases });
  alm.escribir(CLAVE_GUARDADAS, [
    ronda('q-buena1'), mala([null]), mala(['texto suelto']), mala([{ texto: 5 }]), mala([{ a: 'a' }]), mala([[]]), mala('no'),
  ]);
  igual(leerGuardadas(alm).map((r) => r.id), ['q-buena1']);
  alm.escribir(CLAVE_GUARDADAS, [mala([])]);
  igual(leerGuardadas(alm).length, 1);
});

prueba('probable guardadas: viajan en el respaldo (no son «de este celular»)', () => {
  const alm = almacenEnMemoria();
  guardarRonda(alm, ronda('q-uno11', 1));
  verdadero(!esDeEsteCelular(CLAVE_GUARDADAS));
  igual(exportarRespaldo(alm).datos[CLAVE_GUARDADAS].map((r) => r.id), ['q-uno11']);
});

prueba('probable guardadas: borrarGuardada quita solo esa', () => {
  const alm = almacenEnMemoria();
  guardarRonda(alm, ronda('q-uno11', 1));
  guardarRonda(alm, ronda('q-dos22', 2));
  borrarGuardada(alm, 'q-uno11');
  igual(leerGuardadas(alm).map((r) => r.id), ['q-dos22']);
});

prueba('probable guardadas: marcarGuardada con merge y leerMarcas', async () => {
  const mundo = crearMundoFalso();
  const { codigo } = await crearPareja(mundo.nube('u1'), almacenEnMemoria(), { nombre: 'Carlos' });
  const a = { nube: mundo.nube('u1'), pareja: { codigo, lugar: 'a' } };
  const b = { nube: mundo.nube('u2'), pareja: { codigo, lugar: 'b' } };
  await marcarGuardada(a.nube, a.pareja, 'q-abc12');
  igual(await a.nube.leer(`parejas/${codigo}/probable_guardadas/q-abc12`), { a: true });
  await marcarGuardada(b.nube, b.pareja, 'q-abc12');
  igual(await a.nube.leer(`parejas/${codigo}/probable_guardadas/q-abc12`), { a: true, b: true });
  igual(await leerMarcas(a.nube, a.pareja, ['q-abc12', 'q-otra1']), { 'q-abc12': { a: true, b: true }, 'q-otra1': {} });
  mundo.desconectar();
  igual(await leerMarcas(a.nube, a.pareja, ['q-abc12']), { 'q-abc12': {} });
});

// Una pareja con una sala terminada de 4 frases (3 reveladas), lista para abrir la pantalla de resumen.
async function conSalaTerminada() {
  const mundo = crearMundoFalso();
  const almA = almacenEnMemoria();
  const almB = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), almA, { nombre: 'Carlos' });
  await unirsePareja(mundo.nube('u2'), almB, { codigo, nombre: 'Yuli' });
  const celular = (uid, almacen, lugar, nubeUsada) => {
    const div = document.createElement('div');
    const rutas = [];
    const pantallas = crearPantallasProbable({ cargar: async () => [], ahora: () => 0, ms: { sondeo: 30, revisar: 20 } });
    const ctx = { almacen, nube: async () => nubeUsada ?? mundo.nube(uid), ir: (r) => rutas.push(r), refrescar: () => {} };
    return { div, ctx, rutas, pantallas, nube: mundo.nube(uid), pareja: { codigo, lugar } };
  };
  const a = celular('u1', almA, 'a');
  const b = celular('u2', almB, 'b');
  const id = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: FRASES });
  await unirse(b.nube, b.pareja, id);
  for (const [i, v] of Object.entries(VOTOS)) {
    await votar(a.nube, a.pareja, id, { indice: Number(i), voto: v.a });
    await votar(b.nube, b.pareja, id, { indice: Number(i), voto: v.b });
  }
  await votar(a.nube, a.pareja, id, { indice: 3, voto: 'a' }); // sin revelar
  await a.nube.escribir(rutaSala(codigo, id), { estado: 'cancelada' }, { combinar: true });
  return { mundo, a, b, id, codigo, celular, almA, almB };
}

prueba('probable guardadas: «Guardar ronda» guarda la copia y la marca; dos veces deja una', async () => {
  const { a, id, codigo } = await conSalaTerminada();
  await a.pantallas.juego(a.div, { id }, a.ctx);
  await hasta(() => boton(a.div, 'Guardar ronda'));
  verdadero(a.div.textContent.includes('Coincidieron en 2 de 3'), a.div.textContent);
  boton(a.div, 'Guardar ronda').click();
  await hasta(() => a.div.textContent.includes('Guardada ✓'));
  const lista = leerGuardadas(a.ctx.almacen);
  igual(lista.length, 1);
  igual(lista[0].id, id);
  igual(lista[0].frases.length, 3);
  igual([lista[0].coincidencias, lista[0].total], [2, 3]);
  let marca;
  for (let i = 0; i < 50 && !marca?.a; i++) { marca = await a.nube.leer(`parejas/${codigo}/probable_guardadas/${id}`); await esperar(20); }
  igual(marca, { a: true });
  sinFeos(a.div);
  salir();
  // Al volver a abrir la misma ronda ya sale guardada y no se duplica.
  a.div.replaceChildren();
  await a.pantallas.juego(a.div, { id }, a.ctx);
  await hasta(() => a.div.textContent.includes('Guardada ✓'));
  igual(leerGuardadas(a.ctx.almacen).length, 1);
  salir();
});

prueba('probable guardadas: con la nube rechazando la marca igual queda «Guardada ✓» y la copia', async () => {
  const { mundo, celular, a, id, codigo } = await conSalaTerminada();
  const falla = (n) => ({ ...n, escribir: async (ruta, ...resto) => { if (ruta.includes('probable_guardadas')) throw new Error('rechazada'); return n.escribir(ruta, ...resto); } });
  const c = celular('u1', a.ctx.almacen, 'a', falla(mundo.nube('u1')));
  await c.pantallas.juego(c.div, { id }, c.ctx);
  await hasta(() => boton(c.div, 'Guardar ronda'));
  boton(c.div, 'Guardar ronda').click();
  await hasta(() => c.div.textContent.includes('Guardada ✓'));
  igual(leerGuardadas(c.ctx.almacen).length, 1);
  await esperar(60);
  igual(await a.nube.leer(`parejas/${codigo}/probable_guardadas/${id}`), null);
  salir();
});

prueba('probable guardadas: una ronda con «Los dos» y frases sin revelar se guarda y se pinta bien', async () => {
  const { a, id } = await conSalaTerminada();
  await a.pantallas.juego(a.div, { id }, a.ctx);
  await hasta(() => boton(a.div, 'Guardar ronda'));
  boton(a.div, 'Guardar ronda').click();
  await hasta(() => a.div.textContent.includes('Guardada ✓'));
  salir();
  const lista = document.createElement('div');
  await a.pantallas.guardadas(lista, {}, a.ctx);
  await hasta(() => lista.textContent.includes('Coincidieron en 2 de 3'));
  verdadero(lista.textContent.includes('Divertidas'), lista.textContent);
  sinFeos(lista);
  const enlace = [...lista.querySelectorAll('a')].find((x) => x.getAttribute('href') === `#/probable/guardadas/${id}`);
  verdadero(enlace, 'enlace al detalle');
  const detalle = document.createElement('div');
  await a.pantallas.guardadaDetalle(detalle, { id }, a.ctx);
  await hasta(() => detalle.textContent.includes('hace algo raro 2'));
  verdadero(!detalle.textContent.includes('hace algo raro 4'), 'la sin revelar no entra');
  verdadero(detalle.textContent.includes('Los dos'), detalle.textContent);
  verdadero(detalle.textContent.includes('Carlos') && detalle.textContent.includes('Yuli'));
  igual([...detalle.querySelectorAll('.guardada-frase')].length, 3);
  sinFeos(detalle);
  salir();
});

prueba('probable guardadas: «Rondas guardadas» muestra «también la guardó» cuando el otro la marcó', async () => {
  const { a, b, id, codigo } = await conSalaTerminada();
  await a.pantallas.juego(a.div, { id }, a.ctx);
  await hasta(() => boton(a.div, 'Guardar ronda'));
  boton(a.div, 'Guardar ronda').click();
  await hasta(() => a.div.textContent.includes('Guardada ✓'));
  salir();
  const lista = document.createElement('div');
  await a.pantallas.guardadas(lista, {}, a.ctx);
  await hasta(() => lista.textContent.includes('Coincidieron en 2 de 3'));
  verdadero(!lista.textContent.includes('también la guardó'), lista.textContent);
  salir();
  await marcarGuardada(b.nube, b.pareja, id);
  const lista2 = document.createElement('div');
  await a.pantallas.guardadas(lista2, {}, a.ctx);
  await hasta(() => lista2.textContent.includes('✓ Yuli también la guardó'));
  igual(await a.nube.leer(`parejas/${codigo}/probable_guardadas/${id}`), { a: true, b: true });
  salir();
});

prueba('probable guardadas: al abrir la lista se reintenta la marca propia que faltaba', async () => {
  const { a, id, codigo } = await conSalaTerminada();
  guardarRonda(a.ctx.almacen, { ...ronda(id, 5), nombres: NOMBRES });
  igual(await a.nube.leer(`parejas/${codigo}/probable_guardadas/${id}`), null);
  const lista = document.createElement('div');
  await a.pantallas.guardadas(lista, {}, a.ctx);
  let marca;
  for (let i = 0; i < 50 && !marca?.a; i++) { marca = await a.nube.leer(`parejas/${codigo}/probable_guardadas/${id}`); await esperar(20); }
  igual(marca, { a: true });
  salir();
});

prueba('probable guardadas: borrar quita solo la copia local', async () => {
  const { a, id, codigo } = await conSalaTerminada();
  guardarRonda(a.ctx.almacen, ronda(id, 5));
  await marcarGuardada(a.nube, a.pareja, id);
  const lista = document.createElement('div');
  await a.pantallas.guardadas(lista, {}, a.ctx);
  await hasta(() => boton(lista, 'Borrar'));
  const confirmar = globalThis.confirm;
  globalThis.confirm = () => true;
  try { boton(lista, 'Borrar').click(); } finally { globalThis.confirm = confirmar; }
  await hasta(() => leerGuardadas(a.ctx.almacen).length === 0);
  verdadero(lista.textContent.includes('Todavía no'), lista.textContent);
  igual(await a.nube.leer(`parejas/${codigo}/probable_guardadas/${id}`), { a: true });
  salir();
});

prueba('probable guardadas: sin rondas la lista lo dice sin errores', async () => {
  const { a } = await conSalaTerminada();
  const lista = document.createElement('div');
  await a.pantallas.guardadas(lista, {}, a.ctx);
  await hasta(() => lista.textContent.includes('Todavía no'));
  sinFeos(lista);
  const detalle = document.createElement('div');
  await a.pantallas.guardadaDetalle(detalle, { id: 'q-nada1' }, a.ctx);
  await hasta(() => detalle.textContent.includes('no está'));
  salir();
});

// Cuenta lecturas y escrituras de marcas en la nube falsa.
function contada(nube, cuenta, { falla = false } = {}) {
  return {
    ...nube,
    leer: async (ruta) => { if (ruta.includes('probable_guardadas')) { cuenta.lecturas++; if (falla) throw new Error('sin red'); } return nube.leer(ruta); },
    escribir: async (ruta, ...resto) => { if (ruta.includes('probable_guardadas')) cuenta.escrituras++; return nube.escribir(ruta, ...resto); },
  };
}

prueba('probable guardadas: las marcas ya conocidas no se vuelven a leer', async () => {
  const { mundo, celular, a, b, id } = await conSalaTerminada();
  guardarRonda(a.ctx.almacen, ronda(id, 5));
  guardarRonda(a.ctx.almacen, ronda('q-otra1', 6));
  await marcarGuardada(a.nube, a.pareja, id);
  await marcarGuardada(b.nube, b.pareja, id);
  const cuenta = { lecturas: 0, escrituras: 0 };
  const c = celular('u1', a.ctx.almacen, 'a', contada(mundo.nube('u1'), cuenta));
  const abrir = async () => {
    const div = document.createElement('div');
    await c.pantallas.guardadas(div, {}, c.ctx);
    await esperar(150);
    salir();
    return div;
  };
  const div1 = await abrir();
  igual(cuenta.lecturas, 2); // la primera vez se leen las dos
  verdadero(div1.textContent.includes('✓ Yuli también la guardó'), div1.textContent);
  const antes = cuenta.lecturas;
  const div2 = await abrir();
  igual(cuenta.lecturas - antes, 1); // solo la que aún no tiene las dos marcas
  verdadero(div2.textContent.includes('✓ Yuli también la guardó'), div2.textContent);
});

prueba('probable guardadas: si la lectura falla no se escribe ninguna marca', async () => {
  const { mundo, celular, a, id } = await conSalaTerminada();
  guardarRonda(a.ctx.almacen, ronda(id, 5));
  guardarRonda(a.ctx.almacen, ronda('q-otra1', 6));
  const cuenta = { lecturas: 0, escrituras: 0 };
  const c = celular('u1', a.ctx.almacen, 'a', contada(mundo.nube('u1'), cuenta, { falla: true }));
  const div = document.createElement('div');
  await c.pantallas.guardadas(div, {}, c.ctx);
  await esperar(150);
  igual(cuenta.escrituras, 0);
  verdadero(div.textContent.includes('Coincidieron en'), div.textContent);
  salir();
});

prueba('probable guardadas: si falla guardar en el celular el botón vuelve a estar activo', async () => {
  const { a, id } = await conSalaTerminada();
  const roto = { ...a.ctx.almacen, escribir: (k, v) => { if (k === CLAVE_GUARDADAS) throw new Error('lleno'); return a.ctx.almacen.escribir(k, v); } };
  const ctx = { ...a.ctx, almacen: roto };
  await a.pantallas.juego(a.div, { id }, ctx);
  await hasta(() => boton(a.div, 'Guardar ronda'));
  boton(a.div, 'Guardar ronda').click();
  await esperar(50);
  verdadero(!boton(a.div, 'Guardar ronda').disabled, 'botón activo');
  verdadero(!a.div.textContent.includes('Guardada ✓'), a.div.textContent);
  salir();
});
