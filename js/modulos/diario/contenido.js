// Contenido del diario (temas, rasgos, preguntas, perfil inicial), su validación y las fechas en hora de Colombia.

export const TEMAS_DIARIO = ['musica', 'futuro_solo', 'futuro_pareja', 'dilema', 'postura', 'vida_diaria', 'recuerdos', 'gustos'];
export const TIPOS_DIARIO = ['opciones', 'escala'];
const MAX_RASGO = 2;

const textoLleno = (t) => typeof t === 'string' && t.trim().length > 0;
const minus = (t) => t.trim().toLowerCase();

export async function cargarDiario(fetchFn = (url) => fetch(url)) {
  const base = new URL('../../../data/', import.meta.url);
  const leer = async (nombre) => {
    const r = await fetchFn(new URL(`${nombre}.json`, base).href);
    if (!r.ok) throw new Error(`No se pudo cargar ${nombre}.json (${r.status})`);
    return r.json();
  };
  const [temas, rasgos, preguntas, perfilInicial, vocabulario] = await Promise.all(
    ['diario/temas', 'diario/rasgos', 'diario/preguntas', 'diario/perfil-inicial', 'ingles/vocabulario'].map(leer));
  return { temas, rasgos, preguntas, perfilInicial, vocabulario };
}

export const MARCAS_PLANTILLA = ['nombre_otro', 'artista_fav_otro', 'artista_fav_mio', 'cancion_otro', 'peli_otro'];
const FAVORITOS = ['artistas', 'canciones', 'pelis'];

const marcasDe = (p) => [p.texto, ...(p.opciones || []).map((o) => o?.texto), ...(p.extremos || [])]
  .filter((t) => typeof t === 'string').flatMap((t) => [...t.matchAll(/\{([^}]*)\}/g)].map((m) => m[1]));

function requiereValido(r, rasgos) {
  if (!r || typeof r !== 'object') return false;
  const claves = Object.keys(r);
  if (!claves.length || !claves.every((k) => ['rasgo', 'favorito', 'respuesta'].includes(k))) return false;
  if (r.rasgo && !(rasgos.has(r.rasgo.id) && ['izquierda', 'derecha'].includes(r.rasgo.lado))) return false;
  if (r.favorito && !FAVORITOS.includes(r.favorito)) return false;
  if (r.respuesta && !(/^dia-\d{4}$/.test(r.respuesta.pregunta) && Array.isArray(r.respuesta.opciones)
    && r.respuesta.opciones.length > 0 && r.respuesta.opciones.every(Number.isInteger))) return false;
  return true;
}

const rasgosValidos = (rasgos, validos) => rasgos === undefined || (
  rasgos !== null && typeof rasgos === 'object'
  && Object.entries(rasgos).every(([id, n]) => validos.has(id) && Number.isInteger(n) && n !== 0 && Math.abs(n) <= MAX_RASGO));

// Devuelve el problema de forma de una pregunta del diario, o null si está bien.
export function problemaDePreguntaDiario(p, { temas, rasgos }) {
  if (!temas.has(p.tema)) return `tema inexistente "${p.tema}"`;
  if (!textoLleno(p.texto)) return 'texto vacío';
  if (![1, 2, 3].includes(p.intensidad)) return 'la intensidad va de 1 a 3';
  if (p.adivinar !== undefined && typeof p.adivinar !== 'boolean') return 'adivinar es true o false';
  if (p.requiere !== undefined && !requiereValido(p.requiere, rasgos)) return 'requiere inválido';
  if (marcasDe(p).some((m) => !MARCAS_PLANTILLA.includes(m))) return 'marca de plantilla desconocida';
  if (p.tipo === 'escala') {
    if (p.opciones !== undefined) return 'una escala no lleva opciones';
    if (!Array.isArray(p.extremos) || p.extremos.length !== 2 || !p.extremos.every(textoLleno)) return 'la escala necesita sus dos extremos';
    if (p.rasgo !== undefined && !(rasgos.has(p.rasgo?.id) && [1, -1].includes(p.rasgo?.signo))) return 'rasgo de la escala inválido';
    return null;
  }
  if (p.tipo === 'opciones') {
    if (!Array.isArray(p.opciones) || p.opciones.length < 2 || p.opciones.length > 4) return 'necesita de 2 a 4 opciones';
    if (!p.opciones.every((o) => textoLleno(o?.texto))) return 'opción sin texto';
    if (new Set(p.opciones.map((o) => minus(o.texto))).size !== p.opciones.length) return 'opciones repetidas';
    if (!p.opciones.every((o) => rasgosValidos(o.rasgos, rasgos))) return 'rasgos de una opción inválidos';
    return null;
  }
  return `tipo inválido "${p.tipo}"`;
}

export function validarDiario({ temas, rasgos, preguntas }) {
  const errores = [];
  const ctx = { temas: new Set(temas.map((t) => t.id)), rasgos: new Set(rasgos.map((r) => r.id)) };
  const ids = new Set();
  const textos = new Set();
  for (const p of preguntas) {
    if (!/^dia-\d{4}$/.test(p.id)) errores.push(`${p.id}: el id debe ser dia-0000`);
    if (ids.has(p.id)) errores.push(`${p.id}: id repetido`);
    ids.add(p.id);
    const problema = problemaDePreguntaDiario(p, ctx);
    if (problema) errores.push(`${p.id}: ${problema}`);
    if (textoLleno(p.texto)) {
      if (textos.has(minus(p.texto))) errores.push(`${p.id}: pregunta repetida`);
      textos.add(minus(p.texto));
    }
  }
  for (const p of preguntas) {
    const ref = p.requiere?.respuesta?.pregunta;
    if (ref && !ids.has(ref)) errores.push(`${p.id}: requiere una pregunta que no existe (${ref})`);
  }
  return errores;
}

const FORMATO_BOGOTA = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });

// El día del diario cambia a medianoche de Colombia, esté donde esté el celular.
export const fechaBogota = (d = new Date()) => FORMATO_BOGOTA.format(d);

const aFecha = (fecha) => new Date(`${fecha}T12:00:00Z`);
export function sumarDias(fecha, n) {
  const d = aFecha(fecha);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const FORMATO_LEGIBLE = new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
export const fechaLegible = (fecha) => FORMATO_LEGIBLE.format(aFecha(fecha)).replace(',', '');
