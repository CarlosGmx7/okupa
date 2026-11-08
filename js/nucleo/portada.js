// Foto de inicio de cada celular: se elige de la galería, se encuadra en un círculo y se guarda
// solo en este celular. Sin foto propia se usa la original.
import { el } from './ui.js';

export const PORTADA_ORIGINAL = 'iconos/portada-circular.png';
const CLAVE = 'okupa:portada';
const LADO_GUARDADO = 512;
const LADO_VISTA = 280;
const ZOOM_MAX = 4;

const esImagen = (v) => typeof v === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(v);

export function fuentePortada(almacen) {
  const guardada = almacen?.leer(CLAVE, null);
  return esImagen(guardada) ? guardada : PORTADA_ORIGINAL;
}

export function guardarPortada(almacen, dato) {
  if (!esImagen(dato)) return false;
  return almacen.escribir(CLAVE, dato);
}

export function borrarPortada(almacen) {
  almacen.borrar(CLAVE);
}

// Cuadrado de la imagen que se verá: lado según el zoom, centro movido (dx, dy) en píxeles de la
// imagen, sin salirse de ella.
export function rectFuente(ancho, alto, zoom, dx, dy) {
  const lado = Math.min(ancho, alto) / Math.max(1, zoom);
  const limitar = (v, max) => Math.min(Math.max(v, 0), max);
  return {
    sx: limitar(ancho / 2 + dx - lado / 2, ancho - lado),
    sy: limitar(alto / 2 + dy - lado / 2, alto - lado),
    lado,
  };
}

const medidas = (fuente) => [fuente.naturalWidth || fuente.width, fuente.naturalHeight || fuente.height];

function dibujar(lienzo, fuente, { zoom, dx, dy }) {
  const [ancho, alto] = medidas(fuente);
  const r = rectFuente(ancho, alto, zoom, dx, dy);
  const c = lienzo.getContext('2d');
  c.fillStyle = '#140a0e';
  c.fillRect(0, 0, lienzo.width, lienzo.height);
  c.drawImage(fuente, r.sx, r.sy, r.lado, r.lado, 0, 0, lienzo.width, lienzo.height);
  return r;
}

export function recortarCuadrado(fuente, encuadre, lado = LADO_GUARDADO) {
  const lienzo = document.createElement('canvas');
  lienzo.width = lado;
  lienzo.height = lado;
  dibujar(lienzo, fuente, encuadre);
  return lienzo.toDataURL('image/jpeg', 0.85);
}

function cargarImagen(archivo) {
  return new Promise((listo, fallo) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); listo(img); };
    img.onerror = () => { URL.revokeObjectURL(url); fallo(new Error('imagen-ilegible')); };
    img.src = url;
  });
}

