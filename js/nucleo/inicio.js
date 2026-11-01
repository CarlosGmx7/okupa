// Pantallas propias del núcleo: inicio y "Acerca de".
import { el } from './ui.js';

export function pantallaInicio(contenedor, _params, ctx) {
  const tarjetas = ctx.modulos.flatMap((m) => {
    try { return m.tarjetasInicio?.(ctx) || []; }
    catch (e) { console.warn(`Okupa: el módulo "${m.id}" falló al pintar el inicio`, e); return []; }
  });
  contenedor.append(
    el('header', { clase: 'inicio-cabecera' },
      el('img', { clase: 'inicio-portada', src: 'iconos/portada-circular.png', alt: '', onerror: (e) => e.target.remove() }),
      el('h1', { clase: 'logo' }, 'Okupa'),
      el('p', { clase: 'lema' }, 'Preguntas para conocerse de verdad')),
    el('div', { clase: 'inicio-tarjetas' }, tarjetas),
    el('footer', { clase: 'inicio-pie' },
      el('a', { href: '#/acerca' }, 'Acerca de Okupa')),
  );
}

export function pantallaAcerca(contenedor, _params, ctx) {
  const secciones = ctx.modulos.map((m) => {
    try { return m.acerca?.(ctx) || null; }
    catch { return null; }
  });
  contenedor.append(
    el('a', { clase: 'volver', href: '#/' }, '← Inicio'),
    el('h1', { clase: 'titulo-pantalla' }, 'Acerca de Okupa'),
    ...secciones.filter(Boolean),
    el('section', { clase: 'bloque-texto' },
      el('h2', {}, 'Empezar de cero'),
      el('p', {}, 'Borra lo que esta app recuerda en este celular: preguntas vistas, avance de sesiones y todo lo que hayan creado.'),
      el('button', {
        clase: 'boton boton-peligro',
        onclick: () => {
          if (!confirm('¿Seguro? Se borrará todo lo guardado en este celular, incluidas sus preguntas propias.')) return;
          for (const clave of ctx.almacen.claves('okupa:')) ctx.almacen.borrar(clave);
          location.hash = '#/';
          location.reload();
        },
      }, 'Reiniciar todo')),
  );
}
