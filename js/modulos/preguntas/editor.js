// "Mis preguntas": la pareja crea, oculta y organiza su propio contenido.
import { el } from '../../nucleo/ui.js';
import { exportarRespaldo, importarRespaldo, validarRespaldo } from '../../nucleo/almacen.js';
import { fechaLocalISO } from './datos.js';
import { VALIDADORES_RESPALDO } from './propio.js';

const FORMATOS = [['abierta', 'Pregunta abierta'], ['corta', 'Respuesta rápida'], ['dilema', '¿Qué harías si…?'], ['postura', 'Tu postura']];
const SUBTIPOS = [['si_no', 'Sí o no'], ['escala', 'Escala del 1 al 10'], ['esto_o_aquello', 'Esto o aquello']];
const ETIQUETAS_OPCIONES = {
  si_no: ['Primera opción', 'Segunda opción'],
  escala: ['Qué significa el 1', 'Qué significa el 10'],
  esto_o_aquello: ['Opción A', 'Opción B'],
};
const ICONOS = ['♡', '✈', '☀', '♫', '✿', '☕', '★', '⚑'];
const COLORES = ['#c9a45c', '#d4566f', '#b07ad1', '#8f9fd6', '#7fb7a8', '#e39a6b'];

const volver = (ruta, texto) => el('a', { clase: 'volver', href: `#/${ruta}` }, `← ${texto}`);

function campo(etiqueta, control, ayuda) {
  const id = `c-${Math.random().toString(36).slice(2, 8)}`;
  control.id = id;
  return el('div', { clase: 'campo' }, el('label', { for: id }, etiqueta), control, ayuda ? el('span', { clase: 'campo-ayuda' }, ayuda) : null);
}

function selector(opciones, valor) {
  return el('select', {}, opciones.map(([v, t]) => el('option', { value: v, selected: v === valor }, t)));
}

function segmentado(opciones, valor, alCambiar) {
  const grupo = el('div', { clase: 'segmentado', role: 'group' });
  const pintar = (actual) => grupo.replaceChildren(...opciones.map(([v, t]) =>
    el('button', { type: 'button', 'aria-pressed': String(v === actual), onclick: () => { alCambiar(v); pintar(v); } }, t)));
  pintar(valor);
  return grupo;
}

