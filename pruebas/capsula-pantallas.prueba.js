import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearPareja, unirse as unirsePareja } from '../js/nucleo/pareja.js';
import { crearPantallasCapsula, detalleInicio } from '../js/modulos/capsula/pantallas.js';
import { crearCarta, listarCartas, leerCopia, guardarCopia } from '../js/modulos/capsula/datos.js';
import { guardarCopia as guardarCopiaFechas } from '../js/modulos/fechas/datos.js';
import capsula from '../js/modulos/capsula/modulo.js';
import { resolverRuta } from '../js/nucleo/rutas.js';
import { hasta, boton, salir } from './diario-pantallas.prueba.js';

const HOY = '2026-11-13';
const textoDe = (div) => div.textContent.replace(/\s+/g, ' ');

// Dos celulares: Carlos (a, u1) y Yuli (b, u2).
async function dosCelulares() {
  const mundo = crearMundoFalso();
  const almA = almacenEnMemoria();
  const almB = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), almA, { nombre: 'Carlos' });
  await unirsePareja(mundo.nube('u2'), almB, { codigo, nombre: 'Yuli' });
  const pantallas = crearPantallasCapsula({ hoy: () => HOY });
  const celular = (uid, almacen, lugar) => {
    const nube = mundo.nube(uid);
    const lecturas = [];
    const envuelta = new Proxy(nube, {
      get: (t, k) => (k === 'leer' ? (ruta, ...r) => { lecturas.push(ruta); return t.leer(ruta, ...r); } : t[k]),
    });
    const rutas = [];
    return {
      ctx: { almacen, nube: async () => envuelta, ir: (r) => rutas.push(r), refrescar: () => {} },
      rutas, lecturas, nube, almacen, pareja: { codigo, lugar },
    };
  };
  return { a: celular('u1', almA, 'a'), b: celular('u2', almB, 'b'), pantallas, codigo };
}

async function conConfirm(respuesta, fn) {
  const original = window.confirm;
  const preguntas = [];
  window.confirm = (q) => { preguntas.push(q); return respuesta; };
  try { await fn(); } finally { window.confirm = original; }
  return preguntas;
}

prueba('capsula: lista vacía', async () => {
  const { a, pantallas } = await dosCelulares();
  const div = document.createElement('div');
  await pantallas.lista(div, {}, a.ctx);
  await hasta(() => textoDe(div).includes('Todavía no hay cartas.'));
  const t = textoDe(div);
  verdadero(t.includes('Cápsula del tiempo'), t);
  verdadero(!t.includes('null'), t);
  verdadero(div.querySelector('a[href="#/capsula/nueva"]')?.textContent.includes('Escribir una carta'));
  salir();
});

prueba('capsula: carta cerrada del otro no muestra texto ni null y no pide el texto', async () => {
  const { a, b, pantallas } = await dosCelulares();
  const r = await crearCarta(a.nube, a.pareja, { abreEl: '2026-11-14', texto: 'Secreto de amor' }, HOY);
  verdadero(r.ok);
  const lista = document.createElement('div');
  await pantallas.lista(lista, {}, b.ctx);
  await hasta(() => textoDe(lista).includes('Carta de Carlos'));
  let t = textoDe(lista);
  verdadero(t.includes('Para ti') && t.includes('mañana'), t);
  verdadero(t.includes('se abre el 14 de noviembre de 2026'), t);
  verdadero(!t.includes('Abrir carta') && !t.includes('Secreto') && !t.includes('null'), t);
  const ver = document.createElement('div');
  await pantallas.ver(ver, { id: r.id }, b.ctx);
  await hasta(() => textoDe(ver).includes('Esta carta se abre el 14 de noviembre de 2026.'));
  t = textoDe(ver);
  verdadero(!t.includes('Secreto') && !t.includes('null'), t);
  igual(b.lecturas.filter((x) => x.includes('contenido')), [], 'no debe pedir el texto de una carta cerrada');
  salir();
});

prueba('capsula: carta abierta se lee y el autor relee la suya', async () => {
  const { a, b, pantallas } = await dosCelulares();
  const r = await crearCarta(a.nube, a.pareja, { abreEl: '2026-11-20', texto: 'Hola\n\nTe quiero' }, '2026-11-01');
  verdadero(r.ok);
  const pasada = crearPantallasCapsula({ hoy: () => '2026-11-20' });
  const lista = document.createElement('div');
  await pasada.lista(lista, {}, b.ctx);
  await hasta(() => lista.querySelector(`a[href="#/capsula/${r.id}"]`));
  verdadero(textoDe(lista).includes('Abrir carta'), textoDe(lista));
  const ver = document.createElement('div');
  await pasada.ver(ver, { id: r.id }, b.ctx);
  await hasta(() => textoDe(ver).includes('Te quiero'));
  verdadero(textoDe(ver).includes('De Carlos · 20 de noviembre de 2026'), textoDe(ver));
  verdadero(ver.querySelectorAll('p').length >= 2);
  // La del autor, aunque aún no abra.
  const futura = await crearCarta(a.nube, a.pareja, { abreEl: '2026-12-25', texto: 'Para Navidad' }, HOY);
  const propia = document.createElement('div');
  await pantallas.ver(propia, { id: futura.id }, a.ctx);
  await hasta(() => textoDe(propia).includes('Para Navidad'));
  verdadero(textoDe(propia).includes('De Carlos'), textoDe(propia));
  const lis = document.createElement('div');
  await pantallas.lista(lis, {}, a.ctx);
  await hasta(() => textoDe(lis).includes('Las que escribiste'));
  verdadero(textoDe(lis).includes('Para Yuli') && textoDe(lis).includes('se abre el 25 de diciembre de 2026'), textoDe(lis));
  verdadero(lis.querySelector(`a[href="#/capsula/${futura.id}"]`));
  salir();
});

