import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { ErrorNube } from '../js/nucleo/nube.js';
import { crearPareja, unirse, miPareja, aprobarSolicitud, rechazarSolicitud } from '../js/nucleo/pareja.js';
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

// ── Cambio de celular (v22): «¿Quién eres?» deja una solicitud y pasa a la pantalla de espera ──
const DIA = 86400000;
const fechaLarga = (ms) => new Date(ms).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
const fechaConHora = (ms) => new Date(ms).toLocaleString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
// Otro celular queda con el lugar (lo que pasa al vencer los 7 días).
const tomarLugar = (mundo, codigo, lugar, uid) => mundo.nube(uid).escribir(`parejas/${codigo}`, { lugares: { [lugar]: uid } }, { combinar: true });

// Carlos (u1) y Sofi (u2) enlazados; u3 es el celular nuevo y llega hasta «¿Quién eres?».
async function llegarAQuienEres() {
  const mundo = crearMundoFalso();
  const alm1 = almacenEnMemoria();
  const alm2 = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), alm1, { nombre: 'Carlos' });
  await unirse(mundo.nube('u2'), alm2, { codigo, nombre: 'Sofi' });
  const nuevo = montar(mundo, 'u3');
  await nuevo.pintar();
  boton(nuevo.div, 'Tengo un código').click();
  escribir(nuevo.div, 'Código', codigo);
  escribir(nuevo.div, 'Tu nombre', 'Carlos');
  boton(nuevo.div, 'Unirme').click();
  await hasta(() => boton(nuevo.div, 'Soy Carlos'));
  const rutaSol = `parejas/${codigo}/solicitudes/a`;
  return { mundo, codigo, alm1, alm2, rutaSol, ...nuevo };
}
async function pedirComoCarlos() {
  const todo = await llegarAQuienEres();
  boton(todo.div, 'Soy Carlos').click();
  await hasta(() => todo.div.textContent.includes('celular anterior y toca'));
  return todo;
}

prueba('pantalla pareja: pareja llena ofrece escoger quién eres y avisa que hay que aprobar', async () => {
  const { div } = await llegarAQuienEres();
  verdadero(boton(div, 'Soy Sofi'), 'ofrece los dos nombres');
  verdadero(div.textContent.includes('Tu celular anterior tendrá que aprobarlo. Si ya no lo tienes, podrás entrar en 7 días.'), div.textContent);
  verdadero(!div.textContent.includes('quedará desconectado'), 'ya no desconecta al otro');
});

prueba('pantalla pareja: «Soy Carlos» deja la solicitud y muestra la espera con la fecha; nadie queda por fuera', async () => {
  const { mundo, div, almacen, codigo, alm1, rutaSol } = await pedirComoCarlos();
  const sol = await mundo.nube('u3').leer(rutaSol);
  igual(sol.uid, 'u3');
  verdadero(div.textContent.includes('Abre Okupa en tu celular anterior y toca «Aprobar»'), div.textContent);
  verdadero(div.textContent.includes(`podrás entrar el ${fechaLarga(sol.creada + 7 * DIA)}`), div.textContent);
  verdadero(boton(div, 'Cancelar solicitud'), 'se puede cancelar');
  verdadero(!boton(div, 'Entrar'), 'todavía no puede entrar');
  igual(miPareja(almacen), null, 'el nuevo aún no es miembro');
  igual((await mundo.nube('u1').leer(`parejas/${codigo}`)).lugares, { a: 'u1', b: 'u2' });
  igual(miPareja(alm1), { codigo, lugar: 'a' }, 'el otro celular sigue enlazado');
});

prueba('pantalla pareja: cerrar y volver al otro día retoma la espera con la misma fecha (Review Focus 3)', async () => {
  const { mundo, almacen, rutaSol } = await pedirComoCarlos();
  const sol = await mundo.nube('u3').leer(rutaSol);
  const otraVez = montar(mundo, 'u3', almacen);
  await otraVez.pintar();
  await hasta(() => otraVez.div.textContent.includes('celular anterior y toca'));
  verdadero(otraVez.div.textContent.includes(`podrás entrar el ${fechaLarga(sol.creada + 7 * DIA)}`), otraVez.div.textContent);
  verdadero(!otraVez.div.textContent.includes('Enlacen sus celulares'), 'no vuelve al principio');
  igual(await mundo.nube('u3').leer(rutaSol), sol, 'la solicitud no se renovó');
});

prueba('pantalla pareja: exigirPareja también retoma la espera', async () => {
  const { mundo, almacen } = await pedirComoCarlos();
  const seccion = montar(mundo, 'u3', almacen);
  igual(await exigirPareja(seccion.div, seccion.ctx), null);
  await hasta(() => seccion.div.textContent.includes('celular anterior y toca'));
});

