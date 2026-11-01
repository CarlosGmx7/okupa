// Pantallas del módulo de preguntas: categorías, al azar, sesiones guiadas y carta suelta.
import { el, crearCarta, mazo, habilitarDeslizar, temporizador } from '../../nucleo/ui.js';
import { filtrar, preguntaDelDia, fechaLocalISO } from './datos.js';
import { posicionValida } from './progreso.js';

const CLAVE_INTENSIDAD = 'okupa:preguntas:intensidad';

export function siguienteAlAzar(preguntas, vistas, rnd = Math.random) {
  const libres = preguntas.filter((q) => !vistas.has(q.id));
  if (!libres.length) return null;
  return libres[Math.min(libres.length - 1, Math.floor(rnd() * libres.length))];
}

export function barajar(lista, rnd = Math.random) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function avanceCategoria(preguntas, vistas, idCategoria) {
  const deCategoria = preguntas.filter((q) => q.categoria === idCategoria);
  return { vistas: deCategoria.filter((q) => vistas.has(q.id)).length, total: deCategoria.length };
}

const volverA = (ruta, texto) => el('a', { clase: 'volver', href: `#/${ruta}` }, `← ${texto}`);

function cartaDe(estado, pregunta) {
  return crearCarta(pregunta, {
    categoria: estado.categoriaPorId.get(pregunta.categoria),
    fuente: estado.fuentePorId.get(pregunta.fuente),
  });
}

/**
 * Recorre preguntas una a una. `generar()` entrega la siguiente o null cuando se acaban.
 * Deslizar a la izquierda = siguiente; a la derecha = anterior.
 */
function recorrido(contenedor, estado, { generar, total, encabezado, alMostrar, alTerminar, alOcultar }) {
  const historial = [];
  let pos = -1;
  let generadas = 0; // no baja al ocultar, así `generar` nunca repite una posición
  let ocultadas = 0;
  const zona = el('div', { clase: 'recorrido' });
  contenedor.append(zona);

  const siguiente = () => {
    if (pos < historial.length - 1) { pos++; pintar(); return; }
    const p = generar(generadas++);
    if (!p) { alTerminar(); return; }
    historial.push(p);
    pos++;
    pintar();
  };
  const anterior = () => {
    if (pos > 0) { pos--; pintar(); }
    else pintar();
  };

  function pintar() {
    const p = historial[pos];
    alMostrar?.(p, pos);
    const carta = cartaDe(estado, p);
    habilitarDeslizar(carta, { izquierda: siguiente, derecha: anterior });
    zona.replaceChildren(...[
      encabezado ? encabezado(p, pos) : null,
      mazo(carta),
      el('div', { clase: 'controles-carta' },
        el('button', { clase: 'boton', type: 'button', onclick: anterior, disabled: pos === 0 }, '← Anterior'),
        total ? el('span', { clase: 'contador' }, `${pos + 1} de ${total - ocultadas}`) : null,
        el('button', { clase: 'boton boton-principal', type: 'button', onclick: siguiente }, 'Siguiente →')),
      alOcultar ? el('div', { clase: 'acciones-secundarias' },
        el('button', {
          clase: 'boton-texto', type: 'button',
          onclick: () => {
            if (!confirm('¿Ocultar esta pregunta? No volverá a salir. Pueden recuperarla en Mis preguntas.')) return;
            alOcultar(p);
            ocultadas++;
            historial.splice(pos, 1);
            if (pos >= historial.length) { pos = historial.length - 1; siguiente(); }
            else pintar();
          },
        }, 'No nos gusta: ocultar')) : null,
    ].filter(Boolean));
  }

  siguiente();
}

function pantallaVacia(contenedor, mensaje, ...acciones) {
  contenedor.append(el('div', { clase: 'vacio' }, el('p', {}, mensaje), acciones));
}