prueba('capsula: error de permiso al leer una carta que aún no abre se muestra como cerrada', async () => {
  const { a, pantallas } = await dosCelulares();
  const r = await crearCarta(a.nube, a.pareja, { abreEl: '2026-12-25', texto: 'x' }, HOY);
  const sinPermiso = new Proxy(a.nube, {
    get: (t, k) => (k === 'leer' ? async (ruta) => {
      if (ruta.includes('contenido')) throw new Error('permission-denied');
      return t.leer(ruta);
    } : t[k]),
  });
  const ctx = { ...a.ctx, nube: async () => sinPermiso };
  const ver = document.createElement('div');
  await pantallas.ver(ver, { id: r.id }, ctx);
  await hasta(() => textoDe(ver).includes('Esta carta se abre el 25 de diciembre de 2026.'));
  verdadero(!textoDe(ver).includes('null'));
  salir();
});

prueba('capsula: carta sin texto llegó vacía', async () => {
  const { a, b, pantallas } = await dosCelulares();
  await a.nube.escribir(`parejas/${a.pareja.codigo}/capsulas/c-vacia1`, { de: 'a', abreEl: '2026-11-10', abreMs: 1, creadaMs: 1 });
  const ver = document.createElement('div');
  await pantallas.ver(ver, { id: 'c-vacia1' }, b.ctx);
  await hasta(() => textoDe(ver).includes('Esta carta llegó vacía.'));
  verdadero(!textoDe(ver).includes('null'));
  verdadero(boton(ver, 'Borrar carta'), 'la carta vacía se puede borrar');
  await conConfirm(true, async () => { boton(ver, 'Borrar carta').click(); await hasta(() => b.rutas.includes('capsula')); });
  igual((await listarCartas(a.nube, a.pareja)).length, 0);
  salir();
});

prueba('capsula: carta abierta con error de red no dice que está cerrada', async () => {
  const { a, b, pantallas } = await dosCelulares();
  const r = await crearCarta(a.nube, a.pareja, { abreEl: '2026-11-10', texto: 'x' }, '2026-11-01');
  const caida = new Proxy(b.nube, {
    get: (t, k) => (k === 'leer' ? async (ruta) => {
      if (ruta.includes('contenido')) throw new Error('red');
      return t.leer(ruta);
    } : t[k]),
  });
  const ver = document.createElement('div');
  await pantallas.ver(ver, { id: r.id }, { ...b.ctx, nube: async () => caida });
  await hasta(() => textoDe(ver).includes('No se pudo cargar la carta. Revisa la conexión.'));
  verdadero(!textoDe(ver).includes('se abre el'));
  salir();
});

prueba('capsula: carta abierta por fecha pero con permiso denegado dice a qué hora abre', async () => {
  const { a, b, pantallas } = await dosCelulares();
  const r = await crearCarta(a.nube, a.pareja, { abreEl: '2026-11-10', texto: 'x' }, '2026-11-01');
  const carta = (await listarCartas(a.nube, a.pareja)).find((c) => c.id === r.id);
  const hora = new Date(carta.abreMs).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  for (const falla of [{ codigo: 'permiso' }, { codigo: 'permiso-denegado' }, { code: 'permission-denied' }]) {
    const sinPermiso = new Proxy(b.nube, {
      get: (t, k) => (k === 'leer' ? async (ruta) => {
        if (ruta.includes('contenido')) throw Object.assign(new Error('denegado'), falla);
        return t.leer(ruta);
      } : t[k]),
    });
    const ver = document.createElement('div');
    await pantallas.ver(ver, { id: r.id }, { ...b.ctx, nube: async () => sinPermiso });
    await hasta(() => textoDe(ver).includes(`Esta carta se abre hoy a las ${hora}.`));
    verdadero(!textoDe(ver).includes('Revisa la conexión'), textoDe(ver));
  }
  salir();
});