// Hoja para elegir y encuadrar la foto. Llama `alTerminar()` si cambió algo.
export function abrirEditorPortada(almacen, alTerminar = () => {}) {
  const encuadre = { zoom: 1, dx: 0, dy: 0 };
  let imagen = null;
  const lienzo = el('canvas', { clase: 'portada-lienzo', width: String(LADO_VISTA * 2), height: String(LADO_VISTA * 2), 'aria-label': 'Vista previa de la foto' });
  const mensaje = el('p', { clase: 'campo-ayuda', role: 'status' }, 'Elige una foto de tu galería.');
  const zoom = el('input', { type: 'range', min: '1', max: String(ZOOM_MAX), step: '0.01', value: '1', disabled: true, 'aria-label': 'Acercar' });
  const archivo = el('input', { type: 'file', accept: 'image/*', hidden: true });
  const guardar = el('button', { clase: 'boton boton-principal', type: 'button', disabled: true }, 'Guardar');

  const pintar = () => { if (imagen) dibujar(lienzo, imagen, encuadre); };
  const cerrar = () => { hoja.remove(); document.removeEventListener('keydown', alTeclear); };
  const alTeclear = (e) => { if (e.key === 'Escape') cerrar(); };

  archivo.addEventListener('change', async () => {
    const f = archivo.files?.[0];
    if (!f) return;
    try {
      imagen = await cargarImagen(f);
    } catch {
      mensaje.textContent = 'No pudimos abrir esa foto. Prueba con otra.';
      return;
    }
    Object.assign(encuadre, { zoom: 1, dx: 0, dy: 0 });
    zoom.value = '1';
    zoom.disabled = false;
    guardar.disabled = false;
    mensaje.textContent = 'Arrastra para mover y usa la barra (o pellizca) para acercar.';
    pintar();
  });
  zoom.addEventListener('input', () => { encuadre.zoom = Number(zoom.value); pintar(); });

  // Arrastrar con un dedo mueve; con dos dedos, pellizcar acerca.
  const punteros = new Map();
  let distanciaInicial = 0;
  let zoomInicial = 1;
  const distancia = () => { const [a, b] = [...punteros.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  lienzo.addEventListener('pointerdown', (e) => {
    if (!imagen) return;
    lienzo.setPointerCapture?.(e.pointerId);
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.size === 2) { distanciaInicial = distancia(); zoomInicial = encuadre.zoom; }
  });
  lienzo.addEventListener('pointermove', (e) => {
    const antes = punteros.get(e.pointerId);
    if (!antes || !imagen) return;
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.size >= 2) {
      encuadre.zoom = Math.min(ZOOM_MAX, Math.max(1, zoomInicial * (distancia() / (distanciaInicial || 1))));
      zoom.value = String(encuadre.zoom);
    } else {
      const [ancho, alto] = medidas(imagen);
      const r = rectFuente(ancho, alto, encuadre.zoom, encuadre.dx, encuadre.dy);
      const escala = r.lado / lienzo.getBoundingClientRect().width;
      // Se guarda el centro ya limitado para que el arrastre no "acumule" fuera de la imagen.
      encuadre.dx = r.sx + r.lado / 2 - ancho / 2 - (e.clientX - antes.x) * escala;
      encuadre.dy = r.sy + r.lado / 2 - alto / 2 - (e.clientY - antes.y) * escala;
    }
    pintar();
  });
  const soltar = (e) => punteros.delete(e.pointerId);
  lienzo.addEventListener('pointerup', soltar);
  lienzo.addEventListener('pointercancel', soltar);

  guardar.addEventListener('click', () => {
    if (!imagen) return;
    if (!guardarPortada(almacen, recortarCuadrado(imagen, encuadre))) {
      mensaje.textContent = 'Este celular no dejó guardar la foto (¿sin espacio?). Sigue la anterior.';
      return;
    }
    cerrar();
    alTerminar();
  });

  const hoja = el('div', { clase: 'hoja-fondo', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Foto de inicio',
    onclick: (e) => { if (e.target === hoja) cerrar(); } },
  el('div', { clase: 'hoja' },
    el('h2', {}, 'Foto de inicio'),
    el('p', { clase: 'campo-ayuda' }, 'Solo cambia en este celular.'),
    el('div', { clase: 'portada-marco' }, lienzo),
    mensaje,
    zoom,
    archivo,
    el('div', { clase: 'hoja-acciones' },
      el('button', { clase: 'boton', type: 'button', onclick: () => archivo.click() }, 'Elegir de la galería'),
      guardar),
    el('div', { clase: 'hoja-acciones' },
      el('button', {
        clase: 'boton-texto', type: 'button',
        onclick: () => { borrarPortada(almacen); cerrar(); alTerminar(); },
      }, 'Volver a la foto original'),
      el('button', { clase: 'boton-texto', type: 'button', onclick: cerrar }, 'Cancelar'))));

  // Mientras no hay foto nueva, se muestra la actual.
  const actual = new Image();
  actual.onload = () => { if (!imagen) dibujar(lienzo, actual, { zoom: 1, dx: 0, dy: 0 }); };
  actual.src = fuentePortada(almacen);

  document.addEventListener('keydown', alTeclear);
  document.body.append(hoja);
  return hoja;
}
