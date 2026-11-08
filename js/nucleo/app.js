// Arranque de Okupa: carga los módulos activos, arma las rutas y pinta cada pantalla.
import { almacen } from './almacen.js';
import { resolverRuta, cargarModulos } from './rutas.js';
import { el, transicion } from './ui.js';
import { pantallaInicio, pantallaAcerca } from './inicio.js';
import { obtenerNube } from './nube.js';
import { pantallaPareja } from './pantallas-pareja.js';
import { precalentar } from './precalentar.js';
import { crearInstalacion } from './instalacion.js';

const vista = document.getElementById('vista');
const tabla = {};
const ctx = {
  almacen,
  instalacion: crearInstalacion(),
  modulos: [],
  nube: obtenerNube,
  ir(ruta) { location.hash = `#/${ruta}`; },
  refrescar() { pintar(); },
};

let primeraVez = true;

async function pintar() {
  const r = resolverRuta(location.hash, tabla) || { handler: pantallaInicio, params: {} };
  const cambiar = primeraVez ? (fn) => fn() : transicion;
  primeraVez = false;
  // La transición solo espera lo inmediato: si la pantalla trae datos de internet, se muestra ya
  // (con su "Conectando…") en vez de dejar congelada la anterior hasta que lleguen.
  let terminada;
  await cambiar(async () => {
    vista.replaceChildren();
    window.scrollTo(0, 0);
    terminada = Promise.resolve().then(() => r.handler(vista, r.params, ctx)).catch((e) => {
      console.error(e);
      vista.replaceChildren(
        el('p', { clase: 'aviso' }, 'Algo salió mal al abrir esta pantalla.'),
        el('a', { clase: 'boton', href: '#/' }, 'Volver al inicio'));
    });
    await Promise.race([terminada, new Promise((res) => setTimeout(res, 60))]);
  });
  await terminada;
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
  tabla.pareja = pantallaPareja;
  window.addEventListener('hashchange', pintar);
  // Si el navegador ofrece instalar (o ya se instaló), repinta el inicio para mostrar u ocultar el botón.
  ctx.instalacion.alCambiar(() => { if (!resolverRuta(location.hash, tabla) || location.hash.replace(/[#/]/g, '') === '') pintar(); });
  await pintar();
  // Con la app ya pintada, adelanta Firebase y las preguntas para que Trivia y Diario abran rápido.
  const luego = window.requestIdleCallback || ((fn) => setTimeout(fn, 400));
  luego(() => precalentar(ctx));
}

arrancar();
