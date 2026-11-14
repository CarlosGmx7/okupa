import { prueba, igual, verdadero } from './corredor.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { nombreCopia, validadoresDe, abrirHojaRecuperar } from '../js/nucleo/respaldo.js';

const esperar = () => new Promise((r) => setTimeout(r, 100));
const boton = (raiz, texto) => [...raiz.querySelectorAll('button')].find((b) => b.textContent === texto);

function elegirArchivo(hoja, contenido) {
  const input = hoja.querySelector('input[type=file]');
  const dt = new DataTransfer();
  dt.items.add(new File([contenido], 'copia.json', { type: 'application/json' }));
  input.files = dt.files;
  input.dispatchEvent(new Event('change'));
}

prueba('respaldo: el archivo se llama okupa-copia con la fecha local', () => {
  igual(nombreCopia(new Date(2026, 10, 3)), 'okupa-copia-2026-11-03.json');
});

prueba('respaldo: validadoresDe junta los de los módulos', () => {
  const f = () => true;
  const g = () => false;
  igual(Object.keys(validadoresDe([{ validadoresRespaldo: { 'okupa:x': f } }, {}, { validadoresRespaldo: { 'okupa:y': g } }])), ['okupa:x', 'okupa:y']);
  igual(validadoresDe([{ validadoresRespaldo: { 'okupa:x': f } }])['okupa:x'], f);
});

prueba('respaldo: un archivo que no es JSON se rechaza', async () => {
  const hoja = abrirHojaRecuperar(almacenEnMemoria(), {}, () => {});
  try {
    elegirArchivo(hoja, 'esto no es json');
    await esperar();
    igual(hoja.querySelector('[role=status]').textContent, 'Ese archivo no se pudo leer. ¿Es una copia de Okupa?');
    igual(boton(hoja, 'Reemplazar todo'), undefined);
  } finally { hoja.remove(); }
});

prueba('respaldo: un JSON que no es copia de Okupa se rechaza', async () => {
  const hoja = abrirHojaRecuperar(almacenEnMemoria(), {}, () => {});
  try {
    elegirArchivo(hoja, '{"hola": 1}');
    await esperar();
    verdadero(hoja.querySelector('[role=status]').textContent.includes('no es una copia de Okupa'));
  } finally { hoja.remove(); }
});

prueba('respaldo: recuperar reemplazando conserva la pareja y avisa al terminar', async () => {
  const almacen = almacenEnMemoria();
  almacen.escribir('okupa:pareja:actual', { codigo: 'AAAAAA', lugar: 'a' });
  let terminado = false;
  const hoja = abrirHojaRecuperar(almacen, {}, () => { terminado = true; });
  try {
    elegirArchivo(hoja, JSON.stringify({ app: 'okupa', version: 1, fecha: 'x', datos: {
      'okupa:pareja:actual': { codigo: 'BBBBBB', lugar: 'b' }, 'okupa:portada': 'data:image/png;base64,AA',
    } }));
    await esperar();
    boton(hoja, 'Reemplazar todo').click();
    igual(almacen.leer('okupa:pareja:actual'), { codigo: 'AAAAAA', lugar: 'a' });
    igual(almacen.leer('okupa:portada'), 'data:image/png;base64,AA');
    verdadero(hoja.querySelector('[role=status]').textContent.startsWith('Listo'));
    boton(hoja, 'Listo').click();
    igual(terminado, true);
    igual(hoja.isConnected, false);
  } finally { hoja.remove(); }
});
