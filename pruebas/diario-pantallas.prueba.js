import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearPareja, unirse as unirsePareja } from '../js/nucleo/pareja.js';
import { cargarDiario } from '../js/modulos/diario/contenido.js';
import { crearPantallasDiario } from '../js/modulos/diario/pantallas.js';
import { guardarPerfil, leerPerfiles, abrirDia, enviar } from '../js/modulos/diario/dia.js';
import { CLAVE_ESTADO } from '../js/modulos/diario/pantallas.js';
import { reflejar } from '../js/modulos/diario/revelar.js';
import { fechaBogota } from '../js/modulos/diario/contenido.js';
import { pantallaInicio } from '../js/nucleo/inicio.js';
import moduloDiario from '../js/modulos/diario/modulo.js';

export const FECHA = '2026-11-05';
const datosReales = await cargarDiario();

export const esperar = (ms = 0) => new Promise((r) => setTimeout(r, ms));
export async function hasta(cond, ms = 2000) {
  for (let t = 0; t < ms && !cond(); t += 20) await esperar(20);
  verdadero(cond(), 'no llegó a tiempo');
}
export const boton = (div, texto) => [...div.querySelectorAll('button')].find((b) => b.textContent.trim() === texto || b.textContent.includes(texto));
export const salir = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

// Pareja Carlos (a) y Sofi (b), cada una con sus pantallas del diario y su ctx.
export async function parejaDiario({ nombreB = 'Sofi', perfiles = false, datos = datosReales, hoy = FECHA } = {}) {
  const mundo = crearMundoFalso();
  const almA = almacenEnMemoria();
  const almB = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), almA, { nombre: 'Carlos' });
  await unirsePareja(mundo.nube('u2'), almB, { codigo, nombre: nombreB });
  const celular = (uid, almacen, lugar) => {
    const div = document.createElement('div');
    const rutas = [];
    const pantallas = crearPantallasDiario({ cargar: async () => datos, hoy: () => hoy });
    const ctx = { almacen, nube: async () => mundo.nube(uid), ir: (r) => rutas.push(r), refrescar: () => {} };
    return { div, ctx, rutas, pantallas, nube: mundo.nube(uid), pareja: { codigo, lugar } };
  };
  const p = { mundo, datos, a: celular('u1', almA, 'a'), b: celular('u2', almB, 'b') };
  if (perfiles) {
    await guardarPerfil(p.a.nube, p.a.pareja, { intensidad: 3 });
    await guardarPerfil(p.b.nube, p.b.pareja, { intensidad: 3 });
  }
  return p;
}

prueba('diario pantallas: sin perfil, Hoy lleva a llenarlo', async () => {
  const { a } = await parejaDiario();
  await a.pantallas.hoy(a.div, {}, a.ctx);
  await hasta(() => a.div.querySelector('a[href="#/diario/perfil"]'));
  verdadero(a.div.textContent.includes('Antes de empezar, cuéntanos de ti'), a.div.textContent);
  salir();
});

prueba('diario pantallas: guardar el perfil lo escribe y vuelve al diario', async () => {
  const { a } = await parejaDiario();
  await a.pantallas.perfil(a.div, {}, a.ctx);
  await hasta(() => boton(a.div, 'Guardar'));
  boton(a.div, 'Salsa').click();
  igual(boton(a.div, 'Salsa').getAttribute('aria-pressed'), 'true');
  const artista = a.div.querySelector('input[data-campo="artistas"]');
  artista.value = 'Canserbero';
  artista.dispatchEvent(new Event('input'));
  boton(a.div, 'Sin filtro').click();
  boton(a.div, 'Guardar').click();
  await hasta(() => a.rutas.length > 0);
  igual(a.rutas, ['diario']);
  const { a: mio } = await leerPerfiles(a.nube, a.pareja);
  igual([mio.inicial.generos, mio.inicial.artistas, mio.inicial.intensidad], [['salsa'], ['Canserbero'], 3]);
  salir();
});

