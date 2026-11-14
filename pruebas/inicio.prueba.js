import { prueba, igual, verdadero } from './corredor.js';
import { pantallaInicio, pantallaAcerca, SECCIONES } from '../js/nucleo/inicio.js';
import { el } from '../js/nucleo/ui.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { cambiarAjuste } from '../js/nucleo/ajustes.js';

// Las pruebas de las secciones son de la interfaz Simple; las de tarjetas usan ctxModerna (el defecto).
const ctxModerna = (modulos, almacen = almacenEnMemoria()) => ({ modulos, almacen, ir() {}, refrescar() {} });
const ctx = (modulos, almacen = almacenEnMemoria()) => { cambiarAjuste(almacen, 'inicio', 'simple'); return ctxModerna(modulos, almacen); };

const acceso = (ruta, nombre, extra = {}) => ({ ruta, nombre, icono: '✦', ...extra });
const mod = (id, a) => ({ id, accesoJuntos: a });
const conPareja = () => {
  const almacen = almacenEnMemoria();
  almacen.escribir('okupa:pareja:actual', { codigo: 'K7PQ2M', lugar: 'a' });
  return almacen;
};
const textos = (div, sel) => [...div.querySelectorAll(sel)].map((x) => x.textContent);

prueba('inicio: SECCIONES fija el orden jugar, conocernos, nosotros', () => {
  igual(SECCIONES, [
    { id: 'jugar', titulo: 'Jugar juntos' },
    { id: 'conocernos', titulo: 'Conocernos' },
    { id: 'nosotros', titulo: 'Nosotros' },
  ]);
});

prueba('inicio: las secciones salen en su orden y las filas por orden', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, ctx([
    mod('n2', acceso('n2', 'Mapa', { seccion: 'nosotros', orden: 2 })),
    mod('c1', acceso('c1', 'Diario', { seccion: 'conocernos', orden: 2 })),
    mod('j2', acceso('j2', 'Probable', { seccion: 'jugar', orden: 2 })),
    mod('n1', acceso('n1', 'Match', { seccion: 'nosotros', orden: 1 })),
    mod('j1', acceso('j1', 'Trivia', { seccion: 'jugar', orden: 1 })),
    mod('c0', acceso('c0', 'Preguntas', { seccion: 'conocernos', orden: 1 })),
  ]));
  igual(textos(div, '.inicio-seccion-titulo'), ['Jugar juntos', 'Conocernos', 'Nosotros']);
  igual([...div.querySelectorAll('.inicio-seccion')].map((s) => textos(s, '.inicio-fila-nombre')),
    [['Trivia', 'Probable'], ['Preguntas', 'Diario'], ['Match', 'Mapa']]);
  const fila = div.querySelector('.inicio-seccion .inicio-filas a.inicio-fila');
  igual(fila.getAttribute('href'), '#/j1');
  igual(fila.querySelector('.inicio-fila-flecha').textContent, '›');
  igual(fila.querySelector('.inicio-fila-flecha').getAttribute('aria-hidden'), 'true');
  verdadero(fila.querySelector('.inicio-fila-icono .ico'), 'falta el ícono');
});

prueba('inicio: sin seccion cae en Nosotros y sin orden va al final por nombre', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, ctx([
    mod('z', acceso('z', 'Zeta')),
    mod('a', acceso('a', 'Alfa')),
    mod('p', acceso('p', 'Primero', { orden: 1 })),
  ]));
  igual(textos(div, '.inicio-seccion-titulo'), ['Nosotros']);
  igual(textos(div, '.inicio-fila-nombre'), ['Primero', 'Alfa', 'Zeta']);
});

prueba('inicio: una sección sin filas no se pinta', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, ctx([mod('c', acceso('c', 'Diario', { seccion: 'conocernos', orden: 1 }))]));
  igual(textos(div, '.inicio-seccion-titulo'), ['Conocernos']);
  const vacio = document.createElement('div');
  pantallaInicio(vacio, {}, ctx([]));
  igual(vacio.querySelectorAll('.inicio-seccion').length, 0);
});

