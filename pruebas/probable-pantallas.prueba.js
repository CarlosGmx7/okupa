import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearPareja, unirse as unirsePareja } from '../js/nucleo/pareja.js';
import { crearPantallasProbable } from '../js/modulos/probable/pantallas.js';
import { textoEsperando } from '../js/nucleo/esperando.js';
import { cancelarSala, ErrorSalaAjena } from '../js/modulos/probable/sala.js';
import { crearSala, unirse, votar, rutaSala, leerVistas, crearPropia, listarPropias } from '../js/modulos/probable/sala.js';

const esperar = (ms = 0) => new Promise((r) => setTimeout(r, ms));
async function hasta(cond, ms = 2000) {
  for (let t = 0; t < ms && !cond(); t += 20) await esperar(20);
  verdadero(cond(), 'no llegó a tiempo');
}
const boton = (div, texto) => [...div.querySelectorAll('button')].find((b) => b.textContent.trim() === texto);
const salir = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
const BANCO = Array.from({ length: 8 }, (_, i) => ({ id: `div-${String(i + 1).padStart(3, '0')}`, tema: 'divertidas', texto: `hace algo raro ${i + 1}` }));

// `envolver(nube, lugar)` deja a las pruebas cambiar la nube de un celular (por ejemplo para que falle una vez).
async function parejaProbable({ banco = BANCO, envolver = (n) => n } = {}) {
  const mundo = crearMundoFalso();
  const almA = almacenEnMemoria();
  const almB = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), almA, { nombre: 'Carlos' });
  await unirsePareja(mundo.nube('u2'), almB, { codigo, nombre: 'Sofi' });
  let t = 0;
  const reloj = { ahora: () => t, adelantar: (ms) => { t += ms; } };
  const celular = (uid, almacen, lugar) => {
    const div = document.createElement('div');
    const rutas = [];
    const pantallas = crearPantallasProbable({ cargar: async () => banco, ahora: reloj.ahora, ms: { sondeo: 30, revisar: 20 } });
    const ctx = { almacen, nube: async () => envolver(mundo.nube(uid), lugar), ir: (r) => rutas.push(r), refrescar: () => {} };
    return { div, ctx, rutas, pantallas, nube: mundo.nube(uid), pareja: { codigo, lugar } };
  };
  return { reloj, a: celular('u1', almA, 'a'), b: celular('u2', almB, 'b') };
}
const sinFeos = (div) => verdadero(!/null|undefined/.test(div.textContent), div.textContent);
const radio = (div, tema) => div.querySelector(`input[name="tema"][value="${tema}"]`);

prueba('probable pantallas: el inicio guarda «te está esperando» y lo borra si el otro cancela', async () => {
  const { a, b } = await parejaProbable();
  const id = await crearSala(a.nube, a.pareja, { tema: 'divertidas', frases: BANCO.slice(0, 5).map(({ id: i, texto }) => ({ id: i, texto })) });
  await b.pantallas.inicio(b.div, {}, b.ctx);
  await hasta(() => boton(b.div, 'Unirme'));
  igual(textoEsperando(b.ctx.almacen, b.pareja, 'probable'), 'Carlos te está esperando');
  await cancelarSala(a.nube, a.pareja, id);
  await hasta(() => textoEsperando(b.ctx.almacen, b.pareja, 'probable') === null);
  salir();
});

async function enJuego(largo = 5, opciones) {
  const p = await parejaProbable(opciones);
  await p.a.pantallas.inicio(p.a.div, {}, p.a.ctx);
  await hasta(() => boton(p.a.div, 'Abrir sala'));
  [...p.a.div.querySelectorAll('.chips button')].find((b) => b.textContent === String(largo)).click();
  boton(p.a.div, 'Abrir sala').click();
  await hasta(() => p.a.rutas.length > 0);
  const id = p.a.rutas[0].split('/')[2];
  salir();
  await p.b.pantallas.inicio(p.b.div, {}, p.b.ctx);
  await hasta(() => boton(p.b.div, 'Unirme'));
  boton(p.b.div, 'Unirme').click();
  await hasta(() => p.b.rutas.length > 0);
  salir();
  await p.a.pantallas.juego(p.a.div, { id }, p.a.ctx);
  await p.b.pantallas.juego(p.b.div, { id }, p.b.ctx);
  await hasta(() => boton(p.a.div, 'Sofi') && boton(p.b.div, 'Carlos'));
  return { ...p, id };
}

