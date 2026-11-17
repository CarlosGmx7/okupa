// Pantalla #/pareja: enlazar los dos celulares y ajustes de la pareja.
// `exigirPareja` la usan las secciones en línea (Trivia, Diario) antes de mostrar lo suyo.
import { el } from './ui.js';
import { ErrorNube } from './nube.js';
import { montarAvisoSolicitud } from './solicitudes-ui.js';
import {
  crearPareja, unirse, lugaresDe, pedirLugar, miSolicitud, completarEntrada, entrarVencida, cancelarSolicitud,
  solicitudApuntada, vigilarLugar, cambiarNombre, salir, borrarTodo, miPareja, formatearCodigo, ErrorPareja,
} from './pareja.js';

const MENSAJES = {
  'no-existe': 'Ese código no existe. Revísalo.',
  'solicitud-ajena': 'Ya hay una solicitud de otro celular para ese lugar. Cualquiera de los dos puede rechazarla desde Okupa.',
  'no-todavia': 'Todavía no se puede entrar. Intenta más tarde.',
  nombre: 'Escribe tu nombre (máximo 30 letras).',
  'sin-conexion': 'No hay conexión. Intenta de nuevo.',
  permiso: 'No tienes permiso para hacer eso.',
};
const mensajeDe = (e) => MENSAJES[e?.codigo] || 'Algo salió mal. Intenta de nuevo.';
const otroLugar = (lugar) => (lugar === 'a' ? 'b' : 'a');
const CLAVE_NOMBRES = 'okupa:pareja:nombres';

function campo(etiqueta, control) {
  control.id = `c-${Math.random().toString(36).slice(2, 8)}`;
  return el('div', { clase: 'campo' }, el('label', { for: control.id }, etiqueta), control);
}
const entrada = (atributos) => el('input', { type: 'text', ...atributos });

// Cancela las escuchas de la pantalla al cambiar de ruta.
const alSalirDeRuta = (fn) => window.addEventListener('hashchange', fn, { once: true });

// Ejecuta una acción de botón mostrando "…" mientras tanto y el error en `error`.
async function accion(boton, error, fn) {
  boton.disabled = true;
  error.textContent = '';
  try { await fn(); } catch (e) {
    if (!(e instanceof ErrorPareja || e instanceof ErrorNube)) console.warn('Okupa:', e);
    error.textContent = mensajeDe(e);
  } finally { boton.disabled = false; }
}

function pintarSinNube(zona, ctx, e) {
  const codigo = e instanceof ErrorNube ? e.codigo : 'desconocido';
  if (codigo !== 'sin-config' && codigo !== 'sin-conexion') console.warn('Okupa: la nube no inició', e);
  const reintentar = el('button', { clase: 'boton boton-principal', type: 'button', onclick: () => ctx.refrescar() }, 'Reintentar');
  zona.replaceChildren(
    codigo === 'sin-config' ? el('div', { clase: 'vacio' },
      el('p', {}, 'Falta configurar la conexión'),
      el('p', { clase: 'campo-ayuda' }, 'Sigue los pasos de «Conectar Firebase» en el LEEME.'))
    : codigo === 'sin-conexion' ? el('div', { clase: 'vacio' },
      el('p', {}, 'Necesitas internet para esta sección'), reintentar)
    : el('div', { clase: 'vacio' },
      el('p', {}, 'No se pudo conectar con Firebase'),
      el('p', { clase: 'campo-ayuda' }, 'Revisa que estén hechos todos los pasos de «Conectar Firebase» en el LEEME (incluido el acceso Anónimo y las reglas).'),
      reintentar));
}

// Descargar Firebase e iniciar sesión tarda unos segundos: nunca dejar la pantalla vacía.
export async function conectar(zona, ctx) {
  const espera = el('p', { clase: 'subtitulo', role: 'status' }, 'Conectando…');
  zona.append(espera);
  try { return await ctx.nube(); } catch (e) { pintarSinNube(zona, ctx, e); return null; } finally { espera.remove(); }
}

const FECHA_LARGA = { weekday: 'long', day: 'numeric', month: 'long' };
const FECHA_CON_HORA = { ...FECHA_LARGA, hour: 'numeric', minute: '2-digit' };
const fecha = (ms, opciones) => new Date(ms).toLocaleString('es-CO', opciones);
const REVISION_MS = 60000;

