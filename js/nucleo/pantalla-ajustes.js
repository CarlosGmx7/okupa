// Pantalla #/ajustes: tema, foto de inicio, sonidos y vibración, y borrar datos. Todo es de este celular.
import { el } from './ui.js';
import { leerAjustes, cambiarAjuste } from './ajustes.js';
import { aplicarTema } from './tema.js';
import { puedeVibrar as vibracionDisponible } from './sonidos.js';
import { PORTADA_ORIGINAL, fuentePortada, abrirEditorPortada } from './portada.js';
import { leerPreferencias } from './notificaciones.js';

const MOTIVOS = {
  'sin-pareja': () => ['Enlaza tu pareja para recibir avisos', ' · ', el('a', { href: '#/pareja' }, 'Enlazar')],
  'sin-soporte': () => 'Este navegador no puede recibir notificaciones',
  denegado: () => 'Las notificaciones están bloqueadas. En Chrome: toca el candado junto a la dirección → Notificaciones → Permitir.',
  'sin-conexion': () => 'No se pudo activar. Revisa la conexión.',
  'sin-config': () => 'Notificaciones aún no configuradas.',
};
const TIPOS_AVISO = [
  ['diario', 'Tu pareja respondió el Diario'],
  ['trivia', 'Invitación a la Trivia'],
  ['mapa', 'Novedades del mapa'],
  ['recordatorio', 'Recordatorio del Diario'],
];

// Fila con interruptor cuyo cambio puede tardar: `alCambiar(nuevo)` devuelve el valor final.
function filaInterruptor(clave, titulo, activo, alCambiar, nota = null) {
  const boton = el('button', {
    clase: 'interruptor', type: 'button', role: 'switch', 'data-ajuste': clave,
    'aria-checked': String(activo), 'aria-label': titulo,
  }, el('span', { clase: 'interruptor-perilla', 'aria-hidden': 'true' }));
  const fila = el('div', { clase: 'fila-ajuste' },
    el('span', { clase: 'fila-ajuste-cuerpo' },
      el('span', { clase: 'fila-ajuste-titulo' }, titulo),
      nota ? el('span', { clase: 'fila-ajuste-nota' }, nota) : null),
    boton);
  let ocupado = false;
  const cambiar = async () => {
    if (ocupado) return;
    ocupado = true;
    boton.disabled = true;
    const nuevo = boton.getAttribute('aria-checked') !== 'true';
    boton.setAttribute('aria-checked', String(nuevo));
    try { boton.setAttribute('aria-checked', String(await alCambiar(nuevo))); }
    finally { ocupado = false; boton.disabled = false; }
  };
  boton.addEventListener('click', (e) => { e.stopPropagation(); cambiar(); });
  fila.addEventListener('click', cambiar);
  return fila;
}

function grupoNotificaciones(almacen, notificaciones) {
  const caja = el('div', { clase: 'grupo-ajustes-caja' });
  const estado = el('p', { clase: 'ajustes-estado', role: 'status' });
  const pintar = () => {
    const prefs = leerPreferencias(almacen);
    const filas = [filaInterruptor('notificaciones', 'Notificaciones', prefs.activas, async (nuevo) => {
      estado.replaceChildren();
      if (!nuevo) { await notificaciones.desactivar(); pintar(); return false; }
      estado.textContent = 'Activando…';
      const r = await notificaciones.activar();
      estado.replaceChildren(...[].concat(r.ok ? [] : (MOTIVOS[r.motivo] || MOTIVOS['sin-conexion'])()));
      if (r.ok) pintar();
      return r.ok;
    })];
    if (prefs.activas) {
      for (const [tipo, titulo] of TIPOS_AVISO) {
        filas.push(filaInterruptor(`aviso-${tipo}`, titulo, prefs.avisos[tipo], async (nuevo) =>
          (await notificaciones.cambiar({ avisos: { [tipo]: nuevo } })).avisos[tipo]));
      }
      const hora = el('input', { type: 'time', step: '900', value: prefs.hora, clase: 'hora-ajuste', 'aria-label': 'Hora del recordatorio' });
      hora.addEventListener('change', () => { if (hora.value) notificaciones.cambiar({ hora: hora.value }); });
      filas.push(el('label', { clase: 'fila-ajuste' }, el('span', { clase: 'fila-ajuste-titulo fila-ajuste-cuerpo' }, 'Hora del recordatorio'), hora));
    }
    caja.replaceChildren(...filas);
  };
  pintar();
  return el('section', { clase: 'grupo-ajustes' },
    el('h2', { clase: 'grupo-ajustes-titulo' }, 'Notificaciones'), caja, estado);
}

const TEMAS_VISTA = [
  { id: 'vino', nombre: 'Vino y dorado', nota: 'Predeterminado', colores: ['#140a0e', '#2f1822', '#c9a45c'] },
  { id: 'grafito', nombre: 'Grafito y rosa', nota: 'Limpio y oscuro', colores: ['#0E0E11', '#232329', '#F472B6'] },
];
export const TEXTO_BORRAR = '¿Seguro? Se borrará todo lo guardado en este celular, incluidas sus preguntas propias.';

