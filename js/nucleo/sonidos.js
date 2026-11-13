// Sonidos suaves de los momentos importantes y vibración corta al tocar. Ambos se apagan en Ajustes.
// Los sonidos se sintetizan (Web Audio): no hay archivos que descargar y funcionan sin internet.
import { leerAjustes } from './ajustes.js';
import { almacen as almacenReal } from './almacen.js';

// Lo que recibe el resorte (css/componentes.css) y vibra al tocar.
export const SELECTOR_TOCABLE = '.boton, .acceso, .juntos-principal, .juntos-acceso, .opcion-juego, .opcion-diario, .punto-escala, .chip, .burbuja, .voto, .engranaje, .fila-ajuste, .tema-opcion, button';

// [frecuencia (Hz), inicio (s), duración (s)]
const NOTAS = {
  match: [[523.25, 0, 0.18], [783.99, 0.13, 0.26]],
  acierto: [[880, 0, 0.15]],
  guardado: [[1200, 0, 0.06]],
};
const VOLUMEN = 0.12;

export const puedeVibrar = () => typeof globalThis.navigator?.vibrate === 'function';

const contextoPorDefecto = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)();
const vibradorPorDefecto = () => (puedeVibrar() ? (p) => navigator.vibrate(p) : null);

export function crearSonidos({ almacen, crearContexto = contextoPorDefecto, vibrador = vibradorPorDefecto() } = {}) {
  let contexto = null;
  const obtenerContexto = () => {
    if (contexto) return contexto;
    try { contexto = crearContexto(); } catch { contexto = null; }
    return contexto;
  };

  function sonar(nombre) {
    const notas = NOTAS[nombre];
    if (!notas || !leerAjustes(almacen).sonidos) return;
    try {
      const c = obtenerContexto();
      if (!c) return;
      c.resume?.()?.catch?.(() => {});
      const t0 = c.currentTime;
      for (const [frecuencia, inicio, duracion] of notas) {
        const tono = c.createOscillator();
        const volumen = c.createGain();
        tono.type = 'sine';
        tono.frequency.value = frecuencia;
        volumen.gain.setValueAtTime(0.0001, t0 + inicio);
        volumen.gain.exponentialRampToValueAtTime(VOLUMEN, t0 + inicio + 0.015);
        volumen.gain.exponentialRampToValueAtTime(0.0001, t0 + inicio + duracion);
        tono.connect(volumen).connect(c.destination);
        tono.start(t0 + inicio);
        tono.stop(t0 + inicio + duracion + 0.02);
      }
    } catch { /* sin sonido */ }
  }

  function vibrar(patron) {
    if (!vibrador || !leerAjustes(almacen).vibracion) return;
    try { vibrador(patron); } catch { /* sin vibración */ }
  }

  function instalarToque(raiz = document) {
    // iOS solo aplica :active (el hundido del resorte) si hay un touchstart registrado.
    raiz.addEventListener('touchstart', () => {}, { passive: true });
    raiz.addEventListener('pointerdown', (e) => {
      const objetivo = e.target?.closest?.(SELECTOR_TOCABLE);
      if (!objetivo || objetivo.disabled) return;
      vibrar(8);
      // El navegador solo deja sonar después de un toque: se despierta el audio aquí.
      if (contexto?.state === 'suspended') contexto.resume().catch(() => {});
    }, { passive: true });
  }

  return { sonar, vibrar, instalarToque };
}

export const sonidos = crearSonidos({ almacen: almacenReal });
export const sonar = (nombre) => sonidos.sonar(nombre);
export const vibrar = (patron) => sonidos.vibrar(patron);
