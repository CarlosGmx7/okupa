// Interfaz de los lugares del mapa: formulario para agregar, ficha de cada lugar y los pines.
import { el } from '../../nucleo/ui.js';
import { icono } from '../../nucleo/iconos.js';
import {
  crearLugar, listarLugares, leerLugar, marcarFuimos, borrarLugar, guardarVersion, leerVersiones,
  comprimirFoto, agregarFoto, listarFotos, borrarFoto, buscarLugares, MAX_FOTOS,
} from './lugares.js';
import { marcador } from './motor.js';

const ICONO = { deseo: '★', recuerdo: '♥' };
const NOMBRE_TIPO = { deseo: 'Deseo', recuerdo: 'Recuerdo' };

function hoy() {
  const d = new Date();
  const dos = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

function fechaLegible(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Hoja inferior genérica; devuelve { hoja, cuerpo, cerrar }.
function abrirHoja(titulo) {
  const cuerpo = el('div', { clase: 'hoja-cuerpo' });
  const cerrar = () => { fondo.remove(); document.removeEventListener('keydown', teclas); };
  const teclas = (e) => { if (e.key === 'Escape') cerrar(); };
  const fondo = el('div', { clase: 'hoja-fondo', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo,
    onclick: (e) => { if (e.target === fondo) cerrar(); } },
  el('div', { clase: 'hoja hoja-lugar' },
    el('div', { clase: 'hoja-cabeza' },
      el('h2', {}, titulo),
      el('button', { clase: 'boton-texto', type: 'button', 'aria-label': 'Cerrar', onclick: () => cerrar() }, '✕')),
    cuerpo));
  document.addEventListener('keydown', teclas);
  document.body.append(fondo);
  return { hoja: fondo, cuerpo, cerrar };
}

function selectorTipo(inicial, alCambiar) {
  const grupo = el('div', { clase: 'segmentado', role: 'group', 'aria-label': 'Tipo de lugar' });
  const pintar = (actual) => grupo.replaceChildren(...['deseo', 'recuerdo'].map((t) =>
    el('button', { type: 'button', 'aria-pressed': String(t === actual), onclick: () => { alCambiar(t); pintar(t); } },
      icono(ICONO[t]), ` ${NOMBRE_TIPO[t]}`)));
  pintar(inicial);
  return grupo;
}

export async function abrirFormularioLugar({ nube, pareja, punto = null, buscar = buscarLugares, alGuardar = () => {} }) {
  const { hoja, cuerpo, cerrar } = abrirHoja('Nuevo lugar');
  let elegido = punto;
  let tipo = 'deseo';
  const nombre = el('input', { type: 'text', name: 'nombre', maxlength: '80', placeholder: 'Ej: Cartagena, el mirador de…' });
  const nota = el('textarea', { name: 'nota', maxlength: '300', placeholder: 'Una nota (opcional)' });
  const fecha = el('input', { type: 'date', name: 'fecha', value: hoy() });
  const zonaFecha = el('label', { clase: 'campo', hidden: true }, el('span', { clase: 'etiqueta' }, '¿Cuándo fueron?'), fecha);
  const error = el('p', { clase: 'error-formulario', role: 'alert' });
  const ubicacion = el('p', { clase: 'campo-ayuda' });
  const pintarUbicacion = () => {
    ubicacion.textContent = elegido
      ? `📍 Punto escogido (${elegido.lat.toFixed(4)}, ${elegido.lng.toFixed(4)})`
      : 'Busca el lugar por su nombre, o cierra esto y deja el dedo presionado sobre el mapa.';
  };
  pintarUbicacion();

  const busqueda = el('input', { type: 'search', placeholder: 'Buscar un lugar…', 'aria-label': 'Buscar un lugar' });
  const resultados = el('ul', { clase: 'lista resultados-busqueda' });
  const hacerBusqueda = async () => {
    resultados.replaceChildren(el('li', { clase: 'campo-ayuda' }, 'Buscando…'));
    try {
      const lista = await buscar(busqueda.value);
      resultados.replaceChildren(...(lista.length ? lista.map((r) => el('li', {},
        el('button', {
          clase: 'fila resultado', type: 'button',
          onclick: () => {
            elegido = { lat: r.lat, lng: r.lng };
            nombre.value = r.nombre;
            resultados.replaceChildren();
            pintarUbicacion();
          },
        }, el('span', { clase: 'fila-cuerpo' }, el('span', { clase: 'fila-titulo' }, r.nombre), el('span', { clase: 'fila-detalle' }, r.detalle)))))
        : [el('li', { clase: 'campo-ayuda' }, 'No encontramos ese lugar. Prueba con otro nombre o tócalo en el mapa.')]));
    } catch {
      resultados.replaceChildren(el('li', { clase: 'campo-ayuda' }, 'La búsqueda no respondió. Puedes tocar el lugar en el mapa.'));
    }
  };
  busqueda.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); hacerBusqueda(); } });

  const guardar = async () => {
    error.textContent = '';
    if (!elegido) { error.textContent = 'Escoge el lugar: búscalo o tócalo en el mapa.'; return; }
    const r = await crearLugar(nube, pareja, {
      nombre: nombre.value, lat: elegido.lat, lng: elegido.lng, tipo, nota: nota.value,
      fecha: tipo === 'recuerdo' ? fecha.value : undefined,
    }).catch(() => ({ ok: false, error: 'No se pudo guardar. Revisa la conexión.' }));
    if (!r.ok) { error.textContent = r.error; return; }
    cerrar();
    alGuardar(r.id);
  };

  cuerpo.append(
    punto ? null : el('div', { clase: 'buscador' }, busqueda, el('button', { clase: 'boton', type: 'button', onclick: hacerBusqueda }, 'Buscar')),
    resultados,
    ubicacion,
    el('label', { clase: 'campo' }, el('span', { clase: 'etiqueta' }, 'Nombre'), nombre),
    el('div', { clase: 'campo' }, selectorTipo(tipo, (t) => { tipo = t; zonaFecha.hidden = t !== 'recuerdo'; })),
    zonaFecha,
    el('label', { clase: 'campo' }, el('span', { clase: 'etiqueta' }, 'Nota'), nota),
    error,
    el('div', { clase: 'hoja-acciones' }, el('button', { clase: 'boton boton-principal', type: 'button', onclick: guardar }, 'Guardar')));
  return hoja;
}