// Espera del celular nuevo: la solicitud ya está en la nube y este celular la tiene apuntada.
// Escucha la pareja (una sola escucha, se corta al salir) y la revisa en cada cambio y cada minuto,
// pero solo con la pantalla a la vista: oculta no consulta, y revisa al volver y al recuperar la red.
function pintarEspera(zona, ctx, nube, alEnlazar) {
  zona.detenerEspera?.();
  const apuntada = solicitudApuntada(ctx.almacen);
  let vivo = true;
  let corte = () => {};
  let minuto = null;
  let revision = 0;
  let pintado = false;
  let pintadoDe = null; // estado y fechas de lo que se ve: si no cambian, no se repinta
  const oculta = () => document.hidden === true;
  const alVolver = () => { if (vivo && !oculta()) revisar(); };
  const detener = () => {
    vivo = false;
    corte();
    clearInterval(minuto);
    document.removeEventListener('visibilitychange', alVolver);
    window.removeEventListener('online', alVolver);
    window.removeEventListener('hashchange', detener);
    if (zona.detenerEspera === detener) zona.detenerEspera = null;
  };
  zona.detenerEspera = detener;
  alSalirDeRuta(detener);

  const volver = () => { detener(); pintarEnlace(zona, ctx, nube, alEnlazar); };
  const error = el('p', { clase: 'error-formulario', role: 'alert' });
  const boton = (texto, fn, principal) => {
    const b = el('button', { clase: principal ? 'boton boton-principal' : 'boton', type: 'button' }, texto);
    b.addEventListener('click', () => accion(b, error, fn));
    return b;
  };
  const cancelar = () => boton('Cancelar solicitud', async () => { await cancelarSolicitud(nube, ctx.almacen); volver(); });
  const pantalla = (titulo, textos, ...botones) => {
    pintado = true;
    zona.replaceChildren(
      el('h1', { clase: 'titulo-pantalla' }, titulo),
      ...textos.map((t) => el('p', { clase: 'subtitulo' }, t)),
      error,
      el('div', { clase: 'enlace-acciones' }, ...botones));
  };

  function sinRed() {
    pantalla('Esperando la aprobación', ['No hay conexión. Intenta de nuevo.'],
      el('button', { clase: 'boton boton-principal', type: 'button', onclick: () => { revisar(); } }, 'Reintentar'));
    pintado = false; // la pantalla de error no cuenta: la próxima revisión debe poder reemplazarla
  }

  function pintarEstado(s) {
    // Mismo estado y mismas fechas (y el rechazo sin cambiar de «ya puede pedir»): se deja todo como está,
    // para no borrar un mensaje de error ni cambiar el botón que la persona está usando.
    const puede = s.estado === 'rechazada' && s.reintentoMs !== null && Date.now() >= s.reintentoMs;
    const huella = JSON.stringify([s.estado, s.entraMs, s.reintentoMs, puede]);
    if (pintado && huella === pintadoDe) return;
    pintadoDe = huella;
    error.textContent = '';
    if (s.estado === 'pendiente') {
      pantalla('Esperando la aprobación', [
        'Abre Okupa en tu celular anterior y toca «Aprobar».',
        s.entraMs === null ? 'Si ya no lo tienes, podrás entrar en 7 días.'
          : `Si ya no lo tienes, podrás entrar el ${fecha(s.entraMs, FECHA_LARGA)}.`,
      ], cancelar());
    } else if (s.estado === 'vencida') {
      pantalla('Ya puedes entrar', ['Ya pasaron los 7 días sin que nadie rechazara la solicitud.'],
        boton('Entrar', async () => {
          try { await entrarVencida(nube, ctx.almacen); } catch (e) {
            if (e?.codigo === 'permiso') throw new ErrorPareja('no-todavia');
            throw e;
          }
          detener();
          alEnlazar();
        }, true),
        cancelar());
    } else if (s.estado === 'rechazada') {
      const puede = s.reintentoMs !== null && Date.now() >= s.reintentoMs;
      pantalla('Rechazaron la solicitud', [
        puede ? 'Ya puedes volver a pedirla.'
          : s.reintentoMs === null ? 'Podrás volver a pedirla en 24 horas.'
            : `Puedes volver a pedirla el ${fecha(s.reintentoMs, FECHA_CON_HORA).replace(/\.$/, '')}.`,
      ],
      puede ? boton('Volver a pedir', async () => {
        await pedirLugar(nube, ctx.almacen, { codigo: s.codigo, lugar: s.lugar });
        pintarEspera(zona, ctx, nube, alEnlazar);
      }, true) : null,
      cancelar());
    } else {
      pantalla('La solicitud ya no existe', ['Alguien de la pareja la borró.'],
        boton('Volver', async () => { await cancelarSolicitud(nube, ctx.almacen); volver(); }, true));
    }
  }

  async function revisar() {
    const mia = ++revision;
    let s;
    try { s = await miSolicitud(nube, ctx.almacen); } catch (e) {
      if (!vivo || mia !== revision) return;
      if (!(e instanceof ErrorNube)) console.warn('Okupa:', e);
      if (!pintado) sinRed(); // si ya hay algo en pantalla, se reintenta en el siguiente minuto
      return;
    }
    if (!vivo || mia !== revision) return;
    if (!s) { volver(); return; }
    if (s.estado === 'aprobada') {
      try { await completarEntrada(nube, ctx.almacen); } catch {
        // Otra pantalla de este mismo celular pudo completar la entrada un instante antes.
        if (!miPareja(ctx.almacen)) {
          if (vivo && mia === revision && !pintado) sinRed();
          return;
        }
      }
      if (!vivo) return;
      detener();
      alEnlazar();
      return;
    }
    pintarEstado(s);
  }

  zona.replaceChildren(el('p', { clase: 'subtitulo', role: 'status' }, 'Revisando tu solicitud…'));
  if (!apuntada) { volver(); return; }
  corte = nube.escuchar(`parejas/${apuntada.codigo}`, () => { if (vivo) revisar(); });
  minuto = setInterval(() => { if (!oculta()) revisar(); }, ctx.revisionMs ?? REVISION_MS);
  document.addEventListener('visibilitychange', alVolver);
  window.addEventListener('online', alVolver);
  revisar();
}

