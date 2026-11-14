import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearPareja, unirse } from '../js/nucleo/pareja.js';
import { exportarRespaldo } from '../js/nucleo/almacen.js';
import {
  MAX_OTRAS, CLAVE_COPIA, validarFecha, listarFechas, guardarFecha, borrarFecha, hoyLocal,
  guardarCopia, leerCopia, refrescarCopia,
} from '../js/modulos/fechas/datos.js';

const HOY = '2026-11-13';

async function dosCelulares() {
  const mundo = crearMundoFalso();
  const almA = almacenEnMemoria();
  const almB = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), almA, { nombre: 'Carlos' });
  await unirse(mundo.nube('u2'), almB, { codigo, nombre: 'Yuli' });
  return { mundo, codigo, almA, almB, a: mundo.nube('u1'), b: mundo.nube('u2'), pareja: { codigo, lugar: 'a' } };
}

prueba('fechas datos: constantes y hoyLocal usa la fecha local', () => {
  igual(MAX_OTRAS, 30);
  igual(CLAVE_COPIA, 'okupa:fechas');
  igual(hoyLocal(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

prueba('fechas datos: guardarFecha crea inicio con id fijo y otra con f-', async () => {
  const { a, codigo, pareja } = await dosCelulares();
  const r1 = await guardarFecha(a, pareja, { tipo: 'inicio', fecha: '2024-02-14' }, HOY);
  igual(r1, { ok: true, id: 'inicio' });
  const doc = await a.leer(`parejas/${codigo}/fechas/inicio`);
  igual(Object.keys(doc).sort(), ['actualizadaMs', 'fecha', 'tipo']);
  const r2 = await guardarFecha(a, pareja, { tipo: 'cumple', de: 'b', fecha: '1995-03-10' }, HOY);
  igual(r2, { ok: true, id: 'cumple_b' });
  igual(Object.keys(await a.leer(`parejas/${codigo}/fechas/cumple_b`)).sort(), ['actualizadaMs', 'de', 'fecha', 'tipo']);
  const r3 = await guardarFecha(a, pareja, { tipo: 'otra', nombre: 'Primer viaje', fecha: '2025-06-01' }, HOY);
  verdadero(r3.ok && /^f-[a-z0-9]{4,30}$/.test(r3.id), JSON.stringify(r3));
  igual(Object.keys(await a.leer(`parejas/${codigo}/fechas/${r3.id}`)).sort(), ['actualizadaMs', 'fecha', 'nombre', 'tipo']);
  const lista = await listarFechas(a, pareja);
  igual(lista.map((f) => f.id).sort(), ['cumple_b', 'inicio', r3.id].sort());
  igual(lista.find((f) => f.id === 'inicio'), { id: 'inicio', tipo: 'inicio', fecha: '2024-02-14' });
});

prueba('fechas datos: guardarFecha con id existente de otra la edita', async () => {
  const { a, pareja } = await dosCelulares();
  const { id } = await guardarFecha(a, pareja, { tipo: 'otra', nombre: 'Viaje', fecha: '2025-06-01' }, HOY);
  igual(await guardarFecha(a, pareja, { id, tipo: 'otra', nombre: 'Viaje largo', fecha: '2025-06-02' }, HOY), { ok: true, id });
  const lista = await listarFechas(a, pareja);
  igual(lista.length, 1);
  igual(lista[0].nombre, 'Viaje largo');
});

prueba('fechas datos: guardarFecha rechaza inicio futuro, nombre vacío y la otra número 31', async () => {
  const { a, pareja } = await dosCelulares();
  igual(await guardarFecha(a, pareja, { tipo: 'inicio', fecha: '2026-11-14' }, HOY), { ok: false, error: 'La fecha de inicio no puede ser futura.' });
  igual(await guardarFecha(a, pareja, { tipo: 'otra', nombre: '   ', fecha: '2025-01-01' }, HOY), { ok: false, error: 'Escribe un nombre de 1 a 40 letras.' });
  igual(await guardarFecha(a, pareja, { tipo: 'otra', nombre: 'x'.repeat(41), fecha: '2025-01-01' }, HOY), { ok: false, error: 'Escribe un nombre de 1 a 40 letras.' });
  igual((await guardarFecha(a, pareja, { tipo: 'inicio', fecha: '2026-11-13' }, HOY)).ok, true);
  for (let i = 0; i < MAX_OTRAS; i++) {
    const r = await guardarFecha(a, pareja, { tipo: 'otra', nombre: `Fecha ${i}`, fecha: '2025-01-01' }, HOY);
    verdadero(r.ok, `otra ${i}`);
  }
  const r = await guardarFecha(a, pareja, { tipo: 'otra', nombre: 'Una más', fecha: '2025-01-01' }, HOY);
  igual(r, { ok: false, error: 'Ya tienen 30 fechas propias. Borren alguna para agregar otra.' });
  igual((await listarFechas(a, pareja)).length, 31);
});

prueba('fechas datos: validarFecha revisa formato y tipo', () => {
  igual(validarFecha({ tipo: 'inicio', fecha: '2026-13-01' }, HOY), 'Escoge una fecha válida.');
  igual(validarFecha({ tipo: 'inicio', fecha: '' }, HOY), 'Escoge una fecha válida.');
  igual(validarFecha({ tipo: 'cumple', de: 'c', fecha: '1995-03-10' }, HOY), 'Escoge de quién es el cumpleaños.');
  igual(validarFecha({ tipo: 'cumple', de: 'a', fecha: '1995-03-10' }, HOY), null);
  igual(validarFecha({ tipo: 'otra', nombre: 'Aniversario', fecha: '2020-02-29' }, HOY), null);
  igual(validarFecha({ tipo: 'raro', fecha: '2020-02-28' }, HOY), 'Tipo de fecha desconocido.');
});

prueba('fechas datos: borrarFecha borra', async () => {
  const { a, codigo, pareja } = await dosCelulares();
  await guardarFecha(a, pareja, { tipo: 'inicio', fecha: '2024-02-14' }, HOY);
  await borrarFecha(a, pareja, 'inicio');
  igual(await a.leer(`parejas/${codigo}/fechas/inicio`), null);
  igual(await listarFechas(a, pareja), []);
});

prueba('fechas datos: el otro celular ve lo que guardó el primero', async () => {
  const { a, b, pareja } = await dosCelulares();
  await guardarFecha(a, pareja, { tipo: 'inicio', fecha: '2024-02-14' }, HOY);
  igual(await listarFechas(b, { ...pareja, lugar: 'b' }), [{ id: 'inicio', tipo: 'inicio', fecha: '2024-02-14' }]);
});

prueba('fechas datos: refrescarCopia deja copia con fechas y nombres', async () => {
  const { a, almA, pareja } = await dosCelulares();
  igual(leerCopia(almA), null);
  await guardarFecha(a, pareja, { tipo: 'inicio', fecha: '2024-02-14' }, HOY);
  const fechas = await refrescarCopia(a, pareja, almA);
  igual(fechas.length, 1);
  const copia = leerCopia(almA);
  igual(copia.fechas, fechas);
  igual(copia.nombres, { a: 'Carlos', b: 'Yuli' });
  igual(almA.leer(CLAVE_COPIA).nombres.a, 'Carlos');
});

prueba('fechas datos: leerCopia con datos dañados da null', () => {
  const alm = almacenEnMemoria();
  alm.escribir(CLAVE_COPIA, { fechas: 'no' });
  igual(leerCopia(alm), null);
  guardarCopia(alm, [], { a: null, b: null });
  igual(leerCopia(alm), { fechas: [], nombres: { a: null, b: null } });
});

prueba('fechas datos: okupa:fechas no viaja en la copia de seguridad', () => {
  const alm = almacenEnMemoria();
  guardarCopia(alm, [{ id: 'inicio', tipo: 'inicio', fecha: '2024-02-14' }], { a: 'C', b: 'Y' });
  alm.escribir('okupa:preguntas:vistas', { x: 1 });
  const datos = exportarRespaldo(alm).datos;
  verdadero(!('okupa:fechas' in datos), Object.keys(datos).join());
  verdadero('okupa:preguntas:vistas' in datos);
});