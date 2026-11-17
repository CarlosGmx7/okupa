// Pantallas de «¿Quién es más probable?»: elegir tema, jugar, revelar cada frase y frases propias.
import { el } from '../../nucleo/ui.js';
import { exigirPareja } from '../../nucleo/pantallas-pareja.js';
import { guardarEsperando, sigueEsperando } from '../../nucleo/esperando.js';
import { TEMAS, LARGOS, elegirFrases, opcionesVoto, votaronTodos, coincidieron, resumen } from './logica.js';
import {
  crearSala, salaPendiente, unirse, cancelarSala, votar, leerVotos, intentarAvanzar, cerrarSala, leerVistas,
  escucharSala, latir, listarPropias, crearPropia, borrarPropia, ErrorSalaAjena, cancelarSiSigueEsperando, cancelarSiAbierta, rutaSala,
} from './sala.js';

const MS_SIN_SENAL = 20000;
const PREFIJO = '¿Quién es más probable que…';

const otroLugar = (l) => (l === 'a' ? 'b' : 'a');
const alSalirDeRuta = (fn) => window.addEventListener('hashchange', fn, { once: true });
const vacio = (mensaje, ...acciones) => el('div', { clase: 'vacio' }, el('p', {}, mensaje), acciones);
const veces = (n) => `${n} ${n === 1 ? 'vez' : 'veces'}`;
const frase = (texto) => [el('p', { clase: 'probable-prefijo' }, PREFIJO), el('p', { clase: 'probable-frase' }, texto)];

