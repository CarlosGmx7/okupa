// Pantalla del mapa: la última ubicación de cada uno sobre el mapa Liberty de OpenFreeMap, unidos por la ruta.
import { el } from '../../nucleo/ui.js';
import { exigirPareja } from '../../nucleo/pantallas-pareja.js';
import { guardarUbicacion, leerUbicaciones, formatearDistancia, haceCuanto, avatarDe } from './ubicacion.js';
import { calcularRuta } from './ruta.js';
import { cargarMapLibre, crearMapa, marcador as ponerMarcador, dibujarLinea, encuadrar } from './motor.js';
import { montarLugares } from './lugares-ui.js';

export { cargarMapLibre };

const CLAVE_APROXIMADA = 'okupa:mapa:aproximada';
const CLAVE_CAPAS = 'okupa:mapa:capas';
const ROJO_RUTA = '#e0292f';
const COLOR_LUGAR = { a: '#c9a45c', b: '#a8344f' };

function miUbicacion() {
  return new Promise((listo, fallo) => {
    if (!navigator.geolocation) { fallo(new Error('sin-geolocalizacion')); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => listo({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => fallo(e),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
    );
  });
}

function elementoPareja({ nombre, lugar, ubicacion }) {
  const avatar = avatarDe(nombre);
  const figura = avatar
    ? el('img', { clase: 'avatar-pixel', src: avatar, alt: '' })
    : el('span', { clase: 'avatar-pixel avatar-generico', 'aria-hidden': 'true' }, (nombre || '?')[0].toUpperCase());
  if (!avatar) figura.style.setProperty('--color', COLOR_LUGAR[lugar]);
  const contenido = el('div', { clase: 'marcador-pareja' },
    el('span', { clase: 'marcador-nombre' }, nombre || 'Tu pareja'),
    figura,
    el('span', { clase: 'marcador-hora' }, `${haceCuanto(ubicacion.horaMs)}${ubicacion.aproximada ? ' · aprox.' : ''}`));
  contenido.style.setProperty('--color', COLOR_LUGAR[lugar]);
  contenido.title = nombre || 'Tu pareja';
  return contenido;
}

export function crearPantallasMapa() {
  // Un solo mapa vivo a la vez: cada mapa usa WebGL y memoria. Se borra al salir de la pantalla o
  // al repintarla (Actualizar, Reintentar), y un mapa que termina de cargar tarde se descarta.
  let mapaVivo = null;
  let generacion = 0;
  const limpiar = () => {
    document.querySelectorAll('.hoja-fondo').forEach((h) => h.remove());
    mapaVivo?.remove();
    mapaVivo = null;
  };
  window.addEventListener('hashchange', () => { generacion++; limpiar(); });

  async function mapa(contenedor, _params, ctx) {
    const mia = ++generacion;
    limpiar();
    const vigente = () => mia === generacion;
    const zona = el('div', { clase: 'mapa-pantalla' });
    contenedor.append(el('a', { clase: 'volver', href: '#/' }, '← Inicio'), zona);
    cargarMapLibre().catch(() => {});
    const r = await exigirPareja(zona, ctx);
    if (!r) return;
    const { nube, pareja } = r;
    const yo = pareja.lugar;
    const otro = yo === 'a' ? 'b' : 'a';
    const nombre = (l) => pareja.nombres[l] || 'Tu pareja';

    const estado = el('p', { clase: 'estado-mapa', role: 'status' }, 'Buscando tu ubicación…');
    const lienzo = el('div', { clase: 'mapa-lienzo', role: 'img', 'aria-label': 'Mapa con la ubicación de los dos' });
    const distancia = el('p', { clase: 'distancia-mapa' });
    const detalle = el('p', { clase: 'campo-ayuda' });
    const aproximada = el('input', { type: 'checkbox', id: 'mapa-aproximada', checked: Boolean(ctx.almacen.leer(CLAVE_APROXIMADA, false)) });
    aproximada.addEventListener('change', () => { ctx.almacen.escribir(CLAVE_APROXIMADA, aproximada.checked); ctx.refrescar(); });

    // Capas: "Nosotros" (ubicaciones y ruta) y "Lugares" (deseos y recuerdos), recordadas en el celular.
    const capas = { nosotros: true, lugares: true, ...ctx.almacen.leer(CLAVE_CAPAS, {}) };
    let aplicarCapa = () => {};
    const chip = (id, texto) => {
      const b = el('button', { clase: 'chip-capa', type: 'button', 'aria-pressed': String(capas[id]),
        onclick: () => {
          capas[id] = !capas[id];
          b.setAttribute('aria-pressed', String(capas[id]));
          ctx.almacen.escribir(CLAVE_CAPAS, capas);
          aplicarCapa(id);
        } }, texto);
      return b;
    };
    const nuevoLugar = el('button', { clase: 'boton boton-principal boton-lugar', type: 'button', disabled: true }, '＋ Lugar');
    zona.replaceChildren(
      el('h1', { clase: 'titulo-pantalla' }, 'Mapa'),
      el('div', { clase: 'barra-mapa' },
        el('div', { clase: 'chips-capas', role: 'group', 'aria-label': 'Qué mostrar' }, chip('nosotros', '∞ Nosotros'), chip('lugares', '★ Lugares')),
        nuevoLugar),
      estado, lienzo,
      el('p', { clase: 'campo-ayuda' }, 'Deja el dedo presionado sobre el mapa para agregar un deseo o un recuerdo ahí.'),
      el('section', { clase: 'panel-mapa' }, distancia, detalle,
        el('label', { clase: 'interruptor-mapa', for: 'mapa-aproximada' }, aproximada, ' Compartir mi ubicación aproximada (el barrio, unos 500 m)'),
        el('p', { clase: 'campo-ayuda' }, 'Tu ubicación se guarda cada vez que abres el mapa. Solo ustedes dos la ven.'),
        el('button', { clase: 'boton', type: 'button', onclick: () => ctx.refrescar() }, 'Actualizar')));

    // 1) La mía (si da permiso), 2) las dos guardadas, 3) el mapa y la ruta.
    try {
      const punto = await miUbicacion();
      await guardarUbicacion(nube, pareja, punto, { aproximada: aproximada.checked });
      estado.textContent = '';
    } catch (e) {
      estado.textContent = e?.code === 1
        ? 'No diste permiso de ubicación: se muestra la última que quedó guardada.'
        : 'No se pudo leer tu ubicación ahora: se muestra la última que quedó guardada.';
    }
    let ubicaciones;
    let gl;
    let mapaL;
    try {
      ubicaciones = await leerUbicaciones(nube, pareja);
      ({ gl, mapa: mapaL } = await crearMapa(lienzo));
    } catch (e) {
      console.warn('Okupa: el mapa no cargó', e);
      if (!vigente()) return;
      lienzo.replaceChildren(el('p', { clase: 'vacio' }, 'No se pudo cargar el mapa. Revisa la conexión.'),
        el('button', { clase: 'boton', type: 'button', onclick: () => ctx.refrescar() }, 'Reintentar'));
      return;
    }
    if (!vigente()) { mapaL.remove(); return; }
    mapaVivo = mapaL;

    const lugares = montarLugares({ gl, mapa: mapaL, nube, pareja });
    nuevoLugar.disabled = false;
    nuevoLugar.addEventListener('click', () => lugares.nuevo());
    const marcadoresPareja = [];
    aplicarCapa = (id) => {
      if (id === 'lugares') lugares.mostrar(capas.lugares);
      if (id === 'nosotros') {
        marcadoresPareja.forEach((m) => { m.getElement().hidden = !capas.nosotros; });
        if (mapaL.getLayer('ruta')) mapaL.setLayoutProperty('ruta', 'visibility', capas.nosotros ? 'visible' : 'none');
      }
    };
    lugares.mostrar(capas.lugares);

    const puntos = [];
    for (const l of [yo, otro]) {
      const u = ubicaciones[l];
      if (!u) continue;
      marcadoresPareja.push(ponerMarcador(gl, mapaL, elementoPareja({ nombre: nombre(l), lugar: l, ubicacion: u }), u));
      puntos.push([u.lat, u.lng]);
    }
    aplicarCapa('nosotros');
    if (!ubicaciones[otro]) detalle.textContent = `${nombre(otro)} todavía no ha abierto el mapa.`;
    encuadrar(mapaL, puntos);
    if (puntos.length < 2) { distancia.textContent = ''; return; }

    distancia.textContent = 'Calculando la ruta…';
    const ruta = await calcularRuta(ubicaciones[yo], ubicaciones[otro]);
    if (!vigente()) return;
    dibujarLinea(mapaL, 'ruta', ruta.linea, { color: ROJO_RUTA, punteada: !ruta.porVias });
    aplicarCapa('nosotros');
    encuadrar(mapaL, [...ruta.linea, ...puntos]);
    distancia.textContent = `${formatearDistancia(ruta.km)} · ≈ ${ruta.minutos} min en moto`;
    detalle.textContent = ruta.porVias
      ? 'Por las vías. El tiempo en moto es un estimado a partir de la ruta en carro.'
      : 'En línea recta (no se pudo calcular la ruta por las vías).';
  }

  return { mapa };
}