prueba('pantalla pareja: cuando el celular viejo aprueba, el nuevo entra solo', async () => {
  const { mundo, div, almacen, codigo, alm1, rutaSol } = await pedirComoCarlos();
  await aprobarSolicitud(mundo.nube('u1'), alm1, 'a');
  await hasta(() => div.textContent.includes('Nuestra pareja'));
  igual(miPareja(almacen), { codigo, lugar: 'a' });
  igual(await mundo.nube('u3').leer(rutaSol), null, 'borra su solicitud al entrar');
  await hasta(() => div.textContent.includes('Tú: Carlos'));
});

prueba('pantalla pareja: si la aprobaron con el celular nuevo cerrado, al abrir entra directo', async () => {
  const { mundo, almacen, codigo, alm1 } = await pedirComoCarlos();
  await aprobarSolicitud(mundo.nube('u1'), alm1, 'a');
  const otraVez = montar(mundo, 'u3', almacen);
  await otraVez.pintar();
  await hasta(() => otraVez.div.textContent.includes('Nuestra pareja'));
  igual(miPareja(almacen), { codigo, lugar: 'a' });
});

prueba('pantalla pareja: pasados los 7 días muestra «Entrar» y entra', async () => {
  const { mundo, almacen, codigo, rutaSol } = await pedirComoCarlos();
  await mundo.nube('u3').escribir(rutaSol, { uid: 'u3', creada: Date.now() - 8 * DIA });
  const { div, pintar } = montar(mundo, 'u3', almacen);
  await pintar();
  await hasta(() => boton(div, 'Entrar'));
  verdadero(div.textContent.includes('Ya pasaron los 7 días'), div.textContent);
  boton(div, 'Entrar').click();
  await hasta(() => div.textContent.includes('Nuestra pareja'));
  igual(miPareja(almacen), { codigo, lugar: 'a' });
  igual((await mundo.nube('u2').leer(`parejas/${codigo}`)).lugares, { a: 'u3', b: 'u2' });
});

prueba('pantalla pareja: si «Entrar» falla, lo dice y sigue en la espera', async () => {
  const { mundo, almacen, rutaSol } = await pedirComoCarlos();
  await mundo.nube('u3').escribir(rutaSol, { uid: 'u3', creada: Date.now() - 8 * DIA });
  const nuevo = montar(mundo, 'u3', almacen);
  nuevo.ctx.nube = async () => {
    const n = mundo.nube('u3');
    return { ...n, transaccion: async () => { throw new ErrorNube('permiso'); } };
  };
  await nuevo.pintar();
  await hasta(() => boton(nuevo.div, 'Entrar'));
  boton(nuevo.div, 'Entrar').click();
  await hasta(() => nuevo.div.querySelector('.error-formulario')?.textContent);
  igual(nuevo.div.querySelector('.error-formulario').textContent, 'Todavía no se puede entrar. Intenta más tarde.');
  verdadero(boton(nuevo.div, 'Entrar') && !boton(nuevo.div, 'Entrar').disabled, 'el botón se reactiva');
  igual(miPareja(almacen), null);
});

prueba('pantalla pareja: si la rechazan lo dice y explica cuándo puede volver a pedirla', async () => {
  const { mundo, almacen, alm2, rutaSol } = await pedirComoCarlos();
  await rechazarSolicitud(mundo.nube('u2'), miPareja(alm2), 'a');
  // El rechazo cambia la solicitud, no la pareja: la pantalla lo ve al volver a pintarse (o al minuto).
  const sol = await mundo.nube('u3').leer(rutaSol);
  const otraVez = montar(mundo, 'u3', almacen);
  await otraVez.pintar();
  await hasta(() => otraVez.div.textContent.includes('Rechazaron la solicitud'));
  verdadero(otraVez.div.textContent.includes(`Puedes volver a pedirla el ${fechaConHora(sol.rechazada + DIA)}`), otraVez.div.textContent);
  verdadero(!boton(otraVez.div, 'Volver a pedir'), 'antes de 24 h no se puede pedir');
  verdadero(!boton(otraVez.div, 'Entrar'), 'no puede entrar');
});

prueba('pantalla pareja: 24 h después del rechazo ofrece «Volver a pedir» y empieza otra espera', async () => {
  const { mundo, almacen, rutaSol } = await pedirComoCarlos();
  await mundo.nube('u3').escribir(rutaSol, { uid: 'u3', creada: Date.now() - 3 * DIA, rechazada: Date.now() - 25 * 3600000 });
  const { div, pintar } = montar(mundo, 'u3', almacen);
  await pintar();
  await hasta(() => boton(div, 'Volver a pedir'));
  boton(div, 'Volver a pedir').click();
  await hasta(() => div.textContent.includes('celular anterior y toca'));
  const nueva = await mundo.nube('u3').leer(rutaSol);
  igual(Object.keys(nueva).sort(), ['creada', 'uid']);
  verdadero(div.textContent.includes(`podrás entrar el ${fechaLarga(nueva.creada + 7 * DIA)}`), div.textContent);
});

