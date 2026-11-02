// Componentes de interfaz compartidos por todos los módulos.

export function el(etiqueta, atributos = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  for (const [nombre, valor] of Object.entries(atributos || {})) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (nombre === 'clase') nodo.className = valor;
    else if (nombre.startsWith('on') && typeof valor === 'function') nodo.addEventListener(nombre.slice(2), valor);
    else if (valor === true) nodo.setAttribute(nombre, '');
    else nodo.setAttribute(nombre, valor);
  }
  agregarHijos(nodo, hijos);
  return nodo;
}

export function movimientoReducido() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

// Cambia de pantalla con View Transitions si el navegador lo permite.
export async function transicion(fn) {
  if (!document.startViewTransition || movimientoReducido() || document.hidden) {
    await fn();
    return;
  }
  // Si el navegador no llega a ejecutar la transición (pestaña en segundo plano),
  // se pinta igual a los 400 ms; `una` garantiza que fn corra una sola vez.
  let promesa = null;
  const una = () => (promesa ??= Promise.resolve().then(fn));
  const t = document.startViewTransition(una);
  t.ready.catch(() => {});
  t.finished.catch(() => {});
  await Promise.race([t.updateCallbackDone.catch(() => {}), new Promise((r) => setTimeout(r, 400))]);
  if (!promesa) t.skipTransition?.();
  await una();
}

const NOMBRE_FORMATO = {
  abierta: 'Pregunta abierta',
  corta: 'Respuesta rápida',
  dilema: '¿Qué harías si…?',
  postura: 'Tu postura',
};

function opcionesDeCarta(pregunta) {
  if (pregunta.formato !== 'corta' || !Array.isArray(pregunta.opciones)) return null;
  const [a, b] = pregunta.opciones;
  if (pregunta.subtipo === 'escala') {
    return el('div', { clase: 'carta-opciones escala' },
      el('span', { clase: 'opcion' }, `1 · ${a}`),
      el('span', { clase: 'escala-linea', 'aria-hidden': 'true' }),
      el('span', { clase: 'opcion' }, `10 · ${b}`));
  }
  return el('div', { clase: 'carta-opciones' },
    el('span', { clase: 'opcion' }, a),
    el('span', { clase: 'opcion-separador', 'aria-hidden': 'true' }, 'o'),
    el('span', { clase: 'opcion' }, b));
}

export function crearCarta(pregunta, { categoria, fuente } = {}) {
  const p = Math.max(1, Math.min(3, pregunta.profundidad || 1));
  const carta = el('article', { clase: 'carta', 'data-id': pregunta.id },
    el('header', { clase: 'carta-cabecera' },
      el('span', { clase: 'carta-categoria' },
        categoria?.icono ? el('span', { clase: 'carta-icono', 'aria-hidden': 'true' }, categoria.icono) : null,
        categoria?.nombre || ''),
      el('span', { clase: 'carta-profundidad', role: 'img', 'aria-label': `Profundidad ${p} de 3` },
        '●'.repeat(p) + '○'.repeat(3 - p))),
    el('p', { clase: 'carta-formato' }, NOMBRE_FORMATO[pregunta.formato] || ''),
    el('p', { clase: `carta-texto${pregunta.texto.length > 150 ? ' larga' : ''}` }, pregunta.texto),
    opcionesDeCarta(pregunta),
    pregunta.formato === 'corta'
      ? el('button', { clase: 'boton-321', type: 'button', onclick: (e) => cuenta321(e.currentTarget) }, '3, 2, 1… ¡respondan!')
      : null,
    el('footer', { clase: 'carta-fuente' }, fuente?.nombre || ''));
  if (categoria?.color) carta.style.setProperty('--acento', categoria.color);
  return carta;
}

// Dos cartas fantasma detrás dan la sensación de un mazo.
export function mazo(carta) {
  return el('div', { clase: 'mazo' },
    el('div', { clase: 'carta-fantasma f1', 'aria-hidden': 'true' }),
    el('div', { clase: 'carta-fantasma f2', 'aria-hidden': 'true' }),
    carta);
}

export function cuenta321(boton) {
  if (boton.dataset.contando) return;
  boton.dataset.contando = '1';
  const original = boton.textContent;
  const pasos = ['3', '2', '1', '¡Ya!'];
  boton.classList.add('contando');
  pasos.forEach((paso, i) => setTimeout(() => { boton.textContent = paso; }, i * 800));
  setTimeout(() => {
    boton.textContent = original;
    boton.classList.remove('contando');
    delete boton.dataset.contando;
  }, pasos.length * 800 + 400);
}

