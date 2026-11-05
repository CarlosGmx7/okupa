// Preguntas de inglés generadas desde el vocabulario. Las usan la trivia y el reto diario.

export const TIPOS_ENTRADA = ['palabra', 'phrasal', 'expresion', 'falso_amigo'];
export const TIPOS_PREGUNTA_INGLES = ['es_en', 'en_es', 'completar', 'falso_amigo'];
const REGEX_TERMINO = /\{([^}]+)\}/g;

const minus = (t) => t.trim().toLowerCase();
const textoLleno = (t) => typeof t === 'string' && t.trim().length > 0;
const terminoDe = (entrada) => entrada.ejemplo.match(/\{([^}]+)\}/)[1];
const ejemploLimpio = (entrada) => entrada.ejemplo.replace(/[{}]/g, '');

// Un falso amigo no se pregunta como en_es: para eso tiene su propio tipo con la trampa.
export const tiposPara = (entrada) => (entrada.tipo === 'falso_amigo' ? ['falso_amigo', 'es_en', 'completar'] : ['es_en', 'en_es', 'completar']);

function barajar(lista, rnd) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Tres distractores distintos de la respuesta: primero los fijos, luego al azar entre las demás entradas.
function distractores(correcta, fijos, otras, rnd) {
  const elegidos = [];
  const usados = new Set([minus(correcta)]);
  for (const d of [...fijos, ...barajar(otras, rnd)]) {
    if (!textoLleno(d) || usados.has(minus(d))) continue;
    usados.add(minus(d));
    elegidos.push(d);
    if (elegidos.length === 3) break;
  }
  return elegidos;
}

export function generarPreguntaIngles(entrada, vocabulario, rnd = Math.random, tipo = tiposPara(entrada)[Math.floor(rnd() * tiposPara(entrada).length)]) {
  const mismoTipo = vocabulario.filter((e) => e.tipo === entrada.tipo && e.id !== entrada.id);
  const enIngles = tipo === 'es_en' || tipo === 'completar';
  const correcta = tipo === 'completar' ? terminoDe(entrada) : enIngles ? entrada.en : entrada.es;
  const fijos = [
    ...(tipo === 'falso_amigo' ? [entrada.trampa] : []),
    ...((enIngles ? entrada.distractores?.en : entrada.distractores?.es) || []),
  ];
  const otras = mismoTipo.map((e) => (enIngles ? e.en : e.es));
  const opciones = barajar([correcta, ...distractores(correcta, fijos, otras, rnd)], rnd);
  const texto = {
    es_en: `¿Cómo se dice «${entrada.es}» en inglés?`,
    en_es: `¿Qué significa «${entrada.en}»?`,
    falso_amigo: `Ojo con este: ¿qué significa «${entrada.en}»?`,
    completar: `Completa la frase: ${entrada.ejemplo.replace(REGEX_TERMINO, '____')}`,
  }[tipo];
  return {
    id: `${entrada.id}-${tipo}`,
    tema: 'ingles',
    tipo: 'opciones',
    texto,
    opciones,
    respuesta: opciones.indexOf(correcta),
    dato: `«${entrada.en}» = ${entrada.es}. Ej.: ${ejemploLimpio(entrada)}`,
    entrada: entrada.id,
  };
}

export function validarVocabulario(vocabulario) {
  const errores = [];
  const ids = new Set();
  const es = new Set();
  const en = new Set();
  for (const e of vocabulario) {
    if (!/^en-\d{4}$/.test(e.id)) errores.push(`${e.id}: id debe ser en-0000`);
    if (ids.has(e.id)) errores.push(`${e.id}: id repetido`);
    ids.add(e.id);
    if (!TIPOS_ENTRADA.includes(e.tipo)) errores.push(`${e.id}: tipo inválido "${e.tipo}"`);
    if (!textoLleno(e.es) || !textoLleno(e.en)) errores.push(`${e.id}: falta es o en`);
    if (!textoLleno(e.ejemplo) || (e.ejemplo.match(REGEX_TERMINO) || []).length !== 1) errores.push(`${e.id}: el ejemplo debe tener el término entre llaves una vez`);
    if (e.tipo === 'falso_amigo' && !textoLleno(e.trampa)) errores.push(`${e.id}: un falso amigo necesita su trampa`);
    if (textoLleno(e.es)) { if (es.has(minus(e.es))) errores.push(`${e.id}: «${e.es}» ya está en otra entrada`); es.add(minus(e.es)); }
    if (textoLleno(e.en)) { if (en.has(minus(e.en))) errores.push(`${e.id}: «${e.en}» ya está en otra entrada`); en.add(minus(e.en)); }
  }
  return errores;
}
