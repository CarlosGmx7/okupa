// Franja de solicitud para los miembros (v22). u1 = Carlos (a), u2 = Sofi (b), u3 = el celular nuevo.
import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearPareja, unirse, pedirLugar, miPareja } from '../js/nucleo/pareja.js';
import { montarAvisoSolicitud } from '../js/nucleo/solicitudes-ui.js';

const esperar = (ms = 0) => new Promise((r) => setTimeout(r, ms));
async function hasta(cond, ms = 1000) {
  for (let t = 0; t < ms && !cond(); t += 20) await esperar(20);
  verdadero(cond(), 'no llegó a tiempo');
}
const boton = (div, texto) => [...div.querySelectorAll('button')].find((b) => b.textContent === texto);

async function escenario() {
  const mundo = crearMundoFalso();
  const alm1 = almacenEnMemoria();
  const alm2 = almacenEnMemoria();
  const alm3 = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), alm1, { nombre: 'Carlos' });
  await unirse(mundo.nube('u2'), alm2, { codigo, nombre: 'Sofi' });
  const ctxDe = (uid, almacen) => ({ almacen, nube: async () => mundo.nube(uid) });
  return { mundo, codigo, alm1, alm2, alm3, ctx1: ctxDe('u1', alm1), ctx2: ctxDe('u2', alm2) };
}

prueba('franja: sin solicitudes el contenedor queda vacío', async () => {
  const { ctx1 } = await escenario();
  const div = document.createElement('div');
  const desmontar = montarAvisoSolicitud(div, ctx1);
  await esperar(50);
  igual(div.children.length, 0);
  desmontar();
});

prueba('franja: sin pareja no pinta nada', async () => {
  const { mundo } = await escenario();
  const div = document.createElement('div');
  const desmontar = montarAvisoSolicitud(div, { almacen: almacenEnMemoria(), nube: async () => mundo.nube('u9') });
  await esperar(50);
  igual(div.children.length, 0);
  desmontar();
});

prueba('franja: en el celular del mismo lugar pregunta si eres tú, con Aprobar y Rechazar', async () => {
  const { mundo, codigo, alm3, ctx1 } = await escenario();
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  const div = document.createElement('div');
  const desmontar = montarAvisoSolicitud(div, ctx1);
  await hasta(() => div.querySelector('.franja-solicitud'));
  verdadero(div.textContent.includes('Alguien pide entrar como Carlos desde otro celular. ¿Eres tú?'), div.textContent);
  verdadero(boton(div, 'Aprobar') && boton(div, 'Rechazar'), 'faltan botones');
  desmontar();
});

prueba('franja: en el celular de la pareja dice cuándo entra y solo deja Rechazar', async () => {
  const { mundo, codigo, alm3, ctx2 } = await escenario();
  const pedida = await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  const div = document.createElement('div');
  const desmontar = montarAvisoSolicitud(div, ctx2);
  await hasta(() => div.querySelector('.franja-solicitud'));
  const dia = new Date(pedida.entraMs).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  verdadero(div.textContent.includes(`Carlos pidió entrar desde otro celular. Entrará el ${dia} si nadie lo rechaza.`), div.textContent);
  verdadero(!boton(div, 'Aprobar'), 'no debe poder aprobar');
  verdadero(boton(div, 'Rechazar'), 'falta Rechazar');
  desmontar();
});

prueba('franja: Aprobar pide confirmar y entrega el lugar; cancelar no cambia nada', async () => {
  const { mundo, codigo, alm1, alm3, ctx1 } = await escenario();
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  const div = document.createElement('div');
  const preguntas = [];
  let responder = false;
  const desmontar = montarAvisoSolicitud(div, ctx1, { confirmar: (t) => { preguntas.push(t); return responder; } });
  await hasta(() => boton(div, 'Aprobar'));
  boton(div, 'Aprobar').click();
  await hasta(() => preguntas.length === 1);
  await esperar(30);
  igual(preguntas, ['Este celular quedará por fuera. ¿Aprobar?']);
  igual((await mundo.nube('u1').leer(`parejas/${codigo}`)).lugares.a, 'u1');
  verdadero(!boton(div, 'Aprobar').disabled, 'al cancelar el botón vuelve a estar activo');
  responder = true;
  boton(div, 'Aprobar').click();
  await hasta(() => div.textContent.includes('Pasaste tu lugar a tu celular nuevo'));
  igual((await mundo.nube('u1').leer(`parejas/${codigo}`)).lugares.a, 'u3');
  igual(miPareja(alm1), null, 'este celular quedó por fuera');
  igual(div.querySelectorAll('button').length, 0);
  desmontar();
});

prueba('franja: Rechazar quita la franja y deja la solicitud rechazada', async () => {
  const { mundo, codigo, alm3, ctx2 } = await escenario();
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  const div = document.createElement('div');
  const desmontar = montarAvisoSolicitud(div, ctx2);
  await hasta(() => boton(div, 'Rechazar'));
  boton(div, 'Rechazar').click();
  await hasta(() => !div.querySelector('.franja-solicitud'));
  const sol = await mundo.nube('u1').leer(`parejas/${codigo}/solicitudes/a`);
  verdadero(sol.rechazada != null, 'quedó rechazada');
  desmontar();
});