prueba('inicio: sin pareja invita a enlazar antes de las secciones y no pinta detalles', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, ctx([
    { id: 'a', tarjetasInicio: () => [el('p', { clase: 't' }, 'Tarjeta A')] },
    mod('d', acceso('diario', 'Diario', { seccion: 'conocernos', orden: 1, detalle: () => 'Te toca responder' })),
  ]));
  const enlace = div.querySelector('a.inicio-enlazar');
  verdadero(enlace, 'falta el enlace de enlazar');
  igual(enlace.getAttribute('href'), '#/pareja');
  verdadero(enlace.textContent.includes('Jueguen juntos') && enlace.textContent.includes('Enlacen sus celulares →'), enlace.textContent);
  verdadero(enlace.compareDocumentPosition(div.querySelector('.inicio-seccion')) & Node.DOCUMENT_POSITION_FOLLOWING, 'va antes de las secciones');
  verdadero(div.querySelector('.t').compareDocumentPosition(div.querySelector('.inicio-seccion')) & Node.DOCUMENT_POSITION_FOLLOWING, 'las tarjetas de módulo van antes de las secciones');
  igual(div.querySelectorAll('.inicio-fila-detalle').length, 0);
  verdadero(!div.querySelector('.juntos'), 'ya no existe la tarjeta de pareja');
});

prueba('inicio: con pareja no hay enlace ni "Celulares enlazados" y salen los detalles', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, ctx([
    mod('d', acceso('diario', 'Diario', { seccion: 'conocernos', orden: 1, detalle: () => 'Te toca responder' })),
    mod('m', acceso('match', 'Match', { seccion: 'nosotros', orden: 1, detalle: () => null })),
  ], conPareja()));
  verdadero(!div.querySelector('.inicio-enlazar'), 'no debe invitar a enlazar');
  verdadero(!div.textContent.includes('Celulares enlazados'), div.textContent);
  igual(textos(div, '.inicio-fila-detalle'), ['Te toca responder']);
});

prueba('inicio: un detalle que lanza no rompe el inicio', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, ctx([
    mod('d', acceso('diario', 'Diario', { seccion: 'conocernos', orden: 1, detalle: () => { throw new Error('roto'); } })),
  ], conPareja()));
  igual(textos(div, '.inicio-fila-nombre'), ['Diario']);
  igual(div.querySelectorAll('.inicio-fila-detalle').length, 0);
});

prueba('inicio: pinta las tarjetas de cada módulo y omite el que falla', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, ctx([
    { id: 'a', tarjetasInicio: () => [el('p', { clase: 't' }, 'Tarjeta A')] },
    { id: 'b', tarjetasInicio: () => { throw new Error('roto'); } },
  ]));
  igual([...div.querySelectorAll('.t')].map((x) => x.textContent), ['Tarjeta A']);
  verdadero(div.querySelector('.logo').textContent === 'Okupa');
});

function instalacionFalsa(estado) {
  const llamadas = [];
  return { llamadas, estado: () => estado, instalar: async () => { llamadas.push('instalar'); } };
}

prueba('inicio: muestra el botón de instalar cuando el navegador lo permite', () => {
  const instalacion = instalacionFalsa({ puedeInstalar: true, esIOS: false, instalada: false });
  const div = document.createElement('div');
  pantallaInicio(div, {}, { ...ctx([]), instalacion });
  const boton = [...div.querySelectorAll('button')].find((b) => b.textContent.includes('Instalar como app'));
  verdadero(boton, 'falta el botón');
  boton.click();
  igual(instalacion.llamadas, ['instalar']);
});

prueba('inicio: en iPhone explica cómo añadirla a la pantalla de inicio', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, { ...ctx([]), instalacion: instalacionFalsa({ puedeInstalar: false, esIOS: true, instalada: false }) });
  verdadero(div.textContent.includes('Añadir a pantalla de inicio'), div.textContent);
});

prueba('inicio: sin aviso del navegador indica dónde está la opción en el menú', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, { ...ctx([]), instalacion: instalacionFalsa({ puedeInstalar: false, esIOS: false, instalada: false }) });
  verdadero(div.textContent.includes('Instalar app'), div.textContent);
});