prueba('diario pantallas: el perfil abre lleno con lo guardado', async () => {
  const { a } = await parejaDiario();
  await guardarPerfil(a.nube, a.pareja, { generos: ['rap'], cancion: 'Es épico', intensidad: 1 });
  await a.pantallas.perfil(a.div, {}, a.ctx);
  await hasta(() => boton(a.div, 'Guardar'));
  igual(boton(a.div, 'Rap / hip hop').getAttribute('aria-pressed'), 'true');
  igual(a.div.querySelector('input[data-campo="cancion"]').value, 'Es épico');
  igual(boton(a.div, 'Suaves').getAttribute('aria-pressed'), 'true');
  salir();
});

// ---------- Hoy, revelado y reto ----------
const valorInicial = (p) => (p.tipo === 'escala' ? { valor: 1 } : { opcion: 0 });
function itemsDe(datos, dia, { comentario = '' } = {}) {
  const porId = new Map(datos.preguntas.map((p) => [p.id, p]));
  return dia.gustos.map((id, i) => {
    const p = porId.get(id);
    const item = { ...valorInicial(p), comentario };
    if (i === dia.adivinar) item.adivina = p.tipo === 'escala' ? 1 : reflejar(p, 0); // adivina bien lo que dijo el otro
    return item;
  });
}
async function abrirHoy(cel) {
  await cel.pantallas.hoy(cel.div, {}, cel.ctx);
  await hasta(() => cel.div.querySelectorAll('.formulario-diario .carta-diario').length === 3);
}
function responderTodo(div) {
  for (const carta of div.querySelectorAll('.formulario-diario .carta-diario')) {
    carta.querySelector('.opciones-diario button, .puntos-escala button').click();
    carta.querySelector('.adivina button')?.click();
  }
}

prueba('diario pantallas: responder y esperar, sin ver nada del otro', async () => {
  const { a } = await parejaDiario({ perfiles: true });
  await abrirHoy(a);
  const enviarBtn = boton(a.div, 'Enviar');
  verdadero(enviarBtn.disabled, 'Enviar empieza deshabilitado');
  responderTodo(a.div);
  verdadero(!enviarBtn.disabled, 'con todo respondido se habilita');
  enviarBtn.click();
  await hasta(() => a.div.textContent.includes('Respondiste ✓') && a.div.textContent.includes('Esperando a Sofi'));
  igual(a.ctx.almacen.leer(CLAVE_ESTADO, null), { fecha: FECHA, texto: 'Esperando a Sofi' });
  salir();
});

prueba('diario pantallas: al responder los dos se revela con coincidencia y adivinanza', async () => {
  const { a, b, datos } = await parejaDiario({ perfiles: true });
  const dia = await abrirDia(b.nube, b.pareja, { fecha: FECHA, datos });
  await enviar(b.nube, b.pareja, FECHA, 'gustos', { items: itemsDe(datos, dia, { comentario: 'secreto-de-sofi' }) });
  await abrirHoy(a);
  verdadero(!a.div.textContent.includes('secreto-de-sofi'), 'no se ve el comentario del otro antes de responder');
  responderTodo(a.div);
  boton(a.div, 'Enviar').click();
  await hasta(() => a.div.querySelectorAll('.carta-diario.revelada').length === 3);
  verdadero(a.div.textContent.includes('secreto-de-sofi'), 'ahora sí');
  verdadero(a.div.textContent.includes('¡Coincidieron!'), a.div.textContent);
  verdadero(a.div.textContent.includes('Carlos creía') && /adivinó [✓✗]/.test(a.div.textContent), a.div.textContent);
  igual(a.ctx.almacen.leer(CLAVE_ESTADO, null).texto, 'Revelado ✓');
  salir();
});

prueba('diario pantallas: si el envío falla no se da por enviado', async () => {
  const { a, mundo } = await parejaDiario({ perfiles: true });
  await abrirHoy(a);
  responderTodo(a.div);
  mundo.desconectar();
  boton(a.div, 'Enviar').click();
  await hasta(() => a.div.textContent.includes('No se pudo enviar'));
  verdadero(!a.div.textContent.includes('Respondiste'), 'no dice que respondió');
  mundo.reconectar();
  boton(a.div, 'Enviar').click();
  await hasta(() => a.div.textContent.includes('Respondiste ✓'));
  salir();
});

