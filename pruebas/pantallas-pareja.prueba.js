import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { ErrorNube } from '../js/nucleo/nube.js';
import { crearPareja, unirse, reclamar, miPareja } from '../js/nucleo/pareja.js';
import { pantallaPareja, exigirPareja } from '../js/nucleo/pantallas-pareja.js';

const esperar = (ms = 0) => new Promise((r) => setTimeout(r, ms));

// Monta #/pareja para el celular `uid`; refrescar vuelve a pintar como hace app.js.
function montar(mundo, uid, almacen = almacenEnMemoria()) {
  const div = document.createElement('div');
  const ctx = {
    almacen,
    ir() {},
    nube: async () => { const n = mundo.nube(uid); await n.iniciar(); return n; },
    refrescar: () => { div.replaceChildren(); return pantallaPareja(div, {}, ctx); },
  };
  return { div, ctx, almacen, pintar: () => ctx.refrescar() };
}
const boton = (div, texto) => [...div.querySelectorAll('button')].find((b) => b.textContent === texto);
function escribir(div, etiqueta, valor) {
  const label = [...div.querySelectorAll('label')].find((l) => l.textContent === etiqueta);
  const campo = div.querySelector(`#${label.htmlFor}`);
  campo.value = valor;
}
async function hasta(cond, ms = 1000) {
  for (let t = 0; t < ms && !cond(); t += 20) await esperar(20);
  verdadero(cond(), 'no llegó a tiempo');
}

prueba('pantalla pareja: sin configurar lo explica', async () => {
  const div = document.createElement('div');
  const ctx = { almacen: almacenEnMemoria(), nube: async () => { throw new ErrorNube('sin-config'); }, refrescar() {} };
  await pantallaPareja(div, {}, ctx);
  verdadero(div.textContent.includes('Falta configurar la conexión'), div.textContent);
});

prueba('pantalla pareja: mientras conecta dice Conectando', async () => {
  let soltar;
  const div = document.createElement('div');
  const ctx = { almacen: almacenEnMemoria(), nube: () => new Promise((r) => { soltar = r; }), refrescar() {} };
  const pintando = pantallaPareja(div, {}, ctx);
  verdadero(div.textContent.includes('Conectando…'), div.textContent);
  soltar(crearMundoFalso().nube('u1'));
  await pintando;
  verdadero(!div.textContent.includes('Conectando…'), div.textContent);
});

prueba('pantalla pareja: sin conexión ofrece reintentar', async () => {
  const mundo = crearMundoFalso();
  const { div, pintar } = montar(mundo, 'u1');
  mundo.desconectar();
  await pintar();
  verdadero(div.textContent.includes('Necesitas internet para esta sección'), div.textContent);
  mundo.reconectar();
  boton(div, 'Reintentar').click();
  await hasta(() => div.textContent.includes('Enlacen sus celulares'));
});

prueba('pantalla pareja: crear muestra el código formateado', async () => {
  const mundo = crearMundoFalso();
  const { div, almacen, pintar } = montar(mundo, 'u1');
  await pintar();
  boton(div, 'Crear pareja').click();
  escribir(div, 'Tu nombre', 'Carlos');
  boton(div, 'Crear').click();
  await hasta(() => div.querySelector('.codigo-pareja'));
  const { codigo } = miPareja(almacen);
  igual(div.querySelector('.codigo-pareja').textContent, `${codigo.slice(0, 3)}-${codigo.slice(3)}`);
  verdadero(boton(div, 'Copiar'), 'botón Copiar');
});

prueba('pantalla pareja: código inexistente muestra el error junto al formulario', async () => {
  const { div, pintar } = montar(crearMundoFalso(), 'u1');
  await pintar();
  boton(div, 'Tengo un código').click();
  escribir(div, 'Código', 'ZZZ-ZZZ');
  escribir(div, 'Tu nombre', 'Sofi');
  boton(div, 'Unirme').click();
  await hasta(() => div.querySelector('.error-formulario')?.textContent);
  igual(div.querySelector('.error-formulario').textContent, 'Ese código no existe. Revísalo.');
});

prueba('pantalla pareja: pareja llena ofrece escoger quién eres y reclamar', async () => {
  const mundo = crearMundoFalso();
  const { codigo } = await crearPareja(mundo.nube('u1'), almacenEnMemoria(), { nombre: 'Carlos' });
  await unirse(mundo.nube('u2'), almacenEnMemoria(), { codigo, nombre: 'Sofi' });
  const { div, almacen, pintar } = montar(mundo, 'u3');
  await pintar();
  boton(div, 'Tengo un código').click();
  escribir(div, 'Código', codigo);
  escribir(div, 'Tu nombre', 'Carlos');
  boton(div, 'Unirme').click();
  await hasta(() => boton(div, 'Soy Carlos'));
  verdadero(boton(div, 'Soy Sofi'), 'ofrece los dos nombres');
  verdadero(div.textContent.includes('quedará desconectado'), 'advierte');
  boton(div, 'Soy Carlos').click();
  await hasta(() => div.textContent.includes('Nuestra pareja'));
  igual(miPareja(almacen), { codigo, lugar: 'a' });
});

prueba('pantalla pareja: enlazados muestra a los dos o espera al otro', async () => {
  const mundo = crearMundoFalso();
  const alm1 = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), alm1, { nombre: 'Carlos' });
  const { div, pintar } = montar(mundo, 'u1', alm1);
  await pintar();
  await hasta(() => div.textContent.includes('Esperando a que tu pareja se una'));
  verdadero(div.textContent.includes('Tú: Carlos'), div.textContent);
  await unirse(mundo.nube('u2'), almacenEnMemoria(), { codigo, nombre: 'Sofi' });
  await hasta(() => div.textContent.includes('Sofi'));
});