prueba('inicio: ya instalada no muestra nada de instalación', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, { ...ctx([]), instalacion: instalacionFalsa({ puedeInstalar: true, esIOS: true, instalada: true }) });
  verdadero(!div.textContent.includes('Instalar') && !div.textContent.includes('Añadir a pantalla'), div.textContent);
});

prueba('acerca: pinta las secciones de los módulos como elementos', () => {
  const div = document.createElement('div');
  pantallaAcerca(div, {}, ctx([{ id: 'a', acerca: () => el('section', { clase: 's' }, 'Fuentes') }, { id: 'b' }]));
  verdadero(div.querySelector('.s'), 'la sección es un elemento');
  verdadero(!div.textContent.includes('[object'), div.textContent);
  verdadero(!div.textContent.includes('null') && !div.textContent.includes('undefined'), div.textContent);
});

// ---------- Interfaz Moderna (la de por defecto) ----------
const modulosModerna = (detalleDiario = () => null) => [
  mod('n1', acceso('match', 'Match', { seccion: 'nosotros', orden: 1, icono: '♥' })),
  mod('n2', acceso('mapa', 'Mapa', { seccion: 'nosotros', orden: 2 })),
  mod('c1', acceso('preguntas', 'Preguntas', { seccion: 'conocernos', orden: 1 })),
  mod('c2', acceso('diario', 'Diario', { seccion: 'conocernos', orden: 2, detalle: detalleDiario })),
  mod('j1', acceso('trivia', 'Trivia en vivo', { seccion: 'jugar', orden: 1 })),
  mod('j2', acceso('probable', '¿Quién es más probable?', { seccion: 'jugar', orden: 2 })),
];
const navegar = () => globalThis.dispatchEvent(new Event('hashchange'));
const pintarModerna = (modulos, almacen) => {
  navegar(); // entrar al inicio desde otra ruta: todo cerrado
  const div = document.createElement('div');
  pantallaInicio(div, {}, ctxModerna(modulos, almacen));
  return div;
};
const tarjeta = (div, id) => div.querySelector('.tarjeta-seccion[data-seccion="' + id + '"]');

prueba('inicio moderno: es la interfaz por defecto y no pinta las secciones simples', () => {
  const div = pintarModerna(modulosModerna());
  verdadero(div.querySelector('.inicio-moderno .inicio-tarjetas-seccion'), 'falta el contenedor moderno');
  igual(div.querySelectorAll('.inicio-seccion').length, 0);
  igual(div.querySelectorAll('.inicio-fila').length, 0);
});

prueba('inicio moderno: Simple pinta las secciones de siempre y ninguna tarjeta', () => {
  const almacen = almacenEnMemoria();
  cambiarAjuste(almacen, 'inicio', 'simple');
  const div = pintarModerna(modulosModerna(), almacen);
  igual(textos(div, '.inicio-seccion-titulo'), ['Jugar juntos', 'Conocernos', 'Nosotros']);
  igual(div.querySelectorAll('.inicio-moderno, .tarjeta-seccion').length, 0);
});

prueba('inicio moderno: tres tarjetas en el orden de las secciones, Nosotros al final, con ícono, título y modos', () => {
  const div = pintarModerna(modulosModerna());
  const tarjetas = [...div.querySelectorAll('button.tarjeta-seccion')];
  igual(tarjetas.map((b) => b.dataset.seccion), ['jugar', 'conocernos', 'nosotros']);
  igual(tarjetas.map((b) => b.querySelector('.tarjeta-seccion-titulo').textContent), ['Jugar juntos', 'Conocernos', 'Nosotros']);
  igual(tarjetas.map((b) => b.querySelector('.tarjeta-seccion-icono').textContent), ['✦', '❖', '♥']);
  igual(tarjetas.map((b) => b.querySelector('.tarjeta-seccion-modos').textContent),
    ['Trivia en vivo · ¿Quién es más probable?', 'Preguntas · Diario', 'Match · Mapa']);
  igual(tarjetas.map((b) => b.getAttribute('type')), ['button', 'button', 'button']);
  igual(tarjetas.map((b) => b.getAttribute('aria-expanded')), ['false', 'false', 'false']);
});

