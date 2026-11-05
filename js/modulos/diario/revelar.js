// Reglas del revelado del diario, sin nube ni pantalla: qué se puede ver, coincidencias, adivinanzas y rachas.
import { sumarDias } from './contenido.js';

export const PARTES = ['gustos', 'ingles'];
export const otroLugar = (l) => (l === 'a' ? 'b' : 'a');
const DEBATE_ESCALA = 4;

export const valorDe = (pregunta, item) => (pregunta.tipo === 'escala' ? item?.valor : item?.opcion);

export function coincidencia(pregunta, ra, rb) {
  if (pregunta.tipo === 'escala') {
    const d = Math.abs(ra.valor - rb.valor);
    return d === 0 ? 'coinciden' : d >= DEBATE_ESCALA ? 'debate' : 'parecido';
  }
  return ra.opcion === rb.opcion ? 'coinciden' : 'debate';
}

// En escala se acepta adivinar a uno de distancia.
export function adivino(pregunta, adivina, itemOtro) {
  const real = valorDe(pregunta, itemOtro);
  if (adivina === undefined || adivina === null || real === undefined) return false;
  return pregunta.tipo === 'escala' ? Math.abs(adivina - real) <= 1 : adivina === real;
}

const revelada = (dia, parte) => Boolean(dia?.hechos?.[`${parte}_a`] && dia?.hechos?.[`${parte}_b`]);

export function estadoParte(dia, parte, lugar) {
  if (!dia?.hechos?.[`${parte}_${lugar}`]) return 'responder';
  return revelada(dia, parte) ? 'revelado' : 'esperando';
}
export const estadoDia = (dia, lugar) => ({ gustos: estadoParte(dia, 'gustos', lugar), ingles: estadoParte(dia, 'ingles', lugar) });

// Días seguidos con la parte revelada, contando desde hoy (o desde ayer si hoy todavía no se ha revelado).
export function rachaAmbos(dias, parte, hoy) {
  const reveladas = new Set(dias.filter((d) => revelada(d, parte)).map((d) => d.fecha));
  let fecha = reveladas.has(hoy) ? hoy : sumarDias(hoy, -1);
  let n = 0;
  while (reveladas.has(fecha)) {
    n += 1;
    fecha = sumarDias(fecha, -1);
  }
  return n;
}

// `revelados`: [{ pregunta, a: item, b: item }] de las preguntas de adivinar ya reveladas.
export function porcentajeAdivinanzas(revelados) {
  let total = 0;
  let bien = 0;
  for (const { pregunta, a, b } of revelados) {
    for (const [quien, otro] of [[a, b], [b, a]]) {
      if (quien?.adivina === undefined || quien?.adivina === null) continue;
      total += 1;
      if (adivino(pregunta, quien.adivina, otro)) bien += 1;
    }
  }
  return total ? Math.round((100 * bien) / total) : null;
}
