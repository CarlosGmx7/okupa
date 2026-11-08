// Bancos de la trivia: carga, forma de cada pregunta, validación y selección de cada partida.
import { generarMatematica, PLANTILLAS_MATE } from './matematicas.js';
import { generarPreguntaIngles } from '../../compartido/ingles.js';

export const TEMAS_BANCO = ['arte', 'historia', 'ciencia', 'deportes', 'canserbero', 'lana'];
const TEMAS_PARTIDA = [...TEMAS_BANCO, 'matematicas', 'ingles'];
const POR_PARTIDA = 10;
const MAX_POR_TEMA = 2;
const PREFIJOS = { arte: 'art', historia: 'his', ciencia: 'cie', deportes: 'dep', canserbero: 'can', lana: 'lan' };
const VF_MIN = 0.4;
const VF_MAX = 0.6;
const VF_PARA_BALANCE = 10;

const textoLleno = (t) => typeof t === 'string' && t.trim().length > 0;

export async function cargarTrivia(fetchFn = (url) => fetch(url)) {
  const base = new URL('../../../data/trivia/', import.meta.url);
  const leer = async (nombre) => {
    const r = await fetchFn(new URL(`${nombre}.json`, base).href);
    if (!r.ok) throw new Error(`No se pudo cargar ${nombre}.json (${r.status})`);
    return r.json();
  };
  const [temas, vocabulario, ...listas] = await Promise.all(['temas', '../ingles/vocabulario', ...TEMAS_BANCO].map(leer));
  return { temas, vocabulario, bancos: Object.fromEntries(TEMAS_BANCO.map((t, i) => [t, listas[i]])) };
}

// Devuelve el problema de forma de una pregunta de trivia, o null si está bien.
export function problemaDePreguntaTrivia(p, temasValidos) {
  if (!temasValidos.has(p.tema)) return `tema inexistente "${p.tema}"`;
  if (!textoLleno(p.texto)) return 'texto vacío';
  if (!textoLleno(p.dato)) return 'falta el dato que explica la respuesta';
  if (p.tipo === 'vf') {
    if (typeof p.respuesta !== 'boolean') return 'en verdadero/falso la respuesta es true o false';
    if (p.opciones !== undefined) return 'verdadero/falso no lleva opciones';
    return null;
  }
  if (p.tipo === 'opciones') {
    if (!Array.isArray(p.opciones) || p.opciones.length !== 4 || !p.opciones.every(textoLleno)) return 'necesita 4 opciones con texto';
    if (new Set(p.opciones.map((o) => o.trim().toLowerCase())).size !== 4) return 'opciones repetidas';
    if (!Number.isInteger(p.respuesta) || p.respuesta < 0 || p.respuesta > 3) return 'la respuesta debe ser el índice 0–3';
    return null;
  }
  return `tipo inválido "${p.tipo}"`;
}

function barajar(lista, rnd) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Primero lo que nunca ha salido (al azar); luego lo visto: las falladas y después lo más antiguo.
function enOrdenDePreferencia(lista, idDe, vistasTema = [], fallidas, rnd) {
  const posicion = new Map(vistasTema.map((id, i) => [id, i]));
  const nuevas = barajar(lista.filter((x) => !posicion.has(idDe(x))), rnd);
  const viejas = lista.filter((x) => posicion.has(idDe(x))).sort((x, y) =>
    (fallidas.has(idDe(y)) - fallidas.has(idDe(x))) || (posicion.get(idDe(x)) - posicion.get(idDe(y))));
  return [...nuevas, ...viejas];
}

const NORMALES_POR_PARTIDA = 3; // el resto (7) son de nivel medio-fácil
const MATE_FACILES = new Set(['porcentaje', 'descuento', 'regla3', 'raiz', 'sucesion', 'unidades']);
const nivelDe = (p) => (p.nivel === 'facil' ? 'facil' : 'normal');