prueba('diario pantallas: el reto de inglés marca ✓/✗ y revela el marcador', async () => {
  const { a, b } = await parejaDiario({ perfiles: true });
  await abrirHoy(a);
  await hasta(() => a.div.querySelectorAll('.reto-pregunta').length === 3);
  for (const pregunta of a.div.querySelectorAll('.reto-pregunta')) pregunta.querySelector('.opcion-reto').click();
  verdadero([...a.div.querySelectorAll('.reto-pregunta')].every((x) => x.textContent.includes('✓')), 'cada una muestra la correcta');
  await hasta(() => a.div.textContent.includes('Tu reto:') && a.div.textContent.includes('Esperando a Sofi'));
  await enviar(b.nube, b.pareja, FECHA, 'ingles', { items: [0, 0, 0], aciertos: 3 });
  await hasta(() => a.div.textContent.includes('Inglés: Carlos'));
  verdadero(a.div.textContent.includes('Sofi 3/3'), a.div.textContent);
  verdadero(a.div.textContent.includes('Racha: 1 día los dos'), a.div.textContent);
  salir();
});

prueba('diario pantallas: el texto de comentarios y nombres se pinta literal', async () => {
  const { a, b, datos } = await parejaDiario({ perfiles: true, nombreB: '<i>y</i>' });
  const dia = await abrirDia(b.nube, b.pareja, { fecha: FECHA, datos });
  await enviar(b.nube, b.pareja, FECHA, 'gustos', { items: itemsDe(datos, dia, { comentario: '<b>x</b>' }) });
  await abrirHoy(a);
  responderTodo(a.div);
  boton(a.div, 'Enviar').click();
  await hasta(() => a.div.textContent.includes('<b>x</b>'));
  verdadero(a.div.textContent.includes('<i>y</i>'), a.div.textContent);
  igual([a.div.querySelector('b'), a.div.querySelector('i')], [null, null]);
  salir();
});

prueba('inicio: el acceso del diario muestra el último estado de hoy', () => {
  const almacen = almacenEnMemoria();
  almacen.escribir('okupa:pareja:actual', { codigo: 'K7PQ2M', lugar: 'a' });
  const div = document.createElement('div');
  const pintar = () => { div.replaceChildren(); pantallaInicio(div, {}, { almacen, modulos: [moduloDiario], ir() {}, refrescar() {} }); };
  pintar();
  const acceso = () => [...div.querySelectorAll('.juntos a')].find((x) => x.textContent.includes('Diario'));
  verdadero(acceso()?.textContent.includes('Hoy: 3 preguntas nuevas'), acceso()?.textContent);
  almacen.escribir(CLAVE_ESTADO, { fecha: fechaBogota(), texto: 'Esperando a Sofi' });
  pintar();
  verdadero(acceso().textContent.includes('Esperando a Sofi'), acceso().textContent);
  almacen.escribir(CLAVE_ESTADO, { fecha: '2001-01-01', texto: 'Viejo' });
  pintar();
  verdadero(!acceso().textContent.includes('Viejo'), 'un estado de otro día no se muestra');
});

// ---------- Pendientes e historial ----------
prueba('diario pantallas: pendientes lista solo lo que me falta', async () => {
  const { a, datos } = await parejaDiario({ perfiles: true });
  const viejo = await abrirDia(a.nube, a.pareja, { fecha: '2026-11-03', datos });
  await abrirDia(a.nube, a.pareja, { fecha: '2026-11-04', datos });
  await abrirDia(a.nube, a.pareja, { fecha: FECHA, datos });
  await enviar(a.nube, a.pareja, '2026-11-03', 'gustos', { items: itemsDe(datos, viejo) });
  await enviar(a.nube, a.pareja, '2026-11-03', 'ingles', { items: [0, 0, 0], aciertos: 1 });
  await a.pantallas.pendientes(a.div, {}, a.ctx);
  await hasta(() => a.div.querySelector('.lista'));
  igual([...a.div.querySelectorAll('.lista a')].map((x) => x.getAttribute('href')), ['#/diario/dia/2026-11-04']);
  verdadero(a.div.textContent.includes('Te falta las preguntas y el reto de inglés'), a.div.textContent);
  salir();
});

