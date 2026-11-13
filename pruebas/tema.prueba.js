import { prueba, igual, verdadero } from './corredor.js';
import { aplicarTema, COLOR_BARRA } from '../js/nucleo/tema.js';

function documentoDePrueba() {
  const d = document.implementation.createHTMLDocument('t');
  const meta = d.createElement('meta');
  meta.name = 'theme-color';
  meta.content = '#140a0e';
  d.head.append(meta);
  return { d, meta };
}

async function hoja(ruta) {
  const h = new CSSStyleSheet();
  h.replaceSync(await (await fetch(ruta, { cache: 'no-store' })).text());
  return h;
}

prueba('tema: aplicarTema pone data-tema y el color de la barra', () => {
  const { d, meta } = documentoDePrueba();
  aplicarTema('grafito', d);
  igual(d.documentElement.dataset.tema, 'grafito');
  igual(meta.content, '#0E0E11');
  aplicarTema('rojo', d);
  igual(d.documentElement.dataset.tema, 'vino');
  igual(meta.content, COLOR_BARRA.vino);
});

prueba('tema: el script de index.html tolera ajustes dañados', async () => {
  const html = await (await fetch('index.html', { cache: 'no-store' })).text();
  const codigo = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((c) => c.includes('okupa:ajustes'));
  verdadero(codigo, 'falta el script del tema en index.html');
  const correr = (crudo) => {
    const { d, meta } = documentoDePrueba();
    const almacenFalso = { getItem: () => crudo };
    new Function('localStorage', 'document', codigo)(almacenFalso, d);
    return [d.documentElement.dataset.tema, meta.content];
  };
  igual(correr('{'), ['vino', '#140a0e']);
  igual(correr(null), ['vino', '#140a0e']);
  igual(correr('{"tema":"grafito"}'), ['grafito', '#0E0E11']);
});

prueba('tema: Grafito define todas sus variables', async () => {
  const h = await hoja('css/base.css');
  const regla = [...h.cssRules].find((r) => r instanceof CSSStyleRule && r.selectorText.includes('data-tema="grafito"') && r.style.getPropertyValue('--fondo'));
  verdadero(regla, 'falta la regla [data-tema="grafito"] con las variables');
  const faltan = ['--fondo', '--superficie', '--superficie-alta', '--crema', '--tenue', '--vino', '--vino-claro', '--dorado',
    '--dorado-suave', '--sobre-resalte', '--peligro', '--vino-oscuro', '--dorado-rgb', '--vino-rgb', '--vino-claro-rgb',
    '--fondo-rgb', '--velo-rgb', '--serif', '--radio', '--radio-chico'].filter((v) => !regla.style.getPropertyValue(v).trim());
  igual(faltan, []);
});

prueba('tema: componentes.css no tiene colores del vino escritos a mano', async () => {
  const texto = await (await fetch('css/componentes.css', { cache: 'no-store' })).text();
  const sueltos = texto.match(/rgba\((201, 164, 92|110, 31, 53|168, 52, 79|20, 10, 14|10, 4, 7),|#1c0e13|#3a1220|#f0a3b3|#a8344f/gi) || [];
  igual(sueltos, []);
});

prueba('tema: el lápiz de la portada mide 20px', async () => {
  const h = await hoja('css/componentes.css');
  const regla = [...h.cssRules].find((r) => r instanceof CSSStyleRule && r.selectorText === '.inicio-portada-boton::after');
  verdadero(regla, 'falta la regla del lápiz');
  igual([regla.style.width, regla.style.height, regla.style.fontSize], ['20px', '20px', '10px']);
});