export function crearPantallas(estado, { alOcultar } = {}) {
  const { progreso } = estado;
  const ocultar = (p) => alOcultar?.(p);

  function todasVistas(contenedor, ids, ctx, volverRuta, volverTexto) {
    pantallaVacia(contenedor, 'Ya conversaron todas estas. ¿Las repasamos otra vez?',
      el('button', {
        clase: 'boton boton-principal', type: 'button',
        onclick: () => { estado.progreso.reiniciarVistas(ids); ctx.refrescar(); },
      }, 'Reiniciar vistas'),
      el('a', { clase: 'boton', href: `#/${volverRuta}` }, volverTexto));
  }

  function categorias(contenedor) {
    const vistas = progreso.vistas();
    contenedor.append(
      volverA('', 'Inicio'),
      el('h1', { clase: 'titulo-pantalla' }, 'Categorías'),
      el('p', { clase: 'subtitulo' }, 'Escojan un tema y saquen cartas de ahí.'),
      el('nav', { clase: 'nube' }, estado.contenido.categorias.map((c, i) => {
        const a = avanceCategoria(estado.contenido.preguntas, vistas, c.id);
        const b = el('a', { clase: `burbuja${i % 5 === 0 ? ' grande' : ''}`, href: `#/preguntas/categoria/${encodeURIComponent(c.id)}` },
          el('span', { clase: 'burbuja-icono', 'aria-hidden': 'true' }, c.icono || '✦'),
          el('span', { clase: 'burbuja-nombre' }, c.nombre),
          el('span', { clase: 'burbuja-avance' }, `${a.vistas} de ${a.total} vistas`),
          el('span', { clase: 'barra' }, el('span', { style: `width:${a.total ? (100 * a.vistas) / a.total : 0}%` })));
        if (c.color) b.style.setProperty('--acento', c.color);
        return b;
      })),
    );
  }

  function categoria(contenedor, { id }, ctx) {
    const c = estado.categoriaPorId.get(id);
    if (!c) { ctx.ir('preguntas/categorias'); return; }
    const todas = filtrar(estado.contenido.preguntas, { categoria: id });
    contenedor.append(volverA('preguntas/categorias', 'Categorías'), el('h1', { clase: 'titulo-pantalla' }, c.nombre));
    if (c.descripcion) contenedor.append(el('p', { clase: 'subtitulo' }, c.descripcion));
    if (!todas.length) {
      pantallaVacia(contenedor, 'No quedan preguntas aquí.',
        el('a', { clase: 'boton', href: '#/preguntas/mis/ocultas' }, 'Ver ocultas'),
        el('a', { clase: 'boton', href: '#/preguntas/categorias' }, 'Otra categoría'));
      return;
    }
    const pendientes = barajar(filtrar(todas, { excluir: progreso.vistas() }));
    const ids = todas.map((q) => q.id);
    if (!pendientes.length) { todasVistas(contenedor, ids, ctx, 'preguntas/categorias', 'Otra categoría'); return; }
    recorrido(contenedor, estado, {
      generar: (n) => pendientes[n] || null,
      total: pendientes.length,
      alMostrar: (p) => progreso.marcarVista(p.id),
      alTerminar: () => { contenedor.replaceChildren(); categoriaTerminada(contenedor, ids, ctx); },
      alOcultar: alOcultar ? ocultar : null,
    });
  }

  function categoriaTerminada(contenedor, ids, ctx) {
    contenedor.append(volverA('preguntas/categorias', 'Categorías'));
    todasVistas(contenedor, ids, ctx, 'preguntas/categorias', 'Otra categoría');
  }

  function azar(contenedor, _params, ctx) {
    const max = ctx.almacen.leer(CLAVE_INTENSIDAD, 3);
    const niveles = [[1, 'Suave'], [2, 'Profunda'], [3, 'Intensa']];
    contenedor.append(
      volverA('', 'Inicio'),
      el('h1', { clase: 'titulo-pantalla' }, 'Al azar'),
      el('p', { clase: 'subtitulo' }, 'Hasta qué intensidad quieren llegar hoy:'),
      el('div', { clase: 'segmentado', role: 'group', 'aria-label': 'Intensidad máxima' }, niveles.map(([n, nombre]) =>
        el('button', {
          type: 'button', 'aria-pressed': String(n === max),
          onclick: () => { ctx.almacen.escribir(CLAVE_INTENSIDAD, n); ctx.refrescar(); },
        }, nombre))),
    );
    const pool = filtrar(estado.contenido.preguntas, { profundidadMax: max });
    if (!pool.length) {
      pantallaVacia(contenedor, 'No quedan preguntas aquí.',
        max < 3 ? el('button', { clase: 'boton boton-principal', type: 'button', onclick: () => { ctx.almacen.escribir(CLAVE_INTENSIDAD, 3); ctx.refrescar(); } }, 'Subir la intensidad') : null,
        el('a', { clase: 'boton', href: '#/' }, 'Volver'));
      return;
    }
    const zona = el('div');
    contenedor.append(zona);
    const ids = pool.map((q) => q.id);
    if (!siguienteAlAzar(pool, progreso.vistas())) { todasVistas(zona, ids, ctx, '', 'Volver'); return; }
    recorrido(zona, estado, {
      generar: () => siguienteAlAzar(pool, progreso.vistas()),
      alMostrar: (p) => progreso.marcarVista(p.id),
      alTerminar: () => { zona.replaceChildren(); todasVistas(zona, ids, ctx, '', 'Volver'); },
      alOcultar: alOcultar ? ocultar : null,
    });
  }

  function carta(contenedor, { id }, ctx) {
    const p = estado.porId.get(id);
    contenedor.append(volverA('', 'Inicio'));
    if (!p) { pantallaVacia(contenedor, 'Esta pregunta ya no existe.', el('a', { clase: 'boton', href: '#/preguntas/azar' }, 'Otra al azar')); return; }
    progreso.marcarVista(p.id);
    const c = cartaDe(estado, p);
    habilitarDeslizar(c, { izquierda: () => ctx.ir('preguntas/azar'), derecha: () => ctx.ir('') });
    contenedor.append(
      mazo(c),
      el('div', { clase: 'controles-carta' },
        el('a', { clase: 'boton', href: '#/' }, 'Inicio'),
        el('a', { clase: 'boton boton-principal', href: '#/preguntas/azar' }, 'Otra al azar →')));
  }

  function totalSesion(s) {
    return (s.bloques || []).reduce((n, b) => n + b.preguntas.filter((id) => estado.porId.has(id)).length, 0);
  }

  function sesiones(contenedor) {
    contenedor.append(
      volverA('', 'Inicio'),
      el('h1', { clase: 'titulo-pantalla' }, 'Sesiones guiadas'),
      el('p', { clase: 'subtitulo' }, 'Recorridos que van de lo suave a lo profundo. La app recuerda dónde se quedaron.'),
      el('ul', { clase: 'lista' }, estado.contenido.sesiones.map((s) => {
        const avance = progreso.avance(s.id);
        const n = totalSesion(s);
        return el('li', {}, el('a', { clase: 'fila', href: `#/preguntas/sesion/${encodeURIComponent(s.id)}` },
          el('div', { clase: 'fila-cuerpo' },
            el('div', { clase: 'fila-titulo' }, s.nombre),
            el('div', { clase: 'fila-detalle' }, `${n} preguntas${s.minutos ? ` · unos ${s.minutos} min` : ''}${s.id.startsWith('n-') ? ' · nuestra' : ''}`)),
          avance ? el('span', { clase: 'fila-marca' }, 'Continuar') : el('span', { clase: 'fila-marca', 'aria-hidden': 'true' }, '→')));
      })),
    );
  }

  function sesion(contenedor, { id }, ctx) {
    const s = estado.contenido.sesiones.find((x) => x.id === id);
    if (!s) { ctx.ir('preguntas/sesiones'); return; }
    const existen = new Set(estado.porId.keys());
    const posiciones = [];
    (s.bloques || []).forEach((b, bloque) => b.preguntas.forEach((pid, indice) => {
      if (existen.has(pid)) posiciones.push({ bloque, indice, id: pid });
    }));
    const avance = progreso.avance(s.id);
    contenedor.append(volverA('preguntas/sesiones', 'Sesiones'), el('h1', { clase: 'titulo-pantalla' }, s.nombre));
    const cuerpo = el('div');
    contenedor.append(cuerpo);

    const empezar = (desde) => {
      const inicio = posicionValida(s, desde, existen);
      const i0 = inicio ? posiciones.findIndex((p) => p.bloque === inicio.bloque && p.indice === inicio.indice) : -1;
      if (i0 < 0) { terminar(); return; }
      cuerpo.replaceChildren();
      recorrido(cuerpo, estado, {
        generar: (n) => (posiciones[i0 + n] ? estado.porId.get(posiciones[i0 + n].id) : null),
        total: posiciones.length - i0,
        encabezado: (_p, k) => {
          const pos = posiciones[i0 + k];
          return el('p', { clase: 'subtitulo' }, `${s.bloques[pos.bloque].nombre} · pregunta ${i0 + k + 1} de ${posiciones.length}`);
        },
        alMostrar: (p, k) => {
          const pos = posiciones[i0 + k];
          progreso.marcarVista(p.id);
          progreso.guardarAvance(s.id, { bloque: pos.bloque, indice: pos.indice });
        },
        alTerminar: terminar,
      });
    };

    function terminar() {
      cuerpo.replaceChildren();
      if (s.cierre?.tipo === 'mirada') {
        cuerpo.append(el('div', { clase: 'bloque-texto' },
          el('h2', {}, 'El cierre'),
          el('p', {}, s.cierre.texto),
          el('button', {
            clase: 'boton boton-principal', type: 'button',
            onclick: (e) => {
              e.currentTarget.remove();
              temporizador(cuerpo, s.cierre.segundos, () => { progreso.terminarSesion(s.id); final(); });
            },
          }, `Empezar los ${Math.round(s.cierre.segundos / 60)} minutos`)));
      } else {
        progreso.terminarSesion(s.id);
        final();
      }
    }

    function final() {
      progreso.terminarSesion(s.id);
      cuerpo.replaceChildren(el('div', { clase: 'vacio' },
        el('p', {}, 'Terminaron la sesión. Gracias por quedarse.'),
        el('a', { clase: 'boton boton-principal', href: '#/preguntas/sesiones' }, 'Otra sesión'),
        el('a', { clase: 'boton', href: '#/' }, 'Inicio')));
    }

    if (!posiciones.length) {
      pantallaVacia(cuerpo, 'No quedan preguntas aquí.', el('a', { clase: 'boton', href: '#/preguntas/sesiones' }, 'Otra sesión'));
      return;
    }
    cuerpo.append(el('div', { clase: 'bloque-texto' },
      s.descripcion ? el('p', {}, s.descripcion) : null,
      s.instrucciones ? el('p', {}, el('strong', {}, 'Cómo jugar: '), s.instrucciones) : null,
      el('p', {}, `${posiciones.length} preguntas${s.minutos ? ` · unos ${s.minutos} minutos` : ''}.`),
      avance
        ? [el('button', { clase: 'boton boton-principal', type: 'button', onclick: () => empezar(avance) }, 'Continuar donde íbamos'),
          ' ',
          el('button', { clase: 'boton', type: 'button', onclick: () => { progreso.terminarSesion(s.id); empezar(null); } }, 'Empezar de nuevo')]
        : el('button', { clase: 'boton boton-principal', type: 'button', onclick: () => empezar(null) }, 'Empezar')));
  }

  function tarjetasInicio() {
    const hoy = preguntaDelDia(estado.contenido.preguntas, fechaLocalISO());
    const cat = hoy && estado.categoriaPorId.get(hoy.categoria);
    return [
      hoy ? el('a', { clase: 'del-dia', href: `#/preguntas/carta/${encodeURIComponent(hoy.id)}` },
        el('span', { clase: 'del-dia-etiqueta' }, `Pregunta de hoy${cat ? ` · ${cat.nombre}` : ''}`),
        el('p', { clase: 'del-dia-texto' }, hoy.texto)) : null,
      el('nav', { clase: 'accesos' },
        acceso('preguntas/sesiones', '❖', 'Sesiones guiadas', `${estado.contenido.sesiones.length} recorridos`),
        acceso('preguntas/categorias', '✦', 'Categorías', `${estado.contenido.categorias.length} temas`),
        acceso('preguntas/azar', '✧', 'Al azar', 'Una carta sorpresa'),
        acceso('preguntas/mis', '✎︎', 'Mis preguntas', 'Creen las suyas')),
    ].filter(Boolean);
  }

  function acerca() {
    return el('div', {},
      el('section', { clase: 'bloque-texto' },
        el('h2', {}, 'De dónde salen las preguntas'),
        el('p', {}, 'Son redacciones originales inspiradas en estos autores y enfoques:'),
        el('ul', { clase: 'lista' }, estado.contenido.fuentes.filter((f) => f.id !== 'nuestra').map((f) =>
          el('li', {}, el('div', { clase: 'fila-detalle' }, el('strong', {}, f.nombre.replace(/^Inspirada en /, '')), ` — ${f.referencia}`))))),
      el('section', { clase: 'bloque-texto' },
        el('h2', {}, 'Un aviso con cariño'),
        el('p', {}, 'Okupa es para conversar, no reemplaza una terapia. Estos ejercicios no se recomiendan en relaciones donde hay violencia o control.'),
        el('p', {}, 'Si una conversación se pone muy dolorosa, está bien parar y buscar acompañamiento profesional.')));
  }

  return { categorias, categoria, azar, carta, sesiones, sesion, tarjetasInicio, acerca };
}

function acceso(ruta, icono, nombre, detalle) {
  return el('a', { clase: 'acceso', href: `#/${ruta}` },
    el('span', { clase: 'acceso-icono', 'aria-hidden': 'true' }, icono),
    el('span', { clase: 'acceso-nombre' }, nombre),
    el('span', { clase: 'acceso-detalle' }, detalle));
}
