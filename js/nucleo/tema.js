// Aplica el tema elegido. index.html hace lo mismo antes de pintar (para que no se vea un destello).
import { TEMAS } from './ajustes.js';

export const COLOR_BARRA = { vino: '#140a0e', grafito: '#0E0E11' };

export function aplicarTema(tema, doc = document) {
  const final = TEMAS.includes(tema) ? tema : 'vino';
  doc.documentElement.dataset.tema = final;
  const meta = doc.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = COLOR_BARRA[final];
}
