// Módulo "Preguntas": primer módulo del ecosistema Okupa.
import { el } from '../../nucleo/ui.js';
import { cargarIncluido, unir } from './datos.js';
import { crearProgreso } from './progreso.js';
import { crearPropio } from './propio.js';
import { crearPantallas } from './pantallas.js';
import { crearEditor } from './editor.js';

const estado = { listo: false, error: null };
let pantallas = null;
let editor = null;

// Vuelve a unir lo incluido con lo propio y recalcula los índices.
function actualizarContenido() {
  estado.contenido = unir(estado.incluido, estado.propio.obtener());
  estado.porId = new Map(estado.contenido.preguntas.map((q) => [q.id, q]));
  estado.categoriaPorId = new Map(estado.contenido.categorias.map((c) => [c.id, c]));
  estado.fuentePorId = new Map(estado.contenido.fuentes.map((f) => [f.id, f]));
}

function armar(ctx) {
  estado.progreso = crearProgreso(ctx.almacen);
  estado.propio = crearPropio(ctx.almacen, () => new Set(estado.contenido.categorias.map((c) => c.id)));
  estado.contenido = { categorias: estado.incluido.categorias };
  actualizarContenido();
  pantallas = crearPantallas(estado, {
    alOcultar: (p) => {
      const r = estado.propio.ocultar(p.id);
      if (!r.ok) alert(r.error);
      actualizarContenido();
    },
  });
  editor = crearEditor(estado, {
    alCambiar: actualizarContenido,
    alImportar: () => armar(ctx),
  });
}

async function iniciar(ctx) {
  estado.error = null;
  try {
    estado.incluido = await cargarIncluido();
    armar(ctx);
    estado.listo = true;
  } catch (e) {
    estado.listo = false;
    estado.error = e;
    console.warn('Okupa: no se pudieron cargar las preguntas', e);
  }
}

function errorDeCarga(ctx) {
  return el('div', { clase: 'aviso' },
    el('p', {}, 'No pudimos cargar las preguntas.'),
    el('button', {
      clase: 'boton', type: 'button',
      onclick: async () => { await iniciar(ctx); ctx.refrescar(); },
    }, 'Reintentar'));
}

// Cada ruta espera a que el contenido esté listo; si falló, ofrece reintentar.
function ruta(obtener, nombre) {
  return (contenedor, params, ctx) => {
    if (!estado.listo) {
      contenedor.append(el('a', { clase: 'volver', href: '#/' }, '← Inicio'), errorDeCarga(ctx));
      return;
    }
    return obtener()[nombre](contenedor, params, ctx);
  };
}
const p = (nombre) => ruta(() => pantallas, nombre);
const e = (nombre) => ruta(() => editor, nombre);

export default {
  id: 'preguntas',
  nombre: 'Preguntas',
  iniciar,
  rutas: {
    categorias: p('categorias'),
    'categoria/:id': p('categoria'),
    azar: p('azar'),
    sesiones: p('sesiones'),
    'sesion/:id': p('sesion'),
    'carta/:id': p('carta'),
    mis: e('mis'),
    'mis/pregunta/nueva': e('preguntaNueva'),
    'mis/pregunta/:id': e('preguntaEditar'),
    'mis/categoria/nueva': e('categoriaNueva'),
    'mis/sesion/nueva': e('sesionNueva'),
    'mis/sesion/:id': e('sesionEditar'),
    'mis/ocultas': e('ocultas'),
    'mis/respaldo': e('respaldo'),
  },
  tarjetasInicio(ctx) {
    return estado.listo ? pantallas.tarjetasInicio(ctx) : [errorDeCarga(ctx)];
  },
  acerca(ctx) {
    return estado.listo ? pantallas.acerca(ctx) : null;
  },
};