const grupo = (titulo, ...filas) => el('section', { clase: 'grupo-ajustes' },
  el('h2', { clase: 'grupo-ajustes-titulo' }, titulo),
  el('div', { clase: 'grupo-ajustes-caja' }, filas));

function selectorTema(almacen) {
  const opciones = TEMAS_VISTA.map((t) => el('button', {
    clase: 'tema-opcion', type: 'button', role: 'radio', 'data-tema': t.id,
    onclick: () => {
      const a = cambiarAjuste(almacen, 'tema', t.id);
      aplicarTema(a.tema);
      marcar(a.tema);
    },
  },
  el('span', { clase: 'tema-muestra', 'aria-hidden': 'true' },
    t.colores.map((c) => el('span', { style: `background:${c}` }))),
  el('span', { clase: 'tema-nombre' }, t.nombre),
  el('span', { clase: 'tema-nota' }, t.nota)));
  const marcar = (actual) => opciones.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.tema === actual)));
  marcar(leerAjustes(almacen).tema);
  return el('div', { clase: 'tema-opciones', role: 'radiogroup', 'aria-label': 'Tema' }, opciones);
}

function interruptor(almacen, clave, titulo, nota = null) {
  const boton = el('button', {
    clase: 'interruptor', type: 'button', role: 'switch', 'data-ajuste': clave,
    'aria-checked': String(leerAjustes(almacen)[clave]), 'aria-label': titulo,
  }, el('span', { clase: 'interruptor-perilla', 'aria-hidden': 'true' }));
  const fila = el('div', { clase: 'fila-ajuste' },
    el('span', { clase: 'fila-ajuste-cuerpo' },
      el('span', { clase: 'fila-ajuste-titulo' }, titulo),
      nota ? el('span', { clase: 'fila-ajuste-nota' }, nota) : null),
    boton);
  const cambiar = () => {
    const a = cambiarAjuste(almacen, clave, !leerAjustes(almacen)[clave]);
    boton.setAttribute('aria-checked', String(a[clave]));
  };
  boton.addEventListener('click', (e) => { e.stopPropagation(); cambiar(); });
  // Toda la fila se puede tocar, no solo el interruptor.
  fila.addEventListener('click', cambiar);
  return fila;
}

export function pantallaAjustes(contenedor, _params, ctx) {
  const almacen = ctx.almacen;
  const confirmar = ctx.confirmar || ((t) => globalThis.confirm(t));
  const recargar = ctx.recargar || (() => { location.hash = '#/'; location.reload(); });
  const hayVibracion = ctx.puedeVibrar ?? vibracionDisponible();

  const foto = el('img', { clase: 'fila-ajuste-foto', src: fuentePortada(almacen), alt: '',
    onerror: (e) => { if (!e.target.src.endsWith(PORTADA_ORIGINAL)) e.target.src = PORTADA_ORIGINAL; } });

  contenedor.append(
    el('a', { clase: 'volver', href: '#/' }, '← Inicio'),
    el('h1', { clase: 'titulo-pantalla' }, 'Ajustes'),
    grupo('Tema', selectorTema(almacen)),
    grupo('Foto',
      el('button', { clase: 'fila-ajuste fila-ajuste-enlace', type: 'button',
        onclick: () => abrirEditorPortada(almacen, () => { foto.src = fuentePortada(almacen); ctx.refrescar?.(); }) },
      foto, el('span', { clase: 'fila-ajuste-titulo' }, 'Foto de inicio'), el('span', { clase: 'fila-ajuste-flecha', 'aria-hidden': 'true' }, '›'))),
    grupo('Sonidos y vibración',
      interruptor(almacen, 'sonidos', 'Sonidos', 'En un match, al acertar y al guardar'),
      interruptor(almacen, 'vibracion', 'Vibración al tocar', hayVibracion ? null : 'En iPhone no está disponible')),
    ctx.notificaciones ? grupoNotificaciones(almacen, ctx.notificaciones) : null,
    grupo('Datos',
      el('a', { clase: 'fila-ajuste fila-ajuste-enlace', href: '#/pareja' },
        el('span', { clase: 'fila-ajuste-titulo' }, 'Datos de la pareja'), el('span', { clase: 'fila-ajuste-flecha', 'aria-hidden': 'true' }, '›')),
      el('button', { clase: 'fila-ajuste fila-ajuste-enlace fila-ajuste-peligro', type: 'button',
        onclick: () => {
          if (!confirmar(TEXTO_BORRAR)) return;
          for (const clave of almacen.claves('okupa:')) almacen.borrar(clave);
          recargar();
        } },
      el('span', { clase: 'fila-ajuste-titulo' }, 'Borrar datos de este celular'))),
    el('p', { clase: 'ajustes-pie' }, el('a', { href: '#/acerca' }, 'Acerca de Okupa ›')),
  );
}