prueba('capsula: escribir una carta desde la pantalla', async () => {
  const { a, pantallas } = await dosCelulares();
  const div = document.createElement('div');
  await pantallas.nueva(div, {}, a.ctx);
  await hasta(() => div.querySelector('input[type="date"]'));
  const fecha = div.querySelector('input[type="date"]');
  igual(fecha.min, '2026-11-14');
  igual(fecha.max, '2036-11-12');
  const area = div.querySelector('textarea');
  igual(area.getAttribute('maxlength'), '2000');
  verdadero(textoDe(div).includes('0 / 2.000'), textoDe(div));
  area.value = 'Hola mi amor';
  area.dispatchEvent(new Event('input'));
  verdadero(textoDe(div).includes('12 / 2.000'), textoDe(div));
  // Sin fecha: error y sin confirm.
  let preguntas = await conConfirm(true, async () => { boton(div, 'Sellar y enviar').click(); await hasta(() => div.querySelector('.aviso').textContent); });
  igual(preguntas, []);
  verdadero(div.querySelector('.aviso').textContent.includes('fecha'));
  fecha.value = '2026-12-25';
  preguntas = await conConfirm(false, async () => { boton(div, 'Sellar y enviar').click(); await new Promise((r) => setTimeout(r, 50)); });
  igual(preguntas, ['¿Sellar la carta? Ya no la podrás cambiar.']);
  igual((await listarCartas(a.nube, a.pareja)).length, 0);
  preguntas = await conConfirm(true, async () => { boton(div, 'Sellar y enviar').click(); await hasta(() => a.rutas.includes('capsula')); });
  const cartas = await listarCartas(a.nube, a.pareja);
  igual(cartas.length, 1);
  igual(cartas[0].abreEl, '2026-12-25');
  igual(leerCopia(a.almacen, a.pareja.codigo).length, 1, 'la copia se actualizó');
  salir();
});

prueba('capsula: atajos de fechas solo si existen', async () => {
  const { a, pantallas } = await dosCelulares();
  const sin = document.createElement('div');
  await pantallas.nueva(sin, {}, a.ctx);
  await hasta(() => sin.querySelector('input[type="date"]'));
  verdadero(!boton(sin, 'Próximo aniversario') && !boton(sin, 'Cumpleaños de Yuli'));
  guardarCopiaFechas(a.almacen, [
    { id: 'inicio', tipo: 'inicio', fecha: '2025-12-20' },
    { id: 'cumple_b', tipo: 'cumple', fecha: '1995-12-01', de: 'b' },
  ], { a: 'Carlos', b: 'Yuli' }, a.pareja.codigo);
  const div = document.createElement('div');
  await pantallas.nueva(div, {}, a.ctx);
  await hasta(() => boton(div, 'Próximo aniversario'));
  boton(div, 'Próximo aniversario').click();
  igual(div.querySelector('input[type="date"]').value, '2026-12-20');
  boton(div, 'Cumpleaños de Yuli').click();
  igual(div.querySelector('input[type="date"]').value, '2026-12-01');
  verdadero(!textoDe(div).includes('null'));
  salir();
});

prueba('capsula: borrar con confirm aceptado y cancelado', async () => {
  const { a, pantallas } = await dosCelulares();
  const r = await crearCarta(a.nube, a.pareja, { abreEl: '2026-12-25', texto: 'Adiós' }, HOY);
  const div = document.createElement('div');
  await pantallas.ver(div, { id: r.id }, a.ctx);
  await hasta(() => boton(div, 'Borrar carta'));
  let preguntas = await conConfirm(false, async () => { boton(div, 'Borrar carta').click(); await new Promise((x) => setTimeout(x, 50)); });
  igual(preguntas, ['¿Borrar esta carta para los dos?']);
  igual((await listarCartas(a.nube, a.pareja)).length, 1);
  preguntas = await conConfirm(true, async () => { boton(div, 'Borrar carta').click(); await hasta(() => a.rutas.includes('capsula')); });
  igual((await listarCartas(a.nube, a.pareja)).length, 0);
  igual(leerCopia(a.almacen, a.pareja.codigo).length, 0);
  salir();
});

prueba('capsula: detalle del inicio', () => {
  const alm = almacenEnMemoria();
  alm.escribir('okupa:pareja:actual', { codigo: 'K7PQ2M', lugar: 'a' });
  igual(detalleInicio(alm, HOY), 'Escríbanse una carta');
  guardarCopia(alm, [{ id: 'c-x1234', de: 'b', abreEl: '2026-11-15', abreMs: 1, creadaMs: 1 }], 'K7PQ2M');
  igual(detalleInicio(alm, HOY), 'Próxima carta en 2 días');
  igual(detalleInicio(almacenEnMemoria(), HOY), 'Escríbanse una carta');
});

prueba('capsula: módulo y rutas', async () => {
  igual(capsula.id, 'capsula');
  igual(capsula.accesoJuntos.ruta, 'capsula');
  igual(capsula.accesoJuntos.nombre, 'Cápsula');
  igual(capsula.accesoJuntos.icono, '✉');
  igual(resolverRuta('#/nueva', capsula.rutas).handler, capsula.rutas.nueva);
  const v = resolverRuta('#/c-abc123', capsula.rutas);
  igual(v.params.id, 'c-abc123');
  verdadero(v.handler === capsula.rutas[':id']);
  igual(resolverRuta('', capsula.rutas).handler, capsula.rutas['']);
  await capsula.precalentar({ almacen: null });
  await capsula.precalentar(undefined);
  await capsula.precalentar({ almacen: almacenEnMemoria(), nube: async () => { throw new Error('x'); } });
});
