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
const pintarModerna = (modulos, almacen) => {
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

prueba('inicio moderno: la tarjeta apunta a un solo panel, región con nombre, cerrado al inicio', () => {
  const div = pintarModerna(modulosModerna());
  const paneles = div.querySelectorAll('.panel-modos');
  igual(paneles.length, 1);
  const panel = paneles[0];
  igual(panel.getAttribute('role'), 'region');
  verdadero(panel.id, 'el panel necesita id');
  for (const b of div.querySelectorAll('.tarjeta-seccion')) igual(b.getAttribute('aria-controls'), panel.id);
  verdadero(div.querySelector('.inicio-tarjetas-seccion').compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING, 'el panel va debajo de las tarjetas');
  igual(panel.querySelectorAll('a.mini-modo').length, 0);
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
  const panel = div.querySelector('.panel-modos');
  igual(panel.getAttribute('aria-label'), 'Nosotros');
  igual([...panel.querySelectorAll('a.mini-modo')].map((a) => a.getAttribute('href')), ['#/match', '#/mapa']);
  tarjeta(div, 'nosotros').click();
  igual(tarjeta(div, 'nosotros').getAttribute('aria-expanded'), 'false');
  igual(panel.getAttribute('data-abierto'), 'false');
  verdadero(panel.hasAttribute('inert'), 'cerrado no debe poder tocarse ni leerse');
});

prueba('inicio moderno: cada vez que se pinta todo empieza cerrado', () => {
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