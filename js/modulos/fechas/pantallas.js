// Pantallas de «Fechas»: la lista con los días juntos y las próximas, y el formulario para agregar o editar.
import { el } from '../../nucleo/ui.js';
import { exigirPareja } from '../../nucleo/pantallas-pareja.js';
import { diasJuntos, proximas } from './calendario.js';
import {
  hoyLocal, validarFecha, listarFechas, guardarFecha, borrarFecha, refrescarCopia, leerCopia,
} from './datos.js';

const miles = (n) => n.toLocaleString('es-CO');
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function duracionMeses(meses) {
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  const trozos = [];
  if (anios) trozos.push(plural(anios, 'año', 'años'));
  if (resto) trozos.push(plural(resto, 'mes', 'meses'));
  return trozos.join(' y ');
}

// Título corto de un evento próximo: «Cumpleaños de Yuli», «2 años juntos», «1.000 días»…
function tituloEvento(e, nombres) {
  switch (e.clase) {
    case 'cumple': return `Cumpleaños de ${(nombres || {})[e.de] || 'tu pareja'}`;
    case 'aniversario': return `${plural(e.anios, 'año', 'años')} juntos`;
    case 'mensual': return duracionMeses(e.meses);
    case 'hito': return `${miles(e.dias)} días`;
    default: return e.nombre;
  }
}

