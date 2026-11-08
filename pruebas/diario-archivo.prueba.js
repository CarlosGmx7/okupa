import { prueba, igual, verdadero } from './corredor.js';
import { parejaDiario, itemsDe, hasta, salir, boton, esperar, FECHA } from './diario-pantallas.prueba.js';
import { abrirDia, enviar } from '../js/modulos/diario/dia.js';
import { filtrarArchivo, ocultarDia, ocultosDe } from '../js/modulos/diario/archivo.js';
import { almacenEnMemoria } from './pareja.prueba.js';

const entrada = (fecha, tema, texto, ra, rb, comentario = '') => ({
  fecha, preguntas: [{ tema, texto, coincidencia: 'debate', a: { respuesta: ra, comentario }, b: { respuesta: rb, comentario: '' } }],
});
const ENTRADAS = [
  entrada('2026-11-03', 'musica', '¿Salsa o rap?', 'Rap', 'Salsa'),
  entrada('2026-11-04', 'futuro_pareja', '¿Tendríamos hijos?', 'Sí', 'No sé', 'Me encantaría una niña'),
  entrada('2026-12-01', 'dilema', '¿Viajarías al pasado?', 'Al pasado', 'Al futuro'),
];
const fechas = (lista) => lista.map((e) => e.fecha);

prueba('archivo: busca por palabra sin importar tildes ni mayúsculas, en preguntas, respuestas y comentarios', () => {
  igual(fechas(filtrarArchivo(ENTRADAS, { palabra: 'NIÑA' })), ['2026-11-04']);
  igual(fechas(filtrarArchivo(ENTRADAS, { palabra: 'tendriamos' })), ['2026-11-04']);
  igual(fechas(filtrarArchivo(ENTRADAS, { palabra: 'salsa' })), ['2026-11-03']);
  igual(fechas(filtrarArchivo(ENTRADAS, { palabra: '   ' })), fechas(ENTRADAS));
});

prueba('archivo: filtra por tema, por día y por mes', () => {
  igual(fechas(filtrarArchivo(ENTRADAS, { tema: 'dilema' })), ['2026-12-01']);
  igual(fechas(filtrarArchivo(ENTRADAS, { fecha: '2026-11-04' })), ['2026-11-04']);
  igual(fechas(filtrarArchivo(ENTRADAS, { fecha: '2026-11' })), ['2026-11-03', '2026-11-04']);
});

prueba('archivo: los días borrados se ocultan solo en este celular', () => {
  const alm1 = almacenEnMemoria();
  const alm2 = almacenEnMemoria();
  ocultarDia(alm1, 'K7PQ2M', '2026-11-03');
  igual(fechas(filtrarArchivo(ENTRADAS, { ocultos: ocultosDe(alm1, 'K7PQ2M') })), ['2026-11-04', '2026-12-01']);
  igual(fechas(filtrarArchivo(ENTRADAS, { ocultos: ocultosDe(alm2, 'K7PQ2M') })), fechas(ENTRADAS));
  igual([...ocultosDe(alm1, 'OTRA22')], [], 'cada pareja tiene lo suyo');
});

async function dosDiasRevelados() {
  const p = await parejaDiario({ perfiles: true });
  for (const [fecha, comentario] of [['2026-11-04', 'nos fuimos a la playa'], [FECHA, '']]) {
    const dia = await abrirDia(p.a.nube, p.a.pareja, { fecha, datos: p.datos });
    await enviar(p.a.nube, p.a.pareja, fecha, 'gustos', { items: itemsDe(p.datos, dia, { comentario }) });
    await enviar(p.b.nube, p.b.pareja, fecha, 'gustos', { items: itemsDe(p.datos, dia) });
  }
  return p;
}

prueba('archivo pantalla: muestra cada día revelado con las preguntas y lo que respondió cada uno', async () => {
  const { a } = await dosDiasRevelados();
  await a.pantallas.historial(a.div, {}, a.ctx);
  await hasta(() => a.div.querySelectorAll('.archivo-dia').length === 2);
  verdadero(a.div.textContent.includes('Archivo'), 'se llama Archivo');
  const dia = a.div.querySelector('.archivo-dia');
  igual(dia.querySelectorAll('.archivo-pregunta').length, 3);
  verdadero(dia.textContent.includes('Carlos') && dia.textContent.includes('Sofi'), dia.textContent);
  salir();
});

prueba('archivo pantalla: buscar por palabra deja solo los días que la tienen', async () => {
  const { a } = await dosDiasRevelados();
  await a.pantallas.historial(a.div, {}, a.ctx);
  await hasta(() => a.div.querySelectorAll('.archivo-dia').length === 2);
  const buscar = a.div.querySelector('input[type="search"]');
  buscar.value = 'playa';
  buscar.dispatchEvent(new Event('input'));
  await hasta(() => a.div.querySelectorAll('.archivo-dia').length === 1);
  verdadero(a.div.querySelector('.archivo-dia').textContent.includes('playa'));
  salir();
});

prueba('archivo pantalla: borrar un día lo quita en este celular y el otro lo sigue viendo', async () => {
  const { a, b } = await dosDiasRevelados();
  const original = window.confirm;
  window.confirm = () => true;
  try {
    await a.pantallas.historial(a.div, {}, a.ctx);
    await hasta(() => a.div.querySelectorAll('.archivo-dia').length === 2);
    a.div.querySelector('.archivo-dia button[aria-label^="Borrar"]').click();
    await hasta(() => a.div.querySelectorAll('.archivo-dia').length === 1);
  } finally { window.confirm = original; }
  salir();
  await esperar();
  await b.pantallas.historial(b.div, {}, b.ctx);
  await hasta(() => b.div.querySelectorAll('.archivo-dia').length === 2);
  salir();
});
