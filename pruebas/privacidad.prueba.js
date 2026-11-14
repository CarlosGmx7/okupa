import { prueba, igual, verdadero } from './corredor.js';
import { pantallaPrivacidad, CORREO_PRIVACIDAD, URL_PRIVACIDAD } from '../js/nucleo/privacidad.js';

const pagina = async () => (await fetch('privacidad.html', { cache: 'no-store' })).text();

prueba('privacidad: la página suelta tiene lo esencial', async () => {
  const html = await pagina();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  verdadero(doc.querySelector('main'), 'falta <main>');
  igual(doc.querySelectorAll('script').length, 0);
  igual(CORREO_PRIVACIDAD, 'carlos57garavito00@gmail.com');
  for (const t of [CORREO_PRIVACIDAD, 'Ley 1581 de 2012', '2026-11-13', 'Firebase', 'Borrar todo']) {
    verdadero(doc.querySelector('main').textContent.includes(t), `falta "${t}"`);
  }
  verdadero(doc.querySelector('meta[name=viewport]'), 'falta viewport');
});

prueba('privacidad: dice que «Borrar todo» borra también Match, lugares con fotos y avisos', async () => {
  const main = new DOMParser().parseFromString(await pagina(), 'text/html').querySelector('main').textContent.replace(/\s+/g, ' ');
  verdadero(main.includes('los votos y coincidencias del Match, los lugares del mapa con sus notas y fotos'), 'falta decir que borra Match y lugares');
  verdadero(main.includes('Los avisos que estuvieran por enviarse se descartan'), 'falta lo de los avisos');
  verdadero(!main.includes('todavía no se borran'), 'quedó el texto viejo');
});

prueba('privacidad: nombra los servicios de mapas que reciben datos', async () => {
  const main = new DOMParser().parseFromString(await pagina(), 'text/html').querySelector('main').textContent;
  for (const s of ['OpenFreeMap', 'Photon', 'OSRM']) verdadero(main.includes(s), `falta ${s}`);
});

prueba('privacidad: aclara que el código y los nombres los ve quien tenga el código', async () => {
  const main = new DOMParser().parseFromString(await pagina(), 'text/html').querySelector('main').textContent.replace(/\s+/g, ' ');
  verdadero(main.includes('quien tenga el código'), 'falta la aclaración del código');
});

prueba('privacidad: volver regresa a donde estabas (p. ej. la bienvenida)', async () => {
  const div = document.createElement('div');
  let atras = 0;
  await pantallaPrivacidad(div, {}, { fetch: async () => new Response('<main><h1>P</h1></main>'), atras: () => { atras++; } });
  const volver = div.querySelector('a.volver');
  igual(volver.textContent, '← Atrás');
  volver.click();
  igual(atras, 1);
});

prueba('privacidad: la URL pública es la de GitHub Pages', () => {
  igual(URL_PRIVACIDAD, 'https://carlosgmx7.github.io/okupa/privacidad.html');
});

prueba('privacidad: en la app pinta el <main> sin scripts ni estilos', async () => {
  const div = document.createElement('div');
  const html = '<html><head><style>p{}</style></head><body><main><h1>Política</h1><p>Hola</p><script>x()</script></main></body></html>';
  await pantallaPrivacidad(div, {}, { fetch: async () => new Response(html) });
  verdadero(div.textContent.includes('Política') && div.textContent.includes('Hola'), div.textContent);
  igual(div.querySelectorAll('script, style').length, 0);
  verdadero(div.querySelector('a.volver'), 'falta volver');
});

prueba('privacidad: sin poder leerla muestra el enlace público', async () => {
  const div = document.createElement('div');
  await pantallaPrivacidad(div, {}, { fetch: async () => { throw new Error('sin red'); } });
  igual(div.querySelector(`a[href="${URL_PRIVACIDAD}"]`) !== null, true);
});
