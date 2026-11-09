// Pantallas del Match: mazo para votar deslizando, lista de matches con "¡Lo hicimos!" y crear tarjeta.
import { el } from '../../nucleo/ui.js';
import { exigirPareja } from '../../nucleo/pantallas-pareja.js';
import { MAZOS, crearMatch, planDeLaSemana, barajar } from './logica.js';

const CLAVE_MAZOS = 'okupa:match:mazos';
export const CLAVE_PLAN = 'okupa:match:plan';
const UMBRAL = 90;
const MAZO_DE = Object.fromEntries(MAZOS.map((m) => [m.id, m]));

function hoyLocal() {
  const d = new Date();
  const dos = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

// Línea corta para la tarjeta "Jugar juntos" del inicio (se pinta sin internet).
export function detalleInicio(almacen) {
  const plan = almacen.leer(CLAVE_PLAN, null);
  return typeof plan === 'string' && plan ? `Plan de la semana: ${plan}` : null;
}

function festejar(tarjeta) {
  const cerrar = () => capa.remove();
  const capa = el('div', { clase: 'festejo-match', role: 'dialog', 'aria-modal': 'true', 'aria-label': '¡Match!' },
    el('div', { clase: 'festejo-caja' },
      el('p', { clase: 'festejo-titulo' }, '¡Match!'),
      el('p', { clase: 'festejo-sub' }, 'Los dos quieren:'),
      el('p', { clase: 'festejo-texto' }, tarjeta.texto),
      el('button', { clase: 'boton boton-principal', type: 'button', onclick: cerrar }, '¡Genial!')));
  document.body.append(capa);
}

export function crearPantallasMatch({ cargar, ordenar = barajar, hoy = hoyLocal } = {}) {
  async function preparar(zona, ctx) {
    const r = await exigirPareja(zona, ctx);
    if (!r) return null;
    let incluidas = [];
    try {
      incluidas = await cargar();
    } catch {
      zona.append(el('p', { clase: 'aviso' }, 'No se pudieron cargar las tarjetas.'),
        el('button', { clase: 'boton', type: 'button', onclick: () => ctx.refrescar() }, 'Reintentar'));
      return null;
    }
    const logica = crearMatch(r.nube, r.pareja);
    const propias = await logica.tarjetasPropias().catch(() => []);
    const todas = [...incluidas, ...propias];
    return { ...r, logica, todas, porId: new Map(todas.map((t) => [t.id, t])) };
  }

  function sinConexion(zona, ctx) {
    zona.replaceChildren(el('div', { clase: 'vacio' },
      el('p', {}, 'Se necesita conexión para el Match.'),
      el('button', { clase: 'boton boton-principal', type: 'button', onclick: () => ctx.refrescar() }, 'Reintentar')));
  }

  // Calcula y guarda (para el inicio) el plan de la semana.
  function recordarPlan(ctx, matches, porId) {
    const id = planDeLaSemana(matches, hoy());
    const texto = id ? porId.get(id)?.texto || null : null;
    ctx.almacen.escribir(CLAVE_PLAN, texto);
    return id;
  }

  async function mazo(contenedor, _params, ctx) {
    const zona = el('div');
    contenedor.append(el('a', { clase: 'volver', href: '#/' }, '← Inicio'), zona);
    const p = await preparar(zona, ctx);
    if (!p) return;
    const { logica, todas, porId } = p;
    const activos = new Set(ctx.almacen.leer(CLAVE_MAZOS, MAZOS.map((m) => m.id)));
    let matches;
    let pila;
    try {
      matches = await logica.listarMatches();
      pila = ordenar(await logica.pendientes(todas.filter((t) => activos.has(t.mazo))));
    } catch {
      sinConexion(zona, ctx);
      return;
    }
    const planId = recordarPlan(ctx, matches, porId);

    const contador = el('p', { clase: 'contador-match' });
    const zonaCarta = el('div', { clase: 'zona-carta-match' });
    const mensaje = el('p', { clase: 'campo-ayuda', role: 'status' });

    const chips = el('div', { clase: 'chips-capas chips-mazos', role: 'group', 'aria-label': 'Mazos' }, MAZOS.map((m) => {
      const b = el('button', { clase: 'chip-capa', type: 'button', 'aria-pressed': String(activos.has(m.id)),
        onclick: () => {
          if (activos.has(m.id)) activos.delete(m.id); else activos.add(m.id);
          ctx.almacen.escribir(CLAVE_MAZOS, [...activos]);
          ctx.refrescar();
        } }, `${m.icono} ${m.nombre}`);
      return b;
    }));

    let ocupado = false;
    async function votar(voto) {
      const t = pila[0];
      if (!t || ocupado) return;
      ocupado = true;
      try {
        const r = await logica.votar(t.id, voto);
        pila = pila.slice(1);
        if (r.match) festejar(t);
        mensaje.textContent = '';
      } catch {
        mensaje.textContent = 'No se pudo guardar el voto. Revisa la conexión.';
      } finally {
        ocupado = false;
        pintar();
      }
    }

    function habilitarGestos(carta) {
      let inicio = null;
      let d = { x: 0, y: 0 };
      carta.addEventListener('pointerdown', (e) => {
        inicio = { x: e.clientX, y: e.clientY };
        carta.setPointerCapture?.(e.pointerId);
        carta.classList.add('arrastrando');
      });
      carta.addEventListener('pointermove', (e) => {
        if (!inicio) return;
        d = { x: e.clientX - inicio.x, y: e.clientY - inicio.y };
        carta.style.transform = `translate(${d.x}px, ${Math.min(0, d.y)}px) rotate(${Math.max(-14, Math.min(14, d.x / 16))}deg)`;
        carta.dataset.rumbo = d.y < -UMBRAL && Math.abs(d.x) < UMBRAL ? 'quizas' : d.x > UMBRAL ? 'si' : d.x < -UMBRAL ? 'no' : '';
      });
      const soltar = () => {
        if (!inicio) return;
        inicio = null;
        carta.classList.remove('arrastrando');
        const rumbo = carta.dataset.rumbo;
        carta.style.transform = '';
        carta.dataset.rumbo = '';
        if (rumbo) votar(rumbo);
      };
      carta.addEventListener('pointerup', soltar);
      carta.addEventListener('pointercancel', soltar);
    }

    function pintar() {
      contador.textContent = pila.length ? `${pila.length} por votar` : '';
      const t = pila[0];
      if (!t) {
        zonaCarta.replaceChildren(el('div', { clase: 'vacio' },
          el('p', {}, activos.size ? 'Ya votaste todas las tarjetas de estos mazos.' : 'Escoge al menos un mazo.'),
          el('a', { clase: 'boton boton-principal', href: '#/match/nueva' }, '＋ Crear una tarjeta'),
          el('a', { clase: 'boton', href: '#/match/matches' }, 'Ver nuestros matches')));
        return;
      }
      const m = MAZO_DE[t.mazo] || { icono: '✦', nombre: '' };
      const carta = el('article', { clase: 'carta carta-match', 'data-id': t.id },
        el('header', { clase: 'carta-cabecera' },
          el('span', { clase: 'carta-categoria' }, el('span', { 'aria-hidden': 'true' }, m.icono), ` ${m.nombre}`)),
        el('p', { clase: 'carta-texto' }, t.texto),
        el('p', { clase: 'carta-pista', 'aria-hidden': 'true' }, '← No · ↑ Solo si tú quieres · Me encantaría →'));
      habilitarGestos(carta);
      zonaCarta.replaceChildren(
        carta,
        el('div', { clase: 'botones-voto' },
          el('button', { clase: 'voto voto-no', type: 'button', onclick: () => votar('no') }, el('span', { 'aria-hidden': 'true' }, '✕'), ' No'),
          el('button', { clase: 'voto voto-quizas', type: 'button', onclick: () => votar('quizas') }, 'Solo si tú quieres'),
          el('button', { clase: 'voto voto-si', type: 'button', onclick: () => votar('si') }, el('span', { 'aria-hidden': 'true' }, '♥'), ' Me encantaría')));
    }

    zona.replaceChildren(
      el('h1', { clase: 'titulo-pantalla' }, 'Match'),
      el('p', { clase: 'subtitulo' }, 'Vota en secreto. Solo verán lo que los dos quieren; lo que digas que no, nunca se revela.'),
      planId ? el('a', { clase: 'plan-semana', href: '#/match/matches' },
        el('span', { clase: 'plan-etiqueta' }, 'Plan de la semana'),
        el('span', { clase: 'plan-texto' }, porId.get(planId)?.texto || '')) : null,
      chips, contador, zonaCarta, mensaje,
      el('nav', { clase: 'enlaces-match' },
        el('a', { clase: 'boton', href: '#/match/matches' }, `Nuestros matches (${matches.length})`),
        el('a', { clase: 'boton', href: '#/match/nueva' }, '＋ Crear tarjeta')));
    pintar();
  }

  async function matches(contenedor, _params, ctx) {
    const zona = el('div');
    contenedor.append(el('a', { clase: 'volver', href: '#/match' }, '← Match'), zona);
    const p = await preparar(zona, ctx);
    if (!p) return;
    const { logica, porId } = p;
    let lista;
    try { lista = await logica.listarMatches(); } catch {
      zona.append(el('p', { clase: 'aviso' }, 'No se pudieron cargar los matches. Revisa la conexión.'));
      return;
    }
    const planId = recordarPlan(ctx, lista, porId);
    const fila = (m) => {
      const t = porId.get(m.id) || { texto: 'Tarjeta borrada', mazo: '' };
      const icono = MAZO_DE[t.mazo]?.icono || '✦';
      const b = el('button', { clase: `boton${m.hecho ? '' : ' boton-principal'}`, type: 'button', 'aria-pressed': String(m.hecho),
        onclick: async () => {
          b.disabled = true;
          try { await logica.marcarHecho(m.id, !m.hecho); m.hecho = !m.hecho; } catch { /* se queda como estaba */ }
          ctx.refrescar();
        } }, m.hecho ? 'Hecho ✓' : '¡Lo hicimos!');
      return el('li', { clase: `fila fila-match${m.hecho ? ' hecho' : ''}${m.id === planId ? ' es-plan' : ''}` },
        el('span', { 'aria-hidden': 'true', clase: 'icono-match' }, icono),
        el('div', { clase: 'fila-cuerpo' },
          m.id === planId ? el('div', { clase: 'plan-etiqueta' }, 'Plan de la semana') : null,
          el('div', { clase: 'fila-texto' }, t.texto)),
        b);
    };
    zona.replaceChildren(
      el('h1', { clase: 'titulo-pantalla' }, 'Nuestros matches'),
      lista.length
        ? el('ul', { clase: 'lista' }, [...lista].sort((x, y) => (x.id === planId ? -1 : y.id === planId ? 1 : x.hecho - y.hecho)).map(fila))
        : el('div', { clase: 'vacio' }, el('p', {}, 'Todavía no tienen matches. ¡A votar!'), el('a', { clase: 'boton boton-principal', href: '#/match' }, 'Ir al mazo')));
  }

  async function nueva(contenedor, _params, ctx) {
    const zona = el('div');
    contenedor.append(el('a', { clase: 'volver', href: '#/match' }, '← Match'), zona);
    const p = await preparar(zona, ctx);
    if (!p) return;
    let mazoElegido = 'citas';
    const grupo = el('div', { clase: 'chips-capas chips-mazos', role: 'group', 'aria-label': 'Mazo' });
    const pintarGrupo = () => grupo.replaceChildren(...MAZOS.map((m) => el('button', {
      clase: 'chip-capa', type: 'button', 'aria-pressed': String(m.id === mazoElegido),
      onclick: () => { mazoElegido = m.id; pintarGrupo(); },
    }, `${m.icono} ${m.nombre}`)));
    pintarGrupo();
    const texto = el('textarea', { maxlength: '140', placeholder: 'Ej: Ver el amanecer en Monserrate' });
    const error = el('p', { clase: 'error-formulario', role: 'alert' });
    zona.replaceChildren(
      el('h1', { clase: 'titulo-pantalla' }, 'Nueva tarjeta'),
      el('p', { clase: 'subtitulo' }, 'A tu pareja le llegará mezclada con las demás, sin saber que la escribiste tú. Tu voto queda en "Me encantaría".'),
      grupo,
      el('div', { clase: 'campo' }, texto),
      error,
      el('button', { clase: 'boton boton-principal', type: 'button',
        onclick: async () => {
          const r = await p.logica.crearTarjeta({ mazo: mazoElegido, texto: texto.value }).catch(() => ({ ok: false, error: 'No se pudo guardar. Revisa la conexión.' }));
          if (!r.ok) { error.textContent = r.error; return; }
          ctx.ir('match');
        } }, 'Guardar'));
  }

  return { mazo, matches, nueva };
}
