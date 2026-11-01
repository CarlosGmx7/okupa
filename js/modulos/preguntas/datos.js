// Contenido del módulo de preguntas: carga, unión con lo propio, filtros y validación.

export const FORMATOS = ['abierta', 'corta', 'dilema', 'postura'];
export const SUBTIPOS = ['si_no', 'escala', 'esto_o_aquello'];
const ARCHIVOS = ['categorias', 'fuentes', 'preguntas', 'sesiones'];
const PROPIO_VACIO = { preguntas: [], categorias: [], sesiones: [], ocultas: [] };

export async function cargarIncluido(fetchFn = (url) => fetch(url)) {
  const base = new URL('../../../data/preguntas/', import.meta.url);
  const partes = await Promise.all(ARCHIVOS.map(async (nombre) => {
    const r = await fetchFn(new URL(`${nombre}.json`, base).href);
    if (!r.ok) throw new Error(`No se pudo cargar ${nombre}.json (${r.status})`);
    return r.json();
  }));
  return Object.fromEntries(ARCHIVOS.map((nombre, i) => [nombre, partes[i]]));
}

export function unir(incluido, propio = PROPIO_VACIO) {
  const p = { ...PROPIO_VACIO, ...(propio || {}) };
  const ocultas = new Set(p.ocultas);
  return {
    categorias: [...incluido.categorias, ...p.categorias],
    fuentes: incluido.fuentes,
    preguntas: [...incluido.preguntas, ...p.preguntas.map((q) => ({ ...q, fuente: 'nuestra' }))]
      .filter((q) => !ocultas.has(q.id)),
    sesiones: [...incluido.sesiones, ...p.sesiones],
  };
}

export function filtrar(preguntas, { categoria, profundidadMax, excluir } = {}) {
  return preguntas.filter((q) =>
    (!categoria || q.categoria === categoria) &&
    (!profundidadMax || q.profundidad <= profundidadMax) &&
    (!excluir || !excluir.has(q.id)));
}

// FNV-1a de 32 bits: mismo número para la misma fecha en cualquier dispositivo.
function hashTexto(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export function preguntaDelDia(preguntas, fechaISO) {
  const candidatas = preguntas
    .filter((q) => !q.id.startsWith('n-') && q.profundidad <= 2)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (!candidatas.length) return null;
  return candidatas[hashTexto(fechaISO) % candidatas.length];
}

export function fechaLocalISO(d = new Date()) {
  const dos = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

// Devuelve el problema de forma de una pregunta, o null si está bien.
export function problemaDePregunta(q, idsCategorias) {
  if (!idsCategorias.has(q.categoria)) return `categoría inexistente "${q.categoria}"`;
  if (!FORMATOS.includes(q.formato)) return `formato inválido "${q.formato}"`;
  if (![1, 2, 3].includes(q.profundidad)) return `profundidad inválida "${q.profundidad}"`;
  if (typeof q.texto !== 'string' || !q.texto.trim()) return 'texto vacío';
  if (q.formato === 'corta') {
    if (!SUBTIPOS.includes(q.subtipo)) return `subtipo inválido "${q.subtipo}"`;
    if (!Array.isArray(q.opciones) || q.opciones.length !== 2 ||
        q.opciones.some((o) => typeof o !== 'string' || !o.trim())) {
      return 'una pregunta corta necesita exactamente 2 opciones con texto';
    }
  }
  return null;
}

export function validarContenido({ categorias, fuentes, preguntas, sesiones }) {
  const errores = [];
  const idsCategorias = new Set(categorias.map((c) => c.id));
  const idsFuentes = new Set(fuentes.map((f) => f.id));
  const vistos = new Set();
  for (const q of preguntas) {
    if (vistos.has(q.id)) errores.push(`${q.id}: id repetido`);
    vistos.add(q.id);
    const problema = problemaDePregunta(q, idsCategorias);
    if (problema) errores.push(`${q.id}: ${problema}`);
    if (!idsFuentes.has(q.fuente)) errores.push(`${q.id}: fuente inexistente "${q.fuente}"`);
  }
  for (const s of sesiones) {
    for (const b of s.bloques || []) {
      for (const id of b.preguntas || []) {
        if (!vistos.has(id)) errores.push(`sesión ${s.id}: pregunta inexistente ${id}`);
      }
    }
  }
  return errores;
}