export function crearEditor(estado, { alCambiar = () => {}, alImportar = () => {} } = {}) {
  const propio = () => estado.propio;
  const textoDe = (id) => {
    const q = [...estado.incluido.preguntas, ...propio().obtener().preguntas].find((x) => x.id === id);
    return q ? q.texto : id;
  };

  function mis(contenedor, _params, ctx) {
    const datos = propio().obtener();
    const nombreCategoria = (id) => estado.contenido.categorias.find((c) => c.id === id)?.nombre || '';
    contenedor.append(
      volver('', 'Inicio'),
      el('h1', { clase: 'titulo-pantalla' }, 'Mis preguntas'),
      el('p', { clase: 'subtitulo' }, 'Lo que ustedes crean vive solo en este celular. Hagan una copia de vez en cuando.'),
      el('div', {}, ctx.almacen.disponible() ? null
        : el('p', { clase: 'aviso' }, 'Este navegador no deja guardar: lo que creen se perderá al cerrar la app.')),
      seccion('Nuestras preguntas', 'preguntas/mis/pregunta/nueva', 'Nueva pregunta',
        datos.preguntas.map((p) => el('li', {}, el('a', { clase: 'fila', href: `#/preguntas/mis/pregunta/${encodeURIComponent(p.id)}` },
          el('div', { clase: 'fila-cuerpo' }, el('div', { clase: 'fila-texto' }, p.texto), el('div', { clase: 'fila-detalle' }, nombreCategoria(p.categoria))),
          el('span', { clase: 'fila-marca' }, 'Editar')))),
        'Todavía no han creado preguntas.'),
      seccion('Nuestras categorías', 'preguntas/mis/categoria/nueva', 'Nueva categoría',
        datos.categorias.map((c) => el('li', {}, el('div', { clase: 'fila' },
          el('span', { 'aria-hidden': 'true' }, c.icono),
          el('div', { clase: 'fila-cuerpo' }, el('div', { clase: 'fila-titulo' }, c.nombre)),
          el('button', {
            clase: 'boton-texto', type: 'button',
            onclick: () => {
              if (!confirm(`¿Borrar la categoría "${c.nombre}"?`)) return;
              const r = propio().borrarCategoria(c.id);
              if (!r.ok) { alert(r.error); return; }
              alCambiar();
              ctx.refrescar();
            },
          }, 'Borrar')))),
        'Pueden crear temas propios, como "Viajes" o "Nuestra canción".'),
      seccion('Nuestras sesiones', 'preguntas/mis/sesion/nueva', 'Nueva sesión',
        datos.sesiones.map((s) => el('li', {}, el('a', { clase: 'fila', href: `#/preguntas/mis/sesion/${encodeURIComponent(s.id)}` },
          el('div', { clase: 'fila-cuerpo' }, el('div', { clase: 'fila-titulo' }, s.nombre),
            el('div', { clase: 'fila-detalle' }, `${s.bloques[0].preguntas.length} preguntas`)),
          el('span', { clase: 'fila-marca' }, 'Editar')))),
        'Armen un recorrido con las preguntas que quieran, en su orden.'),
      el('ul', { clase: 'lista', style: 'margin-top:28px' },
        el('li', {}, el('a', { clase: 'fila', href: '#/preguntas/mis/ocultas' },
          el('div', { clase: 'fila-cuerpo' }, el('div', { clase: 'fila-titulo' }, 'Preguntas ocultas'),
            el('div', { clase: 'fila-detalle' }, `${datos.ocultas.length} ocultas`)), el('span', { clase: 'fila-marca' }, '→'))),
        el('li', {}, el('a', { clase: 'fila', href: '#/preguntas/mis/respaldo' },
          el('div', { clase: 'fila-cuerpo' }, el('div', { clase: 'fila-titulo' }, 'Copia de seguridad'),
            el('div', { clase: 'fila-detalle' }, 'Descargar o cargar todo lo suyo')), el('span', { clase: 'fila-marca' }, '→')))),
    );
  }

  function seccion(titulo, rutaNuevo, textoNuevo, filas, textoVacio) {
    return el('section', { style: 'margin-top:28px' },
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px' },
        el('h2', { style: 'font-size:22px' }, titulo),
        el('a', { clase: 'boton', href: `#/${rutaNuevo}` }, `+ ${textoNuevo}`)),
      filas.length ? el('ul', { clase: 'lista' }, filas) : el('p', { clase: 'campo-ayuda' }, textoVacio));
  }

  function formularioPregunta(contenedor, ctx, existente) {
    const datos = existente || { categoria: estado.contenido.categorias[0]?.id, formato: 'abierta', subtipo: 'si_no', opciones: ['Sí', 'No'], profundidad: 2, texto: '' };
    let profundidad = datos.profundidad;
    const categoria = selector(estado.contenido.categorias.map((c) => [c.id, c.nombre]), datos.categoria);
    const formato = selector(FORMATOS, datos.formato);
    const subtipo = selector(SUBTIPOS, datos.subtipo || 'si_no');
    const opcionA = el('input', { type: 'text', maxlength: '80', value: datos.opciones?.[0] || '' });
    const opcionB = el('input', { type: 'text', maxlength: '80', value: datos.opciones?.[1] || '' });
    const texto = el('textarea', { maxlength: '500', placeholder: '¿Qué le quieren preguntar al otro?' });
    texto.value = datos.texto;
    const error = el('p', { clase: 'error-formulario', role: 'alert' });
    const campoA = campo('', opcionA);
    const campoB = campo('', opcionB);
    const zonaCorta = el('div', {}, campo('Tipo de respuesta', subtipo), campoA, campoB);

    const actualizarCorta = () => {
      zonaCorta.hidden = formato.value !== 'corta';
      const [ea, eb] = ETIQUETAS_OPCIONES[subtipo.value];
      campoA.querySelector('label').textContent = ea;
      campoB.querySelector('label').textContent = eb;
    };
    formato.addEventListener('change', actualizarCorta);
    subtipo.addEventListener('change', () => {
      if (subtipo.value === 'si_no' && !opcionA.value && !opcionB.value) { opcionA.value = 'Sí'; opcionB.value = 'No'; }
      actualizarCorta();
    });
    actualizarCorta();

    const guardar = () => {
      const r = propio().guardarPregunta({
        id: existente?.id,
        categoria: categoria.value,
        formato: formato.value,
        subtipo: subtipo.value,
        opciones: [opcionA.value, opcionB.value],
        profundidad,
        texto: texto.value,
      });
      if (!r.ok) { error.textContent = r.error; return; }
      alCambiar();
      ctx.ir('preguntas/mis');
    };

    contenedor.append(
      volver('preguntas/mis', 'Mis preguntas'),
      el('h1', { clase: 'titulo-pantalla' }, existente ? 'Editar pregunta' : 'Nueva pregunta'),
      campo('La pregunta', texto),
      campo('Categoría', categoria),
      campo('Formato', formato),
      zonaCorta,
      el('div', { clase: 'campo' }, el('span', { clase: 'etiqueta' }, 'Intensidad'),
        segmentado([[1, 'Suave'], [2, 'Profunda'], [3, 'Intensa']], profundidad, (v) => { profundidad = v; })),
      error,
      el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' },
        el('button', { clase: 'boton boton-principal', type: 'button', onclick: guardar }, 'Guardar'),
        existente ? el('button', {
          clase: 'boton boton-peligro', type: 'button',
          onclick: () => {
            if (!confirm('¿Borrar esta pregunta?')) return;
            const r = propio().borrarPregunta(existente.id);
            if (!r.ok) { error.textContent = r.error; return; }
            alCambiar();
            ctx.ir('preguntas/mis');
          },
        }, 'Borrar') : null,
        el('a', { clase: 'boton', href: '#/preguntas/mis' }, 'Cancelar')),
    );
  }

  function preguntaNueva(contenedor, _params, ctx) {
    formularioPregunta(contenedor, ctx, null);
  }

  function preguntaEditar(contenedor, { id }, ctx) {
    const p = propio().obtener().preguntas.find((x) => x.id === id);
    if (!p) { ctx.ir('preguntas/mis'); return; }
    formularioPregunta(contenedor, ctx, p);
  }

  function categoriaNueva(contenedor, _params, ctx) {
    let icono = ICONOS[0];
    let color = COLORES[0];
    const nombre = el('input', { type: 'text', maxlength: '60', placeholder: 'Ej: Viajes, Nuestra música…' });
    const error = el('p', { clase: 'error-formulario', role: 'alert' });
    contenedor.append(
      volver('preguntas/mis', 'Mis preguntas'),
      el('h1', { clase: 'titulo-pantalla' }, 'Nueva categoría'),
      campo('Nombre', nombre),
      el('div', { clase: 'campo' }, el('span', { clase: 'etiqueta' }, 'Ícono'),
        segmentado(ICONOS.map((i) => [i, i]), icono, (v) => { icono = v; })),
      el('div', { clase: 'campo' }, el('span', { clase: 'etiqueta' }, 'Color'),
        segmentado(COLORES.map((c) => [c, '●']), color, (v) => { color = v; })),
      error,
      el('div', { style: 'display:flex;gap:10px' },
        el('button', {
          clase: 'boton boton-principal', type: 'button',
          onclick: () => {
            const r = propio().guardarCategoria({ nombre: nombre.value, icono, color });
            if (!r.ok) { error.textContent = r.error; return; }
            alCambiar();
            ctx.ir('preguntas/mis');
          },
        }, 'Guardar'),
        el('a', { clase: 'boton', href: '#/preguntas/mis' }, 'Cancelar')),
    );
    // Colorea los puntos del selector de color.
    contenedor.querySelectorAll('.segmentado')[1]?.querySelectorAll('button').forEach((b, i) => { b.style.color = COLORES[i]; });
  }

  function formularioSesion(contenedor, ctx, existente) {
    const escogidas = [...(existente?.bloques[0].preguntas || [])];
    const nombre = el('input', { type: 'text', maxlength: '60', value: existente?.nombre || '', placeholder: 'Ej: Domingo de café' });
    const filtro = selector([['', 'Todas las categorías'], ...estado.contenido.categorias.map((c) => [c.id, c.nombre])], '');
    const contador = el('p', { clase: 'campo-ayuda' });
    const lista = el('ul', { clase: 'lista' });
    const error = el('p', { clase: 'error-formulario', role: 'alert' });

    const pintarLista = () => {
      contador.textContent = `${escogidas.length} escogidas (se recorren en el orden en que las marquen)`;
      const visibles = estado.contenido.preguntas.filter((q) => !filtro.value || q.categoria === filtro.value);
      lista.replaceChildren(...visibles.map((q) => {
        const caja = el('input', { type: 'checkbox', checked: escogidas.includes(q.id) });
        caja.addEventListener('change', () => {
          const i = escogidas.indexOf(q.id);
          if (caja.checked && i < 0) escogidas.push(q.id);
          if (!caja.checked && i >= 0) escogidas.splice(i, 1);
          contador.textContent = `${escogidas.length} escogidas (se recorren en el orden en que las marquen)`;
        });
        return el('li', {}, el('label', { clase: 'fila seleccionable' }, caja, el('span', { clase: 'fila-texto' }, q.texto)));
      }));
    };
    filtro.addEventListener('change', pintarLista);
    pintarLista();

    contenedor.append(
      volver('preguntas/mis', 'Mis preguntas'),
      el('h1', { clase: 'titulo-pantalla' }, existente ? 'Editar sesión' : 'Nueva sesión'),
      campo('Nombre de la sesión', nombre),
      campo('Mostrar', filtro),
      contador,
      error,
      el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px' },
        el('button', {
          clase: 'boton boton-principal', type: 'button',
          onclick: () => {
            const r = propio().guardarSesion({ id: existente?.id, nombre: nombre.value, preguntas: escogidas });
            if (!r.ok) { error.textContent = r.error; window.scrollTo(0, 0); return; }
            alCambiar();
            ctx.ir('preguntas/mis');
          },
        }, 'Guardar'),
        existente ? el('button', {
          clase: 'boton boton-peligro', type: 'button',
          onclick: () => {
            if (!confirm('¿Borrar esta sesión?')) return;
            const r = propio().borrarSesion(existente.id);
            if (!r.ok) { error.textContent = r.error; window.scrollTo(0, 0); return; }
            alCambiar();
            ctx.ir('preguntas/mis');
          },
        }, 'Borrar') : null,
        el('a', { clase: 'boton', href: '#/preguntas/mis' }, 'Cancelar')),
      lista,
    );
  }

  function sesionNueva(contenedor, _params, ctx) {
    formularioSesion(contenedor, ctx, null);
  }

  function sesionEditar(contenedor, { id }, ctx) {
    const s = propio().obtener().sesiones.find((x) => x.id === id);
    if (!s) { ctx.ir('preguntas/mis'); return; }
    formularioSesion(contenedor, ctx, s);
  }

  function ocultas(contenedor, _params, ctx) {
    const ids = propio().obtener().ocultas;
    contenedor.append(
      volver('preguntas/mis', 'Mis preguntas'),
      el('h1', { clase: 'titulo-pantalla' }, 'Preguntas ocultas'),
      ids.length
        ? el('ul', { clase: 'lista' }, ids.map((id) => el('li', {}, el('div', { clase: 'fila' },
          el('div', { clase: 'fila-cuerpo' }, el('div', { clase: 'fila-texto' }, textoDe(id))),
          el('button', {
            clase: 'boton', type: 'button',
            onclick: () => {
              const r = propio().restaurar(id);
              if (!r.ok) { alert(r.error); return; }
              alCambiar();
              ctx.refrescar();
            },
          }, 'Restaurar')))))
        : el('p', { clase: 'subtitulo' }, 'No han ocultado ninguna pregunta.'),
    );
  }

  function respaldo(contenedor, _params, ctx) {
    const mensaje = el('p', { role: 'status' });
    const opciones = el('div', { hidden: true, style: 'margin-top:12px' });
    const archivo = el('input', { type: 'file', accept: '.json,application/json' });
    archivo.addEventListener('change', async () => {
      const f = archivo.files?.[0];
      if (!f) return;
      let copia;
      try { copia = JSON.parse(await f.text()); }
      catch { mensaje.textContent = 'Ese archivo no se pudo leer. ¿Es una copia de Okupa?'; return; }
      const problema = validarRespaldo(copia, VALIDADORES_RESPALDO);
      if (problema) { opciones.hidden = true; mensaje.textContent = problema; return; }
      mensaje.textContent = '';
      opciones.hidden = false;
      const aplicar = (modo) => {
        const r = importarRespaldo(ctx.almacen, copia, modo, VALIDADORES_RESPALDO);
        opciones.hidden = true;
        if (!r.ok) { mensaje.textContent = r.error; return; }
        alImportar();
        mensaje.textContent = modo === 'reemplazar' ? 'Listo: se cargó la copia.' : 'Listo: se combinó la copia con lo que tenían.';
      };
      opciones.replaceChildren(
        el('p', {}, '¿Qué hacemos con lo que ya tienen en este celular?'),
        el('button', { clase: 'boton boton-principal', type: 'button', onclick: () => aplicar('reemplazar') }, 'Reemplazar todo'),
        ' ',
        el('button', { clase: 'boton', type: 'button', onclick: () => aplicar('combinar') }, 'Combinar'));
    });

    contenedor.append(
      volver('preguntas/mis', 'Mis preguntas'),
      el('h1', { clase: 'titulo-pantalla' }, 'Copia de seguridad'),
      el('section', { clase: 'bloque-texto' },
        el('h2', {}, 'Descargar'),
        el('p', {}, 'Guarda en un archivo sus preguntas, categorías, sesiones, ocultas y el progreso. Sirve para no perder nada o para pasarlo a otro celular.'),
        el('button', {
          clase: 'boton boton-principal', type: 'button',
          onclick: () => {
            const blob = new Blob([JSON.stringify(exportarRespaldo(ctx.almacen), null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = el('a', { href: url, download: `okupa-respaldo-${fechaLocalISO()}.json` });
            document.body.append(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          },
        }, 'Descargar copia')),
      el('section', { clase: 'bloque-texto' },
        el('h2', {}, 'Cargar'),
        el('p', {}, 'Escojan un archivo de copia de Okupa.'),
        campo('Archivo de copia', archivo),
        opciones,
        mensaje),
    );
  }

  return { mis, preguntaNueva, preguntaEditar, categoriaNueva, sesionNueva, sesionEditar, ocultas, respaldo };
}