// Las 10 preguntas de una partida: una de cada tema, y dos más al azar, sin pasar de 2 por tema.
// 7 son de nivel medio-fácil y 3 normales; si un tema no tiene de ese nivel, se usa la que haya.
export function elegirPartida({ bancos, vocabulario, vistas = {}, fallidas = [], rnd = Math.random }) {
  const usados = new Set();
  const fallas = new Set(fallidas);
  const libres = (tema, usadosTema = 0) => {
    if (tema === 'matematicas') return Infinity;
    const total = tema === 'ingles' ? vocabulario.length : (bancos[tema] || []).length;
    return total - usadosTema;
  };
  // 1) Qué temas salen.
  const conteo = {};
  const temas = [];
  for (const tema of TEMAS_PARTIDA) if (libres(tema) > 0) { temas.push(tema); conteo[tema] = 1; }
  while (temas.length < POR_PARTIDA) {
    const posibles = TEMAS_PARTIDA.filter((t) => (conteo[t] || 0) < MAX_POR_TEMA && libres(t, conteo[t] || 0) > 0);
    if (!posibles.length) break;
    const t = posibles[Math.floor(rnd() * posibles.length)];
    temas.push(t);
    conteo[t] = (conteo[t] || 0) + 1;
  }
  // 2) Qué casillas son normales.
  const normales = new Set(barajar(temas.map((_, i) => i), rnd).slice(0, NORMALES_POR_PARTIDA));
  // 3) La pregunta de cada casilla.
  const tomar = (tema, nivel) => {
    let pregunta;
    if (tema === 'matematicas') {
      const plantillas = PLANTILLAS_MATE.filter((p) => nivel === 'normal' || MATE_FACILES.has(p.id));
      do { pregunta = generarMatematica(rnd, plantillas[Math.floor(rnd() * plantillas.length)]); } while (usados.has(pregunta.id));
    } else if (tema === 'ingles') {
      const disponibles = vocabulario.filter((e) => !usados.has(e.id));
      const delNivel = nivel === 'facil' ? disponibles.filter((e) => e.tipo === 'palabra') : disponibles;
      const [entrada] = enOrdenDePreferencia(delNivel.length ? delNivel : disponibles, (e) => e.id, vistas.ingles, fallas, rnd);
      const tipo = nivel === 'facil' && entrada.tipo === 'palabra' ? (rnd() < 0.5 ? 'es_en' : 'en_es') : undefined;
      pregunta = generarPreguntaIngles(entrada, vocabulario, rnd, tipo);
      usados.add(entrada.id);
    } else {
      const disponibles = bancos[tema].filter((p) => !usados.has(p.id));
      const delNivel = disponibles.filter((p) => nivelDe(p) === nivel);
      [pregunta] = enOrdenDePreferencia(delNivel.length ? delNivel : disponibles, (p) => p.id, vistas[tema], fallas, rnd);
      usados.add(pregunta.id);
      return { ...pregunta, nivel: nivelDe(pregunta) };
    }
    usados.add(pregunta.id);
    return { ...pregunta, nivel };
  };
  return barajar(temas.map((tema, i) => tomar(tema, normales.has(i) ? 'normal' : 'facil')), rnd);
}

// Anota lo que salió en una partida (lo más reciente al final). Las matemáticas no se guardan.
export function marcarVistas(vistas, preguntas) {
  const nuevas = Object.fromEntries(Object.entries(vistas).map(([t, ids]) => [t, [...ids]]));
  for (const p of preguntas) {
    if (p.tema === 'matematicas') continue;
    const id = p.tema === 'ingles' ? p.entrada : p.id;
    const lista = (nuevas[p.tema] || []).filter((x) => x !== id);
    lista.push(id);
    nuevas[p.tema] = lista;
  }
  return nuevas;
}

export function validarBancos(bancos, temas) {
  const errores = [];
  const validos = new Set(temas.map((t) => t.id));
  const vistos = new Set();
  for (const [tema, lista] of Object.entries(bancos)) {
    const prefijo = PREFIJOS[tema];
    for (const p of lista) {
      if (vistos.has(p.id)) errores.push(`${p.id}: id repetido`);
      vistos.add(p.id);
      if (!new RegExp(`^${prefijo}-\\d{3}$`).test(p.id)) errores.push(`${p.id}: el id de ${tema} debe ser ${prefijo}-000`);
      if (p.tema !== tema) errores.push(`${p.id}: está en el banco de ${tema} pero dice tema "${p.tema}"`);
      if (!textoLleno(p.ref)) errores.push(`${p.id}: falta ref (fuente verificada)`);
      const problema = problemaDePreguntaTrivia(p, validos);
      if (problema) errores.push(`${p.id}: ${problema}`);
    }
    const vf = lista.filter((p) => p.tipo === 'vf');
    if (vf.length >= VF_PARA_BALANCE) {
      const verdaderas = vf.filter((p) => p.respuesta === true).length / vf.length;
      if (verdaderas < VF_MIN || verdaderas > VF_MAX) errores.push(`${tema}: V/F con ${Math.round(verdaderas * 100)} % de verdaderas (debe estar entre 40 y 60 %)`);
    }
  }
  return errores;
}
