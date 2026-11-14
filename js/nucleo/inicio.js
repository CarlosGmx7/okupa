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

const ICONOS_SECCION = { jugar: '✦', conocernos: '❖', nosotros: '♥' };

// Interfaz «Moderna»: tarjetas por sección y un panel con las mini tarjetas de la abierta.
// Jugar juntos y Conocernos abren su panel entre la fila de arriba y Nosotros (el mismo hueco para las dos);
// Nosotros abre el suyo debajo de su tarjeta. Solo una sección abierta a la vez; tocar la misma la cierra.
// Se pinta cerrado en cada render.
const HUECO = (id) => (id === 'nosotros' ? 'abajo' : 'arriba');

function inicioModerno(almacen, modulos = []) {
  const grupos = gruposInicio(almacen, modulos);
  if (!grupos.length) return el('div', { clase: 'inicio-moderno' });
  const huecos = {};
  for (const nombre of ['arriba', 'abajo']) {
    if (!grupos.some(({ s }) => HUECO(s.id) === nombre)) continue;
    const interior = el('div', { clase: 'panel-modos-interior' });
    const panel = el('div', { clase: 'panel-modos', id: `inicio-panel-${nombre}`, role: 'region', 'data-abierto': 'false', inert: true },
      el('div', { clase: 'panel-modos-recorte' }, interior));
    huecos[nombre] = { panel, interior };
  }
  let abierta = grupos.some(({ s }) => s.id === seccionAbierta) ? seccionAbierta : null;

  const botones = grupos.map(({ s, filas }) => {
    const hayAviso = filas.some(({ detalle }) => detalle);
    return el('button', {
      clase: 'tarjeta-seccion', type: 'button', 'data-seccion': s.id,
      'aria-expanded': 'false', 'aria-controls': huecos[HUECO(s.id)].panel.id,
      onclick: () => alternar(s.id),
    },
    el('span', { clase: 'tarjeta-seccion-icono', 'aria-hidden': 'true' }, ICONOS_SECCION[s.id] || '✦'),
    el('span', { clase: 'tarjeta-seccion-titulo' }, s.titulo),
    el('span', { clase: 'tarjeta-seccion-modos' }, filas.map(({ a }) => a.nombre).join(' · ')),
    hayAviso ? el('span', { clase: 'tarjeta-seccion-punto', role: 'img', 'aria-label': 'Hay avisos' }) : null);
  });

  const pintarPanel = ({ s, filas }) => {
    const { panel, interior } = huecos[HUECO(s.id)];
    panel.setAttribute('aria-label', s.titulo);
    interior.replaceChildren(...filas.map(({ a, detalle }) =>
      el('a', { clase: 'mini-modo', href: `#/${a.ruta}` },
        el('span', { clase: 'mini-modo-icono', 'aria-hidden': 'true' }, icono(a.icono)),
        el('span', { clase: 'mini-modo-nombre' }, a.nombre),
        detalle ? el('span', { clase: 'mini-modo-detalle' }, detalle) : null)));
  };

  // Deja cada hueco como toca para la sección abierta (o ninguna). Al cerrar se deja el contenido
  // para que se vea plegarse; inert lo saca del foco y de los lectores.
  const mostrar = () => {
    botones.forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.seccion === abierta)));
    for (const [nombre, { panel }] of Object.entries(huecos)) {
      const abre = abierta !== null && HUECO(abierta) === nombre;
      panel.setAttribute('data-abierto', String(abre));
      panel.toggleAttribute('inert', !abre);
    }
    if (abierta !== null) pintarPanel(grupos.find(({ s }) => s.id === abierta));
  };
  const alternar = (id) => {
    abierta = abierta === id ? null : id;
    seccionAbierta = abierta;
    mostrar();
  };

  // Repintado con una sección abierta: sale ya abierta (sin animar, porque nace en su estado final).
  if (abierta !== null) mostrar();
  const arriba = botones.filter((b) => HUECO(b.dataset.seccion) === 'arriba');
  const raiz = el('div', { clase: 'inicio-moderno' },
    arriba.length ? el('div', { clase: 'inicio-tarjetas-seccion' }, arriba) : null,
    huecos.arriba?.panel || null,
    ...botones.filter((b) => HUECO(b.dataset.seccion) === 'abajo'),
    huecos.abajo?.panel || null);
  // El repintado quita los nodos y con ellos el foco: se devuelve al mismo botón o mini tarjeta.
  if (foco) {
    queueMicrotask(() => {
      const destino = foco.seccion
        ? botones.find((b) => b.dataset.seccion === foco.seccion)
        : [...raiz.querySelectorAll('.mini-modo')].find((a) => a.getAttribute('href') === foco.ruta);
      const activo = globalThis.document?.activeElement;
      if (destino?.isConnected && (!activo || activo === globalThis.document.body)) destino.focus({ preventScroll: true });
    });
  }
  return raiz;
}

