import { prueba, igual, verdadero } from './corredor.js';
import { ICONOS_LINEA, icono, iconoLinea } from '../js/nucleo/iconos.js';
import { pantallaInicio } from '../js/nucleo/inicio.js';
import { almacenEnMemoria } from './pareja.prueba.js';

prueba('iconos: cada glifo mapeado trae glifo y SVG', () => {
  const sin = Object.keys(ICONOS_LINEA).filter((g) => g !== 'ajustes').filter((g) => {
    const s = icono(g);
    return s.querySelector('.ico-glifo')?.textContent !== g || !s.querySelector('svg.ico-linea') || !s.classList.contains('con-linea');
  });
  igual(sin, []);
});

prueba('iconos: los símbolos de los datos tienen ícono de línea', async () => {
  const glifos = new Set();
  for (const ruta of ['data/preguntas/categorias.json', 'data/trivia/temas.json', 'data/diario/temas.json']) {
    for (const x of await (await fetch(ruta)).json()) if (x.icono && x.icono !== 'Aa') glifos.add(x.icono);
  }
  igual([...glifos].filter((g) => !ICONOS_LINEA[g]), []);
});

prueba('iconos: glifo desconocido se queda como texto', () => {
  const s = icono('Z');
  igual(s.textContent, 'Z');
  verdadero(!s.querySelector('svg') && !s.classList.contains('con-linea'));
  igual(s.getAttribute('aria-hidden'), 'true');
});

prueba('iconos: iconoLinea da el engranaje', () => {
  const svg = iconoLinea('ajustes');
  verdadero(svg instanceof SVGElement && svg.querySelector('path, circle'));
});

prueba('iconos: el inicio usa íconos', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, { almacen: almacenEnMemoria(), ir() {}, refrescar() {},
    modulos: [{ id: 'diario', accesoJuntos: { ruta: 'diario', nombre: 'Diario', icono: '☼' } }] });
  verdadero(div.querySelector('.juntos-acceso .ico svg'), div.querySelector('.juntos')?.outerHTML);
  verdadero(div.querySelector('.juntos-icono .ico svg'), 'el ∞ de la tarjeta de pareja');
});
