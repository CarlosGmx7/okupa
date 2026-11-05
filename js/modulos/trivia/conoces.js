// "¿Cuánto me conoces?": preguntas de trivia armadas con lo que el otro ya respondió (y se reveló) en el diario.
// Cada uno recibe una distinta, sobre el otro. Lógica pura, salvo la carga de las preguntas del diario.
import { esPlantilla } from '../diario/aprender.js';

export const MAX_CONOCES = 2;
export const MIN_DIAS = 5;
const RANGOS = [[1, 3], [4, 5], [6, 7], [8, 10]];

export async function cargarPreguntasDiario(fetchFn = (url) => fetch(url)) {
  const r = await fetchFn(new URL('../../../data/diario/preguntas.json', import.meta.url).href);
  if (!r.ok) throw new Error(`No se pudieron cargar las preguntas del diario (${r.status})`);
  return r.json();
}

// Las de "yo / tú" y las plantillas cambian según quién las lea: no sirven para preguntar por el otro.
const sirve = (p) => p && !p.espejo && !esPlantilla(p);

function preguntaSobre(p, valor, nombre) {
  if (p.tipo === 'escala') {
    const respuesta = RANGOS.findIndex(([min, max]) => valor >= min && valor <= max);
    if (respuesta < 0) return null;
    return {
      tipo: 'opciones',
      texto: `¿Qué respondió ${nombre}? «${p.texto}» (1 = ${p.extremos[0]}, 10 = ${p.extremos[1]})`,
      opciones: RANGOS.map(([min, max]) => `De ${min} a ${max}`),
      respuesta,
      dato: `${nombre} puso ${valor} de 10 en el diario.`,
    };
  }
  if (!p.opciones?.[valor]) return null;
  return {
    tipo: 'opciones',
    texto: `¿Qué respondió ${nombre}? «${p.texto}»`,
    opciones: p.opciones.map((o) => o.texto),
    respuesta: valor,
    dato: `${nombre} respondió «${p.opciones[valor].texto}» en el diario.`,
  };
}

function candidatasSobre(lugar, perfiles, porId, nombres) {
  return Object.entries(perfiles[lugar]?.respuestas || {})
    .map(([id, valor]) => {
      const p = porId.get(id);
      if (!sirve(p)) return null;
      const q = preguntaSobre(p, valor, nombres[lugar] || 'tu pareja');
      return q ? { ...q, id: `con-${lugar}-${id}`, tema: 'conoces' } : null;
    })
    .filter(Boolean);
}

function barajar(lista, rnd) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export const disponible = (perfiles) =>
  ['a', 'b'].every((l) => (perfiles?.[l]?.aprendidos || []).length >= MIN_DIAS);

// Hasta 2 turnos { para: { a: pregunta sobre b, b: pregunta sobre a } }.
export function preguntasConoces({ perfiles, preguntas, nombres = {}, rnd = Math.random }) {
  if (!disponible(perfiles)) return [];
  const porId = new Map(preguntas.map((p) => [p.id, p]));
  // Para a, preguntas sobre b; para b, sobre a.
  const paraA = barajar(candidatasSobre('b', perfiles, porId, nombres), rnd);
  const paraB = barajar(candidatasSobre('a', perfiles, porId, nombres), rnd);
  const n = Math.min(MAX_CONOCES, paraA.length, paraB.length);
  return Array.from({ length: n }, (_, i) => ({ para: { a: paraA[i], b: paraB[i] } }));
}

// Reemplaza preguntas de la partida (en posiciones al azar) por las de "¿Cuánto me conoces?". No muta.
export function insertarConoces(preguntas, conoces, rnd = Math.random) {
  if (!conoces.length) return preguntas;
  const posiciones = barajar(preguntas.map((_, i) => i), rnd).slice(0, conoces.length);
  const nueva = [...preguntas];
  posiciones.forEach((pos, i) => { nueva[pos] = conoces[i]; });
  return nueva;
}
