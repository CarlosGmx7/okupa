// Pantallas del diario: hoy (gustos y reto de inglés), un día anterior, perfil, pendientes e historial.
import { el } from '../../nucleo/ui.js';
import { exigirPareja } from '../../nucleo/pantallas-pareja.js';
import { fechaBogota, fechaLegible } from './contenido.js';
import { normalizarPerfil, problemaDePerfil } from './perfil.js';
import { abrirDia, leerDia, escucharDia, listarDias, enviar, leerPropia, leerAmbas, guardarPerfil, leerPerfiles } from './dia.js';
import { estadoParte, coincidencia, adivino, rachaAmbos, porcentajeAdivinanzas, otroLugar, valorDe } from './revelar.js';

export const CLAVE_ESTADO = 'okupa:diario:estado';
const MAX_COMENTARIO = 280;
const MAX_TEXTO_PERFIL = 80;
const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;
const ETIQUETA = { coinciden: '¡Coincidieron!', parecido: 'Parecido', debate: 'Aquí hay debate' };
const NOMBRE_PARTE = { gustos: 'las preguntas', ingles: 'el reto de inglés' };

const alSalirDeRuta = (fn) => window.addEventListener('hashchange', fn, { once: true });
const vibrar = (patron) => { try { navigator.vibrate?.(patron); } catch { /* sin vibración */ } };
const vacio = (mensaje, ...resto) => el('div', { clase: 'vacio' }, el('p', {}, mensaje), resto);
const reintentar = (ctx) => el('button', { clase: 'boton boton-principal', type: 'button', onclick: () => ctx.refrescar() }, 'Reintentar');
const titulo = (texto = 'Diario') => el('h1', { clase: 'titulo-pantalla' }, texto);

// Lo que dice el acceso del inicio (se guarda en el celular y se pinta sin internet).
export function textoEstado(estadoGustos, nombreOtro) {
  if (estadoGustos === 'revelado') return 'Revelado ✓';
  if (estadoGustos === 'esperando') return `Esperando a ${nombreOtro}`;
  return 'Hoy: te toca responder';
}
export function detalleInicio(almacen, hoy = fechaBogota()) {
  const e = almacen?.leer(CLAVE_ESTADO, null);
  return e?.fecha === hoy && typeof e.texto === 'string' ? e.texto : 'Hoy: 3 preguntas nuevas';
}

const textoRespuesta = (p, item) => {
  const v = valorDe(p, item);
  if (v === undefined || v === null) return 'Sin respuesta';
  return p.tipo === 'escala' ? `${v} de 10` : (p.opciones[v]?.texto ?? '—');
};

// Botones para escoger una opción (o un punto de la escala 1–10). `alEscoger(valor)`.
function selector(p, alEscoger, { marcado } = {}) {
  const botones = [];
  const marcar = (valor) => botones.forEach(([v, b]) => b.setAttribute('aria-pressed', String(v === valor)));
  const crear = (valor, texto, clase, extra = {}) => {
    const b = el('button', { clase, type: 'button', 'aria-pressed': 'false', ...extra }, texto);
    b.addEventListener('click', () => { marcar(valor); alEscoger(valor); });
    botones.push([valor, b]);
    return b;
  };
  let nodo;
  if (p.tipo === 'escala') {
    nodo = el('div', { clase: 'escala-diario' },
      el('div', { clase: 'puntos-escala', role: 'group' },
        Array.from({ length: 10 }, (_, i) => crear(i + 1, String(i + 1), 'punto-escala', { 'aria-label': `${i + 1} de 10` }))),
      el('div', { clase: 'extremos-escala', 'aria-hidden': 'true' }, el('span', {}, `1 · ${p.extremos[0]}`), el('span', {}, `10 · ${p.extremos[1]}`)));
  } else {
    nodo = el('div', { clase: 'opciones-diario' }, p.opciones.map((o, i) => crear(i, o.texto, 'opcion-diario')));
  }
  if (marcado !== undefined) marcar(marcado);
  return nodo;
}