prueba('probable pantallas: inicio muestra temas con conteo y deshabilita «Nuestras frases» vacío', async () => {
  const { a } = await parejaProbable();
  await a.pantallas.inicio(a.div, {}, a.ctx);
  await hasta(() => boton(a.div, 'Abrir sala'));
  verdadero(a.div.textContent.includes('¿Quién es más probable?'));
  verdadero(a.div.textContent.includes('8 sin salir'), a.div.textContent);
  verdadero(radio(a.div, 'nuestras').disabled, 'nuestras vacío deshabilitado');
  verdadero(radio(a.div, 'romanticas').disabled, 'tema sin frases deshabilitado');
  verdadero(radio(a.div, 'divertidas').checked && !radio(a.div, 'divertidas').disabled);
  igual([...a.div.querySelectorAll('.chips button')].map((b) => [b.textContent, b.getAttribute('aria-pressed')]), [['5', 'false'], ['10', 'true'], ['20', 'false']]);
  verdadero(a.div.querySelector('a[href="#/probable/frases"]').textContent.includes('Nuestras frases'));
  sinFeos(a.div);
  salir();
});

prueba('probable pantallas: abrir sala manda a la sala y el otro ve «te está esperando» y se une', async () => {
  const p = await parejaProbable();
  await p.a.pantallas.inicio(p.a.div, {}, p.a.ctx);
  await hasta(() => boton(p.a.div, 'Abrir sala'));
  [...p.a.div.querySelectorAll('.chips button')].find((b) => b.textContent === '5').click();
  boton(p.a.div, 'Abrir sala').click();
  await hasta(() => p.a.rutas.length > 0);
  const id = p.a.rutas[0].split('/')[2];
  igual(p.a.rutas, [`probable/jugar/${id}`]);
  igual((await p.a.nube.leer(rutaSala(p.a.pareja.codigo, id))).frases.length, 5);
  salir();
  await p.b.pantallas.inicio(p.b.div, {}, p.b.ctx);
  await hasta(() => p.b.div.textContent.includes('Carlos te está esperando'));
  boton(p.b.div, 'Unirme').click();
  await hasta(() => p.b.rutas.length > 0);
  igual(p.b.rutas, [`probable/jugar/${id}`]);
  salir();
});

prueba('probable pantallas: el anfitrión espera al otro y puede cancelar', async () => {
  const p = await parejaProbable();
  const id = await crearSala(p.a.nube, p.a.pareja, { tema: 'divertidas', frases: BANCO.slice(0, 5) });
  await p.a.pantallas.juego(p.a.div, { id }, p.a.ctx);
  await hasta(() => p.a.div.textContent.includes('Esperando a Sofi…'));
  boton(p.a.div, 'Cancelar').click();
  await hasta(async () => p.a.rutas.length > 0);
  igual((await p.a.nube.leer(rutaSala(p.a.pareja.codigo, id))).estado, 'cancelada');
  salir();
});

