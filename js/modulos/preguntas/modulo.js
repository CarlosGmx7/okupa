// Módulo "Preguntas": primer módulo del ecosistema Okupa.
import { el } from '../../nucleo/ui.js';
import { cargarIncluido, unir } from './datos.js';
import { crearProgreso } from './progreso.js';
import { crearPantallas } from './pantallas.js';

const estado = { listo: false, error: null };
let pantallas = null;

// Vuelve a unir lo incluido con lo propio y recalcula los índices.
function actualizarContenido() {
  estado.contenido = unir(estado.incluido, estado.propio?.obtener());
  estado.porId = new Map(estado.contenido.preguntas.map((q) => [q.id, q]));
  estado.categoriaPorId = new Map(estado.contenido.categorias.map((c) => [c.id, c]));
  estado.fuentePorId = new Map(estado.contenido.fuentes.map((f) => [f.id, f]));
}

async function iniciar(ctx) {
  estado.error = null;
  try {
    estado.incluido = await cargarIncluido();
    estado.progreso = crearProgreso(ctx.almacen);
    actualizarContenido();
    pantallas = crearPantallas(estado);
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
function ruta(nombre) {
  return (contenedor, params, ctx) => {
    if (!estado.listo) {
      contenedor.append(el('a', { clase: 'volver', href: '#/' }, '← Inicio'), errorDeCarga(ctx));
      return;
    }
    return pantallas[nombre](contenedor, params, ctx);
  };
}

export default {
  id: 'preguntas',
  nombre: 'Preguntas',
  iniciar,
  rutas: {
    categorias: ruta('categorias'),
    'categoria/:id': ruta('categoria'),
    azar: ruta('azar'),
    sesiones: ruta('sesiones'),
    'sesion/:id': ruta('sesion'),
    'carta/:id': ruta('carta'),
  },
  tarjetasInicio(ctx) {
    return estado.listo ? pantallas.tarjetasInicio(ctx) : [errorDeCarga(ctx)];
  },
  acerca(ctx) {
    return estado.listo ? pantallas.acerca(ctx) : null;
  },
};