const ANTES = (x, y) => Boolean(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING);
const panelDe = (div, id) => div.querySelector('#' + tarjeta(div, id).getAttribute('aria-controls'));

prueba('inicio moderno: dos huecos de panel, regiones con nombre, cerrados al inicio y cada tarjeta apunta al suyo', () => {
  const div = pintarModerna(modulosModerna());
  const paneles = [...div.querySelectorAll('.panel-modos')];
  igual(paneles.length, 2);
  for (const panel of paneles) {
    igual(panel.getAttribute('role'), 'region');
    verdadero(panel.id, 'el panel necesita id');
    verdadero(panel.hasAttribute('inert'), 'cerrado desde el inicio: inert');
    igual(panel.getAttribute('data-abierto'), 'false');
    igual(panel.querySelectorAll('a.mini-modo').length, 0);
  }
  verdadero(paneles[0].id !== paneles[1].id, 'ids distintos');
  igual(tarjeta(div, 'jugar').getAttribute('aria-controls'), paneles[0].id);
  igual(tarjeta(div, 'conocernos').getAttribute('aria-controls'), paneles[0].id);
  igual(tarjeta(div, 'nosotros').getAttribute('aria-controls'), paneles[1].id);
  igual(div.querySelectorAll('.panel-modos:not([inert]) a.mini-modo').length, 0, 'ninguna mini tarjeta alcanzable');
});

prueba('inicio moderno: el panel de Jugar y Conocernos va entre las tarjetas de arriba y Nosotros; el de Nosotros, después', () => {
  const div = pintarModerna(modulosModerna());
  const [arriba, abajo] = div.querySelectorAll('.panel-modos');
  const nosotros = tarjeta(div, 'nosotros');
  for (const id of ['jugar', 'conocernos']) {
    verdadero(ANTES(tarjeta(div, id), arriba), id + ' va antes del panel de arriba');
    igual(panelDe(div, id), arriba);
  }
  verdadero(ANTES(arriba, nosotros), 'el panel de arriba va antes de Nosotros');
  verdadero(ANTES(nosotros, abajo), 'el panel de Nosotros va después de su tarjeta');
  igual(panelDe(div, 'nosotros'), abajo);
  verdadero(!arriba.contains(nosotros) && !div.querySelector('.inicio-tarjetas-seccion [data-seccion="nosotros"]'), 'Nosotros ya no va en la rejilla de arriba');
});

prueba('inicio moderno: abrir Jugar o Conocernos llena el panel de arriba y deja cerrado el de abajo', () => {
  const div = pintarModerna(modulosModerna());
  const [arriba, abajo] = div.querySelectorAll('.panel-modos');
  tarjeta(div, 'jugar').click();
  igual(arriba.getAttribute('data-abierto'), 'true');
  verdadero(!arriba.hasAttribute('inert'));
  verdadero(abajo.hasAttribute('inert') && abajo.getAttribute('data-abierto') === 'false');
  igual(textos(arriba, '.mini-modo-nombre'), ['Trivia en vivo', '¿Quién es más probable?']);
  tarjeta(div, 'conocernos').click(); // entre las de arriba solo cambia el contenido
  igual(arriba.getAttribute('data-abierto'), 'true');
  igual(arriba.getAttribute('aria-label'), 'Conocernos');
  igual(textos(arriba, '.mini-modo-nombre'), ['Preguntas', 'Diario']);
  igual(div.querySelectorAll('.panel-modos[data-abierto="true"]').length, 1);
  igual(['jugar', 'conocernos', 'nosotros'].map((id) => tarjeta(div, id).getAttribute('aria-expanded')), ['false', 'true', 'false']);
});