prueba('probable pantallas: nadie ve el voto del otro hasta que los dos votan; luego «¡Coincidieron!»', async () => {
  const { a, b } = await enJuego(5);
  verdadero(a.div.textContent.includes('Frase 1 de 5') && a.div.textContent.includes('¿Quién es más probable que…'));
  igual([...a.div.querySelectorAll('.opcion-juego')].map((x) => x.textContent), ['Carlos', 'Sofi', 'Los dos']);
  boton(a.div, 'Sofi').click();
  await hasta(() => a.div.textContent.includes('Esperando a Sofi…'));
  await esperar(150);
  verdadero(!b.div.textContent.includes('Coincidieron'), 'b no ve nada del voto de a');
  verdadero(!a.div.querySelector('.revelado-votos'), 'a no revela antes de tiempo');
  boton(b.div, 'Sofi').click();
  await hasta(() => a.div.textContent.includes('¡Coincidieron!') && b.div.textContent.includes('¡Coincidieron!'));
  for (const c of [a, b]) {
    const filas = [...c.div.querySelectorAll('.revelado-fila')].map((f) => f.textContent);
    igual(filas, ['CarlosSofi', 'SofiSofi']);
  }
  sinFeos(a.div); sinFeos(b.div);
  salir();
});

prueba('probable pantallas: votos distintos dicen «No coincidieron»; Siguiente avanza en los dos y una sola vez', async () => {
  const { a, b, id } = await enJuego(5);
  boton(a.div, 'Carlos').click();
  boton(b.div, 'Los dos').click();
  await hasta(() => a.div.textContent.includes('No coincidieron') && b.div.textContent.includes('No coincidieron'));
  verdadero(a.div.textContent.includes('Los dos'));
  boton(a.div, 'Siguiente').click();
  boton(b.div, 'Siguiente').click();
  await hasta(() => a.div.textContent.includes('Frase 2 de 5') && b.div.textContent.includes('Frase 2 de 5'));
  igual((await a.nube.leer(rutaSala(a.pareja.codigo, id))).indice, 1);
  salir();
});

prueba('probable pantallas: resumen al terminar, cierra la sala una vez y anota las vistas', async () => {
  const { a, b, id } = await enJuego(5);
  for (let i = 0; i < 5; i++) {
    await hasta(() => boton(a.div, 'Sofi') && boton(b.div, 'Sofi'));
    boton(a.div, 'Sofi').click();
    boton(b.div, i % 2 ? 'Carlos' : 'Sofi').click();
    await hasta(() => boton(a.div, i === 4 ? 'Ver resumen' : 'Siguiente') && boton(b.div, i === 4 ? 'Ver resumen' : 'Siguiente'));
    boton(a.div, i === 4 ? 'Ver resumen' : 'Siguiente').click();
    if (i < 4) await hasta(() => a.div.textContent.includes(`Frase ${i + 2} de 5`) && b.div.textContent.includes(`Frase ${i + 2} de 5`));
  }
  await hasta(() => a.div.textContent.includes('Coincidieron en 3 de 5') && b.div.textContent.includes('Coincidieron en 3 de 5'));
  verdadero(a.div.textContent.includes('Eligieron a Carlos 2 veces'), a.div.textContent);
  verdadero(a.div.textContent.includes('Eligieron a Sofi 5 veces'), a.div.textContent);
  verdadero([...a.div.querySelectorAll('a')].some((x) => x.textContent === 'Otra ronda' && x.getAttribute('href') === '#/probable'));
  sinFeos(a.div);
  let vistas;
  for (let i = 0; i < 50 && !vistas?.divertidas?.length; i++) { vistas = await leerVistas(a.nube, a.pareja); await esperar(20); }
  igual(vistas.divertidas.length, 5);
  salir();
});

prueba('probable pantallas: sin señal del otro más de 20 s muestra «se salió» y Salir cancela', async () => {
  const { a, b, reloj, id } = await enJuego(5);
  salir(); // el celular de Sofi se apaga: ya no manda señal
  b.div.replaceChildren();
  await a.pantallas.juego(a.div, { id }, a.ctx);
  reloj.adelantar(21000);
  await hasta(() => a.div.textContent.includes('Sofi se salió'));
  boton(a.div, 'Salir').click();
  let estado;
  for (let i = 0; i < 50 && estado !== 'cancelada'; i++) { estado = (await a.nube.leer(rutaSala(a.pareja.codigo, id))).estado; await esperar(20); }
  igual(estado, 'cancelada');
  await hasta(() => a.div.textContent.includes('se canceló'));
  salir();
});

