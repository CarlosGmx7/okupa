// Perfil inicial de cada uno: forma, valores por defecto y lo que los dos comparten para escoger preguntas.
import { TEMAS_DIARIO } from './contenido.js';

export const INTENSIDAD_SIN_PERFIL = 2;
const MAX_TEXTO = 80;

const LISTAS = ['generos', 'artistas', 'masTemas', 'evitarTemas'];
const TEXTOS = ['cancion', 'pelis', 'plan', 'vivir', 'hijos', 'matrimonio', 'mascotas'];

const limpiar = (t) => (typeof t === 'string' ? t.trim() : '');

export function normalizarPerfil(inicial = {}) {
  const p = {};
  for (const k of LISTAS) p[k] = Array.isArray(inicial[k]) ? inicial[k].map(limpiar).filter(Boolean) : [];
  for (const k of TEXTOS) p[k] = limpiar(inicial[k]);
  p.intensidad = [1, 2, 3].includes(inicial.intensidad) ? inicial.intensidad : INTENSIDAD_SIN_PERFIL;
  return p;
}

// `campos` es data/diario/perfil-inicial.json: dice qué opciones existen en cada campo.
export function problemaDePerfil(inicial, campos) {
  const porId = new Map(campos.map((c) => [c.id, c]));
  const opcionesDe = (id) => new Set((porId.get(id)?.opciones || []).map((o) => o.id));
  for (const c of campos) {
    const v = inicial[c.id];
    if (c.tipo === 'varias' && !(Array.isArray(v) && v.every((x) => opcionesDe(c.id).has(x)))) return `${c.id}: opción inexistente`;
    if (c.tipo === 'temas' && !(Array.isArray(v) && v.every((x) => TEMAS_DIARIO.includes(x)))) return `${c.id}: tema inexistente`;
    if (c.tipo === 'una' && !(v === '' || opcionesDe(c.id).has(v))) return `${c.id}: opción inexistente`;
    if (c.tipo === 'textos' && !(Array.isArray(v) && v.length <= (c.max || 3) && v.every((x) => typeof x === 'string' && x.length <= MAX_TEXTO))) return `${c.id}: máximo ${c.max || 3} de ${MAX_TEXTO} letras`;
    if (c.tipo === 'texto' && !(typeof v === 'string' && v.length <= MAX_TEXTO)) return `${c.id}: máximo ${MAX_TEXTO} letras`;
    if (c.tipo === 'intensidad' && ![1, 2, 3].includes(v)) return `${c.id}: va de 1 a 3`;
  }
  return null;
}

// Lo que comparten los dos para escoger: la intensidad menor, todo lo que alguno evita y cuántos piden cada tema.
export function preferenciasDe({ a, b }) {
  const perfiles = [a, b].map((p) => (p?.inicial ? normalizarPerfil(p.inicial) : null));
  const intensidad = Math.min(...perfiles.map((p) => p?.intensidad ?? INTENSIDAD_SIN_PERFIL));
  const evitar = new Set(perfiles.flatMap((p) => p?.evitarTemas || []));
  const mas = new Map();
  for (const t of perfiles.flatMap((p) => p?.masTemas || [])) mas.set(t, (mas.get(t) || 0) + 1);
  return { intensidad, evitar, mas };
}