prueba('pantalla pareja: si reclaman el lugar avisa', async () => {
  const mundo = crearMundoFalso();
  const alm1 = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), alm1, { nombre: 'Carlos' });
  const { div, pintar } = montar(mundo, 'u1', alm1);
  await pintar();
  await esperar(20);
  await reclamar(mundo.nube('u3'), almacenEnMemoria(), { codigo, lugar: 'a' });
  await hasta(() => div.textContent.includes('Tu lugar se abrió en otro celular'));
  verdadero(boton(div, 'Volver a enlazar'), 'ofrece volver a enlazar');
});

prueba('pantalla pareja: el nombre de la pareja se muestra como texto', async () => {
  const mundo = crearMundoFalso();
  const alm1 = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), alm1, { nombre: 'Carlos' });
  await unirse(mundo.nube('u2'), almacenEnMemoria(), { codigo, nombre: '<b>x</b>' });
  const { div, pintar } = montar(mundo, 'u1', alm1);
  await pintar();
  await hasta(() => div.textContent.includes('<b>x</b>'));
  igual(div.querySelector('b'), null);
});

prueba('pantalla pareja: un error de Firebase no se confunde con falta de internet', async () => {
  const div = document.createElement('div');
  const ctx = { almacen: almacenEnMemoria(), nube: async () => { throw new ErrorNube('desconocido', 'auth/admin-restricted-operation'); }, refrescar() {} };
  const original = console.warn;
  const avisos = [];
  console.warn = (...a) => avisos.push(a);
  try { await pantallaPareja(div, {}, ctx); } finally { console.warn = original; }
  verdadero(div.textContent.includes('No se pudo conectar con Firebase'), div.textContent);
  verdadero(!div.textContent.includes('Necesitas internet'), div.textContent);
  verdadero(boton(div, 'Reintentar'), 'ofrece reintentar');
  verdadero(avisos.length > 0, 'deja el error en la consola');
});

prueba('pantalla pareja: el campo de código acepta pegar el mensaje compartido', async () => {
  const { div, pintar } = montar(crearMundoFalso(), 'u1');
  await pintar();
  boton(div, 'Tengo un código').click();
  const campo = div.querySelector('input[placeholder="K7P-Q2M"]');
  igual(campo.getAttribute('maxlength'), null);
});

prueba('exigirPareja: si reclamaron el lugar o borraron la pareja, lo explica', async () => {
  const mundo = crearMundoFalso();
  const alm1 = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), alm1, { nombre: 'Carlos' });
  await reclamar(mundo.nube('u3'), almacenEnMemoria(), { codigo, lugar: 'a' });
  const uno = montar(mundo, 'u1', alm1);
  igual(await exigirPareja(uno.div, uno.ctx), null);
  verdadero(uno.div.textContent.includes('Tu lugar se abrió en otro celular'), uno.div.textContent);
  igual(miPareja(alm1), null);

  const alm2 = almacenEnMemoria();
  const otra = await crearPareja(mundo.nube('u2'), alm2, { nombre: 'Sofi' });
  await mundo.nube('u2').borrar(`parejas/${otra.codigo}`);
  const dos = montar(mundo, 'u2', alm2);
  igual(await exigirPareja(dos.div, dos.ctx), null);
  verdadero(dos.div.textContent.includes('Tu pareja borró sus datos de la nube'), dos.div.textContent);
});

prueba('exigirPareja: la segunda vez no espera a la red y si el lugar se perdió lo explica después', async () => {
  const mundo = crearMundoFalso();
  const alm1 = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), alm1, { nombre: 'Carlos' });
  await unirse(mundo.nube('u2'), almacenEnMemoria(), { codigo, nombre: 'Sofi' });
  const primera = montar(mundo, 'u1', alm1);
  await exigirPareja(primera.div, primera.ctx); // guarda los nombres en el celular
  let lecturas = 0;
  const segunda = montar(mundo, 'u1', alm1);
  segunda.ctx.nube = async () => { const n = mundo.nube('u1'); return { ...n, leer: async (r) => { lecturas++; await esperar(30); return n.leer(r); } }; };
  await reclamar(mundo.nube('u3'), almacenEnMemoria(), { codigo, lugar: 'a' });
  const r = await exigirPareja(segunda.div, segunda.ctx);
  igual(r.pareja.nombres.a, 'Carlos', 'usa los nombres guardados');
  await hasta(() => segunda.div.textContent.includes('Tu lugar se abrió en otro celular'));
  verdadero(lecturas >= 1, 'igual comprueba en la nube');
  igual(miPareja(alm1), null);
});

prueba('exigirPareja: null y pinta el enlace sin pareja; nube y pareja si la hay', async () => {
  const mundo = crearMundoFalso();
  const sin = montar(mundo, 'u1');
  igual(await exigirPareja(sin.div, sin.ctx), null);
  verdadero(sin.div.textContent.includes('Enlacen sus celulares'), sin.div.textContent);
  const alm1 = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), alm1, { nombre: 'Carlos' });
  const con = montar(mundo, 'u1', alm1);
  const r = await exigirPareja(con.div, con.ctx);
  igual(r.pareja, { codigo, lugar: 'a', nombres: { a: 'Carlos', b: null } });
  verdadero(typeof r.nube.leer === 'function');
  igual(con.div.textContent, '', 'no pinta nada si hay pareja');
});
