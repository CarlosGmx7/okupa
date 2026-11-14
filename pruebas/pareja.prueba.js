import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { crearAlmacen } from '../js/nucleo/almacen.js';
import { ErrorNube } from '../js/nucleo/nube.js';
import {
  ALFABETO, generarCodigo, formatearCodigo, normalizarCodigo, limpiarNombre, miPareja,
  crearPareja, unirse, lugaresDe, reclamar, vigilarLugar, cambiarNombre, salir, borrarTodo, ErrorPareja,
} from '../js/nucleo/pareja.js';

export function almacenEnMemoria() {
  const m = new Map();
  return crearAlmacen({
    getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; },
  });
}

const microtareas = () => new Promise((r) => setTimeout(r, 0));
const REGEX = /^[A-HJKMNP-Z2-9]{6}$/;

async function rechaza(promesa, codigo) {
  try { await promesa; } catch (e) {
    verdadero(e.codigo === codigo, `se esperaba "${codigo}" y llegó "${e.codigo}" (${e.message})`);
    return e;
  }
  throw new Error(`se esperaba el error "${codigo}"`);
}

// Pareja de Carlos (u1, lugar a) y Sofi (u2, lugar b).
async function parejaCompleta(mundo = crearMundoFalso()) {
  const alm1 = almacenEnMemoria();
  const alm2 = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), alm1, { nombre: 'Carlos' });
  await unirse(mundo.nube('u2'), alm2, { codigo, nombre: 'Sofi' });
  return { mundo, codigo, alm1, alm2 };
}

prueba('pareja: generarCodigo usa solo el alfabeto y mide 6', () => {
  igual(ALFABETO.length, 31);
  for (let i = 0; i < 1000; i++) {
    const c = generarCodigo();
    verdadero(REGEX.test(c), c);
  }
});

prueba('pareja: normalizarCodigo acepta minúsculas, espacios y guion; rechaza ambiguos', () => {
  igual(normalizarCodigo(' k7p-q2m '), 'K7PQ2M');
  for (const malo of ['K7PQ2', 'K7PQ2MM', 'O7PQ2M', 'I7PQ2M', '17PQ2M', 'L7PQ2M', '', null]) {
    igual(normalizarCodigo(malo), null, String(malo));
  }
});

prueba('pareja: normalizarCodigo saca el código del mensaje compartido', () => {
  igual(normalizarCodigo('Únete a nuestra pareja en Okupa con el código K7P-Q2M'), 'K7PQ2M');
  igual(normalizarCodigo('K7P - Q2M'), 'K7PQ2M');
  igual(normalizarCodigo('el código es O7P-Q2M'), null);
});

prueba('pareja: una escucha vacía sin conexión no borra la pareja', async () => {
  const { mundo, alm1, codigo } = await parejaCompleta();
  const motivos = [];
  vigilarLugar(mundo.nube('u1'), alm1, (m) => motivos.push(m));
  await microtareas();
  mundo.desconectar({ escuchasVacias: true }); // Firestore sin red avisa "no existe" desde su caché
  await microtareas();
  await microtareas();
  igual(motivos, []);
  igual(miPareja(alm1), { codigo, lugar: 'a' });
});

prueba('pareja: formatearCodigo', () => {
  igual(formatearCodigo('K7PQ2M'), 'K7P-Q2M');
});

prueba('pareja: limpiarNombre recorta y limita a 30', () => {
  igual(limpiarNombre('  Carlos '), 'Carlos');
  igual(limpiarNombre('   '), null);
  igual(limpiarNombre('x'.repeat(31)), null);
  igual(limpiarNombre('x'.repeat(30)), 'x'.repeat(30));
});