const cuandoFalta = (n) => (n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`);

// Línea corta para la tarjeta «Jugar juntos» del inicio (se pinta sin internet).
export function detalleInicio(almacen, hoy = hoyLocal()) {
  const copia = leerCopia(almacen);
  if (!copia || !copia.fechas.length) return 'Agreguen sus fechas';
  const inicio = copia.fechas.find((f) => f.tipo === 'inicio');
  const n = inicio ? diasJuntos(inicio.fecha, hoy) : null;
  const [prox] = proximas(copia.fechas, hoy, 1);
  const proxTexto = prox
    ? `${tituloEvento(prox, copia.nombres)} ${prox.faltan === 0 ? 'hoy' : `en ${prox.faltan} d`}`
    : null;
  if (n === null) return proxTexto || 'Agreguen sus fechas';
  const dias = `${miles(n)} ${n === 1 ? 'día' : 'días'}`;
  return proxTexto ? `${dias} · ${proxTexto}` : dias;
}

const nombreDe = (nombres, lugar) => nombres?.[lugar] || (lugar === 'a' ? 'Tú' : 'Tu pareja');

function fechaLegible(dia) {
  const [a, m, d] = dia.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function crearPantallasFechas({ hoy = hoyLocal } = {}) {
  // Trae las fechas de la nube (y renueva la copia); sin conexión usa la copia del celular.
  async function cargarFechas(ctx, r) {
    try {
      return await refrescarCopia(r.nube, r.pareja, ctx.almacen);
    } catch {
      return leerCopia(ctx.almacen)?.fechas || [];
    }
  }

  async function lista(contenedor, _params, ctx) {
    const zona = el('div');
    contenedor.append(el('a', { clase: 'volver', href: '#/' }, '← Inicio'), zona);
    const r = await exigirPareja(zona, ctx);
    if (!r) return;
    const fechas = await cargarFechas(ctx, r);
    const nombres = r.pareja.nombres || {};
    const dia = hoy();
    const inicio = fechas.find((f) => f.tipo === 'inicio');
    const dias = inicio ? diasJuntos(inicio.fecha, dia) : null;
    const cabeza = dias !== null
      ? el('p', { clase: 'fechas-dias' }, `Llevamos ${miles(dias)} ${dias === 1 ? 'día' : 'días'} juntos`)
      : el('a', { clase: 'boton boton-principal fechas-inicio-cta', href: '#/fechas/editar/inicio' }, '¿Desde cuándo están juntos?');

    const proxs = proximas(fechas, dia);
    const filaProxima = (e) => el('li', {},
      el('span', { clase: 'fila fila-fecha' },
        el('span', { clase: 'fila-cuerpo' }, el('span', { clase: 'fila-titulo' }, tituloEvento(e, nombres))),
        el('span', { clase: 'fila-marca' }, cuandoFalta(e.faltan))));

    const filaFecha = (href, titulo, detalle, vacia) => el('li', {},
      el('a', { clase: 'fila fila-fecha', href },
        el('span', { clase: 'fila-cuerpo' },
          el('span', { clase: 'fila-titulo' }, titulo),
          el('span', { clase: `fila-detalle${vacia ? ' fila-vacia' : ''}` }, detalle)),
        el('span', { clase: 'fila-ajuste-flecha', 'aria-hidden': 'true' }, '›')));
    const sinFecha = 'Sin fecha · Agregar';
    const cumple = (lugar) => {
      const f = fechas.find((x) => x.id === `cumple_${lugar}`);
      return filaFecha(`#/fechas/editar/cumple_${lugar}`, `Cumpleaños de ${nombreDe(nombres, lugar)}`,
        f ? fechaLegible(f.fecha) : sinFecha, !f);
    };
    const otras = fechas.filter((f) => f.tipo === 'otra').sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'));

    zona.replaceChildren(
      el('h1', { clase: 'titulo-pantalla' }, 'Fechas'),
      cabeza,
      proxs.length ? el('h2', { clase: 'titulo-parte' }, 'Próximas') : null,
      proxs.length ? el('ul', { clase: 'lista' }, proxs.map(filaProxima)) : null,
      el('h2', { clase: 'titulo-parte' }, 'Nuestras fechas'),
      el('ul', { clase: 'lista' },
        filaFecha('#/fechas/editar/inicio', 'Empezamos', inicio ? fechaLegible(inicio.fecha) : sinFecha, !inicio),
        cumple('a'),
        cumple('b'),
        otras.map((f) => filaFecha(`#/fechas/editar/${f.id}`, f.nombre, fechaLegible(f.fecha), false))),
      el('a', { clase: 'boton boton-principal fechas-agregar', href: '#/fechas/nueva' }, 'Agregar fecha'));
  }

  // Formulario común de «nueva» y «editar/:id».
  async function formulario(contenedor, ctx, id) {
    const zona = el('div');
    contenedor.append(el('a', { clase: 'volver', href: '#/fechas' }, '← Fechas'), zona);
    const r = await exigirPareja(zona, ctx);
    if (!r) return;
    const nombres = r.pareja.nombres || {};
    const esCumple = id === 'cumple_a' || id === 'cumple_b';
    const tipo = id === 'inicio' ? 'inicio' : esCumple ? 'cumple' : 'otra';
    const de = esCumple ? id.slice(-1) : undefined;
    let actual = null;
    if (id) {
      const todas = await listarFechas(r.nube, r.pareja).catch(() => leerCopia(ctx.almacen)?.fechas || []);
      actual = todas.find((f) => f.id === id) || null;
      if (!actual && tipo === 'otra') {
        zona.replaceChildren(el('div', { clase: 'vacio' }, el('p', {}, 'No encontramos esa fecha.'),
          el('a', { clase: 'boton', href: '#/fechas' }, 'Volver a Fechas')));
        return;
      }
    }
    const titulo = tipo === 'inicio' ? 'Desde cuándo están juntos'
      : tipo === 'cumple' ? `Cumpleaños de ${nombreDe(nombres, de)}`
        : id ? 'Editar fecha' : 'Nueva fecha';
    const idFecha = `c-${Math.random().toString(36).slice(2, 8)}`;
    const entradaFecha = el('input', { type: 'date', id: idFecha, max: tipo === 'inicio' ? hoy() : null });
    entradaFecha.value = actual?.fecha || '';
    const idNombre = `c-${Math.random().toString(36).slice(2, 8)}`;
    const entradaNombre = el('input', { type: 'text', id: idNombre, maxlength: '40', placeholder: 'Ej: Primer viaje' });
    entradaNombre.value = actual?.nombre || '';
    const aviso = el('p', { clase: 'aviso', role: 'alert' });
    const guardar = el('button', { clase: 'boton boton-principal', type: 'button' }, 'Guardar');
    const borrar = actual ? el('button', { clase: 'boton boton-peligro', type: 'button' }, tipo === 'otra' ? 'Borrar' : 'Quitar fecha') : null;

    // Corre una acción de nube: bloquea los botones, muestra el error y, si sale bien, vuelve a la lista.
    async function ejecutar(fn) {
      guardar.disabled = true;
      if (borrar) borrar.disabled = true;
      aviso.textContent = '';
      try {
        const error = await fn();
        if (error) { aviso.textContent = error; return; }
        await refrescarCopia(r.nube, r.pareja, ctx.almacen).catch(() => {});
        ctx.ir('fechas');
      } catch {
        aviso.textContent = 'No se pudo guardar. Revisa la conexión.';
      } finally {
        guardar.disabled = false;
        if (borrar) borrar.disabled = false;
      }
    }
    guardar.addEventListener('click', () => ejecutar(async () => {
      const datos = { tipo, fecha: entradaFecha.value };
      if (tipo === 'cumple') datos.de = de;
      if (tipo === 'otra') { datos.nombre = entradaNombre.value; if (id) datos.id = id; }
      const error = validarFecha(datos, hoy());
      if (error) return error;
      const res = await guardarFecha(r.nube, r.pareja, datos, hoy());
      return res.ok ? null : res.error;
    }));
    borrar?.addEventListener('click', () => ejecutar(async () => { await borrarFecha(r.nube, r.pareja, id); return null; }));

    zona.replaceChildren(
      el('h1', { clase: 'titulo-pantalla' }, titulo),
      el('div', { clase: 'campo' }, el('label', { for: idFecha }, 'Fecha'), entradaFecha),
      tipo === 'otra' ? el('div', { clase: 'campo' }, el('label', { for: idNombre }, 'Nombre'), entradaNombre) : null,
      aviso,
      el('div', { clase: 'fechas-acciones' }, guardar, borrar));
  }

  const editar = (contenedor, params, ctx) => formulario(contenedor, ctx, params?.id || null);
  const nueva = (contenedor, _params, ctx) => formulario(contenedor, ctx, null);

  return { lista, editar, nueva };
}
