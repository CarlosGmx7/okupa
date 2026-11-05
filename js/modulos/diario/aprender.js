// Lo que Okupa aprende de cada uno, sin IA: rasgos sumados desde las respuestas reveladas, favoritos,
// requisitos de las preguntas de seguimiento y plantillas con sus gustos. Lógica pura.
import { valorDe, otroLugar } from './revelar.js';

export const MIN_RESPUESTAS = 3;
const UMBRAL_LADO = 0.5;
const MAX_APRENDIDOS = 400;
const MAX_RESPUESTAS_GUARDADAS = 500;
export const LADOS = ['izquierda', 'medio', 'derecha'];
const MARCA = /\{([a-z_]+)\}/g;

const redondear = (x) => Math.round(x * 100) / 100;

// Cuánto mueve una respuesta cada rasgo: lo que declare la opción, o la escala en proporción (−2 a 2).
export function aporteDe(pregunta, item) {
  if (pregunta.tipo === 'escala') {
    if (!pregunta.rasgo || !Number.isFinite(item?.valor)) return {};
    return { [pregunta.rasgo.id]: redondear((pregunta.rasgo.signo * (item.valor - 5.5)) / 2.25) };
  }
  return { ...(pregunta.opciones?.[item?.opcion]?.rasgos || {}) };
}

// Devuelve el perfil con lo aprendido de un día revelado; si esa fecha ya se contó, el mismo perfil.
export function aprenderDeDia(perfil, { fecha, gustos }, items, porId) {
  const base = perfil || {};
  if ((base.aprendidos || []).includes(fecha)) return perfil;
  const rasgos = { ...(base.rasgos || {}) };
  const respuestas = { ...(base.respuestas || {}) };
  gustos.forEach((id, i) => {
    const p = porId.get(id);
    const item = items?.[i];
    if (!p || !item) return;
    for (const [rasgo, v] of Object.entries(aporteDe(p, item))) {
      const antes = rasgos[rasgo] || { suma: 0, n: 0 };
      rasgos[rasgo] = { suma: redondear(antes.suma + v), n: antes.n + 1 };
    }
    const valor = valorDe(p, item);
    if (valor !== undefined) {
      delete respuestas[id];
      respuestas[id] = valor;
    }
  });
  const claves = Object.keys(respuestas);
  for (const k of claves.slice(0, Math.max(0, claves.length - MAX_RESPUESTAS_GUARDADAS))) delete respuestas[k];
  return { ...base, rasgos, respuestas, aprendidos: [...(base.aprendidos || []), fecha].slice(-MAX_APRENDIDOS) };
}

export function valorRasgo(perfil, id) {
  const correccion = perfil?.correcciones?.[id];
  const r = perfil?.rasgos?.[id] || { suma: 0, n: 0 };
  const promedio = r.n ? r.suma / r.n : 0;
  if (correccion === 'oculto') return { lado: null, oculto: true, corregido: true, n: r.n, promedio };
  if (LADOS.includes(correccion)) return { lado: correccion, corregido: true, n: r.n, promedio };
  if (r.n < MIN_RESPUESTAS) return { lado: null, n: r.n, promedio };
  const lado = promedio > UMBRAL_LADO ? 'izquierda' : promedio < -UMBRAL_LADO ? 'derecha' : 'medio';
  return { lado, n: r.n, promedio };
}

// Los rasgos que ya se pueden decir, en palabras simples.
export function describirRasgos(perfil, rasgos) {
  return rasgos.map((r) => {
    const v = valorRasgo(perfil, r.id);
    if (!v.lado) return null;
    const texto = v.lado === 'medio' ? `Entre ${r.izquierda} y ${r.derecha}` : `Más bien ${r[v.lado]}`;
    return { id: r.id, lado: v.lado, texto, corregido: Boolean(v.corregido), n: v.n };
  }).filter(Boolean);
}

const limpio = (t) => (typeof t === 'string' ? t.trim() : '');
function lista(valores, quitados = []) {
  const fuera = new Set(quitados.map((x) => limpio(x).toLowerCase()));
  const vistos = new Set();
  return valores.map(limpio).filter((x) => {
    const k = x.toLowerCase();
    if (!x || fuera.has(k) || vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

export function favoritosDe(perfil) {
  const ini = perfil?.inicial || {};
  const fav = perfil?.favoritos || {};
  const quit = perfil?.quitados || {};
  return {
    artistas: lista([...(ini.artistas || []), ...(fav.artistas || [])], quit.artistas),
    canciones: lista([ini.cancion || '', ...(fav.canciones || [])], quit.canciones),
    pelis: lista([ini.pelis || '', ...(fav.pelis || [])], quit.pelis),
  };
}

// Una pregunta de seguimiento solo es elegible si se cumple todo lo que pide.
export function cumpleRequiere(pregunta, { a, b }) {
  const r = pregunta.requiere;
  if (!r) return true;
  const ambos = [a, b];
  if (r.rasgo && !ambos.some((p) => valorRasgo(p, r.rasgo.id).lado === r.rasgo.lado)) return false;
  if (r.favorito && !ambos.every((p) => favoritosDe(p)[r.favorito]?.length > 0)) return false;
  if (r.respuesta && !ambos.some((p) => r.respuesta.opciones.includes(p?.respuestas?.[r.respuesta.pregunta]))) return false;
  return true;
}

const textosDe = (p) => [p.texto, ...(p.opciones || []).map((o) => o.texto), ...(p.extremos || [])];
export const esPlantilla = (p) => textosDe(p).some((t) => typeof t === 'string' && /\{[a-z_]+\}/.test(t));

// La pregunta como la ve `yo`, con sus marcas llenas; null si falta algún dato.
export function resolverPlantilla(pregunta, { yo, nombres, perfiles }) {
  if (!esPlantilla(pregunta)) return pregunta;
  const otro = otroLugar(yo);
  const mio = favoritosDe(perfiles?.[yo]);
  const suyo = favoritosDe(perfiles?.[otro]);
  const valores = {
    nombre_otro: nombres?.[otro], artista_fav_otro: suyo.artistas[0], artista_fav_mio: mio.artistas[0],
    cancion_otro: suyo.canciones[0], peli_otro: suyo.pelis[0],
  };
  let falta = false;
  const llenar = (t) => t.replace(MARCA, (_, k) => {
    if (!valores[k]) falta = true;
    return valores[k] || '';
  });
  const resuelta = {
    ...pregunta,
    texto: llenar(pregunta.texto),
    ...(pregunta.opciones ? { opciones: pregunta.opciones.map((o) => ({ ...o, texto: llenar(o.texto) })) } : {}),
    ...(pregunta.extremos ? { extremos: pregunta.extremos.map(llenar) } : {}),
  };
  return falta ? null : resuelta;
}

// Para la selección: +1 / −1 si el rasgo ya tiene lado (−1 = derecha), 0 en el medio, null si no se sabe.
export function signoRasgo(perfil, id) {
  const { lado } = valorRasgo(perfil, id);
  return lado === 'izquierda' ? 1 : lado === 'derecha' ? -1 : lado === 'medio' ? 0 : null;
}