prueba('pantalla pareja: «Cancelar solicitud» vuelve a «Enlacen sus celulares»', async () => {
  const { mundo, div, almacen, rutaSol } = await pedirComoCarlos();
  boton(div, 'Cancelar solicitud').click();
  await hasta(() => div.textContent.includes('Enlacen sus celulares'));
  igual(await mundo.nube('u3').leer(rutaSol), null);
  const otraVez = montar(mundo, 'u3', almacen);
  await otraVez.pintar();
  verdadero(otraVez.div.textContent.includes('Enlacen sus celulares'), 'ya no retoma la espera');
});

prueba('pantalla pareja: si un miembro borra la solicitud, el nuevo lo ve y puede volver', async () => {
  const { mundo, almacen, rutaSol } = await pedirComoCarlos();
  await mundo.nube('u1').borrar(rutaSol);
  const { div, pintar } = montar(mundo, 'u3', almacen);
  await pintar();
  await hasta(() => div.textContent.includes('La solicitud ya no existe'));
  boton(div, 'Volver').click();
  await hasta(() => div.textContent.includes('Enlacen sus celulares'));
});

prueba('pantalla pareja: si ya hay una solicitud de otro celular para ese lugar, lo explica', async () => {
  const { mundo, div, codigo } = await llegarAQuienEres();
  await mundo.nube('u9').escribir(`parejas/${codigo}/solicitudes/a`, { uid: 'u9', creada: Date.now() });
  boton(div, 'Soy Carlos').click();
  await hasta(() => div.querySelector('.error-formulario')?.textContent);
  igual(div.querySelector('.error-formulario').textContent, 'Ya hay una solicitud de otro celular para ese lugar. Cualquiera de los dos puede rechazarla desde Okupa.');
  verdadero(boton(div, 'Soy Carlos'), 'sigue en «¿Quién eres?»');
});

prueba('pantalla pareja: sin red al revisar la espera ofrece reintentar', async () => {
  const { mundo, almacen } = await pedirComoCarlos();
  const nuevo = montar(mundo, 'u3', almacen);
  let falla = true;
  nuevo.ctx.nube = async () => {
    const n = mundo.nube('u3');
    return { ...n, leer: async (r) => { if (falla) throw new ErrorNube('sin-conexion'); return n.leer(r); } };
  };
  await nuevo.pintar();
  await hasta(() => boton(nuevo.div, 'Reintentar'));
  verdadero(nuevo.div.textContent.includes('No hay conexión'), nuevo.div.textContent);
  falla = false;
  boton(nuevo.div, 'Reintentar').click();
  await hasta(() => nuevo.div.textContent.includes('celular anterior y toca'));
});

prueba('pantalla pareja: un miembro ya enlazado ve «Nuestra pareja» como siempre, con la advertencia (Review Focus 1)', async () => {
  const mundo = crearMundoFalso();
  const alm1 = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), alm1, { nombre: 'Carlos' });
  await unirse(mundo.nube('u2'), almacenEnMemoria(), { codigo, nombre: 'Sofi' });
  const { div, pintar } = montar(mundo, 'u1', alm1);
  await pintar();
  await hasta(() => div.textContent.includes('Tu pareja: Sofi'));
  verdadero(div.textContent.includes('Nuestra pareja'), div.textContent);
  verdadero(div.textContent.includes('Para pasar a otro celular vas a necesitar este para aprobarlo. Sin él (o si borras los datos del navegador) la espera es de 7 días.'), div.textContent);
  verdadero(!boton(div, 'Aprobar') && !boton(div, 'Rechazar'), 'sin solicitudes no hay aviso');
  igual(miPareja(alm1), { codigo, lugar: 'a' }, 'sigue enlazado');
});

prueba('pantalla pareja: tras aprobar, el celular viejo ve «Pasaste tu lugar a tu celular nuevo»', async () => {
  const { mundo, alm1 } = await pedirComoCarlos();
  const viejo = montar(mundo, 'u1', alm1);
  await viejo.pintar();
  await esperar(20);
  await aprobarSolicitud(mundo.nube('u1'), alm1, 'a');
  await hasta(() => viejo.div.textContent.includes('Pasaste tu lugar a tu celular nuevo'));
  verdadero(!viejo.div.textContent.includes('Tu lugar se abrió en otro celular'), viejo.div.textContent);
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

prueba('pantalla pareja: si otro celular queda con el lugar avisa', async () => {
  const mundo = crearMundoFalso();
  const alm1 = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), alm1, { nombre: 'Carlos' });
  const { div, pintar } = montar(mundo, 'u1', alm1);
  await pintar();
  await esperar(20);
  await tomarLugar(mundo, codigo, 'a', 'u3');
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

prueba('exigirPareja: si otro celular quedó con el lugar o borraron la pareja, lo explica', async () => {
  const mundo = crearMundoFalso();
  const alm1 = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), alm1, { nombre: 'Carlos' });
  await tomarLugar(mundo, codigo, 'a', 'u3');
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
  await tomarLugar(mundo, codigo, 'a', 'u3');
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
