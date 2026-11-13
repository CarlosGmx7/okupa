import { prueba, igual, verdadero } from './corredor.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { cambiarAjuste } from '../js/nucleo/ajustes.js';
import { crearSonidos } from '../js/nucleo/sonidos.js';

function audioFalso() {
  const c = {
    osciladores: 0, currentTime: 0, destination: {}, state: 'running',
    resume: () => Promise.resolve(),
    createGain: () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }, connect: (x) => x }),
    createOscillator: () => {
      c.osciladores++;
      return { type: '', frequency: { value: 0, setValueAtTime() {} }, connect: (x) => x, start() {}, stop() {} };
    },
  };
  return c;
}

function preparar({ sinAudio = false, sinVibrador = false } = {}) {
  const almacen = almacenEnMemoria();
  const audio = audioFalso();
  const patrones = [];
  const s = crearSonidos({
    almacen,
    crearContexto: () => { if (sinAudio) throw new Error('sin audio'); return audio; },
    vibrador: sinVibrador ? null : (p) => patrones.push(p),
  });
  return { almacen, audio, patrones, s };
}

prueba('sonidos: suena con el ajuste activo', () => {
  const { audio, s } = preparar();
  s.sonar('match');
  verdadero(audio.osciladores >= 1, `osciladores: ${audio.osciladores}`);
});

prueba('sonidos: calla con el ajuste apagado', () => {
  const { almacen, audio, s } = preparar();
  cambiarAjuste(almacen, 'sonidos', false);
  s.sonar('match');
  s.sonar('acierto');
  igual(audio.osciladores, 0);
});

prueba('sonidos: sin AudioContext no falla', () => {
  const { s } = preparar({ sinAudio: true });
  s.sonar('match');
  s.sonar('guardado');
});

prueba('sonidos: nombre desconocido no hace nada', () => {
  const { audio, s } = preparar();
  s.sonar('trueno');
  igual(audio.osciladores, 0);
});

prueba('sonidos: vibrar respeta el ajuste', () => {
  const a = preparar();
  a.s.vibrar(8);
  igual(a.patrones, [8]);
  cambiarAjuste(a.almacen, 'vibracion', false);
  a.s.vibrar(8);
  igual(a.patrones, [8]);
  preparar({ sinVibrador: true }).s.vibrar(8);
});

prueba('sonidos: tocar un botón vibra, tocar un texto no', () => {
  const { patrones, s } = preparar();
  const raiz = document.createElement('div');
  const boton = document.createElement('button');
  const texto = document.createElement('p');
  raiz.append(boton, texto);
  s.instalarToque(raiz);
  texto.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  igual(patrones, []);
  boton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  igual(patrones, [8]);
});

prueba('estilos: la carta del Match no recibe el resorte y el resorte usa scale', async () => {
  const texto = await (await fetch('css/componentes.css', { cache: 'no-store' })).text();
  verdadero(/\.carta\.arrastrando \{[^}]*transition: none/.test(texto), 'la carta arrastrada sigue sin transición');
  verdadero(!/:active \{ transform: scale\(/.test(texto), 'quedan :active con transform: scale sueltos');
  verdadero(/:active[^{]*\{[^}]*scale: var\(--presion-escala\)/.test(texto), 'falta la regla única del resorte');
});