// Interfaz «Clásica»: la de antes de la v21. La tarjeta «Nuestra pareja» (o la invitación a enlazar) con una
// píldora por acceso (menos Preguntas, que tiene sus propias tarjetas). Los detalles son los de hoy: solo con pareja.
function tarjetaJuntos(almacen, modulos = []) {
  const enlazados = Boolean(almacen && miPareja(almacen));
  const pildoras = gruposInicio(almacen, modulos)
    .flatMap(({ filas }) => filas)
    .filter(({ a }) => a.ruta !== 'preguntas')
    .map(({ a, detalle }) => el('a', { clase: 'juntos-acceso', href: `#/${a.ruta}` },
      el('span', { clase: 'juntos-acceso-nombre' }, icono(a.icono), ` ${a.nombre}`),
      detalle ? el('span', { clase: 'juntos-acceso-detalle' }, detalle) : null));
  return el('div', { clase: `juntos${enlazados ? ' enlazados' : ' sin-enlazar'}` },
    el('a', { clase: 'juntos-principal', href: '#/pareja' },
      el('span', { clase: 'juntos-icono', 'aria-hidden': 'true' }, icono('∞')),
      el('span', { clase: 'juntos-cuerpo' },
        el('span', { clase: 'juntos-titulo' }, enlazados ? 'Nuestra pareja' : 'Jueguen juntos'),
        el('span', { clase: 'juntos-detalle' }, enlazados ? 'Celulares enlazados ✓' : 'Enlacen sus celulares')),
      el('span', { clase: 'juntos-accion' }, enlazados ? 'Ver' : 'Enlazar →')),
    pildoras.length ? el('nav', { clase: 'juntos-accesos', 'aria-label': 'Jugar juntos' }, pildoras) : null);
}

export function pantallaInicio(contenedor, _params, ctx) {
  const tarjetas = ctx.modulos.flatMap((m) => {
    try { return m.tarjetasInicio?.(ctx) || []; }
    catch (e) { console.warn(`Okupa: el módulo "${m.id}" falló al pintar el inicio`, e); return []; }
  });
  const interfaz = leerAjustes(ctx.almacen).inicio;
  const clasica = interfaz === 'clasica';
  // Las cuatro tarjetas de Preguntas (y lo que otro módulo quiera sumar) bajo la pregunta de hoy; solo en la Clásica.
  const accesos = clasica ? el('div', { clase: 'inicio-tarjetas' }, ctx.modulos.flatMap((m) => {
    try { return m.accesosInicio?.(ctx) || []; }
    catch (e) { console.warn(`Okupa: el módulo "${m.id}" falló al pintar el inicio`, e); return []; }
  })) : null;
  contenedor.append(
    el('header', { clase: 'inicio-cabecera' },
      el('a', { clase: 'engranaje', href: '#/ajustes', 'aria-label': 'Ajustes' }, iconoLinea('ajustes', 'engranaje-icono')),
      el('button', {
        clase: 'inicio-portada-boton', type: 'button', 'aria-label': 'Cambiar foto de inicio',
        onclick: () => abrirEditorPortada(ctx.almacen, () => ctx.refrescar?.()),
      }, el('img', { clase: 'inicio-portada', src: fuentePortada(ctx.almacen), alt: '', onerror: (e) => { if (!e.target.src.endsWith(PORTADA_ORIGINAL)) e.target.src = PORTADA_ORIGINAL; } })),
      el('h1', { clase: 'logo' }, 'Okupa'),
      el('p', { clase: 'lema' }, 'Preguntas para conocerse de verdad')),
    clasica ? tarjetaJuntos(ctx.almacen, ctx.modulos) : el('div', {}, ctx.almacen && miPareja(ctx.almacen) ? null : enlaceEnlazar()),
    el('div', { clase: 'inicio-tarjetas' }, tarjetas),
    clasica
      ? accesos
      : interfaz === 'simple'
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