prueba('diario pantallas: historial muestra porcentaje y racha', async () => {
  const { a, b, datos } = await parejaDiario({ perfiles: true });
  for (const fecha of ['2026-11-04', FECHA]) {
    const dia = await abrirDia(a.nube, a.pareja, { fecha, datos });
    await enviar(a.nube, a.pareja, fecha, 'gustos', { items: itemsDe(datos, dia) });
    await enviar(b.nube, b.pareja, fecha, 'gustos', { items: itemsDe(datos, dia) });
  }
  await a.pantallas.historial(a.div, {}, a.ctx);
  await hasta(() => a.div.querySelector('.lista'));
  verdadero(a.div.textContent.includes('Qué tanto se conocen: 100 % de adivinanzas'), a.div.textContent);
  verdadero(a.div.textContent.includes('Racha: 2 días con los dos al día'), a.div.textContent);
  igual([...a.div.querySelectorAll('.lista a')].map((x) => x.getAttribute('href')), [`#/diario/dia/${FECHA}`, '#/diario/dia/2026-11-04']);
  salir();
});
// ---------- Etapa 4: aprender y plantillas ----------
async function hastaQue(fn, ms = 2000) {
  let v;
  for (let t = 0; t < ms; t += 25) { v = await fn(); if (v) return v; await esperar(25); }
  verdadero(v, 'no llegó a tiempo');
  return v;
}
const aprendidosDe = async (cel) => (await leerPerfiles(cel.nube, cel.pareja))[cel.pareja.lugar]?.aprendidos || [];

prueba('diario pantallas: revelar aprende una sola vez', async () => {
  const { a, b, datos } = await parejaDiario({ perfiles: true });
  const dia = await abrirDia(b.nube, b.pareja, { fecha: FECHA, datos });
  await enviar(a.nube, a.pareja, FECHA, 'gustos', { items: itemsDe(datos, dia) });
  await enviar(b.nube, b.pareja, FECHA, 'gustos', { items: itemsDe(datos, dia) });
  await a.pantallas.hoy(a.div, {}, a.ctx);
  await hastaQue(async () => (await aprendidosDe(a)).length === 1);
  const antes = (await leerPerfiles(a.nube, a.pareja)).a;
  igual(Object.keys(antes.respuestas).sort(), [...dia.gustos].sort());
  salir();
  const otraVez = document.createElement('div');
  await a.pantallas.hoy(otraVez, {}, a.ctx);
  await hasta(() => otraVez.querySelectorAll('.carta-diario.revelada').length === 3);
  await esperar(100);
  const despues = (await leerPerfiles(a.nube, a.pareja)).a;
  igual([despues.aprendidos, despues.rasgos], [[FECHA], antes.rasgos]);
  igual(await aprendidosDe(b), [], 'el perfil del otro no se toca');
  salir();
});

prueba('diario pantallas: el historial aprende los días revelados que faltaban', async () => {
  const { a, b, datos } = await parejaDiario({ perfiles: true });
  for (const fecha of ['2026-11-03', '2026-11-04']) {
    const dia = await abrirDia(a.nube, a.pareja, { fecha, datos });
    await enviar(a.nube, a.pareja, fecha, 'gustos', { items: itemsDe(datos, dia) });
    await enviar(b.nube, b.pareja, fecha, 'gustos', { items: itemsDe(datos, dia) });
  }
  await a.pantallas.historial(a.div, {}, a.ctx);
  await hasta(() => a.div.querySelector('.lista'));
  igual((await aprendidosDe(a)).sort(), ['2026-11-03', '2026-11-04']);
  salir();
});

