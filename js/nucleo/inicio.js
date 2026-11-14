// Pantallas propias del núcleo: inicio y "Acerca de".
import { el } from './ui.js';
import { icono, iconoLinea } from './iconos.js';
import { miPareja } from './pareja.js';
import { leerAjustes } from './ajustes.js';
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

// Agrupa los accesos de los módulos por sección, en orden, con su detalle ya calculado.
// Una sección sin accesos no se incluye. Lo usan las dos interfaces del inicio.
function gruposInicio(almacen, modulos = []) {
  const enlazados = Boolean(almacen && miPareja(almacen));
  // detalle (opcional) da una línea de estado guardada en el celular, p. ej. el del día del diario.
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
  return SECCIONES.map((s) => ({ s, filas: deSeccion(s.id).map((a) => ({ a, detalle: detalleDe(a) })) }))
    .filter(({ filas }) => filas.length);
}

// Interfaz «Simple»: una tarjeta por sección con una fila por acceso.
// Se pinta con lo guardado en el celular, sin internet.
function seccionesInicio(almacen, modulos = []) {
  return gruposInicio(almacen, modulos).map(({ s, filas }) => {
    const idTitulo = `inicio-sec-${s.id}`;
    return el('section', { clase: 'inicio-seccion', 'aria-labelledby': idTitulo },
      el('h2', { clase: 'inicio-seccion-titulo', id: idTitulo }, s.titulo),
      el('nav', { clase: 'inicio-filas', 'aria-label': s.titulo }, filas.map(({ a, detalle }) =>
        el('a', { clase: 'inicio-fila', href: `#/${a.ruta}` },
          el('span', { clase: 'inicio-fila-icono', 'aria-hidden': 'true' }, icono(a.icono)),
          el('span', { clase: 'inicio-fila-nombre' }, a.nombre),
          detalle ? el('span', { clase: 'inicio-fila-detalle' }, detalle) : null,
          el('span', { clase: 'inicio-fila-flecha', 'aria-hidden': 'true' }, '›')))));
  });
}

// Lo abierto sobrevive a los repintados del inicio (p. ej. al terminar precalentar), pero no a navegar:
// cualquier cambio de ruta lo cierra. Este oyente se registra al cargar el módulo, antes que el de la app.
let seccionAbierta = null;
let foco = null; // { seccion } o { ruta } del botón o mini tarjeta que tenía el foco
globalThis.addEventListener?.('hashchange', () => { seccionAbierta = null; foco = null; });
globalThis.document?.addEventListener?.('focusin', (e) => {
  const b = e.target?.closest?.('.tarjeta-seccion');
  const m = e.target?.closest?.('.mini-modo');
  foco = b ? { seccion: b.dataset.seccion } : m ? { ruta: m.getAttribute('href') } : null;
});

const ICONOS_SECCION ={ jugar: '✦', conocernos: '❖', nosotros: '♥' };

// Interfaz «Moderna»: tres tarjetas grandes y, debajo, un panel con las mini tarjetas de la abierta.
// Solo una sección abierta a la vez; tocar la misma la cierra. Se pinta cerrado en cada render.
function inicioModerno(almacen, modulos = []) {
  const grupos = gruposInicio(almacen, modulos);
  if (!grupos.length) return el('div', { clase: 'inicio-moderno' });
  const idPanel = 'inicio-panel-modos';
  const panelInterior = el('div', { clase: 'panel-modos-interior' });
  const panel = el('div', { clase: 'panel-modos', id: idPanel, role: 'region', 'data-abierto': 'false', inert: true },
    el('div', { clase: 'panel-modos-recorte' }, panelInterior));
  let abierta = grupos.some(({ s }) => s.id === seccionAbierta) ? seccionAbierta : null;

  const botones = grupos.map(({ s, filas }) => {
    const hayAviso = filas.some(({ detalle }) => detalle);
    return el('button', {
      clase: 'tarjeta-seccion', type: 'button', 'data-seccion': s.id,
      'aria-expanded': 'false', 'aria-controls': idPanel,
      onclick: () => alternar(s.id),
    },
    el('span', { clase: 'tarjeta-seccion-icono', 'aria-hidden': 'true' }, ICONOS_SECCION[s.id] || '✦'),
    el('span', { clase: 'tarjeta-seccion-titulo' }, s.titulo),
    el('span', { clase: 'tarjeta-seccion-modos' }, filas.map(({ a }) => a.nombre).join(' · ')),
    hayAviso ? el('span', { clase: 'tarjeta-seccion-punto', role: 'img', 'aria-label': 'Hay avisos' }) : null);
  });

  const pintarPanel = ({ s, filas }) => {
    panel.setAttribute('aria-label', s.titulo);
    panelInterior.replaceChildren(...filas.map(({ a, detalle }) =>
      el('a', { clase: 'mini-modo', href: `#/${a.ruta}` },
        el('span', { clase: 'mini-modo-icono', 'aria-hidden': 'true' }, icono(a.icono)),
        el('span', { clase: 'mini-modo-nombre' }, a.nombre),
        detalle ? el('span', { clase: 'mini-modo-detalle' }, detalle) : null)));
  };

  const alternar = (id) => {
    abierta = abierta === id ? null : id;
    seccionAbierta = abierta;
    botones.forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.seccion === abierta)));
    panel.setAttribute('data-abierto', String(abierta !== null));
    panel.toggleAttribute('inert', abierta === null);
    // Al cerrar se deja el contenido para que se vea plegarse; inert lo saca del foco y de los lectores.
    if (abierta !== null) pintarPanel(grupos.find(({ s }) => s.id === abierta));
  };

  // Repintado con una sección abierta: sale ya abierta (sin animar, porque nace en su estado final).
  if (abierta !== null) {
    botones.forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.seccion === abierta)));
    panel.setAttribute('data-abierto', 'true');
    panel.removeAttribute('inert');
    pintarPanel(grupos.find(({ s }) => s.id === abierta));
  }
  const raiz = el('div', { clase: 'inicio-moderno' },
    el('div', { clase: 'inicio-tarjetas-seccion' }, botones),
    panel);
  // El repintado quita los nodos y con ellos el foco: se devuelve al mismo botón o mini tarjeta.
  if (foco) {
    queueMicrotask(() => {
      const destino = foco.seccion
        ? botones.find((b) => b.dataset.seccion === foco.seccion)
        : [...panelInterior.querySelectorAll('.mini-modo')].find((a) => a.getAttribute('href') === foco.ruta);
      const activo = globalThis.document?.activeElement;
      if (destino?.isConnected && (!activo || activo === globalThis.document.body)) destino.focus({ preventScroll: true });
    });
  }
  return raiz;
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
    leerAjustes(ctx.almacen).inicio === 'simple'
      ? el('div', { clase: 'inicio-secciones' }, seccionesInicio(ctx.almacen, ctx.modulos))
      : inicioModerno(ctx.almacen, ctx.modulos),
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