prueba('probable pantallas: Salir con la sala ya cerrada no la toca', async () => {
  const { a, reloj, id } = await enJuego(5);
  reloj.adelantar(21000);
  await hasta(() => a.div.textContent.includes('Sofi se salió'));
  await a.nube.escribir(rutaSala(a.pareja.codigo, id), { estado: 'terminada' }, { combinar: true });
  boton(a.div, 'Salir').click();
  await esperar(150);
  igual((await a.nube.leer(rutaSala(a.pareja.codigo, id))).estado, 'terminada');
  salir();
});

prueba('probable pantallas: frases propias se agregan, se validan y se borran', async () => {
  const { a } = await parejaProbable();
  await a.pantallas.frases(a.div, {}, a.ctx);
  await hasta(() => boton(a.div, 'Agregar'));
  verdadero(a.div.textContent.includes('Nuestras frases') && a.div.textContent.includes('¿Quién es más probable que…'));
  verdadero(a.div.textContent.includes('Todavía no tienen frases propias.'));
  igual(a.div.querySelector('input[type="text"]').getAttribute('maxlength'), '120');
  boton(a.div, 'Agregar').click();
  await hasta(() => a.div.querySelector('p.aviso').textContent.length > 0);
  a.div.querySelector('input[type="text"]').value = 'se quede dormido en el cine';
  boton(a.div, 'Agregar').click();
  await hasta(() => a.div.querySelectorAll('.fila-frase').length === 1);
  verdadero(a.div.textContent.includes('se quede dormido en el cine'));
  igual((await listarPropias(a.nube, a.pareja)).length, 1);
  const real = globalThis.confirm;
  globalThis.confirm = () => false;
  boton(a.div, 'Borrar').click();
  await esperar(100);
  igual(a.div.querySelectorAll('.fila-frase').length, 1);
  globalThis.confirm = () => true;
  boton(a.div, 'Borrar').click();
  await hasta(() => a.div.textContent.includes('Todavía no tienen frases propias.'));
  globalThis.confirm = real;
  igual((await listarPropias(a.nube, a.pareja)).length, 0);
  sinFeos(a.div);
  salir();
});

prueba('probable pantallas: con frases propias el tema «Nuestras frases» se habilita y cuenta', async () => {
  const { a } = await parejaProbable();
  await crearPropia(a.nube, a.pareja, 'cante en la ducha');
  await crearPropia(a.nube, a.pareja, 'olvide las llaves otra vez');
  await a.pantallas.inicio(a.div, {}, a.ctx);
  await hasta(() => boton(a.div, 'Abrir sala'));
  verdadero(!radio(a.div, 'nuestras').disabled);
  verdadero(radio(a.div, 'nuestras').closest('label').textContent.includes('2 sin salir'));
  radio(a.div, 'nuestras').checked = true; // los radios sueltos del documento no disparan change con click()
  radio(a.div, 'nuestras').dispatchEvent(new Event('change'));
  [...a.div.querySelectorAll('.chips button')].find((b) => b.textContent === '10').click();
  boton(a.div, 'Abrir sala').click();
  await hasta(() => a.rutas.length > 0);
  const s = await a.nube.leer(rutaSala(a.pareja.codigo, a.rutas[0].split('/')[2]));
  igual([s.tema, s.frases.length], ['nuestras', 2]);
  salir();
});

// ---- Ronda de arreglos: fallos de red, reingreso y cortes a mitad ----
const fallo = { transaccion: false, leer: false };
const nubeQueFalla = (nube) => {
  const w = Object.create(nube);
  w.transaccion = (fn) => {
    if (fallo.transaccion) { fallo.transaccion = false; return Promise.reject(new Error('sin red')); }
    return nube.transaccion(fn);
  };
  w.leer = (ruta) => {
    if (fallo.leer) { fallo.leer = false; return Promise.reject(new Error('sin red')); }
    return nube.leer(ruta);
  };
  return w;
};
const votarLosDos = async (a, b, i, ultima = false) => {
  await hasta(() => boton(a.div, 'Sofi') && boton(b.div, 'Sofi'));
  boton(a.div, 'Sofi').click();
  boton(b.div, 'Sofi').click();
  const sig = ultima ? 'Ver resumen' : 'Siguiente';
  await hasta(() => boton(a.div, sig) && boton(b.div, sig));
};