export function pintarEnlace(zona, ctx, nube, alEnlazar) {
  const inicio = () => zona.replaceChildren(
    el('h1', { clase: 'titulo-pantalla' }, 'Enlacen sus celulares'),
    el('p', { clase: 'subtitulo' }, 'Uno crea la pareja y le pasa el código al otro. Solo se hace una vez.'),
    el('div', { clase: 'enlace-acciones' },
      el('button', { clase: 'boton boton-principal', type: 'button', onclick: crear }, 'Crear pareja'),
      el('button', { clase: 'boton', type: 'button', onclick: tengoCodigo }, 'Tengo un código')));

  function crear() {
    const nombre = entrada({ maxlength: '30', autocomplete: 'given-name' });
    const error = el('p', { clase: 'error-formulario', role: 'alert' });
    const listo = el('button', { clase: 'boton boton-principal', type: 'button' }, 'Crear');
    listo.addEventListener('click', () => accion(listo, error, async () => {
      const { codigo } = await crearPareja(nube, ctx.almacen, { nombre: nombre.value });
      mostrarCodigo(codigo);
    }));
    zona.replaceChildren(
      el('h1', { clase: 'titulo-pantalla' }, 'Crear pareja'),
      campo('Tu nombre', nombre), error,
      el('div', { clase: 'enlace-acciones' }, listo, el('button', { clase: 'boton', type: 'button', onclick: inicio }, 'Volver')));
  }

  function mostrarCodigo(codigo) {
    const texto = formatearCodigo(codigo);
    const aviso = el('p', { clase: 'campo-ayuda', role: 'status' });
    zona.replaceChildren(
      el('h1', { clase: 'titulo-pantalla' }, 'Su código'),
      el('p', { clase: 'codigo-pareja' }, texto),
      el('p', { clase: 'subtitulo' }, 'Pásale este código a tu pareja para que se una.'),
      el('div', { clase: 'enlace-acciones' },
        el('button', {
          clase: 'boton', type: 'button',
          onclick: () => navigator.clipboard?.writeText(texto)
            .then(() => { aviso.textContent = 'Código copiado.'; }, () => { aviso.textContent = 'No se pudo copiar.'; }),
        }, 'Copiar'),
        navigator.share ? el('button', {
          clase: 'boton', type: 'button',
          onclick: () => navigator.share({ text: `Únete a nuestra pareja en Okupa con el código ${texto}` }).catch(() => {}),
        }, 'Compartir') : null,
        el('button', { clase: 'boton boton-principal', type: 'button', onclick: alEnlazar }, 'Listo')),
      aviso);
  }

  function tengoCodigo() {
    const codigo = entrada({ autocapitalize: 'characters', autocomplete: 'off', placeholder: 'K7P-Q2M' });
    const nombre = entrada({ maxlength: '30', autocomplete: 'given-name' });
    const error = el('p', { clase: 'error-formulario', role: 'alert' });
    const unirme = el('button', { clase: 'boton boton-principal', type: 'button' }, 'Unirme');
    unirme.addEventListener('click', () => accion(unirme, error, async () => {
      try {
        await unirse(nube, ctx.almacen, { codigo: codigo.value, nombre: nombre.value });
        alEnlazar();
      } catch (e) {
        if (e?.codigo !== 'llena') throw e;
        await quienEres(codigo.value);
      }
    }));
    zona.replaceChildren(
      el('h1', { clase: 'titulo-pantalla' }, 'Unirme a la pareja'),
      campo('Código', codigo), campo('Tu nombre', nombre), error,
      el('div', { clase: 'enlace-acciones' }, unirme, el('button', { clase: 'boton', type: 'button', onclick: inicio }, 'Volver')));
  }

  // La pareja ya tiene dos lugares: este celular reemplaza a uno (p. ej. celular nuevo).
  async function quienEres(codigo) {
    const { nombres } = await lugaresDe(nube, codigo);
    const error = el('p', { clase: 'error-formulario', role: 'alert' });
    const opciones = ['a', 'b'].filter((l) => nombres[l]).map((lugar) => {
      const b = el('button', { clase: 'boton', type: 'button' }, `Soy ${nombres[lugar]}`);
      b.addEventListener('click', () => accion(b, error, async () => {
        await pedirLugar(nube, ctx.almacen, { codigo, lugar });
        pintarEspera(zona, ctx, nube, alEnlazar);
      }));
      return b;
    });
    zona.replaceChildren(
      el('h1', { clase: 'titulo-pantalla' }, '¿Quién eres?'),
      el('p', { clase: 'subtitulo' }, 'Tu celular anterior tendrá que aprobarlo. Si ya no lo tienes, podrás entrar en 7 días si nadie lo rechaza.'),
      el('div', { clase: 'enlace-acciones' }, opciones), error,
      el('button', { clase: 'boton-texto', type: 'button', onclick: inicio }, 'Volver'));
  }

  if (solicitudApuntada(ctx.almacen)) pintarEspera(zona, ctx, nube, alEnlazar);
  else inicio();
}

