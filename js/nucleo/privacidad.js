// Pantalla #/privacidad: muestra privacidad.html (que también se puede abrir sola, sin la app).
import { el } from './ui.js';

export const CORREO_PRIVACIDAD = 'carlos57garavito00@gmail.com';
export const URL_PRIVACIDAD = 'https://carlosgmx7.github.io/okupa/privacidad.html';

export async function pantallaPrivacidad(contenedor, _params, ctx = {}) {
  const leer = ctx.fetch || ((url) => fetch(url));
  const volver = el('a', { clase: 'volver', href: '#/ajustes' }, '← Ajustes');
  const cuerpo = el('div', { clase: 'privacidad' }, el('p', { clase: 'subtitulo', role: 'status' }, 'Cargando…'));
  contenedor.append(volver, cuerpo);
  try {
    const r = await leer('privacidad.html');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const main = new DOMParser().parseFromString(await r.text(), 'text/html').querySelector('main');
    if (!main) throw new Error('sin <main>');
    main.querySelectorAll('script, style, link').forEach((n) => n.remove());
    cuerpo.replaceChildren(...[...main.childNodes].map((n) => document.importNode(n, true)));
  } catch {
    cuerpo.replaceChildren(
      el('h1', { clase: 'titulo-pantalla' }, 'Política de privacidad'),
      el('p', {}, 'No se pudo abrir aquí. Puedes leerla en ', el('a', { href: URL_PRIVACIDAD, target: '_blank', rel: 'noopener' }, 'esta página'), '.'));
  }
}