prueba('pareja: crear y unirse enlaza a los dos con sus nombres', async () => {
  const mundo = crearMundoFalso();
  const alm1 = almacenEnMemoria();
  const alm2 = almacenEnMemoria();
  const creada = await crearPareja(mundo.nube('u1'), alm1, { nombre: '  Carlos ' });
  verdadero(REGEX.test(creada.codigo), creada.codigo);
  igual(creada.lugar, 'a');
  const unida = await unirse(mundo.nube('u2'), alm2, { codigo: formatearCodigo(creada.codigo).toLowerCase(), nombre: 'Sofi' });
  igual(unida, { codigo: creada.codigo, lugar: 'b' });
  const doc = await mundo.nube('u1').leer(`parejas/${creada.codigo}`);
  igual([doc.lugares, doc.nombres], [{ a: 'u1', b: 'u2' }, { a: 'Carlos', b: 'Sofi' }]);
  igual(miPareja(alm1), { codigo: creada.codigo, lugar: 'a' });
  igual(miPareja(alm2), { codigo: creada.codigo, lugar: 'b' });
});

prueba('pareja: crear reintenta si el código ya existe', async () => {
  const mundo = crearMundoFalso();
  await mundo.nube('u9').escribir('parejas/AAAAAA', { lugares: { a: 'u9', b: null }, nombres: { a: 'X', b: null } });
  let llamadas = 0;
  const rnd = () => (llamadas++ < 6 ? 0 : 0.99); // primero AAAAAA, luego 999999
  const { codigo } = await crearPareja(mundo.nube('u1'), almacenEnMemoria(), { nombre: 'Carlos', rnd });
  igual(codigo, '999999');
  igual((await mundo.nube('u1').leer('parejas/AAAAAA')).nombres.a, 'X', 'no pisó la otra pareja');
});

prueba('pareja: crear con nombre inválido da error nombre', async () => {
  await rechaza(crearPareja(crearMundoFalso().nube('u1'), almacenEnMemoria(), { nombre: '  ' }), 'nombre');
});

prueba('pareja: unirse con código inexistente o mal escrito da no-existe', async () => {
  const { mundo } = await parejaCompleta();
  await rechaza(unirse(mundo.nube('u3'), almacenEnMemoria(), { codigo: '222222', nombre: 'X' }), 'no-existe');
  await rechaza(unirse(mundo.nube('u3'), almacenEnMemoria(), { codigo: 'OOO-OOO', nombre: 'X' }), 'no-existe');
});