const TEXTO_PERDIDO = {
  borrada: 'Tu pareja borró sus datos de la nube',
  entregado: 'Pasaste tu lugar a tu celular nuevo',
};

function pintarPerdido(zona, ctx, motivo) {
  zona.replaceChildren(el('div', { clase: 'vacio' },
    el('p', {}, TEXTO_PERDIDO[motivo] || 'Tu lugar se abrió en otro celular'),
    el('button', { clase: 'boton boton-principal', type: 'button', onclick: () => ctx.refrescar() }, 'Volver a enlazar')));
}

function pintarEnlazados(zona, ctx, nube) {
  const { codigo, lugar } = miPareja(ctx.almacen);
  const yo = el('p', { clase: 'fila-titulo' });
  const otro = el('p', { clase: 'fila-detalle' });
  const nombre = entrada({ maxlength: '30', autocomplete: 'given-name' });
  const error = el('p', { clase: 'error-formulario', role: 'alert' });
  const guardar = el('button', { clase: 'boton', type: 'button' }, 'Guardar nombre');
  const editarNombre = el('div', { hidden: true }, campo('Tu nombre', nombre), guardar);
  guardar.addEventListener('click', () => accion(guardar, error, async () => {
    await cambiarNombre(nube, ctx.almacen, nombre.value);
    editarNombre.hidden = true;
  }));

  const dejarDeEscuchar = nube.escuchar(`parejas/${codigo}`, (doc) => {
    if (!doc) return;
    const mio = doc.nombres?.[lugar] || '';
    const suyo = doc.lugares?.[otroLugar(lugar)] ? doc.nombres?.[otroLugar(lugar)] : null;
    yo.textContent = `Tú: ${mio}`;
    otro.textContent = suyo ? `Tu pareja: ${suyo}` : 'Esperando a que tu pareja se una…';
    if (editarNombre.hidden) nombre.value = mio;
  });
  const dejarDeVigilar = vigilarLugar(nube, ctx.almacen, (motivo) => {
    dejarDeEscuchar();
    pintarPerdido(zona, ctx, motivo);
  });
  const solicitudes = el('div', { clase: 'inicio-solicitudes' });
  const dejarDeAvisar = montarAvisoSolicitud(solicitudes, ctx);
  const cancelar = () => { dejarDeEscuchar(); dejarDeVigilar(); dejarDeAvisar(); };
  alSalirDeRuta(cancelar);

  zona.replaceChildren(
    el('h1', { clase: 'titulo-pantalla' }, 'Nuestra pareja'),
    solicitudes,
    el('p', { clase: 'subtitulo' }, 'Su código (para enlazar un celular nuevo):'),
    el('p', { clase: 'codigo-pareja' }, formatearCodigo(codigo)),
    el('p', { clase: 'campo-ayuda' }, 'Para pasar a otro celular vas a necesitar este para aprobarlo. Sin él (o si borras los datos del navegador) la espera es de 7 días.'),
    el('section', { clase: 'bloque-texto' }, yo, otro, editarNombre, error),
    el('div', { clase: 'enlace-acciones' },
      el('button', { clase: 'boton', type: 'button', onclick: () => { editarNombre.hidden = !editarNombre.hidden; } }, 'Cambiar mi nombre'),
      el('button', {
        clase: 'boton', type: 'button',
        onclick: () => {
          if (!confirm('¿Salir de la pareja en este celular? Podrás volver a entrar con el código.')) return;
          cancelar();
          salir(ctx.almacen);
          ctx.refrescar();
        },
      }, 'Salir de este celular')),
    el('section', { clase: 'bloque-texto' },
      el('h2', {}, 'Borrar nuestros datos'),
      el('p', {}, 'Borra de la nube todo lo de la pareja: perfiles, respuestas, partidas, Match y lugares del mapa con sus fotos.'),
      el('button', {
        clase: 'boton boton-peligro', type: 'button',
        onclick: (e) => {
          if (!confirm('¿Borrar todos sus datos de la nube? Se borrará para los dos y no se puede deshacer.')) return;
          cancelar();
          accion(e.currentTarget, error, async () => {
            await borrarTodo(nube, ctx.almacen);
            ctx.refrescar();
          });
        },
      }, 'Borrar todos nuestros datos de la nube')),
  );
}