prueba('probable pantallas: si falla avanzar, «Siguiente» vuelve a quedar activo con un aviso y reintenta', async () => {
  const { a, b } = await enJuego(5, { envolver: (n, l) => (l === 'a' ? nubeQueFalla(n) : n) });
  await votarLosDos(a, b, 0);
  fallo.transaccion = true;
  boton(a.div, 'Siguiente').click();
  await hasta(() => a.div.textContent.includes('No se pudo avanzar. Revisa tu conexión e intenta otra vez.'));
  verdadero(!boton(a.div, 'Siguiente').disabled, 'el botón se reactiva');
  boton(a.div, 'Siguiente').click();
  await hasta(() => a.div.textContent.includes('Frase 2 de 5') && b.div.textContent.includes('Frase 2 de 5'));
  salir();
});

prueba('probable pantallas: si el resumen no carga ofrece «Reintentar» y cierra la sala', async () => {
  const { a, b, id } = await enJuego(5, { envolver: (n, l) => (l === 'a' ? nubeQueFalla(n) : n) });
  for (let i = 0; i < 4; i++) {
    await votarLosDos(a, b, i);
    boton(a.div, 'Siguiente').click();
    await hasta(() => a.div.textContent.includes(`Frase ${i + 2} de 5`) && b.div.textContent.includes(`Frase ${i + 2} de 5`));
  }
  await votarLosDos(a, b, 4, true);
  fallo.leer = true;
  boton(a.div, 'Ver resumen').click();
  await hasta(() => boton(a.div, 'Reintentar'));
  verdadero(a.div.textContent.includes('No se pudo cargar el resumen'));
  boton(a.div, 'Reintentar').click();
  await hasta(() => a.div.textContent.includes('Coincidieron en 5 de 5'));
  let vistas;
  for (let i = 0; i < 50 && !vistas?.divertidas?.length; i++) { vistas = await leerVistas(a.nube, a.pareja); await esperar(20); }
  igual(vistas.divertidas.length, 5);
  igual(id.startsWith('q-'), true);
  salir();
});

prueba('probable pantallas: doble toque en «Siguiente» avanza una sola frase', async () => {
  const { a, b, id } = await enJuego(5);
  await votarLosDos(a, b, 0);
  const sa = boton(a.div, 'Siguiente');
  const sb = boton(b.div, 'Siguiente');
  sa.click(); sa.click(); sb.click(); sb.click();
  await hasta(() => a.div.textContent.includes('Frase 2 de 5'));
  await esperar(200);
  const s = await a.nube.leer(rutaSala(a.pareja.codigo, id));
  igual([s.indice, s.ronda], [1, 1]);
  salir();
});

prueba('probable pantallas: al volver a una sala jugando después de votar muestra la espera', async () => {
  const { a, id } = await enJuego(5);
  boton(a.div, 'Sofi').click();
  await hasta(() => a.div.textContent.includes('Esperando a Sofi…'));
  await esperar(100); // el voto y el aviso de «votaron» llegan a la nube
  salir();
  const otra = document.createElement('div');
  await a.pantallas.juego(otra, { id }, a.ctx);
  await hasta(() => otra.textContent.includes('Esperando a Sofi…'));
  verdadero(!otra.querySelector('.opcion-juego'), 'no vuelve a ofrecer votar');
  salir();
});

