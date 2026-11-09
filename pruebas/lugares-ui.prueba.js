import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { crearLugar, listarLugares, guardarVersion, agregarFoto, listarFotos, MAX_FOTOS } from '../js/modulos/mapa/lugares.js';
import { abrirFormularioLugar, abrirFichaLugar } from '../js/modulos/mapa/lugares-ui.js';

const parejaDe = (lugar) => ({ codigo: 'ABC234', lugar, nombres: { a: 'Carlos', b: 'Yuli' } });
const esperar = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const boton = (hoja, texto) => [...hoja.querySelectorAll('button')].find((b) => b.textContent.includes(texto));
const conHoja = async (fn) => {
  try { return await fn(); } finally { document.querySelectorAll('.hoja-fondo').forEach((h) => h.remove()); }
};

prueba('lugares-ui: el formulario guarda un lugar tocado en el mapa', () => conHoja(async () => {
  const mundo = crearMundoFalso();
  let guardado = 0;
  const hoja = await abrirFormularioLugar({ nube: mundo.nube('u1'), pareja: parejaDe('a'), punto: { lat: 6.25, lng: -75.56 }, alGuardar: () => guardado++ });
  hoja.querySelector('input[name=nombre]').value = 'Comuna 13';
  boton(hoja, 'Guardar').click();
  await esperar();
  const lista = await listarLugares(mundo.nube('u2'), parejaDe('b'));
  igual(lista.map((l) => [l.nombre, l.lat, l.lng, l.tipo]), [['Comuna 13', 6.25, -75.56, 'deseo']]);
  igual(guardado, 1);
  igual(document.querySelector('.hoja-fondo'), null, 'se cierra');
}));

prueba('lugares-ui: buscar y escoger un resultado llena el nombre y el punto', () => conHoja(async () => {
  const mundo = crearMundoFalso();
  const buscar = async () => [{ nombre: 'Cartagena', detalle: 'Bolívar, Colombia', lat: 10.42, lng: -75.54 }];
  const hoja = await abrirFormularioLugar({ nube: mundo.nube('u1'), pareja: parejaDe('a'), buscar, alGuardar() {} });
  const campo = hoja.querySelector('input[type=search]');
  campo.value = 'carta';
  boton(hoja, 'Buscar').click();
  await esperar();
  boton(hoja, 'Cartagena').click();
  igual(hoja.querySelector('input[name=nombre]').value, 'Cartagena');
  boton(hoja, 'Guardar').click();
  await esperar();
  const [l] = await listarLugares(mundo.nube('u1'), parejaDe('a'));
  igual([l.lat, l.lng], [10.42, -75.54]);
}));

prueba('lugares-ui: sin punto ni resultado escogido no deja guardar', () => conHoja(async () => {
  const mundo = crearMundoFalso();
  const hoja = await abrirFormularioLugar({ nube: mundo.nube('u1'), pareja: parejaDe('a'), alGuardar() {} });
  hoja.querySelector('input[name=nombre]').value = 'Algún lado';
  boton(hoja, 'Guardar').click();
  await esperar();
  verdadero(hoja.querySelector('.error-formulario').textContent.length > 0);
  igual(await listarLugares(mundo.nube('u1'), parejaDe('a')), []);
}));

prueba('lugares-ui: en un deseo, "¡Fuimos!" lo vuelve recuerdo', () => conHoja(async () => {
  const mundo = crearMundoFalso();
  const { id } = await crearLugar(mundo.nube('u1'), parejaDe('a'), { nombre: 'Salento', lat: 4.63, lng: -75.57, tipo: 'deseo' });
  const [lugar] = await listarLugares(mundo.nube('u1'), parejaDe('a'));
  let cambios = 0;
  const hoja = await abrirFichaLugar({ nube: mundo.nube('u1'), pareja: parejaDe('a'), lugar, alCambiar: () => cambios++ });
  boton(hoja, '¡Fuimos!').click();
  await esperar();
  const [despues] = await listarLugares(mundo.nube('u1'), parejaDe('a'));
  igual(despues.tipo, 'recuerdo');
  verdadero(/^\d{4}-\d{2}-\d{2}$/.test(despues.fecha));
  verdadero(cambios >= 1);
  igual(despues.id, id);
}));

prueba('lugares-ui: la versión del otro se ve solo después de escribir la propia', () => conHoja(async () => {
  const mundo = crearMundoFalso();
  await crearLugar(mundo.nube('u1'), parejaDe('a'), { nombre: 'Guatapé', lat: 6.23, lng: -75.16, tipo: 'recuerdo', fecha: '2026-10-01' });
  const [lugar] = await listarLugares(mundo.nube('u1'), parejaDe('a'));
  await guardarVersion(mundo.nube('u2'), parejaDe('b'), lugar.id, 'Subimos la piedra sin parar');
  const hoja = await abrirFichaLugar({ nube: mundo.nube('u1'), pareja: parejaDe('a'), lugar, alCambiar() {} });
  for (let i = 0; i < 50 && !hoja.textContent.includes('Yuli ya escribió la suya'); i++) await esperar(20);
  verdadero(!hoja.textContent.includes('Subimos la piedra'), 'no debe verse aún');
  verdadero(hoja.textContent.includes('Yuli ya escribió la suya'), hoja.textContent.slice(0, 200));
  hoja.querySelector('textarea').value = 'Me dio vértigo arriba';
  boton(hoja, 'Guardar mi versión').click();
  await esperar(60);
  verdadero(hoja.textContent.includes('Subimos la piedra sin parar'));
  verdadero(hoja.textContent.includes('Me dio vértigo arriba'));
}));

