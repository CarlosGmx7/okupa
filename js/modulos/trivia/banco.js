// Bancos de la trivia: carga, forma de cada pregunta y validación del contenido.

export const TEMAS_BANCO = ['arte', 'historia', 'ciencia', 'deportes', 'canserbero', 'lana'];
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
  const [temas, ...listas] = await Promise.all(['temas', ...TEMAS_BANCO].map(leer));
  return { temas, bancos: Object.fromEntries(TEMAS_BANCO.map((t, i) => [t, listas[i]])) };
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
