// Ajustes de cada celular (tema, sonidos, vibración). No se comparten con la pareja.

const CLAVE = 'okupa:ajustes';
const EVENTO = 'okupa:ajustes';

export const TEMAS = ['vino', 'grafito'];
export const LETRAS = ['normal', 'grande', 'muy-grande'];
export const AJUSTES_DEFECTO = Object.freeze({ tema: 'vino', sonidos: true, vibracion: true, letra: 'normal' });

const VALIDOS = {
  tema: (v) => TEMAS.includes(v),
  letra: (v) => LETRAS.includes(v),
  sonidos: (v) => typeof v === 'boolean',
  vibracion: (v) => typeof v === 'boolean',
};

// Siempre devuelve ajustes completos: lo que falte o esté dañado vuelve al defecto.
export function leerAjustes(almacen) {
  const guardado = almacen?.leer(CLAVE, null);
  const fuente = guardado && typeof guardado === 'object' && !Array.isArray(guardado) ? guardado : {};
  const ajustes = { ...AJUSTES_DEFECTO };
  for (const [clave, valido] of Object.entries(VALIDOS)) {
    if (valido(fuente[clave])) ajustes[clave] = fuente[clave];
  }
  return ajustes;
}

export function cambiarAjuste(almacen, clave, valor) {
  const actuales = leerAjustes(almacen);
  if (!VALIDOS[clave]?.(valor)) return actuales;
  const nuevos = { ...actuales, [clave]: valor };
  almacen.escribir(CLAVE, nuevos);
  globalThis.dispatchEvent?.(new CustomEvent(EVENTO, { detail: nuevos }));
  return nuevos;
}

export function alCambiarAjustes(fn) {
  const oyente = (e) => fn(e.detail);
  globalThis.addEventListener?.(EVENTO, oyente);
  return () => globalThis.removeEventListener?.(EVENTO, oyente);
}
