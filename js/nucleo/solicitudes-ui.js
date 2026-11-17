// Franja para los miembros de la pareja: avisa que un celular nuevo pidió entrar y deja aprobar o rechazar.
// Solo lee al montar y al volver a la app (sin escuchas permanentes); sin pareja o sin solicitudes no pinta nada.
import { el } from './ui.js';
import { miPareja, solicitudesDe, aprobarSolicitud, rechazarSolicitud } from './pareja.js';

const FECHA = { weekday: 'long', day: 'numeric', month: 'long' };
const fecha = (ms) => new Date(ms).toLocaleDateString('es-CO', FECHA);
const SIN_RED = 'No se pudo. Revisa la conexión e intenta otra vez.';

export function montarAvisoSolicitud(contenedor, ctx, { ahora = Date.now, confirmar = (t) => globalThis.confirm(t) } = {}) {
  let vivo = true;
  let lectura = 0;
  let visto = false; // ya estuvo en la página: si deja de estarlo, el inicio se repintó y hay que soltar los oyentes

  const desmontar = () => {
    if (!vivo) return;
    vivo = false;
    globalThis.document?.removeEventListener?.('visibilitychange', alVolver);
    globalThis.removeEventListener?.('hashchange', revisarPresencia);
  };
  function revisarPresencia() {
    if (contenedor.isConnected) visto = true;
    else if (visto) desmontar();
  }
  function alVolver() {
    revisarPresencia();
    if (vivo && globalThis.document?.visibilityState !== 'hidden') leer();
  }

  function franja(s, nube, pareja) {
    const error = el('p', { clase: 'error-formulario', role: 'alert' });
    const botones = [];
    const accion = (boton, fn) => boton.addEventListener('click', async () => {
      botones.forEach((b) => { b.disabled = true; });
      error.textContent = '';
      try { await fn(); } catch (e) {
        if (!vivo) return;
        if (e?.name !== 'ErrorNube' && e?.name !== 'ErrorPareja') console.warn('Okupa:', e);
        error.textContent = SIN_RED;
        botones.forEach((b) => { b.disabled = false; });
      }
    });
    const boton = (texto, principal, fn) => {
      const b = el('button', { clase: principal ? 'boton boton-principal' : 'boton', type: 'button' }, texto);
      botones.push(b);
      accion(b, fn);
      return b;
    };
    const rechazar = boton('Rechazar', false, async () => {
      await rechazarSolicitud(nube, pareja, s.lugar);
      if (vivo) await leer();
    });
    const texto = s.mia
      ? `Alguien pide entrar como ${s.nombre || 'tú'} desde otro celular. ¿Eres tú?`
      : `${s.nombre || 'Tu pareja'} pidió entrar desde otro celular. Entrará el ${fecha(s.entraMs)} si nadie lo rechaza.`;
    const aprobar = s.mia ? boton('Aprobar', true, async () => {
      if (!confirmar('Este celular quedará por fuera. ¿Aprobar?')) { botones.forEach((b) => { b.disabled = false; }); return; }
      await aprobarSolicitud(nube, ctx.almacen, s.lugar);
      if (!vivo) return;
      desmontar();
      contenedor.replaceChildren(el('div', { clase: 'franja-solicitud', role: 'status' },
        el('p', { clase: 'franja-solicitud-texto' }, 'Pasaste tu lugar a tu celular nuevo.')));
    }) : null;
    return el('div', { clase: 'franja-solicitud', role: 'group', 'aria-label': 'Solicitud de un celular nuevo' },
      el('p', { clase: 'franja-solicitud-texto' }, texto),
      error,
      el('div', { clase: 'franja-solicitud-acciones' }, aprobar, rechazar));
  }

  async function leer() {
    const mia = ++lectura;
    try {
      const pareja = ctx.almacen ? miPareja(ctx.almacen) : null;
      if (!pareja) { contenedor.replaceChildren(); return; }
      const nube = await ctx.nube();
      const pendientes = await solicitudesDe(nube, pareja, ahora());
      if (!vivo || mia !== lectura) return;
      contenedor.replaceChildren(...pendientes.map((s) => franja(s, nube, pareja)));
    } catch { /* sin red o sin nube: se deja lo que haya y se reintenta al volver a la app */ }
  }

  globalThis.document?.addEventListener?.('visibilitychange', alVolver);
  globalThis.addEventListener?.('hashchange', revisarPresencia);
  revisarPresencia();
  leer();
  return desmontar;
}