export function habilitarDeslizar(elemento, { izquierda, derecha } = {}) {
  const UMBRAL = 80;
  let inicioX = null;
  let dx = 0;
  const soltar = () => {
    if (inicioX === null) return;
    inicioX = null;
    elemento.classList.remove('arrastrando');
    const accion = dx < -UMBRAL ? izquierda : dx > UMBRAL ? derecha : null;
    if (accion) {
      elemento.style.transform = `translateX(${Math.sign(dx) * 120}vw) rotate(${Math.sign(dx) * 18}deg)`;
      elemento.style.opacity = '0';
      setTimeout(accion, movimientoReducido() ? 0 : 220);
    } else {
      elemento.style.transform = '';
    }
    dx = 0;
  };
  elemento.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, a, input, select, textarea')) return;
    inicioX = e.clientX;
    dx = 0;
    elemento.setPointerCapture?.(e.pointerId);
    elemento.classList.add('arrastrando');
  });
  elemento.addEventListener('pointermove', (e) => {
    if (inicioX === null) return;
    dx = e.clientX - inicioX;
    const giro = Math.max(-12, Math.min(12, dx / 18));
    elemento.style.transform = `translateX(${dx}px) rotate(${giro}deg)`;
  });
  elemento.addEventListener('pointerup', soltar);
  elemento.addEventListener('pointercancel', soltar);
}

// Prepara el aviso de fin dentro del toque que arranca el reloj (iOS solo deja sonar así).
function prepararAviso() {
  let audio = null;
  try { audio = new (globalThis.AudioContext || globalThis.webkitAudioContext)(); } catch { /* sin sonido */ }
  const avisar = () => {
    try { navigator.vibrate?.([200, 100, 200]); } catch { /* sin vibración */ }
    if (!audio) return;
    try {
      const tono = audio.createOscillator();
      const volumen = audio.createGain();
      tono.frequency.value = 660;
      volumen.gain.setValueAtTime(0.2, audio.currentTime);
      volumen.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.7);
      tono.connect(volumen).connect(audio.destination);
      tono.onended = () => audio.close().catch(() => {});
      tono.start();
      tono.stop(audio.currentTime + 0.7);
    } catch { /* sin sonido */ }
  };
  avisar.cerrar = () => audio?.close().catch(() => {});
  return avisar;
}

// Cuenta regresiva que mantiene la pantalla encendida y avisa al terminar.
// Se detiene sola si su pantalla desaparece (la pareja se fue a otra parte).
export function temporizador(contenedor, segundos, alTerminar, {
  avisar = prepararAviso(),
  pedirPantalla = () => navigator.wakeLock?.request('screen'),
} = {}) {
  const fin = Date.now() + segundos * 1000;
  const reloj = el('div', { clase: 'temporizador', role: 'timer', 'aria-live': 'off' });
  contenedor.append(reloj);
  let activo = true;
  let estuvoEnPantalla = false;
  let candado = null;

  const mantenerPantalla = async () => {
    try {
      const c = await pedirPantalla();
      if (!c) return;
      if (activo) candado = c;
      else await c.release();
    } catch { /* el navegador no lo permite */ }
  };
  // El navegador suelta el candado al minimizar la app; se pide de nuevo al volver.
  const alVolver = () => { if (document.visibilityState === 'visible' && activo) mantenerPantalla(); };

  const soltar = () => {
    if (!activo) return false;
    activo = false;
    clearInterval(id);
    document.removeEventListener('visibilitychange', alVolver);
    candado?.release().catch(() => {});
    candado = null;
    return true;
  };

  const pintarReloj = () => {
    if (reloj.isConnected) estuvoEnPantalla = true;
    else if (estuvoEnPantalla) { detener(); return; }
    const resta = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
    reloj.textContent = `${Math.floor(resta / 60)}:${String(resta % 60).padStart(2, '0')}`;
    if (resta === 0 && soltar()) {
      avisar();
      alTerminar?.();
    }
  };
  const detener = () => { if (soltar()) avisar.cerrar?.(); };

  const id = setInterval(pintarReloj, 250);
  document.addEventListener('visibilitychange', alVolver);
  mantenerPantalla();
  pintarReloj();
  return { detener };
}

function agregarHijos(nodo, hijos) {
  for (const hijo of hijos) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    if (Array.isArray(hijo)) agregarHijos(nodo, hijo);
    else if (hijo instanceof Node) nodo.append(hijo);
    else nodo.append(document.createTextNode(String(hijo)));
  }
}
