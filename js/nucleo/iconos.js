// Íconos de línea del tema Grafito. Cada ícono lleva el glifo de siempre (tema vino) y su versión
// en SVG; el CSS muestra uno u otro según el tema, así que cambiar de tema no exige repintar.
// Trazos basados en Lucide (ISC) y Feather (MIT): https://lucide.dev — https://feathericons.com
const SVG = 'http://www.w3.org/2000/svg';

const corazon = '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>';
const lapiz = '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>';
const musica = '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>';
const destello = '<path d="M12 3c.5 4.5 2 6.5 6 7-4 .5-5.5 2.5-6 7-.5-4.5-2-6.5-6-7 4-.5 5.5-2.5 6-7Z"/>';

export const ICONOS_LINEA = {
  '∞': '<path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z"/>',
  '☼': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  '⌖': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  '♥': corazon,
  '♡': '<path d="M8 22h8"/><path d="M12 15v7"/><path d="M7 10h10"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"/>',
  '★': '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  '✦': destello,
  '✉': '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  '✧': '<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>',
  '❖': '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  '✈': '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  '☀': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  '✎': lapiz,
  '✐': lapiz,
  'ϟ': '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  '❦': '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  '⚭': '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>',
  '◐': '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  '☾': '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  '◈': '<path d="M12 2 22 12 12 22 2 12z"/><path d="m12 7 5 5-5 5-5-5z"/>',
  '⌂': '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  '⚖': '<path d="M12 3v18"/><path d="M5 21h14"/><path d="M3 7h18"/><path d="m6 7-3 7a3 3 0 0 0 6 0z"/><path d="m18 7-3 7a3 3 0 0 0 6 0z"/>',
  '♜': '<path d="M5 21h14"/><path d="M6 21v-3h12v3"/><path d="m8 18 1-9h6l1 9"/><path d="M6 4v3h12V4h-2.5v1.5h-2V4h-3v1.5h-2V4z"/>',
  '⚗': '<path d="M9 2v6l-5 10a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3L15 8V2"/><path d="M8 2h8"/><path d="M6.5 15h11"/>',
  '∑': '<path d="M18 7V4H6l6 8-6 8h12v-3"/>',
  '◎': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  '♪': musica,
  '♫': musica,
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
};

export function iconoLinea(nombre, clase = 'ico-linea') {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', clase);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  // Los trazos son constantes de este archivo, nunca datos del usuario.
  svg.innerHTML = ICONOS_LINEA[nombre] || '';
  return svg;
}

export function icono(glifo) {
  const span = document.createElement('span');
  span.className = 'ico';
  span.setAttribute('aria-hidden', 'true');
  const texto = document.createElement('span');
  texto.className = 'ico-glifo';
  texto.textContent = glifo ?? '';
  span.append(texto);
  if (ICONOS_LINEA[glifo] && glifo !== 'ajustes') {
    span.classList.add('con-linea');
    span.append(iconoLinea(glifo));
  }
  return span;
}