prueba('franja: sin red al rechazar o aprobar el botón se reactiva con un aviso y la franja sigue', async () => {
  const { mundo, codigo, alm3, ctx1 } = await escenario();
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  const div = document.createElement('div');
  const desmontar = montarAvisoSolicitud(div, ctx1, { confirmar: () => true });
  await hasta(() => boton(div, 'Rechazar'));
  mundo.desconectar();
  const AVISO = 'No se pudo. Revisa la conexión e intenta otra vez.';
  for (const texto of ['Rechazar', 'Aprobar']) {
    boton(div, texto).click();
    await hasta(() => div.textContent.includes(AVISO));
    verdadero(!boton(div, texto).disabled, `${texto} debe reactivarse`);
    verdadero(div.querySelector('.franja-solicitud'), 'la franja sigue');
    div.querySelector('.error-formulario').textContent = '';
  }
  mundo.reconectar();
  igual((await mundo.nube('u1').leer(`parejas/${codigo}`)).lugares.a, 'u1');
  desmontar();
});

prueba('franja: vuelve a leer al volver a la app y al desmontar suelta el oyente', async () => {
  const { mundo, codigo, alm3, ctx1 } = await escenario();
  const div = document.createElement('div');
  const desmontar = montarAvisoSolicitud(div, ctx1);
  await esperar(50);
  igual(div.children.length, 0);
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  document.dispatchEvent(new Event('visibilitychange'));
  await hasta(() => div.querySelector('.franja-solicitud'));
  desmontar();
  div.replaceChildren();
  document.dispatchEvent(new Event('visibilitychange'));
  await esperar(50);
  igual(div.children.length, 0, 'desmontada ya no lee');
});

prueba('franja: si el inicio se repinta (nodo fuera de la página) se desmonta sola', async () => {
  const { mundo, codigo, alm3, ctx1 } = await escenario();
  const div = document.createElement('div');
  document.body.append(div);
  const desmontar = montarAvisoSolicitud(div, ctx1);
  await esperar(50);
  div.remove();
  document.dispatchEvent(new Event('visibilitychange'));
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  document.dispatchEvent(new Event('visibilitychange'));
  await esperar(80);
  igual(div.children.length, 0, 'no leyó tras salir de la página');
  desmontar();
});

prueba('franja: si la solicitud cambió de celular antes de tocar Aprobar, no entrega y se actualiza sin culpar a la conexión', async () => {
  const { mundo, codigo, alm3, ctx1 } = await escenario();
  const rutaSol = `parejas/${codigo}/solicitudes/a`;
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  const div = document.createElement('div');
  const desmontar = montarAvisoSolicitud(div, ctx1, { confirmar: () => true });
  await hasta(() => boton(div, 'Aprobar'));
  const vieja = div.querySelector('.franja-solicitud');
  await mundo.nube('u1').borrar(rutaSol);
  await mundo.nube('u9').escribir(rutaSol, { uid: 'u9', creada: Date.now() });
  boton(div, 'Aprobar').click();
  await hasta(() => div.querySelector('.franja-solicitud') && div.querySelector('.franja-solicitud') !== vieja);
  igual((await mundo.nube('u1').leer(`parejas/${codigo}`)).lugares.a, 'u1', 'no se entregó el lugar');
  verdadero(!div.textContent.includes('Revisa la conexión'), div.textContent);
  verdadero(boton(div, 'Aprobar') && !boton(div, 'Aprobar').disabled, 'la franja nueva se puede usar');
  desmontar();
});

prueba('franja: si la solicitud ya no existe al tocar Aprobar, la franja se quita sin decir «Revisa la conexión»', async () => {
  const { mundo, codigo, alm3, ctx1 } = await escenario();
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  const div = document.createElement('div');
  const desmontar = montarAvisoSolicitud(div, ctx1, { confirmar: () => true });
  await hasta(() => boton(div, 'Aprobar'));
  await mundo.nube('u1').borrar(`parejas/${codigo}/solicitudes/a`);
  boton(div, 'Aprobar').click();
  await hasta(() => !div.querySelector('.franja-solicitud'));
  verdadero(!div.textContent.includes('Revisa la conexión'), div.textContent);
  desmontar();
});

prueba('franja: si Rechazar funciona pero la relectura falla sin red, los botones se reactivan y dice que revise la conexión', async () => {
  const { mundo, codigo, alm3, ctx2 } = await escenario();
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  const ctx = {
    ...ctx2,
    nube: async () => {
      const n = mundo.nube('u2');
      return { ...n, escribir: async (...a) => { const r = await n.escribir(...a); mundo.desconectar(); return r; } };
    },
  };
  const div = document.createElement('div');
  const desmontar = montarAvisoSolicitud(div, ctx);
  await hasta(() => boton(div, 'Rechazar'));
  boton(div, 'Rechazar').click();
  await hasta(() => div.textContent.includes('No se pudo. Revisa la conexión e intenta otra vez.'));
  verdadero(!boton(div, 'Rechazar').disabled, 'Rechazar debe reactivarse');
  mundo.reconectar();
  desmontar();
});
