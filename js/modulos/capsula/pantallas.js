// Pantallas de la «Cápsula del tiempo»: la lista de cartas, escribir una y leerla cuando abre.
import { el } from '../../nucleo/ui.js';
import { miPareja } from '../../nucleo/pareja.js';
import { exigirPareja } from '../../nucleo/pantallas-pareja.js';
import { proximas, sumarDias, miles, fechaLegible } from '../fechas/calendario.js';
import { leerCopia as leerCopiaFechas } from '../fechas/datos.js';
import { MAX_TEXTO, MAX_DIAS, diasHasta, estaAbierta, detalleInicio as detalleLogica } from './logica.js';
import {
  hoyLocal, validarCarta, crearCarta, leerTexto, borrarCarta, leerCopia, refrescarCopia,
} from './datos.js';

const otroLugar = (lugar) => (lugar === 'a' ? 'b' : 'a');
const nombreDe = (nombres, lugar) => (nombres || {})[lugar] || 'tu pareja';

const esPermiso = (e) => ['permiso', 'permiso-denegado', 'permission-denied'].includes(e?.codigo ?? e?.code)
  || /permission-denied/.test(e?.message || '');

const cuandoAbre =(n) => (n === 1 ? 'mañana' : `en ${n} días`);

// Línea corta para la tarjeta «Jugar juntos» del inicio (se pinta sin internet).
export function detalleInicio(almacen, hoy = hoyLocal()) {
  const pareja = miPareja(almacen);
  const cartas = (pareja && leerCopia(almacen, pareja.codigo)) || [];
  return detalleLogica(cartas, pareja?.lugar, hoy);
}