async function archivosPng(n) {
  const archivos = [];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('canvas');
    c.width = 40 + i;
    c.height = 30;
    c.getContext('2d').fillRect(0, 0, 10, 10);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    archivos.push(new File([blob], `foto${i}.png`, { type: 'image/png' }));
  }
  return archivos;
}

async function elegirArchivos(hoja, archivos) {
  const input = hoja.querySelector('input[type=file]');
  verdadero(input.multiple, 'el selector debe permitir escoger varias');
  const dt = new DataTransfer();
  archivos.forEach((f) => dt.items.add(f));
  input.files = dt.files;
  input.dispatchEvent(new Event('change'));
}

prueba('lugares-ui: se pueden escoger y subir varias fotos al tiempo', () => conHoja(async () => {
  const mundo = crearMundoFalso();
  const pareja = parejaDe('a');
  await crearLugar(mundo.nube('u1'), pareja, { nombre: 'Guatapé', lat: 6.23, lng: -75.16, tipo: 'recuerdo' });
  const [lugar] = await listarLugares(mundo.nube('u1'), pareja);
  const hoja = await abrirFichaLugar({ nube: mundo.nube('u1'), pareja, lugar, alCambiar() {} });
  await elegirArchivos(hoja, await archivosPng(3));
  for (let i = 0; i < 100 && (await listarFotos(mundo.nube('u1'), pareja, lugar.id)).length < 3; i++) await esperar(30);
  igual((await listarFotos(mundo.nube('u2'), parejaDe('b'), lugar.id)).length, 3);
  await esperar(60);
  igual(hoja.querySelectorAll('.miniatura').length, 3);
}));

prueba('lugares-ui: si escogen más fotos de las que caben, sube las que caben y avisa', () => conHoja(async () => {
  const mundo = crearMundoFalso();
  const pareja = parejaDe('a');
  await crearLugar(mundo.nube('u1'), pareja, { nombre: 'Salento', lat: 4.63, lng: -75.57, tipo: 'recuerdo' });
  const [lugar] = await listarLugares(mundo.nube('u1'), pareja);
  for (let i = 0; i < MAX_FOTOS - 1; i++) await agregarFoto(mundo.nube('u1'), pareja, lugar.id, { datos: 'data:image/jpeg;base64,AA', ancho: 1, alto: 1 });
  const hoja = await abrirFichaLugar({ nube: mundo.nube('u1'), pareja, lugar, alCambiar() {} });
  await elegirArchivos(hoja, await archivosPng(3));
  for (let i = 0; i < 100 && !hoja.textContent.includes('Solo cabía'); i++) await esperar(30);
  igual((await listarFotos(mundo.nube('u1'), pareja, lugar.id)).length, MAX_FOTOS);
  verdadero(hoja.textContent.includes('Solo cabía 1'), hoja.querySelector('[role=status]')?.textContent);
}));

// Nube que tarda en responder, para comprobar que la pantalla no se queda esperando.
export function nubeLenta(nube, ms = 400) {
  const tarde = (fn) => async (...a) => { await esperar(ms); return fn(...a); };
  return { ...nube, leer: tarde(nube.leer), listar: tarde(nube.listar), escribir: tarde(nube.escribir), borrar: tarde(nube.borrar) };
}

prueba('lugares-ui: la ficha de un recuerdo muestra el botón de agregar fotos (sin "[object")', () => conHoja(async () => {
  const mundo = crearMundoFalso();
  const pareja = parejaDe('a');
  await crearLugar(mundo.nube('u1'), pareja, { nombre: 'Jardín', lat: 5.6, lng: -75.8, tipo: 'recuerdo' });
  const [lugar] = await listarLugares(mundo.nube('u1'), pareja);
  const hoja = await abrirFichaLugar({ nube: mundo.nube('u1'), pareja, lugar, alCambiar() {} });
  for (let i = 0; i < 50 && !boton(hoja, 'Agregar fotos'); i++) await esperar(20);
  verdadero(boton(hoja, 'Agregar fotos'), 'falta el botón');
  verdadero(!hoja.textContent.includes('[object'), hoja.textContent);
}));

prueba('lugares-ui: la ficha se abre al instante aunque la red esté lenta', () => conHoja(async () => {
  const mundo = crearMundoFalso();
  const pareja = parejaDe('a');
  await crearLugar(mundo.nube('u1'), pareja, { nombre: 'Barichara', lat: 6.63, lng: -73.22, tipo: 'recuerdo', fecha: '2026-09-01' });
  const [lugar] = await listarLugares(mundo.nube('u1'), pareja);
  await guardarVersion(mundo.nube('u1'), pareja, lugar.id, 'Caminamos el Camino Real');
  const inicio = performance.now();
  const hoja = await abrirFichaLugar({ nube: nubeLenta(mundo.nube('u1')), pareja, lugar, alCambiar() {} });
  verdadero(performance.now() - inicio < 200, `tardó ${Math.round(performance.now() - inicio)} ms`);
  verdadero(hoja.textContent.includes('Recuerdo'), hoja.textContent);
  verdadero(hoja.textContent.includes('Cargando'), 'debe indicar que carga lo demás');
  for (let i = 0; i < 100 && !hoja.textContent.includes('Caminamos el Camino Real'); i++) await esperar(20);
  verdadero(hoja.textContent.includes('Caminamos el Camino Real'));
}));
