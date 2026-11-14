// Aplica el tema elegido. index.html hace lo mismo antes de pintar (para que no se vea un destello).
import { TEMAS, LETRAS } from './ajustes.js';

// Tamaño de letra: normal no lleva atributo; las reglas de css/base.css agrandan lo demás.
export function aplicarLetra(letra, doc = document) {
  if (LETRAS.includes(letra) && letra !== 'normal') doc.documentElement.dataset.letra = letra;
  else doc.documentElement.removeAttribute('data-letra');
}

export const COLOR_BARRA = { vino: '#140a0e', grafito: '#0E0E11' };

export function aplicarTema(tema, doc = document) {
  const final = TEMAS.includes(tema) ? tema : 'vino';
  doc.documentElement.dataset.tema = final;
  const meta = doc.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = COLOR_BARRA[final];
}