prueba('probable pantallas: sala cancelada tras 2 frases reveladas resume esas 2', async () => {
  const { a, b, id } = await enJuego(5);
  await votarLosDos(a, b, 0);
  boton(a.div, 'Siguiente').click();
  await hasta(() => a.div.textContent.includes('Frase 2 de 5') && b.div.textContent.includes('Frase 2 de 5'));
  await votarLosDos(a, b, 1);
  await a.nube.escribir(rutaSala(a.pareja.codigo, id), { estado: 'cancelada' }, { combinar: true });
  await hasta(() => a.div.textContent.includes('Coincidieron en 2 de 2') && b.div.textContent.includes('Coincidieron en 2 de 2'));
  verdadero(a.div.textContent.includes('La sala se cortó antes del final.'));
  let vistas;
  for (let i = 0; i < 50 && !vistas?.divertidas?.length; i++) { vistas = await leerVistas(a.nube, a.pareja); await esperar(20); }
  igual(vistas.divertidas.length, 2);
  salir();
});

prueba('probable pantallas: «Cancelar» del anfitrión no enseña el resumen de cancelada antes de irse', async () => {
  const p = await parejaProbable();
  const id = await crearSala(p.a.nube, p.a.pareja, { tema: 'divertidas', frases: BANCO.slice(0, 5) });
  await p.a.pantallas.juego(p.a.div, { id }, p.a.ctx);
  await hasta(() => boton(p.a.div, 'Cancelar'));
  boton(p.a.div, 'Cancelar').click();
  await hasta(() => p.a.rutas.length > 0);
  await esperar(100);
  verdadero(!p.a.div.textContent.includes('se canceló'), p.a.div.textContent);
  igual(p.a.rutas, ['probable']);
  salir();
});

prueba('probable pantallas: si la sala desaparece avisa y oculta «se salió»', async () => {
  const { a, reloj, id } = await enJuego(5);
  reloj.adelantar(21000);
  await hasta(() => a.div.textContent.includes('Sofi se salió'));
  await a.nube.borrar(rutaSala(a.pareja.codigo, id));
  await hasta(() => a.div.textContent.includes('Esta sala ya no existe'));
  verdadero(a.div.querySelector('.banda-aviso').hidden, 'la banda se oculta');
  reloj.adelantar(30000);
  await esperar(100);
  verdadero(a.div.querySelector('.banda-aviso').hidden, 'sigue oculta');
  salir();
});
// ---- Ronda final: salir de una ronda, salas vencidas, doble apertura ----
const conConfirm = async (respuesta, fn) => {
  const real = globalThis.confirm;
  globalThis.confirm = () => respuesta;
  try { await fn(); } finally { globalThis.confirm = real; }
};

prueba('probable pantallas: el inicio con una ronda en curso no entra solo y ofrece volver o terminar', async () => {
  const { a, id } = await enJuego(5);
  const antes = a.rutas.length;
  const otra = document.createElement('div');
  await a.pantallas.inicio(otra, {}, a.ctx);
  await hasta(() => boton(otra, 'Terminar ronda'));
  verdadero(otra.textContent.includes('Tienen una ronda en curso'), otra.textContent);
  await esperar(150); // varios sondeos
  igual(a.rutas.length, antes, 'no navega solo');
  boton(otra, 'Volver a la ronda').click();
  await hasta(() => a.rutas.length === antes + 1);
  igual(a.rutas[antes], `probable/jugar/${id}`);
  salir();
});

prueba('probable pantallas: «Terminar ronda» del inicio pide confirmar, cancela y lleva al resumen', async () => {
  const { a, b, id } = await enJuego(5);
  const antes = a.rutas.length;
  const otra = document.createElement('div');
  await a.pantallas.inicio(otra, {}, a.ctx);
  await hasta(() => boton(otra, 'Terminar ronda'));
  await conConfirm(false, async () => { boton(otra, 'Terminar ronda').click(); await esperar(100); });
  igual((await a.nube.leer(rutaSala(a.pareja.codigo, id))).estado, 'jugando');
  igual(a.rutas.length, antes);
  await conConfirm(true, async () => { boton(otra, 'Terminar ronda').click(); await hasta(() => a.rutas.length === antes + 1); });
  igual((await a.nube.leer(rutaSala(a.pareja.codigo, id))).estado, 'cancelada');
  await hasta(() => a.div.textContent.includes('se canceló') && b.div.textContent.includes('se canceló'));
  salir();
});

