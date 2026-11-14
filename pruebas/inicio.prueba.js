import { prueba, igual, verdadero } from './corredor.js';
import { pantallaInicio, pantallaAcerca, SECCIONES } from '../js/nucleo/inicio.js';
import { el } from '../js/nucleo/ui.js';
import { almacenEnMemoria } from './pareja.prueba.js';

const ctx = (modulos, almacen = almacenEnMemoria()) => ({ modulos, almacen, ir() {}, refrescar() {} });

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
