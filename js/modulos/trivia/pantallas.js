// Pantallas de la trivia en vivo: sala (invitar, unirse, victorias) y juego (pregunta, revelado, final).
import { el, movimientoReducido } from '../../nucleo/ui.js';
import { icono } from '../../nucleo/iconos.js';
import { sonar, vibrar } from '../../nucleo/sonidos.js';
import { exigirPareja } from '../../nucleo/pantallas-pareja.js';
import { elegirPartida } from './banco.js';
import { preguntasConoces, insertarConoces } from './conoces.js';
import { MS_PREGUNTA, MS_GRACIA, MS_REVELADO, ambosRespondieron, resultadoPregunta, puntaje, ganador, preguntaDe } from './partida.js';
import {
  crearSala, partidaPendiente, cancelarSala, unirse, enviarRespuesta, intentarAvanzar, escucharPartida, latir,
  cerrarPartida, leerUso, rutaPartidas,
} from './sala.js';

const MS_DESCONEXION = 15000;
const MS_URGENTE = 5000;
const NS_SVG = 'http://www.w3.org/2000/svg';
const RADIO = 26;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

const otroLugar = (l) => (l === 'a' ? 'b' : 'a');
const alSalirDeRuta = (fn) => window.addEventListener('hashchange', fn, { once: true });
const textoOpcion = (p, opcion) => {
  if (opcion === null || opcion === undefined) return 'Sin respuesta';
  return p.tipo === 'vf' ? (opcion ? 'Verdadero' : 'Falso') : p.opciones[opcion];
};
function svg(etiqueta, atributos = {}) {
  const nodo = document.createElementNS(NS_SVG, etiqueta);
  for (const [k, v] of Object.entries(atributos)) nodo.setAttribute(k, v);
  return nodo;
}
const vacio = (mensaje, ...acciones) => el('div', { clase: 'vacio' }, el('p', {}, mensaje), acciones);

// "¿Cuánto me conoces?" con lo que el diario ya aprendió de los dos; si algo falla, la partida sale sin ellas.
async function conocesPara(nube, pareja, datos) {
  if (!datos.diario?.length) return [];
  try {
    const ruta = (l) => `parejas/${pareja.codigo}/perfiles/${l}`;
    const [a, b] = await Promise.all([nube.leer(ruta('a')), nube.leer(ruta('b'))]);
    return preguntasConoces({ perfiles: { a, b }, preguntas: datos.diario, nombres: pareja.nombres });
  } catch (e) {
    console.warn('Okupa: sin «¿Cuánto me conoces?» esta vez', e);
    return [];
  }
}