// `ahora` y `ms` se pueden cambiar en las pruebas para no esperar los tiempos reales.
export function crearPantallasProbable({ cargar, ahora = () => performance.now(), ms = {} } = {}) {
  const T = { sondeo: 3000, revisar: 1000, sinSenal: MS_SIN_SENAL, ...ms };

  async function preparar(zona, ctx, conDatos = true) {
    const cargando = conDatos ? cargar() : Promise.resolve(null);
    cargando.catch(() => {});
    const r = await exigirPareja(zona, ctx);
    if (!r) return null;
    try {
      return { ...r, datos: await cargando };
    } catch (e) {
      console.warn('Okupa: no se pudieron cargar las frases', e);
      zona.replaceChildren(vacio('No se pudieron cargar las frases',
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

  async function inicio(contenedor, _params, ctx) {
    const zona = el('div', { clase: 'probable' });
    contenedor.append(el('a', { clase: 'volver', href: '#/' }, '← Inicio'), zona);
    const r = await preparar(zona, ctx);
    if (!r) return;
    const { nube, pareja, datos } = r;
    const yo = pareja.lugar;
    const nombreOtro = pareja.nombres[otroLugar(yo)];
    const cabecera = () => [el('h1', { clase: 'titulo-pantalla' }, '¿Quién es más probable?'),
      el('p', { clase: 'subtitulo' }, 'Voten en secreto quién de los dos es más probable… y descubran si coinciden.')];
    if (!nombreOtro) {
      zona.replaceChildren(...cabecera(), vacio('Tu pareja todavía no se ha unido',
        el('a', { clase: 'boton boton-principal', href: '#/pareja' }, 'Ver el código')));
      return;
    }

    const aviso = el('p', { clase: 'error-formulario', role: 'alert' });
    let firma = null;
    let yendo = false;
    let invitacion = null; // «<nombre> ya abrió una sala» cuando los dos abrieron a la vez
    const sondeo = setInterval(() => pintar().catch(() => {}), T.sondeo);
    alSalirDeRuta(() => clearInterval(sondeo));
    const ir = (id) => { yendo = true; ctx.ir(`probable/jugar/${id}`); };

    async function pintar() {
      if (yendo) return;
      let pendiente = await salaPendiente(nube, pareja);
      // Una sala que lleva esperando más de 30 minutos ya no cuenta: se cierra y se ofrece abrir otra.
      if (pendiente?.estado === 'esperando' && !sigueEsperando(pendiente)) {
        await cancelarSiSigueEsperando(nube, pareja, pendiente.id).catch((e) => console.warn('Okupa:', e));
        pendiente = await salaPendiente(nube, pareja);
        if (pendiente?.estado === 'esperando' && !sigueEsperando(pendiente)) pendiente = null;
      }
      guardarEsperando(ctx.almacen, pareja.codigo, 'probable', sigueEsperando(pendiente) && pendiente.anfitrion !== yo
        ? { id: pendiente.id, anfitrion: pendiente.anfitrion, nombre: pareja.nombres[pendiente.anfitrion] ?? null, creadaMs: pendiente.creadaMs } : null);
      const nuevaFirma = JSON.stringify([pendiente?.id, pendiente?.estado]);
      if (nuevaFirma === firma) return;
      firma = nuevaFirma;
      if (pendiente?.estado === 'jugando') {
        invitacion = null;
        zona.replaceChildren(...cabecera(), el('div', { clase: 'sala-accion' },
          el('p', { clase: 'sala-invitacion' }, 'Tienen una ronda en curso'),
          el('button', { clase: 'boton boton-principal', type: 'button', onclick: () => ir(pendiente.id) }, 'Volver a la ronda'),
          el('button', { clase: 'boton', type: 'button', onclick: (e) => {
            if (!globalThis.confirm('¿Terminar la ronda para los dos?')) return;
            accion(aviso, async () => {
              await cancelarSiAbierta(nube, pareja, pendiente.id);
              guardarEsperando(ctx.almacen, pareja.codigo, 'probable', null);
              ir(pendiente.id); // la pantalla de la ronda enseña el resumen de lo revelado
            })(e);
          } }, 'Terminar ronda')), aviso);
        return;
      }
      if (pendiente && pendiente.anfitrion === yo) {
        invitacion = null;
        zona.replaceChildren(...cabecera(), el('div', { clase: 'sala-accion' },
          el('p', { clase: 'sala-invitacion' }, `Tu sala está abierta; ${nombreOtro} todavía no se une`),
          el('button', { clase: 'boton boton-principal', type: 'button', onclick: () => ir(pendiente.id) }, 'Volver a la sala'),
          el('button', { clase: 'boton', type: 'button', onclick: accion(aviso, async () => {
            await cancelarSiSigueEsperando(nube, pareja, pendiente.id);
            firma = null;
            await pintar();
          }) }, 'Cancelar sala')), aviso);
        return;
      }
      if (pendiente) {
        zona.replaceChildren(...cabecera(), el('div', { clase: 'sala-accion' },
          el('p', { clase: 'sala-invitacion' }, invitacion ?? `${nombreOtro} te está esperando`),
          el('button', { clase: 'boton boton-principal', type: 'button', onclick: accion(aviso, async () => {
            await unirse(nube, pareja, pendiente.id);
            guardarEsperando(ctx.almacen, pareja.codigo, 'probable', null);
            ir(pendiente.id);
          }) }, 'Unirme')), aviso);
        return;
      }
      invitacion = null;
      const [vistas, propias] = await Promise.all([leerVistas(nube, pareja), listarPropias(nube, pareja)]);
      const lista = (t) => (t === 'nuestras' ? propias : datos.filter((f) => f.tema === t));
      const sinSalir = (t) => lista(t).filter((f) => !(vistas[t] || []).includes(f.id)).length;
      let tema = TEMAS.find((t) => lista(t.id).length > 0)?.id ?? null;
      let largo = 10;
      const botonesLargo = LARGOS.map((n) => {
        const b = el('button', { clase: 'chip', type: 'button', 'aria-pressed': String(n === largo), onclick: () => {
          largo = n;
          botonesLargo.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        } }, String(n));
        return b;
      });
      const temas = TEMAS.map((t) => el('label', { clase: 'tema-probable' },
        el('input', { type: 'radio', name: 'tema', value: t.id, checked: t.id === tema, disabled: lista(t.id).length === 0, onchange: () => { tema = t.id; } }),
        el('span', { clase: 'tema-nombre' }, `${t.icono} ${t.nombre}`),
        el('span', { clase: 'tema-sin' }, `${sinSalir(t.id)} sin salir`)));
      zona.replaceChildren(...cabecera(),
        el('fieldset', { clase: 'temas-probable' }, el('legend', {}, 'Tema'), temas),
        el('div', { clase: 'campo' }, el('span', { clase: 'etiqueta' }, 'Cuántas frases'), el('div', { clase: 'chips' }, botonesLargo)),
        el('div', { clase: 'sala-accion' },
          el('button', { clase: 'boton boton-principal boton-grande', type: 'button', disabled: tema === null, onclick: accion(aviso, async () => {
            const frases = elegirFrases(lista(tema), vistas[tema] || [], largo).map(({ id, texto }) => ({ id, texto }));
            try {
              ir(await crearSala(nube, pareja, { tema, frases }));
            } catch (e) {
              if (!(e instanceof ErrorSalaAjena)) throw e;
              invitacion = `${nombreOtro} ya abrió una sala`;
              firma = null;
              await pintar();
            }
          }) }, 'Abrir sala'),
          el('a', { clase: 'boton-texto', href: '#/probable/frases' }, 'Nuestras frases ›')),
        aviso);
    }

    try { await pintar(); } catch (e) {
      console.warn('Okupa: la sala no cargó', e);
      zona.replaceChildren(...cabecera(), vacio('Se perdió la conexión',
        el('button', { clase: 'boton boton-principal', type: 'button', onclick: () => { clearInterval(sondeo); ctx.refrescar(); } }, 'Reintentar')));
    }
  }

  async function juego(contenedor, { id }, ctx) {
    const zona = el('div', { clase: 'probable' });
    contenedor.append(el('a', { clase: 'volver', href: '#/probable' }, '← ¿Quién es más probable?'), zona);
    const r = await preparar(zona, ctx, false);
    if (!r) return;
    const { nube, pareja } = r;
    guardarEsperando(ctx.almacen, pareja.codigo, 'probable', null);
    const yo = pareja.lugar;
    const otro = otroLugar(yo);
    const nombre = (l) => pareja.nombres[l] || 'Tu pareja';
    const opciones = opcionesVoto(pareja.nombres, yo);
    const textoVoto = (v) => opciones.find((o) => o.valor === v)?.texto ?? 'Sin voto';

    let sala = null;
    let fase = null;
    let saliendo = false;
    let senalOtro;
    let cambioSenal = ahora();
    const votoMio = {};
    const textoAviso = el('span');
    const salir = el('button', { clase: 'boton-texto', type: 'button' }, 'Salir');
    const banda = el('div', { clase: 'banda-aviso', hidden: true, role: 'status' }, textoAviso, salir);
    const escena = el('div', { clase: 'escena' });
    // Salida permanente: cualquiera de los dos puede cerrar la ronda sin esperar a que el otro se calle.
    const terminar = el('button', { clase: 'boton-texto', type: 'button', hidden: true }, 'Terminar ronda');
    const errorTerminar = el('p', { clase: 'error-formulario', role: 'alert' });
    zona.replaceChildren(banda, escena, el('div', { clase: 'pie-ronda' }, terminar, errorTerminar));

    const dejarDeEscuchar = escucharSala(nube, pareja, id, (s) => {
      if (saliendo) return;
      if (!s) {
        sala = null;
        fase = 'inexistente';
        detenerLatido(); detenerLatido = () => {}; clearInterval(tic);
        banda.hidden = true;
        terminar.hidden = true;
        escena.replaceChildren(vacio('Esta sala ya no existe', el('a', { clase: 'boton', href: '#/probable' }, 'Volver')));
        return;
      }
      sala = s;
      actualizar();
    });
    let detenerLatido = latir(nube, pareja, id);
    const tic = setInterval(revisar, T.revisar);
    alSalirDeRuta(() => { dejarDeEscuchar(); detenerLatido(); clearInterval(tic); });

    // Cancela solo si la sala sigue abierta: las reglas rechazan tocar una sala ya cerrada.
    async function cerrarAbierta() {
      await cancelarSiAbierta(nube, pareja, id);
      guardarEsperando(ctx.almacen, pareja.codigo, 'probable', null);
    }
    salir.addEventListener('click', () => { salir.disabled = true; cerrarAbierta().catch((e) => console.warn('Okupa:', e)).finally(() => { salir.disabled = false; }); });
    terminar.addEventListener('click', () => {
      if (!globalThis.confirm('¿Terminar la ronda para los dos?')) return;
      terminar.disabled = true;
      errorTerminar.textContent = '';
      // La sala cancelada llega por la escucha y enseña el resumen de las frases reveladas.
      cerrarAbierta().catch((e) => {
        console.warn('Okupa:', e);
        errorTerminar.textContent = 'No se pudo terminar la ronda. Revisa la conexión e intenta otra vez.';
      }).finally(() => { terminar.disabled = false; });
    });

    function revisar() {
      const sinSenal = sala?.estado === 'jugando' && ahora() - cambioSenal > T.sinSenal;
      banda.hidden = !sinSenal;
      textoAviso.textContent = sinSenal ? `${nombre(otro)} se salió` : '';
    }

    const pintarFase = (clave, fn) => { if (clave !== fase) { fase = clave; fn(); } };
    const esperando = (texto) => el('p', { clase: 'estado-juego', role: 'status' }, texto);

    function actualizar() {
      const senal = JSON.stringify(sala.senal?.[otro] ?? null);
      if (senal !== senalOtro) { senalOtro = senal; cambioSenal = ahora(); }
      revisar();
      terminar.hidden = sala.estado !== 'jugando';
      if (sala.estado === 'terminada' || sala.estado === 'cancelada') { final(); return; }
      if (sala.estado === 'esperando') {
        pintarFase('esperando', () => escena.replaceChildren(vacio(`Esperando a ${nombre(otro)}…`,
          el('button', { clase: 'boton', type: 'button', onclick: (e) => {
            e.currentTarget.disabled = true;
            saliendo = true;
            cerrarAbierta().catch((x) => console.warn('Okupa:', x)).finally(() => ctx.ir('probable'));
          } }, 'Cancelar'))));
        return;
      }
      const i = sala.indice;
      const clave = `${sala.ronda}:${i}`;
      if (votaronTodos(sala, i)) revelar(i, clave);
      else if (sala.votaron?.[i]?.[yo] || votoMio[i] !== undefined) {
        pintarFase(`${clave}:espera`, () => escena.replaceChildren(tarjeta(i, esperando(`Esperando a ${nombre(otro)}…`))));
      } else pintarFase(`${clave}:voto`, () => pintarVoto(i, clave));
    }

    const tarjeta = (i, ...resto) => el('div', { clase: 'pregunta-juego' },
      el('p', { clase: 'numero-juego' }, `Frase ${i + 1} de ${sala.frases.length}`), frase(sala.frases[i].texto), resto);

    function pintarVoto(i, clave) {
      const botones = opciones.map((o) => el('button', { clase: 'opcion-juego', type: 'button', onclick: () => votarAhora(i, clave, o.valor) }, o.texto));
      escena.replaceChildren(tarjeta(i, el('div', { clase: 'opciones-voto' }, botones)));
    }

    function votarAhora(i, clave, valor) {
      if (votoMio[i] !== undefined) return;
      votoMio[i] = valor;
      fase = `${clave}:espera`;
      escena.replaceChildren(tarjeta(i, esperando(`Esperando a ${nombre(otro)}…`)));
      votar(nube, pareja, id, { indice: i, voto: valor }).catch(async (e) => {
        console.warn('Okupa:', e);
        // Si el voto ya quedó creado, es el que elegiste: no se vuelve a ofrecer elegir.
        const propio = await leerVotos(nube, pareja, id, i, [yo]).then((v) => v[yo], () => undefined);
        if (fase !== `${clave}:espera`) return; // mientras tanto la pantalla cambió
        if (propio !== undefined) { votoGuardado(i, propio); return; }
        delete votoMio[i];
        fase = `${clave}:voto`;
        pintarVoto(i, clave);
        escena.append(el('p', { clase: 'error-formulario', role: 'alert' }, 'No se pudo enviar tu voto. Revisa la conexión e intenta otra vez.'));
      });
    }

    // El voto existe pero no se pudo avisar al otro celular: se muestra tal cual y se reintenta el aviso.
    function votoGuardado(i, valor) {
      votoMio[i] = valor;
      const error = el('p', { clase: 'error-formulario', role: 'alert' }, `Tu voto quedó guardado, pero no se pudo avisar a ${nombre(otro)}.`);
      const reintentar = el('button', { clase: 'boton', type: 'button', onclick: async () => {
        reintentar.disabled = true;
        try {
          await votar(nube, pareja, id, { indice: i, voto: valor });
          error.remove();
          reintentar.remove();
        } catch (x) {
          console.warn('Okupa:', x);
          reintentar.disabled = false;
        }
      } }, 'Reintentar');
      escena.replaceChildren(tarjeta(i, el('p', { clase: 'estado-juego' }, `Tu voto: ${textoVoto(valor)}`),
        esperando(`Esperando a ${nombre(otro)}…`), error, reintentar));
    }

    // Solo se lee el voto del otro cuando los dos ya votaron esta frase.
    function revelar(i, clave) {
      const claveRev = `${clave}:revela`;
      if (fase === claveRev || fase === `${claveRev}:lista`) return;
      fase = claveRev;
      const ronda = sala.ronda;
      leerVotos(nube, pareja, id, i).then((votos) => {
        if (fase !== claveRev) return;
        fase = `${claveRev}:lista`;
        const ultima = i + 1 >= sala.frases.length;
        const error = el('p', { clase: 'aviso error-formulario', role: 'alert' });
        const siguiente = el('button', { clase: 'boton boton-principal', type: 'button' }, ultima ? 'Ver resumen' : 'Siguiente');
        siguiente.addEventListener('click', async () => {
          siguiente.disabled = true;
          error.textContent = '';
          try {
            await intentarAvanzar(nube, pareja, id, { ronda });
            // No se espera a la escucha: si se cayó (pasa con la red del celular), el botón parecía no hacer nada.
            const leida = await nube.leer(rutaSala(pareja.codigo, id));
            if (leida && !saliendo) { sala = { ...leida, id }; actualizar(); }
            if (fase === `${claveRev}:lista`) siguiente.disabled = false; // la sala no cambió: se puede volver a tocar
          } catch (x) {
            console.warn('Okupa:', x);
            siguiente.disabled = false;
            error.textContent = 'No se pudo avanzar. Revisa tu conexión e intenta otra vez.';
          }
        });
        const avance = el('div', { clase: 'pie-juego' }, siguiente);
        const filas = ['a', 'b'].map((l) => el('li', { clase: 'revelado-fila' },
          el('span', { clase: 'revelado-nombre' }, nombre(l)), el('span', { clase: 'revelado-voto' }, textoVoto(votos[l]))));
        escena.replaceChildren(tarjeta(i,
          el('ul', { clase: 'revelado-votos' }, filas),
          el('p', { clase: coincidieron(votos) ? 'coincidencia si' : 'coincidencia no' }, coincidieron(votos) ? '¡Coincidieron!' : 'No coincidieron'),
          error, avance));
      }).catch((e) => {
        console.warn('Okupa: no se pudo revelar', e);
        if (fase === claveRev) fase = null; // se reintenta con la próxima actualización de la sala
      });
    }

    function final() {
      if (fase === 'final' || fase === 'final:lista') return;
      fase = 'final';
      detenerLatido();
      detenerLatido = () => {};
      banda.hidden = true;
      escena.replaceChildren(esperando('Cargando el resumen…'));
      (async () => {
        // Se lee la sala justo antes de cerrar: el cierre cuenta las frases reveladas de ese momento.
        const leida = await nube.leer(rutaSala(pareja.codigo, id));
        if (!leida) {
          fase = 'inexistente';
          escena.replaceChildren(vacio('Esta sala ya no existe', el('a', { clase: 'boton', href: '#/probable' }, 'Volver')));
          return;
        }
        const fresca = { ...leida, id };
        const ids = fresca.tema === 'nuestras'
          ? (await listarPropias(nube, pareja)).map((f) => f.id)
          : (await cargar()).filter((f) => f.tema === fresca.tema).map((f) => f.id);
        await cerrarSala(nube, pareja, fresca, ids);
        // Todos los votos a la vez: en fila, una ronda de 20 eran 40 viajes a la nube sin nada en pantalla.
        const votos = await Promise.all(fresca.frases.map((_, i) => i).filter((i) => votaronTodos(fresca, i))
          .map((i) => leerVotos(nube, pareja, id, i)));
        fase = 'final:lista';
        const res = resumen(votos, ['a', 'b']);
        const otra = el('a', { clase: 'boton boton-principal', href: '#/probable' }, 'Otra ronda');
        if (res.total === 0) {
          escena.replaceChildren(vacio(fresca.estado === 'cancelada' ? 'La sala se canceló antes de revelar ninguna frase.' : 'No hubo frases para revelar.', otra));
          return;
        }
        escena.replaceChildren(el('div', { clase: 'final-juego' },
          el('h2', { clase: 'titulo-final' }, `Coincidieron en ${res.coincidencias} de ${res.total}`),
          fresca.estado === 'cancelada' ? el('p', { clase: 'subtitulo' }, 'La sala se cortó antes del final.') : null,
          el('ul', { clase: 'resumen-eligieron' }, ['a', 'b'].map((l) => el('li', {}, `Eligieron a ${nombre(l)} ${veces(res.elegido[l])}`))),
          el('div', { clase: 'enlace-acciones' }, otra, el('a', { clase: 'boton', href: '#/' }, 'Inicio'))));
      })().catch((e) => {
        console.warn('Okupa: no se pudo cerrar la sala', e);
        fase = null;
        // Tras terminar ya no llegan más cambios de la sala: sin este botón el celular se quedaría atascado.
        escena.replaceChildren(vacio('No se pudo cargar el resumen. Revisa la conexión.',
          el('button', { clase: 'boton boton-principal', type: 'button', onclick: () => final() }, 'Reintentar')));
      });
    }
  }

  async function frases(contenedor, _params, ctx) {
    const zona = el('div', { clase: 'probable' });
    contenedor.append(el('a', { clase: 'volver', href: '#/probable' }, '← ¿Quién es más probable?'), zona);
    const r = await preparar(zona, ctx, false);
    if (!r) return;
    const { nube, pareja } = r;
    const aviso = el('p', { clase: 'aviso error-formulario', role: 'alert' });
    const lista = el('ul', { clase: 'lista frases-propias' });
    const campo = el('input', { type: 'text', id: 'frase-nueva', maxlength: '120', autocomplete: 'off' });
    const agregar = el('button', { clase: 'boton boton-principal', type: 'button' }, 'Agregar');

    async function pintarLista() {
      const propias = await listarPropias(nube, pareja);
      lista.replaceChildren(...(propias.length === 0
        ? [el('li', { clase: 'vacio-lista' }, 'Todavía no tienen frases propias.')]
        : propias.map((f) => el('li', { clase: 'fila-frase' },
          el('span', { clase: 'fila-frase-texto' }, `${PREFIJO} ${f.texto}`),
          el('button', { clase: 'boton boton-peligro', type: 'button', onclick: (e) => {
            if (!globalThis.confirm('¿Borrar esta frase?')) return;
            accion(aviso, async () => { await borrarPropia(nube, pareja, f.id); await pintarLista(); })(e);
          } }, 'Borrar')))));
    }

    agregar.addEventListener('click', accion(aviso, async () => {
      aviso.textContent = '';
      const res = await crearPropia(nube, pareja, campo.value);
      if (!res.ok) { aviso.textContent = res.error; agregar.disabled = false; return; }
      campo.value = '';
      await pintarLista();
      agregar.disabled = false;
    }));

    zona.replaceChildren(
      el('h1', { clase: 'titulo-pantalla' }, 'Nuestras frases'),
      el('p', { clase: 'subtitulo' }, 'Escriban lo que sigue después de «¿Quién es más probable que…». Aparecen en el tema «Nuestras frases».'),
      el('div', { clase: 'campo' }, el('label', { for: 'frase-nueva' }, PREFIJO), campo), agregar, aviso, lista);
    try { await pintarLista(); } catch (e) {
      console.warn('Okupa: no cargaron las frases propias', e);
      aviso.textContent = 'No se pudieron cargar las frases. Revisa la conexión.';
    }
  }

  return { inicio, juego, frases };
}
