import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearPareja, unirse, borrarTodo } from '../js/nucleo/pareja.js';
import { exportarRespaldo } from '../js/nucleo/almacen.js';
import {
  CLAVE_COPIA, abreMsDe, validarCarta, crearCarta, listarCartas, leerTexto, borrarCarta,
  guardarCopia, leerCopia, refrescarCopia,
} from '../js/modulos/capsula/datos.js';

const HOY = '2026-11-14';
const AHORA = new Date(2026, 10, 14, 10, 0).getTime();

async function dosCelulares() {
  const mundo = crearMundoFalso();
  const almA = almacenEnMemoria();
  const almB = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), almA, { nombre: 'Carlos' });
  await unirse(mundo.nube('u2'), almB, { codigo, nombre: 'Yuli' });
  return { mundo, codigo, almA, almB, a: mundo.nube('u1'), b: mundo.nube('u2'), pareja: { codigo, lugar: 'a' } };
}

prueba('capsula datos: abreMsDe es la medianoche local', () => {
  igual(abreMsDe('2027-01-05'), new Date(2027, 0, 5).getTime());
  igual(CLAVE_COPIA, 'okupa:capsulas');
});

prueba('capsula datos: validarCarta revisa fecha y texto', () => {
  const ok = { abreEl: '2026-11-15', texto: 'Hola' };
  igual(validarCarta(ok, HOY), null);
  igual(validarCarta({ ...ok, abreEl: HOY }, HOY), 'Escoge una fecha desde mañana.');
  igual(validarCarta({ ...ok, abreEl: '' }, HOY), 'Escoge una fecha desde mañana.');
  igual(validarCarta({ ...ok, abreEl: '2036-11-13' }, HOY), null);
  igual(validarCarta({ ...ok, abreEl: '2036-11-14' }, HOY), 'La fecha no puede pasar de 10 años.');
  igual(validarCarta({ ...ok, texto: '   ' }, HOY), 'Escribe la carta (máximo 2.000 caracteres).');
  igual(validarCarta({ ...ok, texto: 'x'.repeat(2001) }, HOY), 'Escribe la carta (máximo 2.000 caracteres).');
  igual(validarCarta({ ...ok, texto: 'x'.repeat(2000) }, HOY), null);
});

prueba('capsula datos: crearCarta escribe metadatos y texto exactos', async () => {
  const { a, codigo, pareja } = await dosCelulares();
  const r = await crearCarta(a, pareja, { abreEl: '2026-12-25', texto: '  Feliz Navidad  ' }, HOY, AHORA);
  verdadero(r.ok && /^c-[a-z0-9]{4,30}$/.test(r.id), JSON.stringify(r));
  const meta = await a.leer(`parejas/${codigo}/capsulas/${r.id}`);
  igual(Object.keys(meta).sort(), ['abreEl', 'abreMs', 'creadaMs', 'de']);
  igual(meta, { de: 'a', abreEl: '2026-12-25', abreMs: new Date(2026, 11, 25).getTime(), creadaMs: AHORA });
  const cont = await a.leer(`parejas/${codigo}/capsulas/${r.id}/contenido/texto`);
  igual(cont, { texto: 'Feliz Navidad' });
  igual(await leerTexto(a, pareja, r.id), 'Feliz Navidad');
  igual(await leerTexto(a, pareja, 'c-noexiste'), null);
});

prueba('capsula datos: crearCarta rechaza hoy, 3.653 días, texto vacío o largo', async () => {
  const { a, pareja } = await dosCelulares();
  igual(await crearCarta(a, pareja, { abreEl: HOY, texto: 'Hola' }, HOY, AHORA), { ok: false, error: 'Escoge una fecha desde mañana.' });
  igual(await crearCarta(a, pareja, { abreEl: '2036-11-14', texto: 'Hola' }, HOY, AHORA), { ok: false, error: 'La fecha no puede pasar de 10 años.' });
  igual((await crearCarta(a, pareja, { abreEl: '2036-11-13', texto: 'Hola' }, HOY, AHORA)).ok, true);
  igual((await crearCarta(a, pareja, { abreEl: '2026-12-01', texto: '  ' }, HOY, AHORA)).ok, false);
  igual((await crearCarta(a, pareja, { abreEl: '2026-12-01', texto: 'x'.repeat(2001) }, HOY, AHORA)).ok, false);
  igual((await listarCartas(a, pareja)).length, 1);
});

