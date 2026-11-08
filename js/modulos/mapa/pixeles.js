// Convierte los cuadros del mapa real (OpenStreetMap) en píxeles grandes con paleta tipo Minecraft.

export const PALETA = {
  agua: [63, 118, 228],
  pasto: [93, 158, 53],
  via: [198, 198, 198],
  suelo: [219, 211, 160],
  edificio: [150, 108, 74],
  texto: [58, 46, 42],
};

// Colores típicos del estilo estándar de OpenStreetMap → bloque de la paleta.
const REFERENCIAS = [
  [[170, 211, 223], 'agua'], [[181, 208, 208], 'agua'],
  [[200, 250, 204], 'pasto'], [[173, 209, 158], 'pasto'], [[205, 235, 176], 'pasto'], [[223, 252, 226], 'pasto'], [[238, 240, 213], 'pasto'],
  [[255, 255, 255], 'via'], [[247, 250, 191], 'via'], [[252, 214, 164], 'via'], [[248, 178, 156], 'via'],
  [[242, 239, 233], 'suelo'], [[224, 223, 223], 'suelo'], [[235, 219, 232], 'suelo'],
  [[217, 208, 201], 'edificio'], [[196, 182, 171], 'edificio'],
];

export function colorPixel(r, g, b) {
  if (0.299 * r + 0.587 * g + 0.114 * b < 110) return PALETA.texto;
  let mejor = 'suelo';
  let menor = Infinity;
  for (const [[rr, gg, bb], nombre] of REFERENCIAS) {
    const d = (r - rr) ** 2 + (g - gg) ** 2 + (b - bb) ** 2;
    if (d < menor) { menor = d; mejor = nombre; }
  }
  return PALETA[mejor];
}

// Dibuja `imagen` (256×256) reducida a `lado`×`lado` y recoloreada; el canvas se muestra ampliado
// con `image-rendering: pixelated`, así cada píxel queda como un bloque.
export function pixelarCuadro(imagen, lado = 64) {
  const lienzo = document.createElement('canvas');
  lienzo.width = lado;
  lienzo.height = lado;
  const c = lienzo.getContext('2d', { willReadFrequently: true });
  c.imageSmoothingEnabled = true;
  c.drawImage(imagen, 0, 0, lado, lado);
  const datos = c.getImageData(0, 0, lado, lado);
  const p = datos.data;
  for (let i = 0; i < p.length; i += 4) {
    const [r, g, b] = colorPixel(p[i], p[i + 1], p[i + 2]);
    p[i] = r; p[i + 1] = g; p[i + 2] = b; p[i + 3] = 255;
  }
  c.putImageData(datos, 0, 0);
  return lienzo;
}