prueba('probable pantallas: «Terminar ronda» dentro del juego termina la ronda para los dos tras confirmar', async () => {
  const { a, b, id } = await enJuego(5);
  verdadero(boton(a.div, 'Terminar ronda') && !boton(a.div, 'Terminar ronda').hidden, 'siempre disponible');
  await conConfirm(false, async () => { boton(a.div, 'Terminar ronda').click(); await esperar(100); });
  igual((await a.nube.leer(rutaSala(a.pareja.codigo, id))).estado, 'jugando');
  await conConfirm(true, async () => { boton(a.div, 'Terminar ronda').click(); });
  await hasta(() => a.div.textContent.includes('se canceló') && b.div.textContent.includes('se canceló'));
  igual((await a.nube.leer(rutaSala(a.pareja.codigo, id))).estado, 'cancelada');
  verdadero(boton(a.div, 'Terminar ronda').hidden, 'se oculta al cerrar');
  salir();
});

prueba('probable pantallas: «Terminar ronda» con frases reveladas muestra su resumen', async () => {
  const { a, b } = await enJuego(5);
  await votarLosDos(a, b, 0);
  await conConfirm(true, async () => { boton(b.div, 'Terminar ronda').click(); });
  await hasta(() => a.div.textContent.includes('Coincidieron en 1 de 1') && b.div.textContent.includes('Coincidieron en 1 de 1'));
  salir();
});

prueba('probable pantallas: una sala que espera más de 30 minutos se cancela y el inicio muestra «Abrir sala»', async () => {
  const p = await parejaProbable();
  const id = await crearSala(p.a.nube, p.a.pareja, { tema: 'divertidas', frases: BANCO.slice(0, 5) });
  await p.a.nube.escribir(rutaSala(p.a.pareja.codigo, id), { creadaMs: Date.now() - 31 * 60 * 1000 }, { combinar: true });
  await p.b.pantallas.inicio(p.b.div, {}, p.b.ctx);
  await hasta(() => boton(p.b.div, 'Abrir sala'));
  verdadero(!p.b.div.textContent.includes('te está esperando'));
  igual(textoEsperando(p.b.ctx.almacen, p.b.pareja, 'probable'), null);
  igual((await p.b.nube.leer(rutaSala(p.b.pareja.codigo, id))).estado, 'cancelada');
  salir();
});

prueba('probable pantallas: dos «Abrir sala» a la vez dejan una sola sala y el segundo ve «ya abrió una sala»', async () => {
  const p = await parejaProbable();
  p.b.pantallas = crearPantallasProbable({ cargar: async () => BANCO, ahora: p.reloj.ahora, ms: { sondeo: 100000, revisar: 20 } });
  await p.b.pantallas.inicio(p.b.div, {}, p.b.ctx);
  await hasta(() => boton(p.b.div, 'Abrir sala'));
  // Carlos abre justo antes de que el celular de Sofi se entere.
  const idA = await crearSala(p.a.nube, p.a.pareja, { tema: 'divertidas', frases: BANCO.slice(0, 5) });
  boton(p.b.div, 'Abrir sala').click();
  await hasta(() => p.b.div.textContent.includes('Carlos ya abrió una sala') && boton(p.b.div, 'Unirme'));
  igual(p.b.rutas, []);
  igual((await p.b.nube.leer(`parejas/${p.b.pareja.codigo}/estado/uso`)).probableAbierta, idA);
  boton(p.b.div, 'Unirme').click();
  await hasta(() => p.b.rutas.length > 0);
  igual(p.b.rutas, [`probable/jugar/${idA}`]);
  igual((await p.b.nube.leer(rutaSala(p.b.pareja.codigo, idA))).estado, 'jugando');
  salir();
});

