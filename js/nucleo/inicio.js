// Pantallas propias del núcleo: inicio y "Acerca de".
import { el } from './ui.js';
import { icono, iconoLinea } from './iconos.js';
import { miPareja } from './pareja.js';
import { PORTADA_ORIGINAL, fuentePortada, abrirEditorPortada } from './portada.js';

// Las tres secciones del inicio, en este orden. Cada módulo se coloca con `accesoJuntos.seccion`
// (sin ella cae en «Nosotros») y `accesoJuntos.orden` (sin él va al final, por nombre).
export const SECCIONES = [
  { id: 'jugar', titulo: 'Jugar juntos' },
  { id: 'conocernos', titulo: 'Conocernos' },
  { id: 'nosotros', titulo: 'Nosotros' },
];

// Invitación a enlazar los celulares; solo aparece mientras no haya pareja.
function enlaceEnlazar() {
  return el('a', { clase: 'inicio-enlazar', href: '#/pareja' },
    el('span', { clase: 'inicio-enlazar-titulo' }, 'Jueguen juntos'),
    el('span', { clase: 'inicio-enlazar-detalle' }, 'Enlacen sus celulares →'));
}

// Una tarjeta por sección con una fila por acceso (los módulos que declaran `accesoJuntos`).
// Se pinta con lo guardado en el celular, sin internet. Una sección sin filas no se pinta.
function seccionesInicio(almacen, modulos = []) {
  const enlazados = Boolean(almacen && miPareja(almacen));
  // `detalle` (opcional) da una línea de estado guardada en el celular, p. ej. el del día del diario.
  // Sin pareja los accesos se ven igual (para que se sepa que existen), pero sin estado.
  const detalleDe = (a) => {
    if (!enlazados) return null;
    try { return a.detalle?.({ almacen }) || null; } catch { return null; }
  };
  const ids = new Set(SECCIONES.map((s) => s.id));
  const accesos = modulos.filter((m) => m.accesoJuntos).map((m) => m.accesoJuntos);
  const deSeccion = (id) => accesos
    .filter((a) => (ids.has(a.seccion) ? a.seccion : 'nosotros') === id)
    .sort((x, y) => (x.orden ?? Infinity) - (y.orden ?? Infinity) || x.nombre.localeCompare(y.nombre, 'es'));
  return SECCIONES.map((s) => ({ s, filas: deSeccion(s.id) })).filter(({ filas }) => filas.length).map(({ s, filas }) => {
    const idTitulo = `inicio-sec-${s.id}`;
    return el('section', { clase: 'inicio-seccion', 'aria-labelledby': idTitulo },
      el('h2', { clase: 'inicio-seccion-titulo', id: idTitulo }, s.titulo),
      el('nav', { clase: 'inicio-filas', 'aria-label': s.titulo }, filas.map((a) => {
        const detalle = detalleDe(a);
        return el('a', { clase: 'inicio-fila', href: `#/${a.ruta}` },
          el('span', { clase: 'inicio-fila-icono', 'aria-hidden': 'true' }, icono(a.icono)),
          el('span', { clase: 'inicio-fila-nombre' }, a.nombre),
          detalle ? el('span', { clase: 'inicio-fila-detalle' }, detalle) : null,
          el('span', { clase: 'inicio-fila-flecha', 'aria-hidden': 'true' }, '›'));
      })));
  });
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
    el('div', {}, ctx.almacen && miPareja(ctx.almacen) ? null : enlaceEnlazar()),
    el('div', { clase: 'inicio-tarjetas' }, tarjetas),
    el('div', { clase: 'inicio-secciones' }, seccionesInicio(ctx.almacen, ctx.modulos)),
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
    el('p', { clase: 'bloque-texto' }, el('a', { href: '#/bienvenida' }, 'Ver la bienvenida otra vez ›')),
  );
}
