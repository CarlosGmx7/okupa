// Pantalla de la Ruleta de citas: eliges presupuesto y lugar, giras y sale un plan. Sin nube ni pareja.
import { el, movimientoReducido as reducidoDelSistema } from '../../nucleo/ui.js';
import {
  PRESUPUESTOS, LUGARES, cargarPlanes, crearRacha, leerEleccion, guardarEleccion,
} from './logica.js';

// Los tipos del banco, en el orden en que se reparten por la rueda (empezando arriba, hacia la derecha).
export const TIPOS = [
  { id: 'cocinar', nombre: 'Cocinar', icono: '🍳' },
  { id: 'juego', nombre: 'Juego', icono: '🎲' },
  { id: 'conversacion', nombre: 'Conversación', icono: '💬' },
  { id: 'aire-libre', nombre: 'Aire libre', icono: '🌿' },
  { id: 'cultura', nombre: 'Cultura', icono: '🎭' },
  { id: 'aventura', nombre: 'Aventura', icono: '🧭' },
  { id: 'romantico', nombre: 'Romántico', icono: '💞' },
  { id: 'picante', nombre: 'Picante', icono: '🔥' },
];
const TIPO_DESCONOCIDO = { id: '', nombre: 'Plan', icono: '✨' };
const GRADOS = 360 / TIPOS.length;
const VUELTAS = 3;

const tipoDe = (plan) => TIPOS.find((t) => t.id === plan.tipo) ?? TIPO_DESCONOCIDO;