prueba('probable pantallas: tras «Abrir sala» el anfitrión entra a su sala; si vuelve al inicio ve «Volver a la sala» y puede cancelar', async () => {
  const p = await parejaProbable();
  await p.a.pantallas.inicio(p.a.div, {}, p.a.ctx);
  await hasta(() => boton(p.a.div, 'Abrir sala'));
  boton(p.a.div, 'Abrir sala').click();
  await hasta(() => p.a.rutas.length === 1);
  const id = p.a.rutas[0].split('/')[2];
  salir();
  const otra = document.createElement('div');
  await p.a.pantallas.inicio(otra, {}, p.a.ctx);
  await hasta(() => boton(otra, 'Cancelar sala'));
  verdadero(boton(otra, 'Volver a la sala'));
  await esperar(100);
  igual(p.a.rutas.length, 1, 'no rebota');
  boton(otra, 'Cancelar sala').click();
  await hasta(() => boton(otra, 'Abrir sala'));
  igual((await p.a.nube.leer(rutaSala(p.a.pareja.codigo, id))).estado, 'cancelada');
  salir();
});

prueba('probable pantallas: «Reintentar» del inicio detiene el sondeo antes de refrescar', async () => {
  let leyendo = false;
  let lecturas = 0;
  const { a } = await parejaProbable({ envolver: (n, l) => {
    if (l !== 'a') return n;
    const w = Object.create(n);
    w.leer = (ruta) => {
      if (!leyendo) return n.leer(ruta);
      lecturas++;
      return Promise.reject(new Error('sin red'));
    };
    return w;
  } });
  leyendo = true;
  await a.pantallas.inicio(a.div, {}, a.ctx);
  await hasta(() => boton(a.div, 'Reintentar'));
  boton(a.div, 'Reintentar').click();
  const antes = lecturas;
  await esperar(150); // con sondeo de 30 ms habría varias lecturas más
  igual(lecturas, antes);
  salir();
});

prueba('probable pantallas: si el voto quedó creado pero no se avisó, se muestra elegido y no se vuelve a ofrecer', async () => {
  const falla = { votaron: true };
  const { a, b, id } = await enJuego(5, { envolver: (n, l) => {
    if (l !== 'a') return n;
    const w = Object.create(n);
    w.escribir = (ruta, datos, op) => {
      if (falla.votaron && datos?.votaron) { falla.votaron = false; return Promise.reject(new Error('sin red')); }
      return n.escribir(ruta, datos, op);
    };
    return w;
  } });
  boton(a.div, 'Sofi').click();
  await hasta(() => a.div.textContent.includes('Tu voto: Sofi'));
  verdadero(!a.div.querySelector('.opcion-juego'), 'no vuelve a ofrecer votar');
  verdadero(a.div.textContent.includes('no se pudo avisar a Sofi'), a.div.textContent);
  boton(a.div, 'Reintentar').click();
  await hasta(() => !boton(a.div, 'Reintentar'));
  boton(b.div, 'Sofi').click();
  await hasta(() => a.div.textContent.includes('¡Coincidieron!') && b.div.textContent.includes('¡Coincidieron!'));
  salir();
});

prueba('probable pantallas: si el voto no se creó, vuelve a ofrecer las opciones', async () => {
  const falla = { transaccion: false };
  const { a } = await enJuego(5, { envolver: (n, l) => {
    if (l !== 'a') return n;
    const w = Object.create(n);
    w.transaccion = (fn) => {
      if (falla.transaccion) { falla.transaccion = false; return Promise.reject(new Error('sin red')); }
      return n.transaccion(fn);
    };
    return w;
  } });
  falla.transaccion = true;
  boton(a.div, 'Sofi').click();
  await hasta(() => a.div.textContent.includes('No se pudo enviar tu voto'));
  verdadero(a.div.querySelector('.opcion-juego'), 'vuelve a ofrecer votar');
  salir();
});