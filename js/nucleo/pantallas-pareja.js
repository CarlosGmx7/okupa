// Pantalla #/pareja: enlazar los dos celulares y ajustes de la pareja.
// `exigirPareja` la usan las secciones en línea (Trivia, Diario) antes de mostrar lo suyo.
import { el } from './ui.js';
import { ErrorNube } from './nube.js';
import {
  crearPareja, unirse, lugaresDe, reclamar, vigilarLugar, cambiarNombre, salir, borrarTodo, miPareja,
  formatearCodigo, ErrorPareja,
} from './pareja.js';

const MENSAJES = {
  'no-existe': 'Ese código no existe. Revísalo.',
  nombre: 'Escribe tu nombre (máximo 30 letras).',
  'sin-conexion': 'No hay conexión. Intenta de nuevo.',
  permiso: 'No tienes permiso para hacer eso.',
};
const mensajeDe = (e) => MENSAJES[e?.codigo] || 'Algo salió mal. Intenta de nuevo.';
const otroLugar = (lugar) => (lugar === 'a' ? 'b' : 'a');

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
async function conectar(zona, ctx) {
  const espera = el('p', { clase: 'subtitulo', role: 'status' }, 'Conectando…');
  zona.append(espera);
  try { return await ctx.nube(); } catch (e) { pintarSinNube(zona, ctx, e); return null; } finally { espera.remove(); }
}

function pintarEnlace(zona, ctx, nube, alEnlazar) {
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
        await reclamar(nube, ctx.almacen, { codigo, lugar });
        alEnlazar();
      }));
      return b;
    });
    zona.replaceChildren(
      el('h1', { clase: 'titulo-pantalla' }, '¿Quién eres?'),
      el('p', { clase: 'subtitulo' }, 'Esta pareja ya tiene sus dos celulares. El otro celular con ese nombre quedará desconectado.'),
      el('div', { clase: 'enlace-acciones' }, opciones), error,
      el('button', { clase: 'boton-texto', type: 'button', onclick: inicio }, 'Volver'));
  }

  inicio();
}

function pintarPerdido(zona, ctx, motivo) {
  zona.replaceChildren(el('div', { clase: 'vacio' },
    el('p', {}, motivo === 'borrada' ? 'Tu pareja borró sus datos de la nube' : 'Tu lugar se abrió en otro celular'),
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
  const cancelar = () => { dejarDeEscuchar(); dejarDeVigilar(); };
  alSalirDeRuta(cancelar);

  zona.replaceChildren(
    el('h1', { clase: 'titulo-pantalla' }, 'Nuestra pareja'),
    el('p', { clase: 'subtitulo' }, 'Su código (para enlazar un celular nuevo):'),
    el('p', { clase: 'codigo-pareja' }, formatearCodigo(codigo)),
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
      el('p', {}, 'Borra de la nube todo lo de la pareja: perfiles, respuestas y partidas.'),
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
    try {
      const [{ uid }, doc] = await Promise.all([nube.iniciar(), nube.leer(`parejas/${pareja.codigo}`)]);
      if (doc?.lugares?.[pareja.lugar] === uid) {
        return { nube, pareja: { ...pareja, nombres: { a: doc.nombres?.a ?? null, b: doc.nombres?.b ?? null } } };
      }
      salir(ctx.almacen); // ya no es de este celular: se explica por qué
      pintarPerdido(contenedor, ctx, doc ? 'reclamado' : 'borrada');
      return null;
    } catch (e) {
      pintarSinNube(contenedor, ctx, e);
      return null;
    }
  }
  pintarEnlace(contenedor, ctx, nube, () => ctx.refrescar());
  return null;
}