prueba('pareja: tercer celular recibe llena y puede reclamar', async () => {
  const { mundo, codigo } = await parejaCompleta();
  const alm3 = almacenEnMemoria();
  await rechaza(unirse(mundo.nube('u3'), alm3, { codigo, nombre: 'Intruso' }), 'llena');
  igual(await lugaresDe(mundo.nube('u3'), codigo), { nombres: { a: 'Carlos', b: 'Sofi' }, ocupados: { a: true, b: true } });
  igual(await reclamar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' }), { codigo, lugar: 'a' });
  const doc = await mundo.nube('u3').leer(`parejas/${codigo}`);
  igual([doc.lugares, doc.nombres.a], [{ a: 'u3', b: 'u2' }, 'Carlos']);
  igual(miPareja(alm3), { codigo, lugar: 'a' });
});

prueba('pareja: dos uniéndose a la vez, solo uno entra', async () => {
  const mundo = crearMundoFalso();
  const { codigo } = await crearPareja(mundo.nube('u1'), almacenEnMemoria(), { nombre: 'Carlos' });
  const resultados = await Promise.allSettled([
    unirse(mundo.nube('u2'), almacenEnMemoria(), { codigo, nombre: 'Sofi' }),
    unirse(mundo.nube('u3'), almacenEnMemoria(), { codigo, nombre: 'Otra' }),
  ]);
  igual(resultados.filter((r) => r.status === 'fulfilled').length, 1);
  igual(resultados.filter((r) => r.status === 'rejected').map((r) => r.reason.codigo), ['llena']);
});

prueba('pareja: el celular reclamado se entera y olvida la pareja', async () => {
  const { mundo, codigo, alm1 } = await parejaCompleta();
  const motivos = [];
  vigilarLugar(mundo.nube('u1'), alm1, (m) => motivos.push(m));
  await microtareas();
  await reclamar(mundo.nube('u3'), almacenEnMemoria(), { codigo, lugar: 'a' });
  await microtareas();
  igual(motivos, ['reclamado']);
  igual(miPareja(alm1), null);
});

prueba('pareja: si el otro borra todo, el celular se entera', async () => {
  const { mundo, alm1, alm2 } = await parejaCompleta();
  const motivos = [];
  vigilarLugar(mundo.nube('u2'), alm2, (m) => motivos.push(m));
  await microtareas();
  await borrarTodo(mundo.nube('u1'), alm1, { cargarIdsTarjetas: async () => [] });
  await microtareas();
  igual(motivos, ['borrada']);
  igual(miPareja(alm2), null);
});

prueba('pareja: unirse otra vez con el mismo celular no cambia nada', async () => {
  const { mundo, codigo, alm2 } = await parejaCompleta();
  igual(await unirse(mundo.nube('u2'), alm2, { codigo, nombre: 'Otro nombre' }), { codigo, lugar: 'b' });
  igual((await mundo.nube('u2').leer(`parejas/${codigo}`)).nombres.b, 'Sofi');
});

prueba('pareja: cambiarNombre valida y guarda', async () => {
  const { mundo, codigo, alm2 } = await parejaCompleta();
  await cambiarNombre(mundo.nube('u2'), alm2, '  Sofía ');
  igual((await mundo.nube('u2').leer(`parejas/${codigo}`)).nombres, { a: 'Carlos', b: 'Sofía' });
  await rechaza(cambiarNombre(mundo.nube('u2'), alm2, ''), 'nombre');
  await rechaza(cambiarNombre(mundo.nube('u2'), alm2, 'x'.repeat(31)), 'nombre');
  await rechaza(cambiarNombre(mundo.nube('u2'), almacenEnMemoria(), 'Sofi'), 'sin-pareja');
});

prueba('pareja: salir olvida la pareja solo en este celular', async () => {
  const { mundo, codigo, alm1 } = await parejaCompleta();
  salir(alm1);
  igual(miPareja(alm1), null);
  verdadero(await mundo.nube('u1').leer(`parejas/${codigo}`), 'la pareja sigue en la nube');
});

prueba('pareja: borrarTodo deja la nube sin nada de la pareja', async () => {
  const { mundo, codigo, alm1 } = await parejaCompleta();
  const nube = mundo.nube('u1');
  const rutas = ['perfiles/a', 'partidas/p1', 'estado/uso', 'dias/2026-11-04', 'dias/2026-11-04/respuestas/gustos_a', 'fechas/inicio']
    .map((r) => `parejas/${codigo}/${r}`);
  for (const r of rutas) await nube.escribir(r, { x: 1 });
  await borrarTodo(nube, alm1, { cargarIdsTarjetas: async () => [] });
  for (const r of [...rutas, `parejas/${codigo}`]) igual(await nube.leer(r), null, r);
  igual(miPareja(alm1), null);
});

prueba('pareja: borrarTodo también borra lugares con fotos, Match y votos del otro', async () => {
  const { mundo, codigo, alm1 } = await parejaCompleta();
  const nube = mundo.nube('u1');
  const rutas = [
    'lugares/L1', 'lugares/L1/fotos/f1', 'lugares/L1/versiones/a', 'lugares/L1/versiones/b',
    'match_privado/a', 'match_privado/b', 'match_si/mat-001_a', 'match_si/mat-002_b', 'match_si/n-abc_b',
    'match_matches/mat-001', 'match_tarjetas/n-abc',
  ].map((r) => `parejas/${codigo}/${r}`);
  for (const r of rutas) await nube.escribir(r, { x: 1 });
  // El voto mat-002_b solo se encuentra probando las tarjetas del mazo (el del otro no se lee).
  await borrarTodo(nube, alm1, { cargarIdsTarjetas: async () => ['mat-001', 'mat-002'] });
  for (const r of [...rutas, `parejas/${codigo}`]) igual(await nube.leer(r), null, r);
});

prueba('pareja: sin conexión se propaga sin-conexion', async () => {
  const mundo = crearMundoFalso();
  mundo.desconectar();
  const e = await rechaza(crearPareja(mundo.nube('u1'), almacenEnMemoria(), { nombre: 'Carlos' }), 'sin-conexion');
  verdadero(e instanceof ErrorNube);
  verdadero(!(e instanceof ErrorPareja));
});