function chipTema(tema) {
  const chip = el('span', { clase: 'chip-tema' }, el('span', { 'aria-hidden': 'true' }, tema?.icono || '✦'), ` ${tema?.nombre || ''}`);
  if (tema?.color) chip.style.setProperty('--acento', tema.color);
  return chip;
}

export function crearPantallasDiario({ cargar, hoy = () => fechaBogota() } = {}) {
  async function preparar(zona, ctx) {
    const r = await exigirPareja(zona, ctx);
    if (!r) return null;
    let datos;
    try { datos = await cargar(); } catch (e) {
      console.warn('Okupa: no se pudo cargar el diario', e);
      zona.replaceChildren(vacio('No se pudieron cargar las preguntas', reintentar(ctx)));
      return null;
    }
    const otro = otroLugar(r.pareja.lugar);
    if (!r.pareja.nombres[otro]) {
      zona.replaceChildren(titulo(), vacio('Tu pareja todavía no se ha unido',
        el('a', { clase: 'boton boton-principal', href: '#/pareja' }, 'Ver el código')));
      return null;
    }
    return {
      ...r, datos, otro,
      nombre: (l) => r.pareja.nombres[l] || 'Tu pareja',
      porId: new Map(datos.preguntas.map((p) => [p.id, p])),
      temas: new Map(datos.temas.map((t) => [t.id, t])),
    };
  }

  const sinConexion = (zona, ctx, e) => {
    console.warn('Okupa: el diario perdió la conexión', e);
    zona.replaceChildren(titulo(), vacio('Se perdió la conexión', reintentar(ctx)));
  };

  // ---------- Perfil ----------
  async function perfil(contenedor, _params, ctx) {
    const zona = el('div', { clase: 'diario' });
    contenedor.append(el('a', { clase: 'volver', href: '#/diario' }, '← Diario'), zona);
    const r = await preparar(zona, ctx);
    if (!r) return;
    const { nube, pareja, datos } = r;
    let guardado;
    try { guardado = (await leerPerfiles(nube, pareja))[pareja.lugar]?.inicial; } catch (e) { sinConexion(zona, ctx, e); return; }
    const valores = normalizarPerfil(guardado || {});
    const temas = datos.temas.map((t) => ({ id: t.id, texto: t.nombre }));
    const error = el('p', { clase: 'error-formulario', role: 'alert' });

    const chips = (id, opciones, unica) => {
      const actual = () => (unica ? [valores[id]] : valores[id]);
      const botones = opciones.map((o) => {
        const b = el('button', { clase: 'chip', type: 'button', 'aria-pressed': String(actual().includes(o.id)) }, o.texto);
        b.addEventListener('click', () => {
          if (unica) valores[id] = valores[id] === o.id ? '' : o.id;
          else valores[id] = valores[id].includes(o.id) ? valores[id].filter((x) => x !== o.id) : [...valores[id], o.id];
          botones.forEach((x, i) => x.setAttribute('aria-pressed', String(actual().includes(opciones[i].id))));
        });
        return b;
      });
      return el('div', { clase: 'chips', role: 'group' }, botones);
    };
    const entrada = (id, valor, alCambiar) => {
      const i = el('input', { type: 'text', maxlength: String(MAX_TEXTO_PERFIL), 'data-campo': id });
      i.value = valor;
      i.addEventListener('input', () => alCambiar(i.value));
      return i;
    };

    const bloques = datos.perfilInicial.map((c) => {
      let control;
      if (c.tipo === 'varias') control = chips(c.id, c.opciones, false);
      else if (c.tipo === 'temas') control = chips(c.id, temas, false);
      else if (c.tipo === 'una') control = chips(c.id, c.opciones, true);
      else if (c.tipo === 'intensidad') {
        const opciones = c.opciones.map((o) => ({ ...o, id: Number(o.id) }));
        const botones = opciones.map((o) => {
          const b = el('button', { clase: 'chip', type: 'button', 'aria-pressed': String(valores.intensidad === o.id) }, o.texto);
          b.addEventListener('click', () => {
            valores.intensidad = o.id;
            botones.forEach((x, i) => x.setAttribute('aria-pressed', String(opciones[i].id === o.id)));
          });
          return b;
        });
        control = el('div', { clase: 'chips', role: 'group' }, botones);
      } else if (c.tipo === 'texto') control = entrada(c.id, valores[c.id], (v) => { valores[c.id] = v; });
      else if (c.tipo === 'textos') {
        control = el('div', { clase: 'textos-perfil' }, Array.from({ length: c.max || 3 }, (_, i) =>
          entrada(c.id, valores[c.id][i] || '', (v) => {
            const lista = [...valores[c.id]];
            lista[i] = v;
            valores[c.id] = lista;
          })));
      }
      return el('div', { clase: 'campo campo-perfil' }, el('p', { clase: 'etiqueta' }, c.texto), control);
    });

    const guardar = el('button', { clase: 'boton boton-principal', type: 'button' }, 'Guardar');
    guardar.addEventListener('click', async () => {
      const limpio = normalizarPerfil({ ...valores, artistas: (valores.artistas || []).filter((x) => x && x.trim()) });
      const problema = problemaDePerfil(limpio, datos.perfilInicial);
      if (problema) { error.textContent = 'Revisa el formulario: hay un dato que no cuadra.'; console.warn('Okupa: perfil inválido', problema); return; }
      guardar.disabled = true;
      error.textContent = '';
      try {
        await guardarPerfil(nube, pareja, limpio);
        ctx.ir('diario');
      } catch (e) {
        console.warn('Okupa: no se pudo guardar el perfil', e);
        error.textContent = 'No se pudo guardar. Revisa la conexión e intenta otra vez.';
        guardar.disabled = false;
      }
    });

    zona.replaceChildren(
      titulo('Cuéntanos de ti'),
      el('p', { clase: 'subtitulo' }, 'Son 3 minutos. Con esto escogemos preguntas que sí les digan algo. Lo puedes cambiar cuando quieras.'),
      ...bloques, error, el('div', { clase: 'enlace-acciones' }, guardar));
  }

  // ---------- Hoy y días anteriores ----------
  async function dia(contenedor, params, ctx) {
    const fecha = FECHA_VALIDA.test(params.fecha || '') ? params.fecha : hoy();
    const esHoy = fecha === hoy();
    if (params.fecha && fecha !== params.fecha) {
      contenedor.append(el('a', { clase: 'volver', href: '#/diario' }, '← Diario'), vacio('Ese día no tiene preguntas'));
      return;
    }
    const zona = el('div', { clase: 'diario' });
    contenedor.append(el('a', { clase: 'volver', href: esHoy ? '#/' : '#/diario' }, esHoy ? '← Inicio' : '← Diario'), zona);
    const r = await preparar(zona, ctx);
    if (!r) return;
    const { nube, pareja, datos, otro, nombre, porId, temas } = r;
    const yo = pareja.lugar;

    let d;
    try {
      const perfiles = await leerPerfiles(nube, pareja);
      if (!perfiles[yo]?.inicial) {
        zona.replaceChildren(titulo(), vacio('Antes de empezar, cuéntanos de ti',
          el('p', { clase: 'campo-ayuda' }, 'Son 3 minutos y se hace una sola vez.'),
          el('a', { clase: 'boton boton-principal', href: '#/diario/perfil' }, 'Llenar mi perfil')));
        return;
      }
      d = esHoy ? await abrirDia(nube, pareja, { fecha, datos }) : await leerDia(nube, pareja, fecha);
    } catch (e) { sinConexion(zona, ctx, e); return; }
    if (!d || !FECHA_VALIDA.test(fecha)) { zona.replaceChildren(titulo(), vacio('Ese día no tiene preguntas', el('a', { clase: 'boton', href: '#/diario' }, 'Ir a hoy'))); return; }

    const enlacePendientes = el('a', { clase: 'boton-texto', href: '#/diario/pendientes' }, 'Pendientes');
    const gustos = el('section', { clase: 'parte-diario', 'aria-label': 'Preguntas del día' });
    const ingles = el('section', { clase: 'parte-diario', 'aria-label': 'Reto de inglés' });
    zona.replaceChildren(
      titulo(), el('p', { clase: 'subtitulo' }, esHoy ? `Hoy, ${fechaLegible(fecha)}` : fechaLegible(fecha)),
      el('nav', { clase: 'nav-diario', 'aria-label': 'Diario' }, enlacePendientes,
        el('a', { clase: 'boton-texto', href: '#/diario/historial' }, 'Historial'),
        el('a', { clase: 'boton-texto', href: '#/diario/perfil' }, 'Mi perfil')),
      gustos, ingles);

    const vistos = {};
    let dias = null;
    const listar = async () => (dias = await listarDias(nube, pareja));
    listar().then((lista) => {
      const n = lista.filter((x) => x.fecha < hoy() && ['gustos', 'ingles'].some((p) => estadoParte(x, p, yo) === 'responder')).length;
      enlacePendientes.textContent = n ? `Pendientes (${n})` : 'Pendientes';
    }).catch(() => {});

    function render(nuevo) {
      if (!nuevo) return;
      d = nuevo;
      for (const [parte, seccion, pintar] of [['gustos', gustos, pintarGustos], ['ingles', ingles, pintarIngles]]) {
        const estado = estadoParte(d, parte, yo);
        if (vistos[parte] === estado) continue;
        vistos[parte] = estado;
        pintar(seccion, estado).catch((e) => {
          console.warn('Okupa:', e);
          seccion.replaceChildren(el('p', { clase: 'error-formulario' }, 'No se pudo cargar esta parte. Revisa la conexión.'));
          vistos[parte] = null;
        });
      }
      if (esHoy) ctx.almacen?.escribir(CLAVE_ESTADO, { fecha, texto: textoEstado(estadoParte(d, 'gustos', yo), nombre(otro)) });
    }
    const recargar = () => leerDia(nube, pareja, fecha).then(render).catch(() => {});

    async function pintarGustos(seccion, estado) {
      const preguntas = d.gustos.map((id) => porId.get(id)).filter(Boolean);
      if (estado === 'responder') { seccion.replaceChildren(formularioGustos(preguntas)); return; }
      if (estado === 'esperando') {
        seccion.replaceChildren(el('div', { clase: 'espera-diario', role: 'status' },
          el('p', { clase: 'espera-titulo' }, 'Respondiste ✓'), el('p', {}, `Esperando a ${nombre(otro)}…`)));
        return;
      }
      const ambas = await leerAmbas(nube, pareja, fecha, 'gustos', d);
      if (!ambas) { vistos.gustos = null; return; }
      seccion.replaceChildren(el('h2', { clase: 'titulo-parte' }, 'Lo que respondieron'),
        ...preguntas.map((p, i) => cartaRevelada(p, i, ambas)));
      vibrar(20);
    }

    function formularioGustos(preguntas) {
      const respuestas = preguntas.map(() => ({ comentario: '' }));
      const error = el('p', { clase: 'error-formulario', role: 'alert' });
      const boton = el('button', { clase: 'boton boton-principal boton-grande', type: 'button', disabled: true }, 'Enviar');
      const listo = () => respuestas.every((r, i) => valorDe(preguntas[i], r) !== undefined
        && (i !== d.adivinar || (r.adivina !== undefined && r.adivina !== null)));
      const actualizar = () => { boton.disabled = !listo(); };
      const cartas = preguntas.map((p, i) => {
        const r = respuestas[i];
        const clave = p.tipo === 'escala' ? 'valor' : 'opcion';
        const adivina = i === d.adivinar
          ? el('div', { clase: 'adivina', hidden: true },
            el('p', { clase: 'adivina-texto' }, `¿Qué crees que respondió ${nombre(otro)}?`),
            selector(p, (v) => { r.adivina = v; actualizar(); }))
          : null;
        const comentario = el('textarea', { clase: 'comentario-diario', maxlength: String(MAX_COMENTARIO), rows: '2', placeholder: 'Comentario (opcional)', 'aria-label': 'Comentario (opcional)' });
        comentario.addEventListener('input', () => { r.comentario = comentario.value; });
        const carta = el('article', { clase: 'carta-diario' },
          el('header', { clase: 'carta-diario-cabecera' }, chipTema(temas.get(p.tema)), el('span', { clase: 'numero-diario' }, `${i + 1} de ${preguntas.length}`)),
          el('p', { clase: 'texto-diario' }, p.texto),
          selector(p, (v) => { r[clave] = v; if (adivina) adivina.hidden = false; actualizar(); }),
          comentario, adivina);
        carta.style.setProperty('--acento', temas.get(p.tema)?.color || '');
        return carta;
      });
      boton.addEventListener('click', async () => {
        if (!listo()) return;
        boton.disabled = true;
        boton.textContent = 'Enviando…';
        error.textContent = '';
        const items = respuestas.map((r, i) => {
          const p = preguntas[i];
          const item = p.tipo === 'escala' ? { valor: r.valor } : { opcion: r.opcion };
          item.comentario = (r.comentario || '').trim().slice(0, MAX_COMENTARIO);
          if (i === d.adivinar) item.adivina = r.adivina;
          return item;
        });
        try {
          await enviar(nube, pareja, fecha, 'gustos', { items });
          vibrar(15);
          await recargar();
        } catch (e) {
          console.warn('Okupa: no se pudo enviar', e);
          error.textContent = 'No se pudo enviar. Revisa la conexión e intenta otra vez.';
          boton.textContent = 'Enviar';
          boton.disabled = false;
        }
      });
      return el('div', { clase: 'formulario-diario' }, cartas, error, el('div', { clase: 'enviar-diario' }, boton));
    }

    function cartaRevelada(p, i, ambas) {
      const lado = (l) => {
        const item = ambas[l].items[i] || {};
        return el('div', { clase: `respuesta-diario${l === yo ? ' mia' : ''}` },
          el('p', { clase: 'quien' }, nombre(l)),
          el('p', { clase: 'cual' }, textoRespuesta(p, item)),
          item.comentario ? el('p', { clase: 'comentario' }, `«${item.comentario}»`) : null);
      };
      const tipo = coincidencia(p, ambas.a.items[i] || {}, ambas.b.items[i] || {});
      const adivinanzas = i === d.adivinar ? ['a', 'b'].map((l) => {
        const item = ambas[l].items[i] || {};
        if (item.adivina === undefined) return null;
        const bien = adivino(p, item.adivina, ambas[otroLugar(l)].items[i]);
        return el('p', { clase: `adivinanza ${bien ? 'bien' : 'mal'}` },
          `${nombre(l)} creía «${textoRespuesta(p, { opcion: item.adivina, valor: item.adivina })}»: ${bien ? 'adivinó ✓' : 'no adivinó ✗'}`);
      }) : [];
      const carta = el('article', { clase: 'carta-diario revelada' },
        el('header', { clase: 'carta-diario-cabecera' }, chipTema(temas.get(p.tema))),
        el('p', { clase: 'texto-diario' }, p.texto),
        el('div', { clase: 'lado-a-lado' }, lado('a'), lado('b')),
        el('p', { clase: `coincidencia ${tipo}` }, ETIQUETA[tipo]),
        adivinanzas);
      carta.style.setProperty('--acento', temas.get(p.tema)?.color || '');
      return carta;
    }

    async function pintarIngles(seccion, estado) {
      const cabecera = el('h2', { clase: 'titulo-parte' }, 'Reto de inglés');
      if (estado === 'responder') { seccion.replaceChildren(cabecera, reto()); return; }
      if (estado === 'esperando') {
        const propia = await leerPropia(nube, pareja, fecha, 'ingles');
        seccion.replaceChildren(cabecera, el('p', { clase: 'espera-diario', role: 'status' },
          `Tu reto: ${propia?.aciertos ?? '?'}/3 · Esperando a ${nombre(otro)}…`));
        return;
      }
      const ambas = await leerAmbas(nube, pareja, fecha, 'ingles', d);
      if (!ambas) { vistos.ingles = null; return; }
      const lista = dias || (await listar());
      const racha = rachaAmbos(lista.map((x) => (x.fecha === fecha ? d : x)), 'ingles', hoy());
      seccion.replaceChildren(cabecera,
        el('p', { clase: 'marcador-reto' }, `Inglés: ${nombre('a')} ${ambas.a.aciertos}/3 · ${nombre('b')} ${ambas.b.aciertos}/3`),
        el('p', { clase: 'racha' }, `Racha: ${racha} ${racha === 1 ? 'día' : 'días'} los dos`));
    }

    function reto() {
      const clave = `okupa:diario:reto:${pareja.codigo}:${fecha}`;
      const elegidas = [...(ctx.almacen?.leer(clave, []) || [])];
      const error = el('p', { clase: 'error-formulario', role: 'alert' });
      const pie = el('div', { clase: 'enviar-diario' });
      const mandar = async () => {
        pie.replaceChildren();
        error.textContent = '';
        try {
          await enviar(nube, pareja, fecha, 'ingles', { items: elegidas, aciertos: d.ingles.filter((p, i) => elegidas[i] === p.respuesta).length });
          ctx.almacen?.borrar(clave);
          await recargar();
        } catch (e) {
          console.warn('Okupa: no se pudo enviar el reto', e);
          error.textContent = 'No se pudo enviar. Revisa la conexión e intenta otra vez.';
          pie.replaceChildren(el('button', { clase: 'boton boton-principal', type: 'button', onclick: mandar }, 'Reintentar envío'));
        }
      };
      const preguntas = d.ingles.map((p, i) => {
        const dato = el('p', { clase: 'dato-juego', hidden: true }, p.dato);
        const botones = p.opciones.map((o, j) => el('button', { clase: 'opcion-juego opcion-reto', type: 'button', 'aria-pressed': 'false' }, o));
        const mostrar = () => {
          const elegida = elegidas[i];
          botones.forEach((b, j) => {
            b.disabled = true;
            b.setAttribute('aria-pressed', String(j === elegida));
            if (j === p.respuesta) { b.classList.add('correcta'); b.textContent = `✓ ${p.opciones[j]}`; }
            else if (j === elegida) { b.classList.add('incorrecta'); b.textContent = `✗ ${p.opciones[j]}`; }
          });
          dato.hidden = false;
        };
        botones.forEach((b, j) => b.addEventListener('click', () => {
          if (elegidas[i] !== undefined && elegidas[i] !== null) return;
          elegidas[i] = j;
          ctx.almacen?.escribir(clave, elegidas);
          mostrar();
          vibrar(j === p.respuesta ? 20 : [10, 40, 10]);
          if (d.ingles.every((_, k) => Number.isInteger(elegidas[k]))) mandar();
        }));
        if (Number.isInteger(elegidas[i])) mostrar();
        return el('div', { clase: 'reto-pregunta' },
          el('p', { clase: 'numero-juego' }, `${i + 1} de ${d.ingles.length}`),
          el('p', { clase: 'texto-reto' }, p.texto),
          el('div', { clase: 'opciones-4' }, botones), dato);
      });
      if (d.ingles.every((_, k) => Number.isInteger(elegidas[k]))) queueMicrotask(mandar);
      return el('div', { clase: 'reto' }, preguntas, error, pie);
    }

    render(d);
    const dejarDeEscuchar = escucharDia(nube, pareja, fecha, render);
    alSalirDeRuta(dejarDeEscuchar);
  }

  // ---------- Pendientes ----------
  async function pendientes(contenedor, _params, ctx) {
    const zona = el('div', { clase: 'diario' });
    contenedor.append(el('a', { clase: 'volver', href: '#/diario' }, '← Diario'), zona);
    const r = await preparar(zona, ctx);
    if (!r) return;
    const yo = r.pareja.lugar;
    let lista;
    try { lista = await listarDias(r.nube, r.pareja); } catch (e) { sinConexion(zona, ctx, e); return; }
    const faltan = lista.filter((x) => x.fecha < hoy())
      .map((x) => ({ fecha: x.fecha, partes: ['gustos', 'ingles'].filter((p) => estadoParte(x, p, yo) === 'responder') }))
      .filter((x) => x.partes.length);
    zona.replaceChildren(titulo('Pendientes'),
      faltan.length
        ? el('ul', { clase: 'lista' }, faltan.map((x) => el('li', {},
          el('a', { clase: 'fila', href: `#/diario/dia/${x.fecha}` },
            el('span', { clase: 'fila-cuerpo' },
              el('span', { clase: 'fila-titulo' }, fechaLegible(x.fecha)),
              el('span', { clase: 'fila-detalle' }, `Te falta ${x.partes.map((p) => NOMBRE_PARTE[p]).join(' y ')}`)),
            el('span', { clase: 'fila-marca' }, 'Responder →')))))
        : vacio('Estás al día ✓', el('a', { clase: 'boton', href: '#/diario' }, 'Ir a hoy')));
  }

  // ---------- Historial ----------
  async function historial(contenedor, _params, ctx) {
    const zona = el('div', { clase: 'diario' });
    contenedor.append(el('a', { clase: 'volver', href: '#/diario' }, '← Diario'), zona);
    const r = await preparar(zona, ctx);
    if (!r) return;
    const { nube, pareja, porId, nombre, otro } = r;
    const yo = pareja.lugar;
    let lista;
    let adivinanzas = [];
    try {
      lista = await listarDias(nube, pareja);
      const revelados = lista.filter((x) => estadoParte(x, 'gustos', yo) === 'revelado');
      adivinanzas = (await Promise.all(revelados.map(async (x) => {
        const ambas = await leerAmbas(nube, pareja, x.fecha, 'gustos', x);
        const pregunta = porId.get(x.gustos?.[x.adivinar]);
        return ambas && pregunta ? { pregunta, a: ambas.a.items[x.adivinar], b: ambas.b.items[x.adivinar] } : null;
      }))).filter(Boolean);
    } catch (e) { sinConexion(zona, ctx, e); return; }
    const porcentaje = porcentajeAdivinanzas(adivinanzas);
    const racha = rachaAmbos(lista, 'gustos', hoy());
    const estadoTexto = (x) => ({ revelado: 'Revelado', esperando: `Esperando a ${nombre(otro)}`, responder: 'Te toca' })[estadoParte(x, 'gustos', yo)];
    zona.replaceChildren(titulo('Historial'),
      el('div', { clase: 'resumen-diario' },
        el('p', {}, porcentaje === null ? 'Todavía no hay adivinanzas reveladas' : `Qué tanto se conocen: ${porcentaje} % de adivinanzas`),
        el('p', {}, `Racha: ${racha} ${racha === 1 ? 'día' : 'días'} con los dos al día`)),
      lista.length
        ? el('ul', { clase: 'lista' }, [...lista].reverse().map((x) => el('li', {},
          el('a', { clase: 'fila', href: `#/diario/dia/${x.fecha}` },
            el('span', { clase: 'fila-cuerpo' }, el('span', { clase: 'fila-titulo' }, fechaLegible(x.fecha))),
            el('span', { clase: 'fila-marca' }, estadoTexto(x))))))
        : vacio('Todavía no hay días', el('a', { clase: 'boton', href: '#/diario' }, 'Ir a hoy')));
  }

  return { hoy: dia, dia, perfil, pendientes, historial };
}