function verFoto(foto) {
  const { cuerpo } = abrirHoja('Foto');
  cuerpo.append(el('img', { clase: 'foto-completa', src: foto.datos, alt: '' }));
}

function cargarImagen(archivo) {
  return new Promise((listo, fallo) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); listo(img); };
    img.onerror = () => { URL.revokeObjectURL(url); fallo(new Error('imagen-ilegible')); };
    img.src = url;
  });
}

// Fotos ya vistas en esta sesión de la app: la ficha las muestra al instante la próxima vez y las
// refresca por detrás (cada foto pesa hasta ~380 KB).
const fotosVistas = new Map();

// La ficha se abre al instante con lo que ya se sabe del lugar; versiones y fotos se cargan en
// paralelo y cada sección se pinta sola cuando llega lo suyo.
export async function abrirFichaLugar({ nube, pareja, lugar, alCambiar = () => {} }) {
  const { hoja, cuerpo, cerrar } = abrirHoja(lugar.nombre);
  const otro = pareja.lugar === 'a' ? 'b' : 'a';
  const nombreOtro = pareja.nombres?.[otro] || 'Tu pareja';
  const mensaje = el('p', { clase: 'campo-ayuda', role: 'status' });
  const cabeza = el('div');
  const zonaVersiones = el('section', { clase: 'ficha-seccion' });
  const zonaFotos = el('section', { clase: 'ficha-seccion' });
  const cargando = () => el('p', { clase: 'campo-ayuda' }, 'Cargando…');

  function pintarCabeza() {
    cabeza.replaceChildren(
      el('p', { clase: 'ficha-tipo' }, icono(ICONO[lugar.tipo]), ` ${NOMBRE_TIPO[lugar.tipo]}${lugar.fecha ? ` · ${fechaLegible(lugar.fecha)}` : ''}`),
      lugar.nota ? el('p', { clase: 'ficha-nota' }, lugar.nota) : el('span'),
      lugar.tipo === 'deseo' ? el('div', { clase: 'hoja-acciones' }, el('button', {
        clase: 'boton boton-principal', type: 'button',
        onclick: async (e) => {
          e.currentTarget.disabled = true;
          const fecha = hoy();
          try {
            await marcarFuimos(nube, pareja, lugar.id, fecha);
          } catch {
            mensaje.textContent = 'No se pudo guardar. Revisa la conexión.';
            e.currentTarget.disabled = false;
            return;
          }
          Object.assign(lugar, { tipo: 'recuerdo', fecha });
          alCambiar();
          armar();
        },
      }, '¡Fuimos!')) : el('span'));
  }

  async function cargarVersiones() {
    zonaVersiones.replaceChildren(el('h3', {}, 'Cómo lo vivió cada uno'), cargando());
    const v = await leerVersiones(nube, pareja, lugar.id).catch(() => null);
    const titulo = el('h3', {}, 'Cómo lo vivió cada uno');
    if (!v) { zonaVersiones.replaceChildren(titulo, el('p', { clase: 'campo-ayuda' }, 'No se pudieron cargar. Revisa la conexión.')); return; }
    if (v.mia) {
      zonaVersiones.replaceChildren(titulo,
        el('div', { clase: 'version mia' }, el('span', { clase: 'version-quien' }, 'Tú'), el('p', {}, v.mia)),
        el('div', { clase: 'version' }, el('span', { clase: 'version-quien' }, nombreOtro),
          el('p', {}, v.otraEscrita ? v.otra : `${nombreOtro} todavía no escribe su versión.`)));
      return;
    }
    const texto = el('textarea', { maxlength: '1000', placeholder: '¿Qué recuerdas de ese día?' });
    const error = el('p', { clase: 'error-formulario', role: 'alert' });
    zonaVersiones.replaceChildren(titulo,
      el('p', { clase: 'campo-ayuda' }, 'Escribe tu versión; la de tu pareja se ve cuando escribas la tuya.'),
      texto, error,
      el('button', {
        clase: 'boton', type: 'button',
        onclick: async (e) => {
          e.currentTarget.disabled = true;
          const r = await guardarVersion(nube, pareja, lugar.id, texto.value).catch(() => ({ ok: false, error: 'No se pudo guardar. Revisa la conexión.' }));
          if (!r.ok) { error.textContent = r.error; e.currentTarget.disabled = false; return; }
          await cargarVersiones();
        },
      }, 'Guardar mi versión'),
      lugar.versiones?.[otro] ? el('p', { clase: 'campo-ayuda' }, `${nombreOtro} ya escribió la suya.`) : el('span'));
  }

  function pintarFotos(fotos) {
    // Se pueden escoger varias a la vez; se suben una por una (cada una se comprime en el celular)
    // y, si no caben todas, se suben las primeras y se avisa.
    const archivo = el('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
    const agregar = el('button', { clase: 'boton', type: 'button', onclick: () => archivo.click() }, '＋ Agregar fotos');
    archivo.addEventListener('change', async () => {
      const elegidas = [...(archivo.files || [])];
      if (!elegidas.length) return;
      const caben = Math.max(0, MAX_FOTOS - fotos.length);
      const aSubir = elegidas.slice(0, caben);
      agregar.disabled = true;
      let fallidas = 0;
      for (const [i, f] of aSubir.entries()) {
        mensaje.textContent = aSubir.length > 1 ? `Subiendo ${i + 1} de ${aSubir.length}…` : 'Subiendo la foto…';
        try {
          const r = await agregarFoto(nube, pareja, lugar.id, comprimirFoto(await cargarImagen(f)));
          if (!r.ok) fallidas++;
        } catch {
          fallidas++;
        }
      }
      const avisos = [];
      if (elegidas.length > caben) avisos.push(`Solo ${caben === 1 ? 'cabía 1' : `cabían ${caben}`} (máximo ${MAX_FOTOS} fotos por lugar).`);
      if (fallidas) avisos.push(fallidas === 1 ? '1 foto no se pudo subir.' : `${fallidas} fotos no se pudieron subir.`);
      mensaje.textContent = avisos.join(' ');
      await cargarFotos();
    });
    zonaFotos.replaceChildren(
      el('h3', {}, 'Fotos'),
      el('div', { clase: 'galeria' }, fotos.map((f) => el('div', { clase: 'miniatura' },
        el('button', { clase: 'miniatura-ver', type: 'button', 'aria-label': 'Ver foto', onclick: () => verFoto(f) }, el('img', { src: f.datos, alt: '', loading: 'lazy', decoding: 'async' })),
        el('button', {
          clase: 'miniatura-borrar', type: 'button', 'aria-label': 'Borrar foto',
          onclick: async () => {
            if (!confirm('¿Borrar esta foto?')) return;
            try { await borrarFoto(nube, pareja, lugar.id, f.id); } catch { mensaje.textContent = 'No se pudo borrar. Revisa la conexión.'; return; }
            pintarFotos(fotos.filter((x) => x.id !== f.id));
            fotosVistas.set(lugar.id, fotos.filter((x) => x.id !== f.id));
          },
        }, '✕')))),
      archivo,
      fotos.length < MAX_FOTOS
        ? el('div', {}, agregar, el('p', { clase: 'campo-ayuda' }, `Puedes escoger varias a la vez (te quedan ${MAX_FOTOS - fotos.length}).`))
        : el('p', { clase: 'campo-ayuda' }, `Máximo ${MAX_FOTOS} fotos por lugar.`));
  }

  async function cargarFotos() {
    const vistas = fotosVistas.get(lugar.id);
    if (vistas) pintarFotos(vistas);
    else zonaFotos.replaceChildren(el('h3', {}, 'Fotos'), cargando());
    try {
      const fotos = await listarFotos(nube, pareja, lugar.id);
      fotosVistas.set(lugar.id, fotos);
      pintarFotos(fotos);
    } catch {
      if (!vistas) zonaFotos.replaceChildren(el('h3', {}, 'Fotos'), el('p', { clase: 'campo-ayuda' }, 'No se pudieron cargar las fotos.'));
    }
  }

  function armar() {
    pintarCabeza();
    const esRecuerdo = lugar.tipo === 'recuerdo';
    cuerpo.replaceChildren(
      cabeza,
      esRecuerdo ? zonaVersiones : el('span'),
      esRecuerdo ? zonaFotos : el('span'),
      mensaje,
      el('div', { clase: 'hoja-acciones' }, el('button', {
        clase: 'boton-texto boton-peligro', type: 'button',
        onclick: async () => {
          if (!confirm(`¿Borrar "${lugar.nombre}" con sus fotos y versiones?`)) return;
          try { await borrarLugar(nube, pareja, lugar.id); } catch { mensaje.textContent = 'No se pudo borrar. Revisa la conexión.'; return; }
          fotosVistas.delete(lugar.id);
          cerrar();
          alCambiar();
        },
      }, 'Borrar lugar')));
    if (esRecuerdo) { cargarVersiones(); cargarFotos(); }
  }

  armar();
  // Por detrás: el otro pudo cambiar el lugar (marcarlo como recuerdo o escribir su versión).
  leerLugar(nube, pareja, lugar.id).then((fresco) => {
    if (!fresco || !hoja.isConnected) return;
    const cambioTipo = fresco.tipo !== lugar.tipo;
    const cambioVersion = Boolean(fresco.versiones?.[otro]) !== Boolean(lugar.versiones?.[otro]);
    Object.assign(lugar, fresco);
    if (cambioTipo) armar();
    else if (cambioVersion && lugar.tipo === 'recuerdo') cargarVersiones();
  }).catch(() => {});
  return hoja;
}

// Pines de los lugares sobre el mapa. Devuelve { recargar, mostrar(visible) }.
export function montarLugares({ gl, mapa, nube, pareja }) {
  let pines = [];
  let visibles = true;
  async function recargar() {
    let lista = [];
    try { lista = await listarLugares(nube, pareja); } catch { return; }
    pines.forEach((p) => p.remove());
    pines = lista.map((l) => {
      const pin = el('button', { clase: `pin-lugar ${l.tipo}`, type: 'button', 'aria-label': `${NOMBRE_TIPO[l.tipo]}: ${l.nombre}`,
        onclick: (e) => { e.stopPropagation(); abrirFichaLugar({ nube, pareja, lugar: l, alCambiar: recargar }); } },
      el('span', { clase: 'pin-icono', 'aria-hidden': 'true' }, icono(ICONO[l.tipo])),
      el('span', { clase: 'pin-nombre' }, l.nombre));
      pin.hidden = !visibles;
      return marcador(gl, mapa, pin, l);
    });
  }

  // Dejar el dedo presionado (o clic derecho) sobre el mapa agrega un lugar ahí. Tolera el
  // temblor normal del dedo, no se dispara sobre un pin y no abre dos formularios a la vez
  // (en Android el toque largo también produce "contextmenu").
  let temporizador = null;
  let inicio = null;
  let ultimo = 0;
  const sobreMarcador = (e) => Boolean(e.originalEvent?.target?.closest?.('.pin-lugar, .marcador-pareja'));
  const agregarEn = (lngLat) => {
    if (Date.now() - ultimo < 1200 || document.querySelector('.hoja-fondo')) return;
    ultimo = Date.now();
    abrirFormularioLugar({ nube, pareja, punto: { lat: lngLat.lat, lng: lngLat.lng }, alGuardar: recargar });
  };
  const cancelar = () => { clearTimeout(temporizador); inicio = null; };
  mapa.on('touchstart', (e) => {
    cancelar();
    if (e.originalEvent.touches.length !== 1 || sobreMarcador(e)) return;
    inicio = e.point;
    temporizador = setTimeout(() => agregarEn(e.lngLat), 650);
  });
  mapa.on('touchmove', (e) => {
    if (inicio && Math.hypot(e.point.x - inicio.x, e.point.y - inicio.y) > 10) cancelar();
  });
  for (const ev of ['touchend', 'touchcancel', 'zoomstart']) mapa.on(ev, cancelar);
  mapa.on('contextmenu', (e) => { if (!sobreMarcador(e)) agregarEn(e.lngLat); });

  recargar();
  return {
    recargar,
    mostrar(v) { visibles = v; pines.forEach((p) => { p.getElement().hidden = !v; }); },
    nuevo: () => abrirFormularioLugar({ nube, pareja, alGuardar: recargar }),
  };
}