export async function pantallaPareja(contenedor, _params, ctx) {
  const zona = el('div');
  contenedor.append(el('a', { clase: 'volver', href: '#/' }, '← Inicio'), zona);
  const nube = await conectar(zona, ctx);
  if (!nube) return;
  if (miPareja(ctx.almacen)) pintarEnlazados(zona, ctx, nube);
  else pintarEnlace(zona, ctx, nube, () => ctx.refrescar());
}

// Para las secciones en línea: devuelve { nube, pareja } o pinta lo que falta y devuelve null.
export async function exigirPareja(contenedor, ctx) {
  const nube = await conectar(contenedor, ctx);
  if (!nube) return null;
  const pareja = miPareja(ctx.almacen);
  if (pareja) {
    // Comprueba en la nube que el lugar sigue siendo de este celular y guarda los nombres.
    const comprobar = Promise.all([nube.iniciar(), nube.leer(`parejas/${pareja.codigo}`)]).then(([{ uid }, doc]) => {
      if (doc?.lugares?.[pareja.lugar] !== uid) {
        salir(ctx.almacen);
        ctx.almacen.borrar(CLAVE_NOMBRES);
        return { motivo: doc ? 'reclamado' : 'borrada' };
      }
      const nombres = { a: doc.nombres?.a ?? null, b: doc.nombres?.b ?? null };
      ctx.almacen.escribir(CLAVE_NOMBRES, { codigo: pareja.codigo, nombres });
      return { nombres };
    });
    // Con los nombres ya guardados no se espera a la red: se comprueba por detrás y, si el lugar
    // se perdió, se explica en esta misma pantalla.
    const guardados = ctx.almacen.leer(CLAVE_NOMBRES, null);
    if (guardados?.codigo === pareja.codigo && guardados.nombres?.b) {
      comprobar.then((r) => {
        if (!r.motivo) return;
        contenedor.replaceChildren();
        pintarPerdido(contenedor, ctx, r.motivo);
      }).catch(() => {});
      return { nube, pareja: { ...pareja, nombres: guardados.nombres } };
    }
    try {
      const r = await comprobar;
      if (!r.motivo) return { nube, pareja: { ...pareja, nombres: r.nombres } };
      pintarPerdido(contenedor, ctx, r.motivo); // ya no es de este celular: se explica por qué
      return null;
    } catch (e) {
      pintarSinNube(contenedor, ctx, e);
      return null;
    }
  }
  pintarEnlace(contenedor, ctx, nube, () => ctx.refrescar());
  return null;
}
