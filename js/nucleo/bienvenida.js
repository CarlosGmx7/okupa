// Bienvenida para quien abre Okupa por primera vez: qué es, enlazar la pareja, activar avisos.
// Rutas: #/bienvenida (paso 1) y #/bienvenida/:paso (enlace, avisos, listo).
import { el } from './ui.js';
import { icono } from './iconos.js';
import { miPareja } from './pareja.js';
import { conectar, pintarEnlace } from './pantallas-pareja.js';
import { soporteNotificaciones } from './notificaciones.js';
import { MOTIVOS } from './pantalla-ajustes.js';
import { PORTADA_ORIGINAL } from './portada.js';

const CLAVE = 'okupa:bienvenida';
const PASOS = ['que', 'enlace', 'avisos', 'listo'];

// Quien ya está enlazado o ya usó Preguntas no es nuevo, aunque no tenga la marca.
export function debeMostrarBienvenida(almacen) {
  if (almacen.leer(CLAVE, null) || miPareja(almacen)) return false;
  return almacen.claves('okupa:preguntas:').length === 0;
}

// Solo al abrir el inicio: un enlace directo (p. ej. el de un aviso) se respeta.
export function desviarABienvenida(hash, almacen) {
  return ['', '#', '#/'].includes(hash || '') && debeMostrarBienvenida(almacen);
}

export function marcarBienvenida(almacen, fecha = new Date()) {
  almacen.escribir(CLAVE, fecha.toISOString());
}

function puntos(paso) {
  const n = PASOS.indexOf(paso) + 1;
  return el('div', { clase: 'bienvenida-puntos', role: 'img', 'aria-label': `Paso ${n} de ${PASOS.length}` },
    PASOS.map((p) => el('span', { clase: p === paso ? 'activo' : '' })));
}

export async function pantallaBienvenida(contenedor, params, ctx) {
  const paso = PASOS.includes(params?.paso) ? params.paso : 'que';
  const terminar = () => { marcarBienvenida(ctx.almacen); ctx.ir(''); };
  const ir = (p) => ctx.ir(`bienvenida/${p}`);
  const zona = el('div', { clase: 'bienvenida-cuerpo' });
  const cabecera = (p) => el('div', { clase: 'bienvenida-cabecera' }, puntos(p),
    p === 'listo' ? null : el('button', { clase: 'boton-texto', type: 'button', onclick: terminar }, 'Saltar'));
  const marco = el('div', { clase: 'bienvenida' }, cabecera(paso), zona);
  contenedor.append(marco);

  const pintarListo = () => {
    marco.replaceChildren(cabecera('listo'), zona);
    const enlazados = Boolean(miPareja(ctx.almacen));
    zona.replaceChildren(
      el('h1', { clase: 'titulo-pantalla' }, '¡Listo!'),
      el('p', { clase: 'subtitulo' }, enlazados
        ? 'Ya pueden jugar juntos. Empiecen por la pregunta de hoy o una partida de Trivia.'
        : 'Cuando quieran jugar juntos, enlacen sus celulares desde la tarjeta «Jueguen juntos» del inicio.'),
      el('button', { clase: 'boton boton-principal boton-grande', type: 'button', onclick: terminar }, 'Ir al inicio'));
  };

  if (paso === 'que') {
    zona.replaceChildren(
      el('img', { clase: 'bienvenida-portada', src: PORTADA_ORIGINAL, alt: '' }),
      el('h1', { clase: 'logo' }, 'Okupa'),
      el('p', { clase: 'lema' }, 'Preguntas para conocerse de verdad'),
      el('ul', { clase: 'bienvenida-lista' },
        el('li', {}, icono('✦'), el('span', {}, 'Cientos de preguntas para hablar de todo, por temas o en sesiones guiadas.')),
        el('li', {}, icono('∞'), el('span', {}, 'Juegos entre los dos, cada uno en su celular: Trivia, Diario y Match.')),
        el('li', {}, icono('⌖'), el('span', {}, 'Un mapa con los lugares que quieren conocer y los que ya vivieron.'))),
      el('button', { clase: 'boton boton-principal boton-grande', type: 'button', onclick: () => ir('enlace') }, 'Empezar'),
      el('p', { clase: 'campo-ayuda' }, el('a', { href: '#/privacidad' }, 'Cómo cuidamos sus datos')));
    return;
  }

  if (paso === 'enlace') {
    const despues = el('button', { clase: 'boton-texto', type: 'button', onclick: () => ir('avisos') }, 'Lo hago después');
    marco.append(el('div', { clase: 'bienvenida-pie' }, despues));
    if (miPareja(ctx.almacen)) { ir('avisos'); return; }
    const nube = await conectar(zona, ctx);
    if (nube) pintarEnlace(zona, ctx, nube, () => ir('avisos'));
    return;
  }

  if (paso === 'avisos') {
    const soporte = (ctx.soporte || soporteNotificaciones)();
    if (!miPareja(ctx.almacen) || !ctx.notificaciones || soporte !== 'ok') { pintarListo(); return; }
    const estado = el('p', { clase: 'ajustes-estado', role: 'status' });
    const activar = el('button', { clase: 'boton boton-principal boton-grande', type: 'button' }, 'Activar avisos');
    activar.addEventListener('click', async () => {
      activar.disabled = true;
      estado.textContent = 'Activando…';
      const r = await ctx.notificaciones.activar();
      activar.disabled = false;
      if (r.ok) { ir('listo'); return; }
      estado.replaceChildren(...[].concat((MOTIVOS[r.motivo] || MOTIVOS['sin-conexion'])()));
    });
    zona.replaceChildren(
      el('h1', { clase: 'titulo-pantalla' }, 'Que no se les pase nada'),
      el('p', { clase: 'subtitulo' }, 'Te avisamos cuando tu pareja responda el Diario, te invite a la Trivia o agregue un lugar al mapa, y te recordamos la pregunta del día. Lo cambias cuando quieras en Ajustes.'),
      activar, estado,
      el('button', { clase: 'boton-texto', type: 'button', onclick: () => ir('listo') }, 'Ahora no'));
    return;
  }

  pintarListo();
}