prueba('inicio moderno: pasar de una de arriba a Nosotros cierra un hueco y abre el otro, y al revés', () => {
  const div = pintarModerna(modulosModerna());
  const [arriba, abajo] = div.querySelectorAll('.panel-modos');
  tarjeta(div, 'jugar').click();
  tarjeta(div, 'nosotros').click();
  igual([arriba.getAttribute('data-abierto'), abajo.getAttribute('data-abierto')], ['false', 'true']);
  igual([arriba.hasAttribute('inert'), abajo.hasAttribute('inert')], [true, false]);
  igual(abajo.getAttribute('aria-label'), 'Nosotros');
  igual(textos(abajo, '.mini-modo-nombre'), ['Match', 'Mapa']);
  igual(div.querySelectorAll('.panel-modos[data-abierto="true"]').length, 1);
  igual(div.querySelectorAll('.panel-modos:not([inert])').length, 1);
  tarjeta(div, 'conocernos').click();
  igual([arriba.getAttribute('data-abierto'), abajo.getAttribute('data-abierto')], ['true', 'false']);
  igual([arriba.hasAttribute('inert'), abajo.hasAttribute('inert')], [false, true]);
  igual(div.querySelectorAll('.panel-modos:not([inert]) a.mini-modo').length, 2);
  tarjeta(div, 'conocernos').click(); // la misma la cierra
  igual(div.querySelectorAll('.panel-modos[data-abierto="true"]').length, 0);
  igual(div.querySelectorAll('.panel-modos:not([inert])').length, 0);
});

prueba('inicio moderno: un repintado con Nosotros abierto lo deja abierto en su hueco', () => {
  const almacen = almacenEnMemoria();
  const modulos = modulosModerna();
  const div = pintarModerna(modulos, almacen);
  tarjeta(div, 'nosotros').click();
  const otra = document.createElement('div');
  pantallaInicio(otra, {}, ctxModerna(modulos, almacen));
  const [arriba, abajo] = otra.querySelectorAll('.panel-modos');
  igual([arriba.getAttribute('data-abierto'), abajo.getAttribute('data-abierto')], ['false', 'true']);
  verdadero(arriba.hasAttribute('inert') && !abajo.hasAttribute('inert'));
  igual(textos(abajo, '.mini-modo-nombre'), ['Match', 'Mapa']);
  navegar();
});
prueba('inicio moderno: tocar una tarjeta abre el panel con mini tarjetas que llevan a la ruta', () => {
  const div = pintarModerna(modulosModerna());
  tarjeta(div, 'conocernos').click();
  igual(tarjeta(div, 'conocernos').getAttribute('aria-expanded'), 'true');
  const panel = div.querySelector('.panel-modos');
  igual(panel.getAttribute('aria-label'), 'Conocernos');
  igual([...panel.querySelectorAll('a.mini-modo')].map((a) => a.getAttribute('href')), ['#/preguntas', '#/diario']);
  igual(textos(panel, '.mini-modo-nombre'), ['Preguntas', 'Diario']);
  verdadero(panel.querySelector('a.mini-modo .mini-modo-icono .ico'), 'falta el ícono de la mini tarjeta');
  igual(panel.getAttribute('data-abierto'), 'true');
  verdadero(!panel.hasAttribute('inert'));
});

prueba('inicio moderno: tocar otra tarjeta cambia la sección abierta y tocar la misma la cierra', () => {
  const div = pintarModerna(modulosModerna());
  tarjeta(div, 'jugar').click();
  tarjeta(div, 'nosotros').click();
  igual(['jugar', 'conocernos', 'nosotros'].map((id) => tarjeta(div, id).getAttribute('aria-expanded')), ['false', 'false', 'true']);
  const panel = panelDe(div, 'nosotros');
  igual(panel.getAttribute('aria-label'), 'Nosotros');
  igual([...panel.querySelectorAll('a.mini-modo')].map((a) => a.getAttribute('href')), ['#/match', '#/mapa']);
  tarjeta(div, 'nosotros').click();
  igual(tarjeta(div, 'nosotros').getAttribute('aria-expanded'), 'false');
  igual(panel.getAttribute('data-abierto'), 'false');
  verdadero(panel.hasAttribute('inert'), 'cerrado no debe poder tocarse ni leerse');
  igual(div.querySelectorAll('.panel-modos:not([inert]) a.mini-modo').length, 0, 'tras cerrar ninguna mini tarjeta alcanzable');
  tarjeta(div, 'nosotros').click();
  verdadero(!panel.hasAttribute('inert'), 'abierto: sin inert');
  tarjeta(div, 'nosotros').click();
  verdadero(panel.hasAttribute('inert'), 'inert vuelve al cerrar');
});

