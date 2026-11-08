import { prueba, igual, verdadero } from './corredor.js';
import { crearAlmacen } from '../js/nucleo/almacen.js';
import { PORTADA_ORIGINAL, fuentePortada, guardarPortada, borrarPortada, rectFuente, recortarCuadrado } from '../js/nucleo/portada.js';
import { pantallaInicio } from '../js/nucleo/inicio.js';
import { almacenEnMemoria } from './pareja.prueba.js';

const DATO = 'data:image/jpeg;base64,/9j/4AAQ';

prueba('portada: sin foto propia usa la original', () => {
  igual(fuentePortada(almacenEnMemoria()), PORTADA_ORIGINAL);
});

prueba('portada: guarda, usa y borra la foto propia', () => {
  const alm = almacenEnMemoria();
  verdadero(guardarPortada(alm, DATO));
  igual(fuentePortada(alm), DATO);
  borrarPortada(alm);
  igual(fuentePortada(alm), PORTADA_ORIGINAL);
});

prueba('portada: ignora valores guardados que no son imágenes', () => {
  const alm = almacenEnMemoria();
  alm.escribir('okupa:portada', 'javascript:alert(1)');
  igual(fuentePortada(alm), PORTADA_ORIGINAL);
  igual(guardarPortada(alm, 'https://otro.sitio/x.png'), false);
});

prueba('portada: si el celular no deja guardar, avisa con false', () => {
  const falla = () => { throw new Error('lleno'); };
  const alm = crearAlmacen({ getItem: () => null, setItem: falla, removeItem() {}, key: () => null, length: 0 });
  igual(guardarPortada(alm, DATO), false);
});

prueba('portada: rectFuente centra el cuadrado y aplica zoom', () => {
  igual(rectFuente(1000, 500, 1, 0, 0), { sx: 250, sy: 0, lado: 500 });
  igual(rectFuente(1000, 500, 2, 0, 0), { sx: 375, sy: 125, lado: 250 });
});

prueba('portada: rectFuente no se sale de la imagen al mover', () => {
  igual(rectFuente(1000, 500, 1, 9999, -9999), { sx: 500, sy: 0, lado: 500 });
  igual(rectFuente(1000, 500, 2, -9999, 9999), { sx: 0, sy: 250, lado: 250 });
});

prueba('portada: recortarCuadrado entrega un JPEG del lado pedido', async () => {
  const lienzo = document.createElement('canvas');
  lienzo.width = 300;
  lienzo.height = 200;
  lienzo.getContext('2d').fillRect(0, 0, 300, 200);
  const dato = recortarCuadrado(lienzo, { zoom: 1, dx: 0, dy: 0 }, 64);
  verdadero(dato.startsWith('data:image/jpeg'), dato.slice(0, 30));
  const img = new Image();
  await new Promise((listo) => { img.onload = listo; img.src = dato; });
  igual([img.width, img.height], [64, 64]);
});

prueba('inicio: la portada es un botón para cambiar la foto y usa la guardada', () => {
  const alm = almacenEnMemoria();
  guardarPortada(alm, DATO);
  const div = document.createElement('div');
  pantallaInicio(div, {}, { modulos: [], almacen: alm, ir() {}, refrescar() {} });
  const boton = div.querySelector('button.inicio-portada-boton');
  verdadero(boton, 'falta el botón de la portada');
  igual(boton.getAttribute('aria-label'), 'Cambiar foto de inicio');
  igual(boton.querySelector('img').getAttribute('src'), DATO);
});
