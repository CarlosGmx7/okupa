// Pantallas propias del núcleo: inicio y "Acerca de".
import { el } from './ui.js';
import { icono, iconoLinea } from './iconos.js';
import { miPareja } from './pareja.js';
import { PORTADA_ORIGINAL, fuentePortada, abrirEditorPortada } from './portada.js';

// Acceso destacado a enlazar los celulares y, ya enlazados, a lo que se juega entre los dos
// (los módulos que declaran `accesoJuntos`). Se pinta con lo guardado en el celular, sin internet.
function tarjetaJuntos(almacen, modulos = []) {
  const enlazados = Boolean(almacen && miPareja(almacen));
  const cabeza = (titulo, detalle) => [
    el('span', { clase: 'juntos-icono', 'aria-hidden': 'true' }, icono('∞')),
    el('span', { clase: 'juntos-cuerpo' },
      el('span', { clase: 'juntos-titulo' }, titulo),
      el('span', { clase: 'juntos-detalle' }, detalle))];
  // `detalle` (opcional) da una línea de estado guardada en el celular, p. ej. el del día del diario.
  // Sin pareja los accesos se ven igual (para que se sepa que existen); cada sección pide enlazar.
  const detalleDe = (a) => {
    if (!enlazados) return null;
    try { return a.detalle?.({ almacen }) || null; } catch { return null; }
  };
  const accesos = modulos.filter((m) => m.accesoJuntos).map(({ accesoJuntos: a }) => {
    const detalle = detalleDe(a);
    return el('a', { clase: 'juntos-acceso', href: `#/${a.ruta}` },
      el('span', { clase: 'juntos-acceso-nombre' }, icono(a.icono), ` ${a.nombre}`),
      detalle ? el('span', { clase: 'juntos-acceso-detalle' }, detalle) : null);
  });
  return el('div', { clase: `juntos${enlazados ? ' enlazados' : ' sin-enlazar'}` },
    el('a', { clase: 'juntos-principal', href: '#/pareja' },
      enlazados ? cabeza('Nuestra pareja', 'Celulares enlazados ✓') : cabeza('Jueguen juntos', 'Enlacen sus dos celulares'),
      el('span', { clase: 'juntos-accion' }, enlazados ? 'Ver' : 'Enlazar →')),
    accesos.length ? el('nav', { clase: 'juntos-accesos', 'aria-label': 'Jugar juntos' }, accesos) : null);
}

export function pantallaInicio(contenedor, _params, ctx) {
  const tarjetas = ctx.modulos.flatMap((m) => {
    try { return m.tarjetasInicio?.(ctx) || []; }
    catch (e) { console.warn(`Okupa: el módulo "${m.id}" falló al pintar el inicio`, e); return []; }
  });
  contenedor.append(
    el('header', { clase: 'inicio-cabecera' },
      el('a', { clase: 'engranaje', href: '#/ajustes', 'aria-label': 'Ajustes' }, iconoLinea('ajustes', 'engranaje-icono')),
      el('button', {
        clase: 'inicio-portada-boton', type: 'button', 'aria-label': 'Cambiar foto de inicio',
        onclick: () => abrirEditorPortada(ctx.almacen, () => ctx.refrescar?.()),
      }, el('img', { clase: 'inicio-portada', src: fuentePortada(ctx.almacen), alt: '', onerror: (e) => { if (!e.target.src.endsWith(PORTADA_ORIGINAL)) e.target.src = PORTADA_ORIGINAL; } })),
      el('h1', { clase: 'logo' }, 'Okupa'),
      el('p', { clase: 'lema' }, 'Preguntas para conocerse de verdad')),
    tarjetaJuntos(ctx.almacen, ctx.modulos),
    el('div', { clase: 'inicio-tarjetas' }, tarjetas),
    bloqueInstalar(ctx.instalacion),
    el('footer', { clase: 'inicio-pie' },
      el('a', { href: '#/acerca' }, 'Acerca de Okupa')),
  );
}

// Botón de instalar si el navegador lo ofrece; si no, cómo hacerlo a mano.
function bloqueInstalar(instalacion) {
  const e = instalacion?.estado();
  if (!e || e.instalada) return el('div');
  if (e.puedeInstalar) {
    return el('div', { clase: 'instalar' },
      el('button', { clase: 'boton boton-principal', type: 'button', onclick: () => instalacion.instalar() }, '📲 Instalar como app'));
  }
  return el('p', { clase: 'instalar instalar-nota' }, e.esIOS
    ? ['📲 Para instalarla en iPhone: abre esta página en Safari, toca ', el('strong', {}, 'Compartir'), ' y luego ', el('strong', {}, 'Añadir a pantalla de inicio'), '.']
    : ['📲 Para instalarla: abre el menú del navegador (⋮) y toca ', el('strong', {}, 'Instalar app'), ' o ', el('strong', {}, 'Agregar a la pantalla principal'), '.']);
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
    el('p', { clase: 'bloque-texto' }, 'Para borrar lo guardado en este celular, ve a ', el('a', { href: '#/ajustes' }, 'Ajustes'), '.'),
    el('p', { clase: 'bloque-texto' }, el('a', { href: '#/privacidad' }, 'Política de privacidad ›')),
  );
}