prueba('inicio moderno: al volver al inicio desde otra ruta todo empieza cerrado', () => {
  const almacen = almacenEnMemoria();
  const div = pintarModerna(modulosModerna(), almacen);
  tarjeta(div, 'jugar').click();
  const otra = pintarModerna(modulosModerna(), almacen);
  igual([...otra.querySelectorAll('.tarjeta-seccion')].map((b) => b.getAttribute('aria-expanded')), ['false', 'false', 'false']);
});

prueba('inicio moderno: con pareja y un detalle sale el puntico y la mini tarjeta lleva el texto', () => {
  const div = pintarModerna(modulosModerna(() => 'Sofi te está esperando'), conPareja());
  const punto = tarjeta(div, 'conocernos').querySelector('.tarjeta-seccion-punto');
  verdadero(punto, 'falta el puntico');
  igual(punto.getAttribute('aria-label'), 'Hay avisos');
  igual(tarjeta(div, 'jugar').querySelectorAll('.tarjeta-seccion-punto').length, 0);
  igual(tarjeta(div, 'nosotros').querySelectorAll('.tarjeta-seccion-punto').length, 0);
  tarjeta(div, 'conocernos').click();
  igual(textos(div.querySelector('.panel-modos'), '.mini-modo-detalle'), ['Sofi te está esperando']);
  const diario = [...div.querySelectorAll('a.mini-modo')].find((a) => a.getAttribute('href') === '#/diario');
  verdadero(diario.textContent.includes('Sofi te está esperando'));
});

prueba('inicio moderno: sin pareja no hay puntico ni detalle aunque el modo tenga detalle', () => {
  const div = pintarModerna(modulosModerna(() => 'Te toca responder'));
  igual(div.querySelectorAll('.tarjeta-seccion-punto').length, 0);
  tarjeta(div, 'conocernos').click();
  igual(div.querySelectorAll('.mini-modo-detalle').length, 0);
  igual(textos(div, '.mini-modo-nombre'), ['Preguntas', 'Diario']);
});

prueba('inicio moderno: con pareja pero sin detalle no hay puntico, y un detalle que lanza no rompe nada', () => {
  const sin = pintarModerna(modulosModerna(() => null), conPareja());
  igual(sin.querySelectorAll('.tarjeta-seccion-punto').length, 0);
  const roto = pintarModerna(modulosModerna(() => { throw new Error('roto'); }), conPareja());
  igual(roto.querySelectorAll('.tarjeta-seccion-punto').length, 0);
  tarjeta(roto, 'conocernos').click();
  igual(textos(roto, '.mini-modo-nombre'), ['Preguntas', 'Diario']);
});

prueba('inicio moderno: una sección sin módulos no se pinta ni queda en el resumen', () => {
  const div = pintarModerna([mod('c', acceso('diario', 'Diario', { seccion: 'conocernos', orden: 1 }))]);
  igual([...div.querySelectorAll('.tarjeta-seccion')].map((b) => b.dataset.seccion), ['conocernos']);
  const vacio = pintarModerna([]);
  igual(vacio.querySelectorAll('.tarjeta-seccion').length, 0);
  igual(vacio.querySelectorAll('.panel-modos').length, 0);
});

prueba('inicio moderno: conserva cabecera, invitación a enlazar y tarjetas de módulo', () => {
  const div = pintarModerna([{ id: 'a', tarjetasInicio: () => [el('p', { clase: 't' }, 'Pregunta de hoy')] }, ...modulosModerna()]);
  verdadero(div.querySelector('.logo') && div.querySelector('a.inicio-enlazar') && div.querySelector('.t'));
  verdadero(div.querySelector('.t').compareDocumentPosition(div.querySelector('.inicio-moderno')) & Node.DOCUMENT_POSITION_FOLLOWING, 'la tarjeta de módulo va antes');
});

