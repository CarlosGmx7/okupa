import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearPareja, unirse as unirsePareja, miPareja } from '../js/nucleo/pareja.js';
import { guardarEsperando, textoEsperando, CLAVE_ESPERANDO } from '../js/nucleo/esperando.js';
import { esDeEsteCelular } from '../js/nucleo/almacen.js';
import { crearSala as crearSalaTrivia } from '../js/modulos/trivia/sala.js';
import { crearSala as crearSalaProbable } from '../js/modulos/probable/sala.js';
import trivia from '../js/modulos/trivia/modulo.js';
import probable from '../js/modulos/probable/modulo.js';

const COD = 'K7PQ2M';
const YO = { codigo: COD, lugar: 'a' };
const SALA_DE_SOFI = { id: 'q-abcd', anfitrion: 'b', nombre: 'Sofi' };

prueba('esperando: la sala del otro dice «<nombre> te está esperando»', () => {
  const almacen = almacenEnMemoria();
  guardarEsperando(almacen, COD, 'probable', SALA_DE_SOFI);
  igual(textoEsperando(almacen, YO, 'probable'), 'Sofi te está esperando');
  igual(textoEsperando(almacen, YO, 'trivia'), null, 'el otro juego no se mezcla');
});

prueba('esperando: la sala propia o la copia de otra pareja no dicen nada', () => {
  const almacen = almacenEnMemoria();
  guardarEsperando(almacen, COD, 'trivia', { id: 'p-1', anfitrion: 'a', nombre: 'Carlos' });
  igual(textoEsperando(almacen, YO, 'trivia'), null);
  guardarEsperando(almacen, 'ZZZZZZ', 'trivia', SALA_DE_SOFI);
  igual(textoEsperando(almacen, YO, 'trivia'), null);
  igual(textoEsperando(almacen, { codigo: 'ZZZZZZ', lugar: 'a' }, 'probable'), null);
  igual(textoEsperando(almacenEnMemoria(), YO, 'trivia'), null);
  igual(textoEsperando(almacen, null, 'trivia'), null);
});

prueba('esperando: guardar null la quita y los dos juegos conviven', () => {
  const almacen = almacenEnMemoria();
  guardarEsperando(almacen, COD, 'trivia', { ...SALA_DE_SOFI, id: 'p-1' });
  guardarEsperando(almacen, COD, 'probable', SALA_DE_SOFI);
  igual(textoEsperando(almacen, YO, 'trivia'), 'Sofi te está esperando');
  guardarEsperando(almacen, COD, 'trivia', null);
  igual(textoEsperando(almacen, YO, 'trivia'), null);
  igual(textoEsperando(almacen, YO, 'probable'), 'Sofi te está esperando');
  igual(Object.keys(almacen.leer(CLAVE_ESPERANDO)).sort(), ['codigo', 'probable', 'trivia']);
});

prueba('esperando: un dato raro guardado no rompe', () => {
  const almacen = almacenEnMemoria();
  almacen.escribir(CLAVE_ESPERANDO, { codigo: COD, trivia: 'raro', probable: { id: 3 } });
  igual(textoEsperando(almacen, YO, 'trivia'), null);
  igual(textoEsperando(almacen, YO, 'probable'), null);
});

prueba('esperando: es del celular y no viaja en la copia de seguridad', () => {
  verdadero(esDeEsteCelular(CLAVE_ESPERANDO));
});

async function dosCelulares() {
  const mundo = crearMundoFalso();
  const almA = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), almA, { nombre: 'Carlos' });
  await unirsePareja(mundo.nube('u2'), almacenEnMemoria(), { codigo, nombre: 'Sofi' });
  const ctx = { almacen: almA, nube: async () => mundo.nube('u1'), modulos: [] };
  return { mundo, ctx, codigo, a: { nube: mundo.nube('u1'), pareja: { codigo, lugar: 'a' } }, b: { nube: mundo.nube('u2'), pareja: { codigo, lugar: 'b' } } };
}

prueba('esperando: el precalentar de Trivia y de Probable guarda la sala del otro', async () => {
  const { ctx, a, b } = await dosCelulares();
  const yo = miPareja(ctx.almacen);
  igual(textoEsperando(ctx.almacen, yo, 'trivia'), null);
  await crearSalaTrivia(b.nube, b.pareja, { preguntas: [], id: 'p-sofi1' });
  await crearSalaProbable(b.nube, b.pareja, { tema: 'divertidas', frases: [] , id: 'q-sofi1' });
  await trivia.precalentar(ctx);
  await probable.precalentar(ctx);
  igual(textoEsperando(ctx.almacen, yo, 'trivia'), 'Sofi te está esperando');
  igual(textoEsperando(ctx.almacen, yo, 'probable'), 'Sofi te está esperando');
  igual(trivia.accesoJuntos.detalle(ctx), 'Sofi te está esperando');
  igual(probable.accesoJuntos.detalle(ctx), 'Sofi te está esperando');
  // Si la sala se cierra, el siguiente precalentar lo borra.
  await b.nube.escribir('parejas/' + a.pareja.codigo + '/probable/q-sofi1', { estado: 'cancelada' }, { combinar: true });
  await probable.precalentar(ctx);
  igual(textoEsperando(ctx.almacen, yo, 'probable'), null);
});

prueba('esperando: mi propia sala no cuenta y sin pareja o sin red no lanza', async () => {
  const { ctx, a } = await dosCelulares();
  await crearSalaProbable(a.nube, a.pareja, { tema: 'divertidas', frases: [], id: 'q-mia01' });
  await probable.precalentar(ctx);
  igual(textoEsperando(ctx.almacen, miPareja(ctx.almacen), 'probable'), null);
  await trivia.precalentar({ almacen: almacenEnMemoria(), nube: async () => { throw new Error('x'); } });
  await trivia.precalentar({ almacen: ctx.almacen, nube: async () => { throw new Error('sin red'); } });
  await probable.precalentar({ almacen: ctx.almacen, nube: async () => { throw new Error('sin red'); } });
  await probable.precalentar(undefined);
});