// `cargar`, `azar`, `ms` y `movimientoReducido` se pueden cambiar en las pruebas.
export function crearPantallasRuleta({
  cargar = cargarPlanes,
  azar = Math.random,
  ms = {},
  movimientoReducido = reducidoDelSistema,
} = {}) {
  const T = { giro: 1200, ...ms };

  async function principal(contenedor, _params, ctx) {
    const zona = el('div', { clase: 'ruleta-pantalla' });
    contenedor.append(el('a', { clase: 'volver', href: '#/' }, '← Inicio'), zona);

    let planes;
    try {
      planes = await cargar();
    } catch (e) {
      console.warn('Okupa: no se pudieron cargar los planes', e);
      zona.replaceChildren(el('div', { clase: 'vacio' },
        el('p', {}, 'No se pudieron cargar los planes'),
        el('button', { clase: 'boton boton-principal', type: 'button', onclick: () => ctx.refrescar() }, 'Reintentar')));
      return;
    }

    const racha = crearRacha(planes, azar);
    let eleccion = leerEleccion(ctx.almacen);
    let girando = false;
    let angulo = 0;

    const ayuda = el('p', { clase: 'ruleta-ayuda', 'aria-live': 'polite' });
    const resultado = el('div', { clase: 'ruleta-resultado', 'aria-live': 'polite' });
    const rueda = el('div', { clase: 'ruleta-rueda', 'aria-hidden': 'true' },
      TIPOS.map((t, i) => el('span', { clase: 'ruleta-ficha', style: `--a: ${i * GRADOS}deg` }, t.icono)),
      el('span', { clase: 'ruleta-centro' }));
    const escenario = el('div', { clase: 'ruleta-escenario' },
      el('span', { clase: 'ruleta-puntero', 'aria-hidden': 'true' }), rueda);

    const grupo = (etiqueta, opciones, campo) => {
      const botones = opciones.map((o) => el('button', {
        clase: 'chip ruleta-pildora', type: 'button', title: o.ayuda, 'aria-pressed': String(eleccion[campo] === o.id),
        onclick: () => elegir(campo, o.id),
      }, o.nombre));
      return el('div', { clase: 'ruleta-fila', role: 'group', 'aria-label': etiqueta }, botones);
    };
    const filaPresupuesto = grupo('Presupuesto', PRESUPUESTOS, 'presupuesto');
    const filaLugar = grupo('Lugar', LUGARES, 'lugar');
    const todasLasPildoras = () => [...filaPresupuesto.children, ...filaLugar.children];

    function marcar() {
      PRESUPUESTOS.forEach((p, i) => filaPresupuesto.children[i].setAttribute('aria-pressed', String(eleccion.presupuesto === p.id)));
      LUGARES.forEach((l, i) => filaLugar.children[i].setAttribute('aria-pressed', String(eleccion.lugar === l.id)));
      ayuda.textContent = PRESUPUESTOS.find((p) => p.id === eleccion.presupuesto)?.ayuda ?? '';
    }

    function elegir(campo, id) {
      if (girando || eleccion[campo] === id) return;
      eleccion = { ...eleccion, [campo]: id };
      guardarEleccion(ctx.almacen, eleccion);
      marcar();
      mostrarGirar(); // cada combinación lleva su racha: el plan anterior ya no corresponde
    }

    const botonGirar = () => el('button', {
      clase: 'boton boton-principal boton-grande ruleta-girar', type: 'button', onclick: () => girar(),
    }, 'Girar');

    function mostrarGirar(mensaje = null) {
      // replaceChildren nativo escribiría «null»; el() ignora los vacíos.
      resultado.replaceChildren(el('div', { clase: 'ruleta-girar-zona' },
        mensaje ? el('p', { clase: 'ruleta-aviso', role: 'status' }, mensaje) : null,
        botonGirar()));
    }

    function mostrarPlan(plan) {
      const tipo = tipoDe(plan);
      let otra;
      const acciones = el('div', { clase: 'ruleta-acciones' },
        otra = el('button', { clase: 'boton', type: 'button', onclick: () => girar() }, 'Girar otra vez'),
        el('button', {
          clase: 'boton boton-principal', type: 'button',
          onclick: () => acciones.replaceChildren(el('p', { clase: 'ruleta-disfruten', role: 'status' }, '¡Disfruten!')),
        }, '¡Hagámoslo!'));
      resultado.replaceChildren(el('article', { clase: 'ruleta-plan' },
        el('span', { clase: 'ruleta-plan-icono', 'aria-hidden': 'true' }, tipo.icono),
        el('p', { clase: 'ruleta-plan-tipo' }, tipo.nombre),
        el('p', { clase: 'ruleta-plan-texto' }, plan.texto)), acciones);
      otra.focus({ preventScroll: true });
      resultado.scrollIntoView?.({ block: 'nearest', behavior: movimientoReducido() ? 'auto' : 'smooth' });
    }

    // Lleva la rueda hacia delante hasta dejar el tipo del plan bajo el puntero (siempre ≥ 3 vueltas nuevas).
    function apuntar(plan) {
      const i = Math.max(0, TIPOS.findIndex((t) => t.id === plan.tipo));
      const inicio = (Math.floor(angulo / 360) + VUELTAS + 1) * 360;
      angulo = inicio - i * GRADOS + (azar() - 0.5) * (GRADOS * 0.5);
      rueda.style.transform = `rotate(${angulo}deg)`;
    }

    function girar() {
      if (girando) return;
      const plan = racha.siguiente(eleccion.presupuesto, eleccion.lugar);
      if (!plan) {
        mostrarGirar('Todavía no hay planes para esta combinación. Prueba con otra.');
        return;
      }
      const sinAnimacion = movimientoReducido() || !(T.giro > 0);
      if (sinAnimacion) {
        rueda.style.transitionDuration = '0ms';
        apuntar(plan);
        mostrarPlan(plan);
        return;
      }
      girando = true;
      todasLasPildoras().forEach((b) => { b.disabled = true; });
      resultado.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      rueda.classList.add('girando');
      rueda.style.transitionDuration = `${T.giro}ms`;
      apuntar(plan);
      setTimeout(() => {
        girando = false;
        rueda.classList.remove('girando');
        todasLasPildoras().forEach((b) => { b.disabled = false; });
        mostrarPlan(plan);
      }, T.giro);
    }

    marcar();
    mostrarGirar();
    zona.replaceChildren(
      el('h1', { clase: 'titulo-pantalla' }, 'Ruleta de citas'),
      el('p', { clase: 'subtitulo' }, 'Elige cuánto quieres gastar y dónde, y deja que la ruleta decida el plan.'),
      filaPresupuesto, ayuda, filaLugar, escenario, resultado);
  }

  return { principal };
}
