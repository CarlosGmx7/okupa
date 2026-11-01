// Arranque de Okupa: carga los módulos activos, arma las rutas y pinta cada pantalla.
import { almacen } from './almacen.js';
import { resolverRuta, cargarModulos } from './rutas.js';
import { el, transicion } from './ui.js';

const vista = document.getElementById('vista');
const tabla = {};
const ctx = {
  almacen,
  modulos: [],
  ir(ruta) { location.hash = `#/${ruta}`; },
  refrescar() { pintar(); },
};

function pantallaInicio(contenedor) {
  const tarjetas = ctx.modulos.flatMap((m) => {
    try { return m.tarjetasInicio?.(ctx) || []; }
    catch (e) { console.warn(`Okupa: el módulo "${m.id}" falló al pintar el inicio`, e); return []; }
  });
  contenedor.append(
    el('header', { clase: 'inicio-cabecera' },
      el('img', { clase: 'inicio-portada', src: 'iconos/portada-circular.png', alt: '', onerror: (e) => e.target.remove() }),
      el('h1', { clase: 'logo' }, 'Okupa'),
      el('p', { clase: 'lema' }, 'Preguntas para conocerse de verdad')),
    el('div', { clase: 'inicio-tarjetas' }, tarjetas),
    el('footer', { clase: 'inicio-pie' },
      el('a', { href: '#/acerca' }, 'Acerca de Okupa')),
  );
}

function pantallaAcerca(contenedor) {
  const secciones = ctx.modulos.map((m) => {
    try { return m.acerca?.(ctx) || null; }
    catch { return null; }
  });
  contenedor.append(
    el('a', { clase: 'volver', href: '#/' }, '← Inicio'),
    el('h1', { clase: 'titulo-pantalla' }, 'Acerca de Okupa'),
    secciones,
    el('section', { clase: 'bloque-texto' },
      el('h2', {}, 'Empezar de cero'),
      el('p', {}, 'Borra lo que esta app recuerda en este celular: preguntas vistas, avance de sesiones y todo lo que hayan creado.'),
      el('button', {
        clase: 'boton boton-peligro',
        onclick: () => {
          if (!confirm('¿Seguro? Se borrará todo lo guardado en este celular, incluidas sus preguntas propias.')) return;
          for (const clave of almacen.claves('okupa:')) almacen.borrar(clave);
          location.hash = '#/';
          location.reload();
        },
      }, 'Reiniciar todo')),
  );
}

async function pintar() {
  const r = resolverRuta(location.hash, tabla) || { handler: pantallaInicio, params: {} };
  await transicion(async () => {
    vista.replaceChildren();
    window.scrollTo(0, 0);
    try {
      await r.handler(vista, r.params, ctx);
    } catch (e) {
      console.error(e);
      vista.replaceChildren(
        el('p', { clase: 'aviso' }, 'Algo salió mal al abrir esta pantalla.'),
        el('a', { clase: 'boton', href: '#/' }, 'Volver al inicio'));
    }
  });
}

async function arrancar() {
  let ids = [];
  try {
    ids = await (await fetch('modulos.json')).json();
  } catch (e) {
    console.warn('Okupa: no se pudo leer modulos.json', e);
  }
  ctx.modulos = await cargarModulos(ids);
  for (const m of ctx.modulos) {
    try { await m.iniciar?.(ctx); }
    catch (e) { console.warn(`Okupa: el módulo "${m.id}" no pudo iniciar`, e); }
    for (const [sub, handler] of Object.entries(m.rutas || {})) tabla[`${m.id}/${sub}`] = handler;
  }
  tabla[''] = pantallaInicio;
  tabla.acerca = pantallaAcerca;
  window.addEventListener('hashchange', pintar);
  await pintar();
}

arrancar();
