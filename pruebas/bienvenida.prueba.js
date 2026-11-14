import { prueba, igual, verdadero } from './corredor.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearMundoFalso } from './nube-falsa.js';
import {
  debeMostrarBienvenida, desviarABienvenida, marcarBienvenida, pantallaBienvenida,
} from '../js/nucleo/bienvenida.js';

const boton = (div, texto) => [...div.querySelectorAll('button, a')].find((b) => b.textContent.trim() === texto);
const enlazar = (almacen) => almacen.escribir('okupa:pareja:actual', { codigo: 'ABCDEF', lugar: 'a' });

function montar({ almacen = almacenEnMemoria(), paso, notificaciones = null, mundo = crearMundoFalso() } = {}) {
  const div = document.createElement('div');
  const rutas = [];
  const ctx = {
    almacen, notificaciones, modulos: [],
    ir: (r) => rutas.push(r),
    refrescar() {},
    nube: async () => { const n = mundo.nube('u1'); await n.iniciar(); return n; },
    soporte: () => 'ok',
  };
  const pintando = pantallaBienvenida(div, paso ? { paso } : {}, ctx);
  return { div, ctx, almacen, rutas, pintando };
}

prueba('bienvenida: sale solo a quien empieza de cero', () => {
  const a = almacenEnMemoria();
  igual(debeMostrarBienvenida(a), true);
  marcarBienvenida(a, new Date('2026-11-13T12:00:00Z'));
  igual(a.leer('okupa:bienvenida'), '2026-11-13T12:00:00.000Z');
  igual(debeMostrarBienvenida(a), false);
  const conPareja = almacenEnMemoria();
  enlazar(conPareja);
  igual(debeMostrarBienvenida(conPareja), false);
  const conPreguntas = almacenEnMemoria();
  conPreguntas.escribir('okupa:preguntas:vistas', ['p1']);
  igual(debeMostrarBienvenida(conPreguntas), false);
});

prueba('bienvenida: solo desvía al abrir el inicio', () => {
  const a = almacenEnMemoria();
  igual(['', '#', '#/'].map((h) => desviarABienvenida(h, a)), [true, true, true]);
  igual(desviarABienvenida('#/trivia/sala', a), false);
  marcarBienvenida(a);
  igual(desviarABienvenida('#/', a), false);
});

prueba('bienvenida: el primer paso explica y enlaza a la política', () => {
  const { div, rutas } = montar();
  verdadero(div.querySelector('a[href="#/privacidad"]'), 'falta la política');
  igual(div.querySelector('[aria-label="Paso 1 de 4"]') !== null, true);
  boton(div, 'Empezar').click();
  igual(rutas, ['bienvenida/enlace']);
});

prueba('bienvenida: Saltar guarda la marca y va al inicio', () => {
  const { div, almacen, rutas } = montar();
  boton(div, 'Saltar').click();
  verdadero(almacen.leer('okupa:bienvenida', null), 'falta la marca');
  igual(rutas, ['']);
});

prueba('bienvenida: el paso de enlace ofrece crear pareja y dejarlo para después', async () => {
  const { div, rutas, pintando } = montar({ paso: 'enlace' });
  await pintando;
  verdadero(boton(div, 'Crear pareja'), div.textContent);
  verdadero(boton(div, 'Tengo un código'));
  boton(div, 'Lo hago después').click();
  igual(rutas, ['bienvenida/avisos']);
});

prueba('bienvenida: sin pareja el paso de avisos pasa a Listo', async () => {
  const { div, pintando } = montar({ paso: 'avisos', notificaciones: { activar: async () => ({ ok: true }) } });
  await pintando;
  verdadero(div.textContent.includes('¡Listo!'), div.textContent);
  igual(boton(div, 'Activar avisos'), undefined);
});

prueba('bienvenida: con pareja activa los avisos y sigue', async () => {
  const almacen = almacenEnMemoria();
  enlazar(almacen);
  let activados = 0;
  const { div, rutas, pintando } = montar({ almacen, paso: 'avisos', notificaciones: { activar: async () => { activados++; return { ok: true }; } } });
  await pintando;
  boton(div, 'Activar avisos').click();
  await new Promise((r) => setTimeout(r, 20));
  igual([activados, rutas], [1, ['bienvenida/listo']]);
});

prueba('bienvenida: si no se pueden activar los avisos lo dice y deja seguir', async () => {
  const almacen = almacenEnMemoria();
  enlazar(almacen);
  const { div, pintando } = montar({ almacen, paso: 'avisos', notificaciones: { activar: async () => ({ ok: false, motivo: 'sin-permiso' }) } });
  await pintando;
  boton(div, 'Activar avisos').click();
  await new Promise((r) => setTimeout(r, 20));
  verdadero(div.textContent.includes('No diste permiso'), div.textContent);
  verdadero(boton(div, 'Ahora no'));
});

prueba('bienvenida: Listo guarda la marca y va al inicio', () => {
  const { div, almacen, rutas } = montar({ paso: 'listo' });
  igual(boton(div, 'Saltar'), undefined);
  boton(div, 'Ir al inicio').click();
  verdadero(almacen.leer('okupa:bienvenida', null));
  igual(rutas, ['']);
});