prueba('diario pantallas: cada uno ve la plantilla con los gustos del otro', async () => {
  const { a, b, datos } = await parejaDiario();
  await guardarPerfil(a.nube, a.pareja, { intensidad: 3, artistas: ['Canserbero'] });
  await guardarPerfil(b.nube, b.pareja, { intensidad: 3, artistas: ['Lana del Rey'] });
  await abrirDia(a.nube, a.pareja, { fecha: FECHA, datos });
  await a.nube.escribir(`parejas/${a.pareja.codigo}/dias/${FECHA}`, { gustos: ['dia-0101', 'dia-0001', 'dia-0013'], adivinar: 0 }, { combinar: true });
  await abrirHoy(a);
  await abrirHoy(b);
  verdadero(a.div.textContent.includes('¿a quién ponemos primero: Canserbero o Lana del Rey?'), a.div.textContent.slice(0, 400));
  verdadero(b.div.textContent.includes('¿a quién ponemos primero: Lana del Rey o Canserbero?'), b.div.textContent.slice(0, 400));
  responderTodo(a.div);
  boton(a.div, 'Enviar').click();
  responderTodo(b.div);
  boton(b.div, 'Enviar').click();
  await hasta(() => a.div.querySelectorAll('.carta-diario.revelada').length === 3);
  const primera = a.div.querySelector('.carta-diario.revelada .lado-a-lado').textContent;
  verdadero(primera.includes('CarlosA Canserbero') && primera.includes('SofiA Lana del Rey'), `cada respuesta con su propio artista: ${primera}`);
  verdadero(a.div.textContent.includes('Carlos creía «A Canserbero»'), 'la adivinanza se lee desde el lado del otro');
  verdadero(a.div.querySelector('.carta-diario.revelada .coincidencia').textContent.includes('Aquí hay debate'), 'cada uno escogió a su propio artista: no coinciden');
  salir();
});
// ---------- Lo que Okupa sabe de mí ----------
async function conRasgos(cel, extra = {}) {
  await guardarPerfil(cel.nube, cel.pareja, { intensidad: 3, artistas: ['Canserbero'], ...extra });
  await cel.nube.escribir(`parejas/${cel.pareja.codigo}/perfiles/${cel.pareja.lugar}`, { rasgos: { aventura: { suma: 6, n: 3 }, social: { suma: 1, n: 1 } } }, { combinar: true });
}
const perfilDe = async (cel) => (await leerPerfiles(cel.nube, cel.pareja))[cel.pareja.lugar];

prueba('sabe de mí: muestra lo aprendido y deja corregir y ocultar', async () => {
  const { a } = await parejaDiario();
  await conRasgos(a);
  await a.pantallas.sabe(a.div, {}, a.ctx);
  await hasta(() => a.div.textContent.includes('Más bien aventurero'));
  verdadero(!a.div.textContent.includes('sociable'), 'con una sola respuesta no se muestra');
  boton(a.div, 'Corregir').click();
  boton(a.div, 'de rutina').click();
  await hasta(() => a.div.textContent.includes('Más bien de rutina') && a.div.textContent.includes('Corregido a mano'));
  igual((await perfilDe(a)).correcciones.aventura, 'derecha');
  boton(a.div, 'Corregir').click();
  boton(a.div, 'Ocultar').click();
  await hasta(() => a.div.textContent.includes('Volver a mostrar'));
  verdadero(!a.div.textContent.includes('Más bien de rutina'), a.div.textContent);
  boton(a.div, 'Volver a mostrar').click();
  await hasta(() => a.div.textContent.includes('Más bien aventurero'));
  salir();
});

prueba('sabe de mí: agregar y quitar favoritos', async () => {
  const { a } = await parejaDiario();
  await conRasgos(a);
  await a.pantallas.sabe(a.div, {}, a.ctx);
  await hasta(() => a.div.querySelector('[aria-label="Quitar Canserbero"]'));
  a.div.querySelector('[aria-label="Quitar Canserbero"]').click();
  await hasta(() => !a.div.querySelector('[aria-label="Quitar Canserbero"]'));
  const entrada = a.div.querySelector('input[data-tipo="artistas"]');
  entrada.value = 'Akapellah';
  entrada.parentElement.querySelector('button').click();
  await hasta(() => a.div.querySelector('[aria-label="Quitar Akapellah"]'));
  const p = await perfilDe(a);
  igual([p.quitados.artistas, p.favoritos.artistas], [['Canserbero'], ['Akapellah']]);
  salir();
});

prueba('sabe de mí: lo del otro se ve, pero sin botones para cambiarlo', async () => {
  const { a, b } = await parejaDiario();
  await conRasgos(b, { artistas: ['Lana del Rey'] });
  await a.pantallas.sabe(a.div, {}, a.ctx);
  await hasta(() => boton(a.div, 'Sofi'));
  boton(a.div, 'Sofi').click();
  await hasta(() => a.div.textContent.includes('Lo que Okupa sabe de Sofi'));
  verdadero(a.div.textContent.includes('Más bien aventurero') && a.div.textContent.includes('Lana del Rey'), a.div.textContent);
  igual([boton(a.div, 'Corregir'), boton(a.div, 'Agregar'), a.div.querySelector('.quitar-favorito')], [undefined, undefined, null]);
  salir();
});