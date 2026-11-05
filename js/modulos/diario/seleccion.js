// Escoge las 3 preguntas del día y el reto de inglés. Lógica pura: sin nube ni pantalla.
import { preferenciasDe } from './perfil.js';
import { cumpleRequiere, esPlantilla, resolverPlantilla, signoRasgo } from './aprender.js';
import { generarPreguntaIngles } from '../../compartido/ingles.js';

export const POR_DIA = 3;
export const MAX_VISTAS = 2000;
const CASTIGO_RECIENTE = 0.7;
const PESO_MINIMO = 0.1;

function barajar(lista, rnd) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Primero lo que nunca salió; luego lo visto, de lo más antiguo a lo más nuevo.
function nuevasYViejas(lista, idDe, vistas) {
  const posicion = new Map(vistas.map((id, i) => [id, i]));
  return {
    nuevas: lista.filter((x) => !posicion.has(idDe(x))),
    viejas: lista.filter((x) => posicion.has(idDe(x))).sort((x, y) => posicion.get(idDe(x)) - posicion.get(idDe(y))),
  };
}

function sortear(lista, peso, rnd) {
  const total = lista.reduce((s, x) => s + peso(x), 0);
  let r = rnd() * total;
  for (const x of lista) {
    r -= peso(x);
    if (r <= 0) return x;
  }
  return lista[lista.length - 1];
}

const alcanza = (pool) => pool.length >= POR_DIA && new Set(pool.map((p) => p.tema)).size >= POR_DIA && pool.some((p) => p.adivinar);

const rasgosQueToca = (p) => [...new Set([p.rasgo?.id, ...(p.opciones || []).flatMap((o) => Object.keys(o.rasgos || {}))].filter(Boolean))];

// Hay debate en un rasgo si los dos ya tienen lado y es el contrario.
function hayDebate(p, perfiles) {
  return rasgosQueToca(p).some((id) => {
    const a = signoRasgo(perfiles.a, id);
    const b = signoRasgo(perfiles.b, id);
    return a && b && a !== b;
  });
}

export function elegirDia({ preguntas, perfiles = {}, nombres = {}, vistas = [], recientes = [], rnd = Math.random }) {
  const prefs = preferenciasDe({ a: perfiles.a, b: perfiles.b });
  const ambos = { a: perfiles.a, b: perfiles.b };
  const usable = (p) => cumpleRequiere(p, ambos)
    && (!esPlantilla(p) || ['a', 'b'].every((yo) => resolverPlantilla(p, { yo, nombres, perfiles: ambos })));
  const sinRequisitos = preguntas.filter(usable);
  let elegibles = sinRequisitos.filter((p) => p.intensidad <= prefs.intensidad && !prefs.evitar.has(p.tema));
  if (elegibles.length < POR_DIA) elegibles = sinRequisitos.filter((p) => !prefs.evitar.has(p.tema));
  if (elegibles.length < POR_DIA) elegibles = sinRequisitos;

  // Las no vistas; si no alcanzan, se reabren las vistas hace más tiempo, una por una.
  const { nuevas, viejas } = nuevasYViejas(elegibles, (p) => p.id, vistas);
  const pool = [...nuevas];
  for (const v of viejas) {
    if (alcanza(pool)) break;
    pool.push(v);
  }

  const recienteSet = new Set(recientes);
  const peso = (p) => Math.max(PESO_MINIMO, 1 + (prefs.mas.get(p.tema) || 0) - (recienteSet.has(p.tema) ? CASTIGO_RECIENTE : 0)
    + (p.requiere ? 1 : 0) + (hayDebate(p, ambos) ? 1 : 0));
  const elegidas = [];
  while (elegidas.length < Math.min(POR_DIA, pool.length)) {
    const restantes = pool.filter((p) => !elegidas.includes(p));
    const temasUsados = new Set(elegidas.map((p) => p.tema));
    const deOtroTema = restantes.filter((p) => !temasUsados.has(p.tema));
    elegidas.push(sortear(deOtroTema.length ? deOtroTema : restantes, peso, rnd));
  }

  // Al menos una para adivinar al otro: si no salió, la última se cambia por una que sí.
  if (!elegidas.some((p) => p.adivinar)) {
    const otrosTemas = new Set(elegidas.slice(0, -1).map((p) => p.tema));
    const conAdivinar = pool.filter((p) => p.adivinar && !elegidas.includes(p));
    const mejores = conAdivinar.filter((p) => !otrosTemas.has(p.tema));
    if (conAdivinar.length) elegidas[elegidas.length - 1] = sortear(mejores.length ? mejores : conAdivinar, peso, rnd);
  }
  const indices = elegidas.map((p, i) => (p.adivinar ? i : -1)).filter((i) => i >= 0);
  return {
    gustos: elegidas.map((p) => p.id),
    adivinar: indices.length ? indices[Math.floor(rnd() * indices.length)] : 0,
  };
}

export function elegirReto({ vocabulario, vistas = [], rnd = Math.random }) {
  const { nuevas, viejas } = nuevasYViejas(vocabulario, (e) => e.id, vistas);
  return [...barajar(nuevas, rnd), ...viejas].slice(0, POR_DIA).map((e) => generarPreguntaIngles(e, vocabulario, rnd));
}

export function agregarVistas(vistas, ids, max = MAX_VISTAS) {
  const nuevos = new Set(ids);
  return [...vistas.filter((id) => !nuevos.has(id)), ...ids].slice(-max);
}