// `ahora` y `ms` se pueden cambiar en las pruebas para no esperar los tiempos reales.
export function crearPantallasTrivia({ cargar, ahora = () => performance.now(), ms = {} } = {}) {
  const T = { ruleta: 700, cuenta: 800, revelado: MS_REVELADO, revisar: 200, sondeo: 3000, ...ms };

  async function preparar(zona, ctx) {
    const cargando = cargar(); // en paralelo con la conexión, no después
    cargando.catch(() => {});
    const r = await exigirPareja(zona, ctx);
    if (!r) return null;
    try {
      return { ...r, datos: await cargando };
    } catch (e) {
      console.warn('Okupa: no se pudo cargar la trivia', e);
      zona.replaceChildren(vacio('No se pudieron cargar las preguntas',
        el('button', { clase: 'boton boton-principal', type: 'button', onclick: () => ctx.refrescar() }, 'Reintentar')));
      return null;
    }
  }

  // Ejecuta una acción de botón y, si falla, lo dice sin romper la pantalla.
  const accion = (aviso, fn) => async (e) => {
    const b = e?.currentTarget;
    if (b) b.disabled = true;
    try { await fn(); } catch (error) {
      console.warn('Okupa:', error);
      aviso.textContent = 'No se pudo. Revisa la conexión e intenta otra vez.';
      if (b) b.disabled = false;
    }
  };

  async function sala(contenedor, _params, ctx) {
    const zona = el('div', { clase: 'trivia' });
    contenedor.append(el('a', { clase: 'volver', href: '#/' }, '← Inicio'), zona);
    const r = await preparar(zona, ctx);
    if (!r) return;
    const { nube, pareja, datos } = r;
    const yo = pareja.lugar;
    const nombreOtro = pareja.nombres[otroLugar(yo)];
    const cabecera = () => [
      el('h1', { clase: 'titulo-pantalla' }, 'Trivia'),
      el('p', { clase: 'subtitulo' }, 'Diez preguntas, 20 segundos cada una. Gana quien más sabe… y quien responde más rápido.'),
    ];
    if (!nombreOtro) {
      zona.replaceChildren(...cabecera(), vacio('Tu pareja todavía no se ha unido',
        el('a', { clase: 'boton boton-principal', href: '#/pareja' }, 'Ver el código')));
      return;
    }

    const aviso = el('p', { clase: 'error-formulario', role: 'alert' });
    let firma = null;
    let dejarDeEscuchar = () => {};
    const sondeo = setInterval(() => pintar().catch(() => {}), T.sondeo);
    alSalirDeRuta(() => { clearInterval(sondeo); dejarDeEscuchar(); });

    async function pintar() {
      const [pendiente, uso] = await Promise.all([partidaPendiente(nube, pareja), leerUso(nube, pareja)]);
      const nuevaFirma = JSON.stringify([pendiente?.id, pendiente?.estado, uso.victorias]);
      if (nuevaFirma === firma) return;
      firma = nuevaFirma;
      dejarDeEscuchar();
      dejarDeEscuchar = () => {};
      let contenido;
      if (pendiente?.estado === 'jugando') {
        contenido = [el('p', {}, 'Tienen una partida en curso.'),
          el('a', { clase: 'boton boton-principal', href: `#/trivia/jugar/${encodeURIComponent(pendiente.id)}` }, 'Volver a la partida')];
      } else if (pendiente && pendiente.anfitrion !== yo) {
        contenido = [el('p', { clase: 'sala-invitacion' }, `${nombreOtro} te invitó a jugar`),
          el('button', { clase: 'boton boton-principal', type: 'button', onclick: accion(aviso, async () => {
            await unirse(nube, pareja, pendiente.id);
            ctx.ir(`trivia/jugar/${pendiente.id}`);
          }) }, 'Unirme')];
      } else if (pendiente) {
        contenido = [el('p', { clase: 'sala-invitacion' }, `Esperando a que ${nombreOtro} se una…`),
          el('button', { clase: 'boton', type: 'button', onclick: accion(aviso, async () => {
            await cancelarSala(nube, pareja, pendiente.id);
            firma = null;
            await pintar();
          }) }, 'Cancelar')];
        dejarDeEscuchar = escucharPartida(nube, pareja, pendiente.id, (p) => {
          if (p?.estado === 'jugando') ctx.ir(`trivia/jugar/${p.id}`);
        });
      } else {
        contenido = [el('button', { clase: 'boton boton-principal boton-grande', type: 'button', onclick: accion(aviso, async () => {
          let preguntas = elegirPartida({ bancos: datos.bancos, vocabulario: datos.vocabulario, vistas: uso.vistasTrivia, fallidas: uso.fallidas });
          preguntas = insertarConoces(preguntas, await conocesPara(nube, pareja, datos));
          await crearSala(nube, pareja, { preguntas });
          firma = null;
          await pintar();
        }) }, 'Nueva partida')];
      }
      zona.replaceChildren(...cabecera(),
        el('div', { clase: 'sala-accion' }, contenido), aviso,
        el('p', { clase: 'victorias' }, `Victorias: ${pareja.nombres.a} ${uso.victorias.a} · ${pareja.nombres.b} ${uso.victorias.b}`));
    }

    try { await pintar(); } catch (e) {
      console.warn('Okupa: la sala no cargó', e);
      zona.replaceChildren(...cabecera(), vacio('Se perdió la conexión',
        el('button', { clase: 'boton boton-principal', type: 'button', onclick: () => ctx.refrescar() }, 'Reintentar')));
    }
  }

  async function juego(contenedor, { id }, ctx) {
    const zona = el('div', { clase: 'trivia' });
    contenedor.append(el('a', { clase: 'volver', href: '#/trivia' }, '← Trivia'), zona);
    const r = await preparar(zona, ctx);
    if (!r) return;
    const { nube, pareja, datos } = r;
    const yo = pareja.lugar;
    const otro = otroLugar(yo);
    const nombre = (l) => pareja.nombres[l] || 'Tu pareja';
    const temas = new Map(datos.temas.map((t) => [t.id, t]));

    let partida = null;
    let rondaVista = null;
    let t0 = null;
    let mia = null;
    let revelada = false;
    let cerrada = false;
    let senalOtro;
    let cambioSenal = ahora();
    let ui = null;
    const relojes = [];

    const marcador = el('p', { clase: 'marcador-juego' });
    const textoAviso = el('span');
    const aviso = el('div', { clase: 'banda-aviso', hidden: true, role: 'status' }, textoAviso,
      el('button', { clase: 'boton-texto', type: 'button', onclick: () => nube.escribir(`${rutaPartidas(pareja.codigo)}/${id}`, { estado: 'terminada' }, { combinar: true }).catch(() => {}) }, 'Terminar partida'));
    const escena = el('div', { clase: 'escena' });
    zona.replaceChildren(marcador, aviso, escena);

    const dejarDeEscuchar = escucharPartida(nube, pareja, id, (p) => { if (p) { partida = p; actualizar(); } });
    const detenerLatido = latir(nube, pareja, id);
    const tic = setInterval(revisar, T.revisar);
    alSalirDeRuta(() => { dejarDeEscuchar(); detenerLatido(); clearInterval(tic); relojes.forEach(clearTimeout); });

    function actualizar() {
      const pts = puntaje(partida);
      marcador.textContent = `${nombre('a')} ${pts.a} · ${nombre('b')} ${pts.b}`;
      const senal = JSON.stringify(partida.senal?.[otro] ?? null);
      if (senal !== senalOtro) { senalOtro = senal; cambioSenal = ahora(); }
      if (partida.estado === 'cancelada') { escena.replaceChildren(vacio('La partida se canceló', el('a', { clase: 'boton', href: '#/trivia' }, 'Volver'))); return; }
      if (partida.estado === 'esperando') { escena.replaceChildren(vacio(`Esperando a que ${nombre(otro)} se una…`)); return; }
      if (partida.estado === 'terminada') { final(); return; }
      if (partida.ronda !== rondaVista) nuevaRonda();
      else if (!revelada && ui && ambosRespondieron(partida)) revelar();
    }

    function nuevaRonda() {
      rondaVista = partida.ronda;
      mia = partida.respuestas?.[yo]?.[partida.indice] ?? null;
      revelada = false;
      t0 = null;
      ui = null;
      relojes.forEach(clearTimeout);
      relojes.length = 0;
      const ronda = rondaVista;
      const p = preguntaDe(partida, partida.indice, yo);
      const tema = temas.get(p.tema) || { nombre: '¿Cuánto me conoces?', icono: '∞', color: '#c9a45c' };
      const pasos = [];
      if (!movimientoReducido() && T.ruleta > 0) pasos.push([() => escena.replaceChildren(ruleta(tema)), T.ruleta]);
      if (!movimientoReducido() && T.cuenta > 0) {
        for (const n of ['3', '2', '1']) pasos.push([() => escena.replaceChildren(el('p', { clase: 'cuenta-juego', 'aria-live': 'polite' }, n)), T.cuenta]);
      }
      let espera = 0;
      for (const [fn, dur] of pasos) {
        relojes.push(setTimeout(() => { if (rondaVista === ronda) fn(); }, espera));
        espera += dur;
      }
      relojes.push(setTimeout(() => { if (rondaVista === ronda) pintarPregunta(p, tema); }, espera));
    }

    const ruleta = (tema) => {
      const r = el('div', { clase: 'ruleta' }, el('span', { clase: 'ruleta-icono', 'aria-hidden': 'true' }, icono(tema.icono)), el('span', {}, tema.nombre));
      r.style.setProperty('--acento', tema.color);
      return r;
    };

    function pintarPregunta(p, tema) {
      t0 = ahora();
      const arco = svg('circle', { cx: 30, cy: 30, r: RADIO, class: 'anillo-progreso', 'stroke-dasharray': CIRCUNFERENCIA, 'stroke-dashoffset': 0 });
      const anillo = svg('svg', { viewBox: '0 0 60 60', class: 'anillo', 'aria-hidden': 'true' });
      anillo.append(svg('circle', { cx: 30, cy: 30, r: RADIO, class: 'anillo-fondo' }), arco);
      const segundos = el('span', { clase: 'segundos', role: 'timer', 'aria-live': 'off' }, '20');
      const valores = p.tipo === 'vf' ? [true, false] : p.opciones.map((_, i) => i);
      const botones = valores.map((valor) => {
        const b = el('button', { clase: 'opcion-juego', type: 'button', 'aria-pressed': 'false' }, textoOpcion(p, valor));
        b.addEventListener('click', () => elegir(valor));
        return [valor, b];
      });
      const estado = el('p', { clase: 'estado-juego', role: 'status' });
      const dato = el('p', { clase: 'dato-juego', hidden: true }, p.dato);
      const pie = el('div', { clase: 'pie-juego' });
      const chip = el('span', { clase: 'chip-tema' }, el('span', { 'aria-hidden': 'true' }, icono(tema.icono)), ` ${tema.nombre}`);
      chip.style.setProperty('--acento', tema.color);
      const contenedorPregunta = el('div', { clase: 'pregunta-juego' },
        el('div', { clase: 'cabecera-juego' }, chip,
          el('span', { clase: 'reloj-juego' }, anillo, segundos)),
        el('p', { clase: 'numero-juego' }, `Pregunta ${partida.indice + 1} de ${partida.preguntas.length}`),
        el('p', { clase: 'texto-juego' }, p.texto),
        el('div', { clase: p.tipo === 'vf' ? 'opciones-vf' : 'opciones-4' }, botones.map(([, b]) => b)),
        estado, dato, pie);
      escena.replaceChildren(contenedorPregunta);
      ui = { p, arco, segundos, botones, estado, dato, pie, contenedorPregunta };
      if (mia) marcarMia();
      if (ambosRespondieron(partida)) revelar();
    }

    function marcarMia() {
      for (const [valor, b] of ui.botones) {
        b.disabled = true;
        b.setAttribute('aria-pressed', String(mia && valor === mia.opcion));
      }
      ui.estado.textContent = `Esperando a ${nombre(otro)}…`;
    }

    function elegir(valor) {
      if (!ui || mia || revelada || t0 === null) return;
      const tardanza = ahora() - t0;
      if (tardanza > MS_PREGUNTA) return;
      mia = { opcion: valor, ms: Math.round(tardanza) };
      marcarMia();
      vibrar(15);
      enviarRespuesta(nube, pareja, id, { indice: partida.indice, ...mia })
        .catch(() => { ui.estado.textContent = 'No se pudo enviar tu respuesta. Revisa la conexión.'; });
    }

    function revisar() {
      if (partida?.estado === 'jugando') {
        aviso.hidden = ahora() - cambioSenal <= MS_DESCONEXION;
        textoAviso.textContent = `${nombre(otro)} se desconectó, esperando…`;
      } else aviso.hidden = true;
      if (!ui || t0 === null || revelada) return;
      const pasado = ahora() - t0;
      const restante = Math.max(0, MS_PREGUNTA - pasado);
      ui.arco.setAttribute('stroke-dashoffset', String(CIRCUNFERENCIA * (1 - restante / MS_PREGUNTA)));
      ui.segundos.textContent = String(Math.ceil(restante / 1000));
      ui.contenedorPregunta.classList.toggle('urgente', restante <= MS_URGENTE);
      if (restante === 0 && !mia) {
        ui.botones.forEach(([, b]) => { b.disabled = true; });
        ui.estado.textContent = 'Se acabó el tiempo';
      }
      if (ambosRespondieron(partida) || pasado >= MS_PREGUNTA + MS_GRACIA) revelar();
    }

    function revelar() {
      if (revelada || !ui) return;
      revelada = true;
      const ronda = partida.ronda;
      const res = resultadoPregunta(partida, partida.indice);
      const { p } = ui;
      const propio = partida.respuestas?.[yo]?.[partida.indice] ?? mia;
      for (const [valor, b] of ui.botones) {
        b.disabled = true;
        const etiqueta = textoOpcion(p, valor);
        if (valor === p.respuesta) { b.classList.add('correcta'); b.textContent = `✓ ${etiqueta}`; }
        else if (propio && valor === propio.opcion) { b.classList.add('incorrecta'); b.textContent = `✗ ${etiqueta}`; }
        for (const l of ['a', 'b']) {
          const mismaPregunta = !partida.preguntas[partida.indice].para || l === yo;
          if (mismaPregunta && res[l].opcion === valor) b.append(el('span', { clase: 'inicial', 'aria-label': `Escogió ${nombre(l)}` }, (nombre(l)[0] || '?').toUpperCase()));
        }
      }
      ui.contenedorPregunta.classList.add('revelado');
      ui.contenedorPregunta.classList.remove('urgente');
      ui.estado.textContent = res[yo].acerto ? '¡Correcto!' : 'No era esa';
      ui.estado.append(el('span', { clase: 'puntos-flotantes' }, ` +${res[yo].puntos}`));
      ui.dato.hidden = false;
      const siguiente = () => intentarAvanzar(nube, pareja, id, { ronda }).catch(() => {});
      ui.pie.replaceChildren(el('button', { clase: 'boton boton-principal', type: 'button', onclick: siguiente }, partida.indice + 1 < partida.preguntas.length ? 'Siguiente →' : 'Ver resultado'));
      relojes.push(setTimeout(siguiente, T.revelado));
      vibrar(res[yo].acerto ? 20 : [10, 40, 10]);
      if (res[yo].acerto) sonar('acierto');
    }

    function final() {
      ui = null;
      relojes.forEach(clearTimeout);
      detenerLatido();
      if (!cerrada) {
        cerrada = true;
        cerrarPartida(nube, pareja, partida).catch((e) => console.warn('Okupa: no se pudo guardar la partida', e));
        vibrar([30, 40, 60]);
      }
      const g = ganador(partida);
      const pts = puntaje(partida);
      const repaso = el('ol', { clase: 'repaso' }, partida.preguntas.map((_, i) => {
        const res = resultadoPregunta(partida, i);
        const fila = (l) => {
          const p = preguntaDe(partida, i, l);
          return el('span', { clase: 'repaso-jugador' }, `${nombre(l)}: ${textoOpcion(p, res[l].opcion)} ${res[l].acerto ? '✓' : '✗'}`);
        };
        const pYo = preguntaDe(partida, i, yo);
        return el('li', {}, el('p', { clase: 'repaso-texto' }, pYo.texto),
          el('p', { clase: 'repaso-correcta' }, `Correcta: ${textoOpcion(pYo, pYo.respuesta)}`), fila('a'), fila('b'));
      }));
      escena.replaceChildren(el('div', { clase: 'final-juego' },
        movimientoReducido() ? null : el('div', { clase: 'destellos', 'aria-hidden': 'true' }, Array.from({ length: 12 }, () => el('span'))),
        el('h2', { clase: 'titulo-final' }, g === 'empate' ? '¡Empate!' : `¡Ganó ${nombre(g)}!`),
        el('p', { clase: 'marcador-final' }, `${nombre('a')} ${pts.a} · ${nombre('b')} ${pts.b}`),
        el('div', { clase: 'enlace-acciones' },
          el('a', { clase: 'boton boton-principal', href: '#/trivia' }, 'Otra partida'),
          el('a', { clase: 'boton', href: '#/' }, 'Inicio')),
        el('h3', {}, 'Repaso'), repaso));
    }
  }

  return { sala, juego };
}