prueba('inicio moderno: un repintado (refrescar) deja abierta la misma sección, ya abierta y sin perder el estado', () => {
  const almacen = conPareja();
  const modulos = modulosModerna(() => 'Te toca responder');
  const div = pintarModerna(modulos, almacen);
  tarjeta(div, 'conocernos').click();
  // Es lo que hace la app al refrescar: vacía la vista y vuelve a llamar a pantallaInicio con el mismo ctx.
  const otra = document.createElement('div');
  pantallaInicio(otra, {}, ctxModerna(modulos, almacen));
  igual(['jugar', 'conocernos', 'nosotros'].map((id) => tarjeta(otra, id).getAttribute('aria-expanded')), ['false', 'true', 'false']);
  const panel = otra.querySelector('.panel-modos');
  igual(panel.getAttribute('data-abierto'), 'true');
  verdadero(!panel.hasAttribute('inert'));
  igual(panel.getAttribute('aria-label'), 'Conocernos');
  igual([...panel.querySelectorAll('a.mini-modo')].map((a) => a.getAttribute('href')), ['#/preguntas', '#/diario']);
  igual(textos(panel, '.mini-modo-detalle'), ['Te toca responder']);
  navegar();
});

prueba('inicio moderno: tras navegar a otra ruta y volver, el inicio está cerrado', () => {
  const almacen = almacenEnMemoria();
  const div = pintarModerna(modulosModerna(), almacen);
  tarjeta(div, 'jugar').click();
  navegar(); // hashchange hacia otra ruta
  const otra = document.createElement('div');
  pantallaInicio(otra, {}, ctxModerna(modulosModerna(), almacen));
  igual([...otra.querySelectorAll('.tarjeta-seccion')].map((b) => b.getAttribute('aria-expanded')), ['false', 'false', 'false']);
  verdadero(otra.querySelector('.panel-modos').hasAttribute('inert'));
});

prueba('inicio moderno: el repintado devuelve el foco al mismo botón', async () => {
  const almacen = almacenEnMemoria();
  const div = pintarModerna(modulosModerna(), almacen);
  document.body.append(div);
  try {
    tarjeta(div, 'nosotros').focus();
    div.remove();
    const otra = document.createElement('div');
    document.body.append(otra);
    pantallaInicio(otra, {}, ctxModerna(modulosModerna(), almacen));
    await Promise.resolve();
    igual(document.activeElement, tarjeta(otra, 'nosotros'));
    otra.remove();
  } finally { div.remove(); navegar(); }
});

// ---------- Interfaz Clásica (la de antes de la v21) ----------
const modulosClasica = (detalle = () => 'Te toca responder') => [
  { id: 'preguntas', ...mod('p', acceso('preguntas', 'Preguntas', { seccion: 'conocernos', orden: 1 })),
    tarjetasInicio: () => [el('a', { clase: 'del-dia', href: '#/preguntas/carta/x' }, 'Pregunta de hoy')],
    accesosInicio: () => [el('nav', { clase: 'accesos' }, ['sesiones', 'categorias', 'azar', 'mis'].map((r) => el('a', { clase: 'acceso', href: '#/preguntas/' + r }, r)))] },
  mod('m', acceso('mapa', 'Mapa', { seccion: 'nosotros', orden: 2 })),
  mod('d', acceso('diario', 'Diario', { seccion: 'conocernos', orden: 2, detalle })),
  mod('t', acceso('trivia', 'Trivia en vivo', { seccion: 'jugar', orden: 1 })),
  mod('c', acceso('capsula', 'Cápsula', { seccion: 'nosotros', orden: 4 })),
  mod('q', acceso('probable', 'Probable', { seccion: 'jugar', orden: 2 })),
  mod('x', acceso('match', 'Match', { seccion: 'nosotros', orden: 1 })),
];
const pintarClasica = (modulos, almacen = almacenEnMemoria()) => {
  cambiarAjuste(almacen, 'inicio', 'clasica');
  navegar();
  const div = document.createElement('div');
  pantallaInicio(div, {}, ctxModerna(modulos, almacen));
  return div;
};

