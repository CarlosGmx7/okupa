import { prueba, igual, verdadero } from './corredor.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { leerAjustes } from '../js/nucleo/ajustes.js';
import { pantallaAjustes } from '../js/nucleo/pantalla-ajustes.js';
import { pantallaInicio, pantallaAcerca } from '../js/nucleo/inicio.js';

function pintar(extra = {}) {
  const almacen = extra.almacen || almacenEnMemoria();
  const div = document.createElement('div');
  pantallaAjustes(div, {}, { almacen, modulos: [], ir() {}, refrescar() {}, puedeVibrar: true, ...extra });
  return { div, almacen };
}
const texto = (div) => div.textContent;

prueba('inicio: el engranaje lleva a Ajustes', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, { modulos: [], almacen: almacenEnMemoria(), ir() {}, refrescar() {} });
  const g = div.querySelector('.engranaje');
  verdadero(g, 'falta el engranaje');
  igual([g.tagName, g.getAttribute('href'), g.getAttribute('aria-label')], ['A', '#/ajustes', 'Ajustes']);
  verdadero(g.querySelector('svg'), 'el engranaje lleva su ícono');
});

prueba('ajustes: se pinta con los grupos y filas', () => {
  const { div } = pintar();
  igual(div.querySelector('h1')?.textContent, 'Ajustes');
  igual([...div.querySelectorAll('.grupo-ajustes-titulo')].map((h) => h.textContent), ['Tema', 'Foto', 'Sonidos y vibración', 'Datos']);
  for (const t of ['Vino y dorado', 'Grafito y rosa', 'Foto de inicio', 'Sonidos', 'Vibración al tocar', 'Datos de la pareja', 'Borrar datos de este celular', 'Acerca de Okupa']) {
    verdadero(texto(div).includes(t), `falta "${t}"`);
  }
  igual(div.querySelector('a[href="#/pareja"]')?.textContent.includes('Datos de la pareja'), true);
});

prueba('ajustes: sin nada guardado está marcado Vino y dorado (Predeterminado)', () => {
  const { div } = pintar();
  const vino = div.querySelector('.tema-opcion[data-tema="vino"]');
  igual(vino.getAttribute('aria-checked'), 'true');
  verdadero(vino.textContent.includes('Predeterminado'));
  igual(div.querySelector('.tema-opcion[data-tema="grafito"]').getAttribute('aria-checked'), 'false');
});

prueba('ajustes: tocar Grafito cambia el tema al instante', () => {
  const { div, almacen } = pintar();
  div.querySelector('.tema-opcion[data-tema="grafito"]').click();
  igual(leerAjustes(almacen).tema, 'grafito');
  igual(div.querySelector('.tema-opcion[data-tema="grafito"]').getAttribute('aria-checked'), 'true');
  igual(div.querySelector('.tema-opcion[data-tema="vino"]').getAttribute('aria-checked'), 'false');
  igual(document.documentElement.dataset.tema, 'grafito');
  div.querySelector('.tema-opcion[data-tema="vino"]').click();
  igual(document.documentElement.dataset.tema, 'vino');
});

prueba('ajustes: los interruptores cambian el ajuste', () => {
  const { div, almacen } = pintar();
  const sonidos = div.querySelector('.interruptor[data-ajuste="sonidos"]');
  igual([sonidos.getAttribute('role'), sonidos.getAttribute('aria-checked')], ['switch', 'true']);
  sonidos.click();
  igual(sonidos.getAttribute('aria-checked'), 'false');
  igual(leerAjustes(almacen).sonidos, false);
  div.querySelector('.interruptor[data-ajuste="vibracion"]').click();
  igual(leerAjustes(almacen).vibracion, false);
});

prueba('ajustes: sin vibración en el celular se avisa', () => {
  verdadero(!texto(pintar().div).includes('En iPhone no está disponible'));
  verdadero(texto(pintar({ puedeVibrar: false }).div).includes('En iPhone no está disponible'));
});

prueba('ajustes: borrar datos usa la confirmación de siempre', () => {
  const almacen = almacenEnMemoria();
  almacen.escribir('okupa:ajustes', { tema: 'grafito' });
  almacen.escribir('okupa:algo', 1);
  let pregunta = '';
  let recargas = 0;
  let respuesta = false;
  const { div } = pintar({ almacen, confirmar: (t) => { pregunta = t; return respuesta; }, recargar: () => { recargas++; } });
  const borrar = [...div.querySelectorAll('button')].find((b) => b.textContent.includes('Borrar datos de este celular'));
  borrar.click();
  igual(pregunta, '¿Seguro? Se borrará todo lo guardado en este celular, incluidas sus preguntas propias.');
  igual([almacen.claves('okupa:').length, recargas], [2, 0]);
  respuesta = true;
  borrar.click();
  igual([almacen.claves('okupa:').length, recargas], [0, 1]);
});

prueba('acerca: ya no trae "Reiniciar todo"', () => {
  const div = document.createElement('div');
  pantallaAcerca(div, {}, { modulos: [], almacen: almacenEnMemoria(), ir() {}, refrescar() {} });
  verdadero(!div.textContent.includes('Reiniciar todo') && !div.textContent.includes('Empezar de cero'), div.textContent);
});