prueba('capsula datos: rechaza la carta 51', async () => {
  const { a, pareja } = await dosCelulares();
  for (let i = 0; i < 50; i++) {
    const r = await crearCarta(a, pareja, { abreEl: '2026-12-01', texto: `Carta ${i}` }, HOY, AHORA + i);
    verdadero(r.ok, `carta ${i}`);
  }
  const r = await crearCarta(a, pareja, { abreEl: '2026-12-01', texto: 'Una más' }, HOY, AHORA);
  igual(r, { ok: false, error: 'Ya tienen 50 cartas. Borren alguna para escribir otra.' });
  igual((await listarCartas(a, pareja)).length, 50);
});

prueba('capsula datos: listarCartas da solo metadatos y el otro celular los ve', async () => {
  const { a, b, pareja } = await dosCelulares();
  const { id } = await crearCarta(a, pareja, { abreEl: '2026-12-25', texto: 'Secreto' }, HOY, AHORA);
  const lista = await listarCartas(b, { ...pareja, lugar: 'b' });
  igual(lista, [{ id, de: 'a', abreEl: '2026-12-25', abreMs: new Date(2026, 11, 25).getTime(), creadaMs: AHORA }]);
  verdadero(!JSON.stringify(lista).includes('Secreto'));
});

prueba('capsula datos: borrarCarta borra texto y metadatos', async () => {
  const { a, codigo, pareja } = await dosCelulares();
  const { id } = await crearCarta(a, pareja, { abreEl: '2026-12-25', texto: 'Hola' }, HOY, AHORA);
  await borrarCarta(a, pareja, id);
  igual(await a.leer(`parejas/${codigo}/capsulas/${id}`), null);
  igual(await a.leer(`parejas/${codigo}/capsulas/${id}/contenido/texto`), null);
  igual(await listarCartas(a, pareja), []);
});

prueba('capsula datos: leerTexto propaga el error de permiso', async () => {
  const nube = { leer: async () => { throw Object.assign(new Error('x'), { code: 'permission-denied' }); } };
  let msg = null;
  try { await leerTexto(nube, { codigo: 'K7PQ2M', lugar: 'b' }, 'c-abcd'); } catch (e) { msg = e.code; }
  igual(msg, 'permission-denied');
});

prueba('capsula datos: la copia lleva solo metadatos y va atada al código', async () => {
  const { a, almA, codigo, pareja } = await dosCelulares();
  igual(leerCopia(almA, codigo), null);
  await crearCarta(a, pareja, { abreEl: '2026-12-25', texto: 'Secreto' }, HOY, AHORA);
  const cartas = await refrescarCopia(a, pareja, almA);
  igual(cartas.length, 1);
  igual(leerCopia(almA, codigo), cartas);
  igual(almA.leer(CLAVE_COPIA).codigo, codigo);
  verdadero(!JSON.stringify(almA.leer(CLAVE_COPIA)).includes('Secreto'));
  igual(leerCopia(almA, 'ZZZZZZ'), null);
  igual(leerCopia(almA), null);
  almA.escribir(CLAVE_COPIA, { codigo, cartas: 'no' });
  igual(leerCopia(almA, codigo), null);
  guardarCopia(almA, [], codigo);
  igual(leerCopia(almA, codigo), []);
});

prueba('capsula datos: borrarTodo no deja cartas ni textos', async () => {
  const { a, almA, codigo, pareja } = await dosCelulares();
  const r1 = await crearCarta(a, pareja, { abreEl: '2026-12-25', texto: 'Uno' }, HOY, AHORA);
  const r2 = await crearCarta(a, pareja, { abreEl: '2027-01-25', texto: 'Dos' }, HOY, AHORA + 1);
  await borrarTodo(a, almA, { cargarIdsTarjetas: async () => [] });
  for (const id of [r1.id, r2.id]) {
    igual(await a.leer(`parejas/${codigo}/capsulas/${id}`), null);
    igual(await a.leer(`parejas/${codigo}/capsulas/${id}/contenido/texto`), null);
  }
});

prueba('capsula datos: okupa:capsulas no viaja en la copia de seguridad', () => {
  const alm = almacenEnMemoria();
  guardarCopia(alm, [{ id: 'c-abcd', de: 'a', abreEl: '2026-12-25', abreMs: 1, creadaMs: 1 }], 'K7PQ2M');
  alm.escribir('okupa:preguntas:vistas', { x: 1 });
  const datos = exportarRespaldo(alm).datos;
  verdadero(!('okupa:capsulas' in datos), Object.keys(datos).join());
  verdadero('okupa:preguntas:vistas' in datos);
});