export function crearPantallasCapsula({ hoy = hoyLocal } = {}) {
  // Trae las cartas de la nube (y renueva la copia); sin conexión usa la copia del celular.
  async function cargarCartas(ctx, r) {
    try {
      return await refrescarCopia(r.nube, r.pareja, ctx.almacen);
    } catch {
      return leerCopia(ctx.almacen, r.pareja.codigo) || [];
    }
  }

  async function lista(contenedor, _params, ctx) {
    const zona = el('div');
    contenedor.append(el('a', { clase: 'volver', href: '#/' }, '← Inicio'), zona);
    const r = await exigirPareja(zona, ctx);
    if (!r) return;
    const cartas = await cargarCartas(ctx, r);
    const nombres = r.pareja.nombres || {};
    const dia = hoy();
    const porFecha = (x, y) => (x.abreEl < y.abreEl ? -1 : x.abreEl > y.abreEl ? 1 : 0);
    const paraTi = cartas.filter((c) => c.de !== r.pareja.lugar).sort(porFecha);
    const mias = cartas.filter((c) => c.de === r.pareja.lugar).sort(porFecha);

    const filaPara = (c) => {
      const abierta = estaAbierta(c, dia);
      const titulo = el('span', { clase: 'fila-titulo' }, `Carta de ${nombreDe(nombres, c.de)}`);
      if (abierta) {
        return el('li', {}, el('a', { clase: 'fila fila-fecha fila-carta', href: `#/capsula/${c.id}` },
          el('span', { clase: 'fila-cuerpo' }, titulo, el('span', { clase: 'fila-detalle' }, fechaLegible(c.abreEl))),
          el('span', { clase: 'fila-marca' }, 'Abrir carta')));
      }
      return el('li', {}, el('span', { clase: 'fila fila-fecha fila-carta' },
        el('span', { clase: 'fila-cuerpo' }, titulo,
          el('span', { clase: 'fila-detalle' }, `se abre el ${fechaLegible(c.abreEl)} · ${cuandoAbre(diasHasta(c.abreEl, dia))}`))));
    };
    const filaMia = (c) => el('li', {}, el('a', { clase: 'fila fila-fecha fila-carta', href: `#/capsula/${c.id}` },
      el('span', { clase: 'fila-cuerpo' },
        el('span', { clase: 'fila-titulo' }, `Para ${nombreDe(nombres, otroLugar(r.pareja.lugar))}`),
        el('span', { clase: 'fila-detalle' }, `se abre el ${fechaLegible(c.abreEl)}`)),
      el('span', { clase: 'fila-ajuste-flecha', 'aria-hidden': 'true' }, '›')));

    // Dentro de un el(): los null se omiten (replaceChildren nativo los escribiría como «null»).
    zona.replaceChildren(el('div', {},
      el('h1', { clase: 'titulo-pantalla' }, 'Cápsula del tiempo'),
      paraTi.length ? el('h2', { clase: 'titulo-parte' }, 'Para ti') : null,
      paraTi.length ? el('ul', { clase: 'lista' }, paraTi.map(filaPara)) : null,
      mias.length ? el('h2', { clase: 'titulo-parte' }, 'Las que escribiste') : null,
      mias.length ? el('ul', { clase: 'lista' }, mias.map(filaMia)) : null,
      cartas.length ? null : el('p', { clase: 'vacio' }, 'Todavía no hay cartas.'),
      el('a', { clase: 'boton boton-principal fechas-agregar', href: '#/capsula/nueva' }, 'Escribir una carta')));
  }

  async function nueva(contenedor, _params, ctx) {
    const zona = el('div');
    contenedor.append(el('a', { clase: 'volver', href: '#/capsula' }, '← Cápsula'), zona);
    const r = await exigirPareja(zona, ctx);
    if (!r) return;
    const dia = hoy();
    const nombres = r.pareja.nombres || {};
    const idFecha = `c-${Math.random().toString(36).slice(2, 8)}`;
    const idTexto = `c-${Math.random().toString(36).slice(2, 8)}`;
    const entradaFecha = el('input', { type: 'date', id: idFecha, min: sumarDias(dia, 1), max: sumarDias(dia, MAX_DIAS) });
    const area = el('textarea', { id: idTexto, maxlength: String(MAX_TEXTO), rows: '8' });
    const contador = el('span', { clase: 'campo-ayuda capsula-contador' }, `0 / ${miles(MAX_TEXTO)}`);
    area.addEventListener('input', () => {
      contador.textContent = `${miles(area.value.length)} / ${miles(MAX_TEXTO)}`;
    });
    const aviso = el('p', { clase: 'aviso', role: 'alert' });
    const enviar = el('button', { clase: 'boton boton-principal', type: 'button' }, 'Sellar y enviar');

    // Atajos desde las fechas guardadas en este celular (si no hay, no se muestran).
    const copia = leerCopiaFechas(ctx.almacen, r.pareja.codigo);
    const proxs = copia ? proximas(copia.fechas, dia, 100).filter((e) => e.dia > dia) : [];
    const aniversario = proxs.find((e) => e.clase === 'aniversario');
    const cumple = proxs.find((e) => e.clase === 'cumple' && e.de === otroLugar(r.pareja.lugar));
    const atajo = (texto, e) => {
      const b = el('button', { clase: 'boton', type: 'button' }, texto);
      b.addEventListener('click', () => { entradaFecha.value = e.dia; });
      return b;
    };
    const atajos = [
      aniversario ? atajo('Próximo aniversario', aniversario) : null,
      cumple ? atajo(`Cumpleaños de ${nombreDe(nombres, cumple.de)}`, cumple) : null,
    ].filter(Boolean);

    enviar.addEventListener('click', async () => {
      aviso.textContent = '';
      const datos = { abreEl: entradaFecha.value, texto: area.value };
      const error = validarCarta(datos, dia);
      if (error) { aviso.textContent = error; return; }
      if (!window.confirm('¿Sellar la carta? Ya no la podrás cambiar.')) return;
      enviar.disabled = true;
      try {
        const res = await crearCarta(r.nube, r.pareja, datos, dia, Date.now());
        if (!res.ok) { aviso.textContent = res.error; return; }
        await refrescarCopia(r.nube, r.pareja, ctx.almacen).catch(() => {});
        ctx.ir('capsula');
      } catch {
        // Si ya se escribieron los metadatos, que la carta a medias aparezca (y se pueda borrar).
        await refrescarCopia(r.nube, r.pareja, ctx.almacen).catch(() => {});
        aviso.textContent = 'No se pudo guardar. Revisa la conexión.';
      } finally {
        enviar.disabled = false;
      }
    });

    zona.replaceChildren(el('div', {},
      el('h1', { clase: 'titulo-pantalla' }, 'Escribe una carta'),
      el('div', { clase: 'campo' },
        el('label', { for: idFecha }, 'Fecha en que se abre'), entradaFecha,
        atajos.length ? el('div', { clase: 'capsula-atajos' }, atajos) : null),
      el('div', { clase: 'campo' }, el('label', { for: idTexto }, 'Tu carta'), area, contador),
      aviso,
      el('div', { clase: 'fechas-acciones' }, enviar)));
  }

  async function ver(contenedor, params, ctx) {
    const zona = el('div');
    contenedor.append(el('a', { clase: 'volver', href: '#/capsula' }, '← Cápsula'), zona);
    const r = await exigirPareja(zona, ctx);
    if (!r) return;
    const id = params?.id;
    const cartas = await cargarCartas(ctx, r);
    const carta = cartas.find((c) => c.id === id);
    const botonBorrar = () => {
      const borrar = el('button', { clase: 'boton boton-peligro', type: 'button' }, 'Borrar carta');
      const aviso = el('p', { clase: 'aviso', role: 'alert' });
      borrar.addEventListener('click', async () => {
        if (!window.confirm('¿Borrar esta carta para los dos?')) return;
        borrar.disabled = true;
        aviso.textContent = '';
        try {
          await borrarCarta(r.nube, r.pareja, id);
          await refrescarCopia(r.nube, r.pareja, ctx.almacen).catch(() => {});
          ctx.ir('capsula');
        } catch {
          aviso.textContent = 'No se pudo borrar. Revisa la conexión.';
        } finally {
          borrar.disabled = false;
        }
      });
      return el('div', {}, aviso, el('div', { clase: 'fechas-acciones' }, borrar));
    };
    const mensaje = (texto, conBorrar = false) => zona.replaceChildren(el('div', { clase: 'vacio' }, el('p', {}, texto),
      conBorrar ? botonBorrar() : null,
      el('a', { clase: 'boton', href: '#/capsula' }, 'Volver a la cápsula')));
    if (!carta) { mensaje('No encontramos esa carta.'); return; }
    const propia = carta.de === r.pareja.lugar;
    const cerrada = () => mensaje(`Esta carta se abre el ${fechaLegible(carta.abreEl)}.`);
    const abierta = estaAbierta(carta, hoy());
    // La del otro, mientras no abra, ni se pide el texto a la nube.
    if (!propia && !abierta) { cerrada(); return; }
    let texto;
    try {
      texto = await leerTexto(r.nube, r.pareja, id);
    } catch (e) {
      if (!abierta) cerrada();
      else if (esPermiso(e)) {
        // abreMs es medianoche en el celular de quien la escribió: en otra zona puede faltar unas horas.
        const hora = new Date(carta.abreMs).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        mensaje(`Esta carta se abre hoy a las ${hora}.`);
      } else mensaje('No se pudo cargar la carta. Revisa la conexión.');
      return;
    }
    // Sin texto (falló la segunda escritura): se puede borrar para no dejarla huérfana.
    if (texto === null) { mensaje('Esta carta llegó vacía.', true); return; }

    zona.replaceChildren(el('div', {},
      el('h1', { clase: 'titulo-pantalla' }, `De ${nombreDe(r.pareja.nombres, carta.de)} · ${fechaLegible(carta.abreEl)}`),
      el('div', { clase: 'capsula-carta' }, texto.split(/\n{2,}/).map((x) => el('p', { clase: 'capsula-parrafo' }, x))),
      botonBorrar()));
  }

  return { lista, nueva, ver };
}