prueba('inicio clásica: tarjeta Nuestra pareja con las píldoras de todos los accesos menos Preguntas, por sección y orden', () => {
  const div = pintarClasica(modulosClasica(), conPareja());
  const juntos = div.querySelector('.juntos.enlazados');
  verdadero(juntos, 'falta la tarjeta de pareja');
  const principal = juntos.querySelector('a.juntos-principal');
  igual(principal.getAttribute('href'), '#/pareja');
  verdadero(principal.textContent.includes('Nuestra pareja') && principal.textContent.includes('Celulares enlazados ✓'), principal.textContent);
  igual(principal.querySelector('.juntos-accion').textContent, 'Ver');
  verdadero(principal.querySelector('.juntos-icono .ico'), 'falta el ∞');
  igual([...juntos.querySelectorAll('nav.juntos-accesos a.juntos-acceso')].map((a) => a.getAttribute('href')),
    ['#/trivia', '#/probable', '#/diario', '#/match', '#/mapa', '#/capsula']);
});

prueba('inicio clásica: Pregunta de hoy y las 4 tarjetas de Preguntas van después de la tarjeta de pareja y antes de instalar', () => {
  const div = pintarClasica(modulosClasica(), conPareja());
  const juntos = div.querySelector('.juntos');
  const dia = div.querySelector('.del-dia');
  const accesos = div.querySelector('nav.accesos');
  igual([...accesos.querySelectorAll('a.acceso')].map((a) => a.getAttribute('href')),
    ['#/preguntas/sesiones', '#/preguntas/categorias', '#/preguntas/azar', '#/preguntas/mis']);
  verdadero(ANTES(juntos, dia) && ANTES(dia, accesos), 'orden: pareja, pregunta de hoy, tarjetas');
  verdadero(ANTES(div.querySelector('.inicio-cabecera'), juntos), 'la cabecera va primero');
  verdadero(ANTES(accesos, div.querySelector('.inicio-pie')), 'el pie va al final');
});

prueba('inicio clásica: no pinta tarjetas de sección ni secciones simples', () => {
  const div = pintarClasica(modulosClasica(), conPareja());
  igual(div.querySelectorAll('.tarjeta-seccion, .inicio-seccion, .inicio-moderno, .panel-modos, .inicio-fila').length, 0);
});

prueba('inicio clásica: con pareja las píldoras llevan el detalle actual; el que lanza no rompe', () => {
  const div = pintarClasica(modulosClasica(), conPareja());
  igual(textos(div, '.juntos-acceso-detalle'), ['Te toca responder']);
  const roto = pintarClasica(modulosClasica(() => { throw new Error('roto'); }), conPareja());
  igual(roto.querySelectorAll('.juntos-acceso').length, 6);
  igual(roto.querySelectorAll('.juntos-acceso-detalle').length, 0);
});

prueba('inicio clásica: sin pareja invita a Enlazar, muestra las píldoras y ningún detalle', () => {
  const div = pintarClasica(modulosClasica());
  const juntos = div.querySelector('.juntos.sin-enlazar');
  verdadero(juntos, 'falta la tarjeta sin enlazar');
  const principal = juntos.querySelector('a.juntos-principal');
  igual(principal.getAttribute('href'), '#/pareja');
  verdadero(principal.textContent.includes('Jueguen juntos') && principal.textContent.includes('Enlacen sus celulares'), principal.textContent);
  igual(principal.querySelector('.juntos-accion').textContent, 'Enlazar →');
  igual(juntos.querySelectorAll('.juntos-acceso').length, 6);
  igual(div.querySelectorAll('.juntos-acceso-detalle').length, 0);
  verdadero(!div.textContent.includes('Celulares enlazados'));
  verdadero(!div.querySelector('.inicio-enlazar'), 'la invitación suelta es de las otras interfaces');
});

prueba('inicio clásica: Moderna y Simple no pintan la tarjeta Nuestra pareja ni las tarjetas de Preguntas', () => {
  const almacen = almacenEnMemoria();
  for (const v of ['moderna', 'simple']) {
    cambiarAjuste(almacen, 'inicio', v);
    navegar();
    const div = document.createElement('div');
    pantallaInicio(div, {}, ctxModerna(modulosClasica(), almacen));
    igual(div.querySelectorAll('.juntos, nav.accesos').length, 0, v);
  }
